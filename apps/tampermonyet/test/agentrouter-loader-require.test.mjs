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
    'agentrouter/dashboard.js',
    'agentrouter/token.js',
    'agentrouter/usageLog.js',
    'agentrouter/agent.router.user.js',
  ].map((file) => readFile(path.join(requireRoot, file), 'utf8')),
);

function tokenPage() {
  return `
    <header><button><span>Ggithub_loader</span></button></header>
    <main><table role="grid">
      <thead><tr><th>Name</th><th>Key</th></tr></thead>
      <tbody><tr><td>me</td><td><input value="sk-LOADERREAL01"></td></tr></tbody>
    </table></main>
  `;
}

describe('AgentRouter combined userscript loader', () => {
  it('activates only the matching page module across SPA navigation', async () => {
    const dom = new JSDOM(tokenPage(), {
      url: 'https://agentrouter.org/console/token',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    dom.window.console.info = () => {};
    dom.window.console.warn = () => {};
    dom.window.GM_xmlhttpRequest = (details) => {
      details.onload({
        status: 200,
        response: { ok: true, file: 'database/agentrouter/github_loader.json' },
      });
    };

    for (const source of sources) dom.window.eval(source);

    expect(dom.window.document.getElementById('tampermonyet-agentrouter-token')).not.toBeNull();
    expect(dom.window.document.getElementById('tampermonyet-agentrouter-dashboard')).toBeNull();
    expect(dom.window.document.getElementById('tampermonyet-agentrouter-usage-log')).toBeNull();

    dom.window.document.body.innerHTML = `
      <main>
        <h2>Good evening，github_loader</h2>
        <section><span>Current balance</span><strong>$33.25</strong></section>
      </main>
    `;
    dom.window.history.pushState({}, '', '/console');
    await new Promise((resolve) => dom.window.setTimeout(resolve, 5));

    expect(dom.window.document.getElementById('tampermonyet-agentrouter-token')).toBeNull();
    expect(dom.window.document.getElementById('tampermonyet-agentrouter-dashboard')).not.toBeNull();
    expect(
      dom.window.DhepilTampermonyet.agentRouterDashboard.readLast().data.currentBalance.value,
    ).toBe(33.25);

    dom.window.document.body.innerHTML = `
      <header><button><span>Ggithub_loader</span></button></header>
      <main><table role="grid">
        <thead><tr><th>Time</th><th>Type</th><th>Details</th></tr></thead>
        <tbody><tr><td>2026-08-04 00:28:53</td><td>System</td><td>原始日志</td></tr></tbody>
      </table></main>
    `;
    dom.window.history.pushState({}, '', '/console/log');
    await new Promise((resolve) => dom.window.setTimeout(resolve, 5));

    expect(dom.window.document.getElementById('tampermonyet-agentrouter-dashboard')).toBeNull();
    expect(dom.window.document.getElementById('tampermonyet-agentrouter-usage-log')).not.toBeNull();
    expect(
      dom.window.DhepilTampermonyet.agentRouterUsageLog.readLast().data.entries[0].details,
    ).toBe('原始日志');

    dom.window.DhepilTampermonyet.agentRouterDashboard.stop();
    dom.window.DhepilTampermonyet.agentRouterToken.stop();
    dom.window.DhepilTampermonyet.agentRouterUsageLog.stop();
  });
});
