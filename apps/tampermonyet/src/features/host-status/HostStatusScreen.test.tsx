import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HostStatusScreen } from './HostStatusScreen';
import { createHostStatus } from './hostStatus';

describe('Tampermonyet host status', () => {
  it('builds local host URLs from the current origin', () => {
    const status = createHostStatus({ origin: 'http://127.0.0.1:2003', port: '2003' });

    expect(status.healthUrl).toBe('http://127.0.0.1:2003/health.json');
    expect(status.requireRootUrl).toBe('http://127.0.0.1:2003/require/');
    expect(status.agentRouterUserscriptUrl).toBe(
      'http://127.0.0.1:2003/require/agentrouter/agent.router.user.js',
    );
    expect(status.moduleCount).toBe(3);
  });

  it('shows one AgentRouter loader for Dashboard, Token, and Usage Log', () => {
    render(<HostStatusScreen />);

    expect(screen.getByRole('heading', { name: 'Tampermonyet' })).toBeTruthy();
    expect(screen.getByText('3 scanner')).toBeTruthy();
    expect(screen.getByText(/real API key/)).toBeTruthy();
    expect(screen.getByText(/Details asli tanpa terjemahan/)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Open AgentRouter userscript' }).getAttribute('href'),
    ).toBe(`${window.location.origin}/require/agentrouter/agent.router.user.js`);
    expect(screen.getByRole('link', { name: 'Open health endpoint' }).getAttribute('href')).toBe(
      `${window.location.origin}/health.json`,
    );
  });
});
