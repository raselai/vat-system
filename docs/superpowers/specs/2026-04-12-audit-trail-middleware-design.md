# Audit Trail Middleware — Design Spec

**Date:** 2026-04-12  
**Status:** Approved  

---

## Overview

Add an append-only audit trail that automatically captures every mutating HTTP request across all routes. Provides a query API and a filterable UI page accessible to all company members.

---

## Scope

- **Capture:** All `POST`, `PUT`, `PATCH`, `DELETE` requests across all routes
- **Mechanism:** Express `res.on('finish')` middleware — non-blocking, fire-and-forget
- **Storage:** New `audit_logs` table in MySQL via Prisma
- **API:** `GET /api/v1/audit-logs` with filtering and pagination
- **UI:** Read-only filterable table page in the client sidebar

---

## Database Schema

New model added to `server/prisma/schema.prisma`:

```prisma
model AuditLog {
  id         BigInt   @id @default(autoincrement())
  companyId  BigInt?  @map("company_id")
  userId     BigInt?  @map("user_id")
  method     String   @db.VarChar(10)
  path       String   @db.VarChar(500)
  statusCode Int      @map("status_code")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([companyId, createdAt])
  @@index([userId, createdAt])
  @@map("audit_logs")
}
```

**Key decisions:**
- `companyId` and `userId` are nullable — failed auth requests have no user/company context
- **No foreign key constraints** — audit logs must survive user/company deletion; history is immutable
- **No `updatedAt`** — append-only by rule (CLAUDE.md: no UPDATE or DELETE on `audit_logs`)
- Indexed on `(companyId, createdAt)` and `(userId, createdAt)` for efficient filtered queries

---

## Middleware

**File:** `server/src/middleware/auditLog.middleware.ts`

```ts
export function auditLog(req: Request, res: Response, next: NextFunction): void {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  res.on('finish', () => {
    prisma.auditLog.create({
      data: {
        userId:     req.user?.userId ? BigInt(req.user.userId) : null,
        companyId:  req.companyId ?? null,
        method:     req.method,
        path:       req.path,
        statusCode: res.statusCode,
      },
    }).catch(err => console.error('[audit] write failed:', err));
  });

  next();
}
```

**Wiring:**

- All routes with company context (invoices, vds, registers, returns, products, customers, company):
  ```ts
  router.use(authenticate, companyScope, auditLog);
  ```
- `auth.routes.ts` (no companyScope — login/logout/refresh):
  ```ts
  router.use(auditLog); // after authenticate where applicable; companyId will be null
  ```

The `.catch()` ensures a failed DB write never propagates — the audit trail must never disrupt the main request flow.

---

## Query API

**Route:** `GET /api/v1/audit-logs`  
**Files:**
- `server/src/routes/auditLog.routes.ts`
- `server/src/controllers/auditLog.controller.ts`

**Query parameters:**

| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `userId` | string | No | — | Filter by specific user |
| `method` | string | No | — | POST, PUT, PATCH, DELETE |
| `from` | ISO date | No | — | `createdAt >= from` |
| `to` | ISO date | No | — | `createdAt <= to` |
| `page` | number | No | 1 | |
| `limit` | number | No | 50 | Max 100 |

**Access control:** `authenticate + companyScope` — no additional RBAC. Both `admin` and `operator` roles can view. `companyScope` ensures users can only query their own company's logs (`companyId` is taken from `req.companyId`, not from the query string).

**Response shape** (matches existing API pattern):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "1",
        "userId": "5",
        "companyId": "2",
        "method": "POST",
        "path": "/invoices",
        "statusCode": 201,
        "createdAt": "2026-04-12T10:32:00.000Z"
      }
    ],
    "total": 342,
    "page": 1,
    "limit": 50
  }
}
```

BigInt `id`, `userId`, `companyId` serialized as strings per project convention.

---

## Client UI

**Files:**
- `client/src/pages/AuditLogPage.tsx`
- `client/src/services/auditLog.service.ts`

**Sidebar:** New entry under a "System" section (after Returns) with `manage_history` Material Symbol icon, label "Audit Log". Visible to all roles.

**Page layout:**
- **Filter bar:** Date range picker (`from`/`to`), Method dropdown (ALL / POST / PUT / PATCH / DELETE), User ID text input (free-text filter — no members endpoint needed)
- **Table columns:**
  - `Timestamp` — formatted datetime, sortable desc by default
  - `User` — display name resolved from userId
  - `Method` — Ant Design `Tag`: green=POST, blue=PUT, orange=PATCH, red=DELETE
  - `Path` — monospace text
  - `Status Code` — colored: green 2xx, orange 3xx, red 4xx/5xx
- **Pagination:** matches other list pages (page size 50)
- **Read-only** — no row actions, no bulk operations

---

## File Changes Summary

| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Add `AuditLog` model |
| `server/prisma/migrations/...` | New migration for `audit_logs` table |
| `server/src/middleware/auditLog.middleware.ts` | New — middleware |
| `server/src/routes/auditLog.routes.ts` | New — GET /audit-logs route |
| `server/src/controllers/auditLog.controller.ts` | New — list controller |
| `server/src/app.ts` (or index.ts) | Wire auditLog routes |
| All existing `*.routes.ts` files (7 files) | Add `auditLog` to `router.use(...)` chain |
| `client/src/services/auditLog.service.ts` | New — API client |
| `client/src/pages/AuditLogPage.tsx` | New — UI page |
| `client/src/App.tsx` or router file | Add route for AuditLogPage |
| `client/src/components/AppLayout.tsx` (or sidebar) | Add sidebar entry |
| `client/src/types/index.ts` | Add `AuditLog` type |

---

## Non-Goals

- No request body capture (Option A chosen — minimal fields only)
- No response body capture
- No IP address or user-agent logging
- No UI for deleting or editing logs (append-only by rule)
- No email/webhook alerts on suspicious activity
