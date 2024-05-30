import tsconfigPaths from 'vite-tsconfig-paths';

export default {
  testDir: 'packages/backend/src', // directory of your tests
  include: ['**/*.test.ts'], // pattern to match your test files
  plugins: [
    tsconfigPaths(),
  ],
}