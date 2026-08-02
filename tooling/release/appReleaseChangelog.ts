import {
  parseVersion,
  type ChangelogCategory,
  type ClassifiedReleaseCommit,
} from './appReleasePolicy.ts';

const UNRELEASED_MARKER = '## [Unreleased]';

const CATEGORY_HEADINGS: Readonly<Record<ChangelogCategory, string>> = {
  added: 'Added',
  changed: 'Changed',
  fixed: 'Fixed',
  removed: 'Removed',
  security: 'Security',
};

const CATEGORY_ORDER = Object.keys(CATEGORY_HEADINGS) as ChangelogCategory[];

export interface ChangelogReleaseInput {
  version: string;
  date: string;
  commits: readonly ClassifiedReleaseCommit[];
}

function assertDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Tanggal changelog "${date}" harus memakai format YYYY-MM-DD.`);
  }
}

function renderDocumentHeader(appName: string, newline: string): string {
  return [
    '# Changelog',
    '',
    `Riwayat release ${appName} dikelola otomatis oleh tooling root. Jangan edit file ini secara manual.`,
    '',
    UNRELEASED_MARKER,
    '',
  ].join(newline);
}

export function createInitialChangelog(appName: string, version: string, date: string): string {
  parseVersion(version);
  assertDate(date);

  return [
    renderDocumentHeader(appName, '\n').trimEnd(),
    '',
    `## [${version}] - ${date}`,
    '',
    '### Added',
    '',
    '- Initial tracked application baseline.',
    '',
  ].join('\n');
}

export function createEmptyChangelog(appName: string): string {
  return renderDocumentHeader(appName, '\n');
}

export function addReleaseToChangelog(
  existingChangelog: string,
  input: ChangelogReleaseInput,
): string {
  parseVersion(input.version);
  assertDate(input.date);

  if (!existingChangelog.includes(UNRELEASED_MARKER)) {
    throw new Error(`Changelog tidak memiliki marker "${UNRELEASED_MARKER}".`);
  }

  if (existingChangelog.includes(`## [${input.version}]`)) {
    throw new Error(`Changelog sudah memiliki release ${input.version}.`);
  }

  const newline = existingChangelog.includes('\r\n') ? '\r\n' : '\n';
  const sections: string[] = [];

  for (const category of CATEGORY_ORDER) {
    const commits = input.commits.filter((commit) => commit.category === category);
    if (commits.length === 0) {
      continue;
    }

    sections.push(`### ${CATEGORY_HEADINGS[category]}`);
    sections.push('');

    for (const commit of commits) {
      const summary = commit.summary.replaceAll('`', "'").trim();
      if (!summary) {
        throw new Error(`Commit ${commit.hash} tidak memiliki ringkasan changelog.`);
      }

      sections.push(`- ${summary} (\`${commit.hash.slice(0, 7)}\`)`);
    }

    sections.push('');
  }

  if (sections.length === 0) {
    throw new Error(`Release ${input.version} tidak memiliki entry changelog.`);
  }

  const releaseSection = [`## [${input.version}] - ${input.date}`, '', ...sections].join(newline);

  return existingChangelog.replace(
    UNRELEASED_MARKER,
    `${UNRELEASED_MARKER}${newline}${newline}${releaseSection.trimEnd()}`,
  );
}
