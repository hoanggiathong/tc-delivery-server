/**
 * Mock Models
 * Centralized mock model classes and helpers for testing
 */

// Mock helper functions for Delivery model
export const createMockQuery = (resolvedValue: any) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(resolvedValue),
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(resolvedValue)
});

export const createMockFindOneQuery = (resolvedValue: any) => ({
  lean: jest.fn().mockResolvedValue(resolvedValue),
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(resolvedValue)
});

// Create error mock query
export const createMockErrorQuery = () => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockRejectedValue(new Error('Database error')),
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockRejectedValue(new Error('Database error'))
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
  aggregate: jest.fn(),
  insertMany: jest.fn()
};

// Mock User model
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
  aggregate: jest.fn()
};

// Mock Route model
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

// Mock Customer model
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

// Mock UserRoute model
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
export const resetAllModelMocks = () => {
  [mockDeliveryModel, mockUserModel, mockRouteModel, mockCustomerModel, mockUserRouteModel].forEach(model => {
    Object.values(model).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockReset();
      }
    });
  });
};

// Reset specific model mocks
export const resetDeliveryMocks = () => {
  Object.values(mockDeliveryModel).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};

export const resetUserMocks = () => {
  Object.values(mockUserModel).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};

export const resetRouteMocks = () => {
  Object.values(mockRouteModel).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};

export const resetCustomerMocks = () => {
  Object.values(mockCustomerModel).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};

export const resetUserRouteMocks = () => {
  Object.values(mockUserRouteModel).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};