/**
 * ARCHITECTURE RULE:
 * This is the Parent Composition Root. DO NOT WRITE PRESENTATION LOGIC HERE.
 * This file should only act as a dumb pass-through mapping Engine state to ViewModels.
 * All feature logic (such as filtering, formatting, or conditional UI behavior) 
 * MUST be encapsulated inside the respective Child components (e.g. ui/card-grid/Terminal.tsx).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type ControlCenterRuntime,
  createControlCenterRuntime,
  canQuickKillProject,
  canStartProject,
  canStopProject,
  canOpenProject,
  type ProjectSortMode,
  type ProjectViewMode,
  isProjectSortMode,
  isProjectViewMode,
  isOpenReadyProject,
  type ProjectSummary,
  selectProjects,
  isActiveProject,
  type ProjectStatus,
} from './engine';
import type {
  AlertViewModel,
  ActiveServerItemViewModel,
  CardActionViewModel,
  ControlCenterViewModel,
  HeaderViewModel,
  ProjectCardViewModel,
  ProjectGridViewModel,
  SemanticTone,
  StatusViewModel,
  TagViewModel,
  TerminalViewModel,
  ToolbarViewModel,
  UiActionViewModel,
} from './engine/contracts';
import { CoreLayout } from '../ui/CoreLayout';

// --- Presentation Limits ---
const MAX_RENDERED_LOG_LINES = 80;

// --- Controller Constants ---
const CONTROL_CENTER_POLL_INTERVAL_MILLISECONDS = 1500;

const AVAILABLE_ACTION_IDS = [
  'project.quick-kill',
  'project.refresh',
  'project.search.change',
  'project.sort.change',
  'project.start-open',
  'project.stop',
  'project.view.change',
];

const STATUS_PRESENTATION = {
  stopped: { key: 'stopped', tone: 'neutral' },
  starting: { key: 'starting', tone: 'info' },
  running: { key: 'running', tone: 'success' },
  stopping: { key: 'stopping', tone: 'warning' },
  error: { key: 'error', tone: 'danger' },
  external: { key: 'external', tone: 'warning' },
  'port-conflict': { key: 'port-conflict', tone: 'danger' },
  invalid: { key: 'invalid', tone: 'danger' },
  'not-found': { key: 'not-found', tone: 'warning' },
} satisfies Record<ProjectStatus, { key: ProjectStatus; tone: SemanticTone }>;

// --- Helper Functions (From Presenters) ---
function createStatusViewModel(status: ProjectStatus): StatusViewModel {
  return STATUS_PRESENTATION[status];
}

function createAlerts(project: ProjectSummary): readonly AlertViewModel[] {
  if (project.status === 'error') {
    return [{ key: 'startup-failed', tone: 'danger', value: project.error }];
  }
  if (project.status === 'port-conflict') {
    return [
      {
        key: 'port-conflict',
        tone: 'warning',
        value: project.error ?? (project.port === undefined ? undefined : String(project.port)),
      },
    ];
  }
  if (project.status === 'invalid') {
    return [{ key: 'invalid-config', tone: 'danger', value: project.error }];
  }
  if (project.status === 'not-found') {
    return [{ key: 'project-not-found', tone: 'warning', value: project.relativePath }];
  }
  if (project.error) {
    return [{ key: 'process-error', tone: 'danger', value: project.error }];
  }
  return [];
}

function createTags(project: ProjectSummary): readonly TagViewModel[] {
  const tags: TagViewModel[] = [];
  if (project.managed) {
    tags.push({ key: 'managed' });
  }
  if (project.status === 'external') {
    tags.push({ key: 'external' });
  }
  if (project.managed && project.status === 'not-found') {
    tags.push({ key: 'tombstone' });
  }
  if (project.port !== undefined) {
    tags.push({ key: 'port', value: String(project.port) });
  }
  if (project.pid !== undefined) {
    tags.push({ key: 'pid', value: String(project.pid) });
  }
  tags.push({ key: 'path', value: project.relativePath });
  if (project.desktop.enabled) {
    tags.push({ key: 'desktop' });
  }
  return tags;
}

function createTerminalViewModel(
  logs: readonly string[],
  status: ProjectStatus,
): TerminalViewModel {
  const lines = logs.slice(-MAX_RENDERED_LOG_LINES);
  return {
    status,
    lines,
    truncated: logs.length > MAX_RENDERED_LOG_LINES,
    maxLines: MAX_RENDERED_LOG_LINES,
  };
}

function createProjectCardViewModel(
  project: ProjectSummary,
  pending: boolean,
): ProjectCardViewModel {
  const actionContext = {
    status: project.status,
    managed: project.managed,
    pending,
  };
  const nonPendingActionContext = { ...actionContext, pending: false };
  const canOpen = canOpenProject(actionContext) && Boolean(project.url);
  const canStart = canStartProject(actionContext);
  const canStop = canStopProject(actionContext);
  const canQuickKill = canQuickKillProject(actionContext);
  const couldStart = canStartProject(nonPendingActionContext);
  const couldStop = canStopProject(nonPendingActionContext);
  const couldQuickKill = canQuickKillProject(nonPendingActionContext);

  const actions: readonly CardActionViewModel[] = [
    {
      actionId: 'project.start-open',
      disabled: !canOpen && !canStart,
      loading: pending && !canOpen && couldStart,
    },
    {
      actionId: 'project.stop',
      disabled: !canStop,
      loading: pending && couldStop,
    },
    {
      actionId: 'project.quick-kill',
      disabled: !canQuickKill,
      loading: pending && couldQuickKill,
    },
  ];

  return {
    id: project.id,
    name: project.name,
    status: createStatusViewModel(project.status),
    alerts: createAlerts(project),
    tags: createTags(project),
    actions,
    terminal: createTerminalViewModel(project.logs, project.status),
    url: project.url,
  };
}

function createActiveServerItem(
  project: ProjectSummary,
  pendingActions: Readonly<Record<string, boolean>>,
): ActiveServerItemViewModel {
  const canQuickKill = canQuickKillProject({
    status: project.status,
    managed: project.managed,
    pending: Boolean(pendingActions[project.id]),
  });
  const couldQuickKill = canQuickKillProject({
    status: project.status,
    managed: project.managed,
    pending: false,
  });
  const action: CardActionViewModel = {
    actionId: 'project.quick-kill',
    disabled: !canQuickKill,
    loading: Boolean(pendingActions[project.id]) && couldQuickKill,
  };

  return {
    id: project.id,
    name: project.name,
    port: project.port,
    pid: project.pid,
    status: createStatusViewModel(project.status),
    managed: project.managed,
    action,
  };
}

// --- Controller utilities ---
interface RefreshOptions {
  signal?: AbortSignal;
  supersede?: boolean;
}

interface InFlightRefresh {
  sequence: number;
  controller: AbortController;
  promise: Promise<ProjectSummary[]>;
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

// --- The Screen Component ---

export function ControlCenterScreen({
  runtimeOverride,
}: {
  runtimeOverride?: ControlCenterRuntime;
}) {
  const [runtime] = useState<ControlCenterRuntime>(
    () => runtimeOverride ?? createControlCenterRuntime(),
  );

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
        case 'project.refresh':
          void refreshCapability().catch(reportError);
          return;
        case 'project.start-open':
          if (typeof payload === 'string') {
            void startAndOpenCapability(payload).catch(reportError);
          }
          return;
        case 'project.stop':
          if (typeof payload === 'string') {
            void stopCapability(payload).catch(reportError);
          }
          return;
        case 'project.quick-kill':
          if (typeof payload === 'string') {
            void quickKillCapability(payload).catch(reportError);
          }
          return;
      }
    },
    [quickKillCapability, refreshCapability, reportError, startAndOpenCapability, stopCapability],
  );

  const viewModel = useMemo<ControlCenterViewModel>(() => {
    const rawProjects = loading && projects === null ? null : projects;

    // Grid Model
    const visibleProjects =
      rawProjects === null ? null : selectProjects(rawProjects, searchQuery, sortMode);

    let grid: ProjectGridViewModel;
    if (visibleProjects === null) {
      grid = { state: 'loading' };
    } else if (visibleProjects.length === 0) {
      grid = { state: 'empty' };
    } else {
      grid = {
        state: 'ready',
        viewMode,
        projects: visibleProjects.map((project) =>
          createProjectCardViewModel(project, Boolean(pendingActions[project.id])),
        ),
      };
    }

    // Toolbar Model
    const activeServers = (rawProjects ?? [])
      .filter((project) => isActiveProject(project.status))
      .map((project) => createActiveServerItem(project, pendingActions));

    const toolbarActions: readonly UiActionViewModel[] = [
      { actionId: 'project.search.change', disabled: false, loading: false },
      { actionId: 'project.sort.change', disabled: false, loading: false },
      { actionId: 'project.view.change', disabled: false, loading: false },
      {
        actionId: 'project.refresh',
        disabled: Boolean(refreshPending),
        loading: Boolean(refreshPending),
      },
    ];

    const toolbar: ToolbarViewModel = {
      searchQuery,
      sortMode,
      viewMode,
      summary: {
        visibleCount: visibleProjects?.length ?? rawProjects?.length ?? 0,
        totalCount: rawProjects?.length ?? 0,
        activeCount: activeServers.length,
      },
      activeServers,
      actions: toolbarActions,
    };

    // Header Model
    const header: HeaderViewModel = {
      actions: [],
    };

    return {
      header,
      toolbar,
      grid,
      availableActionIds: [...AVAILABLE_ACTION_IDS],
      pageAlert: pageError ? { key: 'page-error', tone: 'danger', value: pageError } : undefined,
    };
  }, [
    loading,
    pageError,
    pendingActions,
    projects,
    refreshPending,
    searchQuery,
    sortMode,
    viewMode,
  ]);

  return <CoreLayout viewModel={viewModel} onAction={dispatch} />;
}
