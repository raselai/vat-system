import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();

router.post('/register', auditLog, authController.register);
router.post('/login', auditLog, authController.login);
router.post('/refresh', auditLog, authController.refresh);
router.post('/logout', auditLog, authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, auditLog, authController.updateMe);

export default router;
