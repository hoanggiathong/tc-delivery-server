export type MobileDeliveryStatus = 'RECEIVED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED';

export interface MobileDeliveryStatusResult {
  status: MobileDeliveryStatus;
  statusText: 'Đã tiếp nhận' | 'Đã xuất bến' | 'Đến trạm giao hàng' | 'Đã giao hàng';
  destinationReceivedQuantity: number;
  requiredQuantity: number;
}

interface DeliveryStatusInput {
  isReturn?: boolean | null;
  quantity?: number | string | null;
  upItems?: unknown;
  downItems?: unknown;
  toRoute?: { code?: string | null } | null;
}

const STATUS_TEXT: Record<MobileDeliveryStatus, MobileDeliveryStatusResult['statusText']> = {
  RECEIVED: 'Đã tiếp nhận',
  IN_TRANSIT: 'Đã xuất bến',
  ARRIVED: 'Đến trạm giao hàng',
  DELIVERED: 'Đã giao hàng',
};

const normalizeRouteCode = (value: unknown): string =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const hasData = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return Boolean(value);
};

const flattenScanItems = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(flattenScanItems);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n;]+/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    const code = item.code ?? item.fullCode ?? item.scanCode ?? item.value ?? item.name;
    const quantity = item.quantity ?? item.qty ?? item.count ?? item.quantityReturn;

    if (code) {
      const normalizedQuantity = Number(quantity);
      return [
        Number.isFinite(normalizedQuantity)
          ? `${String(code)}[${normalizedQuantity}]`
          : String(code),
      ];
    }
  }

  return [];
};

const parseScanItem = (rawItem: string): { scanCode: string; quantity: number } | null => {
  const value = String(rawItem || '')
    .trim()
    .toUpperCase();
  if (!value) {
    return null;
  }

  const match = value.match(/^([A-Z0-9_-]+)\s*\[\s*(\d+(?:\.\d+)?)\s*\]$/);

  if (!match) {
    return null;
  }

  const quantity = Number(match[2]);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  return {
    scanCode: normalizeRouteCode(match[1]),
    quantity,
  };
};

export const getDestinationReceivedQuantity = (
  downItems: unknown,
  destinationRouteCode: unknown
): number => {
  const routeCode = normalizeRouteCode(destinationRouteCode);
  if (!routeCode) {
    return 0;
  }

  return flattenScanItems(downItems).reduce((total, rawItem) => {
    const parsed = parseScanItem(rawItem);
    if (!parsed) {
      return total;
    }
    if (!parsed.scanCode.startsWith(routeCode)) {
      return total;
    }
    return total + parsed.quantity;
  }, 0);
};

export const resolveMobileDeliveryStatus = (
  delivery: DeliveryStatusInput
): MobileDeliveryStatusResult => {
  const requiredQuantity = Math.max(Number(delivery.quantity || 0), 0);

  const destinationReceivedQuantity = getDestinationReceivedQuantity(
    delivery.downItems,
    delivery.toRoute?.code
  );

  let status: MobileDeliveryStatus;

  if (delivery.isReturn === true) {
    status = 'DELIVERED';
  } else if (requiredQuantity > 0 && destinationReceivedQuantity >= requiredQuantity) {
    status = 'ARRIVED';
  } else if (hasData(delivery.upItems)) {
    status = 'IN_TRANSIT';
  } else {
    status = 'RECEIVED';
  }

  return {
    status,
    statusText: STATUS_TEXT[status],
    destinationReceivedQuantity,
    requiredQuantity,
  };
};

export const attachMobileDeliveryStatus = <T extends DeliveryStatusInput>(
  delivery: T
): T & MobileDeliveryStatusResult => ({
  ...delivery,
  ...resolveMobileDeliveryStatus(delivery),
});

export const attachMobileDeliveryStatuses = <T extends DeliveryStatusInput>(
  deliveries: T[]
): Array<T & MobileDeliveryStatusResult> => deliveries.map(attachMobileDeliveryStatus);
