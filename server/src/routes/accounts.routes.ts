import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.use(authenticate, companyScope);

router.get('/ar', paymentController.getArSummary);
router.get('/ap', paymentController.getApSummary);
router.get('/payments', paymentController.listPayments);
router.post('/payments', requireRole('admin'), auditLog, paymentController.createPayment);
router.delete('/payments/:id', requireRole('admin'), auditLog, paymentController.deletePayment);

export default router;
