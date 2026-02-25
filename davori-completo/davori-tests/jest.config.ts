// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './src',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterFramework: ['<rootDir>/__tests__/setup.ts'],
  setupFilesAfterFramework: [],
  globalSetup: '<rootDir>/__tests__/globalSetup.ts',
  globalTeardown: '<rootDir>/__tests__/globalTeardown.ts',
  clearMocks: true,
  coverageDirectory: '../coverage',
  collectCoverageFrom: [
    'services/**/*.ts',
    'controllers/**/*.ts',
    'middlewares/**/*.ts',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: { lines: 80, functions: 80, branches: 70, statements: 80 },
  },
}

export default config
