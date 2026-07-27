import { browserProjectWindow } from '../../data/browserProjectWindow';
import { httpProjectManagerClient } from '../../data/httpProjectManagerClient';
import type { ProjectSummary } from '../../types';
import { quickKillProject } from '../commands/quickKillProject';
import { refreshProjects } from '../commands/refreshProjects';
import { startAndOpenProject } from '../commands/startAndOpenProject';
import {
  createStartupReadinessRunner,
  type StartupReadinessRunner,
} from '../commands/startupReadinessPolicy';
import { stopProject } from '../commands/stopProject';
import type {
  ControlCenterActionContext,
  ControlCenterExtension,
  ExtensionHost,
} from '../extensions/contracts';
import { createExtensionHost } from '../extensions/createExtensionHost';
import { loadExtensions } from '../extensions/loadExtensions';
import type { ProjectManagerClient } from '../ports/ProjectManagerClient';
import type { ProjectWindow } from '../ports/ProjectWindow';

export interface ControlCenterRuntime {
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
  createHost(context: ControlCenterActionContext): ExtensionHost;
}

export interface ControlCenterRuntimeDependencies {
  client?: ProjectManagerClient;
  projectWindow?: ProjectWindow;
  readiness?: StartupReadinessRunner;
  extensions?: readonly ControlCenterExtension[];
}

export function createControlCenterRuntime(
  dependencies: ControlCenterRuntimeDependencies = {},
): ControlCenterRuntime {
  const client = dependencies.client ?? httpProjectManagerClient();
  const projectWindow = dependencies.projectWindow ?? browserProjectWindow();
  const readiness = dependencies.readiness ?? createStartupReadinessRunner();
  const extensions = dependencies.extensions ?? loadExtensions();

  return {
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
    createHost(context) {
      return createExtensionHost(extensions, context);
    },
  };
}
