import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'node_modules'],
  },
  {
    files: ['**/*.{ts,tsx}'],
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
  {
    files: ['src/features/control-center/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '../data/**',
            '../../data/**',
            '../application/controller/**',
            '../../application/controller/**',
            '../application/commands/**',
            '../../application/commands/**',
            '../application/extensions/**',
            '../../application/extensions/**',
            '../../../scripts/**',
            '../../../../scripts/**',
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/control-center/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['react', 'antd'],
          patterns: ['../data/**', '../ui/**', '../application/**', '../../../scripts/**'],
        },
      ],
    },
  },
  {
    files: ['src/features/control-center/application/extensions/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['./modules/**', '../../ui/**', '../../../../scripts/**'] },
      ],
    },
  },
  {
    files: ['src/features/control-center/application/extensions/modules/*/index.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\./(?!\\.)[^/]+(?:/.*)?$',
              message: 'Extension modules must not import sibling extension modules.',
            },
            { group: ['../../../../ui/**'] },
            { group: ['../../../../../../scripts/**'] },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/control-center/data/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '../ui/**',
            '../application/controller/**',
            '../application/commands/**',
            '../application/extensions/**',
            '../application/composition/**',
            '../../../scripts/**',
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/control-center/application/controller/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['../../data/**', '../../ui/**', '../../../../scripts/**'] },
      ],
    },
  },
  {
    files: ['src/features/control-center/application/composition/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['../../ui/**', '../../screens/**'] }],
    },
  },
);
