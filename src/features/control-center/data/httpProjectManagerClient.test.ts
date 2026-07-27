import { httpProjectManagerClient } from './httpProjectManagerClient';
import { ProjectManagerRequestError } from './projectManagerResponse';

function mockResponse(options: {
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
}): Response {
  return {
    ok: options.ok,
    status: options.status,
    json: options.json ?? (async () => ({})),
  } as unknown as Response;
}

function validProject() {
  return {
    id: 'proj-1',
    name: 'Project One',
    description: 'desc',
    relativePath: './proj-1',
    status: 'stopped',
    managed: true,
    logs: [],
    desktop: { enabled: false, script: '' },
  };
}

describe('httpProjectManagerClient.list', () => {
  it('sends GET /api/projects with Accept header and returns validated projects', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        mockResponse({ ok: true, status: 200, json: async () => ({ projects: [validProject()] }) }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = httpProjectManagerClient();
    const result = await client.list();

    expect(fetchMock).toHaveBeenCalledWith('/api/projects', {
      headers: { Accept: 'application/json' },
    });
    expect(result).toEqual([validProject()]);

    vi.unstubAllGlobals();
  });

  it('forwards the AbortSignal to fetch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        mockResponse({ ok: true, status: 200, json: async () => ({ projects: [] }) }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const client = httpProjectManagerClient();
    await client.list(controller.signal);

    expect(fetchMock).toHaveBeenCalledWith('/api/projects', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    vi.unstubAllGlobals();
  });

  it('rejects with a cancellation classification when the in-flight request is aborted', async () => {
    const fetchMock = vi.fn().mockImplementation((_input: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted.');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const client = httpProjectManagerClient();
    const pending = client.list(controller.signal);
    controller.abort();

    await expect(pending).rejects.toMatchObject({
      action: 'list',
      kind: 'cancelled',
    });

    vi.unstubAllGlobals();
  });

  it('classifies an abort while reading the response body as cancellation', async () => {
    const controller = new AbortController();
    let bodyReadStarted!: () => void;
    const bodyStarted = new Promise<void>((resolve) => {
      bodyReadStarted = resolve;
    });
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        json: () =>
          new Promise((_resolve, reject) => {
            bodyReadStarted();
            controller.signal.addEventListener(
              'abort',
              () => {
                const abortError = new Error('The response body was aborted.');
                abortError.name = 'AbortError';
                reject(abortError);
              },
              { once: true },
            );
          }),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = httpProjectManagerClient();
    const pending = client.list(controller.signal);
    await bodyStarted;
    controller.abort();

    await expect(pending).rejects.toMatchObject({
      status: 200,
      action: 'list',
      kind: 'cancelled',
      message: 'Permintaan dibatalkan.',
    });

    vi.unstubAllGlobals();
  });

  it('uses the aborted signal when fetch rejects with a custom abort reason', async () => {
    const fetchMock = vi.fn().mockImplementation((_input: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), {
          once: true,
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const client = httpProjectManagerClient();
    const pending = client.list(controller.signal);
    controller.abort('superseded');

    await expect(pending).rejects.toMatchObject({
      action: 'list',
      kind: 'cancelled',
      message: 'Permintaan dibatalkan.',
    });

    vi.unstubAllGlobals();
  });

  it('leaves an already-resolved result unchanged when the signal is aborted afterwards', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        mockResponse({ ok: true, status: 200, json: async () => ({ projects: [validProject()] }) }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const client = httpProjectManagerClient();
    const result = await client.list(controller.signal);
    controller.abort();

    expect(result).toEqual([validProject()]);

    vi.unstubAllGlobals();
  });

  it('throws ProjectManagerRequestError on HTTP error status without reading its body', async () => {
    const json = vi.fn(async () => ({}));
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ ok: false, status: 500, json }));
    vi.stubGlobal('fetch', fetchMock);

    const client = httpProjectManagerClient();
    await expect(client.list()).rejects.toMatchObject({
      status: 500,
      action: 'list',
      message: 'Gagal membaca status project (500).',
    });
    expect(json).not.toHaveBeenCalled();
    await expect(client.list()).rejects.toBeInstanceOf(ProjectManagerRequestError);

    vi.unstubAllGlobals();
  });

  it('throws ProjectManagerRequestError on non-JSON response body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = httpProjectManagerClient();
    await expect(client.list()).rejects.toMatchObject({
      status: 200,
      action: 'list',
    });

    vi.unstubAllGlobals();
  });

  it('throws ProjectManagerRequestError on malformed JSON payload shape', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockResponse({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);

    const client = httpProjectManagerClient();
    await expect(client.list()).rejects.toMatchObject({
      status: 200,
      action: 'list',
      message: 'Response missing projects array.',
    });

    vi.unstubAllGlobals();
  });
});

describe('httpProjectManagerClient.start', () => {
  it('sends POST /api/projects/:id/start with Accept header', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockResponse({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);

    const client = httpProjectManagerClient();
    await client.start('proj-1');

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/proj-1/start', {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });

    vi.unstubAllGlobals();
  });

  it('forwards the AbortSignal to fetch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockResponse({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const client = httpProjectManagerClient();
    await client.start('proj-1', controller.signal);

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/proj-1/start', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    vi.unstubAllGlobals();
  });

  it('prefers payload error message over generic message on HTTP error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        mockResponse({ ok: false, status: 409, json: async () => ({ error: 'port taken' }) }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = httpProjectManagerClient();
    await expect(client.start('proj-1')).rejects.toMatchObject({
      status: 409,
      action: 'start',
      message: 'port taken',
    });

    vi.unstubAllGlobals();
  });

  it('falls back to generic message when HTTP error payload has no error field', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockResponse({ ok: false, status: 500, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);

    const client = httpProjectManagerClient();
    await expect(client.start('proj-1')).rejects.toMatchObject({
      status: 500,
      action: 'start',
      message: 'Aksi start gagal.',
    });

    vi.unstubAllGlobals();
  });

  it.each(['start', 'stop'] as const)(
    'uses a safe fallback for a non-JSON HTTP error during %s',
    async (action) => {
      const fetchMock = vi.fn().mockResolvedValue(
        mockResponse({
          ok: false,
          status: 502,
          json: async () => {
            throw new SyntaxError('Unexpected token < in JSON');
          },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const client = httpProjectManagerClient();
      await expect(client[action]('proj-1')).rejects.toMatchObject({
        status: 502,
        action,
        kind: 'invalid-json',
        message: `Aksi ${action} gagal.`,
      });

      vi.unstubAllGlobals();
    },
  );
});

describe('httpProjectManagerClient.stop', () => {
  it('sends POST /api/projects/:id/stop with Accept header', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockResponse({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);

    const client = httpProjectManagerClient();
    await client.stop('proj-1');

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/proj-1/stop', {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });

    vi.unstubAllGlobals();
  });

  it('forwards the AbortSignal to fetch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockResponse({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const client = httpProjectManagerClient();
    await client.stop('proj-1', controller.signal);

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/proj-1/stop', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    vi.unstubAllGlobals();
  });

  it('rejects with a cancellation classification when the in-flight request is aborted', async () => {
    const fetchMock = vi.fn().mockImplementation((_input: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted.');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const client = httpProjectManagerClient();
    const pending = client.stop('proj-1', controller.signal);
    controller.abort();

    await expect(pending).rejects.toMatchObject({
      action: 'stop',
      kind: 'cancelled',
    });

    vi.unstubAllGlobals();
  });
});
