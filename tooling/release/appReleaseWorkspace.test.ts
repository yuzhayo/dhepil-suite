import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { planAppRelease } from './appReleasePlanner.ts';
import {
  applyAppReleaseFiles,
  captureReleaseFiles,
  discoverReleaseApps,
  getReleaseFilePaths,
  restoreReleaseFiles,
} from './appReleaseWorkspace.ts';

const temporaryDirectories: string[] = [];

async function createFixture(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), 'dhepil-release-'));
  temporaryDirectories.push(root);
  const appDirectory = resolve(root, 'apps', 'alpha');
  await mkdir(appDirectory, { recursive: true });
  await writeFile(
    resolve(appDirectory, 'app.manifest.json'),
    JSON.stringify({
      schemaVersion: 1,
      id: 'alpha',
      name: 'Alpha',
      runtime: 'vite',
      desktop: { enabled: false, script: 'desktop:dev' },
    }),
  );
  await writeFile(
    resolve(appDirectory, 'package.json'),
    `${JSON.stringify({ name: '@dhepil-suite/alpha', version: '0.1.0', scripts: { dev: 'vite' } }, null, 2)}\n`,
  );
  await writeFile(
    resolve(root, 'package-lock.json'),
    `${JSON.stringify({ packages: { 'apps/alpha': { name: '@dhepil-suite/alpha', version: '0.1.0' } } }, null, 2)}\n`,
  );
  return root;
}

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('appReleaseWorkspace', () => {
  it('discovers valid direct-child apps without a manual registry', async () => {
    const root = await createFixture();

    await expect(discoverReleaseApps(root)).resolves.toEqual([
      expect.objectContaining({
        id: 'alpha',
        name: 'Alpha',
        packageName: '@dhepil-suite/alpha',
        version: '0.1.0',
        relativePath: 'apps/alpha',
        desktopEnabled: false,
      }),
    ]);
  });

  it('updates package, lock, and changelog and can restore the exact snapshot', async () => {
    const root = await createFixture();
    const [app] = await discoverReleaseApps(root);
    const filePaths = getReleaseFilePaths(root, app);
    const snapshots = await captureReleaseFiles(filePaths);
    const plan = planAppRelease({
      appId: 'alpha',
      currentVersion: '0.1.0',
      latestTag: { name: 'alpha-v0.1.0', version: '0.1.0' },
      commits: [{ hash: '123456789', subject: 'feat: add workflow', body: '' }],
    });

    if (plan.kind !== 'release') {
      throw new Error('Expected a versioned release plan.');
    }

    await applyAppReleaseFiles(root, app, plan, '2026-08-02');

    expect(JSON.parse(await readFile(resolve(app.directory, 'package.json'), 'utf8')).version).toBe(
      '0.2.0',
    );
    expect(
      JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8')).packages['apps/alpha']
        .version,
    ).toBe('0.2.0');
    expect(await readFile(resolve(app.directory, 'CHANGELOG.md'), 'utf8')).toContain(
      '## [0.2.0] - 2026-08-02',
    );

    await restoreReleaseFiles(snapshots);

    expect(JSON.parse(await readFile(resolve(app.directory, 'package.json'), 'utf8')).version).toBe(
      '0.1.0',
    );
    await expect(readFile(resolve(app.directory, 'CHANGELOG.md'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('creates a baseline changelog on first bootstrap without changing versions', async () => {
    const root = await createFixture();
    const [app] = await discoverReleaseApps(root);
    const plan = planAppRelease({
      appId: 'alpha',
      currentVersion: '0.1.0',
      latestTag: null,
      commits: [],
    });

    if (plan.kind !== 'bootstrap') {
      throw new Error('Expected a bootstrap release plan.');
    }

    await applyAppReleaseFiles(root, app, plan, '2026-08-02');

    expect(await readFile(resolve(app.directory, 'CHANGELOG.md'), 'utf8')).toContain(
      '## [0.1.0] - 2026-08-02',
    );
    expect(JSON.parse(await readFile(resolve(app.directory, 'package.json'), 'utf8')).version).toBe(
      '0.1.0',
    );
  });
});
