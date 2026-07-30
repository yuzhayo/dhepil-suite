import type { ProjectStatus } from '../contracts';

export interface StatusClassification {
  active: boolean;
  openReady: boolean;
  startupTerminal: boolean;
  stoppable: boolean;
}

export const STATUS_CLASSIFICATION = {
  stopped: { active: false, openReady: false, startupTerminal: false, stoppable: false },
  starting: { active: true, openReady: false, startupTerminal: false, stoppable: true },
  running: { active: true, openReady: true, startupTerminal: false, stoppable: true },
  stopping: { active: true, openReady: false, startupTerminal: false, stoppable: false },
  error: { active: false, openReady: false, startupTerminal: true, stoppable: true },
  invalid: { active: false, openReady: false, startupTerminal: true, stoppable: false },
  external: { active: true, openReady: true, startupTerminal: false, stoppable: false },
  'port-conflict': { active: false, openReady: false, startupTerminal: true, stoppable: false },
  'not-found': { active: true, openReady: false, startupTerminal: true, stoppable: true },
} satisfies Record<ProjectStatus, StatusClassification>;

const statusEntries = Object.entries(STATUS_CLASSIFICATION) as Array<
  [ProjectStatus, StatusClassification]
>;

function statusesWith(property: keyof StatusClassification): ReadonlySet<ProjectStatus> {
  return new Set(
    statusEntries
      .filter(([, classification]) => classification[property])
      .map(([status]) => status),
  );
}

export const ACTIVE_STATUSES = statusesWith('active');
export const OPEN_READY_STATUSES = statusesWith('openReady');
export const STARTUP_TERMINAL_STATUSES = statusesWith('startupTerminal');
export const STOPPABLE_STATUSES = statusesWith('stoppable');

export function isActiveProject(status: ProjectStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

export function isOpenReadyProject(status: ProjectStatus): boolean {
  return OPEN_READY_STATUSES.has(status);
}

export function isStartupTerminalFailure(status: ProjectStatus): boolean {
  return STARTUP_TERMINAL_STATUSES.has(status);
}
