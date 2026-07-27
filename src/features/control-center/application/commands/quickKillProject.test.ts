import type { ProjectManagerClient } from '../ports/ProjectManagerClient';
import { quickKillProject } from './quickKillProject';

const project = {
  id: 'project-1',
  name: 'Project One',
  description: '',
  relativePath: 'apps/project-one',
  status: 'not-found' as const,
  managed: true,
  logs: [],
  desktop: { enabled: false, script: '' },
};

it('quick-kills an eligible managed tombstone with its signal', async () => {
  const controller = new AbortController();
  const client = { stop: vi.fn(async () => undefined) } as unknown as ProjectManagerClient;

  await quickKillProject({ project, pending: false, client, signal: controller.signal });

  expect(client.stop).toHaveBeenCalledWith(project.id, controller.signal);
});

it('does not quick-kill an external project', async () => {
  const client = { stop: vi.fn(async () => undefined) } as unknown as ProjectManagerClient;

  await quickKillProject({
    project: { ...project, status: 'external', managed: false },
    pending: false,
    client,
  });

  expect(client.stop).not.toHaveBeenCalled();
});
