import mongoose, { Document } from 'mongoose';

// Role enum
export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

// Role hierarchy for permissions
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPERADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.MANAGER]: 2,
  [UserRole.USER]: 1,
};

// Fix: Add explicit typing for ROLE_PERMISSIONS
export const ROLE_PERMISSIONS: Record<UserRole, { canView: UserRole[]; canCreate: UserRole[] }> = {
  [UserRole.SUPERADMIN]: {
    canView: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
    canCreate: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
  },
  [UserRole.ADMIN]: {
    canView: [UserRole.MANAGER, UserRole.USER],
    canCreate: [UserRole.MANAGER, UserRole.USER],
  },
  [UserRole.MANAGER]: {
    canView: [UserRole.USER],
    canCreate: [],
  },
  [UserRole.USER]: {
    canView: [],
    canCreate: [],
  },
} as const;

// Base user interface (without password)
export interface IUserBase {
  _id: string;
  username: string;
  name: string;
  role: UserRole;
  selectedRouteId?: string | null;
  additionalInformationProductConfig?: IAdditionalInformationProduct[];
  createdAt: Date;
  updatedAt: Date;
}

// User document interface (extends Mongoose Document)
export interface IUser extends Document {
  _id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  selectedRouteId?: string | null;
  additionalInformationProductConfig?: IAdditionalInformationProduct[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// User response interface (for API responses)
export interface IUserResponse {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  selectedRouteId?: string | null;
  additionalInformationProductConfig?: IAdditionalInformationProductResponse[];
  createdAt: Date;
  updatedAt: Date;
}

// JWT payload interface
export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
}

// Lean type for MongoDB user documents (when using .lean())
export interface IUserLean {
  _id: string;
  username: string;
  name: string;
  role: UserRole;
  selectedRouteId?: string | null;
  additionalInformationProductConfig?: IAdditionalInformationProduct[];
  createdAt: Date;
  updatedAt: Date;
}

// Extended user response with additional fields (for future use)
export interface IUserDetailResponse extends IUserResponse {
  lastLoginAt?: Date;
  isActive?: boolean;
  roles?: string[];
}

// User transformation utilities
/**
 * Transform IUser to IUserResponse
 * Removes sensitive data and converts to response format
 */
export const transformUserToResponse = (user: IUser | any): IUserResponse => {
  return {
    id: user._id.toString(),
    username: user.username,
    name: user.name,
    role: user.role,
    selectedRouteId: user.selectedRouteId?.toString() || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/**
 * Transform IUserLean to IUserResponse
 * For lean documents from .lean() queries
 */
export const transformUserLeanToResponse = (user: IUserLean): IUserResponse => {
  return {
    id: user._id.toString(),
    username: user.username,
    name: user.name,
    role: user.role,
    selectedRouteId: user.selectedRouteId?.toString() || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/**
 * Transform multiple users to response format
 */
export const transformUsersToResponse = (users: IUser[]): IUserResponse[] => {
  return users.map(transformUserToResponse);
};

/**
 * Transform multiple lean users to response format
 */
export const transformUsersLeanToResponse = (users: IUserLean[]): IUserResponse[] => {
  return users.map(transformUserLeanToResponse);
};

/**
 * Check if user has permission to view target role
 */
export const canViewRole = (userRole: UserRole, targetRole: UserRole): boolean => {
  return (ROLE_PERMISSIONS[userRole].canView as readonly UserRole[]).includes(targetRole);
};

/**
 * Check if user has permission to create target role
 */
export const canCreateRole = (userRole: UserRole, targetRole: UserRole): boolean => {
  return (ROLE_PERMISSIONS[userRole].canCreate as readonly UserRole[]).includes(targetRole);
};

/**
 * Check if user role has higher or equal permission than target role
 */
export const hasHigherOrEqualRole = (userRole: UserRole, targetRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[targetRole];
};

export interface IAdditionalInformationProductInput {
  content: string;
  position: number;
  selected?: boolean;
}

export interface IAdditionalInformationProduct {
  _id?: mongoose.Types.ObjectId;
  content: string;
  position: number;
  selected?: boolean;
}

export interface IAdditionalInformationProductResponse {
  id: string;
  content: string;
  position: number;
  selected: boolean;
}

export interface IUserFullInformationResponse {
  id: string;
  username: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
