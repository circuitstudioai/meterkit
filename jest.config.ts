import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: pathsToModuleNameMapper(
    {
      '@/*': ['*'],
    },
    { prefix: '<rootDir>/' }
  ),
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
  ],
};

export default config;
