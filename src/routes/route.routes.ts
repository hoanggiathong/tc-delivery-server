import { Router } from 'express';
import { RouteController } from '@/controllers/route.controller';
import { validate } from '@/middlewares/validation.middleware';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { UserRole } from '@/types/user.type';
import {
  createRouteSchema,
  updateRouteSchema,
  routeParamsSchema
} from '@/schemas/route.schema';

const router = Router();
const routeController = new RouteController();

// All route operations require authentication and admin/superadmin roles
router.use(authenticateToken);
router.use(requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]));

// Route routes
router.post('/', validate(createRouteSchema), routeController.createRoute);
router.get('/', routeController.getAllRoutes);

// Get route by code (must be before /:id to avoid conflicts)
router.get('/code/:code', routeController.getRouteByCode);

router.get('/:id', validate(routeParamsSchema), routeController.getRouteById);
router.put('/:id', validate(routeParamsSchema), validate(updateRouteSchema), routeController.updateRoute);
router.delete('/:id', validate(routeParamsSchema), routeController.deleteRoute);

export default router;