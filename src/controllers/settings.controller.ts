import { Response } from 'express';
import { SettingsService } from '@/services/settings.service';
import {
  CalculateShippingFeeInput,
  UpdateShippingRatesInput,
  UpdateProductListInput,
} from '@/schemas/settings.schema';
import { AuthRequest, ApiResponse } from '@/types';
import Logger from '@/utils/logger';

export class SettingsController {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
  }

  getShippingRates = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const rates = await this.settingsService.getShippingRates();

      Logger.info('Shipping rates retrieved successfully', {
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Shipping rates retrieved successfully',
        data: rates,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get shipping rates', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get shipping rates';
      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  updateShippingRates = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { rates }: UpdateShippingRatesInput['body'] = req.body;
      const success = await this.settingsService.createShippingRatesWithDefaults(rates);

      Logger.info('Shipping rates update attempted', {
        success,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success,
        message: success
          ? 'Shipping rates updated successfully'
          : 'Failed to update shipping rates',
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to update shipping rates', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        requestBody: req.body,
      });

      const message = error instanceof Error ? error.message : 'Failed to update shipping rates';
      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(400).json(response);
    }
  };

  getProductList = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const products = await this.settingsService.getProductList();

      Logger.info('Product list retrieved successfully', {
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Product list retrieved successfully',
        data: products,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get product list', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const message = error instanceof Error ? error.message : 'Failed to get product list';
      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(500).json(response);
    }
  };

  updateProductList = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { products }: UpdateProductListInput['body'] = req.body;
      const success = await this.settingsService.updateProductList(products);

      Logger.info('Product list update attempted', {
        success,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success,
        message: success ? 'Product list updated successfully' : 'Failed to update product list',
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to update product list', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        requestBody: req.body,
      });

      const message = error instanceof Error ? error.message : 'Failed to update product list';
      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(400).json(response);
    }
  };

  calculateShippingFee = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { amount, isExpress }: CalculateShippingFeeInput['body'] = req.body;
      const fee = await this.settingsService.calculateShippingFee(amount, isExpress);

      Logger.info('Shipping fee calculated successfully', {
        amount,
        isExpress,
        fee,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Shipping fee calculated successfully',
        data: {
          amount,
          isExpress,
          shippingFee: fee,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to calculate shipping fee', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        requestBody: req.body,
      });

      const message = error instanceof Error ? error.message : 'Failed to calculate shipping fee';

      let statusCode = 400;
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          statusCode = 404;
        }
      }

      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(statusCode).json(response);
    }
  };
}
