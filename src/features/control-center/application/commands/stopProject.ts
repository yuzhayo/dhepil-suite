import { canStopProject } from '../../domain/projectActionPolicy';
import type { ProjectSummary } from '../../types';
import type { ProjectManagerClient } from '../ports/ProjectManagerClient';

export interface StopProjectInput {
  project: ProjectSummary;
  pending: boolean;
  client: ProjectManagerClient;
  signal?: AbortSignal;
}

export async function stopProject({
  project,
  pending,
  client,
  signal,
}: StopProjectInput): Promise<void> {
  if (!canStopProject({ status: project.status, managed: project.managed, pending })) {
    return;
  }

  await client.stop(project.id, signal);
}
