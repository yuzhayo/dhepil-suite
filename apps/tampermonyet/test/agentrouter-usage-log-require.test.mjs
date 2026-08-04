import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireRoot = path.join(appRoot, 'public', 'require');

const sources = await Promise.all(
  [
    'shared/dom.js',
    'shared/polling.js',
    'shared/storage.js',
    'shared/storageRewriteLog.js',
    'shared/downloader.js',
    'shared/ui.js',
    'agentrouter/account.js',
    'agentrouter/userJson.js',
    'agentrouter/usageLog.js',
  ].map((file) => readFile(path.join(requireRoot, file), 'utf8')),
);

function usageRow({ time, type, details, model = '', prompt = '' }) {
  return `
    <tr>
      <td>${time}</td><td>token</td><td>default</td><td>${type}</td><td>${model}</td>
      <td>0.10</td><td>${prompt}</td><td>7</td><td>$0.01</td><td>127.0.0.1</td>
      <td>${details}</td>
    </tr>
  `;
}

function usagePage(accountName, rows) {
  return `
    <header><button type="button"><span>G${accountName}</span></button></header>
    <main>
      <button type="button">Query</button>
      <button type="button">Column settings</button>
      <table role="grid">
        <thead><tr>
          <th>Time</th><th>Tokens</th><th>Group</th><th>Type</th><th>Model</th>
          <th>Time/first word</th><th>Prompt</th><th>Completion</th><th>Spend</th>
          <th>IP</th><th>Details</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </main>
  `;
}

function createRuntime(pathname, html, options = {}) {
  const dom = new JSDOM(html, {
    url: `https://agentrouter.org${pathname}`,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });

  dom.window.console.info = () => {};
  dom.window.console.warn = () => {};
  dom.window.AgentRouterDatabaseWrites = [];
  dom.window.GM_xmlhttpRequest = (details) => {
    dom.window.AgentRouterDatabaseWrites.push(JSON.parse(details.data));
    details.onload({
      status: 200,
      response: { ok: true, file: 'database/agentrouter/test.json' },
    });
  };
  dom.window.AgentRouterUsageLogScanOptions = options;
  for (const source of sources) dom.window.eval(source);
  return dom;
}

describe('AgentRouter Usage Log require slice', () => {
  it('reads only exact System rows and preserves displayed Time and Details text', () => {
    const originalDetails = '每日签到成功，增加额度 $ 25.000000额度';
    const dom = createRuntime(
      '/console/log',
      usagePage(
        'github_usage',
        usageRow({
          time: '2026-08-04 00:28:53',
          type: 'System',
          details: originalDetails,
          model: 'must-not-be-stored',
          prompt: 'must-not-be-stored',
        }) +
          usageRow({
            time: '2026-08-04 00:30:00',
            type: 'Chat',
            details: 'chat-row-must-not-be-stored',
          }) +
          usageRow({
            time: '2026-08-04 00:31:00',
            type: 'System Event',
            details: 'partial-match-must-not-be-stored',
          }),
      ),
    );

    const data = dom.window.DhepilTampermonyet.agentRouterUsageLog.scan(dom.window.document);

    expect(data).toEqual({
      accountName: 'github_usage',
      entries: [
        {
          time: '2026-08-04 00:28:53',
          type: 'System',
          details: originalDetails,
        },
      ],
    });
    expect(JSON.stringify(data)).not.toContain('must-not-be-stored');
    expect(JSON.stringify(data)).not.toContain('chat-row-must-not-be-stored');
    expect(JSON.stringify(data)).not.toContain('partial-match-must-not-be-stored');
  });

  it('keeps polling an unfinished empty table but accepts an explicit empty result', () => {
    const dom = createRuntime('/console/log', usagePage('github_empty', ''));
    const usageLog = dom.window.DhepilTampermonyet.agentRouterUsageLog;

    expect(usageLog.scan(dom.window.document)).toBeNull();

    const emptyState = dom.window.document.createElement('div');
    emptyState.textContent = 'No results found';
    dom.window.document.querySelector('main').append(emptyState);

    expect(usageLog.scan(dom.window.document)).toEqual({
      accountName: 'github_empty',
      entries: [],
    });
  });

  it('rewrites the latest Usage Log snapshot and merges it into the matching user JSON', () => {
    const dom = createRuntime(
      '/console/log',
      usagePage(
        'github_usage_a',
        usageRow({
          time: '2026-08-04 00:28:53',
          type: 'System',
          details: '原始详情 A',
        }),
      ),
    );
    const usageLog = dom.window.DhepilTampermonyet.agentRouterUsageLog;

    usageLog.start();
    expect(usageLog.readLast().data.entries[0].details).toBe('原始详情 A');

    const cells = dom.window.document.querySelectorAll('tbody td');
    cells[0].textContent = '2026-08-04 00:29:53';
    cells[10].textContent = '原始详情 B';
    usageLog.start();

    expect(usageLog.readLast().data.entries).toEqual([
      {
        time: '2026-08-04 00:29:53',
        type: 'System',
        details: '原始详情 B',
      },
    ]);
    expect(
      dom.window.DhepilTampermonyet.agentRouterUserJson.read('github_usage_a').usageLog.entries[0]
        .details,
    ).toBe('原始详情 B');
    expect(dom.window.localStorage.length).toBe(2);

    dom.window.document.querySelector('header span').textContent = 'Ggithub_usage_b';
    expect(usageLog.readLast()).toBeNull();
    usageLog.start();
    expect(usageLog.readLast('github_usage_a')).toBeNull();
    expect(usageLog.readLast('github_usage_b').data.accountName).toBe('github_usage_b');
    usageLog.stop();
  });

  it('clears Usage Log data, disables auto scan, and resumes when checked again', async () => {
    const dom = createRuntime(
      '/console/log',
      usagePage(
        'github_usage_clear',
        usageRow({
          time: '2026-08-04 00:28:53',
          type: 'System',
          details: '保持原文',
        }),
      ),
      { pollInterval: 5, timeout: 100 },
    );
    const usageLog = dom.window.DhepilTampermonyet.agentRouterUsageLog;

    usageLog.start();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 5));

    const shadow = dom.window.document.getElementById(
      'tampermonyet-agentrouter-usage-log',
    ).shadowRoot;
    const autoScan = shadow.querySelector('[data-role="auto-scan"]');
    expect(autoScan.checked).toBe(true);

    shadow.querySelector('[data-role="secondary-action"]').click();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    expect(autoScan.checked).toBe(false);
    expect(usageLog.isAutoScanEnabled()).toBe(false);
    expect(JSON.parse(dom.window.localStorage.getItem(usageLog.autoScanStorageKey))).toBe(false);
    expect(usageLog.readLast()).toBeNull();
    expect(
      dom.window.DhepilTampermonyet.agentRouterUserJson.read('github_usage_clear').usageLog,
    ).toBeNull();
    expect(dom.window.AgentRouterDatabaseWrites.at(-1).value.usageLog).toBeNull();

    autoScan.checked = true;
    autoScan.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 5));

    expect(usageLog.isAutoScanEnabled()).toBe(true);
    expect(usageLog.readLast().data.entries).toHaveLength(1);
    usageLog.stop();
  });

  it('automatically clears stale Usage Log data when its grid stays missing', async () => {
    const dom = createRuntime(
      '/console/log',
      usagePage(
        'github_usage_missing',
        usageRow({
          time: '2026-08-04 00:28:53',
          type: 'System',
          details: '保持原文',
        }),
      ),
      { pollInterval: 5, timeout: 100 },
    );
    const usageLog = dom.window.DhepilTampermonyet.agentRouterUsageLog;

    usageLog.start();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 5));
    expect(usageLog.readLast().data.entries).toHaveLength(1);

    dom.window.document.querySelector('tbody').replaceChildren();
    usageLog.activate();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 15));
    expect(usageLog.readLast().data.entries).toHaveLength(1);

    dom.window.document.querySelector('table').remove();
    for (const button of dom.window.document.querySelectorAll('main > button')) button.remove();
    usageLog.activate();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 15));
    expect(usageLog.readLast().data.entries).toHaveLength(1);

    dom.window.document.querySelector('main').setAttribute('aria-busy', 'true');
    dom.window.document
      .querySelector('main')
      .insertAdjacentHTML('afterbegin', '<button>Query</button><button>Column settings</button>');
    usageLog.activate();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 15));
    expect(usageLog.readLast().data.entries).toHaveLength(1);

    dom.window.document.querySelector('main').removeAttribute('aria-busy');
    await new Promise((resolve) => dom.window.setTimeout(resolve, 10));

    const shadow = dom.window.document.getElementById(
      'tampermonyet-agentrouter-usage-log',
    ).shadowRoot;
    expect(usageLog.readLast()).toBeNull();
    expect(usageLog.isAutoScanEnabled()).toBe(true);
    expect(
      dom.window.DhepilTampermonyet.agentRouterUserJson.read('github_usage_missing').usageLog,
    ).toBeNull();
    expect(dom.window.AgentRouterDatabaseWrites.at(-1).value.usageLog).toBeNull();
    expect(shadow.querySelector('[data-role="status-text"]').textContent).toContain(
      'Elemen Usage Log tidak ditemukan; log dibersihkan',
    );
    usageLog.stop();
  });

  it('starts after SPA navigation and keeps the shared manual scan UI', async () => {
    const dom = createRuntime('/console/token', '<main></main>', {
      pollInterval: 5,
      timeout: 100,
    });
    const usageLog = dom.window.DhepilTampermonyet.agentRouterUsageLog;

    usageLog.start();
    expect(dom.window.document.getElementById('tampermonyet-agentrouter-usage-log')).toBeNull();

    dom.window.document.body.innerHTML = usagePage(
      'github_usage_spa',
      usageRow({
        time: '2026-08-04 00:28:53',
        type: 'System',
        details: '保持原文',
      }),
    );
    dom.window.history.pushState({}, '', '/console/log');
    await new Promise((resolve) => dom.window.setTimeout(resolve, 10));

    const host = dom.window.document.getElementById('tampermonyet-agentrouter-usage-log');
    const shadow = host.shadowRoot;
    expect(shadow.querySelector('[data-role="title"]').textContent).toBe('AgentRouter Usage Log');
    expect(shadow.querySelector('[data-role="fields"]').textContent).toContain('1 tersimpan');
    expect(shadow.querySelector('[data-role="fields"]').textContent).toContain(
      '2026-08-04 00:28:53',
    );

    dom.window.document.querySelector('tbody td:last-child').textContent = '更新后的原文';
    shadow.querySelector('[data-role="action"]').click();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 5));
    expect(usageLog.readLast().data.entries[0].details).toBe('更新后的原文');
    usageLog.stop();
  });
});
