import { IDeliveryResponse } from '@/types/delivery.type';
import { IMoneyDeliveryResponse } from '@/types/money-delivery.type';
import { IRouteResponse } from '@/types/route.type';
import {
  IAccountingReportRequest,
  IAccountingReportResponse,
  IAccountingRouteData,
  IReportReturnMoneyDeliveryAndReturnDeliveryRequest,
  IReportReturnMoneyDeliveryAndReturnDeliveryResponse,
} from '@/types/report.type';
import { DeliveryService } from './delivery.service';
import { MoneyDeliveryService } from './money-delivery.service';
import { MoneyDeliveryType, TransferType } from '@/models/money-delivery.model';
import { PAYMENT_TYPE } from '@/const/money-deliveries.const';

export class ReportService {
  private moneyDeliveryService: MoneyDeliveryService;
  private deliveryService: DeliveryService;
  constructor() {
    this.moneyDeliveryService = new MoneyDeliveryService();
    this.deliveryService = new DeliveryService();
  }

  // report for return money delivery and return delivery
  async getReportReturnMoneyDeliveryAndReturnDelivery(
    query: IReportReturnMoneyDeliveryAndReturnDeliveryRequest,
    userId: string
  ): Promise<IReportReturnMoneyDeliveryAndReturnDeliveryResponse> {
    const { startDate, endDate, routeId } = query;

    const startDateObj = new Date(startDate);
    const start = new Date(
      startDateObj.getFullYear(),
      startDateObj.getMonth(),
      startDateObj.getDate(),
      0,
      0,
      0,
      0
    );

    const endDateObj = new Date(endDate);
    const end = new Date(
      endDateObj.getFullYear(),
      endDateObj.getMonth(),
      endDateObj.getDate(),
      23,
      59,
      59,
      999
    );

    try {
      let moneyDeliveriesTypeNormal: IMoneyDeliveryResponse[] = [];
      let moneyDeliveriesTypeCollect: IMoneyDeliveryResponse[] = [];
      let returnDeliveries: IDeliveryResponse[] = [];
      if (routeId) {
        moneyDeliveriesTypeNormal =
          await this.moneyDeliveryService.getListMoneyDeliveryByTypeNormal(
            userId,
            start,
            end,
            routeId
          );

        moneyDeliveriesTypeCollect =
          await this.moneyDeliveryService.getListMoneyDeliveryByTypeCollect(
            userId,
            start,
            end,
            routeId
          );

        returnDeliveries = await this.deliveryService.getListReturnDeliveriesByToRouteId(
          userId,
          start,
          end,
          routeId
        );
      } else {
        moneyDeliveriesTypeNormal =
          await this.moneyDeliveryService.getListMoneyDeliveryByTypeNormal(userId, start, end);

        moneyDeliveriesTypeCollect =
          await this.moneyDeliveryService.getListMoneyDeliveryByTypeCollect(userId, start, end);

        returnDeliveries = await this.deliveryService.getListReturnDeliveriesByToRouteId(
          userId,
          start,
          end
        );
      }

      let totalSendMoneyAmountTypeNormalMoneyDelivery: number = 0;
      let totalSendMoneyAmountTypeCollectMoneyDelivery: number = 0;
      let totalCostWithPaymentTypeDebtDelivery: number = 0;
      let totalSendCostWithTypeNormalMoneyDelivery: number = 0;
      let totalSendCostWithTypeCollectMoneyDelivery: number = 0;
      let totalCostDelivery: number = 0;
      let homeDeliveryCostWithPaymentTypePaidDelivery: number = 0;
      let totalCollectForCustomerCostWithPaymentTypePaidDelivery: number = 0;
      let totalCollectForCustomerCostWithPaymentTypeDebtDelivery: number = 0;
      let totalCostWithPaymentTypePaidInTodayOfReturnDelivery: number = 0;

      const moneyDeliveryList = [...moneyDeliveriesTypeNormal, ...moneyDeliveriesTypeCollect];

      for (const moneyDelivery of moneyDeliveryList) {
        // Thu dùm -> cộng thêm vào tiền thường
        if (moneyDelivery.type === MoneyDeliveryType.COLLECT_FOR_CUSTOMER) {
          totalSendMoneyAmountTypeNormalMoneyDelivery += moneyDelivery.sendMoneyAmount || 0;
          totalSendCostWithTypeNormalMoneyDelivery += moneyDelivery.sendCost || 0;
        }

        if (moneyDelivery.type === MoneyDeliveryType.NORMAL) {
          totalSendMoneyAmountTypeNormalMoneyDelivery += moneyDelivery.sendMoneyAmount || 0;
          totalSendCostWithTypeNormalMoneyDelivery += moneyDelivery.sendCost || 0;
        } else {
          // Thu hộ giữ nguyên
          totalSendMoneyAmountTypeCollectMoneyDelivery += moneyDelivery.sendMoneyAmount || 0;
          totalSendCostWithTypeCollectMoneyDelivery += moneyDelivery.sendCost || 0;
        }
      }

      for (const delivery of returnDeliveries) {
        totalCostDelivery += (delivery.cost || 0) + (delivery.itemCost || 0);
        if (delivery.paymentType === PAYMENT_TYPE.PAID) {
          homeDeliveryCostWithPaymentTypePaidDelivery += delivery.homeDeliveryCost || 0;
          totalCollectForCustomerCostWithPaymentTypePaidDelivery +=
            delivery.collectForCustomerCost || 0;
        } else {
          totalCostWithPaymentTypeDebtDelivery += (delivery.cost || 0) + (delivery.itemCost || 0);
        }
      }

      const totalCostWithPaymentTypePaidDelivery: number =
        totalCostDelivery - totalCostWithPaymentTypeDebtDelivery;

      const totalCostPaid: number = totalCostWithPaymentTypePaidDelivery;

      const totalCostNotHomeDeliveryCostAndCollectForCustomerCost: number =
        totalCostDelivery +
        totalSendCostWithTypeCollectMoneyDelivery +
        totalSendCostWithTypeNormalMoneyDelivery;

      const getListReturnDeliveriesIsReturnTrueOfToRouteForCalculateCollectForCustomerCost =
        await this.deliveryService.getListReturnDeliveriesIsReturnTrueOfToRouteForCalculateCollectForCustomerCost(
          userId,
          start,
          end,
          routeId
        );

      getListReturnDeliveriesIsReturnTrueOfToRouteForCalculateCollectForCustomerCost.map(item => {
        totalCollectForCustomerCostWithPaymentTypeDebtDelivery += item.collectForCustomerCost || 0;
        totalCostWithPaymentTypePaidInTodayOfReturnDelivery +=
          (item.cost || 0) + (item.itemCost || 0);
      });

      const sum = {
        totalSendMoneyAmountTypeNormalMoneyDelivery: totalSendMoneyAmountTypeNormalMoneyDelivery,
        totalSendMoneyAmountTypeCollectMoneyDelivery: totalSendMoneyAmountTypeCollectMoneyDelivery,
        totalCostWithPaymentTypeDebtDelivery: totalCostWithPaymentTypeDebtDelivery,
        totalSendCostWithTypeNormalMoneyDelivery: totalSendCostWithTypeNormalMoneyDelivery,
        totalSendCostWithTypeCollectMoneyDelivery: totalSendCostWithTypeCollectMoneyDelivery,
        totalCostDelivery: totalCostDelivery,
        homeDeliveryCostWithPaymentTypePaidDelivery: homeDeliveryCostWithPaymentTypePaidDelivery,
        totalCollectForCustomerCostWithPaymentTypePaidDelivery:
          totalCollectForCustomerCostWithPaymentTypePaidDelivery,
        totalCostPaid: totalCostPaid,
        totalCostNotHomeDeliveryCostAndCollectForCustomerCost:
          totalCostNotHomeDeliveryCostAndCollectForCustomerCost,
        totalCollectForCustomerCostWithPaymentTypeDebtDelivery:
          totalCollectForCustomerCostWithPaymentTypeDebtDelivery,
        totalCostWithPaymentTypePaidInTodayOfReturnDelivery:
          totalCostWithPaymentTypePaidInTodayOfReturnDelivery,
      };

      const data: IReportReturnMoneyDeliveryAndReturnDeliveryResponse = {
        deliveries: returnDeliveries,
        moneyDeliveriesTypeNormal: moneyDeliveriesTypeNormal,
        moneyDeliveriesTypeCollect: moneyDeliveriesTypeCollect,
        sum: sum,
      };

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get report return money delivery and return delivery');
    }
  }

  // accounting report (no routeId filter) - grouped by route
  async getAccountingReport(
    query: IAccountingReportRequest,
    userId: string
  ): Promise<IAccountingReportResponse> {
    const { startDate, endDate } = query;

    const startDateObj = new Date(startDate);
    const start = new Date(
      startDateObj.getFullYear(),
      startDateObj.getMonth(),
      startDateObj.getDate(),
      0,
      0,
      0,
      0
    );

    const endDateObj = new Date(endDate);
    const end = new Date(
      endDateObj.getFullYear(),
      endDateObj.getMonth(),
      endDateObj.getDate(),
      23,
      59,
      59,
      999
    );

    try {
      const moneyDeliveriesTypeNormal: IMoneyDeliveryResponse[] =
        await this.moneyDeliveryService.getListMoneyDeliveryByTypeNormal(userId, start, end);

      const moneyDeliveriesTypeCollect: IMoneyDeliveryResponse[] =
        await this.moneyDeliveryService.getListMoneyDeliveryByTypeCollect(userId, start, end);

      const returnDeliveries: IDeliveryResponse[] =
        await this.deliveryService.getListReturnDeliveriesByToRouteId(userId, start, end);

      // Consolidate all data into a single Map per route (1 trạm = 1 record)
      const routeDataMap = new Map<
        string,
        {
          route: IRouteResponse;
          deliveries: IDeliveryResponse[];
          moneyNormal: IMoneyDeliveryResponse[];
          moneyCollect: IMoneyDeliveryResponse[];
        }
      >();

      const getOrCreateRouteData = (routeId: string, route: IRouteResponse) => {
        let data = routeDataMap.get(routeId);
        if (!data) {
          data = { route, deliveries: [], moneyNormal: [], moneyCollect: [] };
          routeDataMap.set(routeId, data);
        }
        return data;
      };

      // Group deliveries by toRoute
      for (const delivery of returnDeliveries) {
        const routeData = getOrCreateRouteData(delivery.toRoute.id.toString(), delivery.toRoute);
        routeData.deliveries.push(delivery);
      }

      // Group money deliveries normal by toRoute
      for (const md of moneyDeliveriesTypeNormal) {
        const routeData = getOrCreateRouteData(md.toRoute.id.toString(), md.toRoute);
        routeData.moneyNormal.push(md);
      }

      // Group money deliveries collect by fromRoute (user's route is toRoute for collect)
      for (const md of moneyDeliveriesTypeCollect) {
        const routeData = getOrCreateRouteData(md.fromRoute.id.toString(), md.fromRoute);
        routeData.moneyCollect.push(md);
      }

      // Build per-route data (1 trạm chỉ có 1 record, giá trị cộng dồn)
      const routes: IAccountingRouteData[] = [];
      for (const [
        _routeId,
        { route: routeInfo, deliveries, moneyNormal, moneyCollect },
      ] of routeDataMap) {
        const debtDeliveries = deliveries.filter(d => d.paymentType === PAYMENT_TYPE.DEBT);

        // Split deliveries by GTN (giao tận nơi) vs non-GTN
        const nonHomeDeliveries = deliveries.filter(
          d => !d.homeDeliveryCost || d.homeDeliveryCost === 0
        );
        const homeDeliveredDeliveries = deliveries.filter(
          d => d.homeDeliveryCost && d.homeDeliveryCost > 0
        );

        const moneyNormalRegular = moneyNormal.filter(
          md => md.transferType === TransferType.REGULAR
        );
        const moneyNormalExpress = moneyNormal.filter(
          md => md.transferType === TransferType.EXPRESS
        );

        // Row 1: HÀNG CHUYỂN THƯỜNG (chỉ đơn không giao tận nơi, bao gồm nợ cước + đã thu)
        const normalDelivery = {
          transferMoney: 0,
          shippingFee: nonHomeDeliveries.reduce(
            (sum, d) => sum + (d.cost || 0) + (d.itemCost || 0),
            0
          ),
          surcharge: nonHomeDeliveries.reduce((sum, d) => sum + (d.collectForCustomerCost || 0), 0),
        };

        // Row 2: HÀNG GIAO TẬN NƠI (cước gửi hàng + phí trị giá của đơn GTN, bao gồm nc + đã thu)
        const homeDeliveryCostTotal = deliveries.reduce(
          (sum, d) => sum + (d.homeDeliveryCost || 0),
          0
        );
        const homeDelivery = {
          transferMoney: 0,
          shippingFee: homeDeliveredDeliveries.reduce(
            (sum, d) => sum + (d.cost || 0) + (d.itemCost || 0),
            0
          ),
          surcharge: homeDeliveredDeliveries.reduce(
            (sum, d) => sum + (d.collectForCustomerCost || 0),
            0
          ),
          homeDeliveryCostTotal,
        };

        // Row 3: TIỀN CHUYỂN THƯỜNG (only transferType = regular)
        const normalMoneyTransfer = {
          transferMoney: moneyNormalRegular.reduce((sum, md) => sum + (md.sendMoneyAmount || 0), 0),
          shippingFee: moneyNormalRegular.reduce((sum, md) => sum + (md.sendCost || 0), 0),
          surcharge: 0,
        };

        // Row 4: TIỀN CHUYỂN NHANH (only transferType = express)
        const expressMoneyTransfer = {
          transferMoney: moneyNormalExpress.reduce((sum, md) => sum + (md.sendMoneyAmount || 0), 0),
          shippingFee: moneyNormalExpress.reduce((sum, md) => sum + (md.sendCost || 0), 0),
          surcharge: 0,
        };

        // Row 5: TIỀN THU HỘ GIỮ
        const collectHoldMoney = {
          transferMoney: moneyCollect.reduce((sum, md) => sum + (md.sendMoneyAmount || 0), 0),
          shippingFee: moneyCollect.reduce((sum, md) => sum + (md.sendCost || 0), 0),
          surcharge: 0,
        };

        // Row 6: NỢ CƯỚC
        const debtCost = {
          transferMoney: 0,
          shippingFee: debtDeliveries.reduce(
            (sum, d) => sum + (d.cost || 0) + (d.itemCost || 0),
            0
          ),
          surcharge: debtDeliveries.reduce((sum, d) => sum + (d.collectForCustomerCost || 0), 0),
        };

        // Row 7: TỔNG CỘNG TIỀN THỰC THU
        const totalActualCollected = {
          // Chuyển tiền = Tiền chuyển thường + Tiền chuyển nhanh + Tiền thu hộ giữ
          transferMoney:
            normalMoneyTransfer.transferMoney +
            expressMoneyTransfer.transferMoney +
            collectHoldMoney.transferMoney,
          // Cước phí = Hàng chuyển thường - Nợ cước + Hàng giao tận nơi + Tiền chuyển thường + Tiền chuyển nhanh + Tiền thu hộ giữ
          shippingFee:
            normalDelivery.shippingFee -
            debtCost.shippingFee +
            homeDelivery.shippingFee +
            normalMoneyTransfer.shippingFee +
            expressMoneyTransfer.shippingFee +
            collectHoldMoney.shippingFee,
          // Phụ phí = Phụ phí Hàng chuyển thường + Phụ phí Hàng giao tận nơi - Phụ phí Nợ cước
          surcharge: normalDelivery.surcharge + homeDelivery.surcharge - debtCost.surcharge,
        };

        routes.push({
          routeId: routeInfo.id,
          routeCode: routeInfo.code,
          routeName: routeInfo.name,
          normalDelivery,
          homeDelivery,
          normalMoneyTransfer,
          expressMoneyTransfer,
          collectHoldMoney,
          debtCost,
          totalActualCollected,
        });
      }

      // Calculate grand totals

      // Tổng tiền gửi các trạm = tiền gửi thường + tiền gửi nhanh (KHÔNG bao gồm thu hộ giữ)
      const totalSendMoneyToStations = routes.reduce(
        (sum, route) =>
          sum + route.normalMoneyTransfer.transferMoney + route.expressMoneyTransfer.transferMoney,
        0
      );

      // Tổng tiền thu hộ giữ
      const totalCollectHoldMoney = moneyDeliveriesTypeCollect.reduce(
        (sum, md) => sum + (md.sendMoneyAmount || 0),
        0
      );

      // Tổng cước gửi nợ cước = sum(debtCost.shippingFee) tất cả tuyến
      const totalShippingCostDebt = routes.reduce(
        (sum, route) => sum + route.debtCost.shippingFee,
        0
      );

      // Tổng tiền gtn nợ cước: Total cước gtn nợ cước hàng đi của tất cả các Tuyến
      const totalHomeDeliveryCostDebt = returnDeliveries
        .filter(d => d.paymentType === PAYMENT_TYPE.DEBT)
        .reduce((sum, d) => sum + (d.homeDeliveryCost || 0), 0);

      // Lọc đơn đã thu
      const paidDeliveries = returnDeliveries.filter(d => d.paymentType === PAYMENT_TYPE.PAID);

      // Tổng thực thu: tổng cước gửi hàng đi đã thu
      const totalActualRevenue = paidDeliveries.reduce(
        (sum, d) => sum + (d.cost || 0) + (d.itemCost || 0),
        0
      );

      // Tổng cước gtn đi = Tổng cước GTN đi của tất cả các Tuyến (đã thu)
      const totalPaidOutgoingHomeDeliveryCost = paidDeliveries.reduce(
        (sum, d) => sum + (d.homeDeliveryCost || 0),
        0
      );

      // Tổng phụ phí đi = Tổng Phụ Phí đi của tất cả các tuyến (đã thu)
      const totalPaidOutgoingSurcharge = paidDeliveries.reduce(
        (sum, d) => sum + (d.collectForCustomerCost || 0),
        0
      );

      // Tổng cước tiền gửi các trạm = tiền gửi thường + tiền gửi nhanh (KHÔNG bao gồm thu hộ giữ)
      const totalSendCostToStations = routes.reduce(
        (sum, route) =>
          sum + route.normalMoneyTransfer.shippingFee + route.expressMoneyTransfer.shippingFee,
        0
      );

      // Tiền trong tủ = Tổng tiền gửi các trạm + Tổng tiền thu hộ giữ + Tổng thực thu
      const cashInSafe =
        totalSendMoneyToStations +
        totalCollectHoldMoney +
        totalActualRevenue +
        totalPaidOutgoingHomeDeliveryCost +
        totalPaidOutgoingSurcharge +
        totalSendCostToStations;

      // Tổng cước gtn đi = Tổng cước GTN đi của tất cả các Tuyến (đã thu + nc)
      const totalOutgoingHomeDeliveryCost = returnDeliveries.reduce(
        (sum, d) => sum + (d.homeDeliveryCost || 0),
        0
      );

      // Tổng phụ phí đi = Tổng Phụ Phí đi của tất cả các tuyến (đã thu + nc)
      const totalOutgoingSurcharge = returnDeliveries.reduce(
        (sum, d) => sum + (d.collectForCustomerCost || 0),
        0
      );

      // Tổng cước gửi tiền tất cả trạm (chuyển thường + chuyển nhanh)
      const totalMoneyTransferCost = routes.reduce(
        (sum, route) =>
          sum + route.normalMoneyTransfer.shippingFee + route.expressMoneyTransfer.shippingFee,
        0
      );

      // Tổng cước phí thu hộ giữ tất cả trạm
      const totalCollectHoldMoneyCost = routes.reduce(
        (sum, route) => sum + route.collectHoldMoney.shippingFee,
        0
      );

      // Doanh thu (có GTN đi + Phụ phí đi) = (Tổng thực thu + Tổng cước gửi nc) + Tổng cước phí gửi tiền + Tổng cước phí thu hộ giữ + Tổng phụ phí đi + Tổng cước gtn đi
      const revenue =
        totalActualRevenue +
        totalShippingCostDebt +
        totalMoneyTransferCost +
        totalCollectHoldMoneyCost +
        totalOutgoingSurcharge +
        totalOutgoingHomeDeliveryCost;

      // Tổng doanh thu nộp quỹ (BCTC) = Doanh thu - Tổng cước GTN đi - Tổng phụ phí đi
      const totalRevenueFundSubmission =
        revenue - totalOutgoingHomeDeliveryCost - totalOutgoingSurcharge;

      const data: IAccountingReportResponse = {
        routes,
        total: {
          totalSendMoneyToStations,
          totalCollectHoldMoney,
          totalShippingCostDebt,
          totalHomeDeliveryCostDebt,
          totalActualRevenue,
          cashInSafe,
          revenue,
          totalOutgoingHomeDeliveryCost,
          totalOutgoingSurcharge,
          totalRevenueFundSubmission,
        },
      };

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get accounting report');
    }
  }
}
