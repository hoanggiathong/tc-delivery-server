import { Request } from 'express';

// Export user-related types and utilities from user.type.ts
export * from './user.type';

// Base interface for common entity fields
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User response interface extending base
export interface IUserResponse extends BaseEntity {
  username: string;
}

// Extended user response with additional fields (for future use)
export interface IUserDetailResponse extends IUserResponse {
  lastLoginAt?: Date;
  isActive?: boolean;
  roles?: string[];
}

export interface JWTPayload {
  userId: string;
  username: string;
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