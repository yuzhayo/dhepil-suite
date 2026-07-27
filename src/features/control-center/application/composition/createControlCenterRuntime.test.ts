import type { ProjectSummary } from '../../types';
import type { ControlCenterActionContext, ControlCenterExtension } from '../extensions/contracts';
import type { ProjectManagerClient } from '../ports/ProjectManagerClient';
import type { ProjectWindow } from '../ports/ProjectWindow';
import { createControlCenterRuntime } from './createControlCenterRuntime';

const runningProject: ProjectSummary = {
  id: 'project-1',
  name: 'Project One',
  description: '',
  relativePath: 'apps/project-one',
  status: 'running',
  managed: true,
  url: 'http://127.0.0.1:2000',
  logs: [],
  desktop: { enabled: false, script: '' },
};

it('assembles injected ports, commands, and extensions behind one runtime contract', async () => {
  const client: ProjectManagerClient = {
    list: vi.fn(async () => [runningProject]),
    start: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
  };
  const projectWindow: ProjectWindow = {
    prepare: vi.fn(),
    open: vi.fn(),
  };
  const extensionAction = vi.fn(async () => undefined);
  const extension: ControlCenterExtension = {
    schemaVersion: 1,
    id: 'test-extension',
    actions: { 'test.action': extensionAction },
  };
  const runtime = createControlCenterRuntime({
    client,
    projectWindow,
    extensions: [extension],
  });
  const signal = new AbortController().signal;

  await expect(runtime.refresh(signal)).resolves.toEqual([runningProject]);
  expect(client.list).toHaveBeenCalledWith(signal);

  await runtime.stop({ project: runningProject, pending: false, signal });
  expect(client.stop).toHaveBeenCalledWith('project-1', signal);

  const context: ControlCenterActionContext = {
    refresh: vi.fn(async () => []),
    startAndOpen: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    quickKill: vi.fn(async () => undefined),
    setPending: vi.fn(),
    reportError: vi.fn(),
  };
  const host = runtime.createHost(context);

  expect(host.actionIds).toEqual(['test.action']);
  await expect(host.dispatch('test.action', 'payload')).resolves.toMatchObject({ ok: true });
  expect(extensionAction).toHaveBeenCalledWith(context, 'payload');
});
