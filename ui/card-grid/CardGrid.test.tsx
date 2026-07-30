import { fireEvent, render, screen } from '@testing-library/react';

import type { ProjectCardViewModel, ProjectGridViewModel } from '../../src/engine/contracts';
import { gridDefinition } from './gridDefinition';
import { ProjectGrid } from './CardGrid';

const card: ProjectCardViewModel = {
  id: 'manga-reader',
  name: 'Manga Reader',
  status: { key: 'running', tone: 'success' },
  alerts: [],
  tags: [{ key: 'port', value: '2000' }],
  actions: [
    { actionId: 'project.start-open', disabled: false, loading: false },
    { actionId: 'project.stop', disabled: false, loading: false },
    { actionId: 'project.quick-kill', disabled: false, loading: false },
  ],
  terminal: {
    status: 'running',
    lines: ['log-1'],
    truncated: false,
    maxLines: 80,
  },
};

const availableActionIds = ['project.start-open', 'project.stop', 'project.quick-kill'];

function renderGrid(viewModel: ProjectGridViewModel, onAction = vi.fn()) {
  return {
    onAction,
    ...render(
      <ProjectGrid
        viewModel={viewModel}
        availableActionIds={availableActionIds}
        onAction={onAction}
      />,
    ),
  };
}

describe('ProjectGrid', () => {
  it('renders the definition-owned number of loading skeletons', () => {
    const { container } = renderGrid({ state: 'loading' });

    expect(
      screen.getByRole('region', { name: gridDefinition.loadingAccessibleLabel }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('[data-grid-skeleton]')).toHaveLength(
      gridDefinition.skeletonCount,
    );
  });

  it('renders the definition-owned empty state', () => {
    renderGrid({ state: 'empty' });

    expect(
      screen.getByRole('region', { name: gridDefinition.emptyAccessibleLabel }),
    ).toBeInTheDocument();
    expect(screen.getByText(gridDefinition.emptyCopy)).toBeInTheDocument();
  });

  it.each(['grid', 'list'] as const)('renders ready projects in %s mode', (viewMode) => {
    renderGrid({ state: 'ready', viewMode, projects: [card] });

    const layout = gridDefinition.layoutModes.find((candidate) => candidate.id === viewMode);
    const region = screen.getByRole('region', { name: layout?.accessibleLabel });

    expect(region).toHaveAttribute(
      'data-card-ordering-policy',
      gridDefinition.cardOrderingPolicyName,
    );
    expect(region).toHaveClass(`project-grid-ui__collection--${viewMode}`);
    expect(screen.getByRole('article', { name: 'Project Manga Reader' })).toBeInTheDocument();
  });

  it('forwards card actions without translating the payload', () => {
    const { onAction } = renderGrid({
      state: 'ready',
      viewMode: 'grid',
      projects: [card],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Stop server' }));

    expect(onAction).toHaveBeenCalledWith('project.stop', 'manga-reader');
  });
});
