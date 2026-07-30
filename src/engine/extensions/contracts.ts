import type { ProjectSummary } from '../contracts';

export interface ControlCenterActionContext {
  refresh(): Promise<ProjectSummary[]>;
  startAndOpen(projectId: string): Promise<void>;
  stop(projectId: string): Promise<void>;
  quickKill(projectId: string): Promise<void>;
  setPending(projectId: string, pending: boolean): void;
  reportError(error: unknown): void;
}

export type ControlCenterAction = (
  context: ControlCenterActionContext,
  payload?: unknown,
) => void | Promise<void>;

export interface ControlCenterExtension {
  schemaVersion: 1;
  id: string;
  actions: Record<string, ControlCenterAction>;
}

export type ExtensionDispatchResult =
  | {
      ok: true;
      actionId: string;
    }
  | {
      ok: false;
      actionId: string;
      code: 'unknown-action' | 'action-failed';
      message: string;
      error?: unknown;
    };

export interface ExtensionHost {
  readonly actionIds: readonly string[];
  dispatch(actionId: string, payload?: unknown): Promise<ExtensionDispatchResult>;
}
