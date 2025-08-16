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
    const { name, metadata } = req.body;
    const settings = await settingsService.create(name, metadata);

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
