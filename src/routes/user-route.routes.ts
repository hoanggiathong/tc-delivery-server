import { Router } from 'express';
import { UserRouteController } from '@/controllers/user-route.controller';
import { validate } from '@/middlewares/validation.middleware';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { UserRole } from '@/types/user.type';
import {
  createUserRouteSchema,
  assignMultipleRoutesSchema,
  removeMultipleRoutesSchema,
  userRouteParamsSchema,
  userIdParamsSchema,
  routeIdParamsSchema
} from '@/schemas/user-route.schema';

const router = Router();
const userRouteController = new UserRouteController();

// All user route operations require authentication and manager/admin/superadmin roles
router.use(authenticateToken);
router.use(requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]));

// User route assignment operations
router.post('/assign', validate(createUserRouteSchema), userRouteController.assignRouteToUser);
router.post('/assign-multiple', validate(assignMultipleRoutesSchema), userRouteController.assignMultipleRoutesToUser);

// User route removal operations
router.delete('/remove-multiple', validate(removeMultipleRoutesSchema), userRouteController.removeMultipleRoutesFromUser);
router.delete('/:id', validate(userRouteParamsSchema), userRouteController.removeRouteFromUser);

// Get operations
router.get('/', userRouteController.getAllUserRoutes);
router.get('/user/:userId', validate(userIdParamsSchema), userRouteController.getUserRoutes);
router.get('/user/:userId/routes', validate(userIdParamsSchema), userRouteController.getRoutesForUser);
router.get('/route/:routeId', validate(routeIdParamsSchema), userRouteController.getUsersForRoute);

export default router;