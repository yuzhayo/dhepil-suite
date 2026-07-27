import type { ProjectStatus } from '../types';
import {
  ACTIVE_STATUSES,
  OPEN_READY_STATUSES,
  STARTUP_TERMINAL_STATUSES,
  STATUS_CLASSIFICATION,
  STOPPABLE_STATUSES,
  isActiveProject,
  isOpenReadyProject,
  isStartupTerminalFailure,
} from './projectStatus';

const statuses: ProjectStatus[] = [
  'stopped',
  'starting',
  'running',
  'stopping',
  'error',
  'invalid',
  'external',
  'port-conflict',
  'not-found',
];

describe('project status classification', () => {
  it.each(statuses)('classifies %s consistently across derived families', (status) => {
    const classification = STATUS_CLASSIFICATION[status];

    expect(ACTIVE_STATUSES.has(status)).toBe(classification.active);
    expect(OPEN_READY_STATUSES.has(status)).toBe(classification.openReady);
    expect(STARTUP_TERMINAL_STATUSES.has(status)).toBe(classification.startupTerminal);
    expect(STOPPABLE_STATUSES.has(status)).toBe(classification.stoppable);
    expect(isActiveProject(status)).toBe(classification.active);
    expect(isOpenReadyProject(status)).toBe(classification.openReady);
    expect(isStartupTerminalFailure(status)).toBe(classification.startupTerminal);
  });

  it('exposes expected status families', () => {
    expect([...ACTIVE_STATUSES]).toEqual([
      'starting',
      'running',
      'stopping',
      'external',
      'not-found',
    ]);
    expect([...OPEN_READY_STATUSES]).toEqual(['running', 'external']);
    expect([...STARTUP_TERMINAL_STATUSES]).toEqual([
      'error',
      'invalid',
      'port-conflict',
      'not-found',
    ]);
    expect([...STOPPABLE_STATUSES]).toEqual(['starting', 'running', 'error', 'not-found']);
  });
});
