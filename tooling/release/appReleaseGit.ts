import { spawn } from 'node:child_process';

import type { ReleaseCommit } from './appReleasePolicy.ts';
import type { LatestReleaseTag } from './appReleasePlanner.ts';

interface GitResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function runGitRaw(repoRoot: string, args: readonly string[]): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', [...args], {
      cwd: repoRoot,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function runGit(repoRoot: string, args: readonly string[]): Promise<string> {
  const result = await runGitRaw(repoRoot, args);

  if (result.code !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.code}`;
    throw new Error(`git ${args[0]} gagal: ${detail}`);
  }

  return result.stdout;
}

export async function resolveRepositoryRoot(cwd: string): Promise<string> {
  return (await runGit(cwd, ['rev-parse', '--show-toplevel'])).trim();
}

export async function assertCleanWorkspace(repoRoot: string): Promise<void> {
  const status = await runGit(repoRoot, ['status', '--porcelain=v1', '--untracked-files=all']);

  if (status.trim()) {
    throw new Error(
      'Release membutuhkan working tree bersih. Commit atau simpan WIP terlebih dahulu, lalu ulangi.',
    );
  }
}

export async function assertGitIdentity(repoRoot: string): Promise<void> {
  const [name, email] = await Promise.all([
    runGitRaw(repoRoot, ['config', '--get', 'user.name']),
    runGitRaw(repoRoot, ['config', '--get', 'user.email']),
  ]);

  if (name.code !== 0 || !name.stdout.trim() || email.code !== 0 || !email.stdout.trim()) {
    throw new Error('Git user.name dan user.email wajib tersedia sebelum release.');
  }
}

export async function getLatestReleaseTag(
  repoRoot: string,
  appId: string,
): Promise<LatestReleaseTag | null> {
  const output = await runGit(repoRoot, ['tag', '--list', `${appId}-v*`, '--sort=-v:refname']);
  const name = output
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find(Boolean);

  if (!name) {
    return null;
  }

  const prefix = `${appId}-v`;
  return { name, version: name.slice(prefix.length) };
}

export async function assertTagAvailable(repoRoot: string, tagName: string): Promise<void> {
  const result = await runGitRaw(repoRoot, [
    'rev-parse',
    '--quiet',
    '--verify',
    `refs/tags/${tagName}`,
  ]);

  if (result.code === 0) {
    throw new Error(`Tag ${tagName} sudah ada.`);
  }

  if (result.code !== 1) {
    throw new Error(`Tidak dapat memeriksa tag ${tagName}: ${result.stderr.trim()}`);
  }
}

export function parseReleaseCommitLog(output: string): ReleaseCommit[] {
  return output
    .split('\u001e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash = '', subject = '', ...bodyParts] = record.split('\u001f');
      const body = bodyParts.join('\u001f').trim();

      if (!hash.trim() || !subject.trim()) {
        throw new Error('Output git log release tidak valid.');
      }

      return { hash: hash.trim(), subject: subject.trim(), body };
    });
}

export async function listReleaseCommits(
  repoRoot: string,
  sinceTag: string,
  relativePaths: readonly string[],
): Promise<ReleaseCommit[]> {
  const output = await runGit(repoRoot, [
    'log',
    '--format=%H%x1f%s%x1f%b%x1e',
    `${sinceTag}..HEAD`,
    '--',
    ...relativePaths,
  ]);

  return parseReleaseCommitLog(output);
}

export async function stageReleaseFiles(
  repoRoot: string,
  relativePaths: readonly string[],
): Promise<void> {
  await runGit(repoRoot, ['add', '--', ...relativePaths]);
}

export async function hasStagedReleaseChanges(
  repoRoot: string,
  relativePaths: readonly string[],
): Promise<boolean> {
  const result = await runGitRaw(repoRoot, ['diff', '--cached', '--quiet', '--', ...relativePaths]);

  if (result.code === 0) {
    return false;
  }
  if (result.code === 1) {
    return true;
  }

  throw new Error(`Tidak dapat memeriksa staged release files: ${result.stderr.trim()}`);
}

export async function unstageReleaseFiles(
  repoRoot: string,
  relativePaths: readonly string[],
): Promise<void> {
  await runGit(repoRoot, ['restore', '--staged', '--', ...relativePaths]);
}

export async function commitRelease(
  repoRoot: string,
  subject: string,
  body: string,
): Promise<void> {
  await runGit(repoRoot, ['commit', '-m', subject, '-m', body]);
}

export async function createReleaseTag(
  repoRoot: string,
  tagName: string,
  message: string,
): Promise<void> {
  await runGit(repoRoot, ['tag', '-a', tagName, '-m', message]);
}

export async function deleteReleaseTag(repoRoot: string, tagName: string): Promise<void> {
  await runGit(repoRoot, ['tag', '--delete', tagName]);
}
