// Complete per-user AgentRouter JSON assembled from page-specific scan results.
(function (root) {
  'use strict';

  const namespace = (root.DhepilTampermonyet ||= {});
  const Account = namespace.agentRouterAccount;
  const Downloader = namespace.downloader;
  const Storage = namespace.storage;

  if (!Account) throw new Error('AgentRouter Account reader harus dimuat sebelum User JSON.');
  if (!Downloader) throw new Error('Tampermonyet downloader harus dimuat sebelum User JSON.');
  if (!Storage) throw new Error('Tampermonyet storage harus dimuat sebelum User JSON.');

  const store = Storage.create({
    backend: root.localStorage,
    prefix: 'tampermonyet:agentrouter:',
  });
  const downloader = Downloader.create(root.AgentRouterDownloaderOptions || {});

  function ownerKey(accountName) {
    return String(accountName || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function storageName(accountName) {
    return `user-json:${encodeURIComponent(ownerKey(accountName))}`;
  }

  function storageKey(accountName) {
    return store.key(storageName(accountName));
  }

  function read(accountName = Account.read(root.document)) {
    const expectedOwner = ownerKey(accountName);
    if (!expectedOwner) return null;

    const value = store.read(storageName(expectedOwner));
    return value && ownerKey(value.accountName) === expectedOwner ? value : null;
  }

  function update(pageResult) {
    const accountName = pageResult?.data?.accountName;
    const accountKey = ownerKey(accountName);
    if (!accountKey || !['dashboard', 'token', 'usageLog'].includes(pageResult?.page)) return null;

    const current = read(accountName) || {
      version: 1,
      source: 'agentrouter',
      accountName,
      updatedAt: pageResult.capturedAt,
      dashboard: null,
      token: null,
      usageLog: null,
    };
    const pageData = Object.fromEntries(
      Object.entries(pageResult.data).filter(([name]) => name !== 'accountName'),
    );
    const next = {
      ...current,
      accountName,
      updatedAt: pageResult.capturedAt,
      [pageResult.page]: {
        capturedAt: pageResult.capturedAt,
        pathname: pageResult.pathname,
        ...pageData,
      },
    };

    return store.write(storageName(accountName), next) ? next : null;
  }

  function save(value) {
    if (!value?.accountName) return Promise.reject(new Error('User JSON belum tersedia.'));
    return downloader.saveJson({ owner: value.accountName, value });
  }

  namespace.agentRouterUserJson = Object.freeze({
    read,
    update,
    save,
    storageKey,
  });
})(globalThis);
