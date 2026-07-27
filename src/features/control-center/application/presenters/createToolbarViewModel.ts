import type { ProjectSortMode, ProjectViewMode } from '../../domain/projectCollection';
import { canQuickKillProject } from '../../domain/projectActionPolicy';
import { isActiveProject } from '../../domain/projectStatus';
import type { ProjectSummary } from '../../types';
import type {
  ActiveServerItemViewModel,
  CardActionViewModel,
  ToolbarViewModel,
  UiActionViewModel,
} from '../view-models';
import { createStatusViewModel } from './statusViewModel';

export interface ToolbarPresenterContext {
  searchQuery: string;
  sortMode: ProjectSortMode;
  viewMode: ProjectViewMode;
  pendingActions: Readonly<Record<string, boolean>>;
  visibleProjectCount?: number;
  refreshPending?: boolean;
}

export function createToolbarViewModel(
  projects: readonly ProjectSummary[],
  context: ToolbarPresenterContext,
): ToolbarViewModel {
  const activeServers = projects
    .filter((project) => isActiveProject(project.status))
    .map((project) => createActiveServerItem(project, context.pendingActions));

  const actions: readonly UiActionViewModel[] = [
    {
      actionId: 'project.search.change',
      disabled: false,
      loading: false,
    },
    {
      actionId: 'project.sort.change',
      disabled: false,
      loading: false,
    },
    {
      actionId: 'project.view.change',
      disabled: false,
      loading: false,
    },
    {
      actionId: 'project.refresh',
      disabled: Boolean(context.refreshPending),
      loading: Boolean(context.refreshPending),
    },
  ];

  return {
    searchQuery: context.searchQuery,
    sortMode: context.sortMode,
    viewMode: context.viewMode,
    summary: {
      visibleCount: context.visibleProjectCount ?? projects.length,
      totalCount: projects.length,
      activeCount: activeServers.length,
    },
    activeServers,
    actions,
  };
}

function createActiveServerItem(
  project: ProjectSummary,
  pendingActions: Readonly<Record<string, boolean>>,
): ActiveServerItemViewModel {
  const canQuickKill = canQuickKillProject({
    status: project.status,
    managed: project.managed,
    pending: Boolean(pendingActions[project.id]),
  });
  const couldQuickKill = canQuickKillProject({
    status: project.status,
    managed: project.managed,
    pending: false,
  });
  const action: CardActionViewModel = {
    actionId: 'project.quick-kill',
    disabled: !canQuickKill,
    loading: Boolean(pendingActions[project.id]) && couldQuickKill,
  };

  return {
    id: project.id,
    name: project.name,
    port: project.port,
    pid: project.pid,
    status: createStatusViewModel(project.status),
    managed: project.managed,
    action,
  };
}
