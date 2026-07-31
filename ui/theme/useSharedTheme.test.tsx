import { act, renderHook } from '@testing-library/react';

import { useSharedTheme } from './useSharedTheme';

describe('useSharedTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to dark and persists an explicit theme selection', () => {
    const { result } = renderHook(() => useSharedTheme());

    expect(result.current.mode).toBe('dark');

    act(() => result.current.setTheme('light'));

    expect(result.current.mode).toBe('light');
    expect(localStorage.getItem('dhepil-theme')).toBe('light');
  });

  it('synchronizes hook instances in the same window', () => {
    const first = renderHook(() => useSharedTheme());
    const second = renderHook(() => useSharedTheme());

    act(() => first.result.current.setTheme('light'));

    expect(first.result.current.mode).toBe('light');
    expect(second.result.current.mode).toBe('light');
  });

  it('returns to the dark default when another context removes the setting', () => {
    localStorage.setItem('dhepil-theme', 'light');
    const { result } = renderHook(() => useSharedTheme());

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'dhepil-theme',
          newValue: null,
        }),
      );
    });

    expect(result.current.mode).toBe('dark');
  });
});
