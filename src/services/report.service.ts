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
import { MoneyDeliveryType } from '@/models/money-delivery.model';
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
        if (moneyDelivery.type === MoneyDeliveryType.NORMAL) {
          totalSendMoneyAmountTypeNormalMoneyDelivery += moneyDelivery.sendMoneyAmount || 0;
          totalSendCostWithTypeNormalMoneyDelivery += moneyDelivery.sendCost || 0;
        } else {
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

      // Group deliveries by toRoute
      const deliveriesByRoute = new Map<
        string,
        { route: IRouteResponse; deliveries: IDeliveryResponse[] }
      >();
      for (const delivery of returnDeliveries) {
        const routeId = delivery.toRoute.id;
        const existing = deliveriesByRoute.get(routeId);
        if (existing) {
          existing.deliveries.push(delivery);
        } else {
          deliveriesByRoute.set(routeId, { route: delivery.toRoute, deliveries: [delivery] });
        }
      }

      // Group money deliveries normal by toRoute
      const moneyNormalByRoute = new Map<string, IMoneyDeliveryResponse[]>();
      for (const md of moneyDeliveriesTypeNormal) {
        const routeId = md.toRoute.id;
        const existing = moneyNormalByRoute.get(routeId);
        if (existing) {
          existing.push(md);
        } else {
          moneyNormalByRoute.set(routeId, [md]);
        }
      }

      // Group money deliveries collect by fromRoute (user's route is toRoute for collect)
      const moneyCollectByRoute = new Map<string, IMoneyDeliveryResponse[]>();
      for (const md of moneyDeliveriesTypeCollect) {
        const routeId = md.fromRoute.id;
        const existing = moneyCollectByRoute.get(routeId);
        if (existing) {
          existing.push(md);
        } else {
          moneyCollectByRoute.set(routeId, [md]);
        }
      }

      // Collect all unique route IDs and route info
      const routeInfoMap = new Map<string, IRouteResponse>();
      for (const [routeId, data] of deliveriesByRoute) {
        routeInfoMap.set(routeId, data.route);
      }
      for (const md of moneyDeliveriesTypeNormal) {
        if (!routeInfoMap.has(md.toRoute.id)) {
          routeInfoMap.set(md.toRoute.id, md.toRoute);
        }
      }
      for (const md of moneyDeliveriesTypeCollect) {
        if (!routeInfoMap.has(md.fromRoute.id)) {
          routeInfoMap.set(md.fromRoute.id, md.fromRoute);
        }
      }

      // Build per-route data
      const routes: IAccountingRouteData[] = [];
      for (const [routeId, routeInfo] of routeInfoMap) {
        const deliveries = deliveriesByRoute.get(routeId)?.deliveries || [];
        const moneyNormal = moneyNormalByRoute.get(routeId) || [];
        const moneyCollect = moneyCollectByRoute.get(routeId) || [];
        const debtDeliveries = deliveries.filter(d => d.paymentType === PAYMENT_TYPE.DEBT);
        const paidDeliveries = deliveries.filter(d => d.paymentType === PAYMENT_TYPE.PAID);

        // Row 1: HÀNG CHUYỂN THƯỜNG
        const normalDelivery = {
          transferMoney: 0,
          shippingFee: deliveries.reduce((sum, d) => sum + (d.cost || 0) + (d.itemCost || 0), 0),
          surcharge: deliveries.reduce((sum, d) => sum + (d.collectForCustomerCost || 0), 0),
        };

        // Row 2: HÀNG GIAO TẬN NƠI
        const homeDeliveryCostTotal = deliveries.reduce(
          (sum, d) => sum + (d.homeDeliveryCost || 0),
          0
        );
        const homeDelivery = {
          transferMoney: 0,
          shippingFee: paidDeliveries.reduce((sum, d) => sum + (d.homeDeliveryCost || 0), 0),
          surcharge: 0,
          homeDeliveryCostTotal,
        };

        // Row 3: TIỀN CHUYỂN THƯỜNG
        const normalMoneyTransfer = {
          transferMoney: moneyNormal.reduce((sum, md) => sum + (md.sendMoneyAmount || 0), 0),
          shippingFee: moneyNormal.reduce((sum, md) => sum + (md.sendCost || 0), 0),
          surcharge: 0,
        };

        // Row 4: TIỀN CHUYỂN NHANH
        const expressMoneyTransfer = {
          transferMoney: 0,
          shippingFee: 0,
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

        // Row 7: TỔNG CỘNG TIỀN THỰC THU = sum of rows 1-5 minus row 6
        const totalActualCollected = {
          transferMoney:
            normalDelivery.transferMoney +
            homeDelivery.transferMoney +
            normalMoneyTransfer.transferMoney +
            expressMoneyTransfer.transferMoney +
            collectHoldMoney.transferMoney -
            debtCost.transferMoney,
          shippingFee:
            normalDelivery.shippingFee +
            homeDelivery.shippingFee +
            normalMoneyTransfer.shippingFee +
            expressMoneyTransfer.shippingFee +
            collectHoldMoney.shippingFee -
            debtCost.shippingFee,
          surcharge:
            normalDelivery.surcharge +
            homeDelivery.surcharge +
            normalMoneyTransfer.surcharge +
            expressMoneyTransfer.surcharge +
            collectHoldMoney.surcharge -
            debtCost.surcharge,
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
      const totalSendMoneyToStations = routes.reduce(
        (sum, route) => sum + route.totalActualCollected.transferMoney,
        0
      );
      const totalCollectHoldMoney = moneyDeliveriesTypeCollect.reduce(
        (sum, md) => sum + (md.sendMoneyAmount || 0),
        0
      );
      const totalCostDelivery = returnDeliveries.reduce(
        (sum, d) => sum + (d.cost || 0) + (d.itemCost || 0),
        0
      );
      const totalCostDebtDelivery = returnDeliveries
        .filter(d => d.paymentType === PAYMENT_TYPE.DEBT)
        .reduce((sum, d) => sum + (d.cost || 0) + (d.itemCost || 0), 0);
      const totalSendCostNormal = moneyDeliveriesTypeNormal.reduce(
        (sum, md) => sum + (md.sendCost || 0),
        0
      );
      const totalSendCostCollect = moneyDeliveriesTypeCollect.reduce(
        (sum, md) => sum + (md.sendCost || 0),
        0
      );
      const homeDeliveryCostPaid = returnDeliveries
        .filter(d => d.paymentType === PAYMENT_TYPE.PAID)
        .reduce((sum, d) => sum + (d.homeDeliveryCost || 0), 0);
      const collectForCustomerCostPaid = returnDeliveries
        .filter(d => d.paymentType === PAYMENT_TYPE.PAID)
        .reduce((sum, d) => sum + (d.collectForCustomerCost || 0), 0);

      const totalShippingCostNC = totalCostDelivery;
      const totalHomeDeliveryCostNC = 0;
      const totalActualRevenue = totalCostDelivery - totalCostDebtDelivery;
      const cashInSafe = totalSendMoneyToStations + totalCollectHoldMoney + totalActualRevenue;
      const totalOutgoingHomeDeliveryCost = homeDeliveryCostPaid;
      const totalOutgoingSurcharge = collectForCustomerCostPaid;
      const revenue =
        totalActualRevenue +
        totalSendCostNormal +
        totalSendCostCollect +
        totalOutgoingHomeDeliveryCost +
        totalOutgoingSurcharge;
      const totalRevenueFundSubmission =
        revenue - totalOutgoingHomeDeliveryCost - totalOutgoingSurcharge;

      const data: IAccountingReportResponse = {
        routes,
        total: {
          totalSendMoneyToStations,
          totalCollectHoldMoney,
          totalShippingCostNC,
          totalHomeDeliveryCostNC,
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
