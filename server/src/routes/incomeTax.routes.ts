import { Router } from 'express';
import * as incomeTaxController from '../controllers/incomeTax.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Personal, user-scoped module — authentication only (no company scope / RBAC),
// mirroring the PUT /auth/me pattern. Every query is filtered by req.user.userId.
router.use(authenticate);

router.post('/preview', incomeTaxController.preview);
router.get('/', incomeTaxController.list);
router.post('/', incomeTaxController.create);
router.get('/:id', incomeTaxController.getOne);
router.put('/:id', incomeTaxController.update);
router.delete('/:id', incomeTaxController.remove);
router.get('/:id/pdf', incomeTaxController.pdf);

export default router;
