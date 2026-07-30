import { describe, expect, it } from 'vitest';
import {
  canStartProject,
  canStopProject,
  canQuickKillProject,
  canOpenProject,
  isActiveProject,
  isOpenReadyProject,
} from './projectActionPolicy';

describe('projectActionPolicy', () => {
  it('identifies active and open ready projects', () => {
    expect(isActiveProject('running')).toBe(true);
    expect(isActiveProject('stopped')).toBe(false);
    expect(isOpenReadyProject('running')).toBe(true);
    expect(isOpenReadyProject('starting')).toBe(false);
  });

  it('evaluates start policy correctly', () => {
    expect(canStartProject({ status: 'stopped', managed: false, pending: false })).toBe(true);
    expect(canStartProject({ status: 'error', managed: false, pending: false })).toBe(true);
    expect(canStartProject({ status: 'stopped', managed: true, pending: false })).toBe(false);
    expect(canStartProject({ status: 'running', managed: false, pending: false })).toBe(false);
    expect(canStartProject({ status: 'stopped', managed: false, pending: true })).toBe(false);
  });

  it('evaluates stop policy correctly', () => {
    expect(canStopProject({ status: 'running', managed: true, pending: false })).toBe(true);
    expect(canStopProject({ status: 'starting', managed: true, pending: false })).toBe(true);
    expect(canStopProject({ status: 'running', managed: false, pending: false })).toBe(false);
    expect(canStopProject({ status: 'stopped', managed: true, pending: false })).toBe(false);
    expect(canStopProject({ status: 'running', managed: true, pending: true })).toBe(false);
  });

  it('evaluates quick kill policy as identical to stop policy', () => {
    expect(canQuickKillProject({ status: 'running', managed: true, pending: false })).toBe(true);
    expect(canQuickKillProject({ status: 'stopped', managed: true, pending: false })).toBe(false);
  });

  it('evaluates open policy', () => {
    expect(canOpenProject({ status: 'running', managed: true, pending: false })).toBe(true);
    expect(canOpenProject({ status: 'stopped', managed: true, pending: false })).toBe(false);
  });
});
