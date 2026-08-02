import { describe, expect, it } from 'vitest';

import { parseReleaseCliArgs } from './appReleaseCli.ts';

describe('appReleaseCli', () => {
  it('parses changed dry-run mode', () => {
    expect(parseReleaseCliArgs(['changed', '--dry-run'])).toEqual({
      mode: 'changed',
      appId: undefined,
      dryRun: true,
      includeElectron: false,
      help: false,
    });
  });

  it('parses a targeted desktop-aware release', () => {
    expect(parseReleaseCliArgs(['app', 'clipboard', '--include-electron'])).toEqual({
      mode: 'app',
      appId: 'clipboard',
      dryRun: false,
      includeElectron: true,
      help: false,
    });
  });

  it('rejects missing app ids and unknown options', () => {
    expect(() => parseReleaseCliArgs(['app'])).toThrow(/tepat satu app id/i);
    expect(() => parseReleaseCliArgs(['changed', '--force'])).toThrow(/tidak dikenal/i);
  });
});
