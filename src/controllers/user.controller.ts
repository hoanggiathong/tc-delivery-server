import { UserService } from '@/services/user.service';
import { ApiResponse, AuthRequest, IAdditionalInformationProductInput } from '@/types';
import Logger from '@/utils/logger';
import { Response } from 'express';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getListAdditionalInformationProductByAccount = async (
    req: AuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const userId = req.user.userId;

      const result = await this.userService.getListAdditionalInformationProductByAccount(userId);

      Logger.info('additional information product list retrieved successfully', {
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'additional information product list retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get additional information product list', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const message =
        error instanceof Error
          ? error.message
          : 'Failed to get additional information product list';
      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  updateAdditionalInformationProductWithDefaults = async (
    req: AuthRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const additionalInformationProductList: IAdditionalInformationProductInput[] =
        req.body.additionalInformationProductList;

      const userId = req.user.userId;
      const success = await this.userService.updateAdditionalInformationProductWithDefaults(
        userId,
        additionalInformationProductList
      );

      Logger.info('Additional information product config update attempted', {
        success,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success,
        message: success
          ? 'Additional information product updated successfully'
          : 'Failed to update additional information product',
      };

      res.status(201).json(response);
    } catch (error) {
      Logger.error('Failed to update additional information product', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        requestBody: req.body,
      });

      const message =
        error instanceof Error ? error.message : 'Failed to update additional information product';
      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(400).json(response);
    }
  };
}
