/**
 * Mock User Route Model
 * Provides mock implementations for UserRoute model testing
 */

// Mock UserRoute model functions
export const mockUserRouteModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  deleteMany: jest.fn(),
  updateMany: jest.fn(),
  aggregate: jest.fn(),
  insertMany: jest.fn()
};

// Mock class for UserRoute
export class MockUserRoute {
  constructor(data: any) {
    Object.assign(this, data);
  }

  save = jest.fn().mockResolvedValue(this);
  remove = jest.fn().mockResolvedValue(this);
  deleteOne = jest.fn().mockResolvedValue(this);
  populate = jest.fn().mockResolvedValue(this);

  static find = mockUserRouteModel.find;
  static findOne = mockUserRouteModel.findOne;
  static countDocuments = mockUserRouteModel.countDocuments;
  static create = mockUserRouteModel.create;
  static findById = mockUserRouteModel.findById;
  static findByIdAndUpdate = mockUserRouteModel.findByIdAndUpdate;
  static findByIdAndDelete = mockUserRouteModel.findByIdAndDelete;
  static deleteMany = mockUserRouteModel.deleteMany;
  static updateMany = mockUserRouteModel.updateMany;
  static aggregate = mockUserRouteModel.aggregate;
  static insertMany = mockUserRouteModel.insertMany;
}

// Reset function for user route model mocks
export const resetUserRouteMocks = () => {
  Object.values(mockUserRouteModel).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};