import { Router } from 'express';
import multer from 'multer';
import * as ctrl from '../controllers/importExport.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream', // some browsers send this for .xlsx
    ];
    const validExt = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    if (allowed.includes(file.mimetype) || validExt) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed (.csv, .xlsx, .xls)'));
    }
  },
});

router.use(authenticate, companyScope);

// Import routes (write operations — auditLog fires on these)
router.post('/import/preview',   upload.single('file'), ctrl.preview);
router.post('/import/products',  upload.single('file'), auditLog, ctrl.importProducts);
router.post('/import/customers', upload.single('file'), auditLog, ctrl.importCustomers);
router.post('/import/invoices',  upload.single('file'), auditLog, ctrl.importInvoices);

// Export routes (read-only — no audit needed)
router.get('/export/products',  ctrl.exportProducts);
router.get('/export/customers', ctrl.exportCustomers);
router.get('/export/invoices',  ctrl.exportInvoices);

export default router;
