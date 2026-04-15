import { Router } from 'express';
import * as reportsController from '../controllers/reports.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';

const router = Router();

router.use(authenticate, companyScope);

// Named routes first to prevent /:type capturing them
router.get('/vat-summary',      reportsController.getVatSummary);
router.get('/vat-payable',      reportsController.getVatPayable);
router.get('/sales-summary',    reportsController.getSalesSummary);
router.get('/purchase-summary', reportsController.getPurchaseSummary);
router.get('/vds-summary',      reportsController.getVdsSummary);

// Export routes
router.get('/:type/pdf',  reportsController.exportPdf);
router.get('/:type/xlsx', reportsController.exportXlsx);

export default router;
