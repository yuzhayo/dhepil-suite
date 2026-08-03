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
  const resultEvent = 'agentrouter:dashboard-scan';
  const routeEvent = 'agentrouter:dashboard-routechange';
  let pollingTask = null;
  let panel = null;

  function supports(pathname) {
    return pathname === '/console' || pathname === '/console/';
  }

  function readCurrentBalance(scope) {
    const label = Dom.findExact(scope, 'Current balance');
    if (!label) return null;

    let owner = label.parentElement;
    for (
      let depth = 0;
      owner && owner !== scope && depth < 5;
      depth += 1, owner = owner.parentElement
    ) {
      const text = Dom.readText(owner);
      const remainder = Dom.normalize(text.replace(/current balance/i, ''));
      const match = remainder.match(/[-+]?\s*(?:[$€£¥]|Rp\.?)\s*\d[\d,.]*/i);
      if (!match) continue;

      const raw = Dom.normalize(match[0]);
      const value = Number(raw.replace(/,/g, '').replace(/[^\d.-]/g, ''));
      return { raw, value: Number.isFinite(value) ? value : null };
    }

    return null;
  }

  function scan(document) {
    const scope = document.querySelector('main') || document.body;
    if (!scope) return null;

    const accountName = Account.read(document);
    const currentBalance = readCurrentBalance(scope);
    return accountName && currentBalance ? { accountName, currentBalance } : null;
  }

  function readPageAccountName() {
    return Account.read(root.document);
  }

  function readLast(accountName = readPageAccountName()) {
    return rewriteLog.read(accountName);
  }

  function fieldsFrom(result) {
    if (!result?.data) return [];
    return [
      { label: 'Account', value: result.data.accountName },
      { label: 'Current balance', value: result.data.currentBalance.raw },
    ];
  }

  function ensurePanel() {
    if (panel) return panel;

    panel = UI.mount({
      document: root.document,
      id: 'agentrouter-dashboard',
      title: 'AgentRouter Dashboard',
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
          if (
            !supports(root.location.pathname) ||
            readPageAccountName().toLowerCase() !== data.accountName.toLowerCase()
          )
            return;
          renderStatus(`JSON tersimpan: ${download.file}`, 'success', false, result);
        })
        .catch((error) => {
          if (
            !supports(root.location.pathname) ||
            readPageAccountName().toLowerCase() !== data.accountName.toLowerCase()
          )
            return;
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

  function stop() {
    pollingTask?.cancel();
    pollingTask = null;
  }

  function start() {
    stop();
    if (!supports(root.location.pathname)) return null;

    renderStatus('Mencari data…', 'loading');
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

  function handleRouteChange() {
    if (supports(root.location.pathname)) start();
    else {
      stop();
      destroyPanel();
    }
  }

  function installRouteHook() {
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
    start,
    stop,
    scanNow,
    readLast,
    storageKey,
    resultEvent,
  });
})(globalThis);
