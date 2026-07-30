import { createGridViewModel } from './createGridViewModel';
import type { ProjectSummary } from '../../../../engine';

const project: ProjectSummary = {
  id: 'project-1',
  name: 'Project One',
  description: 'A project',
  relativePath: 'apps/project-one',
  status: 'running',
  managed: true,
  logs: [],
  desktop: { enabled: false, script: '' },
};

describe('createGridViewModel', () => {
  it('returns the loading discriminant without static UI copy', () => {
    expect(
      createGridViewModel(null, {
        pendingActions: {},
        viewMode: 'grid',
      }),
    ).toEqual({ state: 'loading' });
  });

  it('returns the empty discriminant without static UI copy', () => {
    expect(
      createGridViewModel([], {
        pendingActions: {},
        viewMode: 'list',
      }),
    ).toEqual({ state: 'empty' });
  });

  it('returns ready state with view mode and card view models', () => {
    const viewModel = createGridViewModel([project], {
      pendingActions: { 'project-1': true },
      viewMode: 'list',
    });

    expect(viewModel.state).toBe('ready');
    if (viewModel.state !== 'ready') {
      throw new Error('Expected ready grid state');
    }

    expect(viewModel.viewMode).toBe('list');
    expect(viewModel.projects).toHaveLength(1);
    expect(viewModel.projects[0].id).toBe('project-1');
    expect(
      viewModel.projects[0].actions.find((action) => action.actionId === 'project.stop'),
    ).toMatchObject({ disabled: true, loading: true });
  });
});
