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
  ].map((file) => readFile(path.join(requireRoot, file), 'utf8')),
);

function createRuntime(pathname, html, options = {}) {
  const dom = new JSDOM(html, {
    url: `https://agentrouter.org${pathname}`,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });

  dom.window.console.info = () => {};
  dom.window.console.warn = () => {};
  dom.window.GM_xmlhttpRequest = (details) => {
    details.onload({
      status: 200,
      response: { ok: true, file: 'database/agentrouter/test.json' },
    });
  };
  dom.window.AgentRouterDashboardScanOptions = options;
  for (const source of sources) dom.window.eval(source);
  return dom;
}

describe('AgentRouter Dashboard require slice', () => {
  it('stores namespaced JSON and safely falls back when stored JSON is invalid', () => {
    const dom = createRuntime('/console/token', '<main></main>');
    const storage = dom.window.DhepilTampermonyet.storage.create({
      backend: dom.window.localStorage,
      prefix: 'test:',
    });

    expect(storage.write('dashboard', { balance: 12.5 })).toBe(true);
    expect(storage.key('dashboard')).toBe('test:dashboard');
    expect(storage.read('dashboard')).toEqual({ balance: 12.5 });

    dom.window.localStorage.setItem('test:broken', '{');
    expect(storage.read('broken', { safe: true })).toEqual({ safe: true });
  });

  it('rewrites one owner-checked log without changing the base storage contract', () => {
    const dom = createRuntime('/console/token', '<main></main>');
    const storage = dom.window.DhepilTampermonyet.storage.create({
      backend: dom.window.localStorage,
      prefix: 'test:',
    });
    const log = dom.window.DhepilTampermonyet.storageRewriteLog.create({
      storage,
      name: 'balance:last',
      readOwner: (entry) => entry.account,
    });

    expect(log.rewrite('User_A', { account: 'user_a', balance: 10 })).toBe(true);
    expect(log.rewrite('user_a', { account: 'USER_A', balance: 20 })).toBe(true);
    expect(log.read(' user_a ')).toEqual({ account: 'USER_A', balance: 20 });
    expect(log.read('user_b')).toBeNull();
    expect(log.rewrite('user_b', { account: 'user_a', balance: 30 })).toBe(false);
    expect(JSON.parse(dom.window.localStorage.getItem(log.key))).toEqual({
      account: 'USER_A',
      balance: 20,
    });
  });

  it('reads only the account name and Current balance', () => {
    const dom = createRuntime(
      '/console',
      `<main>
        <h2>👋Good evening，github_251501</h2>
        <section><span>Current balance</span><strong>$150.47</strong></section>
        <section><span>Consumption</span><strong>$199.53</strong></section>
      </main>`,
    );

    const result = dom.window.DhepilTampermonyet.agentRouterDashboard.scan(dom.window.document);

    expect(result.accountName).toBe('github_251501');
    expect(result.currentBalance.raw).toBe('$150.47');
    expect(result.currentBalance.value).toBe(150.47);
    expect(JSON.stringify(result)).not.toContain('199.53');
  });

  it('polls until Dashboard is ready and stops after the first successful scan', async () => {
    const dom = createRuntime('/console', '<main></main>', { pollInterval: 5, timeout: 100 });
    const dashboard = dom.window.DhepilTampermonyet.agentRouterDashboard;

    dashboard.start();
    const loadingPanel = dom.window.document.getElementById('tampermonyet-agentrouter-dashboard');
    expect(loadingPanel.shadowRoot.querySelector('[data-role="action"]').disabled).toBe(false);
    await new Promise((resolve) => dom.window.setTimeout(resolve, 8));
    dom.window.document.querySelector('main').innerHTML = `
      <h2>Good morning, delayed_account</h2>
      <section><span>Current balance</span><strong>$42.25</strong></section>
    `;
    await new Promise((resolve) => dom.window.setTimeout(resolve, 25));

    const saved = dashboard.readLast();
    expect(saved.page).toBe('dashboard');
    expect(saved.data.accountName).toBe('delayed_account');
    expect(saved.data.currentBalance.value).toBe(42.25);
    expect(JSON.parse(dom.window.localStorage.getItem(dashboard.storageKey))).toEqual(saved);

    dom.window.document.querySelector('strong').textContent = '$99.00';
    await new Promise((resolve) => dom.window.setTimeout(resolve, 20));
    const afterStop = dashboard.readLast();
    expect(afterStop.data.currentBalance.value).toBe(42.25);
    dashboard.stop();
  });

  it('renders the AgentRouter specification in shared Shadow DOM UI and refreshes on action', async () => {
    const dom = createRuntime(
      '/console',
      `<main>
        <h2>Good evening, ui_account</h2>
        <section><span>Current balance</span><strong>$18.75</strong></section>
      </main>`,
      { pollInterval: 5, timeout: 100 },
    );
    const dashboard = dom.window.DhepilTampermonyet.agentRouterDashboard;

    dashboard.start();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 5));

    const host = dom.window.document.getElementById('tampermonyet-agentrouter-dashboard');
    const shadow = host.shadowRoot;
    expect(shadow.querySelector('[data-role="title"]').textContent).toBe('AgentRouter Dashboard');
    expect(shadow.querySelector('[data-role="status-text"]').textContent).toBe(
      'JSON tersimpan: database/agentrouter/test.json',
    );
    expect(shadow.querySelector('[data-role="fields"]').textContent).toContain('ui_account');
    expect(shadow.querySelector('[data-role="fields"]').textContent).toContain('$18.75');

    dom.window.document.querySelector('strong').textContent = '$20.00';
    shadow.querySelector('[data-role="action"]').click();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 5));

    expect(dashboard.readLast().data.currentBalance.value).toBe(20);
    expect(shadow.querySelector('[data-role="fields"]').textContent).toContain('$20.00');
    dashboard.stop();
  });

  it('shows and rewrites the latest balance only for the account on the page', () => {
    const dom = createRuntime(
      '/console',
      `<main>
        <h2>Good evening, account_a</h2>
        <section><span>Current balance</span><strong>$10.00</strong></section>
      </main>`,
    );
    const dashboard = dom.window.DhepilTampermonyet.agentRouterDashboard;

    expect(dashboard.scanNow().data.currentBalance.value).toBe(10);
    const firstRaw = dom.window.localStorage.getItem(dashboard.storageKey);

    dom.window.document.querySelector('strong').textContent = '$25.00';
    expect(dashboard.scanNow().data.currentBalance.value).toBe(25);
    expect(dom.window.localStorage.length).toBe(2);
    expect(dom.window.localStorage.getItem(dashboard.storageKey)).not.toBe(firstRaw);
    expect(dashboard.readLast().data.currentBalance.value).toBe(25);

    dom.window.document.querySelector('h2').textContent = 'Good evening, account_b';
    expect(dashboard.readLast()).toBeNull();
    expect(dashboard.scanNow().data.accountName).toBe('account_b');
    expect(dashboard.readLast('account_a')).toBeNull();
    expect(dashboard.readLast('account_b').data.currentBalance.value).toBe(25);
    expect(
      dom.window.DhepilTampermonyet.agentRouterUserJson.read('account_a').dashboard.currentBalance
        .value,
    ).toBe(25);
    expect(
      dom.window.DhepilTampermonyet.agentRouterUserJson.read('account_b').dashboard.currentBalance
        .value,
    ).toBe(25);
    expect(dom.window.localStorage.length).toBe(3);
  });

  it('restarts after SPA navigation enters Dashboard and keeps a manual fallback', async () => {
    const dom = createRuntime('/console/token', '<main></main>', {
      pollInterval: 5,
      timeout: 100,
    });
    const dashboard = dom.window.DhepilTampermonyet.agentRouterDashboard;

    dashboard.start();
    expect(dom.window.localStorage.getItem(dashboard.storageKey)).toBeNull();
    expect(dom.window.document.getElementById('tampermonyet-agentrouter-dashboard')).toBeNull();

    dom.window.document.querySelector('main').innerHTML = `
      <h2>Good evening, spa_account</h2>
      <section><span>Current balance</span><strong>$11.50</strong></section>
    `;
    dom.window.history.pushState({}, '', '/console');
    await new Promise((resolve) => dom.window.setTimeout(resolve, 15));

    const saved = dashboard.readLast();
    expect(saved.data.accountName).toBe('spa_account');
    expect(dom.window.document.getElementById('tampermonyet-agentrouter-dashboard')).not.toBeNull();
    expect(dashboard.scanNow().data.currentBalance.value).toBe(11.5);
    dashboard.stop();
  });

  it('keeps one installable AgentRouter loader scoped to migrated modules', async () => {
    const loader = await readFile(
      path.join(requireRoot, 'agentrouter', 'agent.router.user.js'),
      'utf8',
    );

    expect(loader).toContain('/require/shared/dom.js?v=0.1.0');
    expect(loader).toContain('/require/shared/polling.js?v=0.1.0');
    expect(loader).toContain('/require/shared/storage.js?v=0.1.0');
    expect(loader).toContain('/require/shared/storageRewriteLog.js?v=0.1.0');
    expect(loader).toContain('/require/shared/downloader.js?v=0.2.0');
    expect(loader).toContain('/require/shared/ui.js?v=0.1.0');
    expect(loader).toContain('/require/agentrouter/account.js?v=0.1.0');
    expect(loader).toContain('/require/agentrouter/userJson.js?v=0.1.0');
    expect(loader).toContain('/require/agentrouter/dashboard.js?v=0.6.0');
    expect(loader).toContain('/require/agentrouter/token.js?v=0.2.0');
    expect(loader).toContain('/require/agentrouter/usageLog.js?v=0.1.0');
    expect(loader).toContain('// @connect      127.0.0.1');
    expect(loader).toContain('// @grant        GM_xmlhttpRequest');
    expect(loader).not.toContain('// @grant        none');
    expect(loader).not.toContain('/require/agentrouter/shared/');
    expect(loader).not.toContain('dashboard-runner.js');
    expect(loader).not.toContain('/agentrouter/pages/');
    expect(loader).not.toContain('/pages/usage-log.js');
  });
});
