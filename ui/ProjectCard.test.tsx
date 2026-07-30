import { fireEvent, render, screen } from '@testing-library/react';

import type { ProjectCardViewModel } from '../src/features/control-center/application/view-models';
import { cardDefinition, type CardActionDefinition } from './cardDefinition';
import { ProjectCard } from './ProjectCard';

const viewModel: ProjectCardViewModel = {
  id: 'manga-reader',
  name: 'Manga Reader',
  status: { key: 'running', tone: 'success' },
  alerts: [{ key: 'process-error', tone: 'danger', value: 'stderr detail' }],
  tags: [
    { key: 'managed' },
    { key: 'port', value: '2000' },
    { key: 'path', value: 'apps/manga-reader' },
  ],
  actions: [
    { actionId: 'project.start-open', disabled: false, loading: false },
    { actionId: 'project.stop', disabled: false, loading: false },
    { actionId: 'project.quick-kill', disabled: false, loading: false },
  ],
  terminal: {
    lines: ['ready on port 2000'],
    truncated: false,
    maxLines: 80,
  },
  url: 'http://127.0.0.1:2000',
};

const availableActionIds = ['project.start-open', 'project.stop', 'project.quick-kill'];

describe('ProjectCard', () => {
  it('renders semantic view-model data through the card definition', () => {
    render(
      <ProjectCard
        viewModel={viewModel}
        availableActionIds={availableActionIds}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('article', { name: 'Project Manga Reader' })).toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getByText('Port 2000')).toBeInTheDocument();
    expect(screen.getByText('Path apps/manga-reader')).toBeInTheDocument();
    expect(screen.getByText('Process gagal')).toBeInTheDocument();
    expect(screen.getByText('stderr detail')).toBeInTheDocument();
    expect(screen.getByLabelText('Output process')).toHaveTextContent('ready on port 2000');
  });

  it('renders actions in definition order and forwards action ID plus project ID', () => {
    const onAction = vi.fn();
    render(
      <ProjectCard
        viewModel={viewModel}
        availableActionIds={availableActionIds}
        onAction={onAction}
      />,
    );

    const renderedNames = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));
    const expectedNames = [...cardDefinition.actions]
      .sort((left, right) => left.order - right.order)
      .map(
        (action: CardActionDefinition) =>
          action.labelByStatus?.[viewModel.status.key] ?? action.defaultLabel,
      );

    expect(renderedNames).toEqual(expectedNames);

    fireEvent.click(screen.getByRole('button', { name: 'Buka project' }));

    expect(onAction).toHaveBeenCalledWith('project.start-open', 'manga-reader');
  });

  it('respects domain-disabled state from the view model', () => {
    render(
      <ProjectCard
        viewModel={{
          ...viewModel,
          actions: viewModel.actions.map((action) =>
            action.actionId === 'project.stop' ? { ...action, disabled: true } : action,
          ),
        }}
        availableActionIds={availableActionIds}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Stop server' })).toBeDisabled();
  });

  it('keeps an action visible and disabled when its handler is unavailable', () => {
    render(
      <ProjectCard
        viewModel={viewModel}
        availableActionIds={availableActionIds.filter(
          (actionId) => actionId !== 'project.quick-kill',
        )}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Kill process' })).toBeDisabled();
  });

  it('keeps a definition action disabled when its semantic state is absent', () => {
    render(
      <ProjectCard
        viewModel={{
          ...viewModel,
          actions: viewModel.actions.filter((action) => action.actionId !== 'project.quick-kill'),
        }}
        availableActionIds={availableActionIds}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Kill process' })).toBeDisabled();
  });
});
