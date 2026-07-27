import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assignProjectPorts,
  loadAndAssignProjectPorts,
  parsePortRegistry,
} from './project-port-registry';

describe('project port registry', () => {
  it('memberikan port berurutan dan mempertahankan assignment lama', async () => {
    const result = await assignProjectPorts(
      {
        schemaVersion: 1,
        assignments: {
          dhepil: 2000,
        },
      },
      ['spreadsheet-minimal', 'dhepil'],
      async () => false,
    );

    expect(result.registry.assignments).toEqual({
      dhepil: 2000,
      'spreadsheet-minimal': 2001,
    });
  });

  it('melewati port yang sedang tidak tersedia untuk assignment baru', async () => {
    const result = await assignProjectPorts(
      {
        schemaVersion: 1,
        assignments: {},
      },
      ['sample-app'],
      async (port) => port === 2000,
    );

    expect(result.registry.assignments['sample-app']).toBe(2001);
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
      const first = await loadAndAssignProjectPorts(
        registryPath,
        ['sample-app'],
        async () => false,
      );
      const second = await loadAndAssignProjectPorts(
        registryPath,
        ['sample-app'],
        async () => true,
      );
      const third = await loadAndAssignProjectPorts(
        registryPath,
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
