import { describe, expect, it } from 'vitest';
import {
  isActiveProject,
  isOpenReadyProject,
  isStartupTerminalFailure,
  STATUS_CLASSIFICATION,
} from './projectStatus';

describe('projectStatus', () => {
  it('correctly classifies status values', () => {
    expect(isActiveProject('running')).toBe(true);
    expect(isActiveProject('starting')).toBe(true);
    expect(isActiveProject('stopped')).toBe(false);

    expect(isOpenReadyProject('running')).toBe(true);
    expect(isOpenReadyProject('external')).toBe(true);
    expect(isOpenReadyProject('starting')).toBe(false);

    expect(isStartupTerminalFailure('error')).toBe(true);
    expect(isStartupTerminalFailure('invalid')).toBe(true);
    expect(isStartupTerminalFailure('running')).toBe(false);
  });

  it('contains complete status classification table', () => {
    expect(STATUS_CLASSIFICATION.running).toEqual({
      active: true,
      openReady: true,
      startupTerminal: false,
      stoppable: true,
    });
    expect(STATUS_CLASSIFICATION.stopped).toEqual({
      active: false,
      openReady: false,
      startupTerminal: false,
      stoppable: false,
    });
  });
});
