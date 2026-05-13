import { ShipmentLog } from '../models/shipment-log.model';

export class ShipmentLogService {
  async searchOnVehicle(keyword: string) {
    const searchText = keyword.trim();

    console.log('ShipmentLog collection:', ShipmentLog.collection.name);
    console.log('Search keyword:', searchText);

    const logs = await ShipmentLog.find({
      $or: [{ fullCode: searchText }, { barcode: searchText }],
    })
      .sort({ actionTime: 1, createdAt: 1 })
      .lean();

    console.log('ShipmentLog result count:', logs.length);

    if (!logs.length) {
      throw new Error('Không tìm thấy mã hàng trên xe');
    }

    const histories = logs.map(log => {
      const action = log.type === 'load' ? 'Lên hàng' : 'Xuống hàng';

      return {
        action,
        tripCode: log.tripCode || '',
        actionTime: log.actionTime,
        driverName: log.driverName || '',
        driverPhone: log.driverPhone || '',
        licensePlate: log.licensePlate || '',
        scanCount: log.scanCount || 1,
        detail: `[${this.formatDateTimeVN(log.actionTime)}]`,
        syncTime: log.syncTime,
        location: log.location || '',
      };
    });

    const lastLog = logs[logs.length - 1];

    return {
      fullCode: logs[0].fullCode,
      barcode: logs[0].barcode,
      statusText: lastLog.type === 'unload' ? 'Đã đến nơi' : 'Đang trên xe',
      summaryText: histories
        .map(
          item =>
            `${item.location}, đã ${item.action} lúc ${this.formatDateTimeVN(
              item.actionTime
            )}, TX: ${item.driverName}, SĐT: ${item.driverPhone}, Xe: ${item.licensePlate}`
        )
        .join('\n'),
      histories,
    };
  }

  private formatDateTimeVN(value?: Date | string): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);

    return date.toLocaleString('vi-VN', {
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  }
}
