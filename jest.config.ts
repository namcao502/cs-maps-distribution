import type { Config } from 'jest'

// When running inside a worktree (.worktrees/<branch>/), don't exclude sibling worktrees
const inWorktree = __dirname.replace(/\\/g, '/').includes('/.worktrees/')

const config: Config = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  testPathIgnorePatterns: inWorktree
    ? ['/node_modules/']
    : ['/node_modules/', '/.worktrees/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
    '^.+\\.js$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(jose)/)',
  ],
  setupFiles: ['./jest.setup.ts'],
}

export default config
