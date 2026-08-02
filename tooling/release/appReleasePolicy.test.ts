import { describe, expect, it } from 'vitest';

import {
  bumpVersion,
  classifyReleaseCommit,
  highestBump,
  parseVersion,
  type ReleaseCommit,
} from './appReleasePolicy.ts';

function commit(subject: string, body = ''): ReleaseCommit {
  return { hash: '1234567890', subject, body };
}

describe('appReleasePolicy', () => {
  it('parses and bumps strict numeric semver', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4');
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0');
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0');
    expect(() => parseVersion('v1.2.3')).toThrow(/semver/i);
    expect(() => parseVersion('1.2')).toThrow(/semver/i);
  });

  it.each([
    ['feat(ui): add search', 'minor', 'added'],
    ['fix: avoid crash', 'patch', 'fixed'],
    ['perf: reduce work', 'patch', 'fixed'],
    ['refactor: split engine', 'patch', 'changed'],
    ['revert: remove regression', 'patch', 'changed'],
    ['build: update renderer', 'patch', 'changed'],
    ['security: sanitize input', 'patch', 'security'],
    ['chore(deps): update antd', 'patch', 'changed'],
    ['docs: explain setup', null, null],
    ['test: cover release', null, null],
    ['style: format source', null, null],
    ['ci: update workflow', null, null],
    ['chore: tidy files', null, null],
    ['plain commit message', 'patch', 'changed'],
  ] as const)('classifies %s', (subject, bump, category) => {
    expect(classifyReleaseCommit(commit(subject))).toMatchObject({ bump, category });
  });

  it('uses major for bang and breaking footer commits', () => {
    expect(classifyReleaseCommit(commit('feat(api)!: replace format')).bump).toBe('major');
    expect(
      classifyReleaseCommit(commit('fix: adjust format', 'BREAKING CHANGE: old files stop working'))
        .bump,
    ).toBe('major');
  });

  it('ignores generated release commits', () => {
    expect(classifyReleaseCommit(commit('chore(release): clipboard v0.2.0'))).toMatchObject({
      bump: null,
      category: null,
      ignored: true,
    });
  });

  it('selects the highest release impact', () => {
    const commits = [
      classifyReleaseCommit(commit('fix: one')),
      classifyReleaseCommit(commit('feat: two')),
      classifyReleaseCommit(commit('docs: three')),
    ];

    expect(highestBump(commits)).toBe('minor');
    expect(highestBump([classifyReleaseCommit(commit('docs: only'))])).toBeNull();
  });
});
