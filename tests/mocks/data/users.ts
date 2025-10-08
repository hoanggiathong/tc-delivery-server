import { IUserResponse, UserRole } from '@/types/user.type';

export const createMockUser = (overrides: Partial<IUserResponse> = {}): IUserResponse => {
  return {
    id: 'user-id-1',
    username: 'testuser',
    name: 'Test User',
    role: UserRole.ADMIN,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ...overrides,
  };
};

export const createMockUserRequest = (overrides: any = {}) => {
  return {
    username: 'testuser',
    password: 'password123',
    role: UserRole.ADMIN,
    ...overrides,
  };
};

export const createMockUserList = (count: number = 3): IUserResponse[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockUser({
      id: `user-id-${index + 1}`,
      username: `user${index + 1}`,
      role: index === 0 ? UserRole.ADMIN : UserRole.USER,
    })
  );
};

// ===== INTEGRATION TEST MOCKS =====
// These are specific mock objects used in integration tests

/**
 * Auth test users with different route configurations
 */
export const mockAuthUsersForIntegration = {
  basicUser: {
    id: 'user123',
    username: 'testuser',
    name: 'Test User',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  userWithRoute: {
    id: 'user123',
    username: 'testuser',
    name: 'Test User',
    role: UserRole.USER,
    selectedRouteId: 'route123',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  userWithNullRoute: {
    id: 'user123',
    username: 'testuser',
    name: 'Test User',
    role: UserRole.USER,
    selectedRouteId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  userWithUndefinedRoute: {
    id: 'user123',
    username: 'testuser',
    name: 'Test User',
    role: UserRole.USER,
    selectedRouteId: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};
