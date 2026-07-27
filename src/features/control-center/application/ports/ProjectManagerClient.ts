import type { ProjectSummary } from '../../types';

export interface ProjectManagerClient {
  list(signal?: AbortSignal): Promise<ProjectSummary[]>;
  start(projectId: string, signal?: AbortSignal): Promise<void>;
  stop(projectId: string, signal?: AbortSignal): Promise<void>;
}
