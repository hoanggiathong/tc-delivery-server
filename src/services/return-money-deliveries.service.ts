import { ICustomer } from '@/models/customer.model';
import { IMoneyDelivery, MoneyDelivery, MoneyDeliveryStatus } from '@/models/money-delivery.model';
import { ICustomerInformationResponse } from '@/types/customer.type';
import { IMoneyDeliveryResponse } from '@/types/money-delivery.type';
import { IReturnMoneyDeliveryQuery } from '@/types/return-money-deliveries.type';
import { IRouteResponse } from '@/types/route.type';
import Logger from '@/utils/logger';
import { CustomerService } from './customer.service';
import { MoneyDeliveryService } from './money-delivery.service';
import { RouteService } from './route.service';

export class ReturnMoneyDeliveriesService {
  private customerService: CustomerService;
  private routeService: RouteService;
  private moneyDeliveryService: MoneyDeliveryService;
  constructor() {
    this.customerService = new CustomerService();
    this.routeService = new RouteService();
    this.moneyDeliveryService = new MoneyDeliveryService();
  }

  // HÀNG THU HỘ ĐÃ CHUYỂN TRONG NGÀY
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

  /**
   * danh sách tiền về cũ nhưng không lấy type thu hộ
   */
  async getListOldMoneyDeliveryNotTypeCollectCost(
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
        await this.moneyDeliveryService.getListOldMoneyDeliveryNotTypeCollectCost(
          userId,
          start,
          end
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

    const start = new Date(String(startDate));
    start.setHours(0, 0, 0, 0);

    const end = new Date(String(endDate));
    end.setHours(23, 59, 59, 999);

    try {
      const moneyDeliveries =
        await this.moneyDeliveryService.getListMoneyDeliveryNotTypeCollectCostWithStatusDone(
          userId,
          start,
          end
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

    const start = new Date(String(startDate));
    start.setHours(0, 0, 0, 0);

    const end = new Date(String(endDate));
    end.setHours(23, 59, 59, 999);

    try {
      const moneyDeliveries =
        await this.moneyDeliveryService.getListMoneyDeliveryTypeNormalWithStatusWaiting(
          userId,
          start,
          end
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

    const start = new Date(String(startDate));
    start.setHours(0, 0, 0, 0);

    const end = new Date(String(endDate));
    end.setHours(23, 59, 59, 999);

    try {
      const moneyDeliveries =
        await this.moneyDeliveryService.getListMoneyDeliveryTypeCollectCostWithStatusDone(
          userId,
          start,
          end
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
   * danh sách tiền về type COLLECT và status WAITING
   */
  async getListReturnMoneyTypeCollectCostWithStatusWaiting(
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
        await this.moneyDeliveryService.getListReturnMoneyDeliveryTypeCollectCostWithStatusWaiting(
          userId,
          start,
          end
        );

      return moneyDeliveries;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list return money type collect cost with status waiting failed');
    }
  }

  /**
   * Get report for return money delivery type COLLECT with status DONE
   * Returns count of today's returns and old returns (7 days ago until today)
   */
  async getListReportReturnMoneyDeliveryTypeCollectWithStatusDone(userId: string) {
    try {
      const report =
        await this.moneyDeliveryService.getListReportReturnMoneyDeliveryTypeCollectWithStatusDone(
          userId
        );
      return report;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('get list report return money delivery type collect with status done failed');
    }
  }

  /**
   * Get report for return money delivery NOT type COLLECT with status DONE
   * Returns count of today's returns and old returns (7 days ago until today)
   */
  async getListReportReturnMoneyDeliveryNotTypeCollectWithStatusDone(userId: string) {
    try {
      const report =
        await this.moneyDeliveryService.getListReportReturnMoneyDeliveryNotTypeCollectWithStatusDone(
          userId
        );
      return report;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(
        'get list report return money delivery not type collect with status done failed'
      );
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
      // Get money delivery by ID to verify it exists
      const moneyDeliveryDoc = await MoneyDelivery.findById(moneyDeliveryId);
      if (!moneyDeliveryDoc) {
        throw new Error(`Money delivery with ID ${moneyDeliveryId} not found`);
      }

      // Handle images upload if provided (this will save the document with images)
      if (imagesData && imagesData.length > 0) {
        await this.moneyDeliveryService.uploadImagesMoneyDelivery(moneyDeliveryId, imagesData);
      }

      // Prepare update data
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const returnDateString = `Đã trả tiền ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${hours}:${minutes}`;
      const existingNotes =
        typeof moneyDeliveryDoc.notes === 'string' ? moneyDeliveryDoc.notes : '';
      const updatedNotes = existingNotes
        ? `${returnDateString}, ${existingNotes}`
        : returnDateString;

      // Build update object
      const updateData: Record<string, unknown> = {
        status: MoneyDeliveryStatus.DONE,
        notes: updatedNotes,
        updatedAt: now,
        dateReturn: now,
      };

      // Add contentReturn if provided
      if (contentReturn !== undefined) {
        updateData.contentReturn = contentReturn;
      }

      // Update the document using findByIdAndUpdate to avoid version conflict
      const updatedMoneyDelivery = await MoneyDelivery.findByIdAndUpdate(
        moneyDeliveryId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedMoneyDelivery) {
        throw new Error(`Failed to update money delivery with ID ${moneyDeliveryId}`);
      }

      Logger.info('Return money delivery status updated with images successfully', {
        moneyDeliveryId,
        hasImages: imagesData && imagesData.length > 0,
        timestamp: now,
      });

      return updatedMoneyDelivery;
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

  async getInformationReceiver(phoneReceiver: string): Promise<ICustomerInformationResponse | []> {
    try {
      const receiver: ICustomer | null =
        await this.customerService.getCustomerByPhone(phoneReceiver);

      if (!receiver) {
        return [];
      }

      const route: IRouteResponse | null = await this.routeService.getRouteById(
        receiver.routeId.toString()
      );

      return {
        id: receiver._id.toString(),
        name: receiver.name,
        phone: receiver.phone,
        route: {
          id: receiver.routeId.toString(),
          code: route?.code,
          name: route?.name,
        },
        address: receiver.address,
        identityCardName: receiver.identityCardName,
        identityCardIssuedDate: receiver.identityCardIssuedDate,
        identityCardNumber: receiver.identityCardNumber,
        images: receiver.images,
        createdAt: receiver.createdAt,
        updatedAt: receiver.updatedAt,
      } as ICustomerInformationResponse;
    } catch (error) {
      throw new Error('get information receiver failed');
    }
  }

  /**
   * Update status with customer images and money images
   * Both customerImages and moneyImages are optional
   */
  async updateStatusWithCustomerImagesAndMoneyImages(
    updateData: {
      moneyDeliveryId: string;
      customerId: string;
      address?: string;
      identityCardName?: string;
      identityCardIssuedDate?: string;
      identityCardNumber?: string;
    },
    contentReturn?: string,
    imagesData?: Array<{
      index: number;
      buffer: Buffer;
      originalName: string;
      rotate: number;
    }>,
    moneyImagesData?: Array<{
      index: number;
      buffer: Buffer;
      originalName: string;
      rotate: number;
    }>
  ): Promise<IMoneyDelivery> {
    try {
      const {
        moneyDeliveryId,
        customerId,
        address,
        identityCardName,
        identityCardIssuedDate,
        identityCardNumber,
      } = updateData;

      const moneyDeliveryDoc = await MoneyDelivery.findById(moneyDeliveryId);
      if (!moneyDeliveryDoc) {
        throw new Error(`Money delivery with ID ${moneyDeliveryId} not found`);
      }

      const customer = await this.customerService.getCustomerById(customerId);
      if (!customer) {
        throw new Error(`Customer with ID ${customerId} not found`);
      }

      // Handle customer images upload if provided
      if (imagesData && imagesData.length > 0) {
        for (const imageData of imagesData) {
          const { index, buffer, originalName, rotate } = imageData;
          await this.customerService.uploadImageById(
            customerId,
            index,
            buffer,
            originalName,
            rotate
          );
        }
      }

      // Update customer information if provided
      if (address || identityCardName || identityCardIssuedDate || identityCardNumber) {
        const updateCustomerData: Record<string, unknown> = {};

        if (address) {
          updateCustomerData.address = address;
        }
        if (identityCardName) {
          updateCustomerData.identityCardName = identityCardName;
        }
        if (identityCardIssuedDate) {
          updateCustomerData.identityCardIssuedDate = identityCardIssuedDate;
        }
        if (identityCardNumber) {
          updateCustomerData.identityCardNumber = identityCardNumber;
        }

        await this.customerService.updateCustomer(customerId, updateCustomerData);
      }

      // Handle money images upload if provided (this will save the document with images)
      if (moneyImagesData && moneyImagesData.length > 0) {
        await this.moneyDeliveryService.uploadImagesMoneyDelivery(moneyDeliveryId, moneyImagesData);
      }

      // Prepare update data
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const returnDateString = `Đã trả tiền ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${hours}:${minutes}`;
      const existingNotes =
        typeof moneyDeliveryDoc.notes === 'string' ? moneyDeliveryDoc.notes : '';
      const updatedNotes = existingNotes
        ? `${returnDateString}, ${existingNotes}`
        : returnDateString;

      const updateMoneyDeliveryData: Record<string, unknown> = {
        status: MoneyDeliveryStatus.DONE,
        notes: updatedNotes,
        updatedAt: now,
        dateReturn: now,
      };

      // Add contentReturn if provided
      if (contentReturn !== undefined) {
        updateMoneyDeliveryData.contentReturn = contentReturn;
      }

      // Update the document using findByIdAndUpdate to avoid version conflict
      const updatedMoneyDelivery = await MoneyDelivery.findByIdAndUpdate(
        moneyDeliveryId,
        updateMoneyDeliveryData,
        { new: true, runValidators: true }
      );

      if (!updatedMoneyDelivery) {
        throw new Error(`Failed to update money delivery with ID ${moneyDeliveryId}`);
      }

      Logger.info('Return money delivery status updated with dual images successfully', {
        moneyDeliveryId: updateData.moneyDeliveryId,
        hasCustomerImages: imagesData && imagesData.length > 0,
        hasMoneyImages: moneyImagesData && moneyImagesData.length > 0,
        timestamp: now,
      });

      return updatedMoneyDelivery;
    } catch (error) {
      Logger.error('Failed to update return money delivery status with dual images', {
        error: error instanceof Error ? error.message : error,
        moneyDeliveryId: updateData?.moneyDeliveryId || 'unknown',
      });

      // Re-throw the original error with its message for better debugging
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('update status with customer images and money images failed');
    }
  }
}
