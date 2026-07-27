import { afterEach, describe, expect, it, vi } from 'vitest';

import { browserProjectWindow } from './browserProjectWindow';

const project = {
  id: 'project-1',
  name: 'Project One',
  description: '',
  relativePath: 'apps/project-one',
  status: 'stopped' as const,
  managed: false,
  logs: [],
  desktop: { enabled: false, script: '' },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('browserProjectWindow', () => {
  it('opens a ready project in a new protected tab', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    browserProjectWindow().open('http://127.0.0.1:3000');

    expect(open).toHaveBeenCalledWith('http://127.0.0.1:3000', '_blank', 'noopener,noreferrer');
  });

  it('prepares the named waiting tab', () => {
    const tab = {
      document: {
        title: '',
        body: { style: { cssText: '' }, textContent: '' },
      },
      close: vi.fn(),
      location: { replace: vi.fn() },
    };
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);

    const result = browserProjectWindow().prepare(project);

    expect(open).toHaveBeenCalledWith('about:blank', 'dhepil-suite-project-1');
    expect(result).toBe(tab);
    expect(tab.document.title).toBe('Menyalakan Project One');
    expect(tab.document.body.textContent).toBe('Menyalakan Project One…');
  });

  it('returns undefined when a popup is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    expect(browserProjectWindow().prepare(project)).toBeUndefined();
  });

  it('exposes close and redirect on the prepared tab', () => {
    const close = vi.fn();
    const replace = vi.fn();
    const tab = {
      document: {
        title: '',
        body: { style: { cssText: '' }, textContent: '' },
      },
      close,
      location: { replace },
    };
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);

    const result = browserProjectWindow().prepare(project);
    result?.location.replace('http://127.0.0.1:3000');
    result?.close();

    expect(replace).toHaveBeenCalledWith('http://127.0.0.1:3000');
    expect(close).toHaveBeenCalledOnce();
  });
});
