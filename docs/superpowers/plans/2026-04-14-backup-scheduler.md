# Backup Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a daily automated MySQL backup scheduler that creates compressed `.sql.gz` files on the local VPS filesystem, retains them for 30 days, and exposes admin-only API endpoints for manual trigger, listing, and downloading backups.

**Architecture:** `backup.service.ts` handles core logic (spawn `mysqldump`, gzip pipe, file cleanup, file listing). `backup.scheduler.ts` registers a `node-cron` job at 2 AM daily and is started from `index.ts` on server boot. `backup.routes.ts` exposes three admin-only endpoints wired into `app.ts`.

**Tech Stack:** `node-cron`, Node.js `child_process` (spawn), `zlib` (createGzip), `fs/promises`, Express — `authenticate` → `companyScope` → `requireRole('admin')` middleware chain.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `server/src/services/backup.service.ts` | runBackup, cleanOldBackups, listBackups |
| Create | `server/src/scheduler/backup.scheduler.ts` | node-cron registration, startBackupScheduler |
| Create | `server/src/routes/backup.routes.ts` | POST trigger, GET list, GET download |
| Modify | `server/src/app.ts` | Mount backup routes |
| Modify | `server/src/index.ts` | Call startBackupScheduler on boot |
| Modify | `server/.env` | Add BACKUP_DIR |

---

### Task 1: Install node-cron

**Files:**
- Modify: `server/package.json` (via npm install)

- [ ] **Step 1: Install the package**

```bash
cd server
npm install node-cron
npm install --save-dev @types/node-cron
```

- [ ] **Step 2: Verify installation**

```bash
cat package.json | grep node-cron
```

Expected output (both lines):
```
"node-cron": "^x.x.x"
"@types/node-cron": "^x.x.x"
```

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: add node-cron dependency for backup scheduler"
```

---

### Task 2: Add BACKUP_DIR environment variable

**Files:**
- Modify: `server/.env`

- [ ] **Step 1: Add BACKUP_DIR to .env**

Open `server/.env` and append:

```env
# Backup
BACKUP_DIR=./backups
```

- [ ] **Step 2: Commit**

```bash
git add server/.env
git commit -m "chore: add BACKUP_DIR env variable"
```

---

### Task 3: Create backup.service.ts

**Files:**
- Create: `server/src/services/backup.service.ts`

- [ ] **Step 1: Create the file**

```typescript
import { spawn } from 'child_process';
import { createGzip } from 'zlib';
import { createWriteStream, mkdirSync, unlinkSync } from 'fs';
import { stat, readdir, unlink } from 'fs/promises';
import path from 'path';

const RETENTION_DAYS = 30;

function getBackupDir(): string {
  return process.env.BACKUP_DIR || './backups';
}

function parseDatabaseUrl(): {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
} {
  const url = new URL(process.env.DATABASE_URL!);
  return {
    host: url.hostname,
    port: url.port || '3306',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  };
}

export async function runBackup(): Promise<{
  filename: string;
  sizeBytes: number;
  durationMs: number;
}> {
  const backupDir = getBackupDir();
  mkdirSync(backupDir, { recursive: true });

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const filename = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.sql.gz`;
  const filepath = path.join(backupDir, filename);
  const startTime = Date.now();

  const { host, port, user, password, database } = parseDatabaseUrl();

  return new Promise((resolve, reject) => {
    const dump = spawn('mysqldump', [
      '--single-transaction',
      '--routines',
      '--triggers',
      `-h${host}`,
      `-P${port}`,
      `-u${user}`,
      `-p${password}`,
      database,
    ]);

    const gzip = createGzip();
    const output = createWriteStream(filepath);

    let failed = false;

    dump.stdout.pipe(gzip).pipe(output);

    // mysqldump writes "password on command line" warning to stderr — ignore it
    dump.stderr.on('data', () => {});

    dump.on('close', (code) => {
      if (code !== 0) {
        failed = true;
        gzip.destroy();
        output.destroy();
        try { unlinkSync(filepath); } catch {}
        reject(new Error(`mysqldump exited with code ${code}`));
      }
      // code 0: pipe will drain naturally → output 'finish' fires
    });

    dump.on('error', (err) => {
      failed = true;
      try { unlinkSync(filepath); } catch {}
      reject(new Error(`Failed to spawn mysqldump: ${err.message}. Is mysqldump installed and in PATH?`));
    });

    output.on('finish', async () => {
      if (failed) return;
      try {
        const stats = await stat(filepath);
        resolve({
          filename,
          sizeBytes: stats.size,
          durationMs: Date.now() - startTime,
        });
      } catch (err) {
        reject(err);
      }
    });

    output.on('error', (err) => {
      try { unlinkSync(filepath); } catch {}
      reject(err);
    });
  });
}

export async function cleanOldBackups(): Promise<{ deletedCount: number }> {
  const backupDir = getBackupDir();
  let deletedCount = 0;

  try {
    const files = await readdir(backupDir);
    const cutoffMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const file of files) {
      if (!file.endsWith('.sql.gz')) continue;
      const filepath = path.join(backupDir, file);
      const stats = await stat(filepath);
      if (now - stats.mtimeMs > cutoffMs) {
        await unlink(filepath);
        deletedCount++;
      }
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.error('[backup] Cleanup warning:', err.message);
    }
  }

  return { deletedCount };
}

export async function listBackups(): Promise<
  Array<{ filename: string; sizeBytes: number; createdAt: Date }>
> {
  const backupDir = getBackupDir();

  try {
    const files = await readdir(backupDir);
    const results: Array<{ filename: string; sizeBytes: number; createdAt: Date }> = [];

    for (const file of files) {
      if (!file.endsWith('.sql.gz')) continue;
      const filepath = path.join(backupDir, file);
      const stats = await stat(filepath);
      results.push({ filename: file, sizeBytes: stats.size, createdAt: stats.mtime });
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors on backup.service.ts

- [ ] **Step 3: Commit**

```bash
git add server/src/services/backup.service.ts
git commit -m "feat: add backup service (runBackup, cleanOldBackups, listBackups)"
```

---

### Task 4: Create backup.scheduler.ts

**Files:**
- Create: `server/src/scheduler/backup.scheduler.ts`

- [ ] **Step 1: Create the scheduler directory and file**

```typescript
import cron from 'node-cron';
import { mkdirSync } from 'fs';
import path from 'path';
import { runBackup, cleanOldBackups } from '../services/backup.service';

export function startBackupScheduler(): void {
  const backupDir = process.env.BACKUP_DIR || './backups';
  mkdirSync(backupDir, { recursive: true });
  console.log(`[backup] Scheduler initialized. Backup dir: ${path.resolve(backupDir)}`);

  // Daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[backup] Starting scheduled backup...');
    try {
      const result = await runBackup();
      const mb = (result.sizeBytes / 1024 / 1024).toFixed(2);
      console.log(`[backup] Success: ${result.filename} (${mb} MB, ${result.durationMs}ms)`);

      const cleanup = await cleanOldBackups();
      if (cleanup.deletedCount > 0) {
        console.log(`[backup] Cleaned up ${cleanup.deletedCount} old backup(s)`);
      }
    } catch (err: any) {
      console.error(`[backup] ERROR: ${err.message}`);
    }
  });
}
```

- [ ] **Step 2: Type-check**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/scheduler/backup.scheduler.ts
git commit -m "feat: add backup scheduler (node-cron, 2AM daily)"
```

---

### Task 5: Create backup.routes.ts

**Files:**
- Create: `server/src/routes/backup.routes.ts`

- [ ] **Step 1: Create the file**

```typescript
import { Router, Request, Response } from 'express';
import path from 'path';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { runBackup, cleanOldBackups, listBackups } from '../services/backup.service';
import { success, error, notFound } from '../utils/response';

const router = Router();

// Filename must match YYYY-MM-DD_HH-mm.sql.gz — prevents path traversal
const FILENAME_REGEX = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.sql\.gz$/;

router.use(authenticate, companyScope, requireRole('admin'));

// POST /api/v1/backup/trigger
router.post('/trigger', async (_req: Request, res: Response) => {
  try {
    const result = await runBackup();
    await cleanOldBackups();
    success(res, result);
  } catch (err: any) {
    error(res, err.message, 500);
  }
});

// GET /api/v1/backup/list
router.get('/list', async (_req: Request, res: Response) => {
  try {
    const backups = await listBackups();
    success(res, backups);
  } catch (err: any) {
    error(res, err.message, 500);
  }
});

// GET /api/v1/backup/download/:filename
router.get('/download/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;

  if (!FILENAME_REGEX.test(filename)) {
    error(res, 'Invalid filename format', 400);
    return;
  }

  const backupDir = process.env.BACKUP_DIR || './backups';
  const filepath = path.join(backupDir, filename);

  res.download(filepath, filename, (err) => {
    if (err && !res.headersSent) {
      notFound(res, 'Backup file not found');
    }
  });
});

export default router;
```

- [ ] **Step 2: Type-check**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/backup.routes.ts
git commit -m "feat: add backup API routes (trigger, list, download)"
```

---

### Task 6: Wire routes and scheduler into app.ts and index.ts

**Files:**
- Modify: `server/src/app.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add backup routes to app.ts**

Open `server/src/app.ts`. Add the import after the last existing route import:

```typescript
import backupRoutes from './routes/backup.routes';
```

Then add the route mount after `app.use('/api/v1', importExportRoutes);`:

```typescript
app.use('/api/v1/backup', backupRoutes);
```

- [ ] **Step 2: Start the scheduler in index.ts**

Open `server/src/index.ts`. Add the import after `import app from './app';`:

```typescript
import { startBackupScheduler } from './scheduler/backup.scheduler';
```

Then add the scheduler start inside the `if (!process.env.VERCEL)` block, after `app.listen(...)`:

```typescript
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
  });
  startBackupScheduler();
}
```

- [ ] **Step 3: Type-check both files**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add server/src/app.ts server/src/index.ts
git commit -m "feat: wire backup routes and scheduler into Express app"
```

---

### Task 7: Smoke test

**No automated test framework exists in this codebase — verify manually via the running dev server.**

- [ ] **Step 1: Start the dev server**

```bash
cd server && npm run dev
```

Expected log line:
```
[backup] Scheduler initialized. Backup dir: <absolute path>/server/backups
```

- [ ] **Step 2: Trigger a backup via API**

In a second terminal, replace `<TOKEN>` and `<COMPANY_ID>` with valid values from your dev environment:

```bash
curl -s -X POST http://localhost:4000/api/v1/backup/trigger \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-company-id: <COMPANY_ID>" | jq
```

Expected response:
```json
{
  "success": true,
  "data": {
    "filename": "2026-04-14_HH-mm.sql.gz",
    "sizeBytes": 12345,
    "durationMs": 800
  }
}
```

- [ ] **Step 3: Verify the file exists on disk**

```bash
ls -lh server/backups/
```

Expected: one `.sql.gz` file listed with a non-zero size.

- [ ] **Step 4: List backups via API**

```bash
curl -s http://localhost:4000/api/v1/backup/list \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-company-id: <COMPANY_ID>" | jq
```

Expected: array with the one backup file.

- [ ] **Step 5: Download backup via API**

Replace `<FILENAME>` with the filename returned in Step 2:

```bash
curl -O -J http://localhost:4000/api/v1/backup/download/<FILENAME> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-company-id: <COMPANY_ID>"
```

Expected: `.sql.gz` file downloaded to current directory.

- [ ] **Step 6: Verify the dump is valid**

```bash
gunzip -c <FILENAME> | head -20
```

Expected: SQL header lines like `-- MySQL dump 8.0 ...`

- [ ] **Step 7: Test invalid filename rejection**

```bash
curl -s http://localhost:4000/api/v1/backup/download/../../../etc/passwd \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-company-id: <COMPANY_ID>" | jq
```

Expected:
```json
{ "success": false, "error": "Invalid filename format" }
```

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "feat: complete backup scheduler with API endpoints and smoke test verified"
```
