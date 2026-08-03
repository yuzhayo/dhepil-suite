// ==UserScript==
// @name         Tampermonyet - AgentRouter Console Scan
// @namespace    dhepil-suite/tampermonyet
// @version      0.8.0
// @description  Scan Dashboard, real API Token, dan System Usage Log ke JSON lokal AgentRouter.
// @match        https://agentrouter.org/console*
// @require      http://127.0.0.1:2003/require/shared/dom.js?v=0.1.0
// @require      http://127.0.0.1:2003/require/shared/polling.js?v=0.1.0
// @require      http://127.0.0.1:2003/require/shared/storage.js?v=0.1.0
// @require      http://127.0.0.1:2003/require/shared/storageRewriteLog.js?v=0.1.0
// @require      http://127.0.0.1:2003/require/shared/downloader.js?v=0.2.0
// @require      http://127.0.0.1:2003/require/shared/ui.js?v=0.1.0
// @require      http://127.0.0.1:2003/require/agentrouter/account.js?v=0.1.0
// @require      http://127.0.0.1:2003/require/agentrouter/userJson.js?v=0.1.0
// @require      http://127.0.0.1:2003/require/agentrouter/dashboard.js?v=0.6.0
// @require      http://127.0.0.1:2003/require/agentrouter/token.js?v=0.2.0
// @require      http://127.0.0.1:2003/require/agentrouter/usageLog.js?v=0.1.0
// @connect      127.0.0.1
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  if (window.top !== window.self) return;
  window.DhepilTampermonyet.agentRouterDashboard.start();
  window.DhepilTampermonyet.agentRouterToken.start();
  window.DhepilTampermonyet.agentRouterUsageLog.start();
})();
