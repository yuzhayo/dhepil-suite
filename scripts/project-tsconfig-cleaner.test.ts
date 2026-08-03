import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { cleanProjectTsconfigReferences } from './project-tsconfig-cleaner';

describe('project tsconfig cleaner', () => {
  it('removes only app references whose direct-child directory no longer exists', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'dhepil-tsconfig-cleaner-'));
    const tsconfigPath = join(rootDirectory, 'tsconfig.json');

    try {
      await mkdir(join(rootDirectory, 'apps', 'existing-app'), { recursive: true });
      await writeFile(
        tsconfigPath,
        `${JSON.stringify(
          {
            files: [],
            references: [
              { path: './tsconfig.web.json' },
              { path: './apps/existing-app/tsconfig.json' },
              { path: './apps/deleted-app/tsconfig.json' },
            ],
          },
          null,
          2,
        )}\n`,
      );

      const first = await cleanProjectTsconfigReferences(rootDirectory);
      const persisted = JSON.parse(await readFile(tsconfigPath, 'utf8')) as {
        references: Array<{ path: string }>;
      };
      const second = await cleanProjectTsconfigReferences(rootDirectory);

      expect(first).toEqual({
        changed: true,
        removedReferences: ['./apps/deleted-app/tsconfig.json'],
      });
      expect(persisted.references).toEqual([
        { path: './tsconfig.web.json' },
        { path: './apps/existing-app/tsconfig.json' },
      ]);
      expect(second).toEqual({ changed: false, removedReferences: [] });
    } finally {
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });
});
