import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export const minimumProjectPort = 2000;
export const maximumProjectPort = 2999;

export interface PortRegistry {
  schemaVersion: 1;
  assignments: Record<string, number>;
}

const emptyRegistry = (): PortRegistry => ({
  schemaVersion: 1,
  assignments: {},
});

export function parsePortRegistry(raw: string): PortRegistry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('app-ports.lock.json bukan JSON yang valid.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('app-ports.lock.json harus berupa object JSON.');
  }

  const candidate = parsed as Partial<PortRegistry>;
  if (
    candidate.schemaVersion !== 1 ||
    !candidate.assignments ||
    typeof candidate.assignments !== 'object' ||
    Array.isArray(candidate.assignments)
  ) {
    throw new Error('Format app-ports.lock.json tidak didukung.');
  }

  const seenPorts = new Set<number>();
  const assignments: Record<string, number> = {};
  for (const [projectId, port] of Object.entries(candidate.assignments)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(projectId)) {
      throw new Error(`Project id "${projectId}" di app-ports.lock.json tidak valid.`);
    }
    if (!Number.isInteger(port) || port < minimumProjectPort || port > maximumProjectPort) {
      throw new Error(`Port project "${projectId}" di app-ports.lock.json tidak valid.`);
    }
    if (seenPorts.has(port)) {
      throw new Error(`Port ${port} digunakan oleh lebih dari satu project.`);
    }
    seenPorts.add(port);
    assignments[projectId] = port;
  }

  return {
    schemaVersion: 1,
    assignments,
  };
}

export async function assignProjectPorts(
  registry: PortRegistry,
  projectIds: string[],
  isPortUnavailable: (port: number) => Promise<boolean>,
): Promise<{ registry: PortRegistry; changed: boolean }> {
  const assignments = { ...registry.assignments };
  const reservedPorts = new Set(Object.values(assignments));
  let changed = false;

  for (const projectId of [...new Set(projectIds)].sort((first, second) =>
    first.localeCompare(second, 'en'),
  )) {
    if (assignments[projectId] !== undefined) {
      continue;
    }

    let assignedPort: number | undefined;
    for (let port = minimumProjectPort; port <= maximumProjectPort; port += 1) {
      if (reservedPorts.has(port) || (await isPortUnavailable(port))) {
        continue;
      }
      assignedPort = port;
      break;
    }

    if (assignedPort === undefined) {
      throw new Error(
        `Tidak ada port kosong dalam rentang ${minimumProjectPort}-${maximumProjectPort}.`,
      );
    }

    assignments[projectId] = assignedPort;
    reservedPorts.add(assignedPort);
    changed = true;
  }

  return {
    registry: {
      schemaVersion: 1,
      assignments,
    },
    changed,
  };
}

async function readRegistry(registryPath: string): Promise<PortRegistry> {
  try {
    return parsePortRegistry(await readFile(registryPath, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return emptyRegistry();
    }
    throw error;
  }
}

async function writeRegistryAtomically(registryPath: string, registry: PortRegistry) {
  const registryDirectory = dirname(registryPath);
  const registryFileName = basename(registryPath);
  await mkdir(registryDirectory, { recursive: true });
  const temporaryPath = join(
    registryDirectory,
    `${registryFileName}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );

  try {
    await writeFile(temporaryPath, `${JSON.stringify(registry, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    await rename(temporaryPath, registryPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function loadAndAssignProjectPorts(
  registryPath: string,
  projectIds: string[],
  isPortUnavailable: (port: number) => Promise<boolean>,
): Promise<PortRegistry> {
  const current = await readRegistry(registryPath);
  const result = await assignProjectPorts(current, projectIds, isPortUnavailable);

  if (result.changed) {
    await writeRegistryAtomically(registryPath, result.registry);
  }

  return result.registry;
}
