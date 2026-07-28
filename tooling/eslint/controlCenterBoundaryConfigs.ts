import type { ConfigWithExtends } from 'typescript-eslint';

// Add an internal edge here only when that layer exists in the feature.
// `application/view-models` is intentionally absent because it is the UI contract.
const uiRestrictedImportPatterns = [
  {
    regex: '^(?:\\.\\./)+data(?:/|$)',
    message: 'Control-center UI must not import feature data adapters.',
  },
  {
    regex: '^(?:\\.\\./)+domain(?:/|$)',
    message: 'Control-center UI must consume view models instead of domain modules.',
  },
  {
    regex: '^(?:\\.\\./)+screens(?:/|$)',
    message: 'Control-center UI must not import routed screens.',
  },
  {
    regex: '^(?:\\.\\./)+types(?:\\.[cm]?[jt]sx?)?$',
    message: 'Control-center UI must consume semantic view models instead of raw feature types.',
  },
  {
    regex: '^(?:\\.\\./)+application/controller(?:/|$)',
    message: 'Control-center UI must not import the application controller.',
  },
  {
    regex: '^(?:\\.\\./)+application/commands(?:/|$)',
    message: 'Control-center UI must not import application commands.',
  },
  {
    regex: '^(?:\\.\\./)+application/extensions(?:/|$)',
    message: 'Control-center UI must not import application extensions.',
  },
  {
    regex: '^(?:\\.\\./)+application/presenters(?:/|$)',
    message: 'Control-center UI consumes presenter output, not presenters.',
  },
  {
    regex: '^(?:\\.\\./)+application/composition(?:/|$)',
    message: 'Control-center UI must not import runtime composition.',
  },
  {
    regex: '^(?:\\.\\./)+application/ports(?:/|$)',
    message: 'Control-center UI must not import application ports.',
  },
  {
    regex: '^(?:\\.\\./)+application/presentationLimits(?:\\.[cm]?[jt]sx?)?$',
    message: 'Control-center UI receives already-limited content through its view model.',
  },
  {
    regex: '^(?:\\.\\./)+scripts(?:/|$)',
    message: 'Control-center UI must not import root runtime scripts.',
  },
];

export const controlCenterBoundaryConfigs = [
  {
    files: ['src/features/control-center/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: uiRestrictedImportPatterns,
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
  {
    files: ['src/features/control-center/screens/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\.\\./application/controller/|\\.\\./ui/layout/).+$',
              message:
                'Control-center screens may import only the controller and layout composition boundaries.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/control-center/screens/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
] satisfies ConfigWithExtends[];
