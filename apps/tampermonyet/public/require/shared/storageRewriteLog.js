// Single-record rewrite log layered on top of the shared JSON storage helper.
(function (root) {
  'use strict';

  const namespace = (root.DhepilTampermonyet ||= {});

  function defaultNormalizeOwner(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function create(options = {}) {
    const storage = options.storage;
    const name = String(options.name || '');
    const readOwner = options.readOwner;
    const normalizeOwner = options.normalizeOwner || defaultNormalizeOwner;

    if (
      !storage ||
      typeof storage.key !== 'function' ||
      typeof storage.read !== 'function' ||
      typeof storage.write !== 'function' ||
      typeof storage.remove !== 'function'
    ) {
      throw new TypeError('StorageRewriteLog.create membutuhkan instance storage.');
    }
    if (!name) throw new TypeError('StorageRewriteLog.create membutuhkan nama log.');
    if (typeof readOwner !== 'function') {
      throw new TypeError('StorageRewriteLog.create membutuhkan fungsi readOwner.');
    }

    function ownerKey(owner) {
      return normalizeOwner(owner);
    }

    function matches(owner, value) {
      const expectedOwner = ownerKey(owner);
      if (!expectedOwner || value === null || value === undefined) return false;

      try {
        return ownerKey(readOwner(value)) === expectedOwner;
      } catch {
        return false;
      }
    }

    function read(owner, fallback = null) {
      const value = storage.read(name, null);
      return matches(owner, value) ? value : fallback;
    }

    function rewrite(owner, value) {
      if (!matches(owner, value)) return false;
      return storage.write(name, value);
    }

    function remove() {
      return storage.remove(name);
    }

    return Object.freeze({
      key: storage.key(name),
      ownerKey,
      matches,
      read,
      rewrite,
      remove,
    });
  }

  namespace.storageRewriteLog = Object.freeze({ create });
})(globalThis);
