import type { ProjectSummary } from '../../contracts';

export interface StartupReadinessPolicy {
  maximumAttempts: number;
  delayMilliseconds: number;
  sleep(milliseconds: number, signal?: AbortSignal): Promise<void>;
}

export interface StartupReadinessRunner {
  waitUntilReady(input: {
    readStatus(): Promise<ProjectSummary | undefined>;
    isReady(project: ProjectSummary | undefined): boolean;
    isTerminalFailure(project: ProjectSummary | undefined): boolean;
    signal?: AbortSignal;
  }): Promise<ProjectSummary>;
}

export class StartupReadinessCancelledError extends Error {
  constructor() {
    super('Menunggu kesiapan project dibatalkan.');
    this.name = 'StartupReadinessCancelledError';
  }
}

export class StartupReadinessTimeoutError extends Error {
  constructor(
    public readonly maximumAttempts: number,
    public readonly delayMilliseconds: number,
    projectName = 'Project',
  ) {
    const durationMilliseconds = maximumAttempts * delayMilliseconds;
    super(`${projectName} belum siap setelah ${formatDuration(durationMilliseconds)}.`);
    this.name = 'StartupReadinessTimeoutError';
  }
}

export const DEFAULT_STARTUP_READINESS_POLICY: StartupReadinessPolicy = {
  maximumAttempts: 40,
  delayMilliseconds: 750,
  sleep: sleep,
};

export function createStartupReadinessRunner(
  policy: StartupReadinessPolicy = DEFAULT_STARTUP_READINESS_POLICY,
): StartupReadinessRunner {
  return {
    async waitUntilReady(input) {
      let lastProject: ProjectSummary | undefined;

      for (let attempt = 0; attempt < policy.maximumAttempts; attempt += 1) {
        throwIfAborted(input.signal);

        const project = await input.readStatus();
        lastProject = project;
        throwIfAborted(input.signal);

        if (input.isReady(project) && project) {
          return project;
        }
        if (input.isTerminalFailure(project)) {
          throw new Error(
            project?.error ?? `${project?.name ?? 'Project'} tidak dapat dinyalakan.`,
          );
        }

        await policy.sleep(policy.delayMilliseconds, input.signal);
        throwIfAborted(input.signal);
      }

      throw new StartupReadinessTimeoutError(
        policy.maximumAttempts,
        policy.delayMilliseconds,
        lastProject?.name,
      );
    },
  };
}

function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new StartupReadinessCancelledError());
      return;
    }

    const timeout = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    const abort = () => {
      globalThis.clearTimeout(timeout);
      reject(new StartupReadinessCancelledError());
    };

    signal?.addEventListener('abort', abort, { once: true });
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new StartupReadinessCancelledError();
  }
}

function formatDuration(milliseconds: number): string {
  if (milliseconds % 1000 === 0) {
    return `${milliseconds / 1000} detik`;
  }
  return `${milliseconds} milidetik`;
}
