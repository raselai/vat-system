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
  const filename = typeof req.params.filename === 'string' ? req.params.filename : req.params.filename[0];

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
