import type { ControlCenterActionContext } from '../../contracts';
import quickKillExtension from './index';

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

it('quick-kills the requested project through its capability', async () => {
  const actionContext = context();

  await quickKillExtension.actions['project.quick-kill'](actionContext, 'project-1');

  expect(actionContext.quickKill).toHaveBeenCalledWith('project-1');
});

it('rejects malformed project payload before invoking the capability', async () => {
  const actionContext = context();

  await expect(
    quickKillExtension.actions['project.quick-kill'](actionContext, undefined),
  ).rejects.toThrow('membutuhkan project ID string');
  expect(actionContext.quickKill).not.toHaveBeenCalled();
});
