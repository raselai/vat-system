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
