import { Request, Response } from 'express';
import { Route } from '@/models/route.model';

export class MobileCustomerRouteController {
  getRoutes = async (_req: Request, res: Response): Promise<void> => {
    try {
      const routes = await Route.find({}).select('_id code name address phone type').lean();

      routes.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));

      res.status(200).json({
        success: true,
        message: 'Routes retrieved successfully',
        data: {
          routes: routes.map(route => ({
            id: String(route._id),
            code: route.code,
            name: route.name,
            address: route.address,
            phone: route.phone,
            type: route.type,
          })),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không tải được danh sách trạm',
      });
    }
  };
}
