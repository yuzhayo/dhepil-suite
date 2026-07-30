import type { ProjectManagerClient } from '../contracts';
import {
  parseActionResponse,
  parseProjectsResponse,
  ProjectManagerRequestError,
  type ProjectManagerAction,
  type ProjectManagerRequestErrorKind,
} from './projectManagerResponse';

export function httpProjectManagerClient(): ProjectManagerClient {
  return {
    async list(signal) {
      const response = await request(
        '/api/projects',
        { headers: { Accept: 'application/json' }, signal },
        'list',
      );
      if (!response.ok) {
        throw requestError(
          response.status,
          'list',
          'http',
          `Gagal membaca status project (${response.status}).`,
        );
      }

      const payload = await readJson(response, 'list', signal);

      try {
        return parseProjectsResponse(payload);
      } catch (error) {
        throw malformedResponseError(response.status, 'list', error);
      }
    },

    async start(projectId, signal) {
      await runAction(projectId, 'start', signal);
    },

    async stop(projectId, signal) {
      await runAction(projectId, 'stop', signal);
    },
  };
}

async function runAction(
  projectId: string,
  action: 'start' | 'stop',
  signal?: AbortSignal,
): Promise<void> {
  const response = await request(
    `/api/projects/${projectId}/${action}`,
    { method: 'POST', headers: { Accept: 'application/json' }, signal },
    action,
  );
  const rawPayload = await readJson(
    response,
    action,
    signal,
    response.ok ? undefined : `Aksi ${action} gagal.`,
  );

  let payload: { error?: string };
  try {
    payload = parseActionResponse(rawPayload);
  } catch (error) {
    throw malformedResponseError(response.status, action, error);
  }

  if (!response.ok) {
    throw requestError(response.status, action, 'http', payload.error ?? `Aksi ${action} gagal.`);
  }
}

async function request(
  input: string,
  init: RequestInit,
  action: ProjectManagerAction,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (init.signal?.aborted || isAbortError(error)) {
      throw requestError(undefined, action, 'cancelled', 'Permintaan dibatalkan.');
    }
    throw requestError(
      undefined,
      action,
      'network',
      error instanceof Error ? error.message : String(error),
    );
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

async function readJson(
  response: Response,
  action: ProjectManagerAction,
  signal?: AbortSignal,
  invalidJsonMessage?: string,
): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw requestError(response.status, action, 'cancelled', 'Permintaan dibatalkan.');
    }
    throw requestError(
      response.status,
      action,
      'invalid-json',
      invalidJsonMessage ??
        (error instanceof Error ? error.message : 'Response is not valid JSON.'),
    );
  }
}

function malformedResponseError(
  status: number,
  action: ProjectManagerAction,
  error: unknown,
): ProjectManagerRequestError {
  return requestError(
    status,
    action,
    'malformed-response',
    error instanceof Error ? error.message : 'Malformed response.',
  );
}

function requestError(
  status: number | undefined,
  action: ProjectManagerAction,
  kind: ProjectManagerRequestErrorKind,
  message: string,
): ProjectManagerRequestError {
  return new ProjectManagerRequestError(status, action, kind, message);
}
