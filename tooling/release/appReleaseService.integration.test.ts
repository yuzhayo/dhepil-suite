import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import { createInitialChangelog } from './appReleaseChangelog.ts';
import { createWorkspaceReleasePlans, executeWorkspaceReleases } from './appReleaseService.ts';

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

async function git(root: string, ...args: string[]): Promise<string> {
  const result = await execFileAsync('git', args, { cwd: root, windowsHide: true });
  return result.stdout;
}

async function createReleaseRepository(buildSucceeds: boolean): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), 'dhepil-release-service-'));
  temporaryDirectories.push(root);
  const appDirectory = resolve(root, 'apps', 'alpha');
  await mkdir(appDirectory, { recursive: true });
  await writeFile(
    resolve(root, 'package.json'),
    `${JSON.stringify({ name: 'release-fixture', private: true, workspaces: ['apps/*'] }, null, 2)}\n`,
  );
  await writeFile(
    resolve(root, 'package-lock.json'),
    `${JSON.stringify(
      {
        name: 'release-fixture',
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': { name: 'release-fixture', workspaces: ['apps/*'] },
          'apps/alpha': { name: '@fixture/alpha', version: '0.1.0' },
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    resolve(appDirectory, 'app.manifest.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        id: 'alpha',
        name: 'Alpha',
        runtime: 'vite',
        desktop: { enabled: false, script: 'desktop:dev' },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    resolve(appDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: '@fixture/alpha',
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'node -e "process.exit(0)"',
          typecheck: 'node -e "process.exit(0)"',
          build: `node -e "process.exit(${buildSucceeds ? 0 : 1})"`,
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    resolve(appDirectory, 'CHANGELOG.md'),
    createInitialChangelog('Alpha', '0.1.0', '2026-08-01'),
  );
  await writeFile(resolve(appDirectory, 'source.ts'), 'initial\n');

  await git(root, 'init');
  await git(root, 'config', 'user.name', 'Release Test');
  await git(root, 'config', 'user.email', 'release@example.test');
  await git(root, 'add', '.');
  await git(root, 'commit', '-m', 'feat: initial app');
  await git(root, 'tag', '-a', 'alpha-v0.1.0', '-m', 'Alpha v0.1.0');

  await writeFile(resolve(appDirectory, 'source.ts'), 'next\n');
  await git(root, 'add', '.');
  await git(root, 'commit', '-m', 'feat(alpha): add next workflow');
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('executeWorkspaceReleases integration', () => {
  it('updates all release files, validates, commits, and tags locally', async () => {
    const root = await createReleaseRepository(true);
    const plans = await createWorkspaceReleasePlans(root, {
      mode: 'changed',
      includeElectron: false,
    });

    await expect(executeWorkspaceReleases(root, plans, '2026-08-02')).resolves.toEqual({
      committed: true,
      tags: ['alpha-v0.2.0'],
    });

    expect(
      JSON.parse(await readFile(resolve(root, 'apps/alpha/package.json'), 'utf8')).version,
    ).toBe('0.2.0');
    expect(
      JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8')).packages['apps/alpha']
        .version,
    ).toBe('0.2.0');
    expect(await readFile(resolve(root, 'apps/alpha/CHANGELOG.md'), 'utf8')).toContain(
      '## [0.2.0] - 2026-08-02',
    );
    expect((await git(root, 'log', '-1', '--format=%s')).trim()).toBe(
      'chore(release): alpha v0.2.0',
    );
    expect((await git(root, 'tag', '--list', 'alpha-v0.2.0')).trim()).toBe('alpha-v0.2.0');
    expect((await git(root, 'status', '--porcelain=v1', '--untracked-files=all')).trim()).toBe('');
  });

  it('restores package, lock, and changelog and creates no tag when validation fails', async () => {
    const root = await createReleaseRepository(false);
    const originalPackage = await readFile(resolve(root, 'apps/alpha/package.json'), 'utf8');
    const originalLock = await readFile(resolve(root, 'package-lock.json'), 'utf8');
    const originalChangelog = await readFile(resolve(root, 'apps/alpha/CHANGELOG.md'), 'utf8');
    const plans = await createWorkspaceReleasePlans(root, {
      mode: 'changed',
      includeElectron: false,
    });

    await expect(executeWorkspaceReleases(root, plans, '2026-08-02')).rejects.toThrow(
      /renderer build gagal/i,
    );

    expect(await readFile(resolve(root, 'apps/alpha/package.json'), 'utf8')).toBe(originalPackage);
    expect(await readFile(resolve(root, 'package-lock.json'), 'utf8')).toBe(originalLock);
    expect(await readFile(resolve(root, 'apps/alpha/CHANGELOG.md'), 'utf8')).toBe(
      originalChangelog,
    );
    expect((await git(root, 'tag', '--list', 'alpha-v0.2.0')).trim()).toBe('');
    expect((await git(root, 'status', '--porcelain=v1', '--untracked-files=all')).trim()).toBe('');
  });
});
