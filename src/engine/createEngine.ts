import { browserProjectWindow } from './browserWindow';
import { httpProjectManagerClient } from './httpClient';
import type { ProjectSummary, ProjectManagerClient, ProjectWindow } from './contracts';
import { quickKillProject } from './children/quickKill';
import { pollProjects, refreshProjects } from './children/projectRefresh';
import {
  startAndOpenProject,
  stopProject,
  createStartupReadinessRunner,
  type StartupReadinessRunner,
} from './children/projectLifecycle';

export interface ControlCenterRuntime {
  poll(signal?: AbortSignal): Promise<ProjectSummary[]>;
  refresh(signal?: AbortSignal): Promise<ProjectSummary[]>;
  startAndOpen(input: {
    project: ProjectSummary;
    pending: boolean;
    refresh(signal?: AbortSignal): Promise<ProjectSummary[]>;
    signal?: AbortSignal;
  }): Promise<void>;
  stop(input: { project: ProjectSummary; pending: boolean; signal?: AbortSignal }): Promise<void>;
  quickKill(input: {
    project: ProjectSummary;
    pending: boolean;
    signal?: AbortSignal;
  }): Promise<void>;
}

export interface ControlCenterRuntimeDependencies {
  client?: ProjectManagerClient;
  projectWindow?: ProjectWindow;
  readiness?: StartupReadinessRunner;
}

export function createControlCenterRuntime(
  dependencies: ControlCenterRuntimeDependencies = {},
): ControlCenterRuntime {
  const client = dependencies.client ?? httpProjectManagerClient();
  const projectWindow = dependencies.projectWindow ?? browserProjectWindow();
  const readiness = dependencies.readiness ?? createStartupReadinessRunner();

  return {
    poll(signal) {
      return pollProjects(client, signal);
    },
    refresh(signal) {
      return refreshProjects(client, signal);
    },
    startAndOpen(input) {
      return startAndOpenProject({
        ...input,
        client,
        window: projectWindow,
        readiness,
      });
    },
    stop(input) {
      return stopProject({ ...input, client });
    },
    quickKill(input) {
      return quickKillProject({ ...input, client });
    },
  };
}
