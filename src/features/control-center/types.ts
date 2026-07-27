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
