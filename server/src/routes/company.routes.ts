import { Router } from 'express';
import * as companyController from '../controllers/company.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

// These routes only need auth (no company scope — user sees all their companies)
router.get('/', authenticate, companyController.list);
router.post('/', authenticate, auditLog, companyController.create);

// These routes need auth + company scope
router.get('/:id', authenticate, companyScope, companyController.get);
router.put('/:id', authenticate, companyScope, auditLog, companyController.update);
router.delete('/:id', authenticate, companyScope, auditLog, companyController.remove);

export default router;
