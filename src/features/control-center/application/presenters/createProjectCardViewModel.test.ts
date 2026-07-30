import { createProjectCardViewModel } from './createProjectCardViewModel';
import { MAX_RENDERED_LOG_LINES } from '../presentationLimits';
import type { ProjectStatus, ProjectSummary } from '../../../../engine';

const statuses: ProjectStatus[] = [
  'stopped',
  'starting',
  'running',
  'stopping',
  'error',
  'external',
  'port-conflict',
  'invalid',
  'not-found',
];

const baseProject: ProjectSummary = {
  id: 'project-1',
  name: 'Project One',
  description: 'A project',
  relativePath: 'apps/project-one',
  port: 2000,
  pid: 1234,
  status: 'stopped',
  managed: true,
  logs: [],
  desktop: { enabled: true, script: 'electron .' },
};

function action(viewModel: ReturnType<typeof createProjectCardViewModel>, actionId: string) {
  return viewModel.actions.find((candidate) => candidate.actionId === actionId);
}

describe('createProjectCardViewModel', () => {
  it.each([
    ['stopped', 'neutral'],
    ['starting', 'info'],
    ['running', 'success'],
    ['stopping', 'warning'],
    ['error', 'danger'],
    ['external', 'warning'],
    ['port-conflict', 'danger'],
    ['invalid', 'danger'],
    ['not-found', 'warning'],
  ] as const)('maps %s to a semantic status tone', (status, tone) => {
    const viewModel = createProjectCardViewModel({ ...baseProject, status }, { pending: false });

    expect(viewModel.status).toEqual({ key: status, tone });
  });

  it('does not expose raw project data or static UI copy', () => {
    const viewModel = createProjectCardViewModel(baseProject, { pending: false });

    expect(viewModel).not.toHaveProperty('project');
    expect(viewModel.status).not.toHaveProperty('label');
    expect(viewModel.tags.every((tag) => !('label' in tag) && !('color' in tag))).toBe(true);
    expect(viewModel.alerts.every((alert) => !('message' in alert))).toBe(true);
  });

  it('creates one semantic alert for each alerting status', () => {
    const cases = [
      ['error', 'startup-failed', 'danger'],
      ['port-conflict', 'port-conflict', 'warning'],
      ['invalid', 'invalid-config', 'danger'],
      ['not-found', 'project-not-found', 'warning'],
    ] as const;

    for (const [status, key, tone] of cases) {
      const viewModel = createProjectCardViewModel({ ...baseProject, status }, { pending: false });
      expect(viewModel.alerts).toHaveLength(1);
      expect(viewModel.alerts[0]).toMatchObject({ key, tone });
    }
  });

  it('adds dynamic tags without presentation labels or colors', () => {
    const viewModel = createProjectCardViewModel(baseProject, { pending: false });

    expect(viewModel.tags).toEqual([
      { key: 'managed' },
      { key: 'port', value: '2000' },
      { key: 'pid', value: '1234' },
      { key: 'path', value: 'apps/project-one' },
      { key: 'desktop' },
    ]);
  });

  it('uses stable action IDs and applies policy availability', () => {
    const viewModel = createProjectCardViewModel(
      { ...baseProject, status: 'running', url: 'http://127.0.0.1:2000' },
      { pending: false },
    );

    expect(viewModel.actions.map((candidate) => candidate.actionId)).toEqual([
      'project.start-open',
      'project.stop',
      'project.quick-kill',
    ]);
    expect(action(viewModel, 'project.start-open')).toMatchObject({ disabled: false });
    expect(action(viewModel, 'project.stop')).toMatchObject({ disabled: false });
    expect(action(viewModel, 'project.quick-kill')).toMatchObject({ disabled: false });
  });

  it('does not allow a managed stopped project to start', () => {
    const viewModel = createProjectCardViewModel(baseProject, { pending: false });

    expect(action(viewModel, 'project.start-open')).toMatchObject({ disabled: true });
  });

  it('allows an unmanaged stopped project to start', () => {
    const viewModel = createProjectCardViewModel(
      { ...baseProject, managed: false },
      { pending: false },
    );

    expect(action(viewModel, 'project.start-open')).toMatchObject({ disabled: false });
  });

  it('does not bypass open policy when a non-open-ready project has a stale URL', () => {
    const viewModel = createProjectCardViewModel(
      { ...baseProject, status: 'invalid', url: 'http://127.0.0.1:2000' },
      { pending: false },
    );

    expect(action(viewModel, 'project.start-open')).toMatchObject({ disabled: true });
  });

  it('disables and marks mutating actions loading while a project is pending', () => {
    const viewModel = createProjectCardViewModel(
      { ...baseProject, status: 'running', url: 'http://127.0.0.1:2000' },
      { pending: true },
    );

    expect(action(viewModel, 'project.start-open')).toMatchObject({
      disabled: false,
      loading: false,
    });
    expect(action(viewModel, 'project.stop')).toMatchObject({
      disabled: true,
      loading: true,
    });
    expect(action(viewModel, 'project.quick-kill')).toMatchObject({
      disabled: true,
      loading: true,
    });
  });

  it('keeps the newest rendered log lines', () => {
    const logs = Array.from({ length: 100 }, (_, index) => `line-${index + 1}`);
    const viewModel = createProjectCardViewModel({ ...baseProject, logs }, { pending: false });

    expect(viewModel.terminal.lines).toHaveLength(MAX_RENDERED_LOG_LINES);
    expect(viewModel.terminal.lines[0]).toBe('line-21');
    expect(viewModel.terminal.lines.at(-1)).toBe('line-100');
    expect(viewModel.terminal.truncated).toBe(true);
    expect(viewModel.terminal.maxLines).toBe(MAX_RENDERED_LOG_LINES);
  });

  it('keeps all logs when they fit within the presentation limit', () => {
    const logs = ['line-1', 'line-2'];
    const viewModel = createProjectCardViewModel({ ...baseProject, logs }, { pending: false });

    expect(viewModel.terminal.lines).toEqual(logs);
    expect(viewModel.terminal.truncated).toBe(false);
  });

  it('keeps managed not-found stoppable without duplicating its alert', () => {
    const viewModel = createProjectCardViewModel(
      { ...baseProject, status: 'not-found' },
      { pending: false },
    );

    expect(viewModel.alerts).toHaveLength(1);
    expect(action(viewModel, 'project.stop')).toMatchObject({ disabled: false });
    expect(action(viewModel, 'project.quick-kill')).toMatchObject({ disabled: false });
  });

  it.each(statuses)('returns a complete terminal model for %s', (status) => {
    const viewModel = createProjectCardViewModel({ ...baseProject, status }, { pending: false });

    expect(viewModel.terminal).toEqual({
      lines: [],
      truncated: false,
      maxLines: MAX_RENDERED_LOG_LINES,
    });
  });
});
