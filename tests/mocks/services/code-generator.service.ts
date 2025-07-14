/**
 * Mock Code Generator Service
 * Provides mock implementations for CodeGeneratorService testing
 */

// Mock Code Generator Service functions
export const mockCodeGeneratorService = {
  generateNextCode: jest.fn(),
  getNextCodePreview: jest.fn(),
  validateCodeFormat: jest.fn(),
  parseCode: jest.fn(),
  getDeliveryCountForDate: jest.fn(),
  isMaxDeliveriesReached: jest.fn(),
};

// Mock Code Generator Service class
export class MockCodeGeneratorService {
  static generateNextCode = mockCodeGeneratorService.generateNextCode;
  static getNextCodePreview = mockCodeGeneratorService.getNextCodePreview;
  static validateCodeFormat = mockCodeGeneratorService.validateCodeFormat;
  static parseCode = mockCodeGeneratorService.parseCode;
  static getDeliveryCountForDate = mockCodeGeneratorService.getDeliveryCountForDate;
  static isMaxDeliveriesReached = mockCodeGeneratorService.isMaxDeliveriesReached;
}

// Reset function for code generator service mocks
export const resetCodeGeneratorServiceMocks = () => {
  Object.values(mockCodeGeneratorService).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
};
