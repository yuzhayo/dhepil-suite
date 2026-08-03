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

  if (!Account) throw new Error('AgentRouter Account reader harus dimuat sebelum Usage Log.');
  if (!Dom) throw new Error('Tampermonyet DOM helper harus dimuat sebelum Usage Log.');
  if (!Polling) throw new Error('Tampermonyet polling helper harus dimuat sebelum Usage Log.');
  if (!Storage) throw new Error('Tampermonyet storage helper harus dimuat sebelum Usage Log.');
  if (!StorageRewriteLog) {
    throw new Error('Tampermonyet storage rewrite log harus dimuat sebelum Usage Log.');
  }
  if (!UI) throw new Error('Tampermonyet UI helper harus dimuat sebelum Usage Log.');
  if (!UserJson) throw new Error('AgentRouter User JSON harus dimuat sebelum Usage Log.');

  const options = root.AgentRouterUsageLogScanOptions || {};
  const storageName = 'usage-log:last';
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
  const resultEvent = 'agentrouter:usage-log-scan';
  const routeEvent = 'agentrouter:usage-log-routechange';
  let pollingTask = null;
  let panel = null;

  function supports(pathname) {
    return pathname === '/console/log' || pathname === '/console/log/';
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

  function findUsageLogTable(document) {
    return (
      [...document.querySelectorAll('main table[role="grid"], main table')].find(
        (table) =>
          headerIndex(table, ['Time', '时间']) >= 0 &&
          headerIndex(table, ['Type', '类型']) >= 0 &&
          headerIndex(table, ['Details', '详情']) >= 0,
      ) || null
    );
  }

  function readCell(row, index) {
    if (index < 0) return '';
    return Dom.readText(row.querySelectorAll('td')[index]);
  }

  function readSystemEntries(table) {
    const indexes = {
      time: headerIndex(table, ['Time', '时间']),
      type: headerIndex(table, ['Type', '类型']),
      details: headerIndex(table, ['Details', '详情']),
    };
    const entries = [];

    for (const row of table.querySelectorAll('tbody tr')) {
      const type = readCell(row, indexes.type);
      if (Dom.normalize(type).toLowerCase() !== 'system') continue;

      entries.push({
        time: readCell(row, indexes.time),
        type,
        details: readCell(row, indexes.details),
      });
    }

    return entries;
  }

  function isTableReady(document, table) {
    if (table.querySelectorAll('tbody tr').length) return true;

    const scope = document.querySelector('main') || table.parentElement || document.body;
    if (
      scope?.querySelector(
        '[aria-busy="true"], [data-loading="true"], .ant-spin-spinning, .is-loading',
      )
    ) {
      return false;
    }

    return ['No results found', 'No data', '暂无数据'].some((text) => Dom.findExact(scope, text));
  }

  function scan(document) {
    const accountName = Account.read(document);
    const table = findUsageLogTable(document);
    if (!accountName || !table || !table.querySelector('tbody') || !isTableReady(document, table)) {
      return null;
    }

    return {
      accountName,
      entries: readSystemEntries(table),
    };
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
    const firstEntry = result.data.entries[0];
    return [
      { label: 'Account', value: result.data.accountName },
      { label: 'System log', value: `${result.data.entries.length} tersimpan` },
      { label: 'Time', value: firstEntry?.time || 'Tidak ada' },
    ];
  }

  function ensurePanel() {
    if (panel) return panel;

    panel = UI.mount({
      document: root.document,
      id: 'agentrouter-usage-log',
      title: 'AgentRouter Usage Log',
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
      version: 1,
      page: 'usageLog',
      pathname: root.location.pathname,
      capturedAt: new Date().toISOString(),
      data,
    };
    const pageAccountName = readPageAccountName();

    if (!rewriteLog.matches(pageAccountName, result)) {
      renderStatus('Akun berubah; hasil scan diabaikan', 'warning', false, null);
      root.console.warn(
        '[Tampermonyet Usage Log Scan] Hasil scan diabaikan karena akun halaman berubah.',
      );
      return null;
    }

    const saved = rewriteLog.rewrite(pageAccountName, result);
    const userJson = UserJson.update(result);
    renderStatus(
      saved && userJson
        ? `${data.entries.length} System log tersimpan`
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
          entryCount: data.entries.length,
        },
      }),
    );
    root.console.info(`[Tampermonyet Usage Log Scan] ${data.entries.length} System log dipindai.`);

    if (userJson) {
      UserJson.save(userJson)
        .then((download) => {
          if (!supports(root.location.pathname) || !samePageAccount(data.accountName)) return;
          renderStatus(`JSON tersimpan: ${download.file}`, 'success', false, result);
        })
        .catch((error) => {
          if (!supports(root.location.pathname) || !samePageAccount(data.accountName)) return;
          renderStatus('Log tersimpan; file JSON gagal ditulis', 'warning', false, result);
          root.console.error('[Tampermonyet Usage Log Scan] File JSON gagal ditulis.', error);
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
  }

  function start() {
    stop();
    if (!supports(root.location.pathname)) return null;

    renderStatus('Mencari System log…', 'loading');
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
        renderStatus('Usage Log belum siap setelah 5 menit', 'error');
        root.console.warn('[Tampermonyet Usage Log Scan] Timeout setelah 5 menit.');
      },
      onError(error) {
        pollingTask = null;
        renderStatus('Scan Usage Log gagal', 'error');
        root.console.error('[Tampermonyet Usage Log Scan] Usage Log gagal dipindai.', error);
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
    if (root.__tampermonyetAgentRouterUsageLogRouteHookV1) return;
    root.__tampermonyetAgentRouterUsageLogRouteHookV1 = true;

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
  namespace.agentRouterUsageLog = Object.freeze({
    id: 'usageLog',
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
