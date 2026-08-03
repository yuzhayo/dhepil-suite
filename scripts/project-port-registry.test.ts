import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  loadAndReconcileProjectPorts,
  parsePortRegistry,
  reconcileProjectPorts,
} from './project-port-registry';

describe('project port registry', () => {
  it('memakai kembali port app yang hilang tanpa memindahkan assignment app yang masih ada', async () => {
    const result = await reconcileProjectPorts(
      {
        schemaVersion: 1,
        assignments: {
          'deleted-app': 2000,
          'existing-app': 2001,
        },
      },
      ['existing-app', 'new-app'],
      ['existing-app', 'new-app'],
      async () => false,
    );

    expect(result.registry.assignments).toEqual({
      'existing-app': 2001,
      'new-app': 2000,
    });
    expect(result.changed).toBe(true);
  });

  it('melewati port yang sedang tidak tersedia untuk assignment baru', async () => {
    const result = await reconcileProjectPorts(
      {
        schemaVersion: 1,
        assignments: {},
      },
      ['sample-app'],
      ['sample-app'],
      async (port) => port === 2000,
    );

    expect(result.registry.assignments['sample-app']).toBe(2001);
  });

  it('mempertahankan assignment app invalid selama folder app masih ditemukan', async () => {
    const result = await reconcileProjectPorts(
      {
        schemaVersion: 1,
        assignments: {
          'invalid-app': 2000,
        },
      },
      ['invalid-app'],
      [],
      async () => false,
    );

    expect(result.registry.assignments).toEqual({ 'invalid-app': 2000 });
    expect(result.changed).toBe(false);
  });

  it('menolak duplicate port dan assignment di luar rentang', () => {
    expect(() =>
      parsePortRegistry(
        JSON.stringify({
          schemaVersion: 1,
          assignments: {
            first: 2000,
            second: 2000,
          },
        }),
      ),
    ).toThrow('lebih dari satu project');

    expect(() =>
      parsePortRegistry(
        JSON.stringify({
          schemaVersion: 1,
          assignments: {
            invalid: 1999,
          },
        }),
      ),
    ).toThrow('tidak valid');
  });

  it('menyimpan stable lock dan memakainya kembali', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'dhepil-suite-ports-'));
    const registryPath = join(temporaryDirectory, 'config', 'app-ports.lock.json');

    try {
      const first = await loadAndReconcileProjectPorts(
        registryPath,
        ['sample-app'],
        ['sample-app'],
        async () => false,
      );
      const second = await loadAndReconcileProjectPorts(
        registryPath,
        ['sample-app'],
        ['sample-app'],
        async () => true,
      );
      const third = await loadAndReconcileProjectPorts(
        registryPath,
        ['sample-app', 'new-app'],
        ['sample-app', 'new-app'],
        async () => false,
      );
      const persisted = parsePortRegistry(await readFile(registryPath, 'utf8'));

      expect(first.assignments['sample-app']).toBe(2000);
      expect(second.assignments['sample-app']).toBe(2000);
      expect(third.assignments).toEqual({
        'sample-app': 2000,
        'new-app': 2001,
      });
      expect(persisted.assignments['sample-app']).toBe(2000);
      expect(persisted.assignments['new-app']).toBe(2001);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
