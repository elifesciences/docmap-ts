module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: './tsconfig.json',
    },
    plugins: ['@typescript-eslint'],
    extends: ['airbnb/base', 'airbnb-typescript/base', 'plugin:deprecation/recommended'],
    rules: {
      "deprecation/deprecation": 1,
      "import/prefer-default-export": 0,
      "max-len": ["error", { "code": 240 }],
      "quotes": ["error", "single"],
    },
    ignorePatterns: [
      "src/**/*.test.ts",
      "src/test-fixtures",
    ],
  };
