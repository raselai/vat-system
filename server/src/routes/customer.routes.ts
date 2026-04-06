import { Router } from 'express';
import * as customerController from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';

const router = Router();

router.use(authenticate, companyScope);

router.get('/', customerController.list);
router.post('/', customerController.create);
router.get('/:id', customerController.get);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.remove);

export default router;
