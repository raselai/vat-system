# Audit Trail Middleware Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an append-only audit trail that captures every mutating HTTP request, exposes a paginated query API, and renders a filterable read-only UI page accessible to all company members.

**Architecture:** An Express `res.on('finish')` middleware fires after each response is sent, writing a minimal log row (userId, companyId, method, path, statusCode) to a new `audit_logs` MySQL table via Prisma. A `GET /api/v1/audit-logs` endpoint queries the table with filters. A React page in the client renders the logs in an Ant Design table.

**Tech Stack:** Prisma + MySQL 8, Express middleware, TypeScript strict mode, React 18 + Ant Design 5 + Tailwind CSS, axios API client.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `server/prisma/schema.prisma` | Modify | Add `AuditLog` model |
| `server/src/middleware/auditLog.middleware.ts` | Create | Express `res.on('finish')` middleware |
| `server/src/routes/auth.routes.ts` | Modify | Wire `auditLog` per mutating route |
| `server/src/routes/company.routes.ts` | Modify | Wire `auditLog` per mutating route |
| `server/src/routes/product.routes.ts` | Modify | Add `auditLog` to `router.use()` chain |
| `server/src/routes/customer.routes.ts` | Modify | Add `auditLog` to `router.use()` chain |
| `server/src/routes/invoice.routes.ts` | Modify | Add `auditLog` to `router.use()` chain |
| `server/src/routes/vds.routes.ts` | Modify | Add `auditLog` to `router.use()` chain |
| `server/src/routes/return.routes.ts` | Modify | Add `auditLog` to `router.use()` chain |
| `server/src/controllers/auditLog.controller.ts` | Create | List handler with filters + pagination |
| `server/src/routes/auditLog.routes.ts` | Create | `GET /audit-logs` route |
| `server/src/app.ts` | Modify | Register `/api/v1/audit-logs` route |
| `client/src/types/index.ts` | Modify | Add `AuditLog` interface |
| `client/src/services/auditLog.service.ts` | Create | `listAuditLogs()` API client |
| `client/src/pages/audit/AuditLogPage.tsx` | Create | Filterable read-only table page |
| `client/src/App.tsx` | Modify | Add `/audit-logs` route |
| `client/src/components/AppLayout.tsx` | Modify | Add "Audit Log" sidebar entry |

---

### Task 1: Add AuditLog schema and run migration

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add the AuditLog model to schema.prisma**

Open `server/prisma/schema.prisma` and append this model at the end of the file (after the `VatReturn` model):

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

Note: No FK constraints on `companyId` / `userId` — audit logs must survive user/company deletion.

- [ ] **Step 2: Run the migration**

```bash
cd server && npm run db:migrate
```

When prompted for a migration name, enter: `add_audit_logs`

Expected: Prisma creates `server/prisma/migrations/<timestamp>_add_audit_logs/migration.sql` and applies it. MySQL now has an `audit_logs` table.

- [ ] **Step 3: Verify the table was created**

```bash
cd server && npm run db:studio
```

Open Prisma Studio at `http://localhost:5555` and confirm the `audit_logs` table exists with columns: `id`, `company_id`, `user_id`, `method`, `path`, `status_code`, `created_at`.

Close Prisma Studio when done.

- [ ] **Step 4: Commit**

```bash
cd server && git add prisma/schema.prisma prisma/migrations/ && git commit -m "feat: add audit_logs table to schema"
```

---

### Task 2: Create the audit log middleware

**Files:**
- Create: `server/src/middleware/auditLog.middleware.ts`

- [ ] **Step 1: Create the middleware file**

Create `server/src/middleware/auditLog.middleware.ts` with this content:

```typescript
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function auditLog(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
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
    }).catch((err: unknown) => {
      console.error('[audit] write failed:', err);
    });
  });

  next();
}
```

- [ ] **Step 2: Type-check**

```bash
cd server && npx tsc --noEmit
```

Expected: No errors. If you see `Property 'auditLog' does not exist on type PrismaClient`, run `npx prisma generate` first, then re-run `npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/auditLog.middleware.ts && git commit -m "feat: add auditLog middleware"
```

---

### Task 3: Wire middleware into all route files

**Files:**
- Modify: `server/src/routes/auth.routes.ts`
- Modify: `server/src/routes/company.routes.ts`
- Modify: `server/src/routes/product.routes.ts`
- Modify: `server/src/routes/customer.routes.ts`
- Modify: `server/src/routes/invoice.routes.ts`
- Modify: `server/src/routes/vds.routes.ts`
- Modify: `server/src/routes/return.routes.ts`

Note: `register.routes.ts` is skipped — it has only GET routes, and the middleware already no-ops for GET.

- [ ] **Step 1: Wire auth.routes.ts**

`auth.routes.ts` applies `authenticate` per-route, not globally. Add `auditLog` to the four mutating routes. Replace the file contents:

```typescript
import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.post('/register', auditLog, authController.register);
router.post('/login', auditLog, authController.login);
router.post('/refresh', auditLog, authController.refresh);
router.post('/logout', auditLog, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
```

For these routes `req.user` and `req.companyId` will be `undefined` — the middleware handles this with optional chaining, logging `userId: null` and `companyId: null`.

- [ ] **Step 2: Wire company.routes.ts**

`company.routes.ts` also applies middleware per-route. Replace the file contents:

```typescript
import { Router } from 'express';
import * as companyController from '../controllers/company.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

// These routes only need auth (no company scope — user sees all their companies)
router.get('/', authenticate, companyController.list);
router.post('/', authenticate, auditLog, companyController.create);

// These routes need auth + company scope
router.get('/:id', authenticate, companyScope, companyController.get);
router.put('/:id', authenticate, companyScope, auditLog, companyController.update);
router.delete('/:id', authenticate, companyScope, auditLog, companyController.remove);

export default router;
```

- [ ] **Step 3: Wire product.routes.ts**

Add `auditLog` to the global `router.use()` chain. Replace the file contents:

```typescript
import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.use(authenticate, companyScope, auditLog);

router.get('/', productController.list);
router.post('/', productController.create);
router.get('/:id', productController.get);
router.put('/:id', productController.update);
router.delete('/:id', productController.remove);

export default router;
```

- [ ] **Step 4: Wire customer.routes.ts**

Replace the file contents:

```typescript
import { Router } from 'express';
import * as customerController from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.use(authenticate, companyScope, auditLog);

router.get('/', customerController.list);
router.post('/', customerController.create);
router.get('/:id', customerController.get);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.remove);

export default router;
```

- [ ] **Step 5: Wire invoice.routes.ts**

Replace the file contents:

```typescript
import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.use(authenticate, companyScope, auditLog);

router.get('/', invoiceController.list);
router.post('/', invoiceController.create);
router.get('/:id', invoiceController.get);
router.put('/:id', invoiceController.update);
router.post('/:id/approve', invoiceController.approve);
router.post('/:id/cancel', invoiceController.cancel);
router.post('/:id/lock', invoiceController.lock);
router.get('/:id/pdf', invoiceController.getPdf);

export default router;
```

- [ ] **Step 6: Wire vds.routes.ts**

Replace the file contents:

```typescript
import { Router } from 'express';
import * as vdsController from '../controllers/vds.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.use(authenticate, companyScope, auditLog);

// Certificates
router.get('/certificates', vdsController.listCertificates);
router.post('/certificates', vdsController.createCertificate);
router.get('/certificates/:id', vdsController.getCertificate);
router.put('/certificates/:id', vdsController.updateCertificate);
router.post('/certificates/:id/finalize', vdsController.finalizeCertificate);
router.post('/certificates/:id/cancel', vdsController.cancelCertificate);
router.get('/certificates/:id/pdf', vdsController.getCertificatePdf);
router.post('/certificates/from-invoice/:invoiceId', vdsController.createFromInvoice);

// Treasury Deposits
router.get('/deposits', vdsController.listDeposits);
router.post('/deposits', vdsController.createDeposit);
router.get('/deposits/:id', vdsController.getDeposit);
router.put('/deposits/:id', vdsController.updateDeposit);
router.post('/deposits/:id/mark-deposited', vdsController.markDeposited);
router.post('/deposits/:id/link-certificates', vdsController.linkCertificates);

// Summary
router.get('/summary', vdsController.getSummary);

export default router;
```

- [ ] **Step 7: Wire return.routes.ts**

Replace the file contents:

```typescript
import { Router } from 'express';
import * as returnController from '../controllers/return.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.use(authenticate, companyScope, auditLog);

// Specific action routes BEFORE parameterized routes
router.post('/generate', returnController.generateReturn);
router.get('/', returnController.listReturns);
router.post('/:id/review', returnController.reviewReturn);
router.post('/:id/submit', returnController.submitReturn);
router.post('/:id/lock', returnController.lockReturn);
router.get('/:id/pdf', returnController.getReturnPdf);
router.get('/:id/nbr-export', returnController.nbrExport);
router.get('/:id', returnController.getReturn);
router.put('/:id', returnController.updateReturn);

export default router;
```

- [ ] **Step 8: Type-check all modified route files**

```bash
cd server && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 9: Smoke-test middleware is firing**

```bash
cd "E:/Desktop 1/Vat" && npm run dev:server
```

In a second terminal, make a POST request (use any valid login):

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}' | jq .
```

Then check the DB via Prisma Studio (`npm run db:studio` from `server/`) — confirm a row appeared in `audit_logs` with `method: POST`, `path: /login`, `status_code: 401`, `user_id: null`, `company_id: null`.

- [ ] **Step 10: Commit**

```bash
git add server/src/routes/ && git commit -m "feat: wire auditLog middleware into all route files"
```

---

### Task 4: Create the audit log controller and route

**Files:**
- Create: `server/src/controllers/auditLog.controller.ts`
- Create: `server/src/routes/auditLog.routes.ts`

- [ ] **Step 1: Create the controller**

Create `server/src/controllers/auditLog.controller.ts`:

```typescript
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { success, error } from '../utils/response';

export async function list(req: Request, res: Response) {
  const {
    userId,
    method,
    from,
    to,
    page = '1',
    limit = '50',
  } = req.query as Record<string, string | undefined>;

  const pageNum  = Math.max(1, parseInt(page  ?? '1',  10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '50', 10)));
  const skip     = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {
    companyId: req.companyId!,
  };

  if (userId) {
    where.userId = BigInt(userId);
  }
  if (method) {
    where.method = method.toUpperCase();
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    };
  }

  try {
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return success(res, {
      items: items.map(row => ({
        id:         row.id.toString(),
        companyId:  row.companyId?.toString() ?? null,
        userId:     row.userId?.toString()    ?? null,
        method:     row.method,
        path:       row.path,
        statusCode: row.statusCode,
        createdAt:  row.createdAt.toISOString(),
      })),
      total,
      page:  pageNum,
      limit: limitNum,
    });
  } catch (err: unknown) {
    return error(res, (err as Error).message);
  }
}
```

- [ ] **Step 2: Create the route file**

Create `server/src/routes/auditLog.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { list } from '../controllers/auditLog.controller';

const router = Router();

router.use(authenticate, companyScope);

router.get('/', list);

export default router;
```

- [ ] **Step 3: Type-check**

```bash
cd server && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/auditLog.controller.ts server/src/routes/auditLog.routes.ts && git commit -m "feat: add audit log controller and route"
```

---

### Task 5: Register audit log route in app.ts

**Files:**
- Modify: `server/src/app.ts`

- [ ] **Step 1: Add import and mount the route**

Open `server/src/app.ts` and make two changes:

Add to the imports block:
```typescript
import auditLogRoutes from './routes/auditLog.routes';
```

Add to the routes block (after `returnRoutes`):
```typescript
app.use('/api/v1/audit-logs', auditLogRoutes);
```

The full file should look like:

```typescript
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import productRoutes from './routes/product.routes';
import customerRoutes from './routes/customer.routes';
import invoiceRoutes from './routes/invoice.routes';
import vdsRoutes from './routes/vds.routes';
import registerRoutes from './routes/register.routes';
import returnRoutes from './routes/return.routes';
import auditLogRoutes from './routes/auditLog.routes';

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/vds', vdsRoutes);
app.use('/api/v1/registers', registerRoutes);
app.use('/api/v1/returns', returnRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);

export default app;
```

- [ ] **Step 2: Type-check and smoke-test the API**

```bash
cd server && npx tsc --noEmit
```

Start the server:
```bash
cd "E:/Desktop 1/Vat" && npm run dev:server
```

Then test the endpoint (replace `<token>` and `<companyId>` with real values):

```bash
curl -s "http://localhost:4000/api/v1/audit-logs" \
  -H "Authorization: Bearer <token>" \
  -H "x-company-id: <companyId>" | jq .
```

Expected response:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 1,
    "page": 1,
    "limit": 50
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/app.ts && git commit -m "feat: register audit-logs route in app"
```

---

### Task 6: Add AuditLog type to client types

**Files:**
- Modify: `client/src/types/index.ts`

- [ ] **Step 1: Append the AuditLog interface**

Open `client/src/types/index.ts` and append at the end of the file:

```typescript
export interface AuditLog {
  id: string;
  companyId: string | null;
  userId: string | null;
  method: string;
  path: string;
  statusCode: number;
  createdAt: string;
}

export interface AuditLogListResult {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/types/index.ts && git commit -m "feat: add AuditLog types"
```

---

### Task 7: Create the client audit log service

**Files:**
- Create: `client/src/services/auditLog.service.ts`

- [ ] **Step 1: Create the service**

Create `client/src/services/auditLog.service.ts`:

```typescript
import api from './api';
import { ApiResponse, AuditLogListResult } from '../types';

export interface AuditLogFilters {
  userId?: string;
  method?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function listAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogListResult> {
  const params: Record<string, string | number> = {};
  if (filters.userId)  params.userId  = filters.userId;
  if (filters.method)  params.method  = filters.method;
  if (filters.from)    params.from    = filters.from;
  if (filters.to)      params.to      = filters.to;
  if (filters.page)    params.page    = filters.page;
  if (filters.limit)   params.limit   = filters.limit;

  const { data } = await api.get<ApiResponse<AuditLogListResult>>('/audit-logs', { params });
  return data.data!;
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/services/auditLog.service.ts && git commit -m "feat: add audit log client service"
```

---

### Task 8: Create the AuditLogPage component

**Files:**
- Create: `client/src/pages/audit/AuditLogPage.tsx`

- [ ] **Step 1: Create the page**

Create `client/src/pages/audit/AuditLogPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Table, Typography, Tag, Select, DatePicker, Input, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { AuditLog } from '../../types';
import { listAuditLogs, AuditLogFilters } from '../../services/auditLog.service';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const METHOD_COLORS: Record<string, string> = {
  POST:   'green',
  PUT:    'blue',
  PATCH:  'orange',
  DELETE: 'red',
};

function statusColor(code: number): string {
  if (code >= 500) return '#ef4444';
  if (code >= 400) return '#f97316';
  if (code >= 300) return '#eab308';
  return '#22c55e';
}

export default function AuditLogPage() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, limit: 50 });

  const fetchLogs = async (f: AuditLogFilters) => {
    setLoading(true);
    try {
      const result = await listAuditLogs(f);
      setLogs(result.items);
      setTotal(result.total);
    } catch {
      message.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(filters); }, []);

  const handleFilterChange = (patch: Partial<AuditLogFilters>) => {
    const next = { ...filters, ...patch, page: 1 };
    setFilters(next);
    fetchLogs(next);
  };

  const handlePageChange = (page: number, pageSize: number) => {
    const next = { ...filters, page, limit: pageSize };
    setFilters(next);
    fetchLogs(next);
  };

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
      width: 180,
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      render: (v: string | null) => v ?? <span className="text-slate-400">—</span>,
      width: 100,
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (v: string) => <Tag color={METHOD_COLORS[v] ?? 'default'}>{v}</Tag>,
      width: 90,
    },
    {
      title: 'Path',
      dataIndex: 'path',
      key: 'path',
      render: (v: string) => <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{v}</code>,
    },
    {
      title: 'Status',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (v: number) => (
        <span className="font-mono font-bold text-sm" style={{ color: statusColor(v) }}>{v}</span>
      ),
      width: 80,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Title level={4} style={{ margin: 0 }}>Audit Log</Title>
      </div>

      {/* Filters */}
      <Space wrap className="mb-4">
        <RangePicker
          onChange={(dates) => {
            handleFilterChange({
              from: dates?.[0]?.startOf('day').toISOString() ?? undefined,
              to:   dates?.[1]?.endOf('day').toISOString()   ?? undefined,
            });
          }}
        />
        <Select
          allowClear
          placeholder="Method"
          style={{ width: 120 }}
          options={[
            { value: 'POST',   label: 'POST' },
            { value: 'PUT',    label: 'PUT' },
            { value: 'PATCH',  label: 'PATCH' },
            { value: 'DELETE', label: 'DELETE' },
          ]}
          onChange={(v) => handleFilterChange({ method: v ?? undefined })}
        />
        <Input.Search
          placeholder="User ID"
          allowClear
          style={{ width: 160 }}
          onSearch={(v) => handleFilterChange({ userId: v || undefined })}
        />
      </Space>

      <Table<AuditLog>
        rowKey="id"
        dataSource={logs}
        columns={columns}
        loading={loading}
        pagination={{
          current:  filters.page,
          pageSize: filters.limit,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['25', '50', '100'],
          showTotal: (t) => `${t} entries`,
          onChange: handlePageChange,
        }}
        size="small"
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/audit/AuditLogPage.tsx && git commit -m "feat: add AuditLogPage component"
```

---

### Task 9: Wire route into App.tsx and add sidebar entry

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/AppLayout.tsx`

- [ ] **Step 1: Add route to App.tsx**

In `client/src/App.tsx`, add the import at the top with the other page imports:

```typescript
import AuditLogPage from './pages/audit/AuditLogPage';
```

Then add the route inside the nested routes (after `<Route path="returns/:id" ...>`):

```tsx
<Route path="audit-logs" element={<AuditLogPage />} />
```

- [ ] **Step 2: Add sidebar entry to AppLayout.tsx**

In `client/src/components/AppLayout.tsx`, find the `menuItems` array and add the Audit Log entry after the Monthly Return entry:

```typescript
const menuItems: NavItem[] = [
  { key: '/',                    icon: 'dashboard',           label: 'Overview' },
  { key: '/companies',           icon: 'business_center',     label: 'Business Setup' },
  { key: '/invoices',            icon: 'receipt_long',        label: 'Invoices' },
  { key: '/vds/certificates',    icon: 'verified',            label: 'VDS Certificates' },
  { key: '/vds/deposits',        icon: 'account_balance',     label: 'Treasury Deposits' },
  { key: '/registers/sales',     icon: 'point_of_sale',       label: 'Sales Register' },
  { key: '/registers/purchase',  icon: 'shopping_cart',       label: 'Purchase Register' },
  { key: '/returns',             icon: 'assignment_turned_in', label: 'Monthly Return' },
  { key: '/audit-logs',          icon: 'manage_history',      label: 'Audit Log' },
  { key: '/products',            icon: 'inventory_2',         label: 'Products' },
  { key: '/customers',           icon: 'group',               label: 'Customers' },
  { key: '/settings',            icon: 'settings',            label: 'Settings' },
];
```

- [ ] **Step 3: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/src/components/AppLayout.tsx && git commit -m "feat: wire AuditLogPage into router and sidebar"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Start both servers**

```bash
cd "E:/Desktop 1/Vat" && npm run dev
```

Expected: Vite starts on `http://localhost:5173`, Express on `http://localhost:4000`.

- [ ] **Step 2: Verify audit log entries are being written**

1. Log in to the app at `http://localhost:5173`
2. Create a new invoice (POST)
3. Approve it (POST /:id/approve)
4. Navigate to the sidebar entry **"Audit Log"**
5. Confirm you see at least two rows — one for `POST /` (invoice creation) and one for `POST /:id/approve`

- [ ] **Step 3: Verify filters work**

1. Use the Method dropdown to filter to `POST` — confirm only POST rows appear
2. Use the date range picker to select today — confirm rows are still visible
3. Enter your user ID in the User ID field — confirm rows filter to your user

- [ ] **Step 4: Verify pagination**

Generate several more events (create/update products, customers). Then set page size to 2 and confirm pagination controls appear and navigate correctly.

- [ ] **Step 5: Verify failed auth is logged**

Open browser DevTools → Network tab. Make a bad login attempt (wrong password). Confirm a row appears in the audit log table with `statusCode: 401`, `userId: null`, `path: /login`.

- [ ] **Step 6: Final commit (if any cleanup needed)**

```bash
git add -p && git commit -m "fix: audit trail cleanup"
```

---

## Summary

| Task | What it builds |
|------|---------------|
| 1 | `audit_logs` DB table via Prisma migration |
| 2 | `auditLog.middleware.ts` — fire-and-forget `res.on('finish')` logger |
| 3 | Middleware wired into all 7 route files with mutating endpoints |
| 4 | `auditLog.controller.ts` + `auditLog.routes.ts` — paginated list API |
| 5 | Route mounted in `app.ts` at `/api/v1/audit-logs` |
| 6 | `AuditLog` + `AuditLogListResult` types in `client/src/types/index.ts` |
| 7 | `auditLog.service.ts` — typed axios wrapper |
| 8 | `AuditLogPage.tsx` — filterable read-only Ant Design table |
| 9 | Route + sidebar entry wired into `App.tsx` and `AppLayout.tsx` |
| 10 | End-to-end smoke test |
