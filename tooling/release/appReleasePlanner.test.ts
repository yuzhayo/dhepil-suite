import { describe, expect, it } from 'vitest';

import { planAppRelease } from './appReleasePlanner.ts';

describe('planAppRelease', () => {
  it('bootstraps an untagged app without changing its current version', () => {
    expect(
      planAppRelease({
        appId: 'clipboard',
        currentVersion: '0.1.0',
        latestTag: null,
        commits: [{ hash: 'abc', subject: 'feat: existing work', body: '' }],
      }),
    ).toEqual({
      kind: 'bootstrap',
      appId: 'clipboard',
      currentVersion: '0.1.0',
      nextVersion: '0.1.0',
      tagName: 'clipboard-v0.1.0',
      bump: null,
      commits: [],
    });
  });

  it('rejects package and tag version drift', () => {
    expect(() =>
      planAppRelease({
        appId: 'clipboard',
        currentVersion: '0.2.0',
        latestTag: { name: 'clipboard-v0.1.0', version: '0.1.0' },
        commits: [],
      }),
    ).toThrow(/version drift/i);
  });

  it('skips when all relevant commits have no release impact', () => {
    expect(
      planAppRelease({
        appId: 'clipboard',
        currentVersion: '0.1.0',
        latestTag: { name: 'clipboard-v0.1.0', version: '0.1.0' },
        commits: [
          { hash: 'abc', subject: 'docs: improve guide', body: '' },
          { hash: 'def', subject: 'chore(release): clipboard v0.1.0', body: '' },
        ],
      }),
    ).toMatchObject({ kind: 'skip', reason: 'no-releasable-commits' });
  });

  it('uses the highest commit impact for the next version', () => {
    const plan = planAppRelease({
      appId: 'clipboard',
      currentVersion: '1.4.2',
      latestTag: { name: 'clipboard-v1.4.2', version: '1.4.2' },
      commits: [
        { hash: 'abc', subject: 'fix: patch', body: '' },
        { hash: 'def', subject: 'feat: feature', body: '' },
      ],
    });

    expect(plan).toMatchObject({
      kind: 'release',
      bump: 'minor',
      currentVersion: '1.4.2',
      nextVersion: '1.5.0',
      tagName: 'clipboard-v1.5.0',
    });
  });

  it('rejects a tag name that does not follow the app contract', () => {
    expect(() =>
      planAppRelease({
        appId: 'clipboard',
        currentVersion: '0.1.0',
        latestTag: { name: 'v0.1.0', version: '0.1.0' },
        commits: [],
      }),
    ).toThrow(/format/i);
  });
});
