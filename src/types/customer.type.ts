import { BaseEntity } from ".";

// Customer response interface
export interface ICustomerResponse extends BaseEntity {
  name: string;
  phone: string;
}

// Customer creation request interface
export interface ICustomerCreateRequest {
  name: string;
  phone: string;
}

// Customer update request interface
export interface ICustomerUpdateRequest {
  name?: string;
  phone?: string;
}

// Lean type for MongoDB customer documents (when using .lean())
export interface ICustomerLean {
  _id: string;
  name: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}
