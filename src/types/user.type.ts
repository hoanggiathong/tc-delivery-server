import { BaseEntity } from '.';
import { IUser } from '@/models/user.model';


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

// User transformation utilities
/**
 * Transform IUser to IUserResponse
 * Removes sensitive data and converts to response format
 */
export const transformUserToResponse = (user: IUser): IUserResponse => {
  return {
    id: user._id.toString(),
    username: user.username,
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