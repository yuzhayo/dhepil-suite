import type { ProjectManagerClient } from '../ports/ProjectManagerClient';
import { stopProject } from './stopProject';

const project = {
  id: 'project-1',
  name: 'Project One',
  description: '',
  relativePath: 'apps/project-one',
  status: 'running' as const,
  managed: true,
  logs: [],
  desktop: { enabled: false, script: '' },
};

it('stops an eligible managed project with its signal', async () => {
  const controller = new AbortController();
  const client = { stop: vi.fn(async () => undefined) } as unknown as ProjectManagerClient;

  await stopProject({ project, pending: false, client, signal: controller.signal });

  expect(client.stop).toHaveBeenCalledWith(project.id, controller.signal);
});

it('does not call the client for an ineligible project', async () => {
  const client = { stop: vi.fn(async () => undefined) } as unknown as ProjectManagerClient;

  await stopProject({ project: { ...project, managed: false }, pending: false, client });

  expect(client.stop).not.toHaveBeenCalled();
});
