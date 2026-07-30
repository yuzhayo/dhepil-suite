import { render, screen } from '@testing-library/react';

import { CoreLayout } from './CoreLayout';

describe('CoreLayout', () => {
  it('composes header, toolbar, page alert, and content slots', () => {
    render(
      <CoreLayout
        header={<div data-testid="header-slot">Header</div>}
        toolbar={<div data-testid="toolbar-slot">Toolbar</div>}
        pageAlert={<div data-testid="alert-slot">Alert</div>}
        content={<div data-testid="content-slot">Content</div>}
      />,
    );

    expect(screen.getByTestId('header-slot')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-slot')).toBeInTheDocument();
    expect(screen.getByTestId('alert-slot')).toBeInTheDocument();
    expect(screen.getByTestId('content-slot')).toBeInTheDocument();
  });

  it('declares layout and workspace scroll ownership attributes', () => {
    render(<CoreLayout header={<div>Header</div>} content={<div>Content</div>} />);

    const layout = screen.getByRole('main');
    const workspace = screen.getByRole('region', { name: 'Workspace' });

    expect(layout).toHaveClass('core-ui-layout');
    expect(layout).toHaveAttribute('data-scroll-owner', 'none');
    expect(workspace).toHaveClass('core-ui-layout__workspace');
    expect(workspace).toHaveAttribute('data-scroll-owner', 'none');
  });
});
