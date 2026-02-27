import { BaseEntity } from '.';
import { IUserResponse } from './user.type';
import { IRouteResponse } from './route.type';

// User route response interface
export interface IUserRouteResponse extends BaseEntity {
  userId: string;
  routeId: string;
  assignedBy: string;
  user?: IUserResponse;
  route?: IRouteResponse;
  assignedByUser?: IUserResponse;
}

// User route creation request interface
export interface IUserRouteCreateRequest {
  userId: string;
  routeId: string;
}

// User route update request interface (if needed for future)
export interface IUserRouteUpdateRequest {
  userId?: string;
  routeId?: string;
}

// Lean type for MongoDB user route documents (when using .lean())
export interface IUserRouteLean {
  _id: string;
  userId: string;
  routeId: string;
  assignedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// User route with populated references (lean)
export interface IUserRouteLeanPopulated {
  type: import('d:/PROJECTS/GIAPHUOCEXPRESS/tc-delivery-server/src/types/route.type').RouteType;
  _id: string;
  userId: {
    _id: string;
    username: string;
    name: string;
    role: string;
  };
  routeId: {
    _id: string;
    code: string;
    name: string;
    address?: string;
    phone?: string;
    createdAt: Date;
    updatedAt: Date;
  };
  assignedBy: {
    _id: string;
    username: string;
    name: string;
    role: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Assign multiple routes to user request
export interface IAssignMultipleRoutesRequest {
  userId: string;
  routeIds: string[];
}

// Remove multiple routes from user request
export interface IRemoveMultipleRoutesRequest {
  userId: string;
  routeIds: string[];
}
