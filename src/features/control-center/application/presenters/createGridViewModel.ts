import { type ProjectViewMode, type ProjectSummary } from '../../../../engine';
import type { ProjectGridViewModel } from '../view-models';
import { createProjectCardViewModel } from './createProjectCardViewModel';

export interface GridPresenterContext {
  pendingActions: Readonly<Record<string, boolean>>;
  viewMode: ProjectViewMode;
}

export function createGridViewModel(
  projects: readonly ProjectSummary[] | null,
  context: GridPresenterContext,
): ProjectGridViewModel {
  if (projects === null) {
    return { state: 'loading' };
  }

  if (projects.length === 0) {
    return { state: 'empty' };
  }

  return {
    state: 'ready',
    viewMode: context.viewMode,
    projects: projects.map((project) =>
      createProjectCardViewModel(project, {
        pending: Boolean(context.pendingActions[project.id]),
      }),
    ),
  };
}
