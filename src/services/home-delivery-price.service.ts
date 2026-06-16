import { Types } from 'mongoose';
import { HomeDeliveryPrice, IHomeDeliveryPrice } from '@/models/home-delivery-price.model';
import { Route } from '@/models/route.model';
import { UserService } from '@/services/user.service';
import {
  HomeDeliveryVehicleType,
  IHomeDeliveryCalculatorRequest,
  IHomeDeliveryCalculatorResponse,
  IHomeDeliveryPriceCreateRequest,
  IHomeDeliveryPriceUpdateRequest,
} from '@/types/home-delivery-price.type';
import Logger from '@/utils/logger';
import {
  HOME_DELIVERY_GOONG_CONFIG,
  HOME_DELIVERY_KM_PRICING,
  HOME_DELIVERY_OSRM_CONFIG,
} from '@/const/home-delivery.const';
interface IGoongGeocodeResponse {
  results?: Array<{
    formatted_address?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
  status?: string;
}
interface IOSRMRoute {
  distance: number;
  duration: number;
  geometry?: {
    coordinates: [number, number][];
  };
}

interface IOSRMResponse {
  routes: IOSRMRoute[];
}
export class HomeDeliveryPriceService {
  private userService: UserService;

  private readonly goongApiKey =
    process.env.GOONG_API_KEY || process.env.NUXT_PUBLIC_GOONG_API_KEY || '';

  constructor() {
    this.userService = new UserService();
  }

  normalizeAddress(address: string): string {
    return String(address || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private mapPrice(price: IHomeDeliveryPrice) {
    return {
      id: price._id.toString(),
      _id: price._id.toString(),
      routeId: price.routeId.toString(),
      address: price.address,
      normalizedAddress: price.normalizedAddress,
      motorbikePrice: price.motorbikePrice || 0,
      truck05Price: price.truck05Price || 0,
      truck12Price: price.truck12Price || 0,
      lat: price.lat ?? null,
      lon: price.lon ?? null,
      deleted: !!price.deleted,
      createdAt: price.createdAt,
      updatedAt: price.updatedAt,
    };
  }

  async getList(userId: string) {
    const routeId = await this.userService.getUserSelectedRouteId(userId);

    const prices = await HomeDeliveryPrice.find({
      routeId: new Types.ObjectId(routeId),
      deleted: false,
    })
      .sort({ address: 1 })
      .lean<IHomeDeliveryPrice[]>();

    return prices.map(price => this.mapPrice(price));
  }

  async getListByRouteId(routeId: string) {
    if (!Types.ObjectId.isValid(routeId)) {
      throw new Error('Trạm đến không hợp lệ');
    }

    const prices = await HomeDeliveryPrice.find({
      routeId: new Types.ObjectId(routeId),
      deleted: false,
    })
      .sort({ address: 1 })
      .lean<IHomeDeliveryPrice[]>();

    return prices.map(price => this.mapPrice(price));
  }

  async create(userId: string, payload: IHomeDeliveryPriceCreateRequest) {
    const routeId = await this.userService.getUserSelectedRouteId(userId);

    if (!payload.address?.trim()) {
      throw new Error('Vui lòng nhập địa chỉ');
    }

    const normalizedAddress = this.normalizeAddress(payload.address);

    try {
      const price = await HomeDeliveryPrice.create({
        routeId: new Types.ObjectId(routeId),
        address: payload.address.trim(),
        normalizedAddress,
        motorbikePrice: Number(payload.motorbikePrice || 0),
        truck05Price: Number(payload.truck05Price || 0),
        truck12Price: Number(payload.truck12Price || 0),
        lat: payload.lat ?? null,
        lon: payload.lon ?? null,
        createdBy: new Types.ObjectId(userId),
      });

      return this.mapPrice(price);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new Error('Địa chỉ này đã tồn tại trong bảng giá GTN');
      }

      Logger.error('Failed to create home delivery price', {
        userId,
        routeId,
        error: error instanceof Error ? error.message : error,
      });

      throw error;
    }
  }

  async update(userId: string, id: string, payload: IHomeDeliveryPriceUpdateRequest) {
    const routeId = await this.userService.getUserSelectedRouteId(userId);

    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Bảng giá GTN không hợp lệ');
    }

    if (!payload.address?.trim()) {
      throw new Error('Vui lòng nhập địa chỉ');
    }

    const normalizedAddress = this.normalizeAddress(payload.address);

    try {
      const updated = await HomeDeliveryPrice.findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          routeId: new Types.ObjectId(routeId),
          deleted: false,
        },
        {
          $set: {
            address: payload.address.trim(),
            normalizedAddress,
            motorbikePrice: Number(payload.motorbikePrice || 0),
            truck05Price: Number(payload.truck05Price || 0),
            truck12Price: Number(payload.truck12Price || 0),
            lat: payload.lat ?? null,
            lon: payload.lon ?? null,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updated) {
        throw new Error('Không tìm thấy bảng giá GTN');
      }

      return this.mapPrice(updated);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new Error('Địa chỉ này đã tồn tại trong bảng giá GTN');
      }

      throw error;
    }
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const routeId = await this.userService.getUserSelectedRouteId(userId);

    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Bảng giá GTN không hợp lệ');
    }

    const deleted = await HomeDeliveryPrice.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        routeId: new Types.ObjectId(routeId),
        deleted: false,
      },
      {
        $set: { deleted: true },
      },
      { new: true }
    );

    if (!deleted) {
      throw new Error('Không tìm thấy bảng giá GTN');
    }

    return true;
  }

  private getRouteAddress(route: any): string {
    const address = route.address || route.fullAddress;

    if (!address) {
      throw new Error('Trạm đến chưa có địa chỉ để tính bản đồ');
    }

    return address;
  }

  private getPriceByVehicle(price: any, vehicleType: HomeDeliveryVehicleType): number {
    if (!price) {
      return 0;
    }

    switch (vehicleType) {
      case 'MOTORBIKE':
        return Number(price.motorbikePrice || 0);
      case 'TRUCK_05':
        return Number(price.truck05Price || 0);
      case 'TRUCK_12':
        return Number(price.truck12Price || 0);
      default:
        return 0;
    }
  }

  private calculateByKm(distanceMeters: number, vehicleType: HomeDeliveryVehicleType): number {
    const km = distanceMeters / 1000;

    const pricing = HOME_DELIVERY_KM_PRICING[vehicleType];

    if (!pricing) {
      return 0;
    }

    if (km <= pricing.baseKm) {
      return pricing.basePrice;
    }

    return pricing.basePrice + Math.ceil(km - pricing.baseKm) * pricing.extraPricePerKm;
  }

  private buildGoongUrl(path: string, params: Record<string, string>): string {
    if (!this.goongApiKey) {
      throw new Error('Thiếu GOONG_API_KEY');
    }

    const query = new URLSearchParams({
      ...params,
      api_key: this.goongApiKey,
    });

    return `${HOME_DELIVERY_GOONG_CONFIG.baseUrl}${path}?${query.toString()}`;
  }

  private async geocodeAddress(address: string): Promise<{ lat: number; lon: number }> {
    const response = await fetch(
      this.buildGoongUrl('/Geocode', {
        address: address.trim(),
      })
    );

    if (!response.ok) {
      throw new Error('Không geocode được địa chỉ bằng Goong');
    }

    const data = (await response.json()) as IGoongGeocodeResponse;
    const first = data.results?.[0];
    const location = first?.geometry?.location;

    if (data.status !== 'OK' || !location?.lat || !location?.lng) {
      throw new Error(`Không tìm thấy tọa độ địa chỉ: ${address}`);
    }

    const lat = Number(location.lat);
    const lon = Number(location.lng);

    if (!this.isValidCoordinate(lat, lon)) {
      throw new Error(`Tọa độ địa chỉ không hợp lệ: ${address}`);
    }

    return { lat, lon };
  }

  async findBestMatchedPrice(routeId: string, address: string) {
    const normalizedInput = this.normalizeAddress(address);

    const prices = await HomeDeliveryPrice.find({
      routeId: new Types.ObjectId(routeId),
      deleted: false,
    }).lean();

    let bestMatch: any = null;
    let bestScore = 0;

    for (const price of prices) {
      const normalizedPriceAddress = price.normalizedAddress;

      let score = 0;

      if (normalizedInput.includes(normalizedPriceAddress)) {
        score = normalizedPriceAddress.length;
      } else if (normalizedPriceAddress.includes(normalizedInput)) {
        score = normalizedInput.length;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = price;
      }
    }

    return bestMatch;
  }

  private async getOpenSourceDistanceByPoints(
    originPoint: { lat: number; lon: number },
    destinationPoint: { lat: number; lon: number }
  ) {
    const coordinates =
      `${originPoint.lon},${originPoint.lat};` + `${destinationPoint.lon},${destinationPoint.lat}`;

    const query = new URLSearchParams({
      overview: 'full',
      geometries: 'geojson',
      alternatives: 'false',
      steps: 'false',
    });

    const response = await fetch(
      `http://router.project-osrm.org/route/v1/driving/${coordinates}?${query.toString()}`
    );

    if (!response.ok) {
      throw new Error('Không gọi được OSRM');
    }

    const data = (await response.json()) as IOSRMResponse;

    const route = data.routes?.[0];

    if (!route) {
      throw new Error('Không tính được quãng đường từ bản đồ open source');
    }

    const distanceMeters = Number(route.distance || 0);
    const durationSeconds = Number(route.duration || 0);

    return {
      distanceMeters,
      distanceText: `${(distanceMeters / 1000).toFixed(1)} km`,
      durationText: `${Math.ceil(durationSeconds / 60)} phút`,
      routeCoordinates: route.geometry?.coordinates || [],
    };
  }

  private isValidCoordinate(lat: unknown, lon: unknown): boolean {
    const nLat = Number(lat);
    const nLon = Number(lon);

    return (
      Number.isFinite(nLat) &&
      Number.isFinite(nLon) &&
      nLat >= -90 &&
      nLat <= 90 &&
      nLon >= -180 &&
      nLon <= 180 &&
      !(nLat === 0 && nLon === 0)
    );
  }

  private async resolveAndSaveRouteCoordinate(route: any): Promise<{ lat: number; lon: number }> {
    if (this.isValidCoordinate(route.lat, route.lon)) {
      return {
        lat: Number(route.lat),
        lon: Number(route.lon),
      };
    }

    const routeAddress = this.getRouteAddress(route);
    const point = await this.geocodeAddress(routeAddress);

    await Route.findByIdAndUpdate(route._id, {
      $set: {
        lat: point.lat,
        lon: point.lon,
      },
    });

    return point;
  }

  async calculate(
    payload: IHomeDeliveryCalculatorRequest
  ): Promise<IHomeDeliveryCalculatorResponse> {
    if (!Types.ObjectId.isValid(payload.toRouteId)) {
      throw new Error('Trạm đến không hợp lệ');
    }

    if (!payload.address?.trim()) {
      throw new Error('Vui lòng nhập địa chỉ GTN');
    }

    if (!['MOTORBIKE', 'TRUCK_05', 'TRUCK_12'].includes(payload.vehicleType)) {
      throw new Error('Loại xe không hợp lệ');
    }

    const route = await Route.findById(payload.toRouteId).lean();

    if (!route) {
      throw new Error('Không tìm thấy trạm đến');
    }

    const originAddress = this.getRouteAddress(route);

    const originPoint = await this.resolveAndSaveRouteCoordinate(route);
    const matchedPrice = await this.findBestMatchedPrice(payload.toRouteId, payload.address.trim());

    const hasPayloadCoordinates = this.isValidCoordinate(payload.lat, payload.lon);

    const hasMatchedPriceCoordinates =
      matchedPrice && this.isValidCoordinate(matchedPrice.lat, matchedPrice.lon);

    let destinationPoint: { lat: number; lon: number };

    if (hasPayloadCoordinates) {
      // Ưu tiên tọa độ FE gửi lên, không gọi GOONG Geocode nữa
      destinationPoint = {
        lat: Number(payload.lat),
        lon: Number(payload.lon),
      };
    } else if (hasMatchedPriceCoordinates) {
      // Nếu bảng giá có tọa độ thì dùng luôn, không gọi GOONG
      destinationPoint = {
        lat: Number(matchedPrice.lat),
        lon: Number(matchedPrice.lon),
      };
    } else {
      // Chỉ fallback GOONG khi không có tọa độ nào
      destinationPoint = await this.geocodeAddress(payload.address.trim());
    }

    const mapDistance = await this.getOpenSourceDistanceByPoints(originPoint, destinationPoint);
    const tablePrice = this.getPriceByVehicle(matchedPrice, payload.vehicleType);

    const fee =
      matchedPrice && tablePrice > 0
        ? tablePrice
        : this.calculateByKm(mapDistance.distanceMeters, payload.vehicleType);

    return {
      fromRouteId: route._id.toString(),
      fromRouteName: `${route.code || ''} - ${route.name || ''}`.trim(),
      originAddress,
      destinationAddress: payload.address.trim(),
      vehicleType: payload.vehicleType,
      distanceMeters: mapDistance.distanceMeters,
      distanceText: mapDistance.distanceText,
      durationText: mapDistance.durationText,
      matchedPriceId: matchedPrice?._id?.toString() || null,
      matchedPriceAddress: matchedPrice?.address || null,
      fee,
      priceSource: matchedPrice && tablePrice > 0 ? 'PRICE_TABLE' : 'DISTANCE_KM',
      originLat: originPoint.lat,
      originLon: originPoint.lon,
      destinationLat: destinationPoint.lat,
      destinationLon: destinationPoint.lon,
      routeCoordinates: mapDistance.routeCoordinates,
    };
  }
}
