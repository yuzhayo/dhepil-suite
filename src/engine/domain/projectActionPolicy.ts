import type { ProjectStatus } from '../contracts';
import {
  STOPPABLE_STATUSES,
  isActiveProject as classifyActiveProject,
  isOpenReadyProject as classifyOpenReadyProject,
} from './projectStatus';

export interface ProjectActionContext {
  status: ProjectStatus;
  managed: boolean;
  pending: boolean;
}

export function isActiveProject(status: ProjectStatus): boolean {
  return classifyActiveProject(status);
}

export function isOpenReadyProject(status: ProjectStatus): boolean {
  return classifyOpenReadyProject(status);
}

export function canStartProject(context: ProjectActionContext): boolean {
  return (
    !context.pending &&
    !context.managed &&
    (context.status === 'stopped' || context.status === 'error')
  );
}

export function canOpenProject(context: ProjectActionContext): boolean {
  return isOpenReadyProject(context.status);
}

export function canStopProject(context: ProjectActionContext): boolean {
  return !context.pending && context.managed && STOPPABLE_STATUSES.has(context.status);
}

export function canQuickKillProject(context: ProjectActionContext): boolean {
  return canStopProject(context);
}
