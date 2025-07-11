/**
 * Mock Delivery Model
 * Provides mock implementations for Delivery model testing
 */

// Mock Delivery model functions
export const mockDeliveryModel = {
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

// Mock class for Delivery
export class MockDelivery {
  constructor(data: any) {
    Object.assign(this, data);
  }

  save = jest.fn().mockResolvedValue(this);
  remove = jest.fn().mockResolvedValue(this);
  deleteOne = jest.fn().mockResolvedValue(this);
  populate = jest.fn().mockResolvedValue(this);

  static find = mockDeliveryModel.find;
  static findOne = mockDeliveryModel.findOne;
  static countDocuments = mockDeliveryModel.countDocuments;
  static create = mockDeliveryModel.create;
  static findById = mockDeliveryModel.findById;
  static findByIdAndUpdate = mockDeliveryModel.findByIdAndUpdate;
  static findByIdAndDelete = mockDeliveryModel.findByIdAndDelete;
  static deleteMany = mockDeliveryModel.deleteMany;
  static updateMany = mockDeliveryModel.updateMany;
  static aggregate = mockDeliveryModel.aggregate;
}

// Reset function for delivery model mocks
export const resetDeliveryMocks = () => {
  Object.values(mockDeliveryModel).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};