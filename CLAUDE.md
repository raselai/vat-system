# VAT Automation Software — Bangladesh

## Project Overview

End-to-end Bangladesh VAT automation system covering the full workflow:
**Musak 6.3 (Challan)** → **Musak 6.6 (VDS Certificate)** → **Musak 6.7 (Register Mapping)** → **Musak 9.1 (Monthly Return)**

Multi-company system with full multi-rate VAT support, VDS (VAT Deducted at Source), bilingual PDF generation (Bangla + English), NBR online portal export compatibility, and role-based access control.

### Key Decisions

| Decision | Choice |
|----------|--------|
| Company model | Multi-company (company_id scoped throughout) |
| VAT rate structure | Full multi-rate: 0%, 5%, 7.5%, 10%, 15%, SD, specific duty, truncated base |
| VDS support | Yes — withholding, VDS certificates (Musak 6.6), VDS credit in 9.1 |
| PDF language | Bilingual — Bangla + English |
| NBR portal export | Required now — export format compatible with NBR online submission |

## Tech Stack

| Layer | Stack | Notes |
|-------|-------|-------|
| Frontend | React + Vite + Tailwind CSS / MUI | Bangla font support required (Noto Sans Bengali / SolaimanLipi) |
| Backend | Node.js + Express (or NestJS) | API modularity, PDF and validation workflows |
| Database | MySQL 8 (`utf8mb4` charset) | All tables must use `utf8mb4_unicode_ci` for Bangla text |
| Auth | JWT + refresh token + RBAC | Multi-user, multi-company scoped |
| PDF | Puppeteer (primary) | Puppeteer chosen over jsPDF for reliable Bangla rendering |
| Excel/CSV | SheetJS + fast-csv | Import/export + NBR portal compatible export |
| Queue | BullMQ + Redis | Scheduled reports, backups, bulk import |
| Storage | S3-compatible / local encrypted storage | PDF archive, backup, 6-year legal retention |

## Architecture — Modules

- **Invoice Module (Musak 6.3)** — Challan data entry with full NBR field set: product/service dropdown, HS code/service code, VAT rate dropdown (multi-rate), SD rate, specific duty, quantity, unit price, auto challan number (atomic, race-condition safe), company auto-fill, bilingual print-ready PDF
- **VDS Module (Musak 6.6)** — VDS withholding on purchase, VDS certificate issuance, treasury challan deposit tracking, VDS credit claim management for sellers
- **VAT Calculation Engine** — Multi-rate line-level calculation, SD and specific duty support, truncated base value calculation, VDS amount computation, multi-line invoice support, summary totals by VAT rate/product/tax period
- **Mapping Engine** — Sales challan → sales register, purchase challan → purchase register, register totals → monthly summary (grouped by rate category), monthly summary → Musak 9.1 return (all 24+ sections). Exception queue for missing BIN, invalid VAT rate, or draft invoices
- **Reporting Engine** — Sales Register, Purchase Register, VAT Payable Report, Monthly VAT Summary, Draft 9.1 Return Preview, VDS Summary Report
- **Import/Export Service** — CSV/Excel import with column mapping assistant, export to PDF/Excel/CSV, NBR portal compatible export format, validation report after import
- **PDF Generator** — Bilingual (Bangla + English) Musak 6.3 challan, Musak 6.6 VDS certificate, and 9.1 return export using Puppeteer with embedded Bangla fonts
- **NBR Export Module** — Generate export files compatible with NBR online portal submission format
- **Audit Trail Service** — Truly immutable log (no UPDATE/DELETE allowed on audit table), before/after values for every CUD operation, IP address tracking
- **Backup Scheduler** — Daily automated encrypted backups, soft delete + restore, 6-year retention policy per legal requirement

## Database Tables

### Core Tables

- `users` — id, full_name, email, password_hash, role (admin/operator), status, created_at, updated_at
- `companies` — id, name, bin (13-digit validated), address, challan_prefix, next_challan_no (use DB-level locking for atomic increment), fiscal_year_start (default July), created_at, updated_at
- `customers` — id, company_id, name, bin_nid (13-digit BIN validation when provided), phone, address, is_vds_entity (boolean), vds_entity_type, created_at, updated_at
- `products` — id, company_id, product_code, hs_code, service_code, name, name_bn (Bangla), type (product/service), vat_rate, sd_rate, specific_duty_amount, truncated_base_pct, unit, unit_price, is_active, created_at, updated_at

### Invoice Tables

- `invoices` — id, company_id, customer_id, invoice_type (sales/purchase), challan_no (unique per company per fiscal year), challan_date, subtotal, sd_total, vat_total, specific_duty_total, grand_total, vds_applicable, vds_amount, net_receivable, status (draft/approved/cancelled/locked), created_by, approved_by, locked_at, created_at, updated_at
- `invoice_items` — id, invoice_id, product_id, description, description_bn, hs_code, qty, unit_price, vat_rate, sd_rate, specific_duty_amount, truncated_base_pct, taxable_value, sd_amount, vat_amount, specific_duty_line, line_total, grand_total, vds_rate, vds_amount, created_at, updated_at

### VDS Tables

- `vds_certificates` — id, company_id, certificate_no, invoice_id, issuer_bin, issuer_name, recipient_bin, recipient_name, challan_date, taxable_value, vat_amount, vds_rate, vds_amount, treasury_challan_no, treasury_deposit_date, status (issued/received/claimed), fiscal_year, created_at, updated_at
- `vds_treasury_deposits` — id, company_id, treasury_challan_no, deposit_date, amount, bank_name, branch, deposited_by, created_at

### Register Tables

- `sales_register` — id, company_id, invoice_id (unique), tax_month (YYYY-MM), challan_no, challan_date, customer_name, customer_bin, hs_code, vat_rate, sd_rate, taxable_value, sd_amount, vat_amount, specific_duty_amount, total_amount, vds_amount, created_at
- `purchase_register` — id, company_id, invoice_id (unique), tax_month, challan_no, challan_date, supplier_name, supplier_bin, hs_code, vat_rate, sd_rate, taxable_value, sd_amount, vat_amount, specific_duty_amount, total_amount, vds_applicable, vds_amount, created_at

### Return & Audit Tables

- `vat_returns` — id, company_id, tax_month, fiscal_year (YYYY-YYYY format, July-June), total_sales_value, output_vat, input_vat, sd_payable, vds_credit_claimed, vat_payable, net_payable, carry_forward_from_previous, increasing_adjustment, decreasing_adjustment, musak_91_json (mirrors all 24+ official sections), status (draft/reviewed/submitted/locked), generated_at, generated_by, reviewed_by, submitted_at, locked_at
- `audit_logs` — id, user_id, company_id, entity_type, entity_id, action, old_values (JSON), new_values (JSON), ip_address, created_at — **NO UPDATE/DELETE triggers or permissions on this table**

## Core Workflow

1. Admin sets up company profile: name, BIN (13-digit validated), address, challan serial pattern, fiscal year period (July-June)
2. Products/services saved in product master with HS codes, VAT rates, SD rates, specific duty, truncated base percentages
3. Customers/suppliers saved with BIN validation and VDS entity flag
4. Operator creates challan: selects items, system auto-fills rates from product master, enters quantity and unit price
5. System calculates in real-time: taxable value, SD, VAT (handling truncated base and specific duty), VDS withholding if applicable
6. System generates bilingual Musak 6.3 PDF via Puppeteer
7. On save, transaction auto-maps to sales/purchase register with rate-category breakdown
8. For VDS transactions: VDS certificate (Musak 6.6) generated, treasury deposit tracked
9. Month-end engine aggregates totals into VAT payable report grouped by rate category
10. Approved transactions auto-populate draft Musak 9.1 return across all 24+ sections including VDS credit
11. Admin reviews, locks, exports in NBR portal compatible format, and archives
12. Archived data retained for 6 years per legal requirement

## VAT Calculation Rules

### Standard Calculation
```
Taxable Value    = Quantity × Unit Price
SD Amount        = Taxable Value × (SD Rate / 100)          -- if applicable
VAT Base         = Taxable Value + SD Amount                 -- VAT is on value + SD
VAT Amount       = VAT Base × (VAT Rate / 100)
Grand Total      = Taxable Value + SD Amount + VAT Amount
```

### Truncated Base Calculation
```
Effective Base   = Taxable Value × (Truncated Base % / 100)  -- e.g., 30%
VAT Amount       = Effective Base × (VAT Rate / 100)
Grand Total      = Taxable Value + VAT Amount
```

### Specific Duty
```
Specific Duty    = Quantity × Specific Duty Amount per Unit  -- flat amount, not percentage
Grand Total      = Taxable Value + Specific Duty + VAT Amount
```

### VDS Calculation
```
VDS Amount       = VAT Amount × (VDS Rate / 100)             -- typically 33.33% to 100%
Net Receivable   = Grand Total - VDS Amount                   -- seller receives this
```

### Monthly Return (Musak 9.1)
```
Output VAT             = SUM(sales_register.vat_amount) grouped by rate
Input VAT              = SUM(purchase_register.vat_amount) grouped by rate
SD Payable             = SUM(sd_amount) from sales
VDS Credit             = SUM(vds_certificates.vds_amount) where status = 'claimed'
Carry Forward          = previous month's excess credit (if any)
Increasing Adjustment  = manual adjustments increasing liability
Decreasing Adjustment  = manual adjustments decreasing liability
Net Payable            = Output VAT - Input VAT - VDS Credit - Carry Forward
                         + Increasing Adj - Decreasing Adj + SD Payable
```

All monetary values use `DECIMAL(14,2)`. Quantities use `DECIMAL(14,3)`. Always round to 2 decimal places (`round2`).

## Data Mapping: 6.3 → 6.6 → 6.7 → 9.1

| Source | Output | Rule |
|--------|--------|------|
| Challan header | Sales/Purchase Register header | Copy challan_no, date, party info, BIN |
| Challan item lines | Register line totals | Aggregate by rate category: taxable_value, SD, VAT, specific_duty, VDS |
| VDS transaction | VDS Certificate (Musak 6.6) | Generate certificate with treasury deposit reference |
| Approved register entries | Monthly VAT Summary | Group by tax_month, invoice_type, AND rate category |
| VDS certificates received | 9.1 VDS credit section | Sum claimed VDS amounts for the month |
| Monthly summary | Musak 9.1 draft (all 24+ sections) | Map each rate's output/input VAT, SD, VDS credit, adjustments |
| Any create/update/delete | Audit Log | Immutable before/after values save |

## Musak 9.1 Return Sections (Key)

The `musak_91_json` must mirror the official NBR form structure including (but not limited to):
- Section 1-3: Company info, BIN, tax period
- Section 4-6: Sales at 15%, sales at reduced rates (5%, 7.5%, 10%), zero-rated sales
- Section 7: Exempt supplies
- Section 8-10: Output VAT by rate category
- Section 11-14: Purchases and input VAT by category
- Section 15-16: SD payable
- Section 17: VDS credit claimed
- Section 18-19: Increasing/decreasing adjustments
- Section 20: Carry forward from previous period
- Section 21-22: Net VAT and SD payable
- Section 23: Treasury challan deposit details
- Section 24: Declaration

## Fiscal Year

Bangladesh fiscal year: **July 1 - June 30**. All annual reporting, challan serial resets, carry-forward calculations, and fiscal year references use this boundary. Format: `2025-2026` meaning July 2025 to June 2026.

## BIN Validation

BIN (Business Identification Number) is **13 digits**. Validation rules:
- Must be exactly 13 numeric characters
- Validate format on all entry points (customer, supplier, company)
- Store as `VARCHAR(13)` with CHECK constraint
- Display with standard grouping if applicable

## Challan Numbering

- Format: `{prefix}-{fiscal_year}-{sequential_number}` (e.g., `CH-2025-0001`)
- Sequential per company, per fiscal year (July-June)
- **Must use database-level atomic locking** (`SELECT ... FOR UPDATE` or equivalent) to prevent duplicate numbers under concurrent access
- No gaps allowed — gaps are auditable by NBR
- Reset sequence at fiscal year boundary

## Roles & Access

- **Admin** — Full access: company setup, user management, approval, lock, export, archive, settings, VDS management
- **Operator** — Challan creation, data entry, view registers and reports, generate draft returns

## Expected Project Structure

```
client/                  # React frontend (Vite)
  src/
    components/          # Reusable UI components
    pages/               # Route-level pages (Dashboard, Musak63, Musak66, Sales, Purchase, Reports, Returns, VDS, Audit, Settings)
    hooks/               # Custom React hooks
    services/            # API client functions
    utils/               # Shared utilities (VAT calc, formatting, BIN validation)
    i18n/                # Bangla + English translations
    fonts/               # Bangla fonts (Noto Sans Bengali / SolaimanLipi)
server/                  # Node.js backend
  src/
    routes/              # Express/NestJS route handlers
    controllers/         # Business logic controllers
    models/              # Database models / ORM entities
    middleware/          # Auth, RBAC, company-scope, audit logging middleware
    services/            # Core services (VAT calc, mapping, PDF, VDS, import/export, NBR export)
    templates/           # PDF templates (bilingual Musak 6.3, 6.6, 9.1)
    utils/               # Helpers (round2, date formatting, fiscal year, BIN validation)
    validators/          # Input validation schemas
db/
  migrations/            # SQL migration files
  seeds/                 # Seed data (VAT rates, HS codes)
```

## Coding Conventions

- Use TypeScript for both client and server
- API responses follow `{ success: boolean, data?: T, error?: string }` pattern
- All monetary calculations must use the centralized VAT calculation engine — never inline math
- Audit logging is automatic on every CUD operation via middleware — audit_logs table is append-only (no UPDATE/DELETE)
- Invoice status transitions: `draft` → `approved` → `locked` (or `cancelled` from `draft`). `locked` is truly immutable — no modification even by admin
- `tax_month` format: `YYYY-MM` (CHAR(7))
- `fiscal_year` format: `YYYY-YYYY` (e.g., `2025-2026`)
- Challan numbers: `{prefix}-{fiscal_year}-{sequential}` with atomic DB locking
- All queries must be scoped by `company_id` — never leak data across companies
- MySQL charset: `utf8mb4`, collation: `utf8mb4_unicode_ci` on all tables
- BIN validation (13-digit numeric) on all entry points
- PDF generation via Puppeteer with embedded Bangla fonts
- All date/period logic must respect July-June fiscal year boundary
- Data retention: 6 years minimum for all VAT records per legal requirement

## NBR Portal Export Compatibility

The system must generate export files compatible with NBR's online VAT return submission portal:
- Musak 9.1 return data in NBR-accepted format
- Field mapping must match NBR portal field names and order
- Export as structured file (XML/JSON/CSV as required by NBR portal)
- Validation against NBR field requirements before export
- Include all mandatory fields: BIN, tax period, rate-wise breakdowns, VDS credits, treasury references

## Compliance Checklist

Before production deployment, verify against current NBR requirements:
- [ ] Musak 6.3 official field structure matches implementation
- [ ] Musak 6.6 VDS certificate format matches NBR template
- [ ] Musak 9.1 all 24+ sections correctly mapped
- [ ] Challan serial numbering rules per NBR circular
- [ ] BIN format and validation rules
- [ ] HS code / service code list is current
- [ ] VAT rate schedule is current (rates change via SRO)
- [ ] VDS rate schedule and designated entity list is current
- [ ] SD rate schedule is current
- [ ] NBR portal export format tested against actual portal
- [ ] Data retention policy meets 6-year legal requirement
- [ ] Audit log immutability verified (no UPDATE/DELETE possible)
- [ ] Bangla text rendering verified in all PDF outputs
- [ ] Fiscal year (July-June) boundary handling verified
- [ ] Legal review of all form fields completed
