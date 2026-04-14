# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run both client + server in dev mode (from root)
npm run dev

# Run individually
npm run dev:client          # Vite on http://localhost:5173
npm run dev:server          # Express on http://localhost:4000

# Build
npm run build               # Builds both client and server

# Type-check (no emit) — run after every change
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit

# Database (from server/)
npm run db:migrate          # prisma migrate dev (creates migration files)
npm run db:push             # prisma db push (sync schema without migration)
npm run db:deploy           # prisma migrate deploy (production/CI)
npm run db:seed             # tsx prisma/seed.ts
npm run db:studio           # prisma studio (GUI)
```

## Architecture

Monorepo with two packages — `client/` (React SPA) and `server/` (Express API). No shared code package; the VAT calculation engine is duplicated in both (`server/src/services/vatCalc.service.ts` and `client/src/utils/vatCalc.ts`) and must be kept in sync manually.

### Server (`server/`)

- **Runtime**: Node.js + Express + TypeScript, compiled via `tsx` (dev) / `tsc` (prod)
- **ORM**: Prisma with MySQL 8 (`utf8mb4` charset). Schema at `server/prisma/schema.prisma`
- **Auth**: JWT access + refresh tokens. `server/src/utils/jwt.ts` handles signing/verification
- **Middleware chain** (applied per route): `authenticate` → `companyScope` → `rbac` (where needed) → `auditLog` → route handler
  - `authenticate` — verifies Bearer token, sets `req.user`
  - `companyScope` — reads `x-company-id` header, validates user membership, sets `req.companyId` and `req.companyRole`
  - `rbac` — checks `req.companyRole` against required role
  - `auditLog` — fire-and-forget write on `res.on('finish')` for mutating methods
- **Validation**: Zod schemas in `server/src/validators/` — always validated before controller logic
- **API pattern**: All responses use `{ success: boolean, data?: T, error?: string }` via helpers in `server/src/utils/response.ts` (`success()`, `error()`, `notFound()`, `unauthorized()`, `forbidden()`)
- **PDF generation**: Puppeteer + Handlebars. Templates in `server/src/templates/`:
  - `musak63.html` — Tax Invoice / Challan (Musak 6.3)
  - `musak66.html` — VDS Certificate (Musak 6.6)
  - `musak67.html` — Sales/Purchase Register (Musak 6.7), landscape
  - `musak91.html` — Monthly VAT Return (Musak 9.1)
  - `nbr-filing-guide.html` — NBR portal filing cheat sheet (filing guide PDF)
  - `Logo.png` — Bangladesh government seal, embedded as base64 in all PDF templates via `readLogoAsBase64()` in `pdf.service.ts`
  - Each template has a dedicated `generateXxxPdf()` export in `pdf.service.ts` following: read template → compile → render → return `Buffer`
  - On Vercel (`process.env.VERCEL`), switches to `@sparticuz/chromium` + `puppeteer-core`; locally uses standard `puppeteer` with a singleton browser instance
- **Challan numbering**: `server/src/utils/challan.ts` — `generateChallanNo()` runs inside a Prisma transaction with `SELECT ... FOR UPDATE` to atomically lock the company row and increment `next_challan_no`. Format: `{prefix}-{fiscal_year}-{seq padded to 4}`
- **Route prefix**: All routes under `/api/v1/`

### Client (`client/`)

- **Stack**: React 18 + Vite + TypeScript + Ant Design 5 + Tailwind CSS
- **Design system**: "Sovereign Ledger" branding — green primary (`#00503a`), Plus Jakarta Sans headlines, Inter body, Material Symbols Outlined icons. Color tokens in `tailwind.config.js` using M3 palette
- **Auth flow**: `AuthContext` manages JWT tokens in localStorage. `ProtectedRoute` wraps authenticated routes
- **Company context**: `CompanyContext` tracks the active company. `client/src/services/api.ts` auto-attaches `Authorization` and `x-company-id` headers on every request via axios interceptors
- **Routing**: React Router v7. `AppLayout` provides sidebar + header shell; pages render via `<Outlet />`
- **Vite proxy**: `/api` → `http://localhost:4000`
- **Tailwind + Ant Design**: Tailwind preflight disabled (`corePlugins.preflight: false`). Ant Design table overrides in `client/src/index.css`
- **Static assets**: `client/Image/` — government logo (`Logo.png`) used in challan preview. Import with `import logoUrl from '../../Image/Logo.png'` (Vite handles hashing). `vite-env.d.ts` already includes image type declarations

### VDS Module (`/api/v1/vds`)

- **VDS Certificates** (Musak 6.6): CRUD + finalize/cancel. Auto-create from invoice via `POST /certificates/from-invoice/:invoiceId`. Supports `deductor` (buyer) and `deductee` (seller) roles
- **Treasury Deposits**: Linked to certificates via `vds_certificate_deposits` junction table. Status: `pending` → `deposited` → `verified`
- **Certificate numbering**: `VDS-{fiscal_year}-{sequential}` per company
- **Monthly summary**: `GET /summary?taxMonth=YYYY-MM` aggregates deducted vs deposited amounts

### Sales/Purchase Register (`/api/v1/registers`)

- Read-only views derived from invoices — no separate data entry
- `GET /registers/sales?taxMonth=YYYY-MM` and `GET /registers/purchase?taxMonth=YYYY-MM`
- `GET /registers/:type/pdf` — landscape Musak 6.7 PDF
- Totals feed directly into Musak 9.1 monthly return generation

### Monthly Return (`/api/v1/returns`)

- **Generation**: `POST /returns/generate` aggregates non-cancelled invoices and finalized deductee VDS certificates for the `taxMonth`, computes net payable, saves as `draft`. Re-generation blocked once status is `reviewed`/`submitted`/`locked`
- **Status flow**: `draft` → `reviewed` → `submitted` → `locked`. Admin-only beyond `draft`. No backward transitions
- **Net payable**: `outputVat + sdPayable − inputVat − vdsCredit − carryForward + increasingAdj − decreasingAdj`
- **24-section JSON**: `musak91Json` field stores all sections; sections 11–24 are zero placeholders for future NBR schema extension
- **NBR Filing Guide**: `GET /returns/:id/nbr-export` returns a PDF filing cheat sheet the accountant uses while manually entering data into vat.gov.bd. Contains pre-filing checklist, portal field mapping for Part 3 (Sales) and Part 4 (Purchases), net payable box, and supporting document list. Admin-only. The NBR portal (vat.gov.bd) requires manual data entry — no file upload API exists

### Import/Export (`/api/v1/import`, `/api/v1/export`)

- **Preview**: `POST /import/preview` — parses file and returns rows without committing
- **Import**: `POST /import/products|customers|invoices` — validated bulk upsert via `multer` memoryStorage
- **Export**: `GET /export/products|customers|invoices?format=csv|xlsx`
- Accepted MIME types: `text/csv`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (max 10 MB)

### Audit Trail (`/api/v1/audit-logs`)

- `auditLog.middleware.ts` fires on `res.on('finish')` for all `POST`/`PUT`/`PATCH`/`DELETE`. Fire-and-forget — failures log to stderr only
- `audit_logs` table is append-only (no FK constraints, no `updatedAt`). Never UPDATE or DELETE rows
- `GET /audit-logs?userId=&method=&from=&to=&page=&limit=` — company-scoped, paginated (default 50, max 100), readable by both roles

### Key Data Flow

```
Invoice creation:
  InvoiceForm (client VAT calc for preview)
  → POST /api/v1/invoices (server VAT calc is authoritative)
  → Prisma transaction: create Invoice + InvoiceItems + increment next_challan_no (FOR UPDATE)
  → PDF on demand: GET /api/v1/invoices/:id/pdf

VDS flow:
  Invoice with VDS → Create VDS certificate (manual or from-invoice)
  → Finalize → Create treasury deposit → Link certificates → Mark deposited

Register → Return flow:
  Invoices created throughout month
  → GET /registers/sales|purchase?taxMonth=  (aggregated read-only, PDF export)
  → POST /returns/generate  (snapshots totals + VDS credits into VatReturn row)
  → Admin adjusts → review → submit → lock
  → PDF (Musak 9.1) or NBR Filing Guide PDF

Audit:
  Any mutating request → auditLog middleware → append to audit_logs
```

## Domain Rules (Bangladesh VAT)

Non-negotiable — from NBR (National Board of Revenue) regulations:

- **Fiscal year**: July 1 – June 30. Format: `2025-2026`. Governs challan sequence resets, carry-forwards, and all reporting boundaries
- **Filing deadline**: Musak 9.1 must be submitted by the **15th of the following month** via vat.gov.bd. Treasury deposit must be made before filing
- **BIN**: 13 numeric digits. Validate at all entry points (company, customer, supplier)
- **Challan numbering**: `{prefix}-{fiscal_year}-{seq}` (e.g., `CH-2025-2026-0001`). Atomic, gap-free, per company. Counter does NOT reset between fiscal years automatically
- **Invoice status**: `draft` → `approved` → `locked` (immutable). Also `draft` → `cancelled`. No other transitions
- **VDS certificate status**: `draft` → `finalized`. Also `draft` → `cancelled`. Only drafts editable
- **Treasury deposit status**: `pending` → `deposited` → `verified`. Only pending editable
- **VAT return status**: `draft` → `reviewed` → `submitted` → `locked`. Admin-only beyond `draft`. No reversals
- **VAT calc**: Always use the centralized engine — never inline math. Monetary values `DECIMAL(14,2)`, quantities `DECIMAL(14,3)`, always `round2()`
- **Multi-company isolation**: Every query must be scoped by `company_id`. Never leak cross-company data

### VAT Calculation Modes (`vatCalc.service.ts`)

1. **Standard**: `VAT = (taxableValue + SD) × vatRate%`
2. **Truncated base**: `VAT = (taxableValue × truncatedBasePct%) × vatRate%` — SD not applied
3. **Specific duty**: `duty = qty × perUnitAmount` — flat amount alongside VAT
4. **VDS**: `VDS = vatAmount × vdsRate%` — deducted from seller's receivable

## Coding Conventions

- TypeScript strict mode on both client and server
- `tax_month`: `YYYY-MM`. `fiscal_year`: `YYYY-YYYY`
- Prisma models use `@map()` for snake_case DB columns; TypeScript uses camelCase
- Server BigInt IDs: Prisma returns `BigInt` — always serialize to string before JSON responses
- Client types: `client/src/types/index.ts`
- UI components: Ant Design for data display (Table, Form, Select, Descriptions); Tailwind for layout and spacing
- Icons: Material Symbols Outlined (Google Fonts CDN in `index.html`) — not Ant Design icons

## Not Yet Implemented

- Backup scheduler (defined in PRD.pdf)
