import { Response } from 'express';
import { HomeDeliveryPriceService } from '@/services/home-delivery-price.service';
import { ApiResponse, AuthRequest } from '@/types';
import {
  IHomeDeliveryCalculatorRequest,
  IHomeDeliveryPriceCreateRequest,
  IHomeDeliveryPriceUpdateRequest,
} from '@/types/home-delivery-price.type';

export class HomeDeliveryPriceController {
  private homeDeliveryPriceService: HomeDeliveryPriceService;

  constructor() {
    this.homeDeliveryPriceService = new HomeDeliveryPriceService();
  }

  getList = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const data = await this.homeDeliveryPriceService.getList(userId);

      const response: ApiResponse = {
        success: true,
        message: 'List home delivery prices retrieved successfully',
        data,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get home delivery prices error:', error);

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get home delivery prices',
      };

      res.status(400).json(response);
    }
  };

  getListByRouteId = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { routeId } = req.params;

      const data = await this.homeDeliveryPriceService.getListByRouteId(routeId);

      const response: ApiResponse = {
        success: true,
        message: 'List home delivery prices by route retrieved successfully',
        data,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get home delivery prices by route error:', error);

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get home delivery prices',
      };

      res.status(400).json(response);
    }
  };

  create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const payload = req.body as IHomeDeliveryPriceCreateRequest;
      const data = await this.homeDeliveryPriceService.create(userId, payload);

      const response: ApiResponse = {
        success: true,
        message: 'Thêm bảng giá GTN thành công',
        data,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create home delivery price error:', error);

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Thêm bảng giá GTN thất bại',
      };

      res.status(400).json(response);
    }
  };

  update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { id } = req.params;
      const payload = req.body as IHomeDeliveryPriceUpdateRequest;

      const data = await this.homeDeliveryPriceService.update(userId, id, payload);

      const response: ApiResponse = {
        success: true,
        message: 'Cập nhật bảng giá GTN thành công',
        data,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Update home delivery price error:', error);

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Cập nhật bảng giá GTN thất bại',
      };

      res.status(400).json(response);
    }
  };

  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { id } = req.params;

      await this.homeDeliveryPriceService.delete(userId, id);

      const response: ApiResponse = {
        success: true,
        message: 'Xoá bảng giá GTN thành công',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Delete home delivery price error:', error);

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Xoá bảng giá GTN thất bại',
      };

      res.status(400).json(response);
    }
  };

  calculate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const payload = req.body as IHomeDeliveryCalculatorRequest;

      const data = await this.homeDeliveryPriceService.calculate(payload);

      const response: ApiResponse = {
        success: true,
        message: 'Tính cước GTN thành công',
        data,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Calculate home delivery fee error:', error);

      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Không tính được cước GTN',
      };

      res.status(400).json(response);
    }
  };
}
