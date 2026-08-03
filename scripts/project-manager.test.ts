import { createServer } from 'node:net';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { appendLog } from './project-process';
import { ProjectManager, projectManagerPlugin } from './project-manager';
import type { RuntimeRecord } from './project-contracts';

async function createApp(rootDirectory: string, id: string, valid = true) {
  const appDirectory = join(rootDirectory, 'apps', id);
  await mkdir(appDirectory, { recursive: true });
  await writeFile(
    join(appDirectory, 'app.manifest.json'),
    valid
      ? JSON.stringify({
          schemaVersion: 1,
          id,
          name: id,
          runtime: 'vite',
        })
      : '{',
    'utf8',
  );
  await writeFile(
    join(appDirectory, 'package.json'),
    JSON.stringify({
      scripts: {
        dev: 'vite',
      },
    }),
    'utf8',
  );
}

describe('ProjectManager discovery', () => {
  it('memakai katalog cache sampai refresh lalu memberikan port app yang hilang ke app baru', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'dhepil-suite-manager-'));
    await mkdir(join(rootDirectory, 'apps'));

    try {
      await createApp(rootDirectory, 'sample-app');
      const manager = new ProjectManager({ rootDirectory });
      const first = await manager.list();
      const assignedPort = first[0]?.port;

      expect(first).toMatchObject([
        {
          id: 'sample-app',
          status: 'stopped',
          managed: false,
        },
      ]);
      expect(assignedPort).toBeGreaterThanOrEqual(2000);

      await rm(join(rootDirectory, 'apps', 'sample-app'), {
        recursive: true,
        force: true,
      });
      await createApp(rootDirectory, 'new-app');

      expect(await manager.list()).toMatchObject([{ id: 'sample-app' }]);
      expect(await manager.refresh()).toMatchObject([{ id: 'new-app', port: assignedPort }]);

      await createApp(rootDirectory, 'sample-app');
      const refreshed = await manager.refresh();
      expect(refreshed.find(({ id }) => id === 'new-app')?.port).toBe(assignedPort);
      expect(refreshed.find(({ id }) => id === 'sample-app')?.port).not.toBe(assignedPort);
    } finally {
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });

  it('menggunakan satu in-flight synchronization untuk list yang overlap', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'dhepil-suite-single-flight-'));
    await mkdir(join(rootDirectory, 'apps'));

    try {
      await createApp(rootDirectory, 'sample-app');
      const manager = new ProjectManager({ rootDirectory });
      const synchronize = Reflect.get(manager, 'synchronize').bind(
        manager,
      ) as () => Promise<unknown>;
      const first = synchronize();
      const second = synchronize();
      expect(second).toBe(first);
      await Promise.all([first, second]);
    } finally {
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });

  it('menyinkronkan start app valid yang overlap dengan list tanpa assignment ganda', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'dhepil-suite-overlap-'));
    await mkdir(join(rootDirectory, 'apps'));
    const sockets = new Set<import('node:net').Socket>();
    const listener = createServer((socket) => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
      socket.on('error', () => undefined);
      socket.destroy();
    });

    try {
      await createApp(rootDirectory, 'sample-app');
      const manager = new ProjectManager({ rootDirectory });
      const assignedPort = (await manager.list())[0]?.port;
      expect(assignedPort).toBeGreaterThanOrEqual(2000);
      expect(assignedPort).toBeLessThanOrEqual(2999);
      if (assignedPort === undefined) {
        throw new Error('Fixture tidak mendapat stable port.');
      }
      await new Promise<void>((resolvePromise, rejectPromise) => {
        listener.once('error', rejectPromise);
        listener.listen(assignedPort, '127.0.0.1', resolvePromise);
      });
      const [listed, startFailure] = await Promise.all([
        manager.list(),
        manager.start('sample-app').catch((error: unknown) => error),
      ]);
      expect(listed[0]?.port).toBe(assignedPort);
      expect(startFailure).toBeInstanceOf(Error);
      expect(String(startFailure)).toContain(`Port ${assignedPort} sedang dipakai`);
      const registry = JSON.parse(
        await (
          await import('node:fs/promises')
        ).readFile(join(rootDirectory, 'config', 'app-ports.lock.json'), 'utf8'),
      ) as { assignments: Record<string, number> };
      expect(registry.assignments).toEqual({ 'sample-app': assignedPort });
    } finally {
      for (const socket of sockets) {
        socket.destroy();
      }
      await new Promise<void>((resolvePromise) => listener.close(() => resolvePromise()));
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });

  it('mempertahankan maksimum 120 log dan membersihkan ANSI', () => {
    const runtime: RuntimeRecord = { logs: [], stopRequested: false };
    appendLog(
      runtime,
      'stdout',
      Array.from({ length: 121 }, (_, index) => `[31mline-${index}[0m`).join('\n'),
      120,
    );

    expect(runtime.logs).toHaveLength(120);
    expect(runtime.logs[0]).toBe('[stdout] line-1');
    expect(runtime.logs[119]).toBe('[stdout] line-120');
  });

  it('menerima mutation hanya melalui POST same-origin dan GET tetap read-only', async () => {
    type Middleware = (request: unknown, response: unknown, next: () => void) => Promise<void>;
    let middleware: Middleware | undefined;
    const response = {
      statusCode: 0,
      headers: new Map<string, string>(),
      body: '',
      setHeader(name: string, value: string) {
        this.headers.set(name, value);
      },
      end(value: string) {
        this.body = value;
      },
    };
    const plugin = projectManagerPlugin();
    const configureServer = plugin.configureServer as (server: unknown) => void;
    configureServer({
      middlewares: {
        use(handler: Middleware) {
          middleware = handler;
        },
      },
      httpServer: { once: vi.fn() },
    });

    expect(middleware).toBeDefined();
    await middleware!(
      { method: 'GET', url: '/api/projects/not-real/start', headers: {} },
      response,
      vi.fn(),
    );
    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('Endpoint tidak ditemukan');

    response.statusCode = 0;
    response.body = '';
    await middleware!(
      {
        method: 'POST',
        url: '/api/projects/not-real/start',
        headers: { host: '127.0.0.1:1999', origin: 'https://attacker.invalid' },
      },
      response,
      vi.fn(),
    );
    expect(response.statusCode).toBe(403);
    expect(response.body).toContain('Origin request tidak diizinkan');

    response.statusCode = 0;
    response.body = '';
    await middleware!(
      {
        method: 'POST',
        url: '/api/projects/not-real/start',
        headers: { host: '127.0.0.1:1999', origin: 'http://127.0.0.1:1999' },
      },
      response,
      vi.fn(),
    );
    expect(response.statusCode).toBe(400);
    expect(response.body).not.toContain('Origin request tidak diizinkan');
  });

  it('menampilkan folder dengan kontrak rusak sebagai invalid', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'dhepil-suite-invalid-'));
    await mkdir(join(rootDirectory, 'apps'));

    try {
      await createApp(rootDirectory, 'broken-app', false);
      const manager = new ProjectManager({ rootDirectory });

      expect(await manager.list()).toMatchObject([
        {
          id: 'broken-app',
          status: 'invalid',
          managed: false,
        },
      ]);

      await createApp(rootDirectory, 'broken-app');
      expect(await manager.list()).toMatchObject([{ id: 'broken-app', status: 'invalid' }]);
      expect(await manager.refresh()).toMatchObject([{ id: 'broken-app', status: 'stopped' }]);
    } finally {
      await rm(rootDirectory, { recursive: true, force: true });
    }
  });
});
