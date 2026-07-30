import { fireEvent, render, screen } from '@testing-library/react';

import { Header } from './Header';
import type { HeaderProps } from '../contracts';

const sampleHeaderProps: HeaderProps = {
  viewModel: {
    title: 'Test Header',
    subtitle: 'Header Subtitle',
    actions: [{ actionId: 'test.action', disabled: false, loading: false }],
    actionDefinitions: [
      {
        id: 'test-action',
        label: 'Refresh',
        accessibleName: 'Refresh items',
        actionId: 'test.action',
        kind: 'default',
        order: 10,
      },
    ],
  },
  availableActionIds: ['test.action'],
};

describe('Header', () => {
  it('renders title, subtitle, and action buttons', () => {
    render(<Header {...sampleHeaderProps} onAction={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Test Header' })).toBeInTheDocument();
    expect(screen.getByText('Header Subtitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh items' })).toBeInTheDocument();
  });

  it('forwards action ID when button is clicked', () => {
    const onAction = vi.fn();
    render(<Header {...sampleHeaderProps} onAction={onAction} />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh items' }));

    expect(onAction).toHaveBeenCalledWith('test.action');
  });

  it('disables action when handler is unavailable', () => {
    render(<Header {...sampleHeaderProps} availableActionIds={[]} onAction={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Refresh items' })).toBeDisabled();
  });
});
