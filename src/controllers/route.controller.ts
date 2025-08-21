import { Request, Response } from 'express';
import { RouteService } from '@/services/route.service';
import { CreateRouteRequest, UpdateRouteRequest } from '@/schemas/route.schema';
import { ApiResponse } from '@/types';

export class RouteController {
  private routeService: RouteService;

  constructor() {
    this.routeService = new RouteService();
  }

  /**
   * @swagger
   * /api/route:
   *   post:
   *     summary: Create a new route
   *     tags: [Route]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - code
   *               - name
   *             properties:
   *               code:
   *                 type: string
   *                 maxLength: 10
   *                 pattern: ^[A-Z]\d+$
   *                 example: T1
   *               name:
   *                 type: string
   *                 maxLength: 100
   *                 example: TP.HCM
   *               address:
   *                 type: string
   *                 maxLength: 200
   *                 example: 123 Nguyễn Văn Linh, Quận 7, TP.HCM
   *           examples:
   *             hcmRoute:
   *               summary: Create HCM route
   *               value:
   *                 code: "T1"
   *                 name: "TP.HCM"
   *                 address: "123 Nguyễn Văn Linh, Quận 7, TP.HCM"
   *             hanoiRoute:
   *               summary: Create Hanoi route
   *               value:
   *                 code: "T2"
   *                 name: "Hà Nội"
   *                 address: "456 Hoàng Quốc Việt, Cầu Giấy, Hà Nội"
   *             danangRoute:
   *               summary: Create Da Nang route
   *               value:
   *                 code: "T3"
   *                 name: "Đà Nẵng"
   *                 address: "789 Lê Duẩn, Hải Châu, Đà Nẵng"
   *     responses:
   *       201:
   *         description: Route created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Route created successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     route:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         code:
   *                           type: string
   *                         name:
   *                           type: string
   *                         address:
   *                           type: string
   *                         createdAt:
   *                           type: string
   *                         updatedAt:
   *                           type: string
   *             examples:
   *               created:
   *                 summary: Route created
   *                 value:
   *                   success: true
   *                   message: "Route created successfully"
   *                   data:
   *                     route:
   *                       id: "507f1f77bcf86cd799439011"
   *                       code: "T1"
   *                       name: "TP.HCM"
   *                       address: "123 Nguyễn Văn Linh, Quận 7, TP.HCM"
   *                       createdAt: "2024-12-17T10:00:00.000Z"
   *                       updatedAt: "2024-12-17T10:00:00.000Z"
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *             examples:
   *               invalidCode:
   *                 summary: Invalid route code format
   *                 value:
   *                   success: false
   *                   message: "Validation error: Code must match pattern ^[A-Z]\\d+$"
   *               missingName:
   *                 summary: Missing required field
   *                 value:
   *                   success: false
   *                   message: "Validation error: Name is required"
   *       409:
   *         description: Route with this code already exists
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Route with code T1 already exists"
   *       403:
   *         description: Insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Insufficient permissions"
   */
  createRoute = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CreateRouteRequest = req.body;
      const route = await this.routeService.createRoute(data);

      const response: ApiResponse = {
        success: true,
        message: 'Route created successfully',
        data: { route },
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create route error:', error);

      const message = error instanceof Error ? error.message : 'Failed to create route';
      const statusCode = message.includes('already exists') ? 409 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/route/{id}:
   *   put:
   *     summary: Update route by ID
   *     tags: [Route]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         example: "507f1f77bcf86cd799439011"
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               code:
   *                 type: string
   *                 maxLength: 10
   *                 pattern: ^[A-Z]\d+$
   *                 example: T1
   *               name:
   *                 type: string
   *                 maxLength: 100
   *                 example: TP.HCM
   *           examples:
   *             updateName:
   *               summary: Update route name
   *               value:
   *                 name: "TP. Hồ Chí Minh"
   *             updateCode:
   *               summary: Update route code
   *               value:
   *                 code: "T1A"
   *             updateBoth:
   *               summary: Update both code and name
   *               value:
   *                 code: "T1B"
   *                 name: "Thành phố Hồ Chí Minh"
   *     responses:
   *       200:
   *         description: Route updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Route updated successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     route:
   *                       type: object
   *             examples:
   *               updated:
   *                 summary: Route updated
   *                 value:
   *                   success: true
   *                   message: "Route updated successfully"
   *                   data:
   *                     route:
   *                       id: "507f1f77bcf86cd799439011"
   *                       code: "T1A"
   *                       name: "TP. Hồ Chí Minh"
   *                       createdAt: "2024-12-17T10:00:00.000Z"
   *                       updatedAt: "2024-12-17T11:00:00.000Z"
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *             examples:
   *               invalidCode:
   *                 summary: Invalid code format
   *                 value:
   *                   success: false
   *                   message: "Validation error: Code must match pattern ^[A-Z]\\d+$"
   *       404:
   *         description: Route not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Route not found"
   *       409:
   *         description: Route with this code already exists
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Route with code T2 already exists"
   *       403:
   *         description: Insufficient permissions
   */
  updateRoute = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data: UpdateRouteRequest = req.body;

      const route = await this.routeService.updateRoute(id, data);

      const response: ApiResponse = {
        success: true,
        message: 'Route updated successfully',
        data: { route },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Update route error:', error);

      const message = error instanceof Error ? error.message : 'Failed to update route';
      let statusCode = 400;

      if (message === 'Route not found') {
        statusCode = 404;
      } else if (message.includes('already exists')) {
        statusCode = 409;
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/route/{id}:
   *   get:
   *     summary: Get route by ID
   *     tags: [Route]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         example: "507f1f77bcf86cd799439011"
   *     responses:
   *       200:
   *         description: Route retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Route retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     route:
   *                       type: object
   *             examples:
   *               found:
   *                 summary: Route found
   *                 value:
   *                   success: true
   *                   message: "Route retrieved successfully"
   *                   data:
   *                     route:
   *                       id: "507f1f77bcf86cd799439011"
   *                       code: "T1"
   *                       name: "TP.HCM"
   *                       createdAt: "2024-12-17T10:00:00.000Z"
   *                       updatedAt: "2024-12-17T10:00:00.000Z"
   *       404:
   *         description: Route not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Route not found"
   *       403:
   *         description: Insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Insufficient permissions"
   */
  getRouteById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const route = await this.routeService.getRouteById(id);

      if (!route) {
        const response: ApiResponse = {
          success: false,
          message: 'Route not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Route retrieved successfully',
        data: { route },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get route error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get route';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/route:
   *   get:
   *     summary: Get all routes
   *     tags: [Route]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Routes retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Routes retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     routes:
   *                       type: array
   *                       items:
   *                         type: object
   *                     total:
   *                       type: integer
   *             examples:
   *               multipleRoutes:
   *                 summary: Multiple routes found
   *                 value:
   *                   success: true
   *                   message: "Routes retrieved successfully"
   *                   data:
   *                     routes:
   *                       - id: "507f1f77bcf86cd799439011"
   *                         code: "T1"
   *                         name: "TP.HCM"
   *                         createdAt: "2024-12-17T10:00:00.000Z"
   *                         updatedAt: "2024-12-17T10:00:00.000Z"
   *                       - id: "507f1f77bcf86cd799439012"
   *                         code: "T2"
   *                         name: "Hà Nội"
   *                         createdAt: "2024-12-17T10:00:00.000Z"
   *                         updatedAt: "2024-12-17T10:00:00.000Z"
   *                       - id: "507f1f77bcf86cd799439013"
   *                         code: "T3"
   *                         name: "Đà Nẵng"
   *                         createdAt: "2024-12-17T10:00:00.000Z"
   *                         updatedAt: "2024-12-17T10:00:00.000Z"
   *                     total: 3
   *               emptyRoutes:
   *                 summary: No routes found
   *                 value:
   *                   success: true
   *                   message: "Routes retrieved successfully"
   *                   data:
   *                     routes: []
   *                     total: 0
   *       403:
   *         description: Insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Insufficient permissions"
   */
  getAllRoutes = async (_req: Request, res: Response): Promise<void> => {
    try {
      const routes = await this.routeService.getAllRoutes();

      const routesArray = routes || [];

      const response: ApiResponse = {
        success: true,
        message: 'Routes retrieved successfully',
        data: { routes: routesArray, total: routesArray.length },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get all routes error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get routes';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  /**
   * @swagger
   * /api/route/{id}:
   *   delete:
   *     summary: Delete route by ID
   *     tags: [Route]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         example: "507f1f77bcf86cd799439011"
   *     responses:
   *       200:
   *         description: Route deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Route deleted successfully"
   *             examples:
   *               deleted:
   *                 summary: Route deleted
   *                 value:
   *                   success: true
   *                   message: "Route deleted successfully"
   *       404:
   *         description: Route not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Route not found"
   *       403:
   *         description: Insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Insufficient permissions"
   */
  deleteRoute = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.routeService.deleteRoute(id);

      const response: ApiResponse = {
        success: true,
        message: 'Route deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Delete route error:', error);

      const message = error instanceof Error ? error.message : 'Failed to delete route';
      const statusCode = message === 'Route not found' ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/route/code/{code}:
   *   get:
   *     summary: Get route by code
   *     tags: [Route]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *         example: T1
   *     responses:
   *       200:
   *         description: Route retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Route retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     route:
   *                       type: object
   *             examples:
   *               found:
   *                 summary: Route found by code
   *                 value:
   *                   success: true
   *                   message: "Route retrieved successfully"
   *                   data:
   *                     route:
   *                       id: "507f1f77bcf86cd799439011"
   *                       code: "T1"
   *                       name: "TP.HCM"
   *                       createdAt: "2024-12-17T10:00:00.000Z"
   *                       updatedAt: "2024-12-17T10:00:00.000Z"
   *       404:
   *         description: Route not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Route not found"
   *       403:
   *         description: Insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Insufficient permissions"
   */
  getRouteByCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const route = await this.routeService.getRouteByCode(code);

      if (!route) {
        const response: ApiResponse = {
          success: false,
          message: 'Route not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Route retrieved successfully',
        data: { route },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get route by code error:', error);

      const message = error instanceof Error ? error.message : 'Failed to get route';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };
}
