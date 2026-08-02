import {
  assertCleanWorkspace,
  assertGitIdentity,
  assertTagAvailable,
  commitRelease,
  createReleaseTag,
  deleteReleaseTag,
  getLatestReleaseTag,
  hasStagedReleaseChanges,
  listReleaseCommits,
  stageReleaseFiles,
  unstageReleaseFiles,
} from './appReleaseGit.ts';
import { planAppRelease, type AppReleasePlan } from './appReleasePlanner.ts';
import { validateReleaseApp } from './appReleaseCommands.ts';
import {
  applyAppReleaseFiles,
  captureReleaseFiles,
  discoverReleaseApps,
  getReleaseFilePaths,
  restoreReleaseFiles,
  type ReleaseWorkspaceApp,
} from './appReleaseWorkspace.ts';

export interface WorkspaceReleaseRequest {
  mode: 'changed' | 'app';
  appId?: string;
  includeElectron: boolean;
}

export interface PlannedWorkspaceRelease {
  app: ReleaseWorkspaceApp;
  plan: AppReleasePlan;
  impactPaths: readonly string[];
}

export interface ExecutedWorkspaceRelease {
  committed: boolean;
  tags: readonly string[];
}

export function getReleaseImpactPaths(
  app: ReleaseWorkspaceApp,
  includeElectron: boolean,
): string[] {
  const paths = [app.relativePath, 'ui'];

  if (includeElectron && app.desktopEnabled) {
    paths.push('electron');
  }

  return paths;
}

export async function createWorkspaceReleasePlans(
  repoRoot: string,
  request: WorkspaceReleaseRequest,
): Promise<PlannedWorkspaceRelease[]> {
  const discoveredApps = await discoverReleaseApps(repoRoot);
  let selectedApps = discoveredApps;

  if (request.mode === 'app') {
    const app = discoveredApps.find((candidate) => candidate.id === request.appId);
    if (!app) {
      const available = discoveredApps.map((candidate) => candidate.id).join(', ') || 'none';
      throw new Error(`App "${request.appId ?? ''}" tidak ditemukan. Available: ${available}.`);
    }
    selectedApps = [app];
  }

  return Promise.all(
    selectedApps.map(async (app) => {
      const latestTag = await getLatestReleaseTag(repoRoot, app.id);
      const impactPaths = getReleaseImpactPaths(app, request.includeElectron);
      const commits = latestTag
        ? await listReleaseCommits(repoRoot, latestTag.name, impactPaths)
        : [];

      return {
        app,
        impactPaths,
        plan: planAppRelease({
          appId: app.id,
          currentVersion: app.version,
          latestTag,
          commits,
        }),
      };
    }),
  );
}

function releaseRelativeFilePaths(releases: readonly PlannedWorkspaceRelease[]): string[] {
  return [
    ...new Set(
      releases.flatMap(({ app }) => [
        `${app.relativePath}/package.json`,
        `${app.relativePath}/CHANGELOG.md`,
        'package-lock.json',
      ]),
    ),
  ];
}

function createReleaseCommitMessage(releases: readonly PlannedWorkspaceRelease[]): {
  subject: string;
  body: string;
} {
  const versions = releases.map(({ app, plan }) => {
    if (plan.kind === 'skip') {
      throw new Error(`Tidak dapat membuat commit untuk skipped app ${app.id}.`);
    }
    return `${app.id} v${plan.nextVersion}`;
  });

  return {
    subject:
      versions.length === 1
        ? `chore(release): ${versions[0]}`
        : `chore(release): publish ${versions.length} app versions`,
    body: ['Automated app release:', '', ...versions.map((version) => `- ${version}`)].join('\n'),
  };
}

export async function executeWorkspaceReleases(
  repoRoot: string,
  plannedReleases: readonly PlannedWorkspaceRelease[],
  releaseDate = new Date().toISOString().slice(0, 10),
): Promise<ExecutedWorkspaceRelease> {
  const releases = plannedReleases.filter(
    (
      release,
    ): release is PlannedWorkspaceRelease & {
      plan: Exclude<AppReleasePlan, { kind: 'skip' }>;
    } => release.plan.kind !== 'skip',
  );

  if (releases.length === 0) {
    return { committed: false, tags: [] };
  }

  await assertCleanWorkspace(repoRoot);
  await assertGitIdentity(repoRoot);
  await Promise.all(releases.map(({ plan }) => assertTagAvailable(repoRoot, plan.tagName)));

  const snapshots = await captureReleaseFiles(
    releases.flatMap(({ app }) => getReleaseFilePaths(repoRoot, app)),
  );
  const relativeFilePaths = releaseRelativeFilePaths(releases);
  let staged = false;
  let committed = false;
  const createdTags: string[] = [];

  try {
    for (const { app, plan } of releases) {
      await applyAppReleaseFiles(repoRoot, app, plan, releaseDate);
    }

    for (const { app } of releases) {
      await validateReleaseApp(repoRoot, app);
    }

    await stageReleaseFiles(repoRoot, relativeFilePaths);
    staged = true;

    if (await hasStagedReleaseChanges(repoRoot, relativeFilePaths)) {
      const message = createReleaseCommitMessage(releases);
      await commitRelease(repoRoot, message.subject, message.body);
      committed = true;
      staged = false;
    }

    for (const { app, plan } of releases) {
      await createReleaseTag(repoRoot, plan.tagName, `${app.name} v${plan.nextVersion}`);
      createdTags.push(plan.tagName);
    }

    return { committed, tags: createdTags };
  } catch (error) {
    if (!committed) {
      if (staged) {
        await unstageReleaseFiles(repoRoot, relativeFilePaths);
      }
      await restoreReleaseFiles(snapshots);
    } else {
      await Promise.all(
        createdTags.map(async (tagName) => {
          try {
            await deleteReleaseTag(repoRoot, tagName);
          } catch {
            // Preserve the primary failure; any surviving local tag is reported by git status/tag inspection.
          }
        }),
      );
    }

    throw error;
  }
}
