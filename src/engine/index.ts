// Engine public API
export type {
  ProjectStatus,
  ProjectSummary,
  ProjectsResponse,
  ProjectManagerClient,
  ProjectWindow,
  PreparedProjectWindow,
} from './contracts';

export {
  createControlCenterRuntime,
  type ControlCenterRuntime,
  type ControlCenterRuntimeDependencies,
} from './createEngine';

// Domain re-exports
export {
  canStartProject,
  canStopProject,
  canQuickKillProject,
  canOpenProject,
  isActiveProject,
  isOpenReadyProject,
  type ProjectActionContext,
} from './projectActionPolicy';

export {
  isStartupTerminalFailure,
  ACTIVE_STATUSES,
  OPEN_READY_STATUSES,
  STARTUP_TERMINAL_STATUSES,
  STOPPABLE_STATUSES,
  STATUS_CLASSIFICATION,
  type StatusClassification,
} from './projectStatus';

export { StartupReadinessTimeoutError } from './children/projectLifecycle';

export {
  selectProjects,
  isProjectSortMode,
  isProjectViewMode,
  type ProjectSortMode,
  type ProjectViewMode,
} from './projectCollection';
