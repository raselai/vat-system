# Reports API — Design Specification

## Overview

Server-side aggregation API for Bangladesh VAT management reports. Provides five tax-month-scoped report types consumed by a dedicated Reports page in the client and by the Dashboard KPI cards.

## Goals

- Replace client-side aggregation on the Dashboard (currently fetches all invoices, products, and customers) with a single scoped API call
- Provide a Reports page where accountants can query any past tax month and export to PDF or Excel

## Architecture

### Server

New files following existing route/controller/service conventions:

- `server/src/routes/reports.routes.ts`
- `server/src/controllers/reports.controller.ts`
- `server/src/services/reports.service.ts`
- `server/src/templates/reports.html` — Handlebars template for PDF export (all five report types, sections toggled via template conditionals)

Registered in `app.ts` as `app.use('/api/v1/reports', reportsRoutes)`.

Middleware chain: `authenticate → companyScope → auditLog` (no `requireRole` — both `admin` and `operator` can view all reports, consistent with spec RBAC table).

### Client

New files:

- `client/src/pages/reports/ReportsPage.tsx` — five Ant Design `<Tabs>` panels, month picker, export buttons
- `client/src/services/reports.service.ts` — typed API calls

Route added to React Router as `/reports`.

---

## API Endpoints

All endpoints require:
- `Authorization: Bearer <token>` header
- `x-company-id` header
- `?taxMonth=YYYY-MM` query parameter (required, validated server-side)

Only non-cancelled invoices (`status != 'cancelled'`) contribute to all aggregations.

### GET /api/v1/reports/vat-summary

Top-level VAT overview for the tax month. Used by both the Dashboard KPI cards and the Reports page first tab.

**Response `data`:**
```json
{
  "taxMonth": "2026-03",
  "salesCount": 42,
  "purchaseCount": 18,
  "totalSalesValue": 1250000.00,
  "totalPurchaseValue": 480000.00,
  "outputVat": 187500.00,
  "inputVat": 72000.00,
  "sdPayable": 12500.00,
  "vdsCredit": 8750.00,
  "netPayable": 119250.00
}
```

`netPayable = outputVat + sdPayable − inputVat − vdsCredit`

`vdsCredit` = sum of `vds_amount` from finalized deductee VDS certificates whose `challan_date` falls in the tax month.

### GET /api/v1/reports/vat-payable

Output and input VAT broken down by VAT rate band. Useful for verifying the rate composition of a month's liability.

**Response `data`:**
```json
{
  "taxMonth": "2026-03",
  "bands": [
    {
      "vatRate": 15,
      "taxableValue": 800000.00,
      "sdAmount": 12500.00,
      "vatAmount": 120000.00,
      "invoiceCount": 28
    }
  ]
}
```

Grouped by `vat_rate` across all `invoice_items` for non-cancelled invoices in the tax month. Includes both sales and purchase invoice items (client can filter by tab if needed, but the endpoint returns all).

### GET /api/v1/reports/sales-summary

Sales invoices aggregated by VAT rate band for the tax month.

**Response `data`:**
```json
{
  "taxMonth": "2026-03",
  "rows": [
    {
      "vatRate": 15,
      "taxableValue": 600000.00,
      "sdAmount": 10000.00,
      "vatAmount": 90000.00,
      "specificDutyAmount": 0.00,
      "grandTotal": 700000.00,
      "invoiceCount": 20
    }
  ],
  "totals": {
    "taxableValue": 650000.00,
    "sdAmount": 10000.00,
    "vatAmount": 97500.00,
    "specificDutyAmount": 0.00,
    "grandTotal": 757500.00
  }
}
```

### GET /api/v1/reports/purchase-summary

Identical shape to `sales-summary`, filtered to `invoice_type = 'purchase'`.

### GET /api/v1/reports/vds-summary

VDS certificate status breakdown for the tax month (by `challan_date`).

**Response `data`:**
```json
{
  "taxMonth": "2026-03",
  "certificateCount": 12,
  "totalDeducted": 35000.00,
  "totalDeposited": 26250.00,
  "totalPending": 8750.00
}
```

`totalPending = totalDeducted − totalDeposited`

---

## Export Endpoints

### GET /api/v1/reports/:type/pdf?taxMonth=YYYY-MM

`:type` is one of: `vat-summary`, `vat-payable`, `sales-summary`, `purchase-summary`, `vds-summary`.

Runs the same query as the JSON endpoint, renders via `server/src/templates/reports.html` using the existing `pdf.service.ts` Puppeteer singleton, returns `application/pdf` with `Content-Disposition: attachment; filename=<type>-<taxMonth>.pdf`.

### GET /api/v1/reports/:type/xlsx?taxMonth=YYYY-MM

Same query, formatted into an Excel workbook using the existing `xlsx` package. Returns `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with `Content-Disposition: attachment; filename=<type>-<taxMonth>.xlsx`.

Each report type has a dedicated sheet builder function in `reports.service.ts`.

---

## Client UI

### Reports Page (`/reports`)

Single page with:

1. **Month picker** (Ant Design `DatePicker` in month mode) — defaults to current tax month, triggers refetch on change
2. **Five tabs:** VAT Summary · VAT Payable · Sales Summary · Purchase Summary · VDS Summary
3. **Export bar** in each tab header: PDF button + Excel button (both trigger the relevant export endpoint as a file download)
4. Data for all five tabs loaded in parallel via `Promise.all` on mount and on month change
5. Each tab shows its own Ant Design `Spin` / skeleton while loading

### Dashboard Fix

Replace the three parallel calls in `Dashboard.tsx` (`/products`, `/customers`, `/invoices`) with:

```
GET /reports/vat-summary?taxMonth=<currentTaxMonth>
GET /invoices  (kept — powers the Recent Invoices table)
```

KPI cards (Output VAT, Input VAT, Net VAT Payable, Invoice count) read from `vat-summary` response. This scopes all KPIs to the current tax month instead of all-time totals. `totalProducts` and `totalCustomers` counters are removed from the KPI cards (they are not compliance-relevant).

---

## Validation

- `taxMonth` must match `YYYY-MM`. Invalid or missing → 400 with `{ success: false, error: "taxMonth is required (YYYY-MM)" }`.
- `:type` on export routes validated against the allowed set → 400 if unknown.
- All monetary values serialized as `number` (not `BigInt` string) — aggregations use Prisma `_sum` which returns `Decimal`; call `.toNumber()` before serializing.

---

## Data Source

All aggregations query `invoices` joined to `invoice_items` directly — the same source of truth used by register generation and return generation. No dependency on `sales_register`, `purchase_register`, or `vat_returns` tables. This keeps reports accurate even before a return has been generated.

VDS credit in `vat-summary` queries `vds_certificates` where `role = 'deductee'` and `status = 'finalized'`.
