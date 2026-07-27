import { act, renderHook, waitFor } from '@testing-library/react';

import type { ProjectSummary } from '../../types';
import { StartupReadinessTimeoutError } from '../commands/startupReadinessPolicy';
import type { ControlCenterRuntime } from '../composition/createControlCenterRuntime';
import type { ControlCenterActionContext } from '../extensions/contracts';
import { createExtensionHost } from '../extensions/createExtensionHost';
import projectLifecycleExtension from '../extensions/modules/project-lifecycle';
import projectRefreshExtension from '../extensions/modules/project-refresh';
import quickKillExtension from '../extensions/modules/quick-kill';
import {
  CONTROL_CENTER_POLL_INTERVAL_MILLISECONDS,
  useControlCenterController,
} from './useControlCenterController';

const coreExtensions = [projectLifecycleExtension, projectRefreshExtension, quickKillExtension];

function project(id: string, overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id,
    name: id,
    description: `${id} description`,
    relativePath: `apps/${id}`,
    status: 'stopped',
    managed: false,
    logs: [],
    desktop: { enabled: false, script: '' },
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function fakeRuntime(overrides: Partial<ControlCenterRuntime> = {}): ControlCenterRuntime {
  return {
    refresh: vi.fn(async () => []),
    startAndOpen: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    quickKill: vi.fn(async () => undefined),
    createHost: (context: ControlCenterActionContext) =>
      createExtensionHost(coreExtensions, context),
    ...overrides,
  };
}

function readyCards(controller: ReturnType<typeof useControlCenterController>) {
  if (controller.viewModel.grid.state !== 'ready') {
    throw new Error(`Expected ready grid, received ${controller.viewModel.grid.state}.`);
  }
  return controller.viewModel.grid.projects;
}

afterEach(() => {
  vi.useRealTimers();
});

it('owns initial loading and produces one composed view model', async () => {
  const initial = deferred<ProjectSummary[]>();
  const runtime = fakeRuntime({ refresh: vi.fn(() => initial.promise) });
  const { result } = renderHook(() => useControlCenterController(runtime));

  expect(result.current.viewModel.grid).toEqual({ state: 'loading' });

  initial.resolve([project('alpha')]);

  await waitFor(() => expect(result.current.viewModel.grid.state).toBe('ready'));
  expect(readyCards(result.current).map((card) => card.id)).toEqual(['alpha']);
  expect(result.current.viewModel.availableActionIds).toEqual([
    'project.quick-kill',
    'project.refresh',
    'project.search.change',
    'project.sort.change',
    'project.start-open',
    'project.stop',
    'project.view.change',
  ]);
  expect(Object.keys(result.current)).toEqual(['viewModel', 'dispatch']);
});

it('prevents overlapping polls and clears the polling interval on unmount', async () => {
  vi.useFakeTimers();
  const initial = deferred<ProjectSummary[]>();
  const refresh = vi.fn().mockReturnValueOnce(initial.promise).mockResolvedValue([]);
  const runtime = fakeRuntime({ refresh });
  const { unmount } = renderHook(() => useControlCenterController(runtime));

  await act(async () => {
    await vi.advanceTimersByTimeAsync(CONTROL_CENTER_POLL_INTERVAL_MILLISECONDS * 3);
  });
  expect(refresh).toHaveBeenCalledTimes(1);

  initial.resolve([]);
  await act(async () => {
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(CONTROL_CENTER_POLL_INTERVAL_MILLISECONDS);
  });
  expect(refresh).toHaveBeenCalledTimes(2);

  unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(CONTROL_CENTER_POLL_INTERVAL_MILLISECONDS * 2);
  });
  expect(refresh).toHaveBeenCalledTimes(2);
});

it('discards a stale response when an explicit refresh supersedes it', async () => {
  const stale = deferred<ProjectSummary[]>();
  const fresh = deferred<ProjectSummary[]>();
  const refresh = vi.fn().mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
  const runtime = fakeRuntime({ refresh });
  const { result } = renderHook(() => useControlCenterController(runtime));

  act(() => result.current.dispatch('project.refresh'));
  expect(refresh).toHaveBeenCalledTimes(2);

  fresh.resolve([project('fresh-project')]);
  await waitFor(() =>
    expect(readyCards(result.current).map((card) => card.id)).toEqual(['fresh-project']),
  );

  stale.resolve([project('stale-project')]);
  await act(async () => {
    await Promise.resolve();
  });
  expect(readyCards(result.current).map((card) => card.id)).toEqual(['fresh-project']);
});

it('treats an aborted refresh as cancellation without creating a page alert', async () => {
  const refresh = vi
    .fn()
    .mockImplementationOnce(
      (signal?: AbortSignal) =>
        new Promise<ProjectSummary[]>((_resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () => reject({ kind: 'cancelled', message: 'cancelled' }),
            { once: true },
          );
        }),
    )
    .mockResolvedValueOnce([]);
  const runtime = fakeRuntime({ refresh });
  const { result } = renderHook(() => useControlCenterController(runtime));

  act(() => result.current.dispatch('project.refresh'));

  await waitFor(() => expect(result.current.viewModel.grid.state).toBe('empty'));
  expect(result.current.viewModel.pageAlert).toBeUndefined();
});

it.each([
  {
    actionId: 'project.start-open',
    source: project('stopped-project'),
    method: 'startAndOpen' as const,
  },
  {
    actionId: 'project.stop',
    source: project('running-project', { status: 'running', managed: true }),
    method: 'stop' as const,
  },
  {
    actionId: 'project.quick-kill',
    source: project('missing-project', { status: 'not-found', managed: true }),
    method: 'quickKill' as const,
  },
])(
  'tracks pending state for $actionId and refreshes after completion',
  async ({ actionId, source, method }) => {
    const operation = deferred<void>();
    const runtime = fakeRuntime({
      refresh: vi.fn(async () => [source]),
      [method]: vi.fn(() => operation.promise),
    });
    const { result } = renderHook(() => useControlCenterController(runtime));
    await waitFor(() => expect(result.current.viewModel.grid.state).toBe('ready'));

    act(() => result.current.dispatch(actionId, source.id));
    await waitFor(() => expect(runtime[method]).toHaveBeenCalledOnce());
    const pendingAction = readyCards(result.current)
      .find((card) => card.id === source.id)
      ?.actions.find((action) => action.actionId === actionId);
    expect(pendingAction).toMatchObject({ disabled: true, loading: true });

    operation.resolve();
    await waitFor(() => {
      const completedAction = readyCards(result.current)
        .find((card) => card.id === source.id)
        ?.actions.find((action) => action.actionId === actionId);
      expect(completedAction?.loading).toBe(false);
    });
    expect(runtime.refresh).toHaveBeenCalledTimes(2);
  },
);

it('aborts startup, stop, and quick-kill actions during unmount', async () => {
  const sources = [
    project('start-project'),
    project('stop-project', { status: 'running', managed: true }),
    project('kill-project', { status: 'not-found', managed: true }),
  ];
  const signals: AbortSignal[] = [];
  const waitForAbort = (input: { signal?: AbortSignal }) =>
    new Promise<void>((_resolve, reject) => {
      if (!input.signal) {
        reject(new Error('Missing action signal.'));
        return;
      }
      signals.push(input.signal);
      input.signal.addEventListener(
        'abort',
        () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        },
        { once: true },
      );
    });
  const runtime = fakeRuntime({
    refresh: vi.fn(async () => sources),
    startAndOpen: vi.fn(waitForAbort),
    stop: vi.fn(waitForAbort),
    quickKill: vi.fn(waitForAbort),
  });
  const { result, unmount } = renderHook(() => useControlCenterController(runtime));
  await waitFor(() => expect(result.current.viewModel.grid.state).toBe('ready'));

  act(() => {
    result.current.dispatch('project.start-open', 'start-project');
    result.current.dispatch('project.stop', 'stop-project');
    result.current.dispatch('project.quick-kill', 'kill-project');
  });
  await waitFor(() => expect(signals).toHaveLength(3));

  unmount();

  expect(signals.every((signal) => signal.aborted)).toBe(true);
});

it('aborts the active refresh and ignores its late result after unmount', async () => {
  const late = deferred<ProjectSummary[]>();
  let refreshSignal: AbortSignal | undefined;
  const runtime = fakeRuntime({
    refresh: vi.fn((signal?: AbortSignal) => {
      refreshSignal = signal;
      return late.promise;
    }),
  });
  const { result, unmount } = renderHook(() => useControlCenterController(runtime));

  expect(result.current.viewModel.grid.state).toBe('loading');
  unmount();
  expect(refreshSignal?.aborted).toBe(true);

  late.resolve([project('late-project')]);
  await act(async () => {
    await Promise.resolve();
  });
  expect(result.current.viewModel.grid.state).toBe('loading');
});

it('reports a refresh error and clears it after a successful retry', async () => {
  const refresh = vi
    .fn()
    .mockRejectedValueOnce(new Error('Manager offline'))
    .mockResolvedValueOnce([]);
  const runtime = fakeRuntime({ refresh });
  const { result } = renderHook(() => useControlCenterController(runtime));

  await waitFor(() => expect(result.current.viewModel.pageAlert?.value).toBe('Manager offline'));

  act(() => result.current.dispatch('project.refresh'));

  await waitFor(() => expect(result.current.viewModel.pageAlert).toBeUndefined());
  expect(result.current.viewModel.grid.state).toBe('empty');
});

it('reports startup timeout after cleanup and clears the project pending state', async () => {
  const source = project('slow-project');
  const timeout = new StartupReadinessTimeoutError(40, 750, source.name);
  const runtime = fakeRuntime({
    refresh: vi.fn(async () => [source]),
    startAndOpen: vi.fn(async () => Promise.reject(timeout)),
  });
  const { result } = renderHook(() => useControlCenterController(runtime));
  await waitFor(() => expect(result.current.viewModel.grid.state).toBe('ready'));

  act(() => result.current.dispatch('project.start-open', source.id));

  await waitFor(() =>
    expect(result.current.viewModel.pageAlert?.value).toBe(
      'slow-project belum siap setelah 30 detik.',
    ),
  );
  const action = readyCards(result.current)[0].actions.find(
    (candidate) => candidate.actionId === 'project.start-open',
  );
  expect(action).toMatchObject({ disabled: false, loading: false });
  expect(runtime.refresh).toHaveBeenCalledTimes(2);
});

it('opens a ready project without creating pending mutation state', async () => {
  const source = project('ready-project', {
    status: 'running',
    managed: true,
    url: 'http://127.0.0.1:2000',
  });
  const runtime = fakeRuntime({ refresh: vi.fn(async () => [source]) });
  const { result } = renderHook(() => useControlCenterController(runtime));
  await waitFor(() => expect(result.current.viewModel.grid.state).toBe('ready'));

  act(() => result.current.dispatch('project.start-open', source.id));

  await waitFor(() => expect(runtime.startAndOpen).toHaveBeenCalledOnce());
  expect(runtime.startAndOpen).toHaveBeenCalledWith(
    expect.objectContaining({
      project: source,
      pending: false,
    }),
  );
  const action = readyCards(result.current)[0].actions.find(
    (candidate) => candidate.actionId === 'project.start-open',
  );
  expect(action).toMatchObject({ disabled: false, loading: false });
  expect(runtime.refresh).toHaveBeenCalledOnce();
});

it('owns search, sort, and view state through local reducer actions', async () => {
  const runtime = fakeRuntime({
    refresh: vi.fn(async () => [
      project('alpha', { name: 'Alpha' }),
      project('beta', { name: 'Beta' }),
    ]),
  });
  const { result } = renderHook(() => useControlCenterController(runtime));
  await waitFor(() => expect(result.current.viewModel.grid.state).toBe('ready'));

  act(() => {
    result.current.dispatch('project.sort.change', 'name-desc');
    result.current.dispatch('project.view.change', 'list');
  });
  expect(result.current.viewModel.toolbar.sortMode).toBe('name-desc');
  expect(result.current.viewModel.toolbar.viewMode).toBe('list');
  expect(readyCards(result.current).map((card) => card.name)).toEqual(['Beta', 'Alpha']);

  act(() => result.current.dispatch('project.search.change', 'alpha'));
  expect(result.current.viewModel.toolbar.searchQuery).toBe('alpha');
  expect(readyCards(result.current).map((card) => card.name)).toEqual(['Alpha']);
});
