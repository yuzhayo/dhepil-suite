import type { ProjectSummary } from '../../types';

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
