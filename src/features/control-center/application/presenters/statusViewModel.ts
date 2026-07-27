import type { ProjectStatus } from '../../types';
import type { SemanticTone, StatusViewModel } from '../view-models';

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

export function createStatusViewModel(status: ProjectStatus): StatusViewModel {
  return STATUS_PRESENTATION[status];
}
