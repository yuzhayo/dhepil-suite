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

  if (!Account) throw new Error('AgentRouter Account reader harus dimuat sebelum Dashboard.');
  if (!Dom) throw new Error('Tampermonyet DOM helper harus dimuat sebelum Dashboard.');
  if (!Polling) throw new Error('Tampermonyet polling helper harus dimuat sebelum Dashboard.');
  if (!Storage) throw new Error('Tampermonyet storage helper harus dimuat sebelum Dashboard.');
  if (!StorageRewriteLog) {
    throw new Error('Tampermonyet storage rewrite log harus dimuat sebelum Dashboard.');
  }
  if (!UI) throw new Error('Tampermonyet UI helper harus dimuat sebelum Dashboard.');
  if (!UserJson) throw new Error('AgentRouter User JSON harus dimuat sebelum Dashboard.');

  const options = root.AgentRouterDashboardScanOptions || {};
  const storageName = 'dashboard:last';
  const autoScanStorageName = 'dashboard:auto-scan';
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
  const resultEvent = 'agentrouter:dashboard-scan';
  const routeEvent = 'agentrouter:dashboard-routechange';
  const missingSourceResult = Object.freeze({ missingSource: true });
  let autoScanEnabled = store.read(autoScanStorageName, true) !== false;
  let pollingTask = null;
  let panel = null;

  function supports(pathname) {
    return pathname === '/console' || pathname === '/console/';
  }

  function readCurrency(scope, labelText) {
    const label = Dom.findExact(scope, labelText);
    if (!label) return null;

    let owner = label.parentElement;
    for (
      let depth = 0;
      owner && owner !== scope && depth < 5;
      depth += 1, owner = owner.parentElement
    ) {
      const text = Dom.readText(owner);
      const remainder = Dom.normalize(text.replace(new RegExp(labelText, 'i'), ''));
      const match = remainder.match(/[-+]?\s*(?:[$€£¥]|Rp\.?)\s*\d[\d,.]*/i);
      if (!match) continue;

      const raw = Dom.normalize(match[0]);
      const value = Number(raw.replace(/,/g, '').replace(/[^\d.-]/g, ''));
      return { raw, value: Number.isFinite(value) ? value : null };
    }

    return null;
  }

  function readCurrentBalance(scope) {
    return readCurrency(scope, 'Current balance');
  }

  function readConsumption(scope) {
    return readCurrency(scope, 'Consumption');
  }

  function hasSourceElement(document) {
    const scope = document.querySelector('main') || document.body;
    return Boolean(scope && Dom.findExact(scope, 'Current balance'));
  }

  function hasPageReadyMarkers(document) {
    const scope = document.querySelector('main') || document.body;
    return Boolean(
      scope && Dom.findExact(scope, 'Account Data') && Dom.findExact(scope, 'Usage Statistics'),
    );
  }

  function scan(document) {
    const scope = document.querySelector('main') || document.body;
    if (!scope) return null;

    const accountName = Account.read(document);
    const currentBalance = readCurrentBalance(scope);
    const consumption = readConsumption(scope);
    return accountName && currentBalance ? { accountName, currentBalance, consumption } : null;
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
    return [
      { label: 'Account', value: result.data.accountName },
      { label: 'Current balance', value: result.data.currentBalance.raw },
      { label: 'Consumption', value: result.data.consumption?.raw || '—' },
    ];
  }

  function ensurePanel() {
    if (panel) return panel;

    const managedPanel = namespace.agentRouterController?.pagePanel?.('dashboard');
    if (managedPanel) {
      panel = managedPanel;
      return panel;
    }

    panel = UI.mount({
      document: root.document,
      id: 'agentrouter-dashboard',
      title: 'AgentRouter Dashboard',
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
      page: 'dashboard',
      pathname: root.location.pathname,
      capturedAt: new Date().toISOString(),
      data,
    };
    const pageAccountName = readPageAccountName();

    if (!rewriteLog.matches(pageAccountName, result)) {
      renderStatus('Akun berubah; hasil scan diabaikan', 'warning', false, null);
      root.console.warn(
        '[Tampermonyet Dashboard Scan] Hasil scan diabaikan karena akun halaman berubah.',
      );
      return null;
    }

    const saved = rewriteLog.rewrite(pageAccountName, result);
    const userJson = UserJson.update(result);

    renderStatus(
      saved && userJson ? 'Saldo terbaru disimpan' : 'Scan berhasil; storage tidak tersedia',
      saved && userJson ? 'success' : 'warning',
      false,
      result,
    );
    root.dispatchEvent(new CustomEvent(resultEvent, { detail: result }));
    root.console.info('[Tampermonyet Dashboard Scan]', result);

    if (userJson) {
      UserJson.save(userJson)
        .then((download) => {
          if (!supports(root.location.pathname) || !samePageAccount(data.accountName)) return;
          renderStatus(`JSON tersimpan: ${download.file}`, 'success', false, result);
        })
        .catch((error) => {
          if (!supports(root.location.pathname) || !samePageAccount(data.accountName)) return;
          renderStatus('Saldo tersimpan; file JSON gagal ditulis', 'warning', false, result);
          root.console.error('[Tampermonyet Dashboard Scan] File JSON gagal ditulis.', error);
        });
    }
    return result;
  }

  function scanNow() {
    if (!supports(root.location.pathname)) return null;
    const data = scan(root.document);
    if (data) return publish(data);

    renderStatus('Data Dashboard belum tersedia', 'warning');
    return null;
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
        automatic ? 'Elemen Dashboard tidak ditemukan; akun belum tersedia' : 'Akun belum tersedia',
        'warning',
        false,
        null,
      );
      return null;
    }

    renderStatus(
      automatic
        ? 'Elemen Dashboard tidak ditemukan; membersihkan log…'
        : 'Membersihkan data lokal…',
      'loading',
      true,
      null,
      true,
    );
    const snapshot = readLast(accountName);
    const snapshotRemoved = !snapshot || rewriteLog.remove();
    const userJson = UserJson.clearPage(accountName, 'dashboard');
    if (!snapshotRemoved || !userJson) {
      renderStatus(
        automatic
          ? 'Elemen Dashboard tidak ditemukan; tidak ada log tersimpan'
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
            ? `Elemen Dashboard tidak ditemukan; log dibersihkan: ${download.file}`
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
        root.console.error('[Tampermonyet Dashboard Scan] Clear JSON gagal.', error);
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
    renderStatus('Mencari data…', 'loading');
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
        renderStatus('Dashboard belum siap setelah 5 menit', 'error');
        root.console.warn('[Tampermonyet Dashboard Scan] Dashboard timeout setelah 5 menit.');
      },
      onError(error) {
        pollingTask = null;
        renderStatus('Scan Dashboard gagal', 'error');
        root.console.error('[Tampermonyet Dashboard Scan] Dashboard gagal dipindai.', error);
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
    if (root.__tampermonyetAgentRouterDashboardRouteHookV1) return;
    root.__tampermonyetAgentRouterDashboardRouteHookV1 = true;

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
  namespace.agentRouterDashboard = Object.freeze({
    id: 'dashboard',
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
