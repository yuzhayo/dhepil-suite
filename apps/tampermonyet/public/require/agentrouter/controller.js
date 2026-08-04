// One AgentRouter lifecycle and stacked panel coordinating all page scanners.
(function (root) {
  'use strict';

  const namespace = (root.DhepilTampermonyet ||= {});
  const Account = namespace.agentRouterAccount;
  const Storage = namespace.storage;
  const UI = namespace.ui;
  const UserJson = namespace.agentRouterUserJson;

  if (!Account) throw new Error('AgentRouter Account reader harus dimuat sebelum Controller.');
  if (!Storage) throw new Error('Tampermonyet storage helper harus dimuat sebelum Controller.');
  if (!UI) throw new Error('Tampermonyet UI helper harus dimuat sebelum Controller.');
  if (!UserJson) throw new Error('AgentRouter User JSON harus dimuat sebelum Controller.');

  const definitions = Object.freeze([
    Object.freeze({ id: 'dashboard', title: 'Dashboard', actionName: 'Dashboard' }),
    Object.freeze({ id: 'token', title: 'API Token', actionName: 'API Token' }),
    Object.freeze({ id: 'usageLog', title: 'Usage Log', actionName: 'Usage Log' }),
  ]);
  const store = Storage.create({
    backend: root.localStorage,
    prefix: 'tampermonyet:agentrouter:',
  });
  const autoScanStorageName = 'auto-scan';
  const autoScanStorageKey = store.key(autoScanStorageName);
  const routeEvent = 'agentrouter:routechange';
  const pagePanels = new Map();
  const pageStates = new Map();
  let panel = null;
  let activePage = null;

  function readInitialAutoScan() {
    const missing = {};
    const saved = store.read(autoScanStorageName, missing);
    if (saved !== missing) return saved !== false;

    const legacy = ['dashboard:auto-scan', 'token:auto-scan', 'usage-log:auto-scan']
      .map((name) => store.read(name, missing))
      .filter((value) => value !== missing);
    const migrated = legacy.length ? legacy.every((value) => value !== false) : true;
    store.write(autoScanStorageName, migrated);
    return migrated;
  }

  let autoScanEnabled = readInitialAutoScan();

  function modules() {
    return [
      namespace.agentRouterDashboard,
      namespace.agentRouterToken,
      namespace.agentRouterUsageLog,
    ].filter(Boolean);
  }

  function definition(pageId) {
    return definitions.find((entry) => entry.id === pageId) || null;
  }

  function resolvePage(pathname = root.location.pathname) {
    return modules().find((page) => page.supports(pathname)) || null;
  }

  function readAccountName() {
    return Account.read(root.document);
  }

  function databasePath(accountName) {
    const normalized = String(accountName || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const fileName = normalized
      .replace(/[^a-z0-9._-]+/g, '_')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 100);
    return fileName ? `database/agentrouter/${fileName}.json` : '';
  }

  function maskTokenKey(value) {
    const key = String(value || '').trim();
    if (!key) return '—';
    if (key.includes('*')) return key;
    if (key.length <= 11) return `${key.slice(0, 3)}********`;
    return `${key.slice(0, 7)}********${key.slice(-4)}`;
  }

  function fieldsFor(pageId, data) {
    if (!data) return [];
    if (pageId === 'dashboard') {
      return [
        { label: 'Current balance', value: data.currentBalance?.raw || '—' },
        { label: 'Consumption', value: data.consumption?.raw || '—' },
      ];
    }
    if (pageId === 'token') {
      return [
        { label: 'API token', value: `${data.tokens?.length || 0} saved` },
        { label: 'Masked key', value: maskTokenKey(data.tokens?.[0]?.key) },
      ];
    }

    return [
      { label: 'System log', value: `${data.entries?.length || 0} saved` },
      { label: 'Latest', value: data.entries?.[0]?.time || 'None' },
    ];
  }

  function sectionStatus(pageId, data) {
    const runtime = pageStates.get(pageId);
    const isActive = activePage?.id === pageId;
    if (isActive && runtime?.tone === 'loading') return { status: 'Scanning…', tone: 'loading' };
    if (isActive && runtime?.tone === 'error') return { status: 'Error', tone: 'error' };
    if (isActive && runtime?.tone === 'warning')
      return { status: 'Perlu perhatian', tone: 'warning' };
    return data ? { status: 'Saved', tone: 'success' } : { status: 'No data', tone: 'idle' };
  }

  function headerState(runtime, activeData) {
    if (runtime.tone === 'loading') return { status: 'Scanning', tone: 'loading' };
    if (runtime.tone === 'error') return { status: 'Error', tone: 'error' };
    if (runtime.tone === 'warning') return { status: 'Warning', tone: 'warning' };
    if (runtime.tone === 'success' || activeData) return { status: 'Saved', tone: 'success' };
    return { status: 'No data', tone: 'idle' };
  }

  function sectionsFor(userJson) {
    return definitions.map((entry) => {
      const data = userJson?.[entry.id] || null;
      return {
        id: entry.id,
        title: entry.title,
        active: activePage?.id === entry.id,
        fields: fieldsFor(entry.id, data),
        ...sectionStatus(entry.id, data),
      };
    });
  }

  function ensurePanel() {
    if (panel) return panel;
    panel = UI.mount({
      document: root.document,
      id: 'agentrouter',
      title: 'AgentRouter',
      actionLabel: 'Scan halaman',
      secondaryActionLabel: 'Clear halaman',
      autoScanLabel: 'Auto scan',
      onAction: scanActive,
      onSecondaryAction: clearActive,
      onAutoScanChange: handleAutoScanChange,
    });
    return panel;
  }

  function render() {
    if (!activePage) return;
    const accountName = readAccountName();
    const userJson = accountName ? UserJson.read(accountName) : null;
    const activeDefinition = definition(activePage.id);
    const runtime = pageStates.get(activePage.id) || {};
    const header = headerState(runtime, userJson?.[activePage.id]);
    ensurePanel().render({
      title: accountName ? `AgentRouter · ${accountName}` : 'AgentRouter',
      path: databasePath(accountName),
      status: header.status,
      tone: header.tone,
      sections: sectionsFor(userJson),
      autoScanChecked: autoScanEnabled,
      actionDisabled: Boolean(runtime.actionDisabled),
      secondaryActionDisabled: Boolean(runtime.secondaryActionDisabled),
      actionLabel: `Scan ${activeDefinition?.actionName || 'halaman'}`,
      secondaryActionLabel: `Clear ${activeDefinition?.actionName || 'halaman'}`,
    });
  }

  function pagePanel(pageId) {
    if (!definition(pageId)) return null;
    if (!pagePanels.has(pageId)) {
      pagePanels.set(
        pageId,
        Object.freeze({
          render(state = {}) {
            pageStates.set(pageId, { ...state });
            render();
          },
          destroy() {},
        }),
      );
    }
    return pagePanels.get(pageId);
  }

  function setAutoScanEnabled(enabled) {
    autoScanEnabled = Boolean(enabled);
    store.write(autoScanStorageName, autoScanEnabled);
    return autoScanEnabled;
  }

  function isAutoScanEnabled() {
    return autoScanEnabled;
  }

  function scanActive() {
    if (!activePage) return null;
    return activePage.scanNow();
  }

  function clearActive() {
    if (!activePage) return null;
    setAutoScanEnabled(false);
    render();
    return activePage.clearResult();
  }

  function handleAutoScanChange(enabled) {
    setAutoScanEnabled(enabled);
    if (enabled) return activePage?.start({ clearMissingImmediately: true }) || null;

    activePage?.stop();
    if (activePage) {
      pageStates.set(activePage.id, { status: 'Auto scan disabled', tone: 'idle' });
    }
    render();
    return null;
  }

  function stop() {
    activePage?.stop();
  }

  function activate() {
    activePage?.stop();
    activePage = resolvePage();
    if (!activePage) {
      panel?.destroy();
      panel = null;
      return null;
    }

    pageStates.set(activePage.id, {
      status: autoScanEnabled ? 'Preparing scan…' : 'Auto scan disabled',
      tone: autoScanEnabled ? 'loading' : 'idle',
    });
    render();
    return autoScanEnabled ? activePage.start({ clearMissingImmediately: true }) : null;
  }

  function installRouteHook() {
    if (root.__tampermonyetAgentRouterControllerRouteHookV1) return;
    root.__tampermonyetAgentRouterControllerRouteHookV1 = true;

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
    root.addEventListener(routeEvent, activate);
    root.addEventListener(
      'pagehide',
      () => {
        stop();
        panel?.destroy();
        panel = null;
      },
      { once: true },
    );
  }

  namespace.agentRouterController = Object.freeze({
    managed: true,
    activate,
    stop,
    pagePanel,
    scanActive,
    clearActive,
    isAutoScanEnabled,
    setAutoScanEnabled,
    autoScanStorageKey,
    activePageId: () => activePage?.id || null,
  });
  installRouteHook();
})(globalThis);
