import { fireEvent, render, screen } from '@testing-library/react';

import { Card } from './Card';
import type { CardViewModel } from '../contracts';

const sampleCardViewModel: CardViewModel = {
  id: 'manga-reader',
  name: 'Manga Reader',
  status: { key: 'running', tone: 'success', label: 'Aktif', badge: 'success' },
  alerts: [
    { key: 'process-error', tone: 'danger', title: 'Process gagal', value: 'stderr detail' },
  ],
  tags: [
    { key: 'managed', label: 'Managed root' },
    { key: 'port', label: 'Port', value: '2000' },
    { key: 'path', label: 'Path', value: 'apps/manga-reader' },
  ],
  actions: [
    {
      actionId: 'project.start-open',
      label: 'Buka project',
      kind: 'primary',
      disabled: false,
      loading: false,
    },
    {
      actionId: 'project.stop',
      label: 'Stop server',
      kind: 'danger',
      disabled: false,
      loading: false,
    },
    {
      actionId: 'project.quick-kill',
      label: 'Kill process',
      kind: 'danger',
      disabled: false,
      loading: false,
    },
  ],
  terminal: {
    status: 'running',
    lines: ['ready on port 2000'],
    truncated: false,
    maxLines: 80,
  },
  url: 'http://127.0.0.1:2000',
};

const availableActionIds = ['project.start-open', 'project.stop', 'project.quick-kill'];

describe('Card', () => {
  it('keeps metadata in a click popover while status remains visible', async () => {
    render(
      <Card
        viewModel={sampleCardViewModel}
        availableActionIds={availableActionIds}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('article', { name: 'Project Manga Reader' })).toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.queryByText('Port 2000')).not.toBeInTheDocument();
    expect(screen.getByText('Process gagal')).toBeInTheDocument();
    expect(screen.getByText('stderr detail')).toBeInTheDocument();
    expect(screen.getByLabelText('Output process')).toHaveTextContent('ready on port 2000');

    fireEvent.click(screen.getByRole('button', { name: 'Informasi Manga Reader' }));

    expect(await screen.findByText('Port 2000')).toBeInTheDocument();
    expect(screen.getByText('Path apps/manga-reader')).toBeInTheDocument();
  });

  it('omits the information button when the card has no metadata', () => {
    render(
      <Card
        viewModel={{ ...sampleCardViewModel, tags: [] }}
        availableActionIds={availableActionIds}
        onAction={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Informasi Manga Reader' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });

  it('renders actions and forwards action ID plus item ID on click', () => {
    const onAction = vi.fn();
    render(
      <Card
        viewModel={sampleCardViewModel}
        availableActionIds={availableActionIds}
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Buka project' }));

    expect(onAction).toHaveBeenCalledWith('project.start-open', 'manga-reader');
  });

  it('respects disabled state from action view model', () => {
    render(
      <Card
        viewModel={{
          ...sampleCardViewModel,
          actions: sampleCardViewModel.actions.map((action) =>
            action.actionId === 'project.stop' ? { ...action, disabled: true } : action,
          ),
        }}
        availableActionIds={availableActionIds}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Stop server' })).toBeDisabled();
  });
});
