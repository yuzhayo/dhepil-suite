import { fireEvent, render, screen } from '@testing-library/react';

import { Grid } from './CardGrid';
import type { CardViewModel, GridState } from '../contracts';

const sampleCard: CardViewModel = {
  id: 'manga-reader',
  name: 'Manga Reader',
  status: { key: 'running', tone: 'success', label: 'Aktif' },
  alerts: [],
  tags: [{ key: 'port', label: 'Port', value: '2000' }],
  actions: [
    { actionId: 'project.start-open', label: 'Buka project', disabled: false, loading: false },
    { actionId: 'project.stop', label: 'Stop server', disabled: false, loading: false },
    { actionId: 'project.quick-kill', label: 'Kill process', disabled: false, loading: false },
  ],
  terminal: {
    status: 'running',
    lines: ['log-1'],
    truncated: false,
    maxLines: 80,
  },
};

const availableActionIds = ['project.start-open', 'project.stop', 'project.quick-kill'];

function renderGrid(viewModel: GridState, onAction = vi.fn()) {
  return {
    onAction,
    ...render(
      <Grid viewModel={viewModel} availableActionIds={availableActionIds} onAction={onAction} />,
    ),
  };
}

describe('Grid', () => {
  it('renders loading skeletons when state is loading', () => {
    const { container } = renderGrid({ state: 'loading' });

    expect(screen.getByRole('region', { name: 'Memuat data' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-grid-skeleton]')).toHaveLength(2);
  });

  it('renders empty state when state is empty', () => {
    renderGrid({ state: 'empty' });

    expect(screen.getByRole('region', { name: 'Daftar kosong' })).toBeInTheDocument();
    expect(screen.getByText('Tidak ada item ditemukan')).toBeInTheDocument();
  });

  it.each(['grid', 'list'] as const)('renders items in %s mode', (viewMode) => {
    renderGrid({ state: 'ready', viewMode, items: [sampleCard] });

    const region = screen.getByRole('region', { name: `Daftar project mode ${viewMode}` });

    expect(region).toHaveClass(`core-ui-grid__collection--${viewMode}`);
    expect(screen.getByRole('article', { name: 'Project Manga Reader' })).toBeInTheDocument();
  });

  it('forwards card actions without translating the payload', () => {
    const { onAction } = renderGrid({
      state: 'ready',
      viewMode: 'grid',
      items: [sampleCard],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Stop server' }));

    expect(onAction).toHaveBeenCalledWith('project.stop', 'manga-reader');
  });
});
