const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],

  // Proper path mapping using ts-jest utility
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/'
  }),

  // Configure ts-jest with tsconfig paths (new format)
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        ...compilerOptions,
        baseUrl: '.',
        paths: compilerOptions.paths
      }
    }]
  },

  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000
};