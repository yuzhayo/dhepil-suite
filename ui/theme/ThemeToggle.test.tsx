import { fireEvent, render, screen } from '@testing-library/react';

import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('announces and applies the next theme', () => {
    render(<ThemeToggle />);

    const toggle = screen.getByRole('switch', { name: 'Gunakan tema terang' });
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);

    expect(screen.getByRole('switch', { name: 'Gunakan tema gelap' })).not.toBeChecked();
    expect(localStorage.getItem('dhepil-theme')).toBe('light');
  });
});
