import { render, screen } from '@testing-library/react';

import { ProjectTerminal } from './Terminal';

describe('ProjectTerminal', () => {
  it('renders log content in an accessible keyboard-scrollable pre', () => {
    render(
      <ProjectTerminal
        viewModel={{
          lines: ['server starting', 'server ready'],
          truncated: false,
          maxLines: 80,
        }}
      />,
    );

    const terminal = screen.getByLabelText('Output process');

    expect(terminal.tagName).toBe('PRE');
    expect(terminal).toHaveClass('project-terminal__content');
    expect(terminal).toHaveAttribute('aria-live', 'polite');
    expect(terminal).toHaveAttribute('tabindex', '0');
    expect(terminal).toHaveTextContent('server starting');
    expect(terminal).toHaveTextContent('server ready');
  });

  it('renders the empty copy without inventing log data', () => {
    render(<ProjectTerminal viewModel={{ lines: [], truncated: false, maxLines: 80 }} />);

    expect(screen.getByLabelText('Output process')).toHaveTextContent('Belum ada output process.');
  });

  it('announces presenter-owned truncation metadata', () => {
    render(<ProjectTerminal viewModel={{ lines: ['latest'], truncated: true, maxLines: 80 }} />);

    expect(
      screen.getByText('Hanya baris log terbaru yang ditampilkan. Maksimum 80 baris.'),
    ).toBeInTheDocument();
  });
});
