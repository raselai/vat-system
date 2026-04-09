import { Router } from 'express';
import * as vdsController from '../controllers/vds.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';

const router = Router();

router.use(authenticate, companyScope);

// Certificates
router.get('/certificates', vdsController.listCertificates);
router.post('/certificates', vdsController.createCertificate);
router.get('/certificates/:id', vdsController.getCertificate);
router.put('/certificates/:id', vdsController.updateCertificate);
router.post('/certificates/:id/finalize', vdsController.finalizeCertificate);
router.post('/certificates/:id/cancel', vdsController.cancelCertificate);
router.get('/certificates/:id/pdf', vdsController.getCertificatePdf);
router.post('/certificates/from-invoice/:invoiceId', vdsController.createFromInvoice);

// Treasury Deposits
router.get('/deposits', vdsController.listDeposits);
router.post('/deposits', vdsController.createDeposit);
router.get('/deposits/:id', vdsController.getDeposit);
router.put('/deposits/:id', vdsController.updateDeposit);
router.post('/deposits/:id/mark-deposited', vdsController.markDeposited);
router.post('/deposits/:id/link-certificates', vdsController.linkCertificates);

// Summary
router.get('/summary', vdsController.getSummary);

export default router;
