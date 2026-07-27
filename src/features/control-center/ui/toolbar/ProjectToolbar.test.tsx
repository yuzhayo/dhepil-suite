import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { ToolbarViewModel } from '../../application/view-models';
import { ProjectToolbar } from './ProjectToolbar';
import { toolbarDefinition } from './toolbarDefinition';

const viewModel: ToolbarViewModel = {
  searchQuery: 'manga',
  sortMode: 'name-asc',
  viewMode: 'grid',
  summary: {
    visibleCount: 1,
    totalCount: 2,
    activeCount: 1,
  },
  activeServers: [
    {
      id: 'manga-reader',
      name: 'Manga Reader',
      port: 2000,
      pid: 1234,
      status: { key: 'running', tone: 'success' },
      managed: true,
      action: {
        actionId: 'project.quick-kill',
        disabled: false,
        loading: false,
      },
    },
  ],
  actions: [
    { actionId: 'project.search.change', disabled: false, loading: false },
    { actionId: 'project.sort.change', disabled: false, loading: false },
    { actionId: 'project.view.change', disabled: false, loading: false },
    { actionId: 'project.refresh', disabled: false, loading: false },
  ],
};

const availableActionIds = [
  'project.search.change',
  'project.sort.change',
  'project.view.change',
  'project.refresh',
  'project.quick-kill',
];

describe('ProjectToolbar', () => {
  it('renders controls in definition order', () => {
    const { container } = render(
      <ProjectToolbar
        viewModel={viewModel}
        availableActionIds={availableActionIds}
        onAction={vi.fn()}
      />,
    );
    const renderedIds = [...container.querySelectorAll('[data-toolbar-control-id]')].map(
      (control) => control.getAttribute('data-toolbar-control-id'),
    );
    const expectedIds = [...toolbarDefinition]
      .sort((left, right) => left.order - right.order)
      .map((control) => control.id);

    expect(renderedIds).toEqual(expectedIds);
    expect(screen.getByText('1 ditampilkan · 2 total')).toBeInTheDocument();
  });

  it('forwards action IDs and payloads without local state', () => {
    const onAction = vi.fn();
    render(
      <ProjectToolbar
        viewModel={viewModel}
        availableActionIds={availableActionIds}
        onAction={onAction}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Cari project' }), {
      target: { value: 'reader' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh daftar project' }));

    expect(onAction).toHaveBeenNthCalledWith(1, 'project.search.change', 'reader');
    expect(onAction).toHaveBeenNthCalledWith(2, 'project.refresh');
  });

  it('keeps a control visible and disabled when its handler is unavailable', () => {
    render(
      <ProjectToolbar
        viewModel={viewModel}
        availableActionIds={availableActionIds.filter((actionId) => actionId !== 'project.refresh')}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Refresh daftar project' })).toBeDisabled();
  });

  it('dispatches quick kill with the selected project ID', async () => {
    const onAction = vi.fn();
    render(
      <ProjectToolbar
        viewModel={viewModel}
        availableActionIds={availableActionIds}
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Daftar server aktif' }));
    const menuItem = await screen.findByRole('menuitem', { name: /Manga Reader/ });
    fireEvent.click(menuItem);

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith('project.quick-kill', 'manga-reader');
    });
  });

  it('disables the active-server control when quick-kill has no handler', () => {
    render(
      <ProjectToolbar
        viewModel={viewModel}
        availableActionIds={availableActionIds.filter(
          (actionId) => actionId !== 'project.quick-kill',
        )}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Daftar server aktif' })).toBeDisabled();
  });
});
