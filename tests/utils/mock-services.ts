/**
 * Mock Services
 * Centralized mock service classes for testing
 */

// Mock Auth Service
export const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  createUser: jest.fn(),
  getUserById: jest.fn(),
  getAllUsers: jest.fn(),
  getUsersByRoles: jest.fn(),
};

export class MockAuthService {
  register = mockAuthService.register;
  login = mockAuthService.login;
  createUser = mockAuthService.createUser;
  getUserById = mockAuthService.getUserById;
  getAllUsers = mockAuthService.getAllUsers;
  getUsersByRoles = mockAuthService.getUsersByRoles;
}

// Mock Customer Service
export const mockCustomerService = {
  createCustomer: jest.fn(),
  findOrCreateCustomer: jest.fn(),
  getAllCustomers: jest.fn(),
  getCustomerById: jest.fn(),
  updateCustomer: jest.fn(),
  deleteCustomer: jest.fn(),
};

export class MockCustomerService {
  createCustomer = mockCustomerService.createCustomer;
  findOrCreateCustomer = mockCustomerService.findOrCreateCustomer;
  getAllCustomers = mockCustomerService.getAllCustomers;
  getCustomerById = mockCustomerService.getCustomerById;
  updateCustomer = mockCustomerService.updateCustomer;
  deleteCustomer = mockCustomerService.deleteCustomer;
}

// Mock Delivery Service
export const mockDeliveryService = {
  createDelivery: jest.fn(),
  updateDelivery: jest.fn(),
  getDeliveryById: jest.fn(),
  getAllDeliveries: jest.fn(),
  deleteDelivery: jest.fn(),
  getRelatedDeliveriesBySender: jest.fn(),
  getNextCode: jest.fn(),
  getDeliveryByCode: jest.fn()
};

export class MockDeliveryService {
  createDelivery = mockDeliveryService.createDelivery;
  updateDelivery = mockDeliveryService.updateDelivery;
  getDeliveryById = mockDeliveryService.getDeliveryById;
  getAllDeliveries = mockDeliveryService.getAllDeliveries;
  deleteDelivery = mockDeliveryService.deleteDelivery;
  getRelatedDeliveriesBySender = mockDeliveryService.getRelatedDeliveriesBySender;
  getNextCode = mockDeliveryService.getNextCode;
  getDeliveryByCode = mockDeliveryService.getDeliveryByCode;
}

// Mock Money Delivery Service
export const mockMoneyDeliveryService = {
  createMoneyDelivery: jest.fn(),
  getAllMoneyDeliveries: jest.fn(),
  getMoneyDeliveryById: jest.fn(),
  updateMoneyDelivery: jest.fn(),
  deleteMoneyDelivery: jest.fn(),
  getNextCode: jest.fn(),
  getMoneyDeliveryByCode: jest.fn(),
  getFrequentCustomers: jest.fn()
};

export class MockMoneyDeliveryService {
  createMoneyDelivery = mockMoneyDeliveryService.createMoneyDelivery;
  getAllMoneyDeliveries = mockMoneyDeliveryService.getAllMoneyDeliveries;
  getMoneyDeliveryById = mockMoneyDeliveryService.getMoneyDeliveryById;
  updateMoneyDelivery = mockMoneyDeliveryService.updateMoneyDelivery;
  deleteMoneyDelivery = mockMoneyDeliveryService.deleteMoneyDelivery;
  getNextCode = mockMoneyDeliveryService.getNextCode;
  getMoneyDeliveryByCode = mockMoneyDeliveryService.getMoneyDeliveryByCode;
  getFrequentCustomers = mockMoneyDeliveryService.getFrequentCustomers;
}

// Mock Route Service
export const mockRouteService = {
  createRoute: jest.fn(),
  updateRoute: jest.fn(),
  getRouteById: jest.fn(),
  getAllRoutes: jest.fn(),
  deleteRoute: jest.fn(),
  getRouteByCode: jest.fn()
};

export class MockRouteService {
  createRoute = mockRouteService.createRoute;
  updateRoute = mockRouteService.updateRoute;
  getRouteById = mockRouteService.getRouteById;
  getAllRoutes = mockRouteService.getAllRoutes;
  deleteRoute = mockRouteService.deleteRoute;
  getRouteByCode = mockRouteService.getRouteByCode;
}

// Mock UserRoute Service
export const mockUserRouteService = {
  assignRouteToUser: jest.fn(),
  assignMultipleRoutesToUser: jest.fn(),
  removeRouteFromUser: jest.fn(),
  removeMultipleRoutesFromUser: jest.fn(),
  getUserRoutes: jest.fn(),
  getRoutesForUser: jest.fn(),
  getUsersForRoute: jest.fn(),
  getAllUserRoutes: jest.fn(),
  updateUserRoute: jest.fn(),
  getUserRouteById: jest.fn()
};

export class MockUserRouteService {
  assignRouteToUser = mockUserRouteService.assignRouteToUser;
  assignMultipleRoutesToUser = mockUserRouteService.assignMultipleRoutesToUser;
  removeRouteFromUser = mockUserRouteService.removeRouteFromUser;
  removeMultipleRoutesFromUser = mockUserRouteService.removeMultipleRoutesFromUser;
  getUserRoutes = mockUserRouteService.getUserRoutes;
  getRoutesForUser = mockUserRouteService.getRoutesForUser;
  getUsersForRoute = mockUserRouteService.getUsersForRoute;
  getAllUserRoutes = mockUserRouteService.getAllUserRoutes;
  updateUserRoute = mockUserRouteService.updateUserRoute;
  getUserRouteById = mockUserRouteService.getUserRouteById;
}

// Mock Code Generator Service
export const mockCodeGeneratorService = {
  generateNextCode: jest.fn(),
  getNextCodePreview: jest.fn(),
  validateCodeFormat: jest.fn(),
  parseCode: jest.fn(),
  getDeliveryCountForDate: jest.fn(),
  isMaxDeliveriesReached: jest.fn()
};

export class MockCodeGeneratorService {
  static generateNextCode = mockCodeGeneratorService.generateNextCode;
  static getNextCodePreview = mockCodeGeneratorService.getNextCodePreview;
  static validateCodeFormat = mockCodeGeneratorService.validateCodeFormat;
  static parseCode = mockCodeGeneratorService.parseCode;
  static getDeliveryCountForDate = mockCodeGeneratorService.getDeliveryCountForDate;
  static isMaxDeliveriesReached = mockCodeGeneratorService.isMaxDeliveriesReached;
}

// Reset functions for services
export const resetAllServiceMocks = () => {
  [
    mockAuthService,
    mockCustomerService,
    mockDeliveryService,
    mockMoneyDeliveryService,
    mockRouteService,
    mockUserRouteService,
    mockCodeGeneratorService
  ].forEach(service => {
    Object.values(service).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockReset();
      }
    });
  });
};

export const resetAuthServiceMocks = () => {
  Object.values(mockAuthService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};

export const resetCustomerServiceMocks = () => {
  Object.values(mockCustomerService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};

export const resetDeliveryServiceMocks = () => {
  Object.values(mockDeliveryService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};

export const resetMoneyDeliveryServiceMocks = () => {
  Object.values(mockMoneyDeliveryService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};

export const resetRouteServiceMocks = () => {
  Object.values(mockRouteService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};

export const resetUserRouteServiceMocks = () => {
  Object.values(mockUserRouteService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};

export const resetCodeGeneratorServiceMocks = () => {
  Object.values(mockCodeGeneratorService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};