import { Router } from 'express';
import * as tdsController from '../controllers/tds.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.use(authenticate, companyScope);

// Deductions — read-only for all roles
router.get('/deductions', tdsController.listDeductions);
router.get('/deductions/:id', tdsController.getDeduction);

// Deductions — mutations: admin only
router.post('/deductions', requireRole('admin'), auditLog, tdsController.createDeduction);
router.put('/deductions/:id', requireRole('admin'), auditLog, tdsController.updateDeduction);
router.post('/deductions/:id/finalize', requireRole('admin'), auditLog, tdsController.finalizeDeduction);
router.post('/deductions/:id/cancel', requireRole('admin'), auditLog, tdsController.cancelDeduction);

// Payments — read-only for all roles
router.get('/payments', tdsController.listTdsPayments);
router.get('/payments/:id', tdsController.getTdsPayment);

// Payments — mutations: admin only
router.post('/payments', requireRole('admin'), auditLog, tdsController.createTdsPayment);
router.put('/payments/:id', requireRole('admin'), auditLog, tdsController.updateTdsPayment);
router.post('/payments/:id/mark-deposited', requireRole('admin'), auditLog, tdsController.markDeposited);
router.post('/payments/:id/link-deductions', requireRole('admin'), auditLog, tdsController.linkDeductions);

// Summary
router.get('/summary', tdsController.getSummary);

export default router;
