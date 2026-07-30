import type { ConfigWithExtends } from 'typescript-eslint';

/**
 * ESLint boundary rules for the modular architecture:
 *
 *   src/engine/          — all logic (domain, data, children orchestration)
 *   ui/                  — shared generic CoreUI components at monorepo root (props only, NO engine dependency)
 *   src/ControlCenterScreen.tsx — gate / composition root (maps engine + ui)
 *
 * Import contract:
 *   engine/*             → engine internals only. NOT ui/, App.tsx, apps/
 *   engine/children/*    → engine parent modules only. NOT sibling children
 *   ui/*                 → props only. NOT engine/, scripts/
 *   ControlCenterScreen  → engine/ + ui/ (the gate that wires them)
 */

export const controlCenterBoundaryConfigs = [
  // ── engine/ must not import ui/, App.tsx, or apps/ ──
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(?:^|/)ui(?:/|$)',
              message: 'Engine must not import UI components — UI receives data via props.',
            },
            {
              regex: '(?:^|/)apps(?:/|$)',
              message: 'Engine must not import app workspaces.',
            },
            {
              regex: '(?:^|/)scripts(?:/|$)',
              message: 'Engine must not import root runtime scripts.',
            },
          ],
          paths: [
            {
              name: '../App',
              message: 'Engine must not import the app shell.',
            },
            {
              name: '../App.tsx',
              message: 'Engine must not import the app shell.',
            },
            {
              name: '../ControlCenterScreen',
              message: 'Engine must not import the composition root.',
            },
            {
              name: '../ControlCenterScreen.tsx',
              message: 'Engine must not import the composition root.',
            },
          ],
        },
      ],
    },
  },

  // ── engine/children/ must not import sibling children ──
  {
    files: ['src/engine/children/*.{ts,tsx}'],
    ignores: ['src/engine/children/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(?:^|/)ui(?:/|$)',
              message: 'Engine children must not import UI components.',
            },
            {
              regex: '(?:^|/)apps(?:/|$)',
              message: 'Engine children must not import app workspaces.',
            },
            {
              regex: '(?:^|/)scripts(?:/|$)',
              message: 'Engine children must not import root runtime scripts.',
            },
            {
              regex: '^\\./',
              message:
                'Engine children must not import sibling children — only the parent orchestrator may wire children together.',
            },
          ],
          paths: [
            {
              name: '../App',
              message: 'Engine children must not import the app shell.',
            },
            {
              name: '../App.tsx',
              message: 'Engine children must not import the app shell.',
            },
            {
              name: '../../ControlCenterScreen',
              message: 'Engine children must not import the composition root.',
            },
            {
              name: '../../ControlCenterScreen.tsx',
              message: 'Engine children must not import the composition root.',
            },
          ],
        },
      ],
    },
  },

  // ── ui/ must not import engine/ or scripts/ ──
  {
    files: ['ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(?:^|/)engine(?:/|$)',
              message:
                'UI components must not import engine modules — UI is completely generic and decoupled.',
            },
            {
              regex: '(?:^|/)scripts(?:/|$)',
              message: 'UI must not import root runtime scripts.',
            },
          ],
        },
      ],
    },
  },
  // ── ui/ children must not import sibling children or the layout parent ──
  {
    files: ['ui/*/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\./(?:header|toolbar|card-grid)',
              message: 'UI children must not import sibling UI children.',
            },
            {
              regex: '^\\.\\./CoreLayout',
              message: 'UI children must not import the parent layout orchestrator.',
            },
          ],
        },
      ],
    },
  },
] satisfies ConfigWithExtends[];
