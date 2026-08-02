export type ReleaseCliMode = 'changed' | 'app';

export interface ReleaseCliOptions {
  mode: ReleaseCliMode;
  appId?: string;
  dryRun: boolean;
  includeElectron: boolean;
  help: boolean;
}

export const RELEASE_USAGE = `Usage:
  npm run release:check
  npm run release:changed
  npm run release:app -- <app-id> [--dry-run] [--include-electron]`;

export function parseReleaseCliArgs(args: readonly string[]): ReleaseCliOptions {
  const flags = args.filter((argument) => argument.startsWith('--'));
  const positionals = args.filter((argument) => !argument.startsWith('--'));
  const unknownFlags = flags.filter(
    (flag) => flag !== '--dry-run' && flag !== '--include-electron' && flag !== '--help',
  );

  if (unknownFlags.length > 0) {
    throw new Error(`Option tidak dikenal: ${unknownFlags.join(', ')}`);
  }

  const [mode, ...values] = positionals;
  if (mode !== 'changed' && mode !== 'app') {
    throw new Error(RELEASE_USAGE);
  }

  if (mode === 'changed' && values.length > 0) {
    throw new Error(`Mode changed tidak menerima app id.\n${RELEASE_USAGE}`);
  }

  if (mode === 'app' && values.length !== 1) {
    throw new Error(`Mode app membutuhkan tepat satu app id.\n${RELEASE_USAGE}`);
  }

  return {
    mode,
    appId: mode === 'app' ? values[0] : undefined,
    dryRun: flags.includes('--dry-run'),
    includeElectron: flags.includes('--include-electron'),
    help: flags.includes('--help'),
  };
}
