import type { ProjectManagerClient } from '../ports/ProjectManagerClient';

export async function refreshProjects(
  client: ProjectManagerClient,
  signal?: AbortSignal,
): ReturnType<ProjectManagerClient['list']> {
  return client.list(signal);
}
