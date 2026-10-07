/** @type {import('jest').Config} */
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'jsx', 'mjs', 'json'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json-summary', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/main.js',
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.spec.{js,jsx}',
  ],
};