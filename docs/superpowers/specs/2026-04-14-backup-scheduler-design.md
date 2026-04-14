# Backup Scheduler Design

**Date:** 2026-04-14  
**Status:** Approved  

---

## Overview

A daily automated backup of the MySQL database, stored as compressed `.sql.gz` files on the VPS local filesystem. Backups are retained for 30 days; older files are deleted automatically. A manual trigger and file management API are exposed for admins.

---

## Constraints & Context

- **Platform:** Hostinger VPS — persistent Node.js process, no serverless limitations
- **Database:** MySQL 8, credentials available via existing `DATABASE_URL` env var
- **No new infrastructure:** No Redis, no BullMQ, no S3 — local filesystem only
- **Schedule:** Daily at 2:00 AM (VPS local time)
- **Retention:** 30 days — files older than 30 days are deleted after each successful backup run
- **Format:** `.sql.gz` — `mysqldump` output piped through gzip compression

---

## Architecture

Three new files added to the server:

```
server/src/
  services/backup.service.ts      — core logic (dump, compress, save, cleanup)
  scheduler/backup.scheduler.ts   — node-cron wiring, started from index.ts
  routes/backup.routes.ts         — admin-only REST API
```

`index.ts` calls `startBackupScheduler()` on server boot. The scheduler registers a cron job that fires at `0 2 * * *`. On each fire it runs `runBackup()` followed by `cleanOldBackups()`.

Backup files are written to `BACKUP_DIR` (env var, defaults to `./backups` relative to server root).

---

## Components

### `backup.service.ts`

**`runBackup(): Promise<{ filename: string; sizeBytes: number; durationMs: number }>`**

1. Parses `DATABASE_URL` to extract host, port, user, password, database name
2. Builds filename: `YYYY-MM-DD_HH-mm.sql.gz`
3. Spawns `mysqldump --single-transaction --routines --triggers -h HOST -P PORT -u USER -pPASSWORD DBNAME` as a child process
4. Pipes `mysqldump` stdout → `zlib.createGzip()` → write stream to `BACKUP_DIR/filename`
5. On `mysqldump` exit code non-zero: deletes the partial file, throws an error
6. On success: stats the file for size, returns `{ filename, sizeBytes, durationMs }`

**`cleanOldBackups(): Promise<{ deletedCount: number }>`**

1. Reads all files in `BACKUP_DIR` matching `*.sql.gz`
2. Checks mtime of each file
3. Deletes files older than 30 days
4. Logs count of deleted files, returns `{ deletedCount }`

**`listBackups(): Promise<Array<{ filename: string; sizeBytes: number; createdAt: Date }>>`**

1. Reads all `.sql.gz` files from `BACKUP_DIR`
2. Returns sorted list (newest first) with filename, size, and mtime

---

### `scheduler/backup.scheduler.ts`

**`startBackupScheduler(): void`**

1. Creates `BACKUP_DIR` if it does not exist (`fs.mkdirSync(..., { recursive: true })`)
2. Registers cron job: `cron.schedule('0 2 * * *', handler)`
3. Handler:
   - Logs `[backup] Starting scheduled backup...`
   - Calls `runBackup()` — logs filename and size on success
   - Calls `cleanOldBackups()` — logs deleted count
   - On any error: logs `[backup] ERROR: <message>` (does not crash the server)

---

### `routes/backup.routes.ts`

All routes require: `authenticate` → `companyScope` → `rbac('admin')` middleware chain (same pattern as other admin-only routes).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/backup/trigger` | Manually trigger a backup immediately |
| `GET` | `/api/v1/backup/list` | List backup files (filename, sizeBytes, createdAt) |
| `GET` | `/api/v1/backup/download/:filename` | Stream a backup file as a download |

**Download security:** `filename` is validated against the regex `/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.sql\.gz$/` before `path.join(BACKUP_DIR, filename)` is resolved. Rejects anything that doesn't match — no path traversal possible.

**Trigger response:** Returns `{ filename, sizeBytes, durationMs }` on success. Runs synchronously in the request (acceptable — dump takes a few seconds max on a small DB).

---

## Environment Variables

Add to `server/.env`:

```env
BACKUP_DIR=./backups
```

`BACKUP_DIR` can be an absolute path (e.g., `/var/backups/vat`) or relative to the server working directory.

---

## New Dependency

```
node-cron  — lightweight cron scheduler, no Redis required
@types/node-cron  — TypeScript types
```

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| `mysqldump` exits non-zero | Partial file deleted, error thrown/logged |
| `BACKUP_DIR` missing on boot | Created automatically by `startBackupScheduler()` |
| Cleanup fails | Logged as warning, does not affect backup success |
| Download file not found | Returns 404 |
| Filename fails regex validation | Returns 400 |

---

## File Naming

```
backups/
  2026-04-14_02-00.sql.gz
  2026-04-13_02-00.sql.gz
  ...
```

Filenames are sortable lexicographically (newest last alphabetically = easy to find latest).

---

## Out of Scope

- S3 / cloud upload (not needed, local VPS storage)
- Encryption at rest (VPS filesystem security is out of scope for this feature)
- Backup restore API (admin uses `mysql < file.sql` manually)
- Email/notification on backup failure (future enhancement)
