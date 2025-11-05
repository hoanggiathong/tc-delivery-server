import { CustomerService } from './customer.service';
import { UserService } from './user.service';
import { RouteService } from './route.service';
import { SettingsService } from './settings.service';
import { MoneyDeliveryService } from './money-delivery.service';
import { IMoneyDeliveryResponse } from '@/types/money-delivery.type';
import { IReturnMoneyDeliveryQuery } from '@/types/return-money-deliveries.type';

export class ReturnMoneyDeliveriesService {
  private customerService: CustomerService;
  private routeService: RouteService;
  private settingsService: SettingsService;
  private userService: UserService;
  private moneyDeliveryService: MoneyDeliveryService;
  constructor() {
    this.customerService = new CustomerService();
    this.routeService = new RouteService();
    this.settingsService = new SettingsService();
    this.userService = new UserService();
    this.moneyDeliveryService = new MoneyDeliveryService();
  }

  async getListReturnMoneyDeliveriesTypeCollectStatusDone(
    query: IReturnMoneyDeliveryQuery,
    userId: string
  ): Promise<IMoneyDeliveryResponse[]> {
    const { startDate, endDate } = query;
    const start = new Date(String(startDate));
    start.setHours(0, 0, 0, 0);

    const end = new Date(String(endDate));
    end.setHours(23, 59, 59, 999);

    try {
      const moneyDeliveries =
        await this.moneyDeliveryService.getListReturnMoneyDeliveriesTypeCollectStatusDone(
          userId,
          start,
          end
        );

      return moneyDeliveries;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list return money deliveries type collect status done failed');
    }
  }
}
