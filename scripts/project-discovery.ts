import { readFile, readdir, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import type { DesktopConfig, DiscoveredProject } from './project-contracts';

interface AppManifest {
  schemaVersion: number;
  id: string;
  name: string;
  runtime: string;
  description?: string;
  desktop?: {
    enabled: boolean;
    script: string;
  };
}

interface PackageManifest {
  scripts?: Record<string, string>;
}

const projectIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const npmScriptNamePattern = /^[a-zA-Z0-9:_-]+$/;
const defaultDesktop: DesktopConfig = {
  enabled: false,
  script: 'desktop:dev',
};

function titleFromFolder(folderName: string) {
  return folderName
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function parseJsonRecord(raw: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} bukan JSON yang valid.`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} harus berupa object JSON.`);
  }

  return parsed as Record<string, unknown>;
}

export function validateProjectFiles(
  folderName: string,
  manifestRaw: string,
  packageRaw: string,
): Omit<DiscoveredProject, 'relativePath' | 'directory' | 'valid'> {
  const manifestRecord = parseJsonRecord(manifestRaw, 'app.manifest.json');
  const packageRecord = parseJsonRecord(packageRaw, 'package.json');
  const manifest = manifestRecord as unknown as AppManifest;
  const packageManifest = packageRecord as unknown as PackageManifest;

  if (manifest.schemaVersion !== 1) {
    throw new Error('schemaVersion app.manifest.json harus 1.');
  }
  if (typeof manifest.id !== 'string' || !projectIdPattern.test(manifest.id)) {
    throw new Error('id app hanya boleh memakai huruf kecil, angka, dan tanda hubung.');
  }
  if (manifest.id !== folderName) {
    throw new Error(`id manifest "${manifest.id}" harus sama dengan folder "${folderName}".`);
  }
  if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
    throw new Error('name app.manifest.json wajib diisi.');
  }
  if (manifest.runtime !== 'vite') {
    throw new Error('runtime app yang didukung saat ini hanya "vite".');
  }
  if (
    manifest.description !== undefined &&
    (typeof manifest.description !== 'string' || !manifest.description.trim())
  ) {
    throw new Error('description harus berupa string non-kosong jika diisi.');
  }
  if (!packageManifest.scripts || typeof packageManifest.scripts.dev !== 'string') {
    throw new Error('package.json wajib mempunyai script "dev".');
  }

  let desktop = defaultDesktop;
  if (manifest.desktop !== undefined) {
    if (
      !manifest.desktop ||
      typeof manifest.desktop !== 'object' ||
      typeof manifest.desktop.enabled !== 'boolean' ||
      typeof manifest.desktop.script !== 'string' ||
      !npmScriptNamePattern.test(manifest.desktop.script)
    ) {
      throw new Error('desktop manifest tidak valid.');
    }
    if (
      manifest.desktop.enabled &&
      typeof packageManifest.scripts[manifest.desktop.script] !== 'string'
    ) {
      throw new Error(
        `package.json wajib mempunyai script "${manifest.desktop.script}" ketika desktop aktif.`,
      );
    }
    desktop = {
      enabled: manifest.desktop.enabled,
      script: manifest.desktop.script,
    };
  }

  return {
    id: manifest.id,
    name: manifest.name.trim(),
    description: manifest.description?.trim() ?? '',
    desktop,
  };
}

function invalidProject(
  folderName: string,
  directory: string,
  relativePath: string,
  error: unknown,
): DiscoveredProject {
  return {
    id: folderName,
    name: titleFromFolder(folderName) || folderName,
    description: '',
    relativePath,
    directory,
    desktop: defaultDesktop,
    valid: false,
    validationError: error instanceof Error ? error.message : String(error),
  };
}

export async function discoverProjects(
  rootDirectory: string,
  appsDirectory: string,
): Promise<DiscoveredProject[]> {
  const entries = await readdir(appsDirectory, { withFileTypes: true });
  const realAppsDirectory = await realpath(appsDirectory);
  const discovered: DiscoveredProject[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || (!entry.isDirectory() && !entry.isSymbolicLink())) {
      continue;
    }

    const directory = resolve(appsDirectory, entry.name);
    const relativePath = relative(rootDirectory, directory).split(sep).join('/');

    if (entry.isSymbolicLink()) {
      discovered.push(
        invalidProject(
          entry.name,
          directory,
          relativePath,
          new Error('Symbolic link tidak diizinkan di apps/.'),
        ),
      );
      continue;
    }

    try {
      const realProjectDirectory = await realpath(directory);
      const relativeToApps = relative(realAppsDirectory, realProjectDirectory);
      if (
        !relativeToApps ||
        isAbsolute(relativeToApps) ||
        relativeToApps.startsWith('..') ||
        dirname(relativeToApps) !== '.'
      ) {
        throw new Error('Folder app harus merupakan direct child dari apps/.');
      }

      const [manifestRaw, packageRaw] = await Promise.all([
        readFile(resolve(directory, 'app.manifest.json'), 'utf8'),
        readFile(resolve(directory, 'package.json'), 'utf8'),
      ]);
      const validated = validateProjectFiles(entry.name, manifestRaw, packageRaw);

      discovered.push({
        ...validated,
        relativePath,
        directory,
        valid: true,
      });
    } catch (error) {
      discovered.push(invalidProject(entry.name, directory, relativePath, error));
    }
  }

  return discovered.sort((first, second) => first.id.localeCompare(second.id, 'en'));
}
