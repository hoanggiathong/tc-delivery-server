import { Router } from 'express';

import { MobileNewsAdminController } from '@/controllers/mobile-news-admin.controller';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { UserRole } from '@/types/user.type';
import { uploadNewsThumbnail } from '@/middlewares/upload.middleware';

const router = Router();

const controller = new MobileNewsAdminController();

const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPERADMIN];

router.use(authenticateToken);

router.use(requireRole(allowedRoles));

/**
 * Web/Admin API:
 *
 * POST   /api/mobile-news/upload-thumbnail
 * GET    /api/mobile-news
 * GET    /api/mobile-news/:id
 * POST   /api/mobile-news
 * PUT    /api/mobile-news/:id
 * DELETE /api/mobile-news/:id
 */
router.post('/upload-thumbnail', uploadNewsThumbnail, controller.uploadThumbnail);

router.get('/', controller.list);

router.get('/:id', controller.detail);

router.post('/', controller.create);

router.put('/:id', controller.update);

router.delete('/:id', controller.remove);

export default router;
