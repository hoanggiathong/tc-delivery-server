import { IUserResponse, UserRole } from '@/types/user.type';

export const createMockUser = (overrides: Partial<IUserResponse> = {}): IUserResponse => {
  return {
    id: 'user-id-1',
    username: 'testuser',
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
