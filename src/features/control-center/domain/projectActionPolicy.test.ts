import type { ProjectStatus } from '../types';
import {
  canOpenProject,
  canQuickKillProject,
  canStartProject,
  canStopProject,
  isActiveProject,
  isOpenReadyProject,
} from './projectActionPolicy';
import { STATUS_CLASSIFICATION } from './projectStatus';

const statuses = Object.keys(STATUS_CLASSIFICATION) as ProjectStatus[];

function context(status: ProjectStatus, managed: boolean, pending = false) {
  return { status, managed, pending };
}

describe('project action policy', () => {
  describe('status classification delegation', () => {
    it.each(statuses)('classifies %s consistently', (status) => {
      const classification = STATUS_CLASSIFICATION[status];

      expect(isActiveProject(status)).toBe(classification.active);
      expect(isOpenReadyProject(status)).toBe(classification.openReady);
    });
  });

  describe('canStartProject', () => {
    it.each(statuses)('allows unmanaged, non-pending %s only when startable', (status) => {
      expect(canStartProject(context(status, false))).toBe(
        status === 'stopped' || status === 'error',
      );
    });

    it.each(statuses)('rejects managed %s', (status) => {
      expect(canStartProject(context(status, true))).toBe(false);
    });

    it.each(['stopped', 'error'] as ProjectStatus[])('rejects pending %s', (status) => {
      expect(canStartProject(context(status, false, true))).toBe(false);
    });
  });

  describe('canOpenProject', () => {
    it.each(statuses)('allows open-ready %s only when not pending', (status) => {
      expect(canOpenProject(context(status, false))).toBe(STATUS_CLASSIFICATION[status].openReady);
      expect(canOpenProject(context(status, true))).toBe(STATUS_CLASSIFICATION[status].openReady);
      expect(canOpenProject(context(status, false, true))).toBe(
        STATUS_CLASSIFICATION[status].openReady,
      );
    });
  });

  describe.each([
    ['canStopProject', canStopProject],
    ['canQuickKillProject', canQuickKillProject],
  ] as const)('%s', (_name, policy) => {
    it.each(statuses)('allows managed, non-pending %s only when stoppable', (status) => {
      expect(policy(context(status, true))).toBe(STATUS_CLASSIFICATION[status].stoppable);
    });

    it.each(statuses)('rejects unmanaged %s, including external ownership', (status) => {
      expect(policy(context(status, false))).toBe(false);
    });

    it.each(statuses)('rejects pending managed %s', (status) => {
      expect(policy(context(status, true, true))).toBe(false);
    });
  });

  it('keeps external never stoppable and managed not-found stoppable', () => {
    expect(canStopProject(context('external', true))).toBe(false);
    expect(canQuickKillProject(context('external', true))).toBe(false);
    expect(canStopProject(context('not-found', true))).toBe(true);
    expect(canQuickKillProject(context('not-found', true))).toBe(true);
  });
});
