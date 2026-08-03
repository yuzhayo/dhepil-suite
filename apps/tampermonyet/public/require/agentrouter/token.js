(function (root) {
  'use strict';

  const namespace = (root.DhepilTampermonyet ||= {});
  const Account = namespace.agentRouterAccount;
  const Dom = namespace.dom;
  const Polling = namespace.polling;
  const Storage = namespace.storage;
  const StorageRewriteLog = namespace.storageRewriteLog;
  const UI = namespace.ui;
  const UserJson = namespace.agentRouterUserJson;

  if (!Account) throw new Error('AgentRouter Account reader harus dimuat sebelum Token.');
  if (!Dom) throw new Error('Tampermonyet DOM helper harus dimuat sebelum Token.');
  if (!Polling) throw new Error('Tampermonyet polling helper harus dimuat sebelum Token.');
  if (!Storage) throw new Error('Tampermonyet storage helper harus dimuat sebelum Token.');
  if (!StorageRewriteLog) {
    throw new Error('Tampermonyet storage rewrite log harus dimuat sebelum Token.');
  }
  if (!UI) throw new Error('Tampermonyet UI helper harus dimuat sebelum Token.');
  if (!UserJson) throw new Error('AgentRouter User JSON harus dimuat sebelum Token.');

  const options = root.AgentRouterTokenScanOptions || {};
  const storageName = 'token:last';
  const store = Storage.create({
    backend: root.localStorage,
    prefix: 'tampermonyet:agentrouter:',
  });
  const rewriteLog = StorageRewriteLog.create({
    storage: store,
    name: storageName,
    readOwner: (result) => result?.data?.accountName,
  });
  const storageKey = rewriteLog.key;
  const resultEvent = 'agentrouter:token-scan';
  const routeEvent = 'agentrouter:token-routechange';
  const maskedKeyPattern = /sk-[a-z0-9._-]*\*+[a-z0-9*._-]*/i;
  const realKeyPattern = /^sk-[a-z0-9._-]{8,}$/i;
  const revealedByScanner = new Map();
  let pollingTask = null;
  let panel = null;

  function supports(pathname) {
    return pathname === '/console/token' || pathname === '/console/token/';
  }

  function headers(table) {
    return [...table.querySelectorAll('thead th')].map((header) =>
      Dom.readText(header).toLowerCase(),
    );
  }

  function headerIndex(table, expected) {
    const targets = expected.map((value) => Dom.normalize(value).toLowerCase());
    return headers(table).findIndex((header) => targets.includes(header));
  }

  function findTokenTable(document) {
    return (
      [...document.querySelectorAll('main table[role="grid"], main table')].find(
        (table) => headerIndex(table, ['Key', '密钥']) >= 0,
      ) || null
    );
  }

  function readDisplayedKey(cell) {
    const input = cell.querySelector('input');
    if (input) return Dom.normalize(input.value);

    return Dom.readText(cell, {
      exclude:
        'script,style,button,svg,input,textarea,select,[role="button"],[hidden],[aria-hidden="true"]',
    });
  }

  function readCell(row, index) {
    if (index < 0) return '';
    return Dom.readText(row.querySelectorAll('td')[index]);
  }

  function requestRealKeys(table, keyIndex) {
    let waitingForReveal = false;

    for (const row of table.querySelectorAll('tbody tr')) {
      const cell = row.querySelectorAll('td')[keyIndex];
      const input = cell?.querySelector('input');
      if (!cell || !input || !maskedKeyPattern.test(Dom.normalize(input.value))) continue;

      waitingForReveal = true;
      const button = cell.querySelector('button[aria-label="toggle token visibility"]');
      if (button && !revealedByScanner.has(button)) {
        revealedByScanner.set(button, input);
        button.click();
      }
    }

    return waitingForReveal;
  }

  function restoreMaskedKeys() {
    for (const [button, input] of revealedByScanner) {
      if (button.isConnected && input.isConnected && !String(input.value || '').includes('*')) {
        button.click();
      }
    }
    revealedByScanner.clear();
  }

  function readTokens(table, keyIndex) {
    const indexes = {
      name: headerIndex(table, ['Name', '名称']),
      status: headerIndex(table, ['Status', '状态']),
      group: headerIndex(table, ['Group', '分组']),
      availableModels: headerIndex(table, ['Available models', '可用模型']),
      ipRestrictions: headerIndex(table, ['IP restrictions', 'IP 限制']),
      creationTime: headerIndex(table, ['Creation Time', '创建时间']),
      expirationTime: headerIndex(table, ['Expiration time', '过期时间']),
    };
    const tokens = [];

    for (const row of table.querySelectorAll('tbody tr')) {
      const keyCell = row.querySelectorAll('td')[keyIndex];
      const key = keyCell ? readDisplayedKey(keyCell) : '';
      if (!realKeyPattern.test(key)) continue;

      tokens.push({
        name: readCell(row, indexes.name),
        status: readCell(row, indexes.status),
        group: readCell(row, indexes.group),
        key,
        availableModels: readCell(row, indexes.availableModels),
        ipRestrictions: readCell(row, indexes.ipRestrictions),
        creationTime: readCell(row, indexes.creationTime),
        expirationTime: readCell(row, indexes.expirationTime),
      });
    }

    return tokens;
  }

  function scan(document) {
    const accountName = Account.read(document);
    const table = findTokenTable(document);
    if (!accountName || !table) return null;

    const keyIndex = headerIndex(table, ['Key', '密钥']);
    if (requestRealKeys(table, keyIndex)) return null;

    const tokens = readTokens(table, keyIndex);
    restoreMaskedKeys();
    return tokens.length ? { accountName, tokens } : null;
  }

  function readPageAccountName() {
    return Account.read(root.document);
  }

  function samePageAccount(accountName) {
    return readPageAccountName().toLowerCase() === String(accountName || '').toLowerCase();
  }

  function readLast(accountName = readPageAccountName()) {
    return rewriteLog.read(accountName);
  }

  function fieldsFrom(result) {
    if (!result?.data) return [];
    return [
      { label: 'Account', value: result.data.accountName },
      { label: 'Real API key', value: `${result.data.tokens.length} tersimpan` },
      {
        label: 'Token',
        value: result.data.tokens.map((token) => token.name || '(tanpa nama)').join(', '),
      },
    ];
  }

  function ensurePanel() {
    if (panel) return panel;

    panel = UI.mount({
      document: root.document,
      id: 'agentrouter-token',
      title: 'AgentRouter API Token',
      actionLabel: 'Scan ulang',
      onAction: start,
    });
    return panel;
  }

  function destroyPanel() {
    panel?.destroy();
    panel = null;
  }

  function renderStatus(status, tone, actionDisabled = false, result = readLast()) {
    ensurePanel().render({
      status,
      tone,
      actionDisabled,
      fields: fieldsFrom(result),
    });
  }

  function publish(data) {
    const result = {
      version: 2,
      page: 'token',
      pathname: root.location.pathname,
      capturedAt: new Date().toISOString(),
      data,
    };
    const pageAccountName = readPageAccountName();

    if (!rewriteLog.matches(pageAccountName, result)) {
      renderStatus('Akun berubah; hasil scan diabaikan', 'warning', false, null);
      root.console.warn(
        '[Tampermonyet Token Scan] Hasil scan diabaikan karena akun halaman berubah.',
      );
      return null;
    }

    const saved = rewriteLog.rewrite(pageAccountName, result);
    const userJson = UserJson.update(result);
    renderStatus(
      saved && userJson
        ? `${data.tokens.length} real key tersimpan`
        : 'Scan berhasil; storage tidak tersedia',
      saved && userJson ? 'success' : 'warning',
      false,
      result,
    );

    root.dispatchEvent(
      new CustomEvent(resultEvent, {
        detail: {
          version: result.version,
          page: result.page,
          capturedAt: result.capturedAt,
          accountName: data.accountName,
          tokenCount: data.tokens.length,
        },
      }),
    );
    root.console.info(`[Tampermonyet Token Scan] ${data.tokens.length} real key dipindai.`);

    if (userJson) {
      UserJson.save(userJson)
        .then((download) => {
          if (!supports(root.location.pathname) || !samePageAccount(data.accountName)) return;
          renderStatus(`JSON tersimpan: ${download.file}`, 'success', false, result);
        })
        .catch((error) => {
          if (!supports(root.location.pathname) || !samePageAccount(data.accountName)) return;
          renderStatus('Key tersimpan; file JSON gagal ditulis', 'warning', false, result);
          root.console.error('[Tampermonyet Token Scan] File JSON gagal ditulis.', error);
        });
    }
    return result;
  }

  function scanNow() {
    if (!supports(root.location.pathname)) return null;
    return start();
  }

  function stop() {
    pollingTask?.cancel();
    pollingTask = null;
    restoreMaskedKeys();
  }

  function start() {
    stop();
    if (!supports(root.location.pathname)) return null;

    renderStatus('Membuka dan membaca real key…', 'loading');
    const task = Polling.start({
      intervalMs: options.pollInterval ?? 500,
      timeoutMs: options.timeout ?? 300000,
      shouldContinue: () => supports(root.location.pathname),
      check: () => scan(root.document),
      onSuccess(data) {
        pollingTask = null;
        publish(data);
      },
      onTimeout() {
        pollingTask = null;
        restoreMaskedKeys();
        renderStatus('Token belum siap setelah 5 menit', 'error');
        root.console.warn('[Tampermonyet Token Scan] Token timeout setelah 5 menit.');
      },
      onError(error) {
        pollingTask = null;
        restoreMaskedKeys();
        renderStatus('Scan Token gagal', 'error');
        root.console.error('[Tampermonyet Token Scan] Token gagal dipindai.', error);
      },
    });

    pollingTask = task.isActive() ? task : null;
    return pollingTask;
  }

  function handleRouteChange() {
    if (supports(root.location.pathname)) start();
    else {
      stop();
      destroyPanel();
    }
  }

  function installRouteHook() {
    if (root.__tampermonyetAgentRouterTokenRouteHookV1) return;
    root.__tampermonyetAgentRouterTokenRouteHookV1 = true;

    for (const method of ['pushState', 'replaceState']) {
      const original = root.history[method];
      root.history[method] = function (...args) {
        const previousUrl = root.location.href;
        const result = original.apply(this, args);
        if (root.location.href !== previousUrl) root.dispatchEvent(new Event(routeEvent));
        return result;
      };
    }

    root.addEventListener('popstate', () => root.dispatchEvent(new Event(routeEvent)));
    root.addEventListener(routeEvent, handleRouteChange);
    root.addEventListener(
      'pagehide',
      () => {
        stop();
        destroyPanel();
      },
      { once: true },
    );
  }

  installRouteHook();
  namespace.agentRouterToken = Object.freeze({
    id: 'token',
    supports,
    scan,
    start,
    stop,
    scanNow,
    readLast,
    storageKey,
    resultEvent,
  });
})(globalThis);
