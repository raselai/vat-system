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
  }, { timezone: 'Asia/Dhaka' });
}
