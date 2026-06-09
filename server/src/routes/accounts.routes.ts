import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import * as paymentAccountController from '../controllers/paymentAccount.controller';
import * as ledgerController from '../controllers/ledger.controller';
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

router.get('/payment-accounts', paymentAccountController.list);
router.post('/payment-accounts', requireRole('admin'), auditLog, paymentAccountController.create);
router.get('/payment-accounts/:id', paymentAccountController.get);
router.put('/payment-accounts/:id', requireRole('admin'), auditLog, paymentAccountController.update);
router.delete('/payment-accounts/:id', requireRole('admin'), auditLog, paymentAccountController.remove);

router.get('/cashbook', ledgerController.getCashBook);
router.get('/party-ledger', ledgerController.getPartyLedger);

export default router;
