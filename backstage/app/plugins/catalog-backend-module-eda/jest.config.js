const base = require('@backstage/cli/config/jest');

module.exports = {
  ...base,
  testMatch: ['**/src/**/*.test.[jt]s?(x)'],
  roots: ['.'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '../../tsconfig.json',
      },
    ],
  },
};
