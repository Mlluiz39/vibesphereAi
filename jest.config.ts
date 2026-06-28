import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/apps'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    '^@vibesphere/shared$': '<rootDir>/packages/shared/src',
    '^@vibesphere/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@vibesphere/llm$': '<rootDir>/packages/llm/src',
    '^@vibesphere/llm/(.*)$': '<rootDir>/packages/llm/src/$1',
    '^@vibesphere/rag$': '<rootDir>/packages/rag/src',
    '^@vibesphere/rag/(.*)$': '<rootDir>/packages/rag/src/$1',
    '^@vibesphere/whatsapp$': '<rootDir>/packages/whatsapp/src',
    '^@vibesphere/whatsapp/(.*)$': '<rootDir>/packages/whatsapp/src/$1',
    '^@vibesphere/database$': '<rootDir>/packages/database/src',
    '^@vibesphere/database/(.*)$': '<rootDir>/packages/database/src/$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        diagnostics: false,
        tsconfig: {
          esModuleInterop: true,
          allowJs: true,
        },
      },
    ],
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'apps/*/src/**/*.ts',
    '!**/*.d.ts',
    '!**/index.ts',
    '!**/main.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/*.decorator.ts',
    '!**/*.strategy.ts',
    '!**/*.guard.ts',
    '!**/*.filter.ts',
    '!**/*.interceptor.ts',
  ],
};

export default config;
