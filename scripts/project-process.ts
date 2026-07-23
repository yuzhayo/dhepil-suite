import { execFile, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { connect } from 'node:net';
import { dirname, join } from 'node:path';

import type { RuntimeRecord } from './project-contracts';

const ansiEscapePattern = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g');

export function appendLog(
  runtime: RuntimeRecord,
  source: 'root' | 'stdout' | 'stderr',
  text: string,
  maximumLogLines: number,
) {
  const lines = text
    .replace(ansiEscapePattern, '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => `[${source}] ${line}`);

  runtime.logs.push(...lines);
  if (runtime.logs.length > maximumLogLines) {
    runtime.logs.splice(0, runtime.logs.length - maximumLogLines);
  }
}

export async function isHttpReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 650);

  try {
    await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function isTcpPortOccupied(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const socket = connect({ host: '127.0.0.1', port });
    let settled = false;
    const settle = (occupied: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolvePromise(occupied);
    };

    socket.setTimeout(500);
    socket.once('connect', () => settle(true));
    socket.once('timeout', () => settle(true));
    socket.once('error', () => settle(false));
  });
}

export function npmInvocation(): { command: string; leadingArguments: string[] } {
  const npmCliCandidates = [
    process.env.npm_execpath,
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    process.env.APPDATA
      ? join(process.env.APPDATA, 'npm', 'node_modules', 'npm', 'bin', 'npm-cli.js')
      : undefined,
  ];
  const npmCli = npmCliCandidates.find((candidate): candidate is string =>
    Boolean(candidate && existsSync(candidate)),
  );

  if (npmCli) {
    return {
      command: process.execPath,
      leadingArguments: [npmCli],
    };
  }

  throw new Error(
    'npm-cli.js tidak ditemukan. Jalankan root melalui instalasi Node.js dengan npm.',
  );
}

export function killProcessTree(pid: number): Promise<void> {
  if (process.platform === 'win32') {
    return new Promise((resolvePromise, rejectPromise) => {
      execFile(
        'taskkill.exe',
        ['/PID', String(pid), '/T', '/F'],
        { windowsHide: true },
        (error) => {
          if (error) {
            rejectPromise(error);
            return;
          }
          resolvePromise();
        },
      );
    });
  }

  return new Promise((resolvePromise, rejectPromise) => {
    try {
      process.kill(-pid, 'SIGTERM');
      resolvePromise();
    } catch (error) {
      rejectPromise(error);
    }
  });
}

export function killProcessTreeSync(pid: number) {
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    // Process may already be closed.
  }
}
