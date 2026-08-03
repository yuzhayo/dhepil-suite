import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireRoot = path.join(appRoot, 'public', 'require');
const sources = await Promise.all(
  [
    'shared/dom.js',
    'shared/storage.js',
    'shared/downloader.js',
    'agentrouter/account.js',
    'agentrouter/userJson.js',
  ].map((file) => readFile(path.join(requireRoot, file), 'utf8')),
);

describe('AgentRouter complete per-user JSON', () => {
  it('merges Dashboard, real Token, and Usage Log data into one user JSON', async () => {
    const dom = new JSDOM(
      '<header><button><span>Ggithub_complete</span></button></header><main></main>',
      {
        url: 'https://agentrouter.org/console',
        runScripts: 'outside-only',
      },
    );
    const request = vi.fn((details) => {
      details.onload({
        status: 200,
        response: {
          ok: true,
          file: 'database/agentrouter/github_complete.json',
        },
      });
    });
    dom.window.GM_xmlhttpRequest = request;
    for (const source of sources) dom.window.eval(source);

    const userJson = dom.window.DhepilTampermonyet.agentRouterUserJson;
    userJson.update({
      version: 1,
      page: 'dashboard',
      pathname: '/console',
      capturedAt: '2026-08-04T01:00:00.000Z',
      data: {
        accountName: 'github_complete',
        currentBalance: { raw: '$25.00', value: 25 },
      },
    });
    userJson.update({
      version: 2,
      page: 'token',
      pathname: '/console/token',
      capturedAt: '2026-08-04T01:01:00.000Z',
      data: {
        accountName: 'github_complete',
        tokens: [{ name: 'primary', key: 'sk-COMPLETEREALKEY' }],
      },
    });
    const complete = userJson.update({
      version: 1,
      page: 'usageLog',
      pathname: '/console/log',
      capturedAt: '2026-08-04T01:02:00.000Z',
      data: {
        accountName: 'github_complete',
        entries: [
          {
            time: '2026-08-04 00:28:53',
            type: 'System',
            details: '每日签到成功，增加额度 $ 25.000000额度',
          },
        ],
      },
    });

    expect(complete.dashboard.currentBalance.value).toBe(25);
    expect(complete.token.tokens[0].key).toBe('sk-COMPLETEREALKEY');
    expect(complete.usageLog.entries[0].details).toBe('每日签到成功，增加额度 $ 25.000000额度');
    expect(
      JSON.parse(dom.window.localStorage.getItem(userJson.storageKey('github_complete'))),
    ).toEqual(complete);

    await expect(userJson.save(complete)).resolves.toEqual({
      ok: true,
      file: 'database/agentrouter/github_complete.json',
    });
    expect(request).toHaveBeenCalledOnce();
    const [details] = request.mock.calls[0];
    expect(details.url).toBe('http://127.0.0.1:2003/api/database/agentrouter');
    expect(details.method).toBe('POST');
    expect(details.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(details.data)).toEqual({
      owner: 'github_complete',
      value: complete,
    });
  });
});
