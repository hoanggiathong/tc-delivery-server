// Import mock from utils
import { mockDeliveryService } from '../utils/mock-services';

// Export class for Jest mock
export class DeliveryService {
  createDelivery = mockDeliveryService.createDelivery;
  updateDelivery = mockDeliveryService.updateDelivery;
  getDeliveryById = mockDeliveryService.getDeliveryById;
  getAllDeliveries = mockDeliveryService.getAllDeliveries;
  deleteDelivery = mockDeliveryService.deleteDelivery;
  getRelatedDeliveriesBySender = mockDeliveryService.getRelatedDeliveriesBySender;
  getNextCode = mockDeliveryService.getNextCode;
  getDeliveryByCode = mockDeliveryService.getDeliveryByCode;
}

// Export default for compatibility
export default DeliveryService;