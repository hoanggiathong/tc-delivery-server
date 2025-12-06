import { Router } from 'express';
import { RouteController } from '@/controllers/route.controller';
import { validate } from '@/middlewares/validation.middleware';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { UserRole } from '@/types/user.type';
import { createRouteSchema, updateRouteSchema, routeParamsSchema } from '@/schemas/route.schema';

const router = Router();
const routeController = new RouteController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Route:
 *       type: object
 *       required:
 *         - code
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the route
 *         code:
 *           type: string
 *           maxLength: 10
 *           pattern: ^[A-Z]([A-Z]|\d+)$
 *           example: T1
 *           description: The unique code of the route
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: TP.HCM
 *           description: Name of the route
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateRouteRequest:
 *       type: object
 *       required:
 *         - code
 *         - name
 *       properties:
 *         code:
 *           type: string
 *           maxLength: 10
 *           pattern: ^[A-Z]([A-Z]|\d+)$
 *           example: T1
 *           description: The unique code of the route
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: TP.HCM
 *           description: Name of the route
 *     UpdateRouteRequest:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           maxLength: 10
 *           pattern: ^[A-Z]([A-Z]|\d+)$
 *           example: T1
 *           description: The unique code of the route
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: TP.HCM
 *           description: Name of the route
 */

router.use(authenticateToken);

router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(createRouteSchema),
  routeController.createRoute
);
router.put(
  '/:id',
  requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(routeParamsSchema),
  validate(updateRouteSchema),
  routeController.updateRoute
);
router.delete(
  '/:id',
  requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]),
  validate(routeParamsSchema),
  routeController.deleteRoute
);
router.get('/code/:code', routeController.getRouteByCode);
router.get('/:id', validate(routeParamsSchema), routeController.getRouteById);
router.get('/', routeController.getAllRoutes);

export default router;
