# Musak 9.1 Monthly Return — Design Specification

## Overview

Implements the Bangladesh VAT monthly return (Musak 9.1) as a persisted, workflow-driven document. Auto-aggregates output VAT, input VAT, SD, and VDS credit from existing invoices and VDS certificates for a given tax month. Supports manual adjustments (carry-forward, increasing/decreasing), a draft → reviewed → submitted → locked workflow, bilingual PDF export, and a stub NBR export endpoint.

## Decisions

- **Scope**: Core sections now (output VAT, input VAT, SD, VDS credit, carry-forward, adjustments, net payable). Full 24-section structure stored in `musak_91_json` for future extension.
- **Invoice locking**: Returns are independent of invoice status. Invoices manage their own `draft → approved → locked` flow; submitting a return does NOT lock invoices.
- **Carry-forward**: Manual entry only. No auto-pull from prior month's return.
- **NBR export**: Stub endpoint returning raw `musak_91_json`. Format to be wired when official NBR spec is confirmed.

---

## Database Schema

New table: `vat_returns`. New enum: `VatReturnStatus`.

```prisma
enum VatReturnStatus {
  draft
  reviewed
  submitted
  locked
}

model VatReturn {
  id                   BigInt           @id @default(autoincrement())
  companyId            BigInt           @map("company_id")
  taxMonth             String           @map("tax_month") @db.Char(7)       // YYYY-MM
  fiscalYear           String           @map("fiscal_year") @db.VarChar(9)  // YYYY-YYYY

  // Auto-calculated fields (from invoices + VDS)
  totalSalesValue      Decimal          @map("total_sales_value") @db.Decimal(14, 2)
  outputVat            Decimal          @map("output_vat") @db.Decimal(14, 2)
  sdPayable            Decimal          @map("sd_payable") @db.Decimal(14, 2)
  totalPurchaseValue   Decimal          @map("total_purchase_value") @db.Decimal(14, 2)
  inputVat             Decimal          @map("input_vat") @db.Decimal(14, 2)
  vdsCredit            Decimal          @map("vds_credit") @db.Decimal(14, 2)

  // Manual entry
  carryForward         Decimal          @default(0) @map("carry_forward") @db.Decimal(14, 2)
  increasingAdjustment Decimal          @default(0) @map("increasing_adjustment") @db.Decimal(14, 2)
  decreasingAdjustment Decimal          @default(0) @map("decreasing_adjustment") @db.Decimal(14, 2)
  notes                String?          @db.Text

  // Computed (denormalized)
  netPayable           Decimal          @map("net_payable") @db.Decimal(14, 2)

  // Full 24-section JSON blob (extensible)
  musak91Json          Json             @map("musak_91_json")

  // Workflow
  status               VatReturnStatus  @default(draft)
  generatedBy          BigInt           @map("generated_by")
  reviewedBy           BigInt?          @map("reviewed_by")
  submittedAt          DateTime?        @map("submitted_at")
  lockedAt             DateTime?        @map("locked_at")
  createdAt            DateTime         @default(now()) @map("created_at")
  updatedAt            DateTime         @updatedAt @map("updated_at")

  company    Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  generator  User    @relation("vatReturnGenerator", fields: [generatedBy], references: [id])
  reviewer   User?   @relation("vatReturnReviewer", fields: [reviewedBy], references: [id])

  @@unique([companyId, taxMonth])
  @@map("vat_returns")
}
```

### Net Payable Formula

```
net_payable = output_vat + sd_payable
            − input_vat
            − vds_credit
            − carry_forward
            + increasing_adjustment
            − decreasing_adjustment
```

All monetary values `DECIMAL(14,2)`. Round to 2 decimal places via `round2()`.

---

## API Endpoints

Base path: `/api/v1/returns`. All endpoints require `authenticate` + `companyScope` middleware.

| Method | Path | Description | Role |
|--------|------|-------------|------|
| `GET` | `/returns` | List returns. Filter by `?fiscalYear=YYYY-YYYY` | admin + operator |
| `POST` | `/returns/generate` | Generate return for `{ taxMonth }`. Creates draft or re-aggregates existing draft. Returns in reviewed/submitted/locked cannot be regenerated. | admin + operator |
| `GET` | `/returns/:id` | Full return detail including `musak91Json` | admin + operator |
| `PUT` | `/returns/:id` | Update manual fields (carryForward, adjustments, notes). Draft only. | admin + operator |
| `POST` | `/returns/:id/review` | `draft → reviewed` | admin |
| `POST` | `/returns/:id/submit` | `reviewed → submitted` | admin |
| `POST` | `/returns/:id/lock` | `submitted → locked` | admin |
| `GET` | `/returns/:id/pdf` | Musak 9.1 bilingual PDF via Puppeteer | admin + operator |
| `GET` | `/returns/:id/nbr-export` | Stub — returns raw `musak91Json` | admin |

All responses use `{ success, data?, error? }` pattern via existing `response.ts` helpers.

---

## Aggregation Logic

Runs inside `return.service.ts` `generateReturn()`. All queries scoped by `companyId` and `challanDate` within the tax month.

```
// Sales invoices (status != cancelled, challanDate in tax_month)
total_sales_value  = SUM(grandTotal)
output_vat         = SUM(vatTotal)
sd_payable         = SUM(sdTotal)

// Purchase invoices (status != cancelled, challanDate in tax_month)
total_purchase_value = SUM(grandTotal)
input_vat            = SUM(vatTotal)

// VDS certificates (status = finalized, role = deductee, taxMonth = tax_month)
vds_credit = SUM(vdsAmount)
```

The `musak_91_json` blob is populated with all computed values keyed by section number, with empty/zero values for the 24 sections not yet auto-calculated. This structure is stable and can be extended without a schema migration.

---

## Server File Structure

**New files:**
- `server/src/validators/return.validator.ts` — Zod: `generateReturnSchema` (`taxMonth` YYYY-MM), `updateReturnSchema` (manual fields)
- `server/src/services/return.service.ts` — `generateReturn`, `listReturns`, `getReturnById`, `updateReturn`, `transitionStatus`, `getReturnPdfData`
- `server/src/controllers/return.controller.ts` — thin handlers delegating to service
- `server/src/routes/return.routes.ts` — route definitions, RBAC on review/submit/lock/nbr-export
- `server/src/templates/musak91.html` — bilingual Handlebars PDF template

**Modified files:**
- `server/prisma/schema.prisma` — `VatReturn` model, `VatReturnStatus` enum, relations on `User` and `Company`
- `server/src/app.ts` — mount `returnRoutes` at `/api/v1/returns`

After schema change: run `npm run db:push` (dev) or `npm run db:migrate`.

---

## Client File Structure

**New files:**
- `client/src/services/return.ts` — `listReturns`, `generateReturn`, `getReturn`, `updateReturn`, `reviewReturn`, `submitReturn`, `lockReturn`, `downloadReturnPdf`, `exportNbr`
- `client/src/pages/returns/ReturnList.tsx` — table of returns by fiscal year, "Generate" button per available month, status badges, link to detail
- `client/src/pages/returns/ReturnDetail.tsx` — two-panel layout:
  - Left: auto-calculated fields (read-only)
  - Right: manual fields (editable in draft) with live net payable preview
  - Bottom: workflow action buttons (admin only)

**Modified files:**
- `client/src/App.tsx` — routes `/returns` and `/returns/:id`
- `client/src/components/AppLayout.tsx` — "Monthly Return" sidebar link
- `client/src/types/index.ts` — `VatReturn`, `VatReturnStatus` types

---

## Status Transition Rules

| From | To | Who | Condition |
|------|----|-----|-----------|
| — | `draft` | admin/operator | `POST /generate` |
| `draft` | `draft` | admin/operator | `POST /generate` re-aggregates |
| `draft` | `reviewed` | admin | Manual review complete |
| `reviewed` | `submitted` | admin | Ready to file |
| `submitted` | `locked` | admin | Filing confirmed |
| `draft` | — | admin/operator | `PUT /:id` (adjustments) |

No backward transitions. Locked returns are immutable.

---

## PDF Template (musak91.html)

Bilingual (Bangla + English) Handlebars template rendered by the existing `pdf.service.ts`. Sections:

1. Company info (name, BIN, tax month, fiscal year)
2. Output tax summary (sales value, output VAT, SD)
3. Input tax summary (purchase value, input VAT)
4. VDS credit
5. Adjustments (carry-forward, increasing, decreasing)
6. Net payable (bold, highlighted)
7. Status + submission date footer

---

## Out of Scope (This Phase)

- Remaining 24-section Musak 9.1 fields (import VAT, export zero-rating, exemptions, penalties) — `musak_91_json` holds placeholders
- NBR portal export format — stub endpoint only
- Auto-pull carry-forward from prior month's return
- Invoice locking on return submission
