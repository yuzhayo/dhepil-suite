import { parseActionResponse, parseProjectsResponse } from './projectManagerResponse';

function validProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'proj-1',
    name: 'Project One',
    description: 'desc',
    relativePath: './proj-1',
    status: 'stopped',
    managed: true,
    logs: [],
    desktop: { enabled: false, script: '' },
    ...overrides,
  };
}

describe('parseProjectsResponse', () => {
  it('parses a valid list', () => {
    const result = parseProjectsResponse({ projects: [validProject()] });
    expect(result).toEqual([
      {
        id: 'proj-1',
        name: 'Project One',
        description: 'desc',
        relativePath: './proj-1',
        status: 'stopped',
        managed: true,
        logs: [],
        desktop: { enabled: false, script: '' },
      },
    ]);
  });

  it('includes optional fields when present', () => {
    const result = parseProjectsResponse({
      projects: [validProject({ port: 3000, url: 'http://x', pid: 42, error: 'boom' })],
    });
    expect(result[0]).toMatchObject({ port: 3000, url: 'http://x', pid: 42, error: 'boom' });
  });

  it('rejects a non-object root', () => {
    expect(() => parseProjectsResponse(null)).toThrow('Response is not an object.');
    expect(() => parseProjectsResponse('nope')).toThrow('Response is not an object.');
  });

  it('rejects a response missing projects array', () => {
    expect(() => parseProjectsResponse({})).toThrow('Response missing projects array.');
  });

  it('rejects an item missing required fields', () => {
    const missingName = validProject();
    delete (missingName as Record<string, unknown>).name;
    expect(() => parseProjectsResponse({ projects: [missingName] })).toThrow(
      'Item 0 missing string name.',
    );
  });

  it('rejects an item with wrong field types', () => {
    expect(() => parseProjectsResponse({ projects: [validProject({ managed: 'yes' })] })).toThrow(
      'Item 0 missing boolean managed.',
    );
  });

  it('rejects an item with invalid status', () => {
    expect(() => parseProjectsResponse({ projects: [validProject({ status: 'bogus' })] })).toThrow(
      'Item 0 has invalid status.',
    );
  });

  it('rejects an item with malformed desktop', () => {
    expect(() =>
      parseProjectsResponse({ projects: [validProject({ desktop: { enabled: false } })] }),
    ).toThrow('Item 0 desktop.script is not string.');
  });
});

describe('parseActionResponse', () => {
  it('parses an empty object', () => {
    expect(parseActionResponse({})).toEqual({});
  });

  it('parses an object with a string error', () => {
    expect(parseActionResponse({ error: 'boom' })).toEqual({ error: 'boom' });
  });

  it('rejects a non-object root', () => {
    expect(() => parseActionResponse(null)).toThrow('Response is not an object.');
  });

  it('rejects a non-string error field', () => {
    expect(() => parseActionResponse({ error: 42 })).toThrow(
      'Response error field is not a string.',
    );
  });
});
