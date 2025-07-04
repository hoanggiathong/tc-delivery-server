import { BaseEntity } from ".";

// Route response interface
export interface IRouteResponse extends BaseEntity {
  code: string;
  name: string;
}

// Route creation request interface
export interface IRouteCreateRequest {
  code: string;
  name: string;
}

// Route update request interface
export interface IRouteUpdateRequest {
  code?: string;
  name?: string;
}

// Lean type for MongoDB route documents (when using .lean())
export interface IRouteLean {
  _id: string;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}