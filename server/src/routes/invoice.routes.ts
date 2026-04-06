import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';

const router = Router();

router.use(authenticate, companyScope);

router.get('/', invoiceController.list);
router.post('/', invoiceController.create);
router.get('/:id', invoiceController.get);
router.put('/:id', invoiceController.update);
router.post('/:id/approve', invoiceController.approve);
router.post('/:id/cancel', invoiceController.cancel);
router.post('/:id/lock', invoiceController.lock);

export default router;
