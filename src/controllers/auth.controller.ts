import { Request, Response } from 'express';
import { AuthService } from '@/services/auth.service';
import { LoginRequest, RegisterRequest, CreateUserRequest } from '@/schemas/auth.schema';
import { AuthRequest, ApiResponse, UserRole } from '@/types';
import { IUserResponse } from '@/types/user.type';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 50
   *               password:
   *                 type: string
   *                 minLength: 6
   *                 maxLength: 100
   *     responses:
   *       201:
   *         description: User registered successfully
   *       400:
   *         description: Validation error or username already exists
   *       500:
   *         description: Internal server error
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: RegisterRequest = req.body;
      const result = await this.authService.register(data);

      const response: ApiResponse = {
        success: true,
        message: 'User registered successfully',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Registration error:', error);

      const message = error instanceof Error ? error.message : 'Registration failed';
      const statusCode = message === 'Username already exists' ? 409 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   *       500:
   *         description: Internal server error
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: LoginRequest = req.body;
      const result = await this.authService.login(data);

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Login error:', error);

      const message = error instanceof Error ? error.message : 'Login failed';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(401).json(response);
    }
  };

  /**
   * @swagger
   * /api/auth/create-user:
   *   post:
   *     summary: Create a new user (Admin only)
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - password
   *               - role
   *             properties:
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [superadmin, admin, manager, user]
   *     responses:
   *       201:
   *         description: User created successfully
   *       403:
   *         description: Insufficient permissions
   */
  createUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data: CreateUserRequest = req.body;
      const result = await this.authService.createUser(data);

      const response: ApiResponse = {
        success: true,
        message: 'User created successfully',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create user error:', error);

      const message = error instanceof Error ? error.message : 'User creation failed';
      const statusCode = message === 'Username already exists' ? 409 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/auth/profile:
   *   get:
   *     summary: Get user profile
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: User not found
   */
  getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const user = await this.authService.getUserById(req.user.userId);
      if (!user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Profile retrieved successfully',
        data: { user },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get profile error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get profile';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/auth/users:
   *   get:
   *     summary: Get users based on role permissions
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Insufficient permissions
   */
  getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      let users: IUserResponse[] = [];
      const viewableRoles = (req as any).viewableRoles;

      if (req.user.role === UserRole.SUPERADMIN) {
        // Superadmin can see all users
        users = await this.authService.getAllUsers() || [];
      } else if (viewableRoles && viewableRoles.length > 0) {
        // Other roles can only see users they have permission to view
        users = await this.authService.getUsersByRoles(viewableRoles) || [];
      }

      const response: ApiResponse = {
        success: true,
        message: 'Users retrieved successfully',
        data: { users, total: users.length },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get all users error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get users';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };
}