import { describe, expect, it, vi } from 'vitest';

import { getAppValidationCommands, validateReleaseApp } from './appReleaseCommands.ts';
import type { ReleaseWorkspaceApp } from './appReleaseWorkspace.ts';

const app: ReleaseWorkspaceApp = {
  id: 'clipboard',
  name: 'Clipboard',
  packageName: '@dhepil-suite/clipboard',
  version: '0.1.0',
  directory: 'C:/repo/apps/clipboard',
  relativePath: 'apps/clipboard',
  desktopEnabled: true,
};

describe('appReleaseCommands', () => {
  it('targets only the affected workspace for typecheck and renderer build', () => {
    expect(getAppValidationCommands(app).map((command) => command.args)).toEqual([
      ['run', 'typecheck', '--workspace', '@dhepil-suite/clipboard'],
      ['run', 'build', '--workspace', '@dhepil-suite/clipboard'],
    ]);
  });

  it('runs validation sequentially and stops at the first failure', async () => {
    const runner = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('build failed'));

    await expect(validateReleaseApp('C:/repo', app, runner)).rejects.toThrow('build failed');
    expect(runner).toHaveBeenCalledTimes(2);
  });
});
