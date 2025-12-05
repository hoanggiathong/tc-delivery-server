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
  createdAt?: Date;
  updatedAt?: Date;
}

// Payment types for deliveries and drafts
export type PaymentType = 'paid' | 'debt';

// Common interface for date range queries (used in cost reports)
export interface DateRangeQuery {
  startDate: Date;
  endDate: Date;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

// Interface for auth requests with file upload support (upload.fields())
export interface AuthRequestWithFileUploads extends AuthRequest {
  files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}
