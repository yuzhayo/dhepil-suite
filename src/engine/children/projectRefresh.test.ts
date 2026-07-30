import { describe, expect, it, vi } from 'vitest';
import { refreshProjects } from './projectRefresh';
import type { ProjectManagerClient, ProjectSummary } from '../contracts';

describe('projectRefresh', () => {
  it('calls client.list with signal', async () => {
    const mockProjects: ProjectSummary[] = [
      {
        id: 'app-1',
        name: 'App 1',
        description: '',
        relativePath: 'apps/app-1',
        status: 'stopped',
        managed: false,
        logs: [],
        desktop: { enabled: false, script: '' },
      },
    ];

    const mockClient: ProjectManagerClient = {
      list: vi.fn().mockResolvedValue(mockProjects),
      start: vi.fn(),
      stop: vi.fn(),
    };

    const controller = new AbortController();
    const result = await refreshProjects(mockClient, controller.signal);

    expect(mockClient.list).toHaveBeenCalledWith(controller.signal);
    expect(result).toEqual(mockProjects);
  });
});
