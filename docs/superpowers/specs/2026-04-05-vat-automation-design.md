# VAT Automation Software — Design Specification

## Overview

End-to-end Bangladesh VAT automation system covering Musak 6.3 (Challan) → Musak 6.6 (VDS Certificate) → Musak 6.7 (Register Mapping) → Musak 9.1 (Monthly Return). Multi-company, full multi-rate VAT, VDS support, bilingual PDF, NBR portal export.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + Vite + TypeScript + Ant Design + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma (MySQL connector) |
| Database | MySQL 8 (local, utf8mb4_unicode_ci) |
| Auth | JWT access + refresh tokens, RBAC middleware |
| PDF | Puppeteer (bilingual Bangla + English) |
| Excel/CSV | SheetJS + fast-csv |
| Queue | BullMQ + Redis (Phase 5+) |
| Validation | Zod (server-side input validation) |

## Project Structure

```
vat-system/
├── client/                    # React + Vite + Ant Design
│   ├── src/
│   │   ├── components/        # Shared UI components
│   │   ├── pages/             # Route pages
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API client (axios)
│   │   ├── utils/             # VAT calc, BIN validation, formatters
│   │   ├── i18n/              # bn.json, en.json
│   │   ├── contexts/          # Auth, Company context providers
│   │   └── types/             # Shared TypeScript types
│   └── package.json
├── server/
│   ├── src/
│   │   ├── routes/            # Express route files
│   │   ├── controllers/       # Request handlers
│   │   ├── services/          # Business logic (VAT calc, mapping, PDF)
│   │   ├── middleware/        # auth, rbac, audit, companyScope
│   │   ├── templates/         # HTML templates for Puppeteer PDF
│   │   ├── validators/        # Zod schemas for input validation
│   │   └── utils/             # round2, fiscal year, BIN validation
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Seed data
│   └── package.json
├── .env.example
└── package.json               # Root scripts (dev, build)
```

## Database Schema

### users
- id: BIGINT PK AUTO_INCREMENT
- full_name: VARCHAR(150) NOT NULL
- email: VARCHAR(150) UNIQUE NOT NULL
- password_hash: VARCHAR(255) NOT NULL
- status: ENUM('active','inactive') DEFAULT 'active'
- created_at, updated_at: DATETIME NOT NULL
- Note: role is per-company via user_companies table, not on users

### companies
- id: BIGINT PK AUTO_INCREMENT
- name: VARCHAR(200) NOT NULL
- bin: VARCHAR(13) NOT NULL (validated 13-digit)
- address: TEXT NOT NULL
- challan_prefix: VARCHAR(20) DEFAULT 'CH'
- next_challan_no: INT DEFAULT 1 (atomic locking on increment)
- fiscal_year_start: TINYINT DEFAULT 7 (July)
- created_at, updated_at: DATETIME NOT NULL

### user_companies (multi-company access)
- id: BIGINT PK AUTO_INCREMENT
- user_id: BIGINT NOT NULL FK(users)
- company_id: BIGINT NOT NULL FK(companies)
- role: ENUM('admin','operator') NOT NULL
- UNIQUE(user_id, company_id)

### customers
- id: BIGINT PK AUTO_INCREMENT
- company_id: BIGINT NOT NULL FK(companies)
- name: VARCHAR(200) NOT NULL
- bin_nid: VARCHAR(50)
- phone: VARCHAR(30)
- address: TEXT
- is_vds_entity: BOOLEAN DEFAULT false
- vds_entity_type: VARCHAR(50) (bank/govt/ngo/listed_company)
- created_at, updated_at: DATETIME NOT NULL

### products
- id: BIGINT PK AUTO_INCREMENT
- company_id: BIGINT NOT NULL FK(companies)
- product_code: VARCHAR(50)
- hs_code: VARCHAR(20)
- service_code: VARCHAR(20)
- name: VARCHAR(200) NOT NULL
- name_bn: VARCHAR(200) (Bangla name)
- type: ENUM('product','service') NOT NULL
- vat_rate: DECIMAL(5,2) NOT NULL
- sd_rate: DECIMAL(5,2) DEFAULT 0
- specific_duty_amount: DECIMAL(14,2) DEFAULT 0
- truncated_base_pct: DECIMAL(5,2) DEFAULT 100 (100 = no truncation)
- unit: VARCHAR(50) DEFAULT 'pcs'
- unit_price: DECIMAL(14,2) DEFAULT 0
- is_active: BOOLEAN DEFAULT true
- created_at, updated_at: DATETIME NOT NULL

### invoices
- id: BIGINT PK AUTO_INCREMENT
- company_id: BIGINT NOT NULL FK(companies)
- customer_id: BIGINT NULL FK(customers)
- invoice_type: ENUM('sales','purchase') NOT NULL
- challan_no: VARCHAR(50) NOT NULL UNIQUE
- challan_date: DATE NOT NULL
- subtotal: DECIMAL(14,2) NOT NULL
- sd_total: DECIMAL(14,2) DEFAULT 0
- vat_total: DECIMAL(14,2) NOT NULL
- specific_duty_total: DECIMAL(14,2) DEFAULT 0
- grand_total: DECIMAL(14,2) NOT NULL
- vds_applicable: BOOLEAN DEFAULT false
- vds_amount: DECIMAL(14,2) DEFAULT 0
- net_receivable: DECIMAL(14,2) NOT NULL
- status: ENUM('draft','approved','cancelled','locked') DEFAULT 'draft'
- created_by: BIGINT NOT NULL FK(users)
- approved_by: BIGINT NULL FK(users)
- locked_at: DATETIME NULL
- created_at, updated_at: DATETIME NOT NULL

### invoice_items
- id: BIGINT PK AUTO_INCREMENT
- invoice_id: BIGINT NOT NULL FK(invoices)
- product_id: BIGINT NOT NULL FK(products)
- description: VARCHAR(255) NOT NULL
- description_bn: VARCHAR(255)
- hs_code: VARCHAR(20)
- qty: DECIMAL(14,3) NOT NULL
- unit_price: DECIMAL(14,2) NOT NULL
- vat_rate: DECIMAL(5,2) NOT NULL
- sd_rate: DECIMAL(5,2) DEFAULT 0
- specific_duty_amount: DECIMAL(14,2) DEFAULT 0
- truncated_base_pct: DECIMAL(5,2) DEFAULT 100
- taxable_value: DECIMAL(14,2) NOT NULL
- sd_amount: DECIMAL(14,2) DEFAULT 0
- vat_amount: DECIMAL(14,2) NOT NULL
- specific_duty_line: DECIMAL(14,2) DEFAULT 0
- line_total: DECIMAL(14,2) NOT NULL
- grand_total: DECIMAL(14,2) NOT NULL
- vds_rate: DECIMAL(5,2) DEFAULT 0
- vds_amount: DECIMAL(14,2) DEFAULT 0
- created_at, updated_at: DATETIME NOT NULL

### sales_register
- id: BIGINT PK AUTO_INCREMENT
- company_id: BIGINT NOT NULL FK(companies)
- invoice_id: BIGINT NOT NULL UNIQUE FK(invoices)
- tax_month: CHAR(7) NOT NULL (YYYY-MM)
- challan_no: VARCHAR(50) NOT NULL
- challan_date: DATE NOT NULL
- customer_name: VARCHAR(200)
- customer_bin: VARCHAR(30)
- hs_code: VARCHAR(20)
- vat_rate: DECIMAL(5,2)
- sd_rate: DECIMAL(5,2)
- taxable_value: DECIMAL(14,2) NOT NULL
- sd_amount: DECIMAL(14,2) DEFAULT 0
- vat_amount: DECIMAL(14,2) NOT NULL
- specific_duty_amount: DECIMAL(14,2) DEFAULT 0
- total_amount: DECIMAL(14,2) NOT NULL
- vds_amount: DECIMAL(14,2) DEFAULT 0
- created_at: DATETIME NOT NULL

### purchase_register
- id: BIGINT PK AUTO_INCREMENT
- company_id: BIGINT NOT NULL FK(companies)
- invoice_id: BIGINT NOT NULL UNIQUE FK(invoices)
- tax_month: CHAR(7) NOT NULL
- challan_no: VARCHAR(50) NOT NULL
- challan_date: DATE NOT NULL
- supplier_name: VARCHAR(200)
- supplier_bin: VARCHAR(30)
- hs_code: VARCHAR(20)
- vat_rate: DECIMAL(5,2)
- sd_rate: DECIMAL(5,2)
- taxable_value: DECIMAL(14,2) NOT NULL
- sd_amount: DECIMAL(14,2) DEFAULT 0
- vat_amount: DECIMAL(14,2) NOT NULL
- specific_duty_amount: DECIMAL(14,2) DEFAULT 0
- total_amount: DECIMAL(14,2) NOT NULL
- vds_applicable: BOOLEAN DEFAULT false
- vds_amount: DECIMAL(14,2) DEFAULT 0
- created_at: DATETIME NOT NULL

### vds_certificates
- id: BIGINT PK AUTO_INCREMENT
- company_id: BIGINT NOT NULL FK(companies)
- certificate_no: VARCHAR(50) NOT NULL
- invoice_id: BIGINT NULL FK(invoices)
- issuer_bin: VARCHAR(13) NOT NULL
- issuer_name: VARCHAR(200) NOT NULL
- recipient_bin: VARCHAR(13) NOT NULL
- recipient_name: VARCHAR(200) NOT NULL
- challan_date: DATE NOT NULL
- taxable_value: DECIMAL(14,2) NOT NULL
- vat_amount: DECIMAL(14,2) NOT NULL
- vds_rate: DECIMAL(5,2) NOT NULL
- vds_amount: DECIMAL(14,2) NOT NULL
- treasury_challan_no: VARCHAR(50)
- treasury_deposit_date: DATE
- status: ENUM('issued','received','claimed') NOT NULL
- fiscal_year: VARCHAR(9) NOT NULL (YYYY-YYYY)
- created_at, updated_at: DATETIME NOT NULL

### vds_treasury_deposits
- id: BIGINT PK AUTO_INCREMENT
- company_id: BIGINT NOT NULL FK(companies)
- treasury_challan_no: VARCHAR(50) NOT NULL
- deposit_date: DATE NOT NULL
- amount: DECIMAL(14,2) NOT NULL
- bank_name: VARCHAR(200)
- branch: VARCHAR(200)
- deposited_by: BIGINT NOT NULL FK(users)
- created_at: DATETIME NOT NULL

### vat_returns
- id: BIGINT PK AUTO_INCREMENT
- company_id: BIGINT NOT NULL FK(companies)
- tax_month: CHAR(7) NOT NULL
- fiscal_year: VARCHAR(9) NOT NULL (YYYY-YYYY)
- total_sales_value: DECIMAL(14,2) NOT NULL
- output_vat: DECIMAL(14,2) NOT NULL
- input_vat: DECIMAL(14,2) NOT NULL
- sd_payable: DECIMAL(14,2) DEFAULT 0
- vds_credit_claimed: DECIMAL(14,2) DEFAULT 0
- vat_payable: DECIMAL(14,2) NOT NULL
- net_payable: DECIMAL(14,2) NOT NULL
- carry_forward_from_previous: DECIMAL(14,2) DEFAULT 0
- increasing_adjustment: DECIMAL(14,2) DEFAULT 0
- decreasing_adjustment: DECIMAL(14,2) DEFAULT 0
- musak_91_json: JSON NOT NULL (mirrors all 24+ official sections)
- status: ENUM('draft','reviewed','submitted','locked') DEFAULT 'draft'
- generated_at: DATETIME NOT NULL
- generated_by: BIGINT NOT NULL FK(users)
- reviewed_by: BIGINT NULL FK(users)
- submitted_at: DATETIME NULL
- locked_at: DATETIME NULL

### audit_logs (APPEND-ONLY — no UPDATE/DELETE)
- id: BIGINT PK AUTO_INCREMENT
- user_id: BIGINT NOT NULL FK(users)
- company_id: BIGINT NOT NULL FK(companies)
- entity_type: VARCHAR(50) NOT NULL
- entity_id: BIGINT NOT NULL
- action: VARCHAR(50) NOT NULL
- old_values: JSON
- new_values: JSON
- ip_address: VARCHAR(50)
- created_at: DATETIME NOT NULL

## VAT Calculation Rules

### Standard
```
taxable_value    = qty × unit_price
sd_amount        = taxable_value × (sd_rate / 100)
vat_base         = taxable_value + sd_amount
vat_amount       = vat_base × (vat_rate / 100)
grand_total      = taxable_value + sd_amount + vat_amount
```

### Truncated Base
```
effective_base   = taxable_value × (truncated_base_pct / 100)
vat_amount       = effective_base × (vat_rate / 100)
grand_total      = taxable_value + vat_amount
```

### Specific Duty
```
specific_duty    = qty × specific_duty_amount_per_unit
grand_total      = taxable_value + specific_duty + vat_amount
```

### VDS
```
vds_amount       = vat_amount × (vds_rate / 100)
net_receivable   = grand_total - vds_amount
```

### Monthly Return (Musak 9.1)
```
net_payable = output_vat - input_vat - vds_credit
            + increasing_adj - decreasing_adj
            - carry_forward + sd_payable
```

All monetary: DECIMAL(14,2). Quantities: DECIMAL(14,3). Round to 2 decimals.

## API Design

All endpoints prefixed with `/api/v1/`. All data-access endpoints scoped by company_id from JWT + middleware.

### Auth
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

### Companies
- GET /companies (user's companies)
- POST /companies
- GET /companies/:id
- PUT /companies/:id
- DELETE /companies/:id (soft delete)

### Products
- GET /products
- POST /products
- GET /products/:id
- PUT /products/:id
- DELETE /products/:id (soft delete)

### Customers
- GET /customers
- POST /customers
- GET /customers/:id
- PUT /customers/:id
- DELETE /customers/:id (soft delete)

### Invoices (Musak 6.3)
- GET /invoices
- POST /invoices (create with items)
- GET /invoices/:id
- PUT /invoices/:id (only if draft)
- POST /invoices/:id/approve
- POST /invoices/:id/cancel (only if draft)
- POST /invoices/:id/lock
- GET /invoices/:id/pdf

### Registers (Musak 6.7)
- GET /registers/sales
- GET /registers/purchases
- GET /registers/exceptions

### VDS (Musak 6.6)
- GET /vds/certificates
- POST /vds/certificates
- GET /vds/certificates/:id
- PUT /vds/certificates/:id
- GET /vds/treasury-deposits
- POST /vds/treasury-deposits

### Returns (Musak 9.1)
- GET /returns
- POST /returns/generate (auto-generate for a tax_month)
- GET /returns/:id
- PUT /returns/:id (adjustments)
- POST /returns/:id/review
- POST /returns/:id/submit
- POST /returns/:id/lock
- GET /returns/:id/pdf
- GET /returns/:id/nbr-export

### Reports
- GET /reports/vat-summary
- GET /reports/vat-payable
- GET /reports/sales-summary
- GET /reports/purchase-summary
- GET /reports/vds-summary

### Import/Export
- POST /import/upload
- POST /import/map-columns
- POST /import/execute
- GET /export/:type (pdf/excel/csv)

### Audit
- GET /audit-logs

## Roles & Access Control

| Endpoint Category | Admin | Operator |
|-------------------|-------|----------|
| Auth | All | All |
| Companies (create/edit) | Yes | No |
| Products CRUD | Yes | Yes |
| Customers CRUD | Yes | Yes |
| Invoices (create/edit) | Yes | Yes |
| Invoices (approve/lock) | Yes | No |
| Registers (view) | Yes | Yes |
| VDS management | Yes | No |
| Returns (generate/view) | Yes | Yes |
| Returns (review/submit/lock) | Yes | No |
| Reports (view) | Yes | Yes |
| Import/Export | Yes | Yes |
| Audit logs (view) | Yes | No |
| Settings | Yes | No |

## Data Flow: 6.3 → 6.6 → 6.7 → 9.1

1. Operator creates invoice (Musak 6.3) with line items
2. VAT Calculation Engine computes all amounts (VAT, SD, specific duty, VDS)
3. Admin approves invoice → status changes to 'approved'
4. Mapping Engine auto-posts to sales_register or purchase_register
5. If VDS applicable → VDS certificate (Musak 6.6) generated
6. At month-end: registers aggregated by tax_month and rate category
7. Musak 9.1 draft auto-generated with all 24+ sections populated
8. Admin reviews, applies adjustments, submits, locks
9. Export in NBR portal compatible format

## Fiscal Year

July 1 – June 30. Format: `2025-2026`. Challan serial resets at fiscal year boundary. All annual reports use this boundary.

## Bilingual PDF

Puppeteer renders HTML templates with embedded Bangla fonts (Noto Sans Bengali). Each PDF template has both Bangla and English labels. Templates stored in `server/src/templates/`.

## Build Phases

### Phase 1 — Foundation ✅ PENDING
Project scaffolding, auth, company/product/customer CRUD, Ant Design shell.

### Phase 2 — Musak 6.3 Invoice + VAT Calc ✅ PENDING
Invoice form, VAT calculation engine, PDF generation, challan numbering.

### Phase 3 — Registers + Mapping ✅ PENDING
Auto-post to registers, exception queue, register views.

### Phase 4 — Musak 9.1 Return + VDS ✅ PENDING
VDS certificates, monthly return generation, review/submit workflow.

### Phase 5 — Import/Export + NBR Portal ✅ PENDING
CSV/Excel import, NBR export format, BullMQ queue.

### Phase 6 — Audit, Backup, Dashboard ✅ PENDING
Audit trail, backup scheduler, dashboard KPIs, settings.
