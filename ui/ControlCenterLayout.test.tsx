import { fireEvent, render, screen } from '@testing-library/react';

import type { ControlCenterViewModel } from '../src/features/control-center/application/view-models';
import { ControlCenterLayout } from './ControlCenterLayout';

const availableActionIds = [
  'project.refresh',
  'project.search.change',
  'project.sort.change',
  'project.view.change',
  'project.start-open',
  'project.stop',
  'project.quick-kill',
];

const viewModel: ControlCenterViewModel = {
  header: {
    actions: [{ actionId: 'project.refresh', disabled: false, loading: false }],
  },
  toolbar: {
    searchQuery: '',
    sortMode: 'name-asc',
    viewMode: 'grid',
    summary: { visibleCount: 1, totalCount: 1, activeCount: 1 },
    activeServers: [],
    actions: [
      { actionId: 'project.search.change', disabled: false, loading: false },
      { actionId: 'project.sort.change', disabled: false, loading: false },
      { actionId: 'project.view.change', disabled: false, loading: false },
      { actionId: 'project.refresh', disabled: false, loading: false },
    ],
  },
  grid: {
    state: 'ready',
    viewMode: 'grid',
    projects: [
      {
        id: 'project-one',
        name: 'Project One',
        status: { key: 'running', tone: 'success' },
        alerts: [],
        tags: [{ key: 'port', value: '2000' }],
        actions: [
          { actionId: 'project.start-open', disabled: false, loading: false },
          { actionId: 'project.stop', disabled: false, loading: false },
          { actionId: 'project.quick-kill', disabled: false, loading: false },
        ],
        terminal: { lines: ['ready'], truncated: false, maxLines: 80 },
      },
    ],
  },
  availableActionIds,
  pageAlert: {
    key: 'page-error',
    tone: 'danger',
    value: 'API offline.',
  },
};

describe('ControlCenterLayout', () => {
  it('composes header, toolbar, page alert, and grid from one view model', () => {
    render(<ControlCenterLayout viewModel={viewModel} onAction={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Dhepil Suite' })).toBeInTheDocument();
    expect(screen.getByRole('search', { name: 'Cari dan atur project' })).toBeInTheDocument();
    expect(screen.getByText('Control center mengalami masalah')).toBeInTheDocument();
    expect(screen.getByText('API offline.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Daftar project mode grid' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Project Project One' })).toBeInTheDocument();
  });

  it('forwards the definition-owned refresh action from page error recovery', () => {
    const onAction = vi.fn();
    render(<ControlCenterLayout viewModel={viewModel} onAction={onAction} />);

    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(onAction).toHaveBeenCalledWith('project.refresh');
  });

  it('keeps page recovery visible and disabled without a registered handler', () => {
    render(
      <ControlCenterLayout
        viewModel={{ ...viewModel, availableActionIds: [] }}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeDisabled();
  });

  it('declares layout, workspace, grid, and terminal scroll ownership', () => {
    render(<ControlCenterLayout viewModel={viewModel} onAction={vi.fn()} />);

    const layout = screen.getByRole('main');
    const workspace = screen.getByRole('region', { name: 'Daftar project' });
    const grid = screen.getByRole('region', { name: 'Daftar project mode grid' });
    const terminal = screen.getByLabelText('Output process');

    expect(layout).toHaveAttribute('data-scroll-owner', 'none');
    expect(workspace).toHaveAttribute('data-scroll-owner', 'none');
    expect(grid).toHaveClass('project-grid-ui');
    expect(terminal).toHaveClass('project-terminal__content');
  });
});
