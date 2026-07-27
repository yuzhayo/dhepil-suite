import type { ProjectSummary } from '../../types';
import type { ProjectManagerClient } from '../ports/ProjectManagerClient';
import type { ProjectWindow, PreparedProjectWindow } from '../ports/ProjectWindow';
import {
  StartupReadinessCancelledError,
  type StartupReadinessRunner,
} from './startupReadinessPolicy';
import { startAndOpenProject } from './startAndOpenProject';

function project(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: 'project-1',
    name: 'Project One',
    description: '',
    relativePath: 'apps/project-one',
    status: 'stopped',
    managed: false,
    logs: [],
    desktop: { enabled: false, script: '' },
    ...overrides,
  };
}

function createWindow(prepared?: PreparedProjectWindow): ProjectWindow {
  return {
    prepare: vi.fn(() => prepared),
    open: vi.fn(),
  };
}

function readyRunner(): StartupReadinessRunner {
  return {
    waitUntilReady: vi.fn(async (input) => {
      const candidate = await input.readStatus();
      if (!candidate || !input.isReady(candidate)) {
        throw new Error('Project belum siap setelah 30 detik.');
      }
      return candidate;
    }),
  };
}

describe('startAndOpenProject', () => {
  it('opens an already ready project without starting it', async () => {
    const client = { start: vi.fn() } as unknown as ProjectManagerClient;
    const window = createWindow();

    await startAndOpenProject({
      project: project({ status: 'running', managed: true, url: 'http://127.0.0.1:3000' }),
      pending: false,
      client,
      window,
      readiness: readyRunner(),
      refresh: async () => [],
    });

    expect(window.open).toHaveBeenCalledWith('http://127.0.0.1:3000');
    expect(client.start).not.toHaveBeenCalled();
  });

  it.each([
    project({ status: 'invalid' }),
    project({ status: 'stopped', managed: true }),
    project({ status: 'stopped', managed: false }),
  ])('does not start an ineligible project', async (candidate) => {
    const client = { start: vi.fn() } as unknown as ProjectManagerClient;
    const window = createWindow();

    await startAndOpenProject({
      project: candidate,
      pending: candidate.status === 'stopped' && !candidate.managed,
      client,
      window,
      readiness: readyRunner(),
      refresh: async () => [],
    });

    expect(client.start).not.toHaveBeenCalled();
    expect(window.prepare).not.toHaveBeenCalled();
  });

  it('starts, refreshes with its signal, and redirects the prepared tab', async () => {
    const controller = new AbortController();
    const prepared = {
      opener: null,
      close: vi.fn(),
      location: { replace: vi.fn() },
    };
    const client = { start: vi.fn(async () => undefined) } as unknown as ProjectManagerClient;
    const window = createWindow(prepared);
    const refresh = vi.fn(async (signal?: AbortSignal) => {
      void signal;
      return [project({ status: 'running', managed: true, url: 'http://127.0.0.1:3000' })];
    });

    await startAndOpenProject({
      project: project(),
      pending: false,
      client,
      window,
      readiness: readyRunner(),
      refresh,
      signal: controller.signal,
    });

    expect(client.start).toHaveBeenCalledWith('project-1', controller.signal);
    expect(refresh).toHaveBeenCalledWith(controller.signal);
    expect(prepared.location.replace).toHaveBeenCalledWith('http://127.0.0.1:3000');
    expect(prepared.close).not.toHaveBeenCalled();
  });

  it('opens a new tab if preparation is popup-blocked', async () => {
    const client = { start: vi.fn(async () => undefined) } as unknown as ProjectManagerClient;
    const window = createWindow();

    await startAndOpenProject({
      project: project(),
      pending: false,
      client,
      window,
      readiness: readyRunner(),
      refresh: async () => [
        project({ status: 'external', managed: false, url: 'http://127.0.0.1:3000' }),
      ],
    });

    expect(window.open).toHaveBeenCalledWith('http://127.0.0.1:3000');
  });

  it('closes the prepared tab when readiness aborts', async () => {
    const prepared = {
      opener: null,
      close: vi.fn(),
      location: { replace: vi.fn() },
    };
    const controller = new AbortController();
    const client = { start: vi.fn(async () => undefined) } as unknown as ProjectManagerClient;
    const waitUntilReady = vi.fn(
      async (input: Parameters<StartupReadinessRunner['waitUntilReady']>[0]) => {
        controller.abort();
        if (input.signal?.aborted) {
          throw new StartupReadinessCancelledError();
        }
        throw new Error('Signal was not forwarded to readiness.');
      },
    );

    await expect(
      startAndOpenProject({
        project: project(),
        pending: false,
        client,
        window: createWindow(prepared),
        readiness: { waitUntilReady },
        refresh: async () => [],
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(StartupReadinessCancelledError);
    expect(waitUntilReady).toHaveBeenCalledWith(
      expect.objectContaining({ signal: controller.signal }),
    );
    expect(prepared.close).toHaveBeenCalledOnce();
  });

  it('closes the prepared tab when startup fails', async () => {
    const prepared = {
      opener: null,
      close: vi.fn(),
      location: { replace: vi.fn() },
    };
    const client = { start: vi.fn(async () => undefined) } as unknown as ProjectManagerClient;

    await expect(
      startAndOpenProject({
        project: project(),
        pending: false,
        client,
        window: createWindow(prepared),
        readiness: { waitUntilReady: vi.fn(async () => Promise.reject(new Error('gagal'))) },
        refresh: async () => [],
      }),
    ).rejects.toThrow('gagal');
    expect(prepared.close).toHaveBeenCalledOnce();
  });
});
