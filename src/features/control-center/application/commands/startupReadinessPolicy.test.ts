import type { ProjectSummary } from '../../types';
import {
  createStartupReadinessRunner,
  DEFAULT_STARTUP_READINESS_POLICY,
  StartupReadinessCancelledError,
  StartupReadinessTimeoutError,
  type StartupReadinessPolicy,
} from './startupReadinessPolicy';

function project(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: 'project-1',
    name: 'Project One',
    description: '',
    relativePath: 'apps/project-one',
    status: 'starting',
    managed: true,
    logs: [],
    desktop: { enabled: false, script: '' },
    ...overrides,
  };
}

function runner(policy: Partial<StartupReadinessPolicy> = {}) {
  return createStartupReadinessRunner({
    maximumAttempts: 3,
    delayMilliseconds: 1,
    sleep: vi.fn(async () => undefined),
    ...policy,
  });
}

describe('startup readiness policy', () => {
  it('keeps the legacy 40 attempts and 750 millisecond delay', () => {
    expect(DEFAULT_STARTUP_READINESS_POLICY).toMatchObject({
      maximumAttempts: 40,
      delayMilliseconds: 750,
    });
  });

  it('returns the project when status becomes ready', async () => {
    const readStatus = vi
      .fn<() => Promise<ProjectSummary | undefined>>()
      .mockResolvedValueOnce(project())
      .mockResolvedValueOnce(project({ status: 'running', url: 'http://127.0.0.1:3000' }));

    await expect(
      runner().waitUntilReady({
        readStatus,
        isReady: (candidate) => candidate?.status === 'running',
        isTerminalFailure: () => false,
      }),
    ).resolves.toMatchObject({ status: 'running' });
    expect(readStatus).toHaveBeenCalledTimes(2);
  });

  it('times out after the configured attempts', async () => {
    const sleep = vi.fn(async () => undefined);
    const readStatus = vi.fn(async () => project());

    await expect(
      runner({ maximumAttempts: 3, sleep }).waitUntilReady({
        readStatus,
        isReady: () => false,
        isTerminalFailure: () => false,
      }),
    ).rejects.toMatchObject({
      name: 'StartupReadinessTimeoutError',
      maximumAttempts: 3,
      delayMilliseconds: 1,
      message: 'Project One belum siap setelah 3 milidetik.',
    } satisfies Partial<StartupReadinessTimeoutError>);
    expect(readStatus).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(3);
  });

  it('keeps the legacy 30-second timeout message for the default policy', async () => {
    const readStatus = vi.fn(async () => project());

    await expect(
      createStartupReadinessRunner({
        ...DEFAULT_STARTUP_READINESS_POLICY,
        sleep: vi.fn(async () => undefined),
      }).waitUntilReady({
        readStatus,
        isReady: () => false,
        isTerminalFailure: () => false,
      }),
    ).rejects.toThrow('Project One belum siap setelah 30 detik.');
    expect(readStatus).toHaveBeenCalledTimes(40);
  });

  it('stops at a terminal failure', async () => {
    const sleep = vi.fn(async () => undefined);
    await expect(
      runner({ sleep }).waitUntilReady({
        readStatus: async () => project({ status: 'error', error: 'Port sedang dipakai.' }),
        isReady: () => false,
        isTerminalFailure: (candidate) => candidate?.status === 'error',
      }),
    ).rejects.toThrow('Port sedang dipakai.');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('does not read when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const readStatus = vi.fn(async () => project());

    await expect(
      runner().waitUntilReady({
        readStatus,
        isReady: () => false,
        isTerminalFailure: () => false,
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(StartupReadinessCancelledError);
    expect(readStatus).not.toHaveBeenCalled();
  });

  it('stops reading after an abort during sleep', async () => {
    const controller = new AbortController();
    const sleep = vi.fn(async () => controller.abort());
    const readStatus = vi.fn(async () => project());

    await expect(
      runner({ sleep }).waitUntilReady({
        readStatus,
        isReady: () => false,
        isTerminalFailure: () => false,
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(StartupReadinessCancelledError);
    expect(readStatus).toHaveBeenCalledTimes(1);
  });

  it('cancels and clears the default headless sleep without requiring window', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', undefined);

    try {
      const controller = new AbortController();
      const readStatus = vi.fn(async () => project());
      const pending = createStartupReadinessRunner().waitUntilReady({
        readStatus,
        isReady: () => false,
        isTerminalFailure: () => false,
        signal: controller.signal,
      });
      const rejection = expect(pending).rejects.toBeInstanceOf(StartupReadinessCancelledError);

      for (let attempt = 0; attempt < 10 && vi.getTimerCount() === 0; attempt += 1) {
        await Promise.resolve();
      }
      expect(vi.getTimerCount()).toBe(1);

      controller.abort();

      await rejection;
      expect(readStatus).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});
