import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { validate } from '@/middlewares/validation.middleware';
import { authenticateToken } from '@/middlewares/auth.middleware';
import { requireRole, canViewUsers, canCreateUser } from '@/middlewares/role.middleware';
import { loginSchema, registerSchema, createUserSchema } from '@/schemas/auth.schema';
import { UserRole } from '@/types';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);

// Role-based routes
router.post('/create-user',
  authenticateToken,
  validate(createUserSchema),
  canCreateUser,
  authController.createUser
);

router.get('/users',
  authenticateToken,
  canViewUsers,
  authController.getAllUsers
);

export default router;