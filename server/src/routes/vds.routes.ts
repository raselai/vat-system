import { Router } from 'express';
import * as vdsController from '../controllers/vds.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.use(authenticate, companyScope);

// Certificates — read-only for all roles
router.get('/certificates', vdsController.listCertificates);
router.get('/certificates/:id', vdsController.getCertificate);
router.get('/certificates/:id/pdf', vdsController.getCertificatePdf);

// Certificates — mutations: admin only
router.post('/certificates', requireRole('admin'), auditLog, vdsController.createCertificate);
router.put('/certificates/:id', requireRole('admin'), auditLog, vdsController.updateCertificate);
router.post('/certificates/:id/finalize', requireRole('admin'), auditLog, vdsController.finalizeCertificate);
router.post('/certificates/:id/cancel', requireRole('admin'), auditLog, vdsController.cancelCertificate);
router.post('/certificates/from-invoice/:invoiceId', requireRole('admin'), auditLog, vdsController.createFromInvoice);

// Treasury Deposits — read-only for all roles
router.get('/deposits', vdsController.listDeposits);
router.get('/deposits/:id', vdsController.getDeposit);

// Treasury Deposits — mutations: admin only
router.post('/deposits', requireRole('admin'), auditLog, vdsController.createDeposit);
router.put('/deposits/:id', requireRole('admin'), auditLog, vdsController.updateDeposit);
router.post('/deposits/:id/mark-deposited', requireRole('admin'), auditLog, vdsController.markDeposited);
router.post('/deposits/:id/link-certificates', requireRole('admin'), auditLog, vdsController.linkCertificates);

// Summary
router.get('/summary', vdsController.getSummary);

export default router;
