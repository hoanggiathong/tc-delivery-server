import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '@/services/settings.service';
import {
  CreateSettingsInput,
  UpdateSettingsInput,
  GetSettingsByNameInput,
  DeleteSettingsInput,
  CalculateShippingFeeInput,
} from '@/schemas/settings.schema';

const settingsService = new SettingsService();

export const createSettings = async (
  req: Request<Record<string, never>, Record<string, never>, CreateSettingsInput['body']>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, metadata, description, isActive } = req.body;
    const settings = await settingsService.create(name, metadata);

    if (description !== undefined || isActive !== undefined) {
      await settingsService.update(name, {
        ...metadata,
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      } as any);
    }

    res.status(201).json({
      success: true,
      message: 'Settings created successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await settingsService.getAll();

    res.status(200).json({
      success: true,
      message: 'Settings retrieved successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const getSettingsByName = async (
  req: Request<GetSettingsByNameInput['params']>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name } = req.params;
    const settings = await settingsService.getByName(name);

    res.status(200).json({
      success: true,
      message: 'Settings retrieved successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (
  req: Request<UpdateSettingsInput['params'], Record<string, never>, UpdateSettingsInput['body']>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name } = req.params;
    const { metadata } = req.body;
    const settings = await settingsService.update(name, metadata);

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const getShippingRates = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rates = await settingsService.getShippingRates();

    res.status(200).json({
      success: true,
      message: 'Shipping rates retrieved successfully',
      data: rates,
    });
  } catch (error) {
    next(error);
  }
};

export const updateShippingRates = async (
  req: Request<Record<string, never>, Record<string, never>, { rates: any[] }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rates } = req.body;
    const success = await settingsService.createShippingRatesWithDefaults(rates);

    res.status(200).json({
      success,
      message: success ? 'Shipping rates updated successfully' : 'Failed to update shipping rates',
    });
  } catch (error) {
    next(error);
  }
};

export const getProductList = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const products = await settingsService.getProductList();

    res.status(200).json({
      success: true,
      message: 'Product list retrieved successfully',
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProductList = async (
  req: Request<Record<string, never>, Record<string, never>, { products: any[] }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { products } = req.body;
    const success = await settingsService.updateProductList(products);

    res.status(200).json({
      success,
      message: success ? 'Product list updated successfully' : 'Failed to update product list',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSettings = async (
  req: Request<DeleteSettingsInput['params']>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name } = req.params;
    await settingsService.delete(name);

    res.status(200).json({
      success: true,
      message: 'Settings deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const calculateShippingFee = async (
  req: Request<Record<string, never>, Record<string, never>, CalculateShippingFeeInput['body']>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { amount, isExpress } = req.body;
    const fee = await settingsService.calculateShippingFee(amount, isExpress);

    res.status(200).json({
      success: true,
      message: 'Shipping fee calculated successfully',
      data: {
        amount,
        isExpress,
        shippingFee: fee,
      },
    });
  } catch (error) {
    next(error);
  }
};
