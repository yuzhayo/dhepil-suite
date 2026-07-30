export type ProjectStatus =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'error'
  | 'invalid'
  | 'external'
  | 'port-conflict'
  | 'not-found';

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  relativePath: string;
  port?: number;
  url?: string;
  status: ProjectStatus;
  managed: boolean;
  pid?: number;
  logs: string[];
  error?: string;
  desktop: {
    enabled: boolean;
    script: string;
  };
}

export interface ProjectsResponse {
  projects: ProjectSummary[];
}

// --- Adapter port contracts ---

export interface ProjectManagerClient {
  list(signal?: AbortSignal): Promise<ProjectSummary[]>;
  start(projectId: string, signal?: AbortSignal): Promise<void>;
  stop(projectId: string, signal?: AbortSignal): Promise<void>;
}

export interface PreparedProjectWindow {
  opener: null;
  close(): void;
  location: {
    replace(url: string): void;
  };
}

export interface ProjectWindow {
  prepare(project: ProjectSummary): PreparedProjectWindow | undefined;
  open(url: string): void;
}

// --- Domain Keys ---

export type StatusKey = ProjectStatus;

export type AlertKey =
  | 'startup-failed'
  | 'port-conflict'
  | 'invalid-config'
  | 'project-not-found'
  | 'process-error'
  | 'page-error';

export type TagKey = 'managed' | 'external' | 'tombstone' | 'port' | 'pid' | 'path' | 'desktop';
