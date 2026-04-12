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
