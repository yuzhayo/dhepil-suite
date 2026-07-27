import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

async function lintVirtualFile(filePath: string, source: string) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages;
}

describe('control-center import boundaries', () => {
  const forbiddenCases = [
    ['ui', 'src/features/control-center/ui/fixture.ts', "import '../data/client';"],
    [
      'ui → controller',
      'src/features/control-center/ui/fixture.ts',
      "import '../application/controller/client';",
    ],
    [
      'ui → commands',
      'src/features/control-center/ui/fixture.ts',
      "import '../application/commands/client';",
    ],
    [
      'ui → extensions',
      'src/features/control-center/ui/fixture.ts',
      "import '../application/extensions/client';",
    ],
    [
      'ui → scripts',
      'src/features/control-center/ui/fixture.ts',
      "import '../../../scripts/project-manager';",
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
