import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { validate } from '@/middlewares/validation.middleware';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { canViewUsers, canCreateUser } from '@/middlewares/role.middleware';
import {
  loginSchema,
  registerSchema,
  createUserSchema,
  updateSelectedRouteSchema,
} from '@/schemas/auth.schema';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - role
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the user
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           description: Username of the user
 *         role:
 *           type: string
 *           enum: [superadmin, admin, manager, user]
 *           description: Role of the user
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: Username for login
 *         password:
 *           type: string
 *           description: Password for login
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           description: Username for registration
 *         password:
 *           type: string
 *           minLength: 6
 *           maxLength: 100
 *           description: Password for registration
 *     CreateUserRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - role
 *       properties:
 *         username:
 *           type: string
 *           description: Username for the new user
 *         password:
 *           type: string
 *           description: Password for the new user
 *         role:
 *           type: string
 *           enum: [superadmin, admin, manager, user]
 *           description: Role for the new user
 */

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put(
  '/update-selected-route',
  authenticateToken,
  validate(updateSelectedRouteSchema),
  authController.updateSelectedRoute
);

// Role-based routes
router.post(
  '/create-user',
  authenticateToken,
  validate(createUserSchema),
  canCreateUser,
  authController.createUser
);
router.get('/users', authenticateToken, canViewUsers, authController.getAllUsers);

export default router;
