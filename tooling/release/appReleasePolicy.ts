export type BumpLevel = 'major' | 'minor' | 'patch';

export type ChangelogCategory = 'added' | 'changed' | 'fixed' | 'removed' | 'security';

export interface ReleaseCommit {
  hash: string;
  subject: string;
  body: string;
}

export interface ClassifiedReleaseCommit extends ReleaseCommit {
  bump: BumpLevel | null;
  category: ChangelogCategory | null;
  summary: string;
  ignored: boolean;
}

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const CONVENTIONAL_PATTERN = /^([a-zA-Z]+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/;
const BREAKING_PATTERN = /^BREAKING(?: |-)?CHANGE:\s+/im;

const BUMP_PRIORITY: Readonly<Record<BumpLevel, number>> = {
  patch: 1,
  minor: 2,
  major: 3,
};

export function parseVersion(version: string): ParsedVersion {
  const match = VERSION_PATTERN.exec(version);

  if (!match) {
    throw new Error(`Version "${version}" harus memakai semver numerik x.y.z.`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function bumpVersion(version: string, bump: BumpLevel): string {
  const parsed = parseVersion(version);

  if (bump === 'major') {
    return `${parsed.major + 1}.0.0`;
  }

  if (bump === 'minor') {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }

  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

export function classifyReleaseCommit(commit: ReleaseCommit): ClassifiedReleaseCommit {
  const subject = commit.subject.trim();
  const conventional = CONVENTIONAL_PATTERN.exec(subject);
  const type = conventional?.[1]?.toLowerCase();
  const scope = conventional?.[2]?.toLowerCase();
  const summary = conventional?.[4]?.trim() || subject;
  const breaking = Boolean(conventional?.[3]) || BREAKING_PATTERN.test(commit.body);

  if (type === 'chore' && scope === 'release') {
    return { ...commit, bump: null, category: null, summary, ignored: true };
  }

  if (breaking) {
    return { ...commit, bump: 'major', category: 'changed', summary, ignored: false };
  }

  if (!conventional) {
    return { ...commit, bump: 'patch', category: 'changed', summary, ignored: false };
  }

  if (type === 'feat') {
    return { ...commit, bump: 'minor', category: 'added', summary, ignored: false };
  }

  if (type === 'security') {
    return { ...commit, bump: 'patch', category: 'security', summary, ignored: false };
  }

  if (type === 'fix' || type === 'perf') {
    return { ...commit, bump: 'patch', category: 'fixed', summary, ignored: false };
  }

  if (type === 'refactor' || type === 'revert' || type === 'build') {
    return { ...commit, bump: 'patch', category: 'changed', summary, ignored: false };
  }

  if (type === 'chore' && scope === 'deps') {
    return { ...commit, bump: 'patch', category: 'changed', summary, ignored: false };
  }

  return { ...commit, bump: null, category: null, summary, ignored: false };
}

export function highestBump(commits: readonly ClassifiedReleaseCommit[]): BumpLevel | null {
  return commits.reduce<BumpLevel | null>((highest, commit) => {
    if (!commit.bump) {
      return highest;
    }

    if (!highest || BUMP_PRIORITY[commit.bump] > BUMP_PRIORITY[highest]) {
      return commit.bump;
    }

    return highest;
  }, null);
}
