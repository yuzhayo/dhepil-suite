import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import {
  assertCleanWorkspace,
  getLatestReleaseTag,
  listReleaseCommits,
  parseReleaseCommitLog,
} from './appReleaseGit.ts';

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

async function git(root: string, ...args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd: root, windowsHide: true });
}

async function createRepository(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), 'dhepil-release-git-'));
  temporaryDirectories.push(root);
  await git(root, 'init');
  await git(root, 'config', 'user.name', 'Release Test');
  await git(root, 'config', 'user.email', 'release@example.test');
  await mkdir(resolve(root, 'apps', 'alpha'), { recursive: true });
  await mkdir(resolve(root, 'ui'), { recursive: true });
  await writeFile(resolve(root, 'apps', 'alpha', 'source.ts'), 'initial\n');
  await git(root, 'add', '.');
  await git(root, 'commit', '-m', 'feat: initial app');
  await git(root, 'tag', '-a', 'alpha-v0.1.0', '-m', 'alpha 0.1.0');
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('appReleaseGit', () => {
  it('parses record-delimited git logs including multiline bodies', () => {
    const commits = parseReleaseCommitLog(
      'abc\u001ffeat: one\u001fline one\nline two\u001edef\u001ffix: two\u001f\u001e',
    );

    expect(commits).toEqual([
      { hash: 'abc', subject: 'feat: one', body: 'line one\nline two' },
      { hash: 'def', subject: 'fix: two', body: '' },
    ]);
  });

  it('finds the latest app tag and only reads commits touching selected paths', async () => {
    const root = await createRepository();
    await writeFile(resolve(root, 'apps', 'alpha', 'source.ts'), 'feature\n');
    await git(root, 'add', '.');
    await git(root, 'commit', '-m', 'feat(alpha): add feature');
    await writeFile(resolve(root, 'README.md'), 'docs\n');
    await git(root, 'add', '.');
    await git(root, 'commit', '-m', 'docs: root only');

    await expect(getLatestReleaseTag(root, 'alpha')).resolves.toEqual({
      name: 'alpha-v0.1.0',
      version: '0.1.0',
    });
    await expect(listReleaseCommits(root, 'alpha-v0.1.0', ['apps/alpha', 'ui'])).resolves.toEqual([
      expect.objectContaining({ subject: 'feat(alpha): add feature' }),
    ]);
    await expect(assertCleanWorkspace(root)).resolves.toBeUndefined();
  });

  it('rejects a dirty release workspace', async () => {
    const root = await createRepository();
    await writeFile(resolve(root, 'untracked.txt'), 'wip\n');

    await expect(assertCleanWorkspace(root)).rejects.toThrow(/working tree bersih/i);
  });
});
