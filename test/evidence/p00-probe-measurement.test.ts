import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ProjectManager } from '../../scripts/project-manager';

async function createFixtureApp(rootDirectory: string, id: string) {
  const appDirectory = join(rootDirectory, 'apps', id);
  await mkdir(appDirectory, { recursive: true });
  await writeFile(
    join(appDirectory, 'app.manifest.json'),
    JSON.stringify({ schemaVersion: 1, id, name: `Fixture ${id}`, runtime: 'vite' }),
    'utf8',
  );
  await writeFile(
    join(appDirectory, 'package.json'),
    JSON.stringify({ scripts: { dev: 'vite' } }),
    'utf8',
  );
}

describe('P00 probe measurement fixture', () => {
  it('measures list with exactly 20 valid apps', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'dhepil-suite-p00-20-apps-'));
    await mkdir(join(rootDirectory, 'apps'));

    try {
      await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          createFixtureApp(rootDirectory, `fixture-${String(index + 1).padStart(2, '0')}`),
        ),
      );
      const manager = new ProjectManager({ rootDirectory });
      const startedAt = performance.now();
      const projects = await manager.list();
      const elapsedMilliseconds = performance.now() - startedAt;

      expect(projects).toHaveLength(20);
      expect(new Set(projects.map(({ port }) => port)).size).toBe(20);
      console.info(`P00 probe fixture: 20 apps, list ${elapsedMilliseconds.toFixed(2)} ms`);
    } finally {
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });
});
