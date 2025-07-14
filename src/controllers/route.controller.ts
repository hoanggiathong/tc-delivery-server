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
   *     responses:
   *       201:
   *         description: Route created successfully
   *       400:
   *         description: Validation error
   *       409:
   *         description: Route with this code already exists
   *       403:
   *         description: Insufficient permissions
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
   *     responses:
   *       200:
   *         description: Route updated successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Route not found
   *       409:
   *         description: Route with this code already exists
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
   *     responses:
   *       200:
   *         description: Route retrieved successfully
   *       404:
   *         description: Route not found
   *       403:
   *         description: Insufficient permissions
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
   *       403:
   *         description: Insufficient permissions
   */
  getAllRoutes = async (req: Request, res: Response): Promise<void> => {
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
   *     responses:
   *       200:
   *         description: Route deleted successfully
   *       404:
   *         description: Route not found
   *       403:
   *         description: Insufficient permissions
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
   *       404:
   *         description: Route not found
   *       403:
   *         description: Insufficient permissions
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
