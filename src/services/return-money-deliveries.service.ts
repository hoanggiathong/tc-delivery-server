import { CustomerService } from './customer.service';
import { UserService } from './user.service';
import { RouteService } from './route.service';
import { SettingsService } from './settings.service';
import { MoneyDeliveryService } from './money-delivery.service';
import { IMoneyDeliveryResponse } from '@/types/money-delivery.type';
import { IReturnMoneyDeliveryQuery } from '@/types/return-money-deliveries.type';
import { ReturnDeliveriesService } from './return-deliveries.service';
import { getStartOfDayVietnam, getEndOfDayVietnam, convertVietnamToUTC } from '@/utils/date.utils';
import { IMoneyDelivery, MoneyDelivery, MoneyDeliveryStatus } from '@/models/money-delivery.model';
import Logger from '@/utils/logger';

export class ReturnMoneyDeliveriesService {
  private customerService: CustomerService;
  private routeService: RouteService;
  private settingsService: SettingsService;
  private userService: UserService;
  private moneyDeliveryService: MoneyDeliveryService;
  private returnDeliveryService: ReturnDeliveriesService;
  constructor() {
    this.customerService = new CustomerService();
    this.routeService = new RouteService();
    this.settingsService = new SettingsService();
    this.userService = new UserService();
    this.moneyDeliveryService = new MoneyDeliveryService();
    this.returnDeliveryService = new ReturnDeliveriesService();
  }

  // HÀNG THU HỘ ĐÃ CHUYỂN TRONG NGÀY
  async getListReturnMoneyDeliveriesTypeCollectStatusDone(
    query: IReturnMoneyDeliveryQuery,
    userId: string
  ): Promise<IMoneyDeliveryResponse[]> {
    const { startDate, endDate } = query;

    const startDateObj = new Date(String(startDate));
    const endDateObj = new Date(String(endDate));

    const startOfDay = getStartOfDayVietnam(startDateObj);
    const endOfDay = getEndOfDayVietnam(endDateObj);

    const startDateUTC = convertVietnamToUTC(startOfDay);
    const endDateUTC = convertVietnamToUTC(endOfDay);

    try {
      const moneyDeliveries =
        await this.moneyDeliveryService.getListReturnMoneyDeliveriesTypeCollectStatusDone(
          userId,
          startDateUTC,
          endDateUTC
        );

      return moneyDeliveries;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list return money deliveries type collect status done failed');
    }
  }

  /**
   * danh sách tiền về cũ nhưng không lấy type thu hộ
   */
  async getListOldMoneyDeliveryNotTypeCollectCost(
    query: IReturnMoneyDeliveryQuery,
    userId: string
  ): Promise<IMoneyDeliveryResponse[]> {
    const { startDate, endDate } = query;

    const startDateObj = new Date(String(startDate));
    const endDateObj = new Date(String(endDate));

    const startOfDay = getStartOfDayVietnam(startDateObj);
    const endOfDay = getEndOfDayVietnam(endDateObj);

    const startDateUTC = convertVietnamToUTC(startOfDay);
    const endDateUTC = convertVietnamToUTC(endOfDay);

    try {
      const moneyDeliveries =
        await this.moneyDeliveryService.getListOldMoneyDeliveryNotTypeCollectCost(
          userId,
          startDateUTC,
          endDateUTC
        );

      return moneyDeliveries;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list old money delivery not type collect cost failed');
    }
  }

  /**
   * danh sách tiền về không lấy type thu hộ và status DONE
   */
  async getListMoneyDeliveryNotTypeCollectCostWithStatusDone(
    query: IReturnMoneyDeliveryQuery,
    userId: string
  ): Promise<IMoneyDeliveryResponse[]> {
    const { startDate, endDate } = query;

    const startDateObj = new Date(String(startDate));
    const endDateObj = new Date(String(endDate));

    const startOfDay = getStartOfDayVietnam(startDateObj);
    const endOfDay = getEndOfDayVietnam(endDateObj);

    const startDateUTC = convertVietnamToUTC(startOfDay);
    const endDateUTC = convertVietnamToUTC(endOfDay);

    try {
      const moneyDeliveries =
        await this.moneyDeliveryService.getListMoneyDeliveryNotTypeCollectCostWithStatusDone(
          userId,
          startDateUTC,
          endDateUTC
        );

      return moneyDeliveries;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list money delivery not type collect cost with status done failed');
    }
  }

  /**
   * danh sách tiền về type NORMAL và status WAITING
   */
  async getListMoneyDeliveryTypeNormalWithStatusWaiting(
    query: IReturnMoneyDeliveryQuery,
    userId: string
  ): Promise<IMoneyDeliveryResponse[]> {
    const { startDate, endDate } = query;

    const startDateObj = new Date(String(startDate));
    const endDateObj = new Date(String(endDate));

    const startOfDay = getStartOfDayVietnam(startDateObj);
    const endOfDay = getEndOfDayVietnam(endDateObj);

    const startDateUTC = convertVietnamToUTC(startOfDay);
    const endDateUTC = convertVietnamToUTC(endOfDay);

    try {
      const moneyDeliveries =
        await this.moneyDeliveryService.getListMoneyDeliveryTypeNormalWithStatusWaiting(
          userId,
          startDateUTC,
          endDateUTC
        );

      return moneyDeliveries;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list money delivery type normal with status waiting failed');
    }
  }

  /**
   * danh sách tiền về type COLLECT và status DONE
   */
  async getListMoneyDeliveryTypeCollectCostWithStatusDone(
    query: IReturnMoneyDeliveryQuery,
    userId: string
  ): Promise<IMoneyDeliveryResponse[]> {
    const { startDate, endDate } = query;

    const startDateObj = new Date(String(startDate));
    const endDateObj = new Date(String(endDate));

    const startOfDay = getStartOfDayVietnam(startDateObj);
    const endOfDay = getEndOfDayVietnam(endDateObj);

    const startDateUTC = convertVietnamToUTC(startOfDay);
    const endDateUTC = convertVietnamToUTC(endOfDay);

    try {
      const moneyDeliveries =
        await this.moneyDeliveryService.getListMoneyDeliveryTypeCollectCostWithStatusDone(
          userId,
          startDateUTC,
          endDateUTC
        );

      return moneyDeliveries;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list money delivery type collect cost with status done failed');
    }
  }

  /**
   * Update status return money delivery with images
   */
  async updateStatusReturnMoneyDeliveryWithImages(
    moneyDeliveryId: string,
    contentReturn?: string,
    imagesData?: Array<{
      index: number;
      buffer: Buffer;
      originalName: string;
      rotate: number;
    }>
  ): Promise<IMoneyDelivery> {
    try {
      // Get money delivery by ID
      const moneyDeliveryDoc = await MoneyDelivery.findById(moneyDeliveryId);
      if (!moneyDeliveryDoc) {
        throw new Error(`Money delivery with ID ${moneyDeliveryId} not found`);
      }

      // Handle images upload if provided
      if (imagesData && imagesData.length > 0) {
        await this.moneyDeliveryService.uploadImagesMoneyDelivery(moneyDeliveryId, imagesData);
        // Reload to get updated images
        const updatedDoc = await MoneyDelivery.findById(moneyDeliveryId);
        if (updatedDoc) {
          moneyDeliveryDoc.images = updatedDoc.images;
        }
      }

      // Update status to DONE
      moneyDeliveryDoc.status = MoneyDeliveryStatus.DONE;

      // Update field contentReturn if provided
      if (contentReturn !== undefined) {
        moneyDeliveryDoc.contentReturn = contentReturn;
      }

      const now = new Date();
      const returnDateString = `Đã trả tiền ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      const existingNotes =
        typeof moneyDeliveryDoc.notes === 'string' ? moneyDeliveryDoc.notes : '';
      moneyDeliveryDoc.notes = existingNotes
        ? `${returnDateString}, ${existingNotes}`
        : returnDateString;
      moneyDeliveryDoc.updatedAt = now;
      moneyDeliveryDoc.dateReturn = now;

      await moneyDeliveryDoc.save();

      Logger.info('Return money delivery status updated with images successfully', {
        moneyDeliveryId,
        hasImages: imagesData && imagesData.length > 0,
        timestamp: now,
      });

      return moneyDeliveryDoc;
    } catch (error) {
      Logger.error('Failed to update return money delivery status with images', {
        error: error instanceof Error ? error.message : error,
        moneyDeliveryId,
      });

      // Re-throw the original error with its message for better debugging
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('update status return money delivery with images failed');
    }
  }
}
