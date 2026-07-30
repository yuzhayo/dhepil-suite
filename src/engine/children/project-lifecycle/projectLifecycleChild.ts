import { canStartProject } from '../../domain/projectActionPolicy';
import { isOpenReadyProject, isStartupTerminalFailure } from '../../domain/projectStatus';
import type { ProjectSummary, ProjectManagerClient, ProjectWindow } from '../../contracts';
import type { StartupReadinessRunner } from './startupReadinessPolicy';

export interface StartAndOpenProjectInput {
  project: ProjectSummary;
  pending: boolean;
  client: ProjectManagerClient;
  window: ProjectWindow;
  readiness: StartupReadinessRunner;
  refresh(signal?: AbortSignal): Promise<ProjectSummary[]>;
  signal?: AbortSignal;
}

export async function startAndOpenProject({
  project,
  pending,
  client,
  window,
  readiness,
  refresh,
  signal,
}: StartAndOpenProjectInput): Promise<void> {
  if (isOpenReadyProject(project.status) && project.url) {
    window.open(project.url);
    return;
  }

  if (!canStartProject({ status: project.status, managed: project.managed, pending })) {
    return;
  }

  const prepared = window.prepare(project);
  try {
    await client.start(project.id, signal);
    const readyProject = await readiness.waitUntilReady({
      signal,
      readStatus: async () =>
        (await refresh(signal)).find((candidate) => candidate.id === project.id),
      isReady: (candidate) =>
        candidate !== undefined && Boolean(candidate.url) && isOpenReadyProject(candidate.status),
      isTerminalFailure: (candidate) =>
        candidate !== undefined && isStartupTerminalFailure(candidate.status),
    });

    if (!readyProject.url) {
      throw new Error(`${readyProject.name} tidak dapat dibuka.`);
    }

    if (prepared) {
      prepared.opener = null;
      prepared.location.replace(readyProject.url);
    } else {
      window.open(readyProject.url);
    }
  } catch (error) {
    prepared?.close();
    throw error;
  }
}

export { createStartupReadinessRunner, type StartupReadinessRunner } from './startupReadinessPolicy';
