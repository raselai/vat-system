import { Router } from 'express';
import * as returnController from '../controllers/return.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.use(authenticate, companyScope);

// Read-only — all roles
router.get('/', returnController.listReturns);
router.get('/:id', returnController.getReturn);
router.get('/:id/pdf', returnController.getReturnPdf);

// Draft-level mutations — all roles
router.post('/generate', auditLog, returnController.generateReturn);
router.put('/:id', auditLog, returnController.updateReturn);

// Admin-only: status transitions beyond draft + NBR export
router.post('/:id/review', requireRole('admin'), auditLog, returnController.reviewReturn);
router.post('/:id/submit', requireRole('admin'), auditLog, returnController.submitReturn);
router.post('/:id/lock', requireRole('admin'), auditLog, returnController.lockReturn);
router.get('/:id/nbr-export', requireRole('admin'), returnController.nbrExport);

export default router;
