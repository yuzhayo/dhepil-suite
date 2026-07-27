import type { ControlCenterActionContext } from '../../contracts';
import { loadExtensions } from '../../loadExtensions';
import projectRefreshExtension from './index';

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

it('refreshes projects through the high-level capability', async () => {
  const actionContext = context();

  await projectRefreshExtension.actions['project.refresh'](actionContext);

  expect(actionContext.refresh).toHaveBeenCalledOnce();
});

it('is auto-discovered together with every core extension module', () => {
  const extensions = loadExtensions();

  expect(extensions.map((extension) => extension.id)).toEqual([
    'project-lifecycle',
    'project-refresh',
    'quick-kill',
  ]);
  expect(extensions.flatMap((extension) => Object.keys(extension.actions)).sort()).toEqual([
    'project.quick-kill',
    'project.refresh',
    'project.start-open',
    'project.stop',
  ]);
});
