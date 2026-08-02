import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { discoverProjects } from '../../scripts/project-discovery.ts';
import { parseVersion } from './appReleasePolicy.ts';
import {
  addReleaseToChangelog,
  createEmptyChangelog,
  createInitialChangelog,
} from './appReleaseChangelog.ts';
import type { AppReleasePlan } from './appReleasePlanner.ts';

export interface ReleaseWorkspaceApp {
  id: string;
  name: string;
  packageName: string;
  version: string;
  directory: string;
  relativePath: string;
  desktopEnabled: boolean;
}

export interface ReleaseFileSnapshot {
  filePath: string;
  contents: string | null;
}

interface JsonObject {
  [key: string]: unknown;
}

function parseJsonObject(raw: string, label: string): JsonObject {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} bukan JSON yang valid.`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} harus berupa object JSON.`);
  }

  return parsed as JsonObject;
}

async function readOptionalFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function writeFileAtomic(filePath: string, contents: string): Promise<void> {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, contents, 'utf8');

  try {
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function discoverReleaseApps(repoRoot: string): Promise<ReleaseWorkspaceApp[]> {
  const projects = await discoverProjects(repoRoot, resolve(repoRoot, 'apps'));
  const apps: ReleaseWorkspaceApp[] = [];

  for (const project of projects) {
    if (!project.valid) {
      continue;
    }

    const packagePath = resolve(project.directory, 'package.json');
    const packageJson = parseJsonObject(await readFile(packagePath, 'utf8'), packagePath);

    if (typeof packageJson.name !== 'string' || !packageJson.name.trim()) {
      throw new Error(`${project.relativePath}/package.json wajib memiliki name.`);
    }

    if (typeof packageJson.version !== 'string') {
      throw new Error(`${project.relativePath}/package.json wajib memiliki version.`);
    }

    parseVersion(packageJson.version);

    apps.push({
      id: project.id,
      name: project.name,
      packageName: packageJson.name,
      version: packageJson.version,
      directory: project.directory,
      relativePath: project.relativePath,
      desktopEnabled: project.desktop.enabled,
    });
  }

  return apps.sort((first, second) => first.id.localeCompare(second.id, 'en'));
}

export function getReleaseFilePaths(repoRoot: string, app: ReleaseWorkspaceApp): string[] {
  return [
    resolve(app.directory, 'package.json'),
    resolve(app.directory, 'CHANGELOG.md'),
    resolve(repoRoot, 'package-lock.json'),
  ];
}

export async function captureReleaseFiles(
  filePaths: readonly string[],
): Promise<ReleaseFileSnapshot[]> {
  const uniquePaths = [...new Set(filePaths)];

  return Promise.all(
    uniquePaths.map(async (filePath) => ({
      filePath,
      contents: await readOptionalFile(filePath),
    })),
  );
}

export async function restoreReleaseFiles(
  snapshots: readonly ReleaseFileSnapshot[],
): Promise<void> {
  for (const snapshot of snapshots) {
    if (snapshot.contents === null) {
      await rm(snapshot.filePath, { force: true });
    } else {
      await writeFileAtomic(snapshot.filePath, snapshot.contents);
    }
  }
}

export async function applyAppReleaseFiles(
  repoRoot: string,
  app: ReleaseWorkspaceApp,
  plan: Exclude<AppReleasePlan, { kind: 'skip' }>,
  releaseDate: string,
): Promise<void> {
  const packagePath = resolve(app.directory, 'package.json');
  const changelogPath = resolve(app.directory, 'CHANGELOG.md');
  const lockPath = resolve(repoRoot, 'package-lock.json');
  const changelog = await readOptionalFile(changelogPath);

  if (plan.kind === 'bootstrap') {
    if (changelog === null) {
      await writeFileAtomic(
        changelogPath,
        createInitialChangelog(app.name, plan.nextVersion, releaseDate),
      );
    }

    return;
  }

  const packageJson = parseJsonObject(await readFile(packagePath, 'utf8'), packagePath);
  if (packageJson.version !== plan.currentVersion) {
    throw new Error(
      `Version package ${app.id} berubah saat release: expected ${plan.currentVersion}, received ${String(packageJson.version)}.`,
    );
  }
  packageJson.version = plan.nextVersion;

  const packageLock = parseJsonObject(await readFile(lockPath, 'utf8'), lockPath);
  const packages = packageLock.packages;
  if (!packages || typeof packages !== 'object' || Array.isArray(packages)) {
    throw new Error('package-lock.json tidak memiliki map packages workspace.');
  }

  const workspaceKey = app.relativePath.replaceAll('\\', '/');
  const workspaceEntry = (packages as JsonObject)[workspaceKey];
  if (!workspaceEntry || typeof workspaceEntry !== 'object' || Array.isArray(workspaceEntry)) {
    throw new Error(`package-lock.json tidak memiliki entry ${workspaceKey}.`);
  }

  const lockEntry = workspaceEntry as JsonObject;
  if (lockEntry.version !== plan.currentVersion) {
    throw new Error(
      `Version lock ${app.id} drift: expected ${plan.currentVersion}, received ${String(lockEntry.version)}.`,
    );
  }
  lockEntry.version = plan.nextVersion;

  const nextChangelog = addReleaseToChangelog(changelog ?? createEmptyChangelog(app.name), {
    version: plan.nextVersion,
    date: releaseDate,
    commits: plan.commits,
  });

  await writeFileAtomic(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  await writeFileAtomic(lockPath, `${JSON.stringify(packageLock, null, 2)}\n`);
  await writeFileAtomic(changelogPath, nextChangelog);
}
