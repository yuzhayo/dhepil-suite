import { describe, expect, it, vi } from 'vitest';
import { quickKillProject } from './quickKill';
import type { ProjectManagerClient, ProjectSummary } from '../contracts';

describe('quickKill', () => {
  it('calls client.stop when project is stoppable and managed', async () => {
    const runningProject: ProjectSummary = {
      id: 'app-1',
      name: 'App 1',
      description: '',
      relativePath: 'apps/app-1',
      status: 'running',
      managed: true,
      logs: [],
      desktop: { enabled: false, script: '' },
    };

    const mockClient: ProjectManagerClient = {
      list: vi.fn(),
      refresh: vi.fn(),
      start: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    };

    await quickKillProject({
      project: runningProject,
      pending: false,
      client: mockClient,
    });

    expect(mockClient.stop).toHaveBeenCalledWith('app-1', undefined);
  });

  it('does not call client.stop when project is pending', async () => {
    const runningProject: ProjectSummary = {
      id: 'app-1',
      name: 'App 1',
      description: '',
      relativePath: 'apps/app-1',
      status: 'running',
      managed: true,
      logs: [],
      desktop: { enabled: false, script: '' },
    };

    const mockClient: ProjectManagerClient = {
      list: vi.fn(),
      refresh: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    await quickKillProject({
      project: runningProject,
      pending: true,
      client: mockClient,
    });

    expect(mockClient.stop).not.toHaveBeenCalled();
  });
});
