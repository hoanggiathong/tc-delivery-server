/**
 * Mock Customer Model
 * Provides mock implementations for Customer model testing
 */

// Mock Customer model functions
export const mockCustomerModel = {
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

// Mock class for Customer
export class MockCustomer {
  constructor(data: any) {
    Object.assign(this, data);
  }

  save = jest.fn().mockResolvedValue(this);
  remove = jest.fn().mockResolvedValue(this);
  deleteOne = jest.fn().mockResolvedValue(this);

  static find = mockCustomerModel.find;
  static findOne = mockCustomerModel.findOne;
  static countDocuments = mockCustomerModel.countDocuments;
  static create = mockCustomerModel.create;
  static findById = mockCustomerModel.findById;
  static findByIdAndUpdate = mockCustomerModel.findByIdAndUpdate;
  static findByIdAndDelete = mockCustomerModel.findByIdAndDelete;
  static deleteMany = mockCustomerModel.deleteMany;
  static updateMany = mockCustomerModel.updateMany;
  static aggregate = mockCustomerModel.aggregate;
}

// Reset function for customer model mocks
export const resetCustomerMocks = () => {
  Object.values(mockCustomerModel).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};