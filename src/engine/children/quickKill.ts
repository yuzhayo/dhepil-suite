import { canQuickKillProject } from '../projectActionPolicy';
import type { ProjectSummary, ProjectManagerClient } from '../contracts';

export interface QuickKillProjectInput {
  project: ProjectSummary;
  pending: boolean;
  client: ProjectManagerClient;
  signal?: AbortSignal;
}

export async function quickKillProject({
  project,
  pending,
  client,
  signal,
}: QuickKillProjectInput): Promise<void> {
  if (!canQuickKillProject({ status: project.status, managed: project.managed, pending })) {
    return;
  }

  await client.stop(project.id, signal);
}
