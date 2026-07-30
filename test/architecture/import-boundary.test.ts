import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

async function lintVirtualFile(filePath: string, source: string) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages;
}

describe('control-center import boundaries', () => {
  // ESLint lazily loads the TypeScript flat config (via jiti) on the first lint,
  // which can take tens of seconds. Warm it up once so individual cases stay fast.
  beforeAll(async () => {
    await lintVirtualFile('src/features/control-center/ui/grid/warmup.ts', 'export const x = 1;');
  }, 120_000);

  const forbiddenCases = [
    ['ui → data', 'src/features/control-center/ui/grid/fixture.ts', "import '../../data/client';"],
    [
      'ui → domain',
      'src/features/control-center/ui/grid/fixture.ts',
      "import '../../domain/projectStatus';",
    ],
    [
      'nested ui → domain',
      'src/features/control-center/ui/card/internal/fixture.ts',
      "import '../../../domain/projectStatus';",
    ],
    [
      'ui → raw feature types',
      'src/features/control-center/ui/grid/fixture.ts',
      "import type { ProjectSummary } from '../../types';",
    ],
    [
      'ui → controller',
      'src/features/control-center/ui/grid/fixture.ts',
      "import '../../application/controller/client';",
    ],
    [
      'ui → commands',
      'src/features/control-center/ui/grid/fixture.ts',
      "import '../../application/commands/client';",
    ],
    [
      'ui → extensions',
      'src/features/control-center/ui/grid/fixture.ts',
      "import '../../application/extensions/client';",
    ],
    [
      'ui → presenters',
      'src/features/control-center/ui/grid/fixture.ts',
      "import '../../application/presenters/createGridViewModel';",
    ],
    [
      'ui → composition',
      'src/features/control-center/ui/grid/fixture.ts',
      "import '../../application/composition/createControlCenterRuntime';",
    ],
    [
      'ui → ports',
      'src/features/control-center/ui/grid/fixture.ts',
      "import type { ProjectManagerClient } from '../../application/ports/ProjectManagerClient';",
    ],
    [
      'ui → presentation limits',
      'src/features/control-center/ui/grid/fixture.ts',
      "import { MAX_RENDERED_LOG_LINES } from '../../application/presentationLimits';",
    ],
    [
      'ui → screens',
      'src/features/control-center/ui/grid/fixture.ts',
      "import '../../screens/ControlCenterScreen';",
    ],
    [
      'ui → scripts',
      'src/features/control-center/ui/grid/fixture.ts',
      "import '../../../../../scripts/project-manager';",
    ],
    ['domain → react', 'src/features/control-center/domain/fixture.ts', "import 'react';"],
    ['domain → antd', 'src/features/control-center/domain/fixture.ts', "import 'antd';"],
    ['domain → data', 'src/features/control-center/domain/fixture.ts', "import '../data/client';"],
    ['domain → ui', 'src/features/control-center/domain/fixture.ts', "import '../ui/client';"],
    [
      'domain → application',
      'src/features/control-center/domain/fixture.ts',
      "import '../application/client';",
    ],
    [
      'domain → scripts',
      'src/features/control-center/domain/fixture.ts',
      "import '../../../scripts/project-manager';",
    ],
    [
      'extensions → sibling module',
      'src/features/control-center/application/extensions/modules/project-refresh/index.ts',
      "import '../quick-kill';",
    ],
    [
      'extensions → ui',
      'src/features/control-center/application/extensions/fixture.ts',
      "import '../../ui/client';",
    ],
    [
      'extensions → scripts',
      'src/features/control-center/application/extensions/fixture.ts',
      "import '../../../../scripts/project-manager';",
    ],
    ['data → ui', 'src/features/control-center/data/fixture.ts', "import '../ui/client';"],
    [
      'data → controller',
      'src/features/control-center/data/fixture.ts',
      "import '../application/controller/client';",
    ],
    [
      'data → commands',
      'src/features/control-center/data/fixture.ts',
      "import '../application/commands/client';",
    ],
    [
      'data → extensions',
      'src/features/control-center/data/fixture.ts',
      "import '../application/extensions/client';",
    ],
    [
      'data → composition',
      'src/features/control-center/data/fixture.ts',
      "import '../application/composition/client';",
    ],
    [
      'data → scripts',
      'src/features/control-center/data/fixture.ts',
      "import '../../../scripts/project-manager';",
    ],
    [
      'controller → data',
      'src/features/control-center/application/controller/fixture.ts',
      "import '../../data/client';",
    ],
    [
      'controller → ui',
      'src/features/control-center/application/controller/fixture.ts',
      "import '../../ui/client';",
    ],
    [
      'controller → scripts',
      'src/features/control-center/application/controller/fixture.ts',
      "import '../../../../scripts/project-manager';",
    ],
    [
      'composition → ui',
      'src/features/control-center/application/composition/fixture.ts',
      "import '../../ui/client';",
    ],
    [
      'composition → screens',
      'src/features/control-center/application/composition/fixture.ts',
      "import '../../screens/ControlCenterScreen';",
    ],
    [
      'screen → AntD',
      'src/features/control-center/screens/fixture.tsx',
      "import { Button } from 'antd';",
    ],
    [
      'screen → data',
      'src/features/control-center/screens/fixture.tsx',
      "import '../data/httpProjectManagerClient';",
    ],
    [
      'screen → commands',
      'src/features/control-center/screens/fixture.tsx',
      "import '../application/commands/refreshProjects';",
    ],
    [
      'screen → presenter',
      'src/features/control-center/screens/fixture.tsx',
      "import '../application/presenters/createControlCenterViewModel';",
    ],
    [
      'screen → peer UI',
      'src/features/control-center/screens/fixture.tsx',
      "import '../ui/toolbar/ProjectToolbar';",
    ],
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

  it('allows the composition → data edge', async () => {
    const messages = await lintVirtualFile(
      'src/features/control-center/application/composition/fixture.ts',
      "import '../../data/httpProjectManagerClient';",
    );
    expect(messages.filter((message) => message.ruleId === 'no-restricted-imports')).toEqual([]);
  });

  it.each([
    [
      'application view-model contract',
      "import type { ProjectGridViewModel } from '../../application/view-models';",
    ],
    ['AntD', "import { Empty } from 'antd';"],
    ['local UI owner', "import { gridDefinition } from './gridDefinition';"],
    ['peer UI owner', "import { ProjectCard } from '../card/ProjectCard';"],
    ['local CSS', "import './ProjectGrid.css';"],
  ])('allows UI to import its %s', async (_name, source) => {
    const messages = await lintVirtualFile(
      'src/features/control-center/ui/grid/fixture.ts',
      source,
    );
    expect(messages.filter((message) => message.ruleId === 'no-restricted-imports')).toEqual([]);
  });

  it.each([
    ['internal extension file', "import './internal';"],
    ['public extension contract', "import '../../contracts';"],
  ])('allows an extension module to import its %s', async (_name, source) => {
    const messages = await lintVirtualFile(
      'src/features/control-center/application/extensions/modules/project-refresh/index.ts',
      source,
    );
    expect(messages.filter((message) => message.ruleId === 'no-restricted-imports')).toEqual([]);
  });

  it.each([
    [
      'controller boundary',
      "import { useControlCenterController } from '../application/controller/useControlCenterController';",
    ],
    ['layout boundary', "import { ControlCenterLayout } from '../ui/layout/ControlCenterLayout';"],
  ])('allows a screen to import the %s', async (_name, source) => {
    const messages = await lintVirtualFile(
      'src/features/control-center/screens/fixture.tsx',
      source,
    );
    expect(messages.filter((message) => message.ruleId === 'no-restricted-imports')).toEqual([]);
  });
});
