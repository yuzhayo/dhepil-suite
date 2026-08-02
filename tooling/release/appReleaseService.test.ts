import { describe, expect, it } from 'vitest';

import { getReleaseImpactPaths } from './appReleaseService.ts';
import type { ReleaseWorkspaceApp } from './appReleaseWorkspace.ts';

const baseApp: ReleaseWorkspaceApp = {
  id: 'alpha',
  name: 'Alpha',
  packageName: '@dhepil-suite/alpha',
  version: '0.1.0',
  directory: 'C:/repo/apps/alpha',
  relativePath: 'apps/alpha',
  desktopEnabled: false,
};

describe('appReleaseService', () => {
  it('tracks app source and shared UI without Electron by default', () => {
    expect(getReleaseImpactPaths(baseApp, false)).toEqual(['apps/alpha', 'ui']);
  });

  it('only includes Electron when explicitly requested for a desktop-enabled app', () => {
    expect(getReleaseImpactPaths(baseApp, true)).toEqual(['apps/alpha', 'ui']);
    expect(getReleaseImpactPaths({ ...baseApp, desktopEnabled: true }, true)).toEqual([
      'apps/alpha',
      'ui',
      'electron',
    ]);
  });
});
