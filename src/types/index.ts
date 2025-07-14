import { Request } from 'express';
import { UserRole } from './user.type';

// Export user-related types and utilities from user.type.ts
export * from './user.type';

// Export customer-related types
export * from './customer.type';

// Export delivery-related types
export * from './delivery.type';

// Export money-delivery-related types
export * from './money-delivery.type';

// Export route-related types
export * from './route.type';

// Export user-route-related types
export * from './user-route.type';

// Base interface for common entity fields
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}
