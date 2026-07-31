import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { controlCenterBoundaryConfigs } from './tooling/eslint/controlCenterBoundaryConfigs';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'electron/release/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,cts,mts}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{cjs,cts}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  ...controlCenterBoundaryConfigs,
);
