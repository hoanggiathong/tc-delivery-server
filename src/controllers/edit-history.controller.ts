import type { Response } from 'express';

import type { EditHistoryDateRangeQuery } from '@/schemas/edit-history.schema';
import { EditHistoryService } from '@/services/edit-history.service';
import type { ApiResponse, AuthRequest } from '@/types';
import Logger from '@/utils/logger';

export class EditHistoryController {
  private readonly editHistoryService: EditHistoryService;

  constructor() {
    this.editHistoryService = new EditHistoryService();
  }

  getDeliveryEditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };

        res.status(401).json(response);
        return;
      }

      const query = req.query as unknown as EditHistoryDateRangeQuery;

      const logs = await this.editHistoryService.getDeliveryEditLogs(query, req.user.userId);

      Logger.info('Delivery edit history retrieved successfully', {
        count: logs.length,
        userId: req.user.userId,
        startDate: query.startDateText,
        endDate: query.endDateText,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Delivery edit history retrieved successfully',
        data: {
          data: logs,
          total: logs.length,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to retrieve delivery edit history', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        query: req.query,
      });

      const response: ApiResponse = {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to retrieve delivery edit history',
      };

      res.status(500).json(response);
    }
  };

  getMoneyEditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };

        res.status(401).json(response);
        return;
      }

      const query = req.query as unknown as EditHistoryDateRangeQuery;

      const logs = await this.editHistoryService.getMoneyEditLogs(query, req.user.userId);

      Logger.info('Money edit history retrieved successfully', {
        count: logs.length,
        userId: req.user.userId,
        startDate: query.startDateText,
        endDate: query.endDateText,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Money edit history retrieved successfully',
        data: {
          data: logs,
          total: logs.length,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to retrieve money edit history', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        query: req.query,
      });

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve money edit history',
      };

      res.status(500).json(response);
    }
  };

  getRemovedDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };

        res.status(401).json(response);
        return;
      }

      const query = req.query as unknown as EditHistoryDateRangeQuery;

      const deliveries = await this.editHistoryService.getRemovedDeliveries(query, req.user.userId);

      Logger.info('Removed deliveries retrieved successfully', {
        count: deliveries.length,
        userId: req.user.userId,
        startDate: query.startDateText,
        endDate: query.endDateText,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Removed deliveries retrieved successfully',
        data: {
          data: deliveries,
          total: deliveries.length,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to retrieve removed deliveries', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        query: req.query,
      });

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve removed deliveries',
      };

      res.status(500).json(response);
    }
  };

  getRemovedMoneyDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };

        res.status(401).json(response);
        return;
      }

      const query = req.query as unknown as EditHistoryDateRangeQuery;

      const moneyDeliveries = await this.editHistoryService.getRemovedMoneyDeliveries(
        query,
        req.user.userId
      );

      Logger.info('Removed money deliveries retrieved successfully', {
        count: moneyDeliveries.length,
        userId: req.user.userId,
        startDate: query.startDateText,
        endDate: query.endDateText,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Removed money deliveries retrieved successfully',
        data: {
          data: moneyDeliveries,
          total: moneyDeliveries.length,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to retrieve removed money deliveries', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        query: req.query,
      });

      const response: ApiResponse = {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to retrieve removed money deliveries',
      };

      res.status(500).json(response);
    }
  };
}
