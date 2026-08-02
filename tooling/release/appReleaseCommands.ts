import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { ReleaseWorkspaceApp } from './appReleaseWorkspace.ts';

export interface ReleaseValidationCommand {
  label: string;
  args: readonly string[];
}

export type ReleaseCommandRunner = (
  repoRoot: string,
  command: ReleaseValidationCommand,
) => Promise<void>;

export function getAppValidationCommands(app: ReleaseWorkspaceApp): ReleaseValidationCommand[] {
  return [
    {
      label: `${app.id} typecheck`,
      args: ['run', 'typecheck', '--workspace', app.packageName],
    },
    {
      label: `${app.id} renderer build`,
      args: ['run', 'build', '--workspace', app.packageName],
    },
  ];
}

function resolveNpmInvocation(args: readonly string[]): { executable: string; args: string[] } {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && existsSync(npmExecPath)) {
    return { executable: process.execPath, args: [npmExecPath, ...args] };
  }

  const adjacentNpmCli = resolve(
    dirname(process.execPath),
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  );
  if (existsSync(adjacentNpmCli)) {
    return { executable: process.execPath, args: [adjacentNpmCli, ...args] };
  }

  if (process.platform === 'win32') {
    throw new Error(
      'npm CLI tidak ditemukan. Jalankan release melalui npm run release:changed atau npm run release:app.',
    );
  }

  return { executable: 'npm', args: [...args] };
}

export const runReleaseValidationCommand: ReleaseCommandRunner = async (repoRoot, command) => {
  const invocation = resolveNpmInvocation(command.args);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(invocation.executable, invocation.args, {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    });

    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command.label} gagal dengan exit code ${code ?? 'unknown'}.`));
      }
    });
  });
};

export async function validateReleaseApp(
  repoRoot: string,
  app: ReleaseWorkspaceApp,
  runner: ReleaseCommandRunner = runReleaseValidationCommand,
): Promise<void> {
  for (const command of getAppValidationCommands(app)) {
    await runner(repoRoot, command);
  }
}
