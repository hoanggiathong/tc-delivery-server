// Mock helper functions for Delivery model
export const createMockQuery = (resolvedValue: any) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(resolvedValue)
});

export const createMockFindOneQuery = (resolvedValue: any) => ({
  lean: jest.fn().mockResolvedValue(resolvedValue)
});

// Create error mock query
export const createMockErrorQuery = () => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockRejectedValue(new Error('Database error'))
});

// Mock Delivery model
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
  aggregate: jest.fn()
};

// Mock class for Delivery
export class MockDelivery {
  constructor(data: any) {
    Object.assign(this, data);
  }

  save = jest.fn().mockResolvedValue(this);
  remove = jest.fn().mockResolvedValue(this);
  deleteOne = jest.fn().mockResolvedValue(this);

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

// Helper function to setup common mocks for code generator tests
export const setupCodeGeneratorMocks = () => {
  const mocks = {
    // For empty result (first code of day)
    mockEmptyQuery: createMockQuery([]),
    mockNullFindOneQuery: createMockFindOneQuery(null),

    // For sequence continuation
    mockSequenceQuery: createMockQuery([{ code: '2501240005' }]),

    // For collision handling
    mockCollisionQuery: createMockQuery([{ code: '2501240005' }]),
    mockCollisionFindOneQuery: createMockFindOneQuery({ code: '2501240006' }),
    mockNoCollisionFindOneQuery: createMockFindOneQuery(null),

    // For max sequence
    mockMaxSequenceQuery: createMockQuery([{ code: '2501249999' }]),

    // For database errors - create when needed
    mockErrorQuery: createMockErrorQuery()
  };

  return mocks;
};

// Reset all mocks
export const resetDeliveryMocks = () => {
  Object.values(mockDeliveryModel).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};