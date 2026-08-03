// Finite polling shared by site-specific require modules.
(function (root) {
  'use strict';

  const namespace = (root.DhepilTampermonyet ||= {});

  function duration(value, fallback) {
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  function start(options = {}) {
    if (typeof options.check !== 'function') {
      throw new TypeError('Polling.start membutuhkan fungsi check.');
    }

    const intervalMs = duration(options.intervalMs, 500);
    const timeoutMs = duration(options.timeoutMs, 300000);
    const startedAt = Date.now();
    let active = true;
    let timer = null;

    function cancel() {
      if (!active) return;
      active = false;
      if (timer !== null) root.clearTimeout(timer);
      timer = null;
    }

    function tick() {
      if (!active) return;
      if (options.shouldContinue && !options.shouldContinue()) {
        cancel();
        return;
      }

      let result;
      try {
        result = options.check();
      } catch (error) {
        cancel();
        if (options.onError) options.onError(error);
        else throw error;
        return;
      }

      if (result !== null && result !== undefined) {
        cancel();
        options.onSuccess?.(result);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        cancel();
        options.onTimeout?.();
        return;
      }

      timer = root.setTimeout(tick, intervalMs);
    }

    tick();
    return Object.freeze({
      cancel,
      isActive: () => active,
    });
  }

  namespace.polling = Object.freeze({ start });
})(globalThis);
