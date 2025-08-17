export interface IDraftDeliveryInput {
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  fromRouteId: string;
  toRouteId: string;
  name: string;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  notes?: string;
  paymentType?: 'debt' | 'free' | null;
}

export interface IDraftDeliveryResponse {
  id: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  fromRoute: {
    id: string;
    code: string;
    name: string;
  };
  toRoute: {
    id: string;
    code: string;
    name: string;
  };
  name: string;
  cost: number;
  homeDelivery?: string;
  homeDeliveryCost: number;
  itemValue: number;
  itemCost: number;
  collectCost: number;
  collectForCustomer: number;
  collectForCustomerCost: number;
  collectForCustomerNote?: string;
  notes?: string;
  totalCost: number;
  paymentType?: 'debt' | 'free' | null;
  createdByUser: {
    id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}
