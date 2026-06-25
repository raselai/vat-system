import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { auditLog } from '../middleware/auditLog.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, companyScope, auditLog);

router.get('/', productController.list);
// Static /stock must be registered before /:id so it is not captured as an id.
router.get('/stock', productController.stockSummary);
router.post('/', productController.create);
router.post('/bulk-rate-update', requireRole('admin'), productController.bulkRateUpdate);
router.get('/:id', productController.get);
router.get('/:id/stock-register', productController.stockRegister);
router.get('/:id/stock-register/pdf', productController.stockRegisterPdf);
router.get('/:id/adjustments', productController.listAdjustments);
router.post('/:id/adjustments', requireRole('admin'), productController.createAdjustment);
router.put('/:id', productController.update);
router.delete('/:id', productController.remove);

export default router;
