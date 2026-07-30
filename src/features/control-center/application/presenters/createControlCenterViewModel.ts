import {
  selectProjects,
  type ProjectSortMode,
  type ProjectViewMode,
  type ProjectSummary,
} from '../../../../engine';
import type { AlertViewModel, ControlCenterViewModel, UiActionViewModel } from '../view-models';
import { createGridViewModel } from './createGridViewModel';
import { createHeaderViewModel } from './createHeaderViewModel';
import { createToolbarViewModel } from './createToolbarViewModel';

export interface ControlCenterPresenterContext {
  projects: readonly ProjectSummary[] | null;
  searchQuery: string;
  sortMode: ProjectSortMode;
  viewMode: ProjectViewMode;
  pendingActions: Readonly<Record<string, boolean>>;
  availableActionIds: readonly string[];
  pageError?: string;
  headerActions?: readonly UiActionViewModel[];
  refreshPending?: boolean;
}

export function createControlCenterViewModel(
  context: ControlCenterPresenterContext,
): ControlCenterViewModel {
  const projects = context.projects === null ? null : [...context.projects];
  const visibleProjects =
    projects === null ? null : selectProjects(projects, context.searchQuery, context.sortMode);

  return {
    header: createHeaderViewModel({ actions: context.headerActions }),
    toolbar: createToolbarViewModel(projects ?? [], {
      searchQuery: context.searchQuery,
      sortMode: context.sortMode,
      viewMode: context.viewMode,
      pendingActions: context.pendingActions,
      visibleProjectCount: visibleProjects?.length ?? 0,
      refreshPending: context.refreshPending,
    }),
    grid: createGridViewModel(visibleProjects, {
      pendingActions: context.pendingActions,
      viewMode: context.viewMode,
    }),
    availableActionIds: [...context.availableActionIds],
    pageAlert: context.pageError ? createPageAlert(context.pageError) : undefined,
  };
}

function createPageAlert(value: string): AlertViewModel {
  return {
    key: 'page-error',
    tone: 'danger',
    value,
  };
}
