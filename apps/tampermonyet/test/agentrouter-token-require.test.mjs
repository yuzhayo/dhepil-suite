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
    'agentrouter/token.js',
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
  dom.window.AgentRouterTokenScanOptions = options;
  for (const source of sources) dom.window.eval(source);
  return dom;
}

function tokenPage(accountName, rows) {
  return `
    <header><button type="button"><span>G${accountName}</span></button></header>
    <main><table role="grid">
      <thead><tr>
        <th></th><th>Name</th><th>Status</th><th>Group</th><th>Key</th>
        <th>Available models</th><th>IP restrictions</th><th>Creation Time</th>
        <th>Expiration time</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></main>
  `;
}

function tokenRow({ name, key, withVisibility = false }) {
  return `<tr>
    <td></td><td>${name}</td><td>Enabled Unlimited quota</td><td>default</td>
    <td><input type="text" value="${key}">
      ${withVisibility ? '<button aria-label="toggle token visibility">eye</button>' : ''}
    </td>
    <td>Unlimited</td><td>Unlimited</td><td>2026-08-03 02:10:51</td><td>Never expires</td>
  </tr>`;
}

function installRevealBehavior(dom, realKeys) {
  const buttons = [
    ...dom.window.document.querySelectorAll('button[aria-label="toggle token visibility"]'),
  ];
  buttons.forEach((button, index) => {
    const input = button.parentElement.querySelector('input');
    const maskedKey = input.value;
    let revealed = false;
    button.addEventListener('click', () => {
      revealed = !revealed;
      input.value = revealed ? realKeys[index] : maskedKey;
    });
  });
}

describe('AgentRouter Token require slice', () => {
  it('reveals real keys, reads complete row metadata, then restores masking', async () => {
    const firstRealKey = 'sk-FIRSTREALKEY123456789';
    const secondRealKey = 'sk-SECONDREALKEY123456789';
    const dom = createRuntime(
      '/console/token',
      tokenPage(
        'github_258594',
        tokenRow({ name: 'primary', key: 'sk-FIRS**********6789', withVisibility: true }) +
          tokenRow({ name: 'already-open', key: secondRealKey }),
      ),
      { pollInterval: 5, timeout: 100 },
    );
    installRevealBehavior(dom, [firstRealKey]);
    const token = dom.window.DhepilTampermonyet.agentRouterToken;

    expect(token.scan(dom.window.document)).toBeNull();
    const data = token.scan(dom.window.document);
    expect(data.accountName).toBe('github_258594');
    expect(data.tokens).toEqual([
      {
        name: 'primary',
        status: 'Enabled Unlimited quota',
        group: 'default',
        key: firstRealKey,
        availableModels: 'Unlimited',
        ipRestrictions: 'Unlimited',
        creationTime: '2026-08-03 02:10:51',
        expirationTime: 'Never expires',
      },
      expect.objectContaining({ name: 'already-open', key: secondRealKey }),
    ]);
    expect(dom.window.document.querySelector('input').value).toBe('sk-FIRS**********6789');

    token.start();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 15));
    expect(token.readLast().data.tokens.map((entry) => entry.key)).toEqual([
      firstRealKey,
      secondRealKey,
    ]);
    expect(
      dom.window.DhepilTampermonyet.agentRouterUserJson
        .read('github_258594')
        .token.tokens.map((entry) => entry.key),
    ).toEqual([firstRealKey, secondRealKey]);
    expect(dom.window.localStorage.length).toBe(2);
    token.stop();
  });

  it('rewrites one Token log while retaining separate complete JSON per account', () => {
    const dom = createRuntime(
      '/console/token',
      tokenPage('github_account_a', tokenRow({ name: 'me', key: 'sk-ACCOUNTAREAL01' })),
    );
    const token = dom.window.DhepilTampermonyet.agentRouterToken;

    token.start();
    expect(token.readLast().data.tokens[0].key).toBe('sk-ACCOUNTAREAL01');
    dom.window.document.querySelector('input').value = 'sk-ACCOUNTAREAL02';
    token.start();
    expect(token.readLast().data.tokens[0].key).toBe('sk-ACCOUNTAREAL02');
    expect(dom.window.localStorage.length).toBe(2);

    dom.window.document.querySelector('header button span').textContent = 'Ggithub_account_b';
    expect(token.readLast()).toBeNull();
    token.start();
    expect(token.readLast('github_account_a')).toBeNull();
    expect(token.readLast('github_account_b').data.tokens[0].key).toBe('sk-ACCOUNTAREAL02');
    expect(
      dom.window.DhepilTampermonyet.agentRouterUserJson.read('github_account_a').token.tokens[0]
        .key,
    ).toBe('sk-ACCOUNTAREAL02');
    expect(
      dom.window.DhepilTampermonyet.agentRouterUserJson.read('github_account_b').token.tokens[0]
        .key,
    ).toBe('sk-ACCOUNTAREAL02');
    expect(dom.window.localStorage.length).toBe(3);
    token.stop();
  });

  it('polls until the Token grid is ready and reports the written JSON path', async () => {
    const dom = createRuntime(
      '/console/token',
      '<header><button><span>Ggithub_delayed</span></button></header><main></main>',
      { pollInterval: 5, timeout: 100 },
    );
    const token = dom.window.DhepilTampermonyet.agentRouterToken;

    token.start();
    await new Promise((resolve) => dom.window.setTimeout(resolve, 8));
    dom.window.document.querySelector('main').innerHTML = tokenPage(
      'github_delayed',
      tokenRow({ name: 'delayed', key: 'sk-DELAYEDREAL01' }),
    ).match(/<main>([\s\S]*)<\/main>/)[1];
    await new Promise((resolve) => dom.window.setTimeout(resolve, 25));

    const host = dom.window.document.getElementById('tampermonyet-agentrouter-token');
    expect(host.shadowRoot.querySelector('[data-role="title"]').textContent).toBe(
      'AgentRouter API Token',
    );
    expect(host.shadowRoot.querySelector('[data-role="status-text"]').textContent).toBe(
      'JSON tersimpan: database/agentrouter/test.json',
    );
    expect(host.shadowRoot.querySelector('[data-role="fields"]').textContent).toContain(
      '1 tersimpan',
    );
    token.stop();
  });

  it('restarts after SPA navigation enters Token and keeps a manual fallback', async () => {
    const dom = createRuntime('/console', '<header></header><main></main>', {
      pollInterval: 5,
      timeout: 100,
    });
    const token = dom.window.DhepilTampermonyet.agentRouterToken;

    token.start();
    expect(dom.window.document.getElementById('tampermonyet-agentrouter-token')).toBeNull();

    dom.window.document.body.innerHTML = tokenPage(
      'github_spa',
      tokenRow({ name: 'spa', key: 'sk-SPAREALKEY01' }),
    );
    dom.window.history.pushState({}, '', '/console/token');
    await new Promise((resolve) => dom.window.setTimeout(resolve, 15));

    expect(token.readLast().data.tokens[0].key).toBe('sk-SPAREALKEY01');
    expect(dom.window.document.getElementById('tampermonyet-agentrouter-token')).not.toBeNull();
    token.scanNow();
    expect(token.readLast().data.accountName).toBe('github_spa');
    token.stop();
  });
});
