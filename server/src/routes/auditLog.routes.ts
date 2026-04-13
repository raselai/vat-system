import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { list } from '../controllers/auditLog.controller';

const router = Router();

router.use(authenticate, companyScope);

router.get('/', list);

export default router;
