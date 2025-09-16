import { Response } from 'express';
import { SettingsService } from '@/services/settings.service';
import { AppError } from '@/middlewares/error.middleware';
import {
  CalculateShippingFeeInput,
  UpdateShippingRatesInput,
  UpdateProductListInput,
  DeleteShippingRateInput,
  DeleteProductInput,
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
      const success = await this.settingsService.appendShippingRatesWithDefaults(rates);

      Logger.info('Shipping rates update attempted', {
        success,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success,
        message: success
          ? 'Shipping rates appended successfully'
          : 'Failed to append shipping rates',
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to append shipping rates', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        requestBody: req.body,
      });

      const message = error instanceof Error ? error.message : 'Failed to append shipping rates';
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
      const success = await this.settingsService.appendProductsWithDefaults(products);

      Logger.info('Product list update attempted', {
        success,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success,
        message: success ? 'Products appended successfully' : 'Failed to append products',
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to append products', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        requestBody: req.body,
      });

      const message = error instanceof Error ? error.message : 'Failed to append products';
      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(400).json(response);
    }
  };

  createProducts = async (req: AuthRequest, res: Response): Promise<void> => {
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
      const success = await this.settingsService.createProductsWithDefaults(products);

      Logger.info('Products creation attempted', {
        success,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success,
        message: success ? 'Products created successfully' : 'Failed to create products',
      };

      res.status(201).json(response);
    } catch (error) {
      Logger.error('Failed to create products', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        requestBody: req.body,
      });

      const message = error instanceof Error ? error.message : 'Failed to create products';
      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(400).json(response);
    }
  };

  deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params as DeleteProductInput['params'];
      const success = await this.settingsService.deleteProductById(id);

      Logger.info('Product deletion attempted', {
        success,
        productId: id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success,
        message: success ? 'Product deleted successfully' : 'Failed to delete product',
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to delete product', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        productId: req.params.id,
      });

      const message = error instanceof Error ? error.message : 'Failed to delete product';

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

      const { amount, isExpress, isFree }: CalculateShippingFeeInput['body'] = req.body;
      const fee = await this.settingsService.calculateShippingFee(amount, isExpress, isFree);

      Logger.info('Shipping fee calculated successfully', {
        amount,
        isExpress,
        isFree,
        fee,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Shipping fee calculated successfully',
        data: {
          amount,
          isExpress,
          isFree,
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

  createShippingRates = async (req: AuthRequest, res: Response): Promise<void> => {
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

      Logger.info('Shipping rates creation attempted', {
        success,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success,
        message: success
          ? 'Shipping rates created successfully'
          : 'Failed to create shipping rates',
      };

      res.status(201).json(response);
    } catch (error) {
      Logger.error('Failed to create shipping rates', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        requestBody: req.body,
      });

      const message = error instanceof Error ? error.message : 'Failed to create shipping rates';
      const response: ApiResponse = {
        success: false,
        message,
      };

      res.status(400).json(response);
    }
  };

  deleteShippingRate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { id } = req.params as DeleteShippingRateInput['params'];
      const success = await this.settingsService.deleteShippingRateById(id);

      Logger.info('Shipping rate deletion attempted', {
        success,
        rateId: id,
        userId: req.user.userId,
      });

      const response: ApiResponse = {
        success,
        message: success ? 'Shipping rate deleted successfully' : 'Failed to delete shipping rate',
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to delete shipping rate', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        rateId: req.params.id,
      });

      const message = error instanceof Error ? error.message : 'Failed to delete shipping rate';

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

  updateSettingsByName = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { name } = req.params;
      const { metadata } = req.body;

      // Basic validation for shipping rates
      if (name === 'shipping_rates' && Array.isArray(metadata)) {
        if (metadata.length === 0) {
          const response: ApiResponse = {
            success: false,
            message: 'Validation error: metadata cannot be empty',
          };
          res.status(400).json(response);
          return;
        }
        for (const rate of metadata) {
          if (rate.fromAmount >= rate.toAmount) {
            const response: ApiResponse = {
              success: false,
              message: 'Validation error: fromAmount must be less than toAmount',
            };
            res.status(400).json(response);
            return;
          }
        }
      }

      const result = await this.settingsService.update(name, metadata);

      const response: ApiResponse = {
        success: true,
        message: 'Settings updated successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to update settings by name', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        name: req.params.name,
      });

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update settings',
      };

      res.status(400).json(response);
    }
  };

  deleteSettingsByName = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { name } = req.params;

      await this.settingsService.delete(name);

      const response: ApiResponse = {
        success: true,
        message: 'Settings deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to delete settings by name', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        name: req.params.name,
      });

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete settings',
      };

      res.status(400).json(response);
    }
  };

  createSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { name, metadata } = req.body;

      // Basic validation for shipping rates
      if (name === 'shipping_rates' && Array.isArray(metadata)) {
        if (metadata.length === 0) {
          const response: ApiResponse = {
            success: false,
            message: 'Validation error: metadata cannot be empty',
          };
          res.status(400).json(response);
          return;
        }
        for (const rate of metadata) {
          if (rate.fromAmount >= rate.toAmount) {
            const response: ApiResponse = {
              success: false,
              message: 'Validation error: fromAmount must be less than toAmount',
            };
            res.status(400).json(response);
            return;
          }
        }
      }

      const result = await this.settingsService.create(name, metadata);

      const response: ApiResponse = {
        success: true,
        message: 'Settings created successfully',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      Logger.error('Failed to create settings', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create settings',
      };

      res.status(400).json(response);
    }
  };

  getAllSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const result = await this.settingsService.getAll();

      const response: ApiResponse = {
        success: true,
        message: 'Settings retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get all settings', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
      });

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get settings',
      };

      res.status(400).json(response);
    }
  };

  getSettingsByName = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(401).json(response);
        return;
      }

      const { name } = req.params;

      const result = await this.settingsService.getByName(name);

      if (!result) {
        const response: ApiResponse = {
          success: false,
          message: `Settings with name "${name}" not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Settings retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      Logger.error('Failed to get settings by name', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.userId,
        name: req.params.name,
      });

      // Check if it's an AppError with a specific status code
      let statusCode = 400;
      if (error instanceof AppError) {
        statusCode = error.statusCode;
      } else if (error instanceof Error && error.message.includes('not found')) {
        statusCode = 404;
      }

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get settings',
      };

      res.status(statusCode).json(response);
    }
  };
}
