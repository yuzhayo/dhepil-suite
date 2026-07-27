import type { ControlCenterActionContext } from '../../contracts';
import projectLifecycleExtension from './index';

function context(): ControlCenterActionContext {
  return {
    refresh: vi.fn(async () => []),
    startAndOpen: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    quickKill: vi.fn(async () => undefined),
    setPending: vi.fn(),
    reportError: vi.fn(),
  };
}

it('starts or opens the requested project through its capability', async () => {
  const actionContext = context();

  await projectLifecycleExtension.actions['project.start-open'](actionContext, 'project-1');

  expect(actionContext.startAndOpen).toHaveBeenCalledWith('project-1');
});

it('stops the requested project through its capability', async () => {
  const actionContext = context();

  await projectLifecycleExtension.actions['project.stop'](actionContext, 'project-1');

  expect(actionContext.stop).toHaveBeenCalledWith('project-1');
});

it('rejects malformed project payload before invoking a capability', async () => {
  const actionContext = context();

  await expect(
    projectLifecycleExtension.actions['project.start-open'](actionContext, {
      projectId: 'project-1',
    }),
  ).rejects.toThrow('membutuhkan project ID string');
  expect(actionContext.startAndOpen).not.toHaveBeenCalled();
});
