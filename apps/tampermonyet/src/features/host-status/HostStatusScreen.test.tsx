import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HostStatusScreen } from './HostStatusScreen';
import { createHostStatus } from './hostStatus';

describe('Tampermonyet host status', () => {
  it('builds local host URLs from the current origin', () => {
    const status = createHostStatus({ origin: 'http://127.0.0.1:2003', port: '2003' });

    expect(status.healthUrl).toBe('http://127.0.0.1:2003/health.json');
    expect(status.requireRootUrl).toBe('http://127.0.0.1:2003/require/');
    expect(status.moduleCount).toBe(0);
  });

  it('shows that the clean host is ready without claiming copied modules', () => {
    render(<HostStatusScreen />);

    expect(screen.getByRole('heading', { name: 'Tampermonyet' })).toBeTruthy();
    expect(screen.getByText('0 modules')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open health endpoint' }).getAttribute('href')).toBe(
      `${window.location.origin}/health.json`,
    );
  });
});
