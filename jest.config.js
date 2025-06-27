const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/index.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],

  // Proper path mapping using ts-jest utility
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/'
  }),

  // Configure ts-jest with tsconfig paths
  globals: {
    'ts-jest': {
      tsconfig: {
        ...compilerOptions,
        baseUrl: '.',
        paths: compilerOptions.paths
      }
    }
  },

  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000
};