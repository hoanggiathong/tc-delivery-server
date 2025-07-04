import { Request, Response } from 'express';
import { UserRouteService } from '@/services/user-route.service';
import {
  CreateUserRouteRequest,
  AssignMultipleRoutesRequest,
  RemoveMultipleRoutesRequest
} from '@/schemas/user-route.schema';
import { AuthRequest, ApiResponse } from '@/types';

export class UserRouteController {
  private userRouteService: UserRouteService;

  constructor() {
    this.userRouteService = new UserRouteService();
  }

  /**
   * @swagger
   * /api/user-route/assign:
   *   post:
   *     summary: Assign a route to a user
   *     tags: [UserRoute]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - routeId
   *             properties:
   *               userId:
   *                 type: string
   *                 example: 507f1f77bcf86cd799439011
   *               routeId:
   *                 type: string
   *                 example: 507f1f77bcf86cd799439012
   *     responses:
   *       201:
   *         description: Route assigned successfully
   *       400:
   *         description: Validation error or route already assigned
   *       404:
   *         description: User or route not found
   *       403:
   *         description: Insufficient permissions
   */
  assignRouteToUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const data: CreateUserRouteRequest = req.body;
      const userRoute = await this.userRouteService.assignRouteToUser(data, req.user.userId);

      const response: ApiResponse = {
        success: true,
        message: 'Route assigned to user successfully',
        data: { userRoute }
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Assign route to user error:', error);

      const message = error instanceof Error ? error.message : 'Failed to assign route to user';
      let statusCode = 400;

      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('already assigned')) {
        statusCode = 409;
      }

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/user-route/assign-multiple:
   *   post:
   *     summary: Assign multiple routes to a user
   *     tags: [UserRoute]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - routeIds
   *             properties:
   *               userId:
   *                 type: string
   *                 example: 507f1f77bcf86cd799439011
   *               routeIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
   *     responses:
   *       201:
   *         description: Routes assigned successfully
   *       400:
   *         description: Validation error or routes already assigned
   *       404:
   *         description: User or routes not found
   *       403:
   *         description: Insufficient permissions
   */
  assignMultipleRoutesToUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const data: AssignMultipleRoutesRequest = req.body;
      const userRoutes = await this.userRouteService.assignMultipleRoutesToUser(data, req.user.userId);

      const response: ApiResponse = {
        success: true,
        message: `${userRoutes.length} routes assigned to user successfully`,
        data: { userRoutes, count: userRoutes.length }
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Assign multiple routes to user error:', error);

      const message = error instanceof Error ? error.message : 'Failed to assign multiple routes to user';
      let statusCode = 400;

      if (message.includes('not found')) {
        statusCode = 404;
      } else if (message.includes('already assigned')) {
        statusCode = 409;
      }

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/user-route/{id}:
   *   delete:
   *     summary: Remove a route assignment from a user
   *     tags: [UserRoute]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User route assignment ID
   *     responses:
   *       200:
   *         description: Route assignment removed successfully
   *       404:
   *         description: User route assignment not found
   *       403:
   *         description: Insufficient permissions
   */
  removeRouteFromUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      await this.userRouteService.removeRouteFromUser(id);

      const response: ApiResponse = {
        success: true,
        message: 'Route assignment removed successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Remove route from user error:', error);

      const message = error instanceof Error ? error.message : 'Failed to remove route from user';
      const statusCode = message.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/user-route/remove-multiple:
   *   delete:
   *     summary: Remove multiple route assignments from a user
   *     tags: [UserRoute]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - routeIds
   *             properties:
   *               userId:
   *                 type: string
   *                 example: 507f1f77bcf86cd799439011
   *               routeIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
   *     responses:
   *       200:
   *         description: Route assignments removed successfully
   *       400:
   *         description: No route assignments found to remove
   *       403:
   *         description: Insufficient permissions
   */
  removeMultipleRoutesFromUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const data: RemoveMultipleRoutesRequest = req.body;
      await this.userRouteService.removeMultipleRoutesFromUser(data);

      const response: ApiResponse = {
        success: true,
        message: 'Route assignments removed successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Remove multiple routes from user error:', error);

      const message = error instanceof Error ? error.message : 'Failed to remove multiple routes from user';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(400).json(response);
    }
  };

  /**
   * @swagger
   * /api/user-route/user/{userId}:
   *   get:
   *     summary: Get all route assignments for a user
   *     tags: [UserRoute]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     responses:
   *       200:
   *         description: User route assignments retrieved successfully
   *       404:
   *         description: User not found
   *       403:
   *         description: Insufficient permissions
   */
  getUserRoutes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const { userId } = req.params;
      const userRoutes = await this.userRouteService.getUserRoutes(userId);

      const response: ApiResponse = {
        success: true,
        message: 'User route assignments retrieved successfully',
        data: { userRoutes, count: userRoutes.length }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get user routes error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get user routes';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/user-route/user/{userId}/routes:
   *   get:
   *     summary: Get routes assigned to a user (simplified)
   *     tags: [UserRoute]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     responses:
   *       200:
   *         description: User routes retrieved successfully
   *       403:
   *         description: Insufficient permissions
   */
  getRoutesForUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const { userId } = req.params;
      const routes = await this.userRouteService.getRoutesForUser(userId);

      const response: ApiResponse = {
        success: true,
        message: 'User routes retrieved successfully',
        data: { routes, count: routes.length }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get routes for user error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get routes for user';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/user-route/route/{routeId}:
   *   get:
   *     summary: Get all users assigned to a route
   *     tags: [UserRoute]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: routeId
   *         required: true
   *         schema:
   *           type: string
   *         description: Route ID
   *     responses:
   *       200:
   *         description: Users for route retrieved successfully
   *       403:
   *         description: Insufficient permissions
   */
  getUsersForRoute = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const { routeId } = req.params;
      const userRoutes = await this.userRouteService.getUsersForRoute(routeId);

      const response: ApiResponse = {
        success: true,
        message: 'Users for route retrieved successfully',
        data: { userRoutes, count: userRoutes.length }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get users for route error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get users for route';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/user-route:
   *   get:
   *     summary: Get all user route assignments
   *     tags: [UserRoute]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All user route assignments retrieved successfully
   *       403:
   *         description: Insufficient permissions
   */
  getAllUserRoutes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized'
        };
        res.status(401).json(response);
        return;
      }

      const userRoutes = await this.userRouteService.getAllUserRoutes();

      const response: ApiResponse = {
        success: true,
        message: 'All user route assignments retrieved successfully',
        data: { userRoutes, count: userRoutes.length }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get all user routes error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get all user routes';

      const response: ApiResponse = {
        success: false,
        message
      };

      res.status(500).json(response);
    }
  };
}