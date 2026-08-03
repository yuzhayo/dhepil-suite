import type { ProjectManagerClient } from '../contracts';

export async function refreshProjects(
  client: ProjectManagerClient,
  signal?: AbortSignal,
): ReturnType<ProjectManagerClient['refresh']> {
  return client.refresh(signal);
}

export async function pollProjects(
  client: ProjectManagerClient,
  signal?: AbortSignal,
): ReturnType<ProjectManagerClient['list']> {
  return client.list(signal);
}
