export default {
  testEnvironment: 'node',
  // Unit tests cover parser and validator (pure business logic).
  // Calendar service API methods require integration tests (tests/integration/).
  // Commands, events, and jobs require Discord.js context and are excluded from unit coverage.
  collectCoverageFrom: [
    'src/services/parser.js',
    'src/utils/validator.js',
  ],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  testMatch: ['**/tests/**/*.test.js'],
  transform: {},
};
