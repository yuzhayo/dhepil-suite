import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { writeAgentRouterUserDatabase } from './databaseWriter';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('Tampermonyet database writer', () => {
  it('writes and rewrites one JSON file per AgentRouter user', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tampermonyet-database-'));
    temporaryDirectories.push(root);
    await mkdir(join(root, 'agentrouter'));

    const first = await writeAgentRouterUserDatabase(root, {
      owner: 'GitHub_Demo',
      value: { accountName: 'github_demo', version: 1, token: { key: 'sk-FIRST' } },
    });
    const second = await writeAgentRouterUserDatabase(root, {
      owner: 'github_demo',
      value: { accountName: 'github_demo', version: 1, token: { key: 'sk-SECOND' } },
    });

    expect(second.absolutePath).toBe(first.absolutePath);
    expect(second.relativePath).toBe('database/agentrouter/github_demo.json');
    expect(JSON.parse(await readFile(second.absolutePath, 'utf8'))).toEqual({
      accountName: 'github_demo',
      version: 1,
      token: { key: 'sk-SECOND' },
    });
  });

  it('rejects a payload whose owner does not match its JSON account', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tampermonyet-database-'));
    temporaryDirectories.push(root);

    await expect(
      writeAgentRouterUserDatabase(root, {
        owner: 'github_a',
        value: { accountName: 'github_b' },
      }),
    ).rejects.toThrow('Owner JSON tidak cocok dengan akun.');
  });
});
