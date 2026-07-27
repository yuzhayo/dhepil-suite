import type {
  ControlCenterAction,
  ControlCenterActionContext,
  ControlCenterExtension,
  ExtensionDispatchResult,
  ExtensionHost,
} from './contracts';

const stableIdPattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

export class ExtensionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtensionValidationError';
  }
}

export function createExtensionHost(
  extensions: readonly unknown[],
  context: ControlCenterActionContext,
): ExtensionHost {
  const actions = validateExtensions(extensions);
  const actionIds = Object.freeze(
    [...actions.keys()].sort((first, second) => first.localeCompare(second)),
  );

  return {
    actionIds,
    async dispatch(actionId, payload): Promise<ExtensionDispatchResult> {
      const action = actions.get(actionId);
      if (!action) {
        return {
          ok: false,
          actionId,
          code: 'unknown-action',
          message: `Action "${actionId}" tidak terpasang.`,
        };
      }

      try {
        await action(context, payload);
        return { ok: true, actionId };
      } catch (error) {
        context.reportError(error);
        return {
          ok: false,
          actionId,
          code: 'action-failed',
          message: error instanceof Error ? error.message : String(error),
          error,
        };
      }
    },
  };
}

function validateExtensions(extensions: readonly unknown[]): Map<string, ControlCenterAction> {
  const extensionIds = new Set<string>();
  const actions = new Map<string, ControlCenterAction>();

  for (const candidate of extensions) {
    const extension = validateExtension(candidate);
    if (extensionIds.has(extension.id)) {
      throw new ExtensionValidationError(`Extension ID "${extension.id}" duplikat.`);
    }
    extensionIds.add(extension.id);

    for (const [actionId, action] of Object.entries(extension.actions)) {
      validateStableId(actionId, 'Action');
      if (typeof action !== 'function') {
        throw new ExtensionValidationError(
          `Action "${actionId}" pada extension "${extension.id}" bukan function.`,
        );
      }
      if (actions.has(actionId)) {
        throw new ExtensionValidationError(`Action ID "${actionId}" duplikat.`);
      }
      actions.set(actionId, action);
    }
  }

  return actions;
}

function validateExtension(candidate: unknown): ControlCenterExtension {
  if (!isRecord(candidate)) {
    throw new ExtensionValidationError('Extension harus berupa object.');
  }
  if (candidate.schemaVersion !== 1) {
    throw new ExtensionValidationError('Extension schemaVersion harus 1.');
  }
  if (typeof candidate.id !== 'string') {
    throw new ExtensionValidationError('Extension ID harus berupa string.');
  }
  validateStableId(candidate.id, 'Extension');
  if (!isRecord(candidate.actions)) {
    throw new ExtensionValidationError(`Extension "${candidate.id}" tidak memiliki action map.`);
  }

  return candidate as unknown as ControlCenterExtension;
}

function validateStableId(value: string, owner: string): void {
  if (!stableIdPattern.test(value)) {
    throw new ExtensionValidationError(`${owner} ID "${value}" tidak stabil.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
