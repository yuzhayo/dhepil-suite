// JSON downloader that writes through the local Tampermonyet host.
(function (root) {
  'use strict';

  const namespace = (root.DhepilTampermonyet ||= {});

  function create(options = {}) {
    const grantedRequest =
      typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : root.GM_xmlhttpRequest;
    const requester = options.request || grantedRequest;
    const origin = String(options.origin || 'http://127.0.0.1:2003').replace(/\/$/, '');

    if (typeof requester !== 'function') {
      throw new TypeError('Downloader.create membutuhkan grant GM_xmlhttpRequest.');
    }

    function parseBody(response) {
      if (response.response && typeof response.response === 'object') return response.response;
      try {
        return JSON.parse(response.responseText || '{}');
      } catch {
        return {};
      }
    }

    function saveJson(request = {}) {
      return new Promise((resolve, reject) => {
        requester({
          method: 'POST',
          url: `${origin}/api/database/agentrouter`,
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({ owner: request.owner, value: request.value }),
          responseType: 'json',
          onload(response) {
            const body = parseBody(response);
            if (response.status < 200 || response.status >= 300) {
              reject(
                new Error(body.error || `Database writer gagal dengan HTTP ${response.status}.`),
              );
              return;
            }
            resolve(body);
          },
          onerror(response) {
            reject(new Error(response?.error || response?.statusText || 'Database writer gagal.'));
          },
          ontimeout() {
            reject(new Error('Database writer timeout.'));
          },
          onabort() {
            reject(new Error('Database writer dibatalkan.'));
          },
        });
      });
    }

    return Object.freeze({ saveJson });
  }

  namespace.downloader = Object.freeze({ create });
})(globalThis);
