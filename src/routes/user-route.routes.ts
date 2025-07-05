import { Router } from 'express';
import { UserRouteController } from '@/controllers/user-route.controller';
import { validate } from '@/middlewares/validation.middleware';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { UserRole } from '@/types/user.type';
import {
  createUserRouteSchema,
  assignMultipleRoutesSchema,
  userRouteParamsSchema,
  removeMultipleRoutesSchema,
  userIdParamsSchema,
  routeIdParamsSchema
} from '@/schemas/user-route.schema';

const router = Router();
const userRouteController = new UserRouteController();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRoute:
 *       type: object
 *       required:
 *         - userId
 *         - routeId
 *         - assignedBy
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the user route assignment
 *         userId:
 *           type: string
 *           description: ID of the user
 *         routeId:
 *           type: string
 *           description: ID of the route
 *         user:
 *           $ref: '#/components/schemas/User'
 *         route:
 *           $ref: '#/components/schemas/Route'
 *         assignedBy:
 *           type: string
 *           description: ID of the user who assigned this route
 *         assignedByUser:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateUserRouteRequest:
 *       type: object
 *       required:
 *         - userId
 *         - routeId
 *       properties:
 *         userId:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *           description: ID of the user to assign route to
 *         routeId:
 *           type: string
 *           example: 507f1f77bcf86cd799439012
 *           description: ID of the route to assign
 *     CreateMultipleUserRouteRequest:
 *       type: object
 *       required:
 *         - userId
 *         - routeIds
 *       properties:
 *         userId:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *           description: ID of the user to assign routes to
 *         routeIds:
 *           type: array
 *           items:
 *             type: string
 *           example: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
 *           description: Array of route IDs to assign
 *     RemoveMultipleUserRouteRequest:
 *       type: object
 *       required:
 *         - userId
 *         - routeIds
 *       properties:
 *         userId:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *           description: ID of the user to remove routes from
 *         routeIds:
 *           type: array
 *           items:
 *             type: string
 *           example: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
 *           description: Array of route IDs to remove
 */

// All user-route routes require authentication and manager/admin/superadmin roles
router.use(authenticateToken);
router.use(requireRole([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]));

// User-route routes
router.post('/assign', validate(createUserRouteSchema), userRouteController.assignRouteToUser);
router.post('/assign-multiple', validate(assignMultipleRoutesSchema), userRouteController.assignMultipleRoutesToUser);
router.delete('/remove-multiple', validate(removeMultipleRoutesSchema), userRouteController.removeMultipleRoutesFromUser);
router.delete('/:id', validate(userRouteParamsSchema), userRouteController.removeRouteFromUser);
router.get('/user/:userId', validate(userIdParamsSchema), userRouteController.getUserRoutes);
router.get('/user/:userId/routes', validate(userIdParamsSchema), userRouteController.getRoutesForUser);
router.get('/route/:routeId', validate(routeIdParamsSchema), userRouteController.getUsersForRoute);
router.get('/', userRouteController.getAllUserRoutes);

export default router;