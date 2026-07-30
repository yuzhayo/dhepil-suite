import { createControlCenterViewModel } from './createControlCenterViewModel';
import type { ProjectSummary } from '../../../../engine';

const projects: ProjectSummary[] = [
  {
    id: 'alpha',
    name: 'Alpha',
    description: 'Alpha project',
    relativePath: 'apps/alpha',
    status: 'running',
    managed: true,
    logs: [],
    desktop: { enabled: false, script: '' },
  },
  {
    id: 'beta',
    name: 'Beta',
    description: 'Beta project',
    relativePath: 'apps/beta',
    status: 'stopped',
    managed: false,
    logs: [],
    desktop: { enabled: false, script: '' },
  },
];

const baseContext = {
  projects,
  searchQuery: '',
  sortMode: 'name-asc' as const,
  viewMode: 'grid' as const,
  pendingActions: {},
  availableActionIds: ['project.refresh'] as const,
};

describe('createControlCenterViewModel', () => {
  it('owns root composition and passes sorted visible projects to the grid', () => {
    const viewModel = createControlCenterViewModel({
      ...baseContext,
      searchQuery: 'project',
      sortMode: 'name-desc',
      viewMode: 'list',
    });

    expect(viewModel.toolbar.summary).toEqual({
      visibleCount: 2,
      totalCount: 2,
      activeCount: 1,
    });
    expect(viewModel.grid.state).toBe('ready');
    if (viewModel.grid.state !== 'ready') {
      throw new Error('Expected ready grid state');
    }

    expect(viewModel.grid.viewMode).toBe('list');
    expect(viewModel.grid.projects.map((project) => project.name)).toEqual(['Beta', 'Alpha']);
  });

  it('returns loading state without inventing toolbar or header copy', () => {
    const viewModel = createControlCenterViewModel({
      ...baseContext,
      projects: null,
    });

    expect(viewModel.grid).toEqual({ state: 'loading' });
    expect(viewModel.toolbar.summary).toEqual({
      visibleCount: 0,
      totalCount: 0,
      activeCount: 0,
    });
    expect(viewModel.header).toEqual({ actions: [] });
  });

  it('returns empty state when search has no matches', () => {
    const viewModel = createControlCenterViewModel({
      ...baseContext,
      searchQuery: 'missing',
    });

    expect(viewModel.grid).toEqual({ state: 'empty' });
    expect(viewModel.toolbar.summary.visibleCount).toBe(0);
    expect(viewModel.toolbar.summary.totalCount).toBe(2);
  });

  it('converts a page error into a semantic dynamic alert', () => {
    const viewModel = createControlCenterViewModel({
      ...baseContext,
      pageError: 'Network unavailable',
    });

    expect(viewModel.pageAlert).toEqual({
      key: 'page-error',
      tone: 'danger',
      value: 'Network unavailable',
    });
  });

  it('copies available action IDs and preserves supplied header action state', () => {
    const availableActionIds = ['project.refresh'];
    const headerActions = [
      {
        actionId: 'project.refresh',
        disabled: false,
        loading: false,
      },
    ] as const;
    const viewModel = createControlCenterViewModel({
      ...baseContext,
      availableActionIds,
      headerActions,
    });

    expect(viewModel.availableActionIds).toEqual(availableActionIds);
    expect(viewModel.availableActionIds).not.toBe(availableActionIds);
    expect(viewModel.header.actions).toEqual(headerActions);
  });
});
