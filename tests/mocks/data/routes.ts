import { IRouteResponse } from '@/types/route.type';

export const createMockRoute = (overrides: Partial<IRouteResponse> = {}): IRouteResponse => {
  return {
    id: 'route-id-1',
    code: 'T1',
    name: 'Test Route 1',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ...overrides
  };
};

export const createMockRouteRequest = (overrides: any = {}) => {
  return {
    code: 'T1',
    name: 'Test Route 1',
    ...overrides
  };
};

export const createMockRouteList = (count: number = 3): IRouteResponse[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockRoute({
      id: `route-id-${index + 1}`,
      code: `T${index + 1}`,
      name: `Test Route ${index + 1}`
    })
  );
};