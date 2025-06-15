import { BaseEntity } from '.';
import { IUser } from '@/models/user.model';

// Role enum
export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user'
}

// Role hierarchy for permissions
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPERADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.MANAGER]: 2,
  [UserRole.USER]: 1
};

// Role permissions - what roles can each role view/create
export const ROLE_PERMISSIONS = {
  [UserRole.SUPERADMIN]: {
    canView: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER],
    canCreate: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER]
  },
  [UserRole.ADMIN]: {
    canView: [UserRole.MANAGER, UserRole.USER],
    canCreate: [UserRole.MANAGER, UserRole.USER]
  },
  [UserRole.MANAGER]: {
    canView: [UserRole.USER],
    canCreate: []
  },
  [UserRole.USER]: {
    canView: [],
    canCreate: []
  }
};

// User response interface extending base
export interface IUserResponse extends BaseEntity {
  username: string;
  role: UserRole;
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
export const transformUserToResponse = (user: IUser): IUserResponse => {
  return {
    id: user._id.toString(),
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

/**
 * Transform multiple users to response format
 */
export const transformUsersToResponse = (users: IUser[]): IUserResponse[] => {
  return users.map(transformUserToResponse);
};

/**
 * Check if user has permission to view target role
 */
export const canViewRole = (userRole: UserRole, targetRole: UserRole): boolean => {
  return ROLE_PERMISSIONS[userRole].canView.includes(targetRole);
};

/**
 * Check if user has permission to create target role
 */
export const canCreateRole = (userRole: UserRole, targetRole: UserRole): boolean => {
  return ROLE_PERMISSIONS[userRole].canCreate.includes(targetRole);
};

/**
 * Check if user role has higher or equal permission than target role
 */
export const hasHigherOrEqualRole = (userRole: UserRole, targetRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[targetRole];
};