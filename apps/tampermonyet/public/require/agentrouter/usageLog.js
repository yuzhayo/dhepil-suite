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
  const autoScanStorageName = 'usage-log:auto-scan';
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
  const autoScanStorageKey = store.key(autoScanStorageName);
  const resultEvent = 'agentrouter:usage-log-scan';
  const routeEvent = 'agentrouter:usage-log-routechange';
  const missingSourceResult = Object.freeze({ missingSource: true });
  let autoScanEnabled = store.read(autoScanStorageName, true) !== false;
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

  function hasSourceElement(document) {
    return Boolean(findUsageLogTable(document));
  }

  function hasPageReadyMarkers(document) {
    const scope = document.querySelector('main') || document.body;
    return Boolean(
      scope && Dom.findExact(scope, 'Column settings') && Dom.findExact(scope, 'Query'),
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
    if (Dom.isLoading(scope)) return false;

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

  function pollScan(document, clearMissingImmediately) {
    const data = scan(document);
    if (data) return data;
    if (
      !clearMissingImmediately ||
      Dom.isLoading(document) ||
      !readPageAccountName() ||
      !hasPageReadyMarkers(document)
    ) {
      return null;
    }
    return hasSourceElement(document) ? null : missingSourceResult;
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

  function isAutoScanEnabled() {
    return autoScanEnabled;
  }

  function setAutoScanEnabled(enabled) {
    autoScanEnabled = Boolean(enabled);
    store.write(autoScanStorageName, autoScanEnabled);
    return autoScanEnabled;
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

    const managedPanel = namespace.agentRouterController?.pagePanel?.('usageLog');
    if (managedPanel) {
      panel = managedPanel;
      return panel;
    }

    panel = UI.mount({
      document: root.document,
      id: 'agentrouter-usage-log',
      title: 'AgentRouter Usage Log',
      actionLabel: 'Scan ulang',
      onAction: scanNow,
      autoScanLabel: 'Auto scan',
      secondaryActionLabel: 'Clear hasil scan',
      onAutoScanChange: handleAutoScanChange,
      onSecondaryAction: clearResult,
    });
    return panel;
  }

  function destroyPanel() {
    panel?.destroy();
    panel = null;
  }

  function renderStatus(
    status,
    tone,
    actionDisabled = false,
    result = readLast(),
    secondaryActionDisabled = actionDisabled,
  ) {
    ensurePanel().render({
      status,
      tone,
      actionDisabled,
      secondaryActionDisabled,
      autoScanChecked: isAutoScanEnabled(),
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

  function handleAutoScanChange(enabled) {
    setAutoScanEnabled(enabled);
    if (enabled) return start();

    stop();
    renderStatus('Auto scan nonaktif', 'idle');
    return null;
  }

  async function clearStoredResult({ disableAutoScan = true, automatic = false } = {}) {
    if (!supports(root.location.pathname)) return null;

    stop();
    if (disableAutoScan) setAutoScanEnabled(false);
    const accountName = readPageAccountName();
    if (!accountName) {
      renderStatus(
        automatic ? 'Elemen Usage Log tidak ditemukan; akun belum tersedia' : 'Akun belum tersedia',
        'warning',
        false,
        null,
      );
      return null;
    }

    renderStatus(
      automatic
        ? 'Elemen Usage Log tidak ditemukan; membersihkan log…'
        : 'Membersihkan data lokal…',
      'loading',
      true,
      null,
      true,
    );
    const snapshot = readLast(accountName);
    const snapshotRemoved = !snapshot || rewriteLog.remove();
    const userJson = UserJson.clearPage(accountName, 'usageLog');
    if (!snapshotRemoved || !userJson) {
      renderStatus(
        automatic
          ? 'Elemen Usage Log tidak ditemukan; tidak ada log tersimpan'
          : 'Data lokal belum tersedia untuk dibersihkan',
        'warning',
        false,
        null,
      );
      return null;
    }

    try {
      const download = await UserJson.save(userJson);
      if (supports(root.location.pathname) && samePageAccount(accountName)) {
        renderStatus(
          automatic
            ? `Elemen Usage Log tidak ditemukan; log dibersihkan: ${download.file}`
            : `Data dibersihkan; JSON diperbarui: ${download.file}`,
          'success',
          false,
          null,
        );
      }
    } catch (error) {
      if (supports(root.location.pathname) && samePageAccount(accountName)) {
        renderStatus(
          automatic
            ? 'Log lokal bersih; file JSON gagal diperbarui'
            : 'Data lokal bersih; file JSON gagal diperbarui',
          'warning',
          false,
          null,
        );
        root.console.error('[Tampermonyet Usage Log Scan] Clear JSON gagal.', error);
      }
    }
    return userJson;
  }

  function clearResult() {
    return clearStoredResult();
  }

  function stop() {
    pollingTask?.cancel();
    pollingTask = null;
  }

  function start(startOptions = {}) {
    stop();
    if (!supports(root.location.pathname)) return null;

    const clearMissingImmediately = Boolean(startOptions.clearMissingImmediately);
    renderStatus('Mencari System log…', 'loading');
    const task = Polling.start({
      intervalMs: options.pollInterval ?? 500,
      timeoutMs: options.timeout ?? 300000,
      shouldContinue: () => supports(root.location.pathname),
      check: () => pollScan(root.document, clearMissingImmediately),
      onSuccess(data) {
        pollingTask = null;
        if (data === missingSourceResult) {
          void clearStoredResult({ disableAutoScan: false, automatic: true });
          return;
        }
        publish(data);
      },
      onTimeout() {
        pollingTask = null;
        if (!hasSourceElement(root.document)) {
          void clearStoredResult({ disableAutoScan: false, automatic: true });
          return;
        }
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

  function activate() {
    stop();
    if (!supports(root.location.pathname)) return null;
    if (isAutoScanEnabled()) return start({ clearMissingImmediately: true });

    renderStatus('Auto scan nonaktif', 'idle');
    return null;
  }

  function handleRouteChange() {
    if (supports(root.location.pathname)) activate();
    else {
      stop();
      destroyPanel();
    }
  }

  function installRouteHook() {
    if (namespace.agentRouterController?.managed) return;
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
    activate,
    start,
    stop,
    scanNow,
    clearResult,
    readLast,
    isAutoScanEnabled,
    storageKey,
    autoScanStorageKey,
    resultEvent,
  });
})(globalThis);
