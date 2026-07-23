import type { ChildProcess } from 'node:child_process';

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

export interface DesktopConfig {
  enabled: boolean;
  script: string;
}

export interface DiscoveredProject {
  id: string;
  name: string;
  description: string;
  relativePath: string;
  directory: string;
  desktop: DesktopConfig;
  valid: boolean;
  validationError?: string;
}

export interface ProjectConfig extends DiscoveredProject {
  valid: true;
  port: number;
}

export interface ProjectState {
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
  desktop: DesktopConfig;
}

export interface RuntimeRecord {
  child?: ChildProcess;
  logs: string[];
  error?: string;
  stopRequested: boolean;
}
