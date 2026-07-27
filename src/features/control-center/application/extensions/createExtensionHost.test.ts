import type { ControlCenterActionContext, ControlCenterExtension } from './contracts';
import { createExtensionHost, ExtensionValidationError } from './createExtensionHost';
import { loadExtensions } from './loadExtensions';

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

function extension(
  id: string,
  actions: ControlCenterExtension['actions'] = {
    [`${id}.run`]: vi.fn(async () => undefined),
  },
): ControlCenterExtension {
  return { schemaVersion: 1, id, actions };
}

describe('createExtensionHost', () => {
  it('publishes stable action IDs and dispatches payload through the high-level context', async () => {
    const action = vi.fn(async () => undefined);
    const actionContext = context();
    const host = createExtensionHost(
      [
        extension('zeta-extension', { 'project.zeta': action }),
        extension('alpha-extension', { 'project.alpha': vi.fn() }),
      ],
      actionContext,
    );
    const payload = { projectId: 'alpha' };

    await expect(host.dispatch('project.zeta', payload)).resolves.toEqual({
      ok: true,
      actionId: 'project.zeta',
    });
    expect(action).toHaveBeenCalledWith(actionContext, payload);
    expect(host.actionIds).toEqual(['project.alpha', 'project.zeta']);
    expect(Object.isFrozen(host.actionIds)).toBe(true);
  });

  it('rejects unsupported schemas and unstable IDs', () => {
    expect(() =>
      createExtensionHost([{ schemaVersion: 2, id: 'invalid-schema', actions: {} }], context()),
    ).toThrow(ExtensionValidationError);
    expect(() => createExtensionHost([extension('Invalid ID')], context())).toThrow(
      'Extension ID "Invalid ID" tidak stabil.',
    );
    expect(() =>
      createExtensionHost([extension('valid-extension', { 'Invalid Action': vi.fn() })], context()),
    ).toThrow('Action ID "Invalid Action" tidak stabil.');
  });

  it('rejects duplicate extension and action IDs', () => {
    expect(() =>
      createExtensionHost([extension('duplicate'), extension('duplicate')], context()),
    ).toThrow('Extension ID "duplicate" duplikat.');
    expect(() =>
      createExtensionHost(
        [
          extension('first-extension', { 'project.same': vi.fn() }),
          extension('second-extension', { 'project.same': vi.fn() }),
        ],
        context(),
      ),
    ).toThrow('Action ID "project.same" duplikat.');
  });

  it('rejects an invalid action map and non-function action', () => {
    expect(() =>
      createExtensionHost([{ schemaVersion: 1, id: 'missing-actions', actions: null }], context()),
    ).toThrow('tidak memiliki action map');
    expect(() =>
      createExtensionHost(
        [
          {
            schemaVersion: 1,
            id: 'invalid-action',
            actions: { 'project.invalid': 'not-a-function' },
          },
        ],
        context(),
      ),
    ).toThrow('bukan function');
  });

  it('returns a structured diagnostic for an unknown action', async () => {
    const host = createExtensionHost([], context());

    await expect(host.dispatch('project.missing')).resolves.toEqual({
      ok: false,
      actionId: 'project.missing',
      code: 'unknown-action',
      message: 'Action "project.missing" tidak terpasang.',
    });
  });

  it('isolates action failure, reports it, and keeps other actions usable', async () => {
    const failure = new Error('extension failed');
    const actionContext = context();
    const healthyAction = vi.fn(async () => undefined);
    const host = createExtensionHost(
      [
        extension('failure-extension', {
          'project.fail': vi.fn(async () => Promise.reject(failure)),
          'project.healthy': healthyAction,
        }),
      ],
      actionContext,
    );

    await expect(host.dispatch('project.fail')).resolves.toMatchObject({
      ok: false,
      actionId: 'project.fail',
      code: 'action-failed',
      message: 'extension failed',
      error: failure,
    });
    expect(actionContext.reportError).toHaveBeenCalledWith(failure);
    await expect(host.dispatch('project.healthy')).resolves.toEqual({
      ok: true,
      actionId: 'project.healthy',
    });
    expect(healthyAction).toHaveBeenCalledOnce();
  });
});

describe('loadExtensions', () => {
  it('returns injected eager modules in stable path order', () => {
    const alpha = extension('alpha-extension');
    const zeta = extension('zeta-extension');

    expect(
      loadExtensions({
        './modules/zeta-extension/index.ts': zeta,
        './modules/alpha-extension/index.ts': alpha,
      }),
    ).toEqual([alpha, zeta]);
  });
});
