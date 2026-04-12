import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.use(authenticate, companyScope, auditLog);

router.get('/', productController.list);
router.post('/', productController.create);
router.get('/:id', productController.get);
router.put('/:id', productController.update);
router.delete('/:id', productController.remove);

export default router;
