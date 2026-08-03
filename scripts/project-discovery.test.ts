import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { discoverProjects, validateProjectFiles } from './project-discovery';

const validManifest = JSON.stringify({
  schemaVersion: 1,
  id: 'sample-app',
  name: 'Sample App',
  runtime: 'vite',
});
const validPackage = JSON.stringify({
  scripts: {
    dev: 'vite',
  },
});

describe('validateProjectFiles', () => {
  it('menerima kontrak app Vite minimum', () => {
    expect(validateProjectFiles('sample-app', validManifest, validPackage)).toMatchObject({
      id: 'sample-app',
      name: 'Sample App',
      description: '',
      desktop: {
        enabled: false,
        script: 'desktop:dev',
      },
    });
  });

  it('menolak id manifest yang berbeda dengan nama folder', () => {
    const manifest = JSON.stringify({
      schemaVersion: 1,
      id: 'different-app',
      name: 'Different App',
      runtime: 'vite',
    });

    expect(() => validateProjectFiles('sample-app', manifest, validPackage)).toThrow(
      'harus sama dengan folder',
    );
  });

  it('menolak package tanpa script dev', () => {
    expect(() =>
      validateProjectFiles('sample-app', validManifest, JSON.stringify({ scripts: {} })),
    ).toThrow('script "dev"');
  });

  it('menolak manifest rusak dan runtime yang tidak didukung', () => {
    expect(() => validateProjectFiles('sample-app', '{', validPackage)).toThrow(
      'bukan JSON yang valid',
    );

    expect(() =>
      validateProjectFiles(
        'sample-app',
        JSON.stringify({
          schemaVersion: 1,
          id: 'sample-app',
          name: 'Sample App',
          runtime: 'custom-shell',
        }),
        validPackage,
      ),
    ).toThrow('hanya "vite"');
  });

  it('mengabaikan folder tanpa manifest dan mempertahankan manifest rusak sebagai invalid', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'dhepil-discovery-'));
    const appsDirectory = join(rootDirectory, 'apps');

    try {
      await mkdir(join(appsDirectory, 'unmanaged-folder'), { recursive: true });
      await mkdir(join(appsDirectory, 'broken-app'), { recursive: true });
      await writeFile(join(appsDirectory, 'broken-app', 'app.manifest.json'), '{', 'utf8');
      await writeFile(join(appsDirectory, 'broken-app', 'package.json'), validPackage, 'utf8');

      const projects = await discoverProjects(rootDirectory, appsDirectory);

      expect(projects).toMatchObject([
        {
          id: 'broken-app',
          valid: false,
          validationError: 'app.manifest.json bukan JSON yang valid.',
        },
      ]);
    } finally {
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });
});
