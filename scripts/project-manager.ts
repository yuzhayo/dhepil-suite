import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';

import type {
  DiscoveredProject,
  ProjectConfig,
  ProjectState,
  RuntimeRecord,
} from './project-contracts';
import { discoverProjects } from './project-discovery';
import { loadAndReconcileProjectPorts } from './project-port-registry';
import {
  appendLog,
  isHttpReachable,
  isTcpPortOccupied,
  killProcessTree,
  killProcessTreeSync,
  npmInvocation,
} from './project-process';

interface SynchronizedProjects {
  validProjects: ProjectConfig[];
  invalidProjects: DiscoveredProject[];
  tombstoneProjects: ProjectConfig[];
}

interface ProjectManagerOptions {
  rootDirectory?: string;
}

const defaultRootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const maximumLogLines = 120;

export class ProjectManager {
  private readonly rootDirectory: string;

  private readonly appsDirectory: string;

  private readonly portRegistryPath: string;

  private readonly runtimes = new Map<string, RuntimeRecord>();

  private readonly lastKnownProjects = new Map<string, ProjectConfig>();

  private catalog?: SynchronizedProjects;

  private synchronizeInFlight?: Promise<SynchronizedProjects>;

  constructor(options: ProjectManagerOptions = {}) {
    this.rootDirectory = options.rootDirectory ?? defaultRootDirectory;
    this.appsDirectory = join(this.rootDirectory, 'apps');
    this.portRegistryPath = join(this.rootDirectory, 'config', 'app-ports.lock.json');
  }

  private runtimeFor(projectId: string): RuntimeRecord {
    const current = this.runtimes.get(projectId);
    if (current) {
      return current;
    }

    const created: RuntimeRecord = {
      logs: [],
      stopRequested: false,
    };
    this.runtimes.set(projectId, created);
    return created;
  }

  private synchronize(): Promise<SynchronizedProjects> {
    if (this.synchronizeInFlight) {
      return this.synchronizeInFlight;
    }

    const synchronization = this.synchronizeProjects().then((catalog) => {
      this.catalog = catalog;
      return catalog;
    });
    this.synchronizeInFlight = synchronization;
    void synchronization.then(
      () => {
        if (this.synchronizeInFlight === synchronization) {
          this.synchronizeInFlight = undefined;
        }
      },
      () => {
        if (this.synchronizeInFlight === synchronization) {
          this.synchronizeInFlight = undefined;
        }
      },
    );
    return synchronization;
  }

  private async synchronizeProjects(): Promise<SynchronizedProjects> {
    const discovered = await discoverProjects(this.rootDirectory, this.appsDirectory);
    const validDiscovered = discovered.filter(
      (project): project is DiscoveredProject & { valid: true } => project.valid,
    );
    const registry = await loadAndReconcileProjectPorts(
      this.portRegistryPath,
      discovered.map(({ id }) => id),
      validDiscovered.map(({ id }) => id),
      isTcpPortOccupied,
    );
    const validProjects = validDiscovered.map<ProjectConfig>((project) => {
      const port = registry.assignments[project.id];
      if (port === undefined) {
        throw new Error(`Port project "${project.id}" belum dialokasikan.`);
      }

      const configured: ProjectConfig = {
        ...project,
        valid: true,
        port,
      };
      this.lastKnownProjects.set(configured.id, configured);
      return configured;
    });
    const validIds = new Set(validProjects.map(({ id }) => id));
    const tombstoneProjects: ProjectConfig[] = [];

    for (const [projectId, lastKnown] of this.lastKnownProjects) {
      if (validIds.has(projectId)) {
        continue;
      }

      if (this.runtimes.get(projectId)?.child?.pid) {
        tombstoneProjects.push(lastKnown);
      } else {
        this.lastKnownProjects.delete(projectId);
        this.runtimes.delete(projectId);
      }
    }

    const tombstoneIds = new Set(tombstoneProjects.map(({ id }) => id));
    return {
      validProjects,
      invalidProjects: discovered.filter(
        (project) => !project.valid && !tombstoneIds.has(project.id),
      ),
      tombstoneProjects,
    };
  }

  private catalogProjects(): Promise<SynchronizedProjects> {
    return this.catalog ? Promise.resolve(this.catalog) : this.synchronize();
  }

  private async statesFor(projects: SynchronizedProjects): Promise<ProjectState[]> {
    const states = await Promise.all([
      ...projects.validProjects.map((project) => this.stateFor(project, true)),
      ...projects.invalidProjects.map((project) => this.stateForInvalid(project)),
      ...projects.tombstoneProjects.map((project) => this.stateFor(project, false)),
    ]);

    return states.sort(
      (first, second) =>
        first.name.localeCompare(second.name, 'id', { sensitivity: 'base' }) ||
        first.id.localeCompare(second.id, 'en'),
    );
  }

  async list(): Promise<ProjectState[]> {
    return this.statesFor(await this.catalogProjects());
  }

  async refresh(): Promise<ProjectState[]> {
    return this.statesFor(await this.synchronize());
  }

  async start(projectId: string): Promise<ProjectState> {
    const projects = await this.catalogProjects();
    const project = projects.validProjects.find((candidate) => candidate.id === projectId);
    if (!project) {
      const invalid = projects.invalidProjects.find((candidate) => candidate.id === projectId);
      throw new Error(
        invalid?.validationError ?? `Project "${projectId}" tidak ditemukan atau tidak valid.`,
      );
    }

    const runtime = this.runtimeFor(projectId);
    const currentState = await this.stateFor(project, true);

    if (['running', 'starting', 'external'].includes(currentState.status)) {
      return currentState;
    }
    if (currentState.status === 'port-conflict') {
      throw new Error(
        `Port ${project.port} sedang dipakai process lain. Port lock tidak akan dipindahkan.`,
      );
    }
    if (!existsSync(join(project.directory, 'package.json'))) {
      throw new Error(`package.json belum tersedia di ${project.relativePath}.`);
    }

    const npm = npmInvocation();
    const argumentsForNpm = [
      ...npm.leadingArguments,
      'run',
      'dev',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      String(project.port),
      '--strictPort',
    ];

    runtime.error = undefined;
    runtime.stopRequested = false;
    appendLog(
      runtime,
      'root',
      `Menjalankan npm run dev pada locked port ${project.port}.`,
      maximumLogLines,
    );

    const child = spawn(npm.command, argumentsForNpm, {
      cwd: project.directory,
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        PORT: String(project.port),
        DHEPIL_PROJECT_ID: project.id,
      },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    runtime.child = child;

    child.stdout.on('data', (chunk: Buffer) => {
      appendLog(runtime, 'stdout', chunk.toString('utf8'), maximumLogLines);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      appendLog(runtime, 'stderr', chunk.toString('utf8'), maximumLogLines);
    });
    child.once('error', (error) => {
      runtime.error = error.message;
      appendLog(runtime, 'root', `Gagal menjalankan process: ${error.message}`, maximumLogLines);
      if (runtime.child === child) {
        runtime.child = undefined;
      }
    });
    child.once('close', (code, signal) => {
      if (!runtime.stopRequested && code !== 0) {
        runtime.error = `Process berhenti dengan code ${code ?? 'null'}${signal ? ` (${signal})` : ''}.`;
      }
      appendLog(
        runtime,
        'root',
        runtime.stopRequested
          ? 'Process dihentikan dari dashboard.'
          : `Process selesai dengan code ${code ?? 'null'}.`,
        maximumLogLines,
      );
      if (runtime.child === child) {
        runtime.child = undefined;
      }
      runtime.stopRequested = false;
    });

    return this.stateFor(project, true);
  }

  async stop(projectId: string): Promise<ProjectState> {
    const projects = await this.catalogProjects();
    const availableProject =
      projects.validProjects.find((candidate) => candidate.id === projectId) ??
      projects.tombstoneProjects.find((candidate) => candidate.id === projectId);
    if (!availableProject) {
      throw new Error(`Project managed "${projectId}" tidak ditemukan.`);
    }

    const runtime = this.runtimeFor(projectId);
    const child = runtime.child;
    const folderAvailable = projects.validProjects.some(({ id }) => id === projectId);

    if (!child?.pid) {
      return this.stateFor(availableProject, folderAvailable);
    }

    runtime.stopRequested = true;
    appendLog(runtime, 'root', `Menghentikan process tree PID ${child.pid}.`, maximumLogLines);

    try {
      await killProcessTree(child.pid);
    } catch (error) {
      if (child.exitCode === null) {
        runtime.stopRequested = false;
        runtime.error = error instanceof Error ? error.message : String(error);
        throw error;
      }
    }

    return this.stateFor(availableProject, folderAvailable);
  }

  stopAllSync() {
    for (const runtime of this.runtimes.values()) {
      const pid = runtime.child?.pid;
      if (pid) {
        killProcessTreeSync(pid);
      }
    }
  }

  private async stateFor(project: ProjectConfig, folderAvailable: boolean): Promise<ProjectState> {
    const runtime = this.runtimeFor(project.id);
    const url = `http://127.0.0.1:${project.port}`;
    const managed = Boolean(runtime.child?.pid);

    if (!folderAvailable && managed) {
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        relativePath: project.relativePath,
        port: project.port,
        url,
        status: 'not-found',
        managed: true,
        pid: runtime.child?.pid,
        logs: [...runtime.logs],
        error: 'Folder atau kontrak app tidak lagi ditemukan (404).',
        desktop: project.desktop,
      };
    }

    const tcpOccupied = await isTcpPortOccupied(project.port);
    const httpReachable = tcpOccupied ? await isHttpReachable(url) : false;

    let status: ProjectState['status'];
    if (managed) {
      status = runtime.stopRequested ? 'stopping' : httpReachable ? 'running' : 'starting';
    } else if (httpReachable) {
      status = 'external';
    } else if (tcpOccupied) {
      status = 'port-conflict';
    } else if (runtime.error) {
      status = 'error';
    } else {
      status = 'stopped';
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      relativePath: project.relativePath,
      port: project.port,
      url,
      status,
      managed,
      pid: runtime.child?.pid,
      logs: [...runtime.logs],
      error: runtime.error,
      desktop: project.desktop,
    };
  }

  private stateForInvalid(project: DiscoveredProject): ProjectState {
    const runtime = this.runtimes.get(project.id);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      relativePath: project.relativePath,
      status: 'invalid',
      managed: false,
      logs: [...(runtime?.logs ?? [])],
      error: project.validationError ?? 'Kontrak app tidak valid.',
      desktop: project.desktop,
    };
  }
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(value));
}

function acceptsRequestOrigin(request: IncomingMessage) {
  const origin = request.headers.origin;
  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

export function projectManagerPlugin(): Plugin {
  const manager = new ProjectManager();
  const stopChildren = () => manager.stopAllSync();
  process.once('exit', stopChildren);

  return {
    name: 'dhepil-project-manager',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;

        if (!pathname.startsWith('/api/projects')) {
          next();
          return;
        }

        try {
          if (request.method === 'GET' && pathname === '/api/projects') {
            sendJson(response, 200, { projects: await manager.list() });
            return;
          }

          if (request.method === 'POST' && pathname === '/api/projects/refresh') {
            if (!acceptsRequestOrigin(request)) {
              sendJson(response, 403, { error: 'Origin request tidak diizinkan.' });
              return;
            }
            sendJson(response, 200, { projects: await manager.refresh() });
            return;
          }

          const actionMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/(start|stop)$/);
          if (request.method === 'POST' && actionMatch) {
            if (!acceptsRequestOrigin(request)) {
              sendJson(response, 403, { error: 'Origin request tidak diizinkan.' });
              return;
            }

            const [, projectId, action] = actionMatch;
            const project =
              action === 'start' ? await manager.start(projectId) : await manager.stop(projectId);
            sendJson(response, 200, { project });
            return;
          }

          sendJson(response, 404, { error: 'Endpoint tidak ditemukan.' });
        } catch (error) {
          sendJson(response, 400, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      server.httpServer?.once('close', stopChildren);
    },
  };
}
