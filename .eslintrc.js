module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier', 'react', 'react-hooks', '@next/eslint-plugin-next', 'prisma'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@next/next/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
    browser: true,
    es6: true,
  },
  ignorePatterns: ['.eslintrc.js', 'node_modules/', 'dist/'],
  rules: {
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // React
    'react/jsx-uses-react': 'off', // Не нужен с React 17+
    'react/react-in-jsx-scope': 'off', // Не нужен с React 17+
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Prettier
    'prettier/prettier': ['error', { endOfLine: 'auto' }],

    // Prisma
    'prisma/no-unchecked-queries': 'warn',
    'prisma/require-indexes': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
