import { describe, expect, it, vi } from 'vitest';
import {
  createStartupReadinessRunner,
  startAndOpenProject,
  stopProject,
  StartupReadinessTimeoutError,
} from './projectLifecycle';
import type { ProjectSummary, ProjectManagerClient, ProjectWindow } from '../contracts';

describe('projectLifecycle', () => {
  describe('createStartupReadinessRunner', () => {
    it('returns project when ready', async () => {
      const mockProject: ProjectSummary = {
        id: 'app-1',
        name: 'App 1',
        description: '',
        relativePath: 'apps/app-1',
        status: 'running',
        managed: true,
        url: 'http://127.0.0.1:2000',
        logs: [],
        desktop: { enabled: false, script: '' },
      };

      const runner = createStartupReadinessRunner({
        maximumAttempts: 3,
        delayMilliseconds: 10,
        sleep: async () => {},
      });

      const result = await runner.waitUntilReady({
        readStatus: async () => mockProject,
        isReady: (p) => p?.status === 'running',
        isTerminalFailure: () => false,
      });

      expect(result).toEqual(mockProject);
    });

    it('throws error on terminal failure', async () => {
      const mockProject: ProjectSummary = {
        id: 'app-1',
        name: 'App 1',
        description: '',
        relativePath: 'apps/app-1',
        status: 'error',
        managed: true,
        error: 'Failed to start',
        logs: [],
        desktop: { enabled: false, script: '' },
      };

      const runner = createStartupReadinessRunner({
        maximumAttempts: 3,
        delayMilliseconds: 10,
        sleep: async () => {},
      });

      await expect(
        runner.waitUntilReady({
          readStatus: async () => mockProject,
          isReady: () => false,
          isTerminalFailure: (p) => p?.status === 'error',
        }),
      ).rejects.toThrow('Failed to start');
    });

    it('throws timeout error when maximum attempts reached', async () => {
      const mockProject: ProjectSummary = {
        id: 'app-1',
        name: 'App 1',
        description: '',
        relativePath: 'apps/app-1',
        status: 'starting',
        managed: true,
        logs: [],
        desktop: { enabled: false, script: '' },
      };

      const runner = createStartupReadinessRunner({
        maximumAttempts: 2,
        delayMilliseconds: 10,
        sleep: async () => {},
      });

      await expect(
        runner.waitUntilReady({
          readStatus: async () => mockProject,
          isReady: () => false,
          isTerminalFailure: () => false,
        }),
      ).rejects.toThrowError(StartupReadinessTimeoutError);
    });
  });

  describe('startAndOpenProject', () => {
    it('opens window directly if project is already running and ready', async () => {
      const mockProject: ProjectSummary = {
        id: 'app-1',
        name: 'App 1',
        description: '',
        relativePath: 'apps/app-1',
        status: 'running',
        managed: true,
        url: 'http://127.0.0.1:2000',
        logs: [],
        desktop: { enabled: false, script: '' },
      };

      const mockWindow: ProjectWindow = {
        prepare: vi.fn(),
        open: vi.fn(),
      };

      const mockClient: ProjectManagerClient = {
        list: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };

      const mockRunner = createStartupReadinessRunner();

      await startAndOpenProject({
        project: mockProject,
        pending: false,
        client: mockClient,
        window: mockWindow,
        readiness: mockRunner,
        refresh: async () => [mockProject],
      });

      expect(mockWindow.open).toHaveBeenCalledWith('http://127.0.0.1:2000');
      expect(mockClient.start).not.toHaveBeenCalled();
    });

    it('starts project and opens window when project is stopped', async () => {
      const stoppedProject: ProjectSummary = {
        id: 'app-1',
        name: 'App 1',
        description: '',
        relativePath: 'apps/app-1',
        status: 'stopped',
        managed: false,
        logs: [],
        desktop: { enabled: false, script: '' },
      };

      const runningProject: ProjectSummary = {
        ...stoppedProject,
        status: 'running',
        url: 'http://127.0.0.1:2000',
      };

      const mockPrepared = {
        opener: null,
        close: vi.fn(),
        location: { replace: vi.fn() },
      };

      const mockWindow: ProjectWindow = {
        prepare: vi.fn().mockReturnValue(mockPrepared),
        open: vi.fn(),
      };

      const mockClient: ProjectManagerClient = {
        list: vi.fn(),
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn(),
      };

      const mockRunner = {
        waitUntilReady: vi.fn().mockResolvedValue(runningProject),
      };

      await startAndOpenProject({
        project: stoppedProject,
        pending: false,
        client: mockClient,
        window: mockWindow,
        readiness: mockRunner,
        refresh: async () => [runningProject],
      });

      expect(mockClient.start).toHaveBeenCalledWith('app-1', undefined);
      expect(mockPrepared.location.replace).toHaveBeenCalledWith('http://127.0.0.1:2000');
    });
  });

  describe('stopProject', () => {
    it('stops managed stoppable project', async () => {
      const runningProject: ProjectSummary = {
        id: 'app-1',
        name: 'App 1',
        description: '',
        relativePath: 'apps/app-1',
        status: 'running',
        managed: true,
        url: 'http://127.0.0.1:2000',
        logs: [],
        desktop: { enabled: false, script: '' },
      };

      const mockClient: ProjectManagerClient = {
        list: vi.fn(),
        start: vi.fn(),
        stop: vi.fn().mockResolvedValue(undefined),
      };

      await stopProject({
        project: runningProject,
        pending: false,
        client: mockClient,
      });

      expect(mockClient.stop).toHaveBeenCalledWith('app-1', undefined);
    });

    it('does not stop unmanaged project', async () => {
      const runningProject: ProjectSummary = {
        id: 'app-1',
        name: 'App 1',
        description: '',
        relativePath: 'apps/app-1',
        status: 'running',
        managed: false,
        logs: [],
        desktop: { enabled: false, script: '' },
      };

      const mockClient: ProjectManagerClient = {
        list: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };

      await stopProject({
        project: runningProject,
        pending: false,
        client: mockClient,
      });

      expect(mockClient.stop).not.toHaveBeenCalled();
    });
  });
});
