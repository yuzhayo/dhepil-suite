import { createToolbarViewModel } from './createToolbarViewModel';
import type { ProjectSummary } from '../../types';

const projects: ProjectSummary[] = [
  {
    id: 'running-project',
    name: 'Running',
    description: 'Running project',
    relativePath: 'apps/running',
    port: 2000,
    pid: 2000,
    status: 'running',
    managed: true,
    logs: [],
    desktop: { enabled: false, script: '' },
  },
  {
    id: 'external-project',
    name: 'External',
    description: 'External project',
    relativePath: 'apps/external',
    port: 2001,
    status: 'external',
    managed: false,
    logs: [],
    desktop: { enabled: false, script: '' },
  },
  {
    id: 'stopping-project',
    name: 'Stopping',
    description: 'Stopping project',
    relativePath: 'apps/stopping',
    port: 2002,
    pid: 2002,
    status: 'stopping',
    managed: true,
    logs: [],
    desktop: { enabled: false, script: '' },
  },
  {
    id: 'stopped-project',
    name: 'Stopped',
    description: 'Stopped project',
    relativePath: 'apps/stopped',
    status: 'stopped',
    managed: true,
    logs: [],
    desktop: { enabled: false, script: '' },
  },
];

const context = {
  searchQuery: 'run',
  sortMode: 'name-asc' as const,
  viewMode: 'grid' as const,
  pendingActions: { 'stopping-project': true },
  visibleProjectCount: 2,
};

describe('createToolbarViewModel', () => {
  it('creates summary and active server items from project state', () => {
    const viewModel = createToolbarViewModel(projects, context);

    expect(viewModel.searchQuery).toBe('run');
    expect(viewModel.sortMode).toBe('name-asc');
    expect(viewModel.viewMode).toBe('grid');
    expect(viewModel.summary).toEqual({
      visibleCount: 2,
      totalCount: 4,
      activeCount: 3,
    });
    expect(viewModel.activeServers.map((server) => server.id)).toEqual([
      'running-project',
      'external-project',
      'stopping-project',
    ]);
  });

  it('uses stable toolbar action IDs without inventing UI copy or bulk actions', () => {
    const viewModel = createToolbarViewModel(projects, context);

    expect(viewModel.actions.map((action) => action.actionId)).toEqual([
      'project.search.change',
      'project.sort.change',
      'project.view.change',
      'project.refresh',
    ]);
    expect(viewModel.actions.every((action) => !('label' in action))).toBe(true);
    expect(viewModel.actions.some((action) => action.actionId === 'project.quick-kill.all')).toBe(
      false,
    );
  });

  it('applies quick-kill policy and pending state per active server', () => {
    const viewModel = createToolbarViewModel(projects, context);
    const running = viewModel.activeServers.find((server) => server.id === 'running-project');
    const external = viewModel.activeServers.find((server) => server.id === 'external-project');
    const stopping = viewModel.activeServers.find((server) => server.id === 'stopping-project');

    expect(running?.action).toMatchObject({
      actionId: 'project.quick-kill',
      disabled: false,
      loading: false,
    });
    expect(external?.action).toMatchObject({
      actionId: 'project.quick-kill',
      disabled: true,
      loading: false,
    });
    expect(stopping?.action).toMatchObject({
      actionId: 'project.quick-kill',
      disabled: true,
      loading: false,
    });
  });

  it('marks refresh as disabled and loading when refresh is pending', () => {
    const viewModel = createToolbarViewModel(projects, {
      ...context,
      refreshPending: true,
    });
    const refresh = viewModel.actions.find((action) => action.actionId === 'project.refresh');

    expect(refresh).toMatchObject({ disabled: true, loading: true });
  });
});
