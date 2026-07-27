import type { ProjectSummary } from '../../types';
import type { ProjectManagerClient } from '../ports/ProjectManagerClient';
import { refreshProjects } from './refreshProjects';

it('delegates list and its signal to the project client', async () => {
  const controller = new AbortController();
  const projects: ProjectSummary[] = [];
  const client = { list: vi.fn(async () => projects) } as unknown as ProjectManagerClient;

  await expect(refreshProjects(client, controller.signal)).resolves.toBe(projects);
  expect(client.list).toHaveBeenCalledWith(controller.signal);
});
