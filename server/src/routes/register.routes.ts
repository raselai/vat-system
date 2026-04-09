import { Router } from 'express';
import * as registerController from '../controllers/register.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';

const router = Router();

router.use(authenticate, companyScope);

// GET /api/v1/registers/sales/pdf?taxMonth=2026-04
router.get('/:type/pdf', registerController.getRegisterPdf);

// GET /api/v1/registers/sales?taxMonth=2026-04
// GET /api/v1/registers/purchase?taxMonth=2026-04
router.get('/:type', registerController.getRegister);

export default router;
