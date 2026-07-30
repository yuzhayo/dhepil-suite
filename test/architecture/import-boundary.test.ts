import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

async function lintVirtualFile(filePath: string, source: string) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages;
}

describe('architecture import boundaries', () => {
  // ESLint lazily loads the TypeScript flat config (via jiti) on the first lint,
  // which can take tens of seconds. Warm it up once so individual cases stay fast.
  beforeAll(async () => {
    await lintVirtualFile('src/engine/warmup.ts', 'export const x = 1;');
  }, 120_000);

  // ── Forbidden imports ──

  const forbiddenCases = [
    // engine/ must not import ui/, App.tsx, apps/, scripts/
    ['engine → ui', 'src/engine/fixture.ts', "import '../../ui/ProjectCard';"],
    ['engine → App.tsx', 'src/engine/fixture.ts', "import '../App';"],
    ['engine → apps', 'src/engine/fixture.ts', "import '../../apps/dhepil/main';"],
    ['engine → scripts', 'src/engine/fixture.ts', "import '../../scripts/project-manager';"],
    ['engine → ControlCenterScreen', 'src/engine/fixture.ts', "import '../ControlCenterScreen';"],

    // engine/children/ must not import sibling children
    [
      'child → sibling child',
      'src/engine/children/projectLifecycle.ts',
      "import './projectRefresh';",
    ],
    ['child → sibling quickKill', 'src/engine/children/projectRefresh.ts', "import './quickKill';"],

    // engine/children/ inherits engine restrictions
    ['child → ui', 'src/engine/children/fixture.ts', "import '../../../ui/ProjectCard';"],
    ['child → apps', 'src/engine/children/fixture.ts', "import '../../../apps/dhepil/main';"],
    [
      'child → scripts',
      'src/engine/children/fixture.ts',
      "import '../../../scripts/project-manager';",
    ],

    // ui/ must not import engine modules (except contracts)
    ['ui → engine httpClient', 'ui/fixture.ts', "import '../src/engine/httpClient';"],
    ['ui → engine index', 'ui/fixture.ts', "import '../src/engine/index';"],
    ['ui → engine children', 'ui/fixture.ts', "import '../src/engine/children/projectLifecycle';"],
    ['ui → scripts', 'ui/fixture.ts', "import '../scripts/project-manager';"],

    // ui/ children must not import sibling children or the layout parent
    ['ui child → sibling ui child', 'ui/header/fixture.ts', "import '../toolbar/Toolbar';"],
    ['ui child → CoreLayout parent', 'ui/header/fixture.ts', "import '../CoreLayout';"],
  ] as const;

  it.each(forbiddenCases)(
    '%s is rejected by no-restricted-imports',
    async (_name, filePath, source) => {
      const messages = await lintVirtualFile(filePath, source);
      expect(
        messages.some(
          (message) => message.ruleId === 'no-restricted-imports' && message.severity === 2,
        ),
      ).toBe(true);
    },
  );

  // ── Allowed imports ──

  it.each([
    // engine may import its own modules
    ['engine internal (contracts)', "import type { ProjectSummary } from './contracts';"],
    ['engine internal (domain)', "import { deriveActionPolicy } from './projectActionPolicy';"],
    ['engine internal (data)', "import { createHttpClient } from './httpClient';"],
  ])('allows engine to import %s', async (_name, source) => {
    const messages = await lintVirtualFile('src/engine/fixture.ts', source);
    expect(messages.filter((m) => m.ruleId === 'no-restricted-imports')).toEqual([]);
  });

  it.each([
    // engine/children may import parent engine modules
    ['parent contracts', "import type { ProjectSummary } from '../contracts';"],
    ['parent httpClient', "import { createHttpClient } from '../httpClient';"],
    ['parent domain', "import { deriveActionPolicy } from '../projectActionPolicy';"],
  ])('allows a child to import %s', async (_name, source) => {
    const messages = await lintVirtualFile('src/engine/children/projectLifecycle.ts', source);
    expect(messages.filter((m) => m.ruleId === 'no-restricted-imports')).toEqual([]);
  });

  it('allows contracts.ts to import from projectCollection.ts', async () => {
    const messages = await lintVirtualFile(
      'src/engine/contracts.ts',
      "import type { ProjectSortMode } from './projectCollection';",
    );
    expect(messages.filter((m) => m.ruleId === 'no-restricted-imports')).toEqual([]);
  });

  it.each([
    // ui may import peer UI, local CSS, antd, and engine/contracts (shared types)
    ['AntD', "import { Empty } from 'antd';"],
    ['peer UI component', "import { ProjectCard } from './Card';"],
    ['local CSS', "import './CardGrid.css';"],
    ['local definition', "import { gridDefinition } from './gridDefinition';"],
    [
      'engine contracts (shared types)',
      "import type { ProjectCardViewModel } from '../../src/engine/contracts';",
    ],
  ])('allows ui to import %s', async (_name, source) => {
    const messages = await lintVirtualFile('ui/card-grid/fixture.ts', source);
    expect(messages.filter((m) => m.ruleId === 'no-restricted-imports')).toEqual([]);
  });

  it.each([
    // ControlCenterScreen may import engine and ui (composition root)
    ['engine index', "import { useEngine } from './engine';"],
    ['engine contracts', "import type { ProjectSummary } from './engine/contracts';"],
    ['ui layout', "import { CoreLayout } from '../ui/CoreLayout';"],
    ['ui toolbar', "import { ProjectToolbar } from '../ui/toolbar/Toolbar';"],
  ])('allows ControlCenterScreen to import %s', async (_name, source) => {
    const messages = await lintVirtualFile('src/ControlCenterScreen.tsx', source);
    expect(messages.filter((m) => m.ruleId === 'no-restricted-imports')).toEqual([]);
  });

  // Test files should not be restricted
  it('allows test files in engine/children/ to import siblings', async () => {
    const messages = await lintVirtualFile(
      'src/engine/children/projectLifecycle.test.ts',
      "import './projectRefresh';",
    );
    expect(messages.filter((m) => m.ruleId === 'no-restricted-imports')).toEqual([]);
  });
});
