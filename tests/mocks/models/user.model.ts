/**
 * Mock User Model
 * Provides mock implementations for User model testing
 */

// Mock User model functions
export const mockUserModel = {
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
};

// Mock class for User
export class MockUser {
  constructor(data: any) {
    Object.assign(this, data);
  }

  save = jest.fn().mockResolvedValue(this);
  remove = jest.fn().mockResolvedValue(this);
  deleteOne = jest.fn().mockResolvedValue(this);
  comparePassword = jest.fn().mockResolvedValue(true);

  static find = mockUserModel.find;
  static findOne = mockUserModel.findOne;
  static countDocuments = mockUserModel.countDocuments;
  static create = mockUserModel.create;
  static findById = mockUserModel.findById;
  static findByIdAndUpdate = mockUserModel.findByIdAndUpdate;
  static findByIdAndDelete = mockUserModel.findByIdAndDelete;
  static deleteMany = mockUserModel.deleteMany;
  static updateMany = mockUserModel.updateMany;
  static aggregate = mockUserModel.aggregate;
}

// Reset function for user model mocks
export const resetUserMocks = () => {
  Object.values(mockUserModel).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};
