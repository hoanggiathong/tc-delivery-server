/**
 * Mock Route Model
 * Provides mock implementations for Route model testing
 */

// Mock Route model functions
export const mockRouteModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  deleteMany: jest.fn(),
  updateMany: jest.fn(),
  aggregate: jest.fn()
};

// Mock class for Route
export class MockRoute {
  constructor(data: any) {
    Object.assign(this, data);
  }

  save = jest.fn().mockResolvedValue(this);
  remove = jest.fn().mockResolvedValue(this);
  deleteOne = jest.fn().mockResolvedValue(this);

  static find = mockRouteModel.find;
  static findOne = mockRouteModel.findOne;
  static countDocuments = mockRouteModel.countDocuments;
  static create = mockRouteModel.create;
  static findById = mockRouteModel.findById;
  static findByIdAndUpdate = mockRouteModel.findByIdAndUpdate;
  static findByIdAndDelete = mockRouteModel.findByIdAndDelete;
  static deleteMany = mockRouteModel.deleteMany;
  static updateMany = mockRouteModel.updateMany;
  static aggregate = mockRouteModel.aggregate;
}

// Reset function for route model mocks
export const resetRouteMocks = () => {
  Object.values(mockRouteModel).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};