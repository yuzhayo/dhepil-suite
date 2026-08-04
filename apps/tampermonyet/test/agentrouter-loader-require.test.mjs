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
    'shared/uiSection.js',
    'shared/ui.js',
    'agentrouter/account.js',
    'agentrouter/userJson.js',
    'agentrouter/controller.js',
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
  it('keeps one stacked panel while the active scanner follows SPA navigation', async () => {
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
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    const host = dom.window.document.getElementById('tampermonyet-agentrouter');
    const shadow = host.shadowRoot;
    expect(host).not.toBeNull();
    expect(shadow.querySelector('[data-role="title"]').textContent).toBe(
      'AgentRouter · github_loader',
    );
    expect(shadow.querySelector('[data-role="status-text"]').textContent).toBe('Saved');
    expect(shadow.querySelector('[data-role="path"]').textContent).toBe(
      'database/agentrouter/github_loader.json',
    );
    expect(shadow.querySelector('.panel-header').children).toHaveLength(3);
    expect(shadow.querySelectorAll('[data-section-id]')).toHaveLength(3);
    expect(shadow.querySelector('[data-section-id="dashboard"]').textContent).toContain('No data');
    expect(shadow.querySelector('[data-section-id="token"]').textContent).toContain('1 saved');
    expect(shadow.querySelector('[data-section-id="token"]').textContent).toContain(
      'sk-LOAD********AL01',
    );
    expect(shadow.querySelector('[data-section-id="token"]').textContent).not.toContain(
      'sk-LOADERREAL01',
    );
    expect(shadow.querySelector('[data-section-id="token"]').dataset.active).toBe('true');
    expect(shadow.querySelector('[data-role="action"]').textContent).toBe('Scan API Token');

    dom.window.document.body.innerHTML = `
      <main>
        <h2>Good evening，github_loader</h2>
        <section><span>Current balance</span><strong>$33.25</strong></section>
        <section><span>Consumption</span><strong>$11.75</strong></section>
      </main>
    `;
    dom.window.history.pushState({}, '', '/console');
    await new Promise((resolve) => dom.window.setTimeout(resolve, 5));

    expect(dom.window.document.getElementById('tampermonyet-agentrouter')).toBe(host);
    expect(shadow.querySelector('[data-section-id="dashboard"]').dataset.active).toBe('true');
    expect(shadow.querySelector('[data-section-id="dashboard"]').textContent).toContain('$33.25');
    expect(shadow.querySelector('[data-section-id="dashboard"]').textContent).toContain('$11.75');
    expect(shadow.querySelector('[data-section-id="dashboard"]').textContent).not.toContain(
      'Diperbarui',
    );
    expect(shadow.querySelector('[data-section-id="token"]').textContent).toContain('1 saved');
    expect(shadow.querySelector('[data-role="action"]').textContent).toBe('Scan Dashboard');
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

    expect(dom.window.document.getElementById('tampermonyet-agentrouter')).toBe(host);
    expect(shadow.querySelector('[data-section-id="usageLog"]').dataset.active).toBe('true');
    expect(shadow.querySelector('[data-section-id="usageLog"]').textContent).toContain(
      '2026-08-04 00:28:53',
    );
    expect(shadow.querySelector('[data-role="action"]').textContent).toBe('Scan Usage Log');
    expect(
      dom.window.DhepilTampermonyet.agentRouterUsageLog.readLast().data.entries[0].details,
    ).toBe('原始日志');

    dom.window.DhepilTampermonyet.agentRouterController.stop();
  });

  it('uses one persisted Auto scan state and clears only the active section', async () => {
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
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    const controller = dom.window.DhepilTampermonyet.agentRouterController;
    const shadow = dom.window.document.getElementById('tampermonyet-agentrouter').shadowRoot;
    const autoScan = shadow.querySelector('[data-role="auto-scan"]');
    expect(autoScan.checked).toBe(true);

    shadow.querySelector('[data-role="secondary-action"]').click();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    expect(autoScan.checked).toBe(false);
    expect(controller.isAutoScanEnabled()).toBe(false);
    expect(JSON.parse(dom.window.localStorage.getItem(controller.autoScanStorageKey))).toBe(false);
    expect(
      dom.window.DhepilTampermonyet.agentRouterUserJson.read('github_loader').token,
    ).toBeNull();
    expect(shadow.querySelector('[data-section-id="token"]').textContent).toContain('No data');

    dom.window.document.body.innerHTML = `
      <main>
        <h2>Good evening，github_loader</h2>
        <section><span>Current balance</span><strong>$44.00</strong></section>
      </main>
    `;
    dom.window.history.pushState({}, '', '/console');
    await new Promise((resolve) => dom.window.setTimeout(resolve, 5));

    expect(autoScan.checked).toBe(false);
    expect(dom.window.DhepilTampermonyet.agentRouterDashboard.readLast()).toBeNull();
    shadow.querySelector('[data-role="action"]').click();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
    expect(
      dom.window.DhepilTampermonyet.agentRouterDashboard.readLast().data.currentBalance.value,
    ).toBe(44);
    expect(autoScan.checked).toBe(false);
    controller.stop();
  });
});
