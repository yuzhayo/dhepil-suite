import { describe, expect, it } from 'vitest';

import { classifyReleaseCommit } from './appReleasePolicy.ts';
import {
  addReleaseToChangelog,
  createEmptyChangelog,
  createInitialChangelog,
} from './appReleaseChangelog.ts';

describe('appReleaseChangelog', () => {
  it('creates a tracked baseline without manual placeholders', () => {
    const changelog = createInitialChangelog('Clipboard', '0.1.0', '2026-08-01');

    expect(changelog).toContain('## [Unreleased]');
    expect(changelog).toContain('## [0.1.0] - 2026-08-01');
    expect(changelog).toContain('Initial tracked application baseline.');
    expect(changelog.endsWith('\n')).toBe(true);
  });

  it('inserts grouped release notes while preserving existing history', () => {
    const existing = `${createInitialChangelog('Clipboard', '0.1.0', '2026-08-01')}\nOlder note\n`;
    const result = addReleaseToChangelog(existing, {
      version: '0.2.0',
      date: '2026-08-02',
      commits: [
        classifyReleaseCommit({ hash: '123456789', subject: 'feat: add paste', body: '' }),
        classifyReleaseCommit({ hash: 'abcdef012', subject: 'fix: keep focus', body: '' }),
      ],
    });

    expect(result.indexOf('## [0.2.0]')).toBeLessThan(result.indexOf('## [0.1.0]'));
    expect(result).toContain('### Added');
    expect(result).toContain('- add paste (`1234567`)');
    expect(result).toContain('### Fixed');
    expect(result).toContain('- keep focus (`abcdef0`)');
    expect(result).toContain('Older note');
  });

  it('can add the first release to an empty automatic changelog', () => {
    const result = addReleaseToChangelog(createEmptyChangelog('New App'), {
      version: '1.0.0',
      date: '2026-08-02',
      commits: [
        classifyReleaseCommit({ hash: '1234567', subject: 'first implementation', body: '' }),
      ],
    });

    expect(result).toContain('## [1.0.0] - 2026-08-02');
    expect(result).toContain('### Changed');
  });

  it('rejects missing Unreleased markers and duplicate versions', () => {
    const release = {
      version: '0.2.0',
      date: '2026-08-02',
      commits: [classifyReleaseCommit({ hash: '1234567', subject: 'fix: issue', body: '' })],
    };

    expect(() => addReleaseToChangelog('# Changelog\n', release)).toThrow(/unreleased/i);

    const existing = `${createEmptyChangelog('Clipboard')}\n## [0.2.0] - 2026-08-02\n`;
    expect(() => addReleaseToChangelog(existing, release)).toThrow(/sudah memiliki/i);
  });
});
