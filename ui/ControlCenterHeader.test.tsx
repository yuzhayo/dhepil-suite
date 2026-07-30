import { fireEvent, render, screen } from '@testing-library/react';

import type { HeaderViewModel } from '../src/features/control-center/application/view-models';
import { ControlCenterHeader } from './ControlCenterHeader';
import { headerDefinition } from './headerDefinition';

const enabledViewModel: HeaderViewModel = {
  actions: [
    {
      actionId: 'project.refresh',
      disabled: false,
      loading: false,
    },
  ],
};

describe('ControlCenterHeader', () => {
  it('renders static copy and actions in definition order', () => {
    render(
      <ControlCenterHeader
        viewModel={enabledViewModel}
        availableActionIds={['project.refresh']}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: headerDefinition.title })).toBeInTheDocument();
    expect(screen.getByText(headerDefinition.subtitle)).toBeInTheDocument();

    const expectedLabels = [...headerDefinition.actions]
      .sort((left, right) => left.order - right.order)
      .map((action) => action.accessibleName);
    const renderedLabels = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));

    expect(renderedLabels).toEqual(expectedLabels);
  });

  it('forwards the declared action ID', () => {
    const onAction = vi.fn();
    render(
      <ControlCenterHeader
        viewModel={enabledViewModel}
        availableActionIds={['project.refresh']}
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh status project' }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('project.refresh');
  });

  it('keeps an action visible and disabled when its handler is unavailable', () => {
    render(
      <ControlCenterHeader
        viewModel={enabledViewModel}
        availableActionIds={[]}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Refresh status project' })).toBeDisabled();
  });

  it('respects the disabled state supplied by the view model', () => {
    render(
      <ControlCenterHeader
        viewModel={{
          actions: [{ actionId: 'project.refresh', disabled: true, loading: false }],
        }}
        availableActionIds={['project.refresh']}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Refresh status project' })).toBeDisabled();
  });
});
