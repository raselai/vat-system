# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the full project scaffold with authentication, RBAC, multi-company support, and CRUD for companies, products, and customers — producing a working, deployable app shell.

**Architecture:** Monorepo with `client/` (React + Vite + Ant Design) and `server/` (Express + Prisma + MySQL). JWT auth with refresh tokens. All data queries scoped by company_id via middleware. Per-company roles via user_companies junction table.

**Tech Stack:** React 18, Vite, TypeScript, Ant Design, Tailwind CSS, Express, Prisma, MySQL 8, Zod, bcrypt, jsonwebtoken

---

## File Structure

```
vat-system/
├── package.json                          # Root workspace scripts
├── .env.example                          # Environment template
├── .gitignore
├── client/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx                      # App entry
│       ├── App.tsx                       # Router + auth guard
│       ├── vite-env.d.ts
│       ├── index.css                     # Tailwind imports
│       ├── contexts/
│       │   ├── AuthContext.tsx            # Auth state + JWT management
│       │   └── CompanyContext.tsx         # Active company selection
│       ├── services/
│       │   └── api.ts                    # Axios instance with interceptors
│       ├── hooks/
│       │   └── useAuth.ts                # Auth hook wrapper
│       ├── components/
│       │   ├── AppLayout.tsx             # Sidebar + topbar shell
│       │   ├── ProtectedRoute.tsx        # Auth guard component
│       │   └── CompanySelector.tsx       # Company dropdown in topbar
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── Dashboard.tsx
│       │   ├── companies/
│       │   │   ├── CompanyList.tsx
│       │   │   └── CompanyForm.tsx
│       │   ├── products/
│       │   │   ├── ProductList.tsx
│       │   │   └── ProductForm.tsx
│       │   └── customers/
│       │       ├── CustomerList.tsx
│       │       └── CustomerForm.tsx
│       ├── utils/
│       │   └── validators.ts             # BIN validation, shared utils
│       └── types/
│           └── index.ts                  # Shared TypeScript interfaces
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma                 # Full database schema
│   │   └── seed.ts                       # Seed data (admin user, sample company)
│   └── src/
│       ├── index.ts                      # Express server entry
│       ├── app.ts                        # Express app setup (middleware, routes)
│       ├── routes/
│       │   ├── auth.routes.ts
│       │   ├── company.routes.ts
│       │   ├── product.routes.ts
│       │   └── customer.routes.ts
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── company.controller.ts
│       │   ├── product.controller.ts
│       │   └── customer.controller.ts
│       ├── services/
│       │   ├── auth.service.ts
│       │   ├── company.service.ts
│       │   ├── product.service.ts
│       │   └── customer.service.ts
│       ├── middleware/
│       │   ├── auth.middleware.ts         # JWT verification
│       │   ├── rbac.middleware.ts         # Role check per company
│       │   └── companyScope.middleware.ts # Extract + validate company_id
│       ├── validators/
│       │   ├── auth.validator.ts
│       │   ├── company.validator.ts
│       │   ├── product.validator.ts
│       │   └── customer.validator.ts
│       └── utils/
│           ├── prisma.ts                 # Prisma client singleton
│           ├── jwt.ts                    # Token generation + verification
│           ├── response.ts              # Standard API response helpers
│           └── validators.ts            # BIN validation, shared utils
```

---

### Task 1: Project Scaffolding — Root + Server ✅ COMPLETE

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `server/package.json`
- Create: `server/tsconfig.json`

- [x] **Step 1: Initialize root package.json**

```json
{
  "name": "vat-system",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "cd client && npm run build && cd ../server && npm run build"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  }
}
```

- [x] **Step 2: Create .env.example**

```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/vat_system"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=4000
NODE_ENV=development

# Client
VITE_API_URL=http://localhost:4000/api/v1
```

- [x] **Step 3: Create .gitignore**

```
node_modules/
dist/
build/
.env
*.log
.DS_Store
```

- [x] **Step 4: Create server/package.json**

```json
{
  "name": "vat-server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.5.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.1",
    "@types/jsonwebtoken": "^9.0.9",
    "@types/node": "^22.13.10",
    "prisma": "^6.5.0",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2"
  }
}
```

- [x] **Step 5: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [x] **Step 6: Install root dependencies**

Run: `cd "E:/Desktop 1/Vat" && npm install`
Expected: `node_modules/` created, `concurrently` installed

- [x] **Step 7: Install server dependencies**

Run: `cd "E:/Desktop 1/Vat/server" && npm install`
Expected: All server dependencies installed, `prisma` binary available

- [x] **Step 8: Commit** — `16668d8`

---

### Task 2: Prisma Schema + Database Setup ⏳ IN PROGRESS (waiting for MySQL)

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/src/utils/prisma.ts`

- [x] **Step 1: Create Prisma schema with all Phase 1 tables**

Create `server/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id           BigInt   @id @default(autoincrement())
  fullName     String   @map("full_name") @db.VarChar(150)
  email        String   @unique @db.VarChar(150)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  status       UserStatus @default(active)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  userCompanies UserCompany[]
  refreshTokens RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        BigInt   @id @default(autoincrement())
  userId    BigInt   @map("user_id")
  token     String   @unique @db.VarChar(500)
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

model Company {
  id              BigInt   @id @default(autoincrement())
  name            String   @db.VarChar(200)
  bin             String   @db.VarChar(13)
  address         String   @db.Text
  challanPrefix   String   @default("CH") @map("challan_prefix") @db.VarChar(20)
  nextChallanNo   Int      @default(1) @map("next_challan_no")
  fiscalYearStart Int      @default(7) @map("fiscal_year_start") @db.TinyInt
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  userCompanies UserCompany[]
  customers     Customer[]
  products      Product[]

  @@map("companies")
}

model UserCompany {
  id        BigInt      @id @default(autoincrement())
  userId    BigInt      @map("user_id")
  companyId BigInt      @map("company_id")
  role      CompanyRole

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([userId, companyId])
  @@map("user_companies")
}

model Customer {
  id            BigInt   @id @default(autoincrement())
  companyId     BigInt   @map("company_id")
  name          String   @db.VarChar(200)
  binNid        String?  @map("bin_nid") @db.VarChar(50)
  phone         String?  @db.VarChar(30)
  address       String?  @db.Text
  isVdsEntity   Boolean  @default(false) @map("is_vds_entity")
  vdsEntityType String?  @map("vds_entity_type") @db.VarChar(50)
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@map("customers")
}

model Product {
  id                  BigInt   @id @default(autoincrement())
  companyId           BigInt   @map("company_id")
  productCode         String?  @map("product_code") @db.VarChar(50)
  hsCode              String?  @map("hs_code") @db.VarChar(20)
  serviceCode         String?  @map("service_code") @db.VarChar(20)
  name                String   @db.VarChar(200)
  nameBn              String?  @map("name_bn") @db.VarChar(200)
  type                ProductType
  vatRate             Decimal  @map("vat_rate") @db.Decimal(5, 2)
  sdRate              Decimal  @default(0) @map("sd_rate") @db.Decimal(5, 2)
  specificDutyAmount  Decimal  @default(0) @map("specific_duty_amount") @db.Decimal(14, 2)
  truncatedBasePct    Decimal  @default(100) @map("truncated_base_pct") @db.Decimal(5, 2)
  unit                String   @default("pcs") @db.VarChar(50)
  unitPrice           Decimal  @default(0) @map("unit_price") @db.Decimal(14, 2)
  isActive            Boolean  @default(true) @map("is_active")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@map("products")
}

enum UserStatus {
  active
  inactive
}

enum CompanyRole {
  admin
  operator
}

enum ProductType {
  product
  service
}
```

- [x] **Step 2: Create Prisma client singleton**

Create `server/src/utils/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
```

- [ ] **Step 3: Create .env file from example**

Run: `cp "E:/Desktop 1/Vat/.env.example" "E:/Desktop 1/Vat/server/.env"`

Then edit `server/.env` to set the actual DATABASE_URL for local MySQL:
```
DATABASE_URL="mysql://root:yourpassword@localhost:3306/vat_system"
```

- [ ] **Step 4: Create the database**

Run: `cd "E:/Desktop 1/Vat/server" && npx prisma db push`
Expected: Database `vat_system` created with all tables. Output includes "Your database is now in sync with your Prisma schema."

- [ ] **Step 5: Verify with Prisma Studio**

Run: `cd "E:/Desktop 1/Vat/server" && npx prisma studio`
Expected: Browser opens showing all tables: users, refresh_tokens, companies, user_companies, customers, products

- [ ] **Step 6: Commit**

```bash
git add server/prisma/schema.prisma server/src/utils/prisma.ts
git commit -m "feat: add Prisma schema with users, companies, products, customers tables"
```

---

### Task 3: Server Entry + Express App Setup

**Files:**
- Create: `server/src/utils/response.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Create response helpers**

Create `server/src/utils/response.ts`:

```typescript
import { Response } from 'express';

export function success<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function created<T>(res: Response, data: T) {
  return success(res, data, 201);
}

export function error(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({ success: false, error: message });
}

export function notFound(res: Response, message = 'Resource not found') {
  return error(res, message, 404);
}

export function unauthorized(res: Response, message = 'Unauthorized') {
  return error(res, message, 401);
}

export function forbidden(res: Response, message = 'Forbidden') {
  return error(res, message, 403);
}
```

- [ ] **Step 2: Create Express app**

Create `server/src/app.ts`:

```typescript
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

export default app;
```

- [ ] **Step 3: Create server entry**

Create `server/src/index.ts`:

```typescript
import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
});
```

- [ ] **Step 4: Start server and verify**

Run: `cd "E:/Desktop 1/Vat/server" && npx tsx src/index.ts`
Expected: "Server running on http://localhost:4000"

In another terminal:
Run: `curl http://localhost:4000/api/v1/health`
Expected: `{"success":true,"data":{"status":"ok","timestamp":"..."}}`

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/response.ts server/src/app.ts server/src/index.ts
git commit -m "feat: add Express server with health check endpoint"
```

---

### Task 4: JWT Utilities + Auth Middleware

**Files:**
- Create: `server/src/utils/jwt.ts`
- Create: `server/src/utils/validators.ts`
- Create: `server/src/middleware/auth.middleware.ts`

- [ ] **Step 1: Create JWT utility**

Create `server/src/utils/jwt.ts`:

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}
```

- [ ] **Step 2: Create shared validators**

Create `server/src/utils/validators.ts`:

```typescript
export function isValidBin(bin: string): boolean {
  return /^\d{13}$/.test(bin);
}

export function getFiscalYear(date: Date, fiscalYearStartMonth = 7): string {
  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();
  if (month >= fiscalYearStartMonth) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export function getTaxMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
```

- [ ] **Step 3: Create auth middleware**

Create `server/src/middleware/auth.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { unauthorized } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    unauthorized(res, 'Missing or invalid authorization header');
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    unauthorized(res, 'Invalid or expired token');
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/utils/jwt.ts server/src/utils/validators.ts server/src/middleware/auth.middleware.ts
git commit -m "feat: add JWT utilities, BIN validator, and auth middleware"
```

---

### Task 5: RBAC + Company Scope Middleware

**Files:**
- Create: `server/src/middleware/rbac.middleware.ts`
- Create: `server/src/middleware/companyScope.middleware.ts`

- [ ] **Step 1: Create RBAC middleware**

Create `server/src/middleware/rbac.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { forbidden, unauthorized } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      companyRole?: 'admin' | 'operator';
    }
  }
}

export function requireRole(...roles: Array<'admin' | 'operator'>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      unauthorized(res);
      return;
    }

    const companyId = req.headers['x-company-id'] as string;
    if (!companyId) {
      forbidden(res, 'Company ID is required in x-company-id header');
      return;
    }

    const userCompany = await prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: BigInt(req.user.userId),
          companyId: BigInt(companyId),
        },
      },
    });

    if (!userCompany) {
      forbidden(res, 'You do not have access to this company');
      return;
    }

    if (!roles.includes(userCompany.role as 'admin' | 'operator')) {
      forbidden(res, `This action requires one of: ${roles.join(', ')}`);
      return;
    }

    req.companyRole = userCompany.role as 'admin' | 'operator';
    next();
  };
}
```

- [ ] **Step 2: Create company scope middleware**

Create `server/src/middleware/companyScope.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { forbidden, unauthorized } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      companyId?: bigint;
    }
  }
}

export async function companyScope(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    unauthorized(res);
    return;
  }

  const companyId = req.headers['x-company-id'] as string;
  if (!companyId) {
    forbidden(res, 'Company ID is required in x-company-id header');
    return;
  }

  const userCompany = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId: BigInt(req.user.userId),
        companyId: BigInt(companyId),
      },
    },
  });

  if (!userCompany) {
    forbidden(res, 'You do not have access to this company');
    return;
  }

  req.companyId = BigInt(companyId);
  req.companyRole = userCompany.role as 'admin' | 'operator';
  next();
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/rbac.middleware.ts server/src/middleware/companyScope.middleware.ts
git commit -m "feat: add RBAC and company scope middleware"
```

---

### Task 6: Auth Validator + Service + Controller + Routes

**Files:**
- Create: `server/src/validators/auth.validator.ts`
- Create: `server/src/services/auth.service.ts`
- Create: `server/src/controllers/auth.controller.ts`
- Create: `server/src/routes/auth.routes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create auth validator**

Create `server/src/validators/auth.validator.ts`:

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2).max(150),
  email: z.string().email().max(150),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
```

- [ ] **Step 2: Create auth service**

Create `server/src/services/auth.service.ts`:

```typescript
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/jwt';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

const SALT_ROUNDS = 12;

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash,
    },
    select: { id: true, fullName: true, email: true, status: true, createdAt: true },
  });

  const payload: TokenPayload = { userId: user.id.toString(), email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Calculate expiry (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt },
  });

  return {
    user: { ...user, id: user.id.toString() },
    accessToken,
    refreshToken,
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (user.status === 'inactive') {
    throw new Error('Account is inactive');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const payload: TokenPayload = { userId: user.id.toString(), email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt },
  });

  // Get user's companies
  const userCompanies = await prisma.userCompany.findMany({
    where: { userId: user.id },
    include: { company: { select: { id: true, name: true, bin: true } } },
  });

  return {
    user: {
      id: user.id.toString(),
      fullName: user.fullName,
      email: user.email,
      status: user.status,
    },
    companies: userCompanies.map(uc => ({
      id: uc.company.id.toString(),
      name: uc.company.name,
      bin: uc.company.bin,
      role: uc.role,
    })),
    accessToken,
    refreshToken,
  };
}

export async function refresh(refreshTokenStr: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshTokenStr } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new Error('Invalid or expired refresh token');
  }

  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(refreshTokenStr);
  } catch {
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw new Error('Invalid refresh token');
  }

  // Delete old token and create new one (rotation)
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId: BigInt(payload.userId), token: newRefreshToken, expiresAt },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshTokenStr: string) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshTokenStr } });
}
```

- [ ] **Step 3: Create auth controller**

Create `server/src/controllers/auth.controller.ts`:

```typescript
import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { registerSchema, loginSchema, refreshSchema } from '../validators/auth.validator';
import { success, created, error, unauthorized } from '../utils/response';

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const result = await authService.register(parsed.data);
    return created(res, result);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const result = await authService.login(parsed.data);
    return success(res, result);
  } catch (err: any) {
    return unauthorized(res, err.message);
  }
}

export async function refresh(req: Request, res: Response) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const result = await authService.refresh(parsed.data.refreshToken);
    return success(res, result);
  } catch (err: any) {
    return unauthorized(res, err.message);
  }
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await authService.logout(refreshToken);
  }
  return success(res, { message: 'Logged out successfully' });
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    return unauthorized(res);
  }

  const user = await (await import('../utils/prisma')).default.user.findUnique({
    where: { id: BigInt(req.user.userId) },
    select: { id: true, fullName: true, email: true, status: true, createdAt: true },
  });

  if (!user) {
    return unauthorized(res, 'User not found');
  }

  const userCompanies = await (await import('../utils/prisma')).default.userCompany.findMany({
    where: { userId: user.id },
    include: { company: { select: { id: true, name: true, bin: true } } },
  });

  return success(res, {
    user: { ...user, id: user.id.toString() },
    companies: userCompanies.map(uc => ({
      id: uc.company.id.toString(),
      name: uc.company.name,
      bin: uc.company.bin,
      role: uc.role,
    })),
  });
}
```

- [ ] **Step 4: Create auth routes**

Create `server/src/routes/auth.routes.ts`:

```typescript
import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
```

- [ ] **Step 5: Register auth routes in app.ts**

Replace `server/src/app.ts` with:

```typescript
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Routes
app.use('/api/v1/auth', authRoutes);

export default app;
```

- [ ] **Step 6: Test register and login manually**

Start server: `cd "E:/Desktop 1/Vat/server" && npx tsx src/index.ts`

Register:
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Admin User","email":"admin@test.com","password":"password123"}'
```
Expected: `{"success":true,"data":{"user":{...},"accessToken":"...","refreshToken":"..."}}`

Login:
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```
Expected: `{"success":true,"data":{"user":{...},"companies":[],"accessToken":"...","refreshToken":"..."}}`

- [ ] **Step 7: Commit**

```bash
git add server/src/validators/auth.validator.ts server/src/services/auth.service.ts server/src/controllers/auth.controller.ts server/src/routes/auth.routes.ts server/src/app.ts
git commit -m "feat: add auth system with register, login, refresh, logout, and me endpoints"
```

---

### Task 7: Company CRUD (Validator + Service + Controller + Routes)

**Files:**
- Create: `server/src/validators/company.validator.ts`
- Create: `server/src/services/company.service.ts`
- Create: `server/src/controllers/company.controller.ts`
- Create: `server/src/routes/company.routes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create company validator**

Create `server/src/validators/company.validator.ts`:

```typescript
import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(2).max(200),
  bin: z.string().regex(/^\d{13}$/, 'BIN must be exactly 13 digits'),
  address: z.string().min(5),
  challanPrefix: z.string().max(20).default('CH'),
  fiscalYearStart: z.number().int().min(1).max(12).default(7),
});

export const updateCompanySchema = createCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
```

- [ ] **Step 2: Create company service**

Create `server/src/services/company.service.ts`:

```typescript
import prisma from '../utils/prisma';
import { CreateCompanyInput, UpdateCompanyInput } from '../validators/company.validator';

function serializeCompany(company: any) {
  return {
    ...company,
    id: company.id.toString(),
  };
}

export async function getUserCompanies(userId: bigint) {
  const userCompanies = await prisma.userCompany.findMany({
    where: { userId },
    include: { company: true },
  });

  return userCompanies.map(uc => ({
    ...serializeCompany(uc.company),
    role: uc.role,
  }));
}

export async function createCompany(userId: bigint, input: CreateCompanyInput) {
  const company = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: input.name,
        bin: input.bin,
        address: input.address,
        challanPrefix: input.challanPrefix || 'CH',
        fiscalYearStart: input.fiscalYearStart || 7,
      },
    });

    // Creator becomes admin of this company
    await tx.userCompany.create({
      data: {
        userId,
        companyId: company.id,
        role: 'admin',
      },
    });

    return company;
  });

  return serializeCompany(company);
}

export async function getCompanyById(companyId: bigint) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return null;
  return serializeCompany(company);
}

export async function updateCompany(companyId: bigint, input: UpdateCompanyInput) {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: input,
  });
  return serializeCompany(company);
}

export async function deleteCompany(companyId: bigint) {
  await prisma.company.delete({ where: { id: companyId } });
}
```

- [ ] **Step 3: Create company controller**

Create `server/src/controllers/company.controller.ts`:

```typescript
import { Request, Response } from 'express';
import * as companyService from '../services/company.service';
import { createCompanySchema, updateCompanySchema } from '../validators/company.validator';
import { success, created, error, notFound, forbidden } from '../utils/response';

export async function list(req: Request, res: Response) {
  const companies = await companyService.getUserCompanies(BigInt(req.user!.userId));
  return success(res, companies);
}

export async function create(req: Request, res: Response) {
  const parsed = createCompanySchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const company = await companyService.createCompany(BigInt(req.user!.userId), parsed.data);
    return created(res, company);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function get(req: Request, res: Response) {
  const company = await companyService.getCompanyById(req.companyId!);
  if (!company) {
    return notFound(res, 'Company not found');
  }
  return success(res, company);
}

export async function update(req: Request, res: Response) {
  if (req.companyRole !== 'admin') {
    return forbidden(res, 'Only admins can update company details');
  }

  const parsed = updateCompanySchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const company = await companyService.updateCompany(req.companyId!, parsed.data);
    return success(res, company);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function remove(req: Request, res: Response) {
  if (req.companyRole !== 'admin') {
    return forbidden(res, 'Only admins can delete companies');
  }

  try {
    await companyService.deleteCompany(req.companyId!);
    return success(res, { message: 'Company deleted' });
  } catch (err: any) {
    return error(res, err.message);
  }
}
```

- [ ] **Step 4: Create company routes**

Create `server/src/routes/company.routes.ts`:

```typescript
import { Router } from 'express';
import * as companyController from '../controllers/company.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';

const router = Router();

// These routes only need auth (no company scope — user sees all their companies)
router.get('/', authenticate, companyController.list);
router.post('/', authenticate, companyController.create);

// These routes need auth + company scope
router.get('/:id', authenticate, companyScope, companyController.get);
router.put('/:id', authenticate, companyScope, companyController.update);
router.delete('/:id', authenticate, companyScope, companyController.remove);

export default router;
```

- [ ] **Step 5: Register company routes in app.ts**

Update `server/src/app.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';

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

export default app;
```

- [ ] **Step 6: Test company endpoints manually**

```bash
# Create company (use token from login)
curl -X POST http://localhost:4000/api/v1/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"name":"ABC Trading Ltd","bin":"1234567890123","address":"Dhaka, Bangladesh"}'

# List companies
curl http://localhost:4000/api/v1/companies \
  -H "Authorization: Bearer <access_token>"
```
Expected: Company created and returned with id, user auto-assigned as admin.

- [ ] **Step 7: Commit**

```bash
git add server/src/validators/company.validator.ts server/src/services/company.service.ts server/src/controllers/company.controller.ts server/src/routes/company.routes.ts server/src/app.ts
git commit -m "feat: add company CRUD with BIN validation and auto-admin assignment"
```

---

### Task 8: Product CRUD

**Files:**
- Create: `server/src/validators/product.validator.ts`
- Create: `server/src/services/product.service.ts`
- Create: `server/src/controllers/product.controller.ts`
- Create: `server/src/routes/product.routes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create product validator**

Create `server/src/validators/product.validator.ts`:

```typescript
import { z } from 'zod';

export const createProductSchema = z.object({
  productCode: z.string().max(50).optional(),
  hsCode: z.string().max(20).optional(),
  serviceCode: z.string().max(20).optional(),
  name: z.string().min(2).max(200),
  nameBn: z.string().max(200).optional(),
  type: z.enum(['product', 'service']),
  vatRate: z.number().min(0).max(100),
  sdRate: z.number().min(0).max(100).default(0),
  specificDutyAmount: z.number().min(0).default(0),
  truncatedBasePct: z.number().min(0).max(100).default(100),
  unit: z.string().max(50).default('pcs'),
  unitPrice: z.number().min(0).default(0),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
```

- [ ] **Step 2: Create product service**

Create `server/src/services/product.service.ts`:

```typescript
import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateProductInput, UpdateProductInput } from '../validators/product.validator';

function serializeProduct(product: any) {
  return {
    ...product,
    id: product.id.toString(),
    companyId: product.companyId.toString(),
    vatRate: Number(product.vatRate),
    sdRate: Number(product.sdRate),
    specificDutyAmount: Number(product.specificDutyAmount),
    truncatedBasePct: Number(product.truncatedBasePct),
    unitPrice: Number(product.unitPrice),
  };
}

export async function listProducts(companyId: bigint, includeInactive = false) {
  const where: any = { companyId };
  if (!includeInactive) {
    where.isActive = true;
  }
  const products = await prisma.product.findMany({ where, orderBy: { name: 'asc' } });
  return products.map(serializeProduct);
}

export async function createProduct(companyId: bigint, input: CreateProductInput) {
  const product = await prisma.product.create({
    data: {
      companyId,
      productCode: input.productCode,
      hsCode: input.hsCode,
      serviceCode: input.serviceCode,
      name: input.name,
      nameBn: input.nameBn,
      type: input.type,
      vatRate: new Decimal(input.vatRate),
      sdRate: new Decimal(input.sdRate),
      specificDutyAmount: new Decimal(input.specificDutyAmount),
      truncatedBasePct: new Decimal(input.truncatedBasePct),
      unit: input.unit,
      unitPrice: new Decimal(input.unitPrice),
    },
  });
  return serializeProduct(product);
}

export async function getProductById(companyId: bigint, productId: bigint) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });
  if (!product) return null;
  return serializeProduct(product);
}

export async function updateProduct(companyId: bigint, productId: bigint, input: UpdateProductInput) {
  const data: any = { ...input };
  // Convert numbers to Decimal for Prisma
  if (input.vatRate !== undefined) data.vatRate = new Decimal(input.vatRate);
  if (input.sdRate !== undefined) data.sdRate = new Decimal(input.sdRate);
  if (input.specificDutyAmount !== undefined) data.specificDutyAmount = new Decimal(input.specificDutyAmount);
  if (input.truncatedBasePct !== undefined) data.truncatedBasePct = new Decimal(input.truncatedBasePct);
  if (input.unitPrice !== undefined) data.unitPrice = new Decimal(input.unitPrice);

  const product = await prisma.product.updateMany({
    where: { id: productId, companyId },
    data,
  });
  if (product.count === 0) return null;

  return getProductById(companyId, productId);
}

export async function deleteProduct(companyId: bigint, productId: bigint) {
  // Soft delete
  const result = await prisma.product.updateMany({
    where: { id: productId, companyId },
    data: { isActive: false },
  });
  return result.count > 0;
}
```

- [ ] **Step 3: Create product controller**

Create `server/src/controllers/product.controller.ts`:

```typescript
import { Request, Response } from 'express';
import * as productService from '../services/product.service';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
import { success, created, error, notFound } from '../utils/response';

export async function list(req: Request, res: Response) {
  const includeInactive = req.query.includeInactive === 'true';
  const products = await productService.listProducts(req.companyId!, includeInactive);
  return success(res, products);
}

export async function create(req: Request, res: Response) {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const product = await productService.createProduct(req.companyId!, parsed.data);
    return created(res, product);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function get(req: Request, res: Response) {
  const product = await productService.getProductById(req.companyId!, BigInt(req.params.id));
  if (!product) {
    return notFound(res, 'Product not found');
  }
  return success(res, product);
}

export async function update(req: Request, res: Response) {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  const product = await productService.updateProduct(req.companyId!, BigInt(req.params.id), parsed.data);
  if (!product) {
    return notFound(res, 'Product not found');
  }
  return success(res, product);
}

export async function remove(req: Request, res: Response) {
  const deleted = await productService.deleteProduct(req.companyId!, BigInt(req.params.id));
  if (!deleted) {
    return notFound(res, 'Product not found');
  }
  return success(res, { message: 'Product deactivated' });
}
```

- [ ] **Step 4: Create product routes**

Create `server/src/routes/product.routes.ts`:

```typescript
import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';

const router = Router();

router.use(authenticate, companyScope);

router.get('/', productController.list);
router.post('/', productController.create);
router.get('/:id', productController.get);
router.put('/:id', productController.update);
router.delete('/:id', productController.remove);

export default router;
```

- [ ] **Step 5: Register product routes in app.ts**

Add to `server/src/app.ts` after company routes:

```typescript
import productRoutes from './routes/product.routes';
// ... after existing routes
app.use('/api/v1/products', productRoutes);
```

- [ ] **Step 6: Commit**

```bash
git add server/src/validators/product.validator.ts server/src/services/product.service.ts server/src/controllers/product.controller.ts server/src/routes/product.routes.ts server/src/app.ts
git commit -m "feat: add product CRUD with multi-rate VAT, SD, specific duty, truncated base"
```

---

### Task 9: Customer CRUD

**Files:**
- Create: `server/src/validators/customer.validator.ts`
- Create: `server/src/services/customer.service.ts`
- Create: `server/src/controllers/customer.controller.ts`
- Create: `server/src/routes/customer.routes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create customer validator**

Create `server/src/validators/customer.validator.ts`:

```typescript
import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2).max(200),
  binNid: z.string().max(50).optional().refine(
    (val) => !val || /^\d{13}$/.test(val) || /^\d{10,17}$/.test(val),
    { message: 'BIN must be 13 digits, or NID must be 10-17 digits' }
  ),
  phone: z.string().max(30).optional(),
  address: z.string().optional(),
  isVdsEntity: z.boolean().default(false),
  vdsEntityType: z.enum(['bank', 'govt', 'ngo', 'listed_company']).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
```

- [ ] **Step 2: Create customer service**

Create `server/src/services/customer.service.ts`:

```typescript
import prisma from '../utils/prisma';
import { CreateCustomerInput, UpdateCustomerInput } from '../validators/customer.validator';

function serializeCustomer(customer: any) {
  return {
    ...customer,
    id: customer.id.toString(),
    companyId: customer.companyId.toString(),
  };
}

export async function listCustomers(companyId: bigint, includeInactive = false) {
  const where: any = { companyId };
  if (!includeInactive) {
    where.isActive = true;
  }
  const customers = await prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
  return customers.map(serializeCustomer);
}

export async function createCustomer(companyId: bigint, input: CreateCustomerInput) {
  const customer = await prisma.customer.create({
    data: {
      companyId,
      name: input.name,
      binNid: input.binNid,
      phone: input.phone,
      address: input.address,
      isVdsEntity: input.isVdsEntity,
      vdsEntityType: input.vdsEntityType,
    },
  });
  return serializeCustomer(customer);
}

export async function getCustomerById(companyId: bigint, customerId: bigint) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
  });
  if (!customer) return null;
  return serializeCustomer(customer);
}

export async function updateCustomer(companyId: bigint, customerId: bigint, input: UpdateCustomerInput) {
  const result = await prisma.customer.updateMany({
    where: { id: customerId, companyId },
    data: input,
  });
  if (result.count === 0) return null;
  return getCustomerById(companyId, customerId);
}

export async function deleteCustomer(companyId: bigint, customerId: bigint) {
  const result = await prisma.customer.updateMany({
    where: { id: customerId, companyId },
    data: { isActive: false },
  });
  return result.count > 0;
}
```

- [ ] **Step 3: Create customer controller**

Create `server/src/controllers/customer.controller.ts`:

```typescript
import { Request, Response } from 'express';
import * as customerService from '../services/customer.service';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator';
import { success, created, error, notFound } from '../utils/response';

export async function list(req: Request, res: Response) {
  const includeInactive = req.query.includeInactive === 'true';
  const customers = await customerService.listCustomers(req.companyId!, includeInactive);
  return success(res, customers);
}

export async function create(req: Request, res: Response) {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const customer = await customerService.createCustomer(req.companyId!, parsed.data);
    return created(res, customer);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function get(req: Request, res: Response) {
  const customer = await customerService.getCustomerById(req.companyId!, BigInt(req.params.id));
  if (!customer) {
    return notFound(res, 'Customer not found');
  }
  return success(res, customer);
}

export async function update(req: Request, res: Response) {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  const customer = await customerService.updateCustomer(req.companyId!, BigInt(req.params.id), parsed.data);
  if (!customer) {
    return notFound(res, 'Customer not found');
  }
  return success(res, customer);
}

export async function remove(req: Request, res: Response) {
  const deleted = await customerService.deleteCustomer(req.companyId!, BigInt(req.params.id));
  if (!deleted) {
    return notFound(res, 'Customer not found');
  }
  return success(res, { message: 'Customer deactivated' });
}
```

- [ ] **Step 4: Create customer routes**

Create `server/src/routes/customer.routes.ts`:

```typescript
import { Router } from 'express';
import * as customerController from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';

const router = Router();

router.use(authenticate, companyScope);

router.get('/', customerController.list);
router.post('/', customerController.create);
router.get('/:id', customerController.get);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.remove);

export default router;
```

- [ ] **Step 5: Register customer routes in app.ts**

Update `server/src/app.ts` to include all routes:

```typescript
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import productRoutes from './routes/product.routes';
import customerRoutes from './routes/customer.routes';

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

export default app;
```

- [ ] **Step 6: Commit**

```bash
git add server/src/validators/customer.validator.ts server/src/services/customer.service.ts server/src/controllers/customer.controller.ts server/src/routes/customer.routes.ts server/src/app.ts
git commit -m "feat: add customer CRUD with BIN/NID validation and VDS entity support"
```

---

### Task 10: Seed Data

**Files:**
- Create: `server/prisma/seed.ts`

- [ ] **Step 1: Create seed script**

Create `server/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vatsystem.com' },
    update: {},
    create: {
      fullName: 'System Admin',
      email: 'admin@vatsystem.com',
      passwordHash,
      status: 'active',
    },
  });

  // Create sample company
  const company = await prisma.company.create({
    data: {
      name: 'ABC Trading Ltd.',
      bin: '1234567890123',
      address: 'House 12, Road 5, Dhanmondi, Dhaka-1205',
      challanPrefix: 'CH',
      nextChallanNo: 1,
      fiscalYearStart: 7,
    },
  });

  // Assign admin to company
  await prisma.userCompany.create({
    data: {
      userId: admin.id,
      companyId: company.id,
      role: 'admin',
    },
  });

  // Create sample products with different VAT scenarios
  const products = [
    {
      companyId: company.id,
      productCode: 'P001',
      hsCode: '8471.30.00',
      name: 'Laptop Computer',
      nameBn: 'ল্যাপটপ কম্পিউটার',
      type: 'product' as const,
      vatRate: new Decimal(15),
      sdRate: new Decimal(0),
      specificDutyAmount: new Decimal(0),
      truncatedBasePct: new Decimal(100),
      unit: 'pcs',
      unitPrice: new Decimal(50000),
    },
    {
      companyId: company.id,
      productCode: 'P002',
      hsCode: '2201.10.00',
      name: 'Mineral Water',
      nameBn: 'মিনারেল ওয়াটার',
      type: 'product' as const,
      vatRate: new Decimal(5),
      sdRate: new Decimal(0),
      specificDutyAmount: new Decimal(0),
      truncatedBasePct: new Decimal(100),
      unit: 'bottle',
      unitPrice: new Decimal(20),
    },
    {
      companyId: company.id,
      productCode: 'S001',
      serviceCode: 'S009.00',
      name: 'IT Consulting Service',
      nameBn: 'আইটি কনসাল্টিং সেবা',
      type: 'service' as const,
      vatRate: new Decimal(15),
      sdRate: new Decimal(0),
      specificDutyAmount: new Decimal(0),
      truncatedBasePct: new Decimal(30),
      unit: 'hour',
      unitPrice: new Decimal(5000),
    },
    {
      companyId: company.id,
      productCode: 'P003',
      hsCode: '2402.20.00',
      name: 'Cigarettes',
      nameBn: 'সিগারেট',
      type: 'product' as const,
      vatRate: new Decimal(15),
      sdRate: new Decimal(65),
      specificDutyAmount: new Decimal(5),
      truncatedBasePct: new Decimal(100),
      unit: 'pack',
      unitPrice: new Decimal(150),
    },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  // Create sample customers
  const customers = [
    {
      companyId: company.id,
      name: 'XYZ Corporation',
      binNid: '9876543210123',
      phone: '01711-000000',
      address: 'Gulshan-2, Dhaka',
      isVdsEntity: false,
    },
    {
      companyId: company.id,
      name: 'Bangladesh Bank',
      binNid: '1111111111111',
      phone: '02-9530001',
      address: 'Motijheel, Dhaka',
      isVdsEntity: true,
      vdsEntityType: 'bank',
    },
    {
      companyId: company.id,
      name: 'Ministry of ICT',
      binNid: '2222222222222',
      phone: '02-9513954',
      address: 'Agargaon, Dhaka',
      isVdsEntity: true,
      vdsEntityType: 'govt',
    },
  ];

  for (const c of customers) {
    await prisma.customer.create({ data: c });
  }

  console.log('Seed complete!');
  console.log(`Admin login: admin@vatsystem.com / admin123`);
  console.log(`Company: ${company.name} (BIN: ${company.bin})`);
  console.log(`Products: ${products.length} created`);
  console.log(`Customers: ${customers.length} created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run seed**

Run: `cd "E:/Desktop 1/Vat/server" && npx tsx prisma/seed.ts`
Expected: Output showing admin user, company, 4 products, 3 customers created.

- [ ] **Step 3: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat: add seed data with admin user, sample company, products, and customers"
```

---

### Task 11: Client Scaffolding — Vite + Ant Design + Tailwind

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.ts`
- Create: `client/tsconfig.json`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/index.css`
- Create: `client/src/vite-env.d.ts`

- [ ] **Step 1: Create client/package.json**

```json
{
  "name": "vat-client",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@ant-design/icons": "^5.6.1",
    "antd": "^5.24.6",
    "axios": "^1.8.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.2",
    "vite": "^6.2.5"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

Create `client/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 3: Create tsconfig.json**

Create `client/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create Tailwind config files**

Create `client/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disable preflight to avoid conflicts with Ant Design
  },
};
```

Create `client/postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create index.html and entry files**

Create `client/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VAT Automation System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `client/src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />
```

Create `client/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Create `client/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
          },
        }}
      >
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
```

Create `client/src/App.tsx`:

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<div style={{ padding: 24 }}><h1>VAT Automation System</h1><p>Phase 1 — Foundation</p></div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
```

- [ ] **Step 6: Install client dependencies**

Run: `cd "E:/Desktop 1/Vat/client" && npm install`
Expected: All dependencies installed.

- [ ] **Step 7: Verify client starts**

Run: `cd "E:/Desktop 1/Vat/client" && npx vite`
Expected: Vite dev server at http://localhost:5173, page shows "VAT Automation System"

- [ ] **Step 8: Commit**

```bash
git add client/
git commit -m "feat: scaffold React client with Vite, Ant Design, Tailwind CSS"
```

---

### Task 12: API Client + Auth Context + Types

**Files:**
- Create: `client/src/types/index.ts`
- Create: `client/src/services/api.ts`
- Create: `client/src/contexts/AuthContext.tsx`
- Create: `client/src/hooks/useAuth.ts`

- [ ] **Step 1: Create shared types**

Create `client/src/types/index.ts`:

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  status: 'active' | 'inactive';
}

export interface CompanyAccess {
  id: string;
  name: string;
  bin: string;
  role: 'admin' | 'operator';
}

export interface Company {
  id: string;
  name: string;
  bin: string;
  address: string;
  challanPrefix: string;
  nextChallanNo: number;
  fiscalYearStart: number;
  createdAt: string;
  updatedAt: string;
  role?: string;
}

export interface Product {
  id: string;
  companyId: string;
  productCode?: string;
  hsCode?: string;
  serviceCode?: string;
  name: string;
  nameBn?: string;
  type: 'product' | 'service';
  vatRate: number;
  sdRate: number;
  specificDutyAmount: number;
  truncatedBasePct: number;
  unit: string;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  binNid?: string;
  phone?: string;
  address?: string;
  isVdsEntity: boolean;
  vdsEntityType?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  companies: CompanyAccess[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  user: User;
  companies: CompanyAccess[];
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
```

- [ ] **Step 2: Create API client with interceptors**

Create `client/src/services/api.ts`:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const companyId = localStorage.getItem('activeCompanyId');
  if (companyId) {
    config.headers['x-company-id'] = companyId;
  }

  return config;
});

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
```

- [ ] **Step 3: Create Auth Context**

Create `client/src/contexts/AuthContext.tsx`:

```typescript
import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';
import { User, CompanyAccess, LoginResponse, RegisterResponse } from '../types';

interface AuthContextType {
  user: User | null;
  companies: CompanyAccess[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<CompanyAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Load user on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.data.user);
        setCompanies(data.data.companies);
      })
      .catch(() => {
        localStorage.clear();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ success: boolean; data: LoginResponse }>('/auth/login', { email, password });
    const { user, companies, accessToken, refreshToken } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    setCompanies(companies);

    // Auto-select first company if available
    if (companies.length > 0 && !localStorage.getItem('activeCompanyId')) {
      localStorage.setItem('activeCompanyId', companies[0].id);
    }
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const { data } = await api.post<{ success: boolean; data: RegisterResponse }>('/auth/register', { fullName, email, password });
    const { user, accessToken, refreshToken } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    setCompanies([]);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore errors on logout
    }
    localStorage.clear();
    setUser(null);
    setCompanies([]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, companies, isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 4: Create useAuth hook**

Create `client/src/hooks/useAuth.ts`:

```typescript
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/types/index.ts client/src/services/api.ts client/src/contexts/AuthContext.tsx client/src/hooks/useAuth.ts
git commit -m "feat: add API client, auth context, types, and useAuth hook"
```

---

### Task 13: Company Context + Selector

**Files:**
- Create: `client/src/contexts/CompanyContext.tsx`
- Create: `client/src/components/CompanySelector.tsx`

- [ ] **Step 1: Create Company Context**

Create `client/src/contexts/CompanyContext.tsx`:

```typescript
import { createContext, useState, useCallback, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { CompanyAccess } from '../types';

interface CompanyContextType {
  activeCompany: CompanyAccess | null;
  setActiveCompany: (company: CompanyAccess) => void;
  isAdmin: boolean;
}

export const CompanyContext = createContext<CompanyContextType | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { companies } = useAuth();
  const [activeCompany, setActiveCompanyState] = useState<CompanyAccess | null>(null);

  // Initialize from localStorage or first company
  useEffect(() => {
    const savedId = localStorage.getItem('activeCompanyId');
    const found = companies.find(c => c.id === savedId);
    if (found) {
      setActiveCompanyState(found);
    } else if (companies.length > 0) {
      setActiveCompanyState(companies[0]);
      localStorage.setItem('activeCompanyId', companies[0].id);
    }
  }, [companies]);

  const setActiveCompany = useCallback((company: CompanyAccess) => {
    setActiveCompanyState(company);
    localStorage.setItem('activeCompanyId', company.id);
  }, []);

  const isAdmin = activeCompany?.role === 'admin';

  return (
    <CompanyContext.Provider value={{ activeCompany, setActiveCompany, isAdmin }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
```

- [ ] **Step 2: Create Company Selector component**

Create `client/src/components/CompanySelector.tsx`:

```typescript
import { Select } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../contexts/CompanyContext';

export default function CompanySelector() {
  const { companies } = useAuth();
  const { activeCompany, setActiveCompany } = useCompany();

  if (companies.length === 0) {
    return <span style={{ color: '#999' }}>No companies</span>;
  }

  return (
    <Select
      value={activeCompany?.id}
      onChange={(value) => {
        const company = companies.find(c => c.id === value);
        if (company) setActiveCompany(company);
      }}
      style={{ width: 240 }}
      suffixIcon={<BankOutlined />}
      options={companies.map(c => ({
        value: c.id,
        label: `${c.name} (${c.role})`,
      }))}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/contexts/CompanyContext.tsx client/src/components/CompanySelector.tsx
git commit -m "feat: add company context and selector for multi-company switching"
```

---

### Task 14: App Layout Shell (Sidebar + Topbar)

**Files:**
- Create: `client/src/components/AppLayout.tsx`
- Create: `client/src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Create ProtectedRoute component**

Create `client/src/components/ProtectedRoute.tsx`:

```typescript
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Create AppLayout component**

Create `client/src/components/AppLayout.tsx`:

```typescript
import { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Space, theme } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  AuditOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import CompanySelector from './CompanySelector';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: 'Dashboard' },
  { key: '/invoices', icon: <FileTextOutlined />, label: 'Musak 6.3' },
  { key: '/sales', icon: <ShoppingCartOutlined />, label: 'Sales Register' },
  { key: '/purchases', icon: <ShoppingOutlined />, label: 'Purchase Register' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
  { key: '/returns', icon: <AuditOutlined />, label: 'Returns' },
  { key: '/products', icon: <ShoppingOutlined />, label: 'Products' },
  { key: '/customers', icon: <UserOutlined />, label: 'Customers' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: user?.fullName || 'User' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
  ];

  const handleUserMenu = async ({ key }: { key: string }) => {
    if (key === 'logout') {
      await logout();
      navigate('/login');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontWeight: 700, fontSize: collapsed ? 14 : 18, color: '#1677ff' }}>
            {collapsed ? 'VAT' : 'VAT System'}
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <CompanySelector />
          </Space>
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
            <Button type="text" icon={<UserOutlined />}>
              {user?.fullName}
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/AppLayout.tsx client/src/components/ProtectedRoute.tsx
git commit -m "feat: add app layout shell with sidebar navigation, topbar, and company selector"
```

---

### Task 15: Login + Register Pages

**Files:**
- Create: `client/src/pages/Login.tsx`
- Create: `client/src/pages/Register.tsx`

- [ ] **Step 1: Create Login page**

Create `client/src/pages/Login.tsx`:

```typescript
import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('Login successful');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <Card style={{ width: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>VAT Automation System</Title>
            <Text type="secondary">Sign in to continue</Text>
          </div>
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
              <Input prefix={<MailOutlined />} placeholder="Email" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Sign In
              </Button>
            </Form.Item>
          </Form>
          <Text>Don't have an account? <Link to="/register">Register</Link></Text>
        </Space>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create Register page**

Create `client/src/pages/Register.tsx`:

```typescript
import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;

export default function Register() {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: { fullName: string; email: string; password: string }) => {
    setLoading(true);
    try {
      await register(values.fullName, values.email, values.password);
      message.success('Registration successful');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <Card style={{ width: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Create Account</Title>
            <Text type="secondary">Join VAT Automation System</Text>
          </div>
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item name="fullName" rules={[{ required: true, min: 2, message: 'Enter your full name' }]}>
              <Input prefix={<UserOutlined />} placeholder="Full Name" />
            </Form.Item>
            <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
              <Input prefix={<MailOutlined />} placeholder="Email" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, min: 8, message: 'Password must be at least 8 characters' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Register
              </Button>
            </Form.Item>
          </Form>
          <Text>Already have an account? <Link to="/login">Sign In</Link></Text>
        </Space>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Login.tsx client/src/pages/Register.tsx
git commit -m "feat: add login and register pages with form validation"
```

---

### Task 16: Dashboard + CRUD Pages (Products, Customers, Companies)

**Files:**
- Create: `client/src/pages/Dashboard.tsx`
- Create: `client/src/pages/companies/CompanyList.tsx`
- Create: `client/src/pages/companies/CompanyForm.tsx`
- Create: `client/src/pages/products/ProductList.tsx`
- Create: `client/src/pages/products/ProductForm.tsx`
- Create: `client/src/pages/customers/CustomerList.tsx`
- Create: `client/src/pages/customers/CustomerForm.tsx`

- [ ] **Step 1: Create Dashboard page**

Create `client/src/pages/Dashboard.tsx`:

```typescript
import { Card, Row, Col, Statistic, Typography } from 'antd';
import { ShoppingCartOutlined, ShoppingOutlined, TeamOutlined, FileTextOutlined } from '@ant-design/icons';
import { useCompany } from '../contexts/CompanyContext';

const { Title } = Typography;

export default function Dashboard() {
  const { activeCompany } = useCompany();

  return (
    <div>
      <Title level={4}>Dashboard</Title>
      {activeCompany ? (
        <>
          <p style={{ color: '#666', marginBottom: 24 }}>
            {activeCompany.name} — BIN: {activeCompany.bin}
          </p>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Products" value={0} prefix={<ShoppingCartOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Customers" value={0} prefix={<TeamOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Invoices" value={0} prefix={<FileTextOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Pending Returns" value={0} prefix={<ShoppingOutlined />} /></Card>
            </Col>
          </Row>
        </>
      ) : (
        <Card>
          <p>No company selected. Please create or select a company from the top bar.</p>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create CompanyList page**

Create `client/src/pages/companies/CompanyList.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Company } from '../../types';

const { Title } = Typography;

export default function CompanyList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/companies');
      setCompanies(data.data);
    } catch {
      message.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'BIN', dataIndex: 'bin', key: 'bin' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    { title: 'Challan Prefix', dataIndex: 'challanPrefix', key: 'challanPrefix' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Company) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/companies/${record.id}/edit`)} />
          <Popconfirm title="Delete this company?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/companies/${id}`);
      message.success('Company deleted');
      fetchCompanies();
    } catch {
      message.error('Failed to delete company');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Companies</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/companies/new')}>
          Add Company
        </Button>
      </div>
      <Table columns={columns} dataSource={companies} rowKey="id" loading={loading} />
    </div>
  );
}
```

- [ ] **Step 3: Create CompanyForm page**

Create `client/src/pages/companies/CompanyForm.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, Card, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const { Title } = Typography;

export default function CompanyForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      api.get(`/companies/${id}`).then(({ data }) => {
        form.setFieldsValue(data.data);
      }).catch(() => message.error('Failed to load company'));
    }
  }, [id, isEdit, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/companies/${id}`, values);
        message.success('Company updated');
      } else {
        await api.post('/companies', values);
        message.success('Company created');
      }
      navigate('/companies');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to save company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={4}>{isEdit ? 'Edit Company' : 'New Company'}</Title>
      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ challanPrefix: 'CH', fiscalYearStart: 7 }}>
          <Form.Item name="name" label="Company Name" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="bin" label="BIN (13 digits)" rules={[{ required: true, pattern: /^\d{13}$/, message: 'BIN must be exactly 13 digits' }]}>
            <Input maxLength={13} />
          </Form.Item>
          <Form.Item name="address" label="Address" rules={[{ required: true, min: 5 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="challanPrefix" label="Challan Prefix">
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item name="fiscalYearStart" label="Fiscal Year Start Month (1-12)">
            <InputNumber min={1} max={12} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/companies')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create ProductList page**

Create `client/src/pages/products/ProductList.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Product } from '../../types';
import { useCompany } from '../../contexts/CompanyContext';

const { Title } = Typography;

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { activeCompany } = useCompany();

  const fetchProducts = async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const { data } = await api.get('/products');
      setProducts(data.data);
    } catch {
      message.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [activeCompany]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      message.success('Product deactivated');
      fetchProducts();
    } catch {
      message.error('Failed to delete product');
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'productCode', key: 'productCode', width: 100 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={v === 'product' ? 'blue' : 'green'}>{v}</Tag> },
    { title: 'VAT %', dataIndex: 'vatRate', key: 'vatRate', width: 80 },
    { title: 'SD %', dataIndex: 'sdRate', key: 'sdRate', width: 80 },
    { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', width: 120, render: (v: number) => v.toLocaleString('en-BD') },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: Product) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/products/${record.id}/edit`)} />
          <Popconfirm title="Deactivate this product?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!activeCompany) {
    return <div>Please select a company first.</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Products & Services</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/products/new')}>
          Add Product
        </Button>
      </div>
      <Table columns={columns} dataSource={products} rowKey="id" loading={loading} />
    </div>
  );
}
```

- [ ] **Step 5: Create ProductForm page**

Create `client/src/pages/products/ProductForm.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, Card, Typography, message, Select, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const { Title } = Typography;

export default function ProductForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      api.get(`/products/${id}`).then(({ data }) => {
        form.setFieldsValue(data.data);
      }).catch(() => message.error('Failed to load product'));
    }
  }, [id, isEdit, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/products/${id}`, values);
        message.success('Product updated');
      } else {
        await api.post('/products', values);
        message.success('Product created');
      }
      navigate('/products');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={4}>{isEdit ? 'Edit Product' : 'New Product'}</Title>
      <Card style={{ maxWidth: 700 }}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ type: 'product', vatRate: 15, sdRate: 0, specificDutyAmount: 0, truncatedBasePct: 100, unit: 'pcs', unitPrice: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="name" label="Product Name" rules={[{ required: true, min: 2 }]}>
              <Input />
            </Form.Item>
            <Form.Item name="nameBn" label="Name (Bangla)">
              <Input />
            </Form.Item>
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select options={[{ value: 'product', label: 'Product' }, { value: 'service', label: 'Service' }]} />
            </Form.Item>
            <Form.Item name="productCode" label="Product Code">
              <Input />
            </Form.Item>
            <Form.Item name="hsCode" label="HS Code">
              <Input />
            </Form.Item>
            <Form.Item name="serviceCode" label="Service Code">
              <Input />
            </Form.Item>
            <Form.Item name="vatRate" label="VAT Rate (%)" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sdRate" label="SD Rate (%)">
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="specificDutyAmount" label="Specific Duty (per unit)">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="truncatedBasePct" label="Truncated Base (%)">
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="unit" label="Unit">
              <Input />
            </Form.Item>
            <Form.Item name="unitPrice" label="Default Unit Price">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/products')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Create CustomerList page**

Create `client/src/pages/customers/CustomerList.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Customer } from '../../types';
import { useCompany } from '../../contexts/CompanyContext';

const { Title } = Typography;

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { activeCompany } = useCompany();

  const fetchCustomers = async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const { data } = await api.get('/customers');
      setCustomers(data.data);
    } catch {
      message.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [activeCompany]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/customers/${id}`);
      message.success('Customer deactivated');
      fetchCustomers();
    } catch {
      message.error('Failed to delete customer');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'BIN/NID', dataIndex: 'binNid', key: 'binNid' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'VDS Entity', dataIndex: 'isVdsEntity', key: 'isVdsEntity', render: (v: boolean) => v ? <Tag color="orange">VDS</Tag> : <Tag>No</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: Customer) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/customers/${record.id}/edit`)} />
          <Popconfirm title="Deactivate this customer?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!activeCompany) {
    return <div>Please select a company first.</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Customers / Suppliers</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/customers/new')}>
          Add Customer
        </Button>
      </div>
      <Table columns={columns} dataSource={customers} rowKey="id" loading={loading} />
    </div>
  );
}
```

- [ ] **Step 7: Create CustomerForm page**

Create `client/src/pages/customers/CustomerForm.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Switch, Select, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const { Title } = Typography;

export default function CustomerForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isVds, setIsVds] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      api.get(`/customers/${id}`).then(({ data }) => {
        form.setFieldsValue(data.data);
        setIsVds(data.data.isVdsEntity);
      }).catch(() => message.error('Failed to load customer'));
    }
  }, [id, isEdit, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/customers/${id}`, values);
        message.success('Customer updated');
      } else {
        await api.post('/customers', values);
        message.success('Customer created');
      }
      navigate('/customers');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={4}>{isEdit ? 'Edit Customer' : 'New Customer'}</Title>
      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ isVdsEntity: false }}>
          <Form.Item name="name" label="Customer / Supplier Name" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="binNid" label="BIN (13 digits) or NID">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="isVdsEntity" label="VDS Entity?" valuePropName="checked">
            <Switch onChange={(checked) => setIsVds(checked)} />
          </Form.Item>
          {isVds && (
            <Form.Item name="vdsEntityType" label="VDS Entity Type" rules={[{ required: true }]}>
              <Select options={[
                { value: 'bank', label: 'Bank' },
                { value: 'govt', label: 'Government' },
                { value: 'ngo', label: 'NGO' },
                { value: 'listed_company', label: 'Listed Company' },
              ]} />
            </Form.Item>
          )}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/customers')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/
git commit -m "feat: add dashboard, company, product, and customer CRUD pages"
```

---

### Task 17: Wire Up App Router

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Update App.tsx with full routing**

Replace `client/src/App.tsx`:

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CompanyList from './pages/companies/CompanyList';
import CompanyForm from './pages/companies/CompanyForm';
import ProductList from './pages/products/ProductList';
import ProductForm from './pages/products/ProductForm';
import CustomerList from './pages/customers/CustomerList';
import CustomerForm from './pages/customers/CustomerForm';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="companies" element={<CompanyList />} />
        <Route path="companies/new" element={<CompanyForm />} />
        <Route path="companies/:id/edit" element={<CompanyForm />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/new" element={<CustomerForm />} />
        <Route path="customers/:id/edit" element={<CustomerForm />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
```

- [ ] **Step 2: Update main.tsx with providers**

Replace `client/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
          },
        }}
      >
        <AuthProvider>
          <CompanyProvider>
            <App />
          </CompanyProvider>
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 3: Verify full app works**

Run both server and client:
```bash
cd "E:/Desktop 1/Vat" && npm run dev
```

Expected:
1. Visit http://localhost:5173 → redirected to /login
2. Login with `admin@vatsystem.com` / `admin123`
3. Dashboard shows with sidebar navigation
4. Company selector in topbar shows "ABC Trading Ltd."
5. Navigate to Products → see seeded products
6. Navigate to Customers → see seeded customers
7. Can create/edit/delete products and customers

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/src/main.tsx
git commit -m "feat: wire up full routing with auth guards, providers, and all CRUD pages"
```

---

### Task 18: Final Verification + Phase 1 Complete Commit

- [ ] **Step 1: Run full end-to-end test**

1. Start fresh: `cd "E:/Desktop 1/Vat/server" && npx prisma db push --force-reset && npx tsx prisma/seed.ts`
2. Start server: `cd "E:/Desktop 1/Vat/server" && npx tsx src/index.ts`
3. Start client: `cd "E:/Desktop 1/Vat/client" && npx vite`
4. Verify all flows:
   - Register a new user
   - Login with seeded admin
   - Create a new company
   - Switch companies in topbar
   - CRUD products (create, view, edit, deactivate)
   - CRUD customers (create with VDS entity flag, edit, deactivate)
   - Verify company scoping (data is per-company)

- [ ] **Step 2: Update design spec phase status**

Edit `docs/superpowers/specs/2026-04-05-vat-automation-design.md`:
Change `### Phase 1 — Foundation ✅ PENDING` to `### Phase 1 — Foundation ✅ COMPLETE`

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 — auth, RBAC, multi-company, product/customer CRUD, Ant Design UI"
```
