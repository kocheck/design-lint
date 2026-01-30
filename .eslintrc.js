/* eslint-env node */
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:@figma/figma-plugins/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', '@figma/figma-plugins', 'react', 'react-hooks'],
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['dist/', 'node_modules/', 'webpack.config.js'],
  rules: {
    // Strict async/await rules - critical for Figma plugin performance
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/require-await': 'warn',
    '@typescript-eslint/promise-function-async': 'warn',

    // Type safety
    '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',

    // Allow certain patterns common in existing codebase
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/restrict-template-expressions': 'warn',
    '@typescript-eslint/restrict-plus-operands': 'warn',

    // General quality rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'warn',
    'no-var': 'error',

    // React rules
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Figma plugin specific
    // Deprecated sync methods and prop setters - warn for now, sync APIs still work but should be migrated
    '@figma/figma-plugins/ban-deprecated-sync-methods': 'warn',
    '@figma/figma-plugins/ban-deprecated-sync-prop-setters': 'warn',

    // Allow unused variables starting with _ and in certain patterns (legacy code)
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],

    // Redundant type constituents (from union types)
    '@typescript-eslint/no-redundant-type-constituents': 'warn',

    // React unescaped entities - warn for legacy code
    'react/no-unescaped-entities': 'warn',

    // Allow inner function declarations in legacy code (warn instead of error)
    'no-inner-declarations': 'warn',
  },
  overrides: [
    {
      // Plugin code (code.ts) - warn for promises during migration
      files: ['src/plugin/**/*.ts'],
      rules: {
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-misused-promises': 'warn',
        'no-console': 'off', // Allow console in plugin for debugging
      },
    },
    {
      // UI code (React) - slightly relaxed rules
      files: ['src/app/**/*.tsx', 'src/app/**/*.ts'],
      rules: {
        '@typescript-eslint/no-floating-promises': 'warn',
      },
    },
  ],
};
