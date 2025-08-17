import { Response } from 'express';
import { DraftDeliveryService } from '@/services/draft-delivery.service';
import { AuthRequest, ApiResponse } from '@/types';
import Logger from '@/utils/logger';

export class DraftDeliveryController {
  private draftDeliveryService: DraftDeliveryService;

  constructor() {
    this.draftDeliveryService = new DraftDeliveryService();
  }

  /**
   * @swagger
   * /api/draft-deliveries:
   *   post:
   *     summary: Create a new draft delivery
   *     tags: [Draft Deliveries]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateDraftDelivery'
   *     responses:
   *       201:
   *         description: Draft created successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  createDraft = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const draft = await this.draftDeliveryService.createDraft(req.body, req.user.userId);

      Logger.info('Draft delivery created successfully', {
        draftId: draft.id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Draft created successfully',
        data: draft,
      };

      res.status(201).json(response);
    } catch (error) {
      Logger.error('Failed to create draft delivery', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to create draft';
      const statusCode = message.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/draft-deliveries/{id}:
   *   put:
   *     summary: Update a draft delivery
   *     tags: [Draft Deliveries]
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
   *             $ref: '#/components/schemas/UpdateDraftDelivery'
   *     responses:
   *       200:
   *         description: Draft updated successfully
   *       400:
   *         description: Validation error
   *       404:
   *         description: Draft not found
   *       401:
   *         description: Unauthorized
   */
  updateDraft = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const draft = await this.draftDeliveryService.updateDraft(id, req.body, req.user.userId);

      Logger.info('Draft delivery updated successfully', {
        draftId: id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Draft updated successfully',
        data: draft,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to update draft delivery', {
        error: error instanceof Error ? error.message : error,
        draftId: req.params.id,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to update draft';
      const statusCode = message.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/draft-deliveries:
   *   get:
   *     summary: Get all draft deliveries for current user's selected route
   *     tags: [Draft Deliveries]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Drafts retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  getUserDrafts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const drafts = await this.draftDeliveryService.getUserDrafts(req.user.userId);

      Logger.info('User drafts retrieved successfully', {
        count: drafts.length,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Drafts retrieved successfully',
        data: { drafts, total: drafts.length },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get user drafts', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get drafts';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(400).json(response);
    }
  };

  /**
   * @swagger
   * /api/draft-deliveries/{id}:
   *   get:
   *     summary: Get a draft delivery by ID
   *     tags: [Draft Deliveries]
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
   *         description: Draft retrieved successfully
   *       404:
   *         description: Draft not found
   *       401:
   *         description: Unauthorized
   */
  getDraftById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const draft = await this.draftDeliveryService.getDraftById(id, req.user.userId);

      Logger.info('Draft retrieved successfully', {
        draftId: id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Draft retrieved successfully',
        data: draft,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get draft', {
        error: error instanceof Error ? error.message : error,
        draftId: req.params.id,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get draft';
      const statusCode = message.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/draft-deliveries/{id}:
   *   delete:
   *     summary: Delete a draft delivery
   *     tags: [Draft Deliveries]
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
   *         description: Draft deleted successfully
   *       404:
   *         description: Draft not found
   *       401:
   *         description: Unauthorized
   */
  deleteDraft = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      await this.draftDeliveryService.deleteDraft(id, req.user.userId);

      Logger.info('Draft deleted successfully', {
        draftId: id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Draft deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to delete draft', {
        error: error instanceof Error ? error.message : error,
        draftId: req.params.id,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to delete draft';
      const statusCode = message.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/draft-deliveries/{id}/convert:
   *   post:
   *     summary: Convert a draft to actual delivery
   *     tags: [Draft Deliveries]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       201:
   *         description: Draft converted to delivery successfully
   *       404:
   *         description: Draft not found
   *       401:
   *         description: Unauthorized
   */
  convertToDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params;
      const delivery = await this.draftDeliveryService.convertToDelivery(id, req.user.userId);

      Logger.info('Draft converted to delivery successfully', {
        draftId: id,
        deliveryId: delivery.id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Draft converted to delivery successfully',
        data: delivery,
      };

      res.status(201).json(response);
    } catch (error) {
      Logger.error('Failed to convert draft to delivery', {
        error: error instanceof Error ? error.message : error,
        draftId: req.params.id,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to convert draft';
      const statusCode = message.includes('not found') ? 404 : 400;

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };

  /**
   * @swagger
   * /api/draft-deliveries/all:
   *   delete:
   *     summary: Delete all drafts for current user
   *     tags: [Draft Deliveries]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All drafts deleted successfully
   *       401:
   *         description: Unauthorized
   */
  deleteAllUserDrafts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const result = await this.draftDeliveryService.deleteAllUserDrafts(req.user.userId);

      Logger.info('All user drafts deleted successfully', {
        deletedCount: result.deletedCount,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: `${result.deletedCount} drafts deleted successfully`,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to delete all user drafts', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to delete drafts';

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(400).json(response);
    }
  };
}