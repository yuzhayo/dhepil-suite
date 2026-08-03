import { readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface RootTsconfig {
  references?: unknown;
  [key: string]: unknown;
}

export interface ProjectTsconfigCleanupResult {
  changed: boolean;
  removedReferences: string[];
}

const appReferencePattern = /^\.\/apps\/([a-z0-9]+(?:-[a-z0-9]+)*)\/tsconfig\.json$/;
const defaultRootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseTsconfig(raw: string): RootTsconfig {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as RootTsconfig;
    }
  } catch {
    // The explicit error below is more useful during preboot than JSON.parse output.
  }

  throw new Error('tsconfig.json root bukan JSON object yang valid.');
}

export async function cleanProjectTsconfigReferences(
  rootDirectory = defaultRootDirectory,
): Promise<ProjectTsconfigCleanupResult> {
  const appsDirectory = join(rootDirectory, 'apps');
  const tsconfigPath = join(rootDirectory, 'tsconfig.json');
  const [entries, rawTsconfig] = await Promise.all([
    readdir(appsDirectory, { withFileTypes: true }),
    readFile(tsconfigPath, 'utf8'),
  ]);
  const appDirectories = new Set(
    entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
  );
  const tsconfig = parseTsconfig(rawTsconfig);

  if (!Array.isArray(tsconfig.references)) {
    return { changed: false, removedReferences: [] };
  }

  const removedReferences: string[] = [];
  const references = tsconfig.references.filter((reference) => {
    if (!reference || typeof reference !== 'object' || Array.isArray(reference)) {
      return true;
    }

    const path = (reference as { path?: unknown }).path;
    const appId =
      typeof path === 'string'
        ? path.replaceAll('\\', '/').match(appReferencePattern)?.[1]
        : undefined;
    if (!appId || appDirectories.has(appId)) {
      return true;
    }

    removedReferences.push(path as string);
    return false;
  });

  if (removedReferences.length === 0) {
    return { changed: false, removedReferences };
  }

  const temporaryPath = `${tsconfigPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify({ ...tsconfig, references }, null, 2)}\n`,
      'utf8',
    );
    await rename(temporaryPath, tsconfigPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }

  return { changed: true, removedReferences };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await cleanProjectTsconfigReferences();
    console.log(
      result.changed
        ? `[workspace-cleaner] Removed stale tsconfig references: ${result.removedReferences.join(', ')}`
        : '[workspace-cleaner] No stale app references found.',
    );
  } catch (error) {
    console.error(`[workspace-cleaner] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
