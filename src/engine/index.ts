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

export type {
  ControlCenterActionContext,
  ControlCenterExtension,
  ExtensionHost,
  ExtensionDispatchResult,
} from './extensions/contracts';

// Domain re-exports
export {
  canStartProject,
  canStopProject,
  canQuickKillProject,
  canOpenProject,
  isActiveProject,
  isOpenReadyProject,
  type ProjectActionContext,
} from './domain/projectActionPolicy';

export {
  isStartupTerminalFailure,
  ACTIVE_STATUSES,
  OPEN_READY_STATUSES,
  STARTUP_TERMINAL_STATUSES,
  STOPPABLE_STATUSES,
  STATUS_CLASSIFICATION,
  type StatusClassification,
} from './domain/projectStatus';

export { StartupReadinessTimeoutError } from './children/project-lifecycle/startupReadinessPolicy';

export {
  selectProjects,
  isProjectSortMode,
  isProjectViewMode,
  type ProjectSortMode,
  type ProjectViewMode,
} from './domain/projectCollection';
