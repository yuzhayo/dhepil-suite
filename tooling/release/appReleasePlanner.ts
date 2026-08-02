import {
  bumpVersion,
  classifyReleaseCommit,
  highestBump,
  parseVersion,
  type BumpLevel,
  type ClassifiedReleaseCommit,
  type ReleaseCommit,
} from './appReleasePolicy.ts';

export interface LatestReleaseTag {
  name: string;
  version: string;
}

interface AppReleasePlanBase {
  appId: string;
  currentVersion: string;
}

export interface SkipAppReleasePlan extends AppReleasePlanBase {
  kind: 'skip';
  reason: 'no-releasable-commits';
  commits: readonly ClassifiedReleaseCommit[];
}

export interface BootstrapAppReleasePlan extends AppReleasePlanBase {
  kind: 'bootstrap';
  nextVersion: string;
  tagName: string;
  bump: null;
  commits: readonly [];
}

export interface VersionedAppReleasePlan extends AppReleasePlanBase {
  kind: 'release';
  nextVersion: string;
  tagName: string;
  bump: BumpLevel;
  commits: readonly ClassifiedReleaseCommit[];
}

export type AppReleasePlan = SkipAppReleasePlan | BootstrapAppReleasePlan | VersionedAppReleasePlan;

export interface PlanAppReleaseInput {
  appId: string;
  currentVersion: string;
  latestTag: LatestReleaseTag | null;
  commits: readonly ReleaseCommit[];
}

export function planAppRelease(input: PlanAppReleaseInput): AppReleasePlan {
  parseVersion(input.currentVersion);

  if (!input.latestTag) {
    return {
      kind: 'bootstrap',
      appId: input.appId,
      currentVersion: input.currentVersion,
      nextVersion: input.currentVersion,
      tagName: `${input.appId}-v${input.currentVersion}`,
      bump: null,
      commits: [],
    };
  }

  parseVersion(input.latestTag.version);

  const expectedTagName = `${input.appId}-v${input.latestTag.version}`;
  if (input.latestTag.name !== expectedTagName) {
    throw new Error(
      `Tag release "${input.latestTag.name}" tidak cocok dengan format "${expectedTagName}".`,
    );
  }

  if (input.latestTag.version !== input.currentVersion) {
    throw new Error(
      `Version drift untuk ${input.appId}: package ${input.currentVersion}, tag terakhir ${input.latestTag.version}.`,
    );
  }

  const commits = input.commits.map(classifyReleaseCommit);
  const bump = highestBump(commits);

  if (!bump) {
    return {
      kind: 'skip',
      appId: input.appId,
      currentVersion: input.currentVersion,
      reason: 'no-releasable-commits',
      commits,
    };
  }

  const nextVersion = bumpVersion(input.currentVersion, bump);

  return {
    kind: 'release',
    appId: input.appId,
    currentVersion: input.currentVersion,
    nextVersion,
    tagName: `${input.appId}-v${nextVersion}`,
    bump,
    commits: commits.filter((commit) => commit.bump !== null),
  };
}
