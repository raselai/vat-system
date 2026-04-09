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

# Type-check (no emit)
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit

# Database (from server/)
npm run db:migrate          # prisma migrate dev
npm run db:push             # prisma db push (sync schema without migration)
npm run db:seed             # tsx prisma/seed.ts
npm run db:studio           # prisma studio (GUI)
```

## Architecture

Monorepo with two packages — `client/` (React SPA) and `server/` (Express API). No shared code package; the VAT calculation engine is duplicated in both (`server/src/services/vatCalc.service.ts` and `client/src/utils/vatCalc.ts`) and must be kept in sync.

### Server (`server/`)

- **Runtime**: Node.js + Express + TypeScript, compiled via `tsx` (dev) / `tsc` (prod)
- **ORM**: Prisma with MySQL 8 (`utf8mb4` charset). Schema at `server/prisma/schema.prisma`
- **Auth**: JWT access + refresh tokens. Middleware chain: `authenticate` → `companyScope` → route handler
- **Company scoping**: Every data query is scoped by `companyId` from the `x-company-id` request header. The `companyScope` middleware validates user membership and sets `req.companyId`
- **RBAC**: `admin` and `operator` roles per company via `UserCompany` join table. Checked by `rbac.middleware.ts`
- **Validation**: Zod schemas in `server/src/validators/` — validate before controller logic
- **API pattern**: All responses use `{ success: boolean, data?: T, error?: string }` via `server/src/utils/response.ts` helpers (`success()`, `error()`, `notFound()`, etc.)
- **PDF**: Puppeteer with Handlebars templates in `server/src/templates/`. Templates: `musak63.html` (invoice challan), `musak66.html` (VDS certificate), `musak67.html` (sales/purchase register)
- **Route prefix**: All routes under `/api/v1/`

### Client (`client/`)

- **Stack**: React 18 + Vite + TypeScript + Ant Design 5 + Tailwind CSS
- **Design system**: "Sovereign Ledger" branding — green primary (`#00503a`), Plus Jakarta Sans headlines, Inter body, Material Symbols Outlined icons. Color tokens defined in `tailwind.config.js` using M3 palette
- **Auth flow**: `AuthContext` manages JWT tokens in localStorage. `ProtectedRoute` component wraps authenticated routes
- **Company context**: `CompanyContext` tracks active company. API client (`client/src/services/api.ts`) auto-attaches `Authorization` and `x-company-id` headers via interceptors
- **Routing**: React Router v7. `AppLayout` provides sidebar + header shell; pages render via `<Outlet />`
- **Vite proxy**: `/api` requests proxy to `http://localhost:4000`
- **Tailwind + Ant Design**: Tailwind preflight is disabled (`corePlugins.preflight: false`) to avoid conflicts with Ant Design. Custom Ant Design table styles are overridden in `client/src/index.css`

### VDS Module (`/api/v1/vds`)

- **VDS Certificates** (Musak 6.6): CRUD + finalize/cancel workflow. Can auto-create from an existing invoice via `POST /certificates/from-invoice/:invoiceId`. Supports both deductor (buyer) and deductee (seller) roles
- **Treasury Deposits**: Track government treasury deposits linked to VDS certificates via junction table `vds_certificate_deposits`. Status flow: `pending` → `deposited` → `verified`
- **Certificate numbering**: `VDS-{fiscal_year}-{sequential}` per company
- **Monthly summary**: `GET /summary?taxMonth=YYYY-MM` aggregates deducted vs deposited amounts

### Sales/Purchase Register (`/api/v1/registers`)

- **Read-only views** derived from invoices — no separate data entry
- `GET /registers/sales?taxMonth=YYYY-MM` and `GET /registers/purchase?taxMonth=YYYY-MM`
- Returns all non-cancelled invoices for the tax month with per-row and summary totals
- `GET /registers/:type/pdf` generates landscape Musak 6.7 PDF
- Summary feeds directly into Musak 9.1 monthly return

### Key Data Flow

```
User creates invoice → InvoiceForm (client-side VAT calc for preview)
  → POST /api/v1/invoices (server-side VAT calc is authoritative)
  → Prisma creates Invoice + InvoiceItems in transaction
  → Challan number assigned atomically via next_challan_no
  → PDF generated on demand via GET /api/v1/invoices/:id/pdf

VDS flow:
  Invoice with VDS → Create VDS certificate (manual or from-invoice)
  → Finalize certificate → Create treasury deposit → Link certificates → Mark deposited

Register flow:
  Invoices created throughout month → GET /registers/sales?taxMonth=YYYY-MM
  → Aggregated read-only view with summary → PDF export (Musak 6.7)
```

## Domain Rules (Bangladesh VAT)

These rules are non-negotiable — they come from NBR (National Board of Revenue) regulations:

- **Fiscal year**: July 1 – June 30. Format: `2025-2026`. All challan resets, carry-forwards, and reporting use this boundary
- **BIN**: 13 numeric digits. Validate on all entry points (company, customer, supplier)
- **Challan numbering**: `{prefix}-{fiscal_year}-{sequential}` (e.g., `CH-2025-0001`). Sequential per company per fiscal year. Must use DB-level atomic locking. No gaps allowed
- **Invoice status flow**: `draft` → `approved` → `locked` (immutable). Also `draft` → `cancelled`. No other transitions
- **VDS certificate status flow**: `draft` → `finalized`. Also `draft` → `cancelled`. Only drafts are editable
- **Treasury deposit status flow**: `pending` → `deposited` → `verified`. Only pending deposits are editable
- **VAT calc**: Always use the centralized calculation engine — never inline math. All monetary values `DECIMAL(14,2)`, quantities `DECIMAL(14,3)`, round to 2 decimal places via `round2()`
- **Multi-company isolation**: All queries MUST be scoped by `company_id`. Never leak data across companies
- **Audit trail**: `audit_logs` table is append-only. No UPDATE or DELETE operations allowed on it

### VAT Calculation Modes

The VAT engine handles four modes (see `vatCalc.service.ts`):

1. **Standard**: `VAT = (taxableValue + SD) × vatRate%`
2. **Truncated base**: `VAT = (taxableValue × truncatedBasePct%) × vatRate%` — SD is NOT applied
3. **Specific duty**: `duty = qty × perUnitAmount` — flat amount added to total alongside VAT
4. **VDS**: `VDS = vatAmount × vdsRate%` — deducted from seller's receivable

### Modules Not Yet Implemented

These are defined in the PRD (`PRD.pdf`) but not yet built:
- Monthly return (Musak 9.1) — aggregation + 24-section form
- Import/Export service (CSV/Excel)
- NBR portal export
- Audit trail middleware
- Backup scheduler

## Coding Conventions

- TypeScript strict mode on both client and server
- `tax_month` format: `YYYY-MM`. `fiscal_year` format: `YYYY-YYYY`
- Prisma models use `@map()` for snake_case DB columns; TypeScript uses camelCase
- Server BigInt IDs: Prisma returns `BigInt`; serialize to string for JSON responses
- Client types defined in `client/src/types/index.ts`
- Ant Design components for data display (Table, Form, Select); Tailwind for layout and custom styling
- Material Symbols Outlined for icons (loaded via Google Fonts CDN in `index.html`), not Ant Design icons
