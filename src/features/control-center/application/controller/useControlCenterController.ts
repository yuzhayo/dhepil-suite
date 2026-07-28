import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ControlCenterRuntime,
  createControlCenterRuntime,
} from '../composition/createControlCenterRuntime';
import type { ControlCenterActionContext } from '../extensions/contracts';
import { createControlCenterViewModel } from '../presenters/createControlCenterViewModel';
import type { ControlCenterViewModel } from '../view-models';
import {
  canQuickKillProject,
  canStartProject,
  canStopProject,
} from '../../domain/projectActionPolicy';
import type { ProjectSortMode, ProjectViewMode } from '../../domain/projectCollection';
import { isProjectSortMode, isProjectViewMode } from '../../domain/projectCollection';
import { isOpenReadyProject } from '../../domain/projectStatus';
import type { ProjectSummary } from '../../types';

export const CONTROL_CENTER_POLL_INTERVAL_MILLISECONDS = 1500;

const localActionIds = [
  'project.search.change',
  'project.sort.change',
  'project.view.change',
] as const;

interface RefreshOptions {
  signal?: AbortSignal;
  supersede?: boolean;
}

interface InFlightRefresh {
  sequence: number;
  controller: AbortController;
  promise: Promise<ProjectSummary[]>;
}

export interface ControlCenterController {
  viewModel: ControlCenterViewModel;
  dispatch(actionId: string, payload?: unknown): void;
}

export function useControlCenterController(
  runtimeOverride?: ControlCenterRuntime,
): ControlCenterController {
  const runtimeRef = useRef<ControlCenterRuntime | undefined>(undefined);
  runtimeRef.current ??= runtimeOverride ?? createControlCenterRuntime();
  const runtime = runtimeRef.current;

  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string>();
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<ProjectSortMode>('name-asc');
  const [viewMode, setViewMode] = useState<ProjectViewMode>('grid');
  const [refreshPending, setRefreshPending] = useState(false);

  const mountedRef = useRef(false);
  const projectsRef = useRef<ProjectSummary[] | null>(null);
  const pendingActionsRef = useRef<Record<string, boolean>>({});
  const refreshSequenceRef = useRef(0);
  const latestRefreshSequenceRef = useRef(0);
  const inFlightRefreshRef = useRef<InFlightRefresh | null>(null);
  const actionControllersRef = useRef(new Map<string, AbortController>());

  const reportError = useCallback((error: unknown) => {
    if (!mountedRef.current || isCancellation(error)) {
      return;
    }
    setPageError(error instanceof Error ? error.message : String(error));
  }, []);

  const setPending = useCallback((projectId: string, pending: boolean) => {
    const next = { ...pendingActionsRef.current, [projectId]: pending };
    pendingActionsRef.current = next;
    if (mountedRef.current) {
      setPendingActions(next);
    }
  }, []);

  const requestRefresh = useCallback(
    (options: RefreshOptions = {}): Promise<ProjectSummary[]> => {
      const current = inFlightRefreshRef.current;
      if (current && !options.supersede) {
        return current.promise;
      }
      if (current) {
        current.controller.abort('superseded');
      }

      const sequence = ++refreshSequenceRef.current;
      latestRefreshSequenceRef.current = sequence;
      const { controller, release } = createLinkedAbortController(options.signal);

      const promise = (async () => {
        if (mountedRef.current) {
          setRefreshPending(true);
        }

        try {
          const nextProjects = await runtime.refresh(controller.signal);
          if (mountedRef.current && sequence === latestRefreshSequenceRef.current) {
            projectsRef.current = nextProjects;
            setProjects(nextProjects);
            setPageError(undefined);
          }
          return nextProjects;
        } catch (error) {
          const stale = sequence !== latestRefreshSequenceRef.current;
          if (stale || controller.signal.aborted || isCancellation(error)) {
            return projectsRef.current ?? [];
          }
          if (mountedRef.current) {
            if (projectsRef.current === null) {
              projectsRef.current = [];
              setProjects([]);
            }
            reportError(error);
          }
          throw error;
        } finally {
          release();
          if (inFlightRefreshRef.current?.sequence === sequence) {
            inFlightRefreshRef.current = null;
            if (mountedRef.current) {
              setRefreshPending(false);
              setLoading(false);
            }
          }
        }
      })();

      inFlightRefreshRef.current = { sequence, controller, promise };
      return promise;
    },
    [reportError, runtime],
  );

  const runProjectAction = useCallback(
    async (
      projectId: string,
      operation: (project: ProjectSummary, signal: AbortSignal) => Promise<void>,
    ): Promise<void> => {
      if (!mountedRef.current || actionControllersRef.current.has(projectId)) {
        return;
      }
      const project = projectsRef.current?.find((candidate) => candidate.id === projectId);
      if (!project) {
        throw new Error(`Project "${projectId}" tidak ditemukan.`);
      }

      const controller = new AbortController();
      actionControllersRef.current.set(projectId, controller);
      setPending(projectId, true);

      let actionError: unknown;
      let refreshError: unknown;
      try {
        await operation(project, controller.signal);
      } catch (error) {
        actionError = error;
      } finally {
        if (actionControllersRef.current.get(projectId) === controller) {
          actionControllersRef.current.delete(projectId);
        }
        setPending(projectId, false);
        if (mountedRef.current) {
          try {
            await requestRefresh({ supersede: true });
          } catch (error) {
            refreshError = error;
          }
        }
      }

      if (actionError !== undefined) {
        throw actionError;
      }
      if (refreshError !== undefined) {
        throw refreshError;
      }
    },
    [requestRefresh, setPending],
  );

  const refreshCapability = useCallback(
    () => requestRefresh({ supersede: true }),
    [requestRefresh],
  );

  const startAndOpenCapability = useCallback(
    async (projectId: string) => {
      const project = projectsRef.current?.find((candidate) => candidate.id === projectId);
      if (!project) {
        throw new Error(`Project "${projectId}" tidak ditemukan.`);
      }
      if (isOpenReadyProject(project.status) && project.url) {
        await runtime.startAndOpen({
          project,
          pending: false,
          refresh: (signal) => requestRefresh({ signal }),
        });
        return;
      }
      if (
        !canStartProject({
          status: project.status,
          managed: project.managed,
          pending: Boolean(pendingActionsRef.current[projectId]),
        })
      ) {
        return;
      }

      await runProjectAction(projectId, (_, signal) =>
        runtime.startAndOpen({
          project,
          pending: false,
          signal,
          refresh: (refreshSignal) => requestRefresh({ signal: refreshSignal }),
        }),
      );
    },
    [requestRefresh, runProjectAction, runtime],
  );

  const stopCapability = useCallback(
    async (projectId: string) => {
      const project = projectsRef.current?.find((candidate) => candidate.id === projectId);
      if (
        !project ||
        !canStopProject({
          status: project.status,
          managed: project.managed,
          pending: Boolean(pendingActionsRef.current[projectId]),
        })
      ) {
        return;
      }
      await runProjectAction(projectId, (selected, signal) =>
        runtime.stop({ project: selected, pending: false, signal }),
      );
    },
    [runProjectAction, runtime],
  );

  const quickKillCapability = useCallback(
    async (projectId: string) => {
      const project = projectsRef.current?.find((candidate) => candidate.id === projectId);
      if (
        !project ||
        !canQuickKillProject({
          status: project.status,
          managed: project.managed,
          pending: Boolean(pendingActionsRef.current[projectId]),
        })
      ) {
        return;
      }
      await runProjectAction(projectId, (selected, signal) =>
        runtime.quickKill({ project: selected, pending: false, signal }),
      );
    },
    [runProjectAction, runtime],
  );

  const actionContext = useMemo<ControlCenterActionContext>(
    () => ({
      refresh: refreshCapability,
      startAndOpen: startAndOpenCapability,
      stop: stopCapability,
      quickKill: quickKillCapability,
      setPending,
      reportError,
    }),
    [
      quickKillCapability,
      refreshCapability,
      reportError,
      setPending,
      startAndOpenCapability,
      stopCapability,
    ],
  );
  const host = useMemo(() => runtime.createHost(actionContext), [actionContext, runtime]);

  useEffect(() => {
    mountedRef.current = true;
    const actionControllers = actionControllersRef.current;
    void requestRefresh().catch(() => undefined);
    const interval = globalThis.setInterval(() => {
      void requestRefresh().catch(() => undefined);
    }, CONTROL_CENTER_POLL_INTERVAL_MILLISECONDS);

    return () => {
      mountedRef.current = false;
      globalThis.clearInterval(interval);
      inFlightRefreshRef.current?.controller.abort('unmount');
      inFlightRefreshRef.current = null;
      for (const controller of actionControllers.values()) {
        controller.abort('unmount');
      }
      actionControllers.clear();
    };
  }, [requestRefresh]);

  const dispatch = useCallback(
    (actionId: string, payload?: unknown) => {
      switch (actionId) {
        case 'project.search.change':
          if (typeof payload === 'string') {
            setSearchQuery(payload);
          } else {
            reportError(new Error('Search query harus berupa string.'));
          }
          return;
        case 'project.sort.change':
          if (isProjectSortMode(payload)) {
            setSortMode(payload);
          } else {
            reportError(new Error('Sort mode tidak dikenal.'));
          }
          return;
        case 'project.view.change':
          if (isProjectViewMode(payload)) {
            setViewMode(payload);
          } else {
            reportError(new Error('View mode tidak dikenal.'));
          }
          return;
        default:
          void host.dispatch(actionId, payload);
      }
    },
    [host, reportError],
  );

  const availableActionIds = useMemo(
    () => [...new Set([...host.actionIds, ...localActionIds])].sort(),
    [host.actionIds],
  );
  const viewModel = useMemo(
    () =>
      createControlCenterViewModel({
        projects: loading && projects === null ? null : projects,
        searchQuery,
        sortMode,
        viewMode,
        pendingActions,
        availableActionIds,
        pageError,
        refreshPending,
      }),
    [
      availableActionIds,
      loading,
      pageError,
      pendingActions,
      projects,
      refreshPending,
      searchQuery,
      sortMode,
      viewMode,
    ],
  );

  return { viewModel, dispatch };
}

function createLinkedAbortController(signal?: AbortSignal): {
  controller: AbortController;
  release(): void;
} {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);

  if (signal?.aborted) {
    abort();
  } else {
    signal?.addEventListener('abort', abort, { once: true });
  }

  return {
    controller,
    release() {
      signal?.removeEventListener('abort', abort);
    },
  };
}

function isCancellation(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    (error as { kind?: unknown }).kind === 'cancelled'
  );
}
