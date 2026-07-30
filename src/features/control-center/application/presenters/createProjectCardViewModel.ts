import {
  type ProjectSummary,
  canOpenProject,
  canQuickKillProject,
  canStartProject,
  canStopProject,
} from '../../../../engine';
import type {
  AlertViewModel,
  CardActionViewModel,
  ProjectCardViewModel,
  TagViewModel,
  TerminalViewModel,
} from '../view-models';
import { MAX_RENDERED_LOG_LINES } from '../presentationLimits';
import { createStatusViewModel } from './statusViewModel';

export interface ProjectCardPresenterContext {
  pending: boolean;
}

export function createProjectCardViewModel(
  project: ProjectSummary,
  context: ProjectCardPresenterContext,
): ProjectCardViewModel {
  const actionContext = {
    status: project.status,
    managed: project.managed,
    pending: context.pending,
  };
  const nonPendingActionContext = { ...actionContext, pending: false };
  const canOpen = canOpenProject(actionContext) && Boolean(project.url);
  const canStart = canStartProject(actionContext);
  const canStop = canStopProject(actionContext);
  const canQuickKill = canQuickKillProject(actionContext);
  const couldStart = canStartProject(nonPendingActionContext);
  const couldStop = canStopProject(nonPendingActionContext);
  const couldQuickKill = canQuickKillProject(nonPendingActionContext);

  const actions: readonly CardActionViewModel[] = [
    {
      actionId: 'project.start-open',
      disabled: !canOpen && !canStart,
      loading: context.pending && !canOpen && couldStart,
    },
    {
      actionId: 'project.stop',
      disabled: !canStop,
      loading: context.pending && couldStop,
    },
    {
      actionId: 'project.quick-kill',
      disabled: !canQuickKill,
      loading: context.pending && couldQuickKill,
    },
  ];

  return {
    id: project.id,
    name: project.name,
    status: createStatusViewModel(project.status),
    alerts: createAlerts(project),
    tags: createTags(project),
    actions,
    terminal: createTerminalViewModel(project.logs),
    url: project.url,
  };
}

function createAlerts(project: ProjectSummary): readonly AlertViewModel[] {
  if (project.status === 'error') {
    return [{ key: 'startup-failed', tone: 'danger', value: project.error }];
  }

  if (project.status === 'port-conflict') {
    return [
      {
        key: 'port-conflict',
        tone: 'warning',
        value: project.error ?? (project.port === undefined ? undefined : String(project.port)),
      },
    ];
  }

  if (project.status === 'invalid') {
    return [{ key: 'invalid-config', tone: 'danger', value: project.error }];
  }

  if (project.status === 'not-found') {
    return [{ key: 'project-not-found', tone: 'warning', value: project.relativePath }];
  }

  if (project.error) {
    return [{ key: 'process-error', tone: 'danger', value: project.error }];
  }

  return [];
}

function createTags(project: ProjectSummary): readonly TagViewModel[] {
  const tags: TagViewModel[] = [];

  if (project.managed) {
    tags.push({ key: 'managed' });
  }
  if (project.status === 'external') {
    tags.push({ key: 'external' });
  }
  if (project.managed && project.status === 'not-found') {
    tags.push({ key: 'tombstone' });
  }
  if (project.port !== undefined) {
    tags.push({ key: 'port', value: String(project.port) });
  }
  if (project.pid !== undefined) {
    tags.push({ key: 'pid', value: String(project.pid) });
  }
  tags.push({ key: 'path', value: project.relativePath });
  if (project.desktop.enabled) {
    tags.push({ key: 'desktop' });
  }

  return tags;
}

function createTerminalViewModel(logs: readonly string[]): TerminalViewModel {
  const lines = logs.slice(-MAX_RENDERED_LOG_LINES);

  return {
    lines,
    truncated: logs.length > MAX_RENDERED_LOG_LINES,
    maxLines: MAX_RENDERED_LOG_LINES,
  };
}
