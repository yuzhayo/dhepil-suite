// JSON storage shared by site-specific require modules.
(function (root) {
  'use strict';

  const namespace = (root.DhepilTampermonyet ||= {});

  function create(options = {}) {
    const backend = options.backend || root.localStorage;
    const prefix = String(options.prefix || '');

    if (!backend || typeof backend.getItem !== 'function') {
      throw new TypeError('Storage.create membutuhkan backend Web Storage.');
    }

    function key(name) {
      return `${prefix}${String(name)}`;
    }

    function read(name, fallback = null) {
      try {
        const raw = backend.getItem(key(name));
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    }

    function write(name, value) {
      if (value === undefined) return false;
      try {
        backend.setItem(key(name), JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }

    function remove(name) {
      try {
        backend.removeItem(key(name));
        return true;
      } catch {
        return false;
      }
    }

    return Object.freeze({ key, read, write, remove });
  }

  namespace.storage = Object.freeze({ create });
})(globalThis);
