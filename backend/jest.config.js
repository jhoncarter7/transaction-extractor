module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/setup.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    // Transform ESM modules from better-auth
    '^.+\\.mjs$': 'ts-jest',
  },
  // Allow Jest to transform ESM modules from these packages
  transformIgnorePatterns: [
    'node_modules/(?!(better-auth)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/__tests__/**',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000, // Increased for DB operations
};

