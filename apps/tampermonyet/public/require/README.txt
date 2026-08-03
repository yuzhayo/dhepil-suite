AgentRouter Console scanner

Install in Tampermonkey:
http://127.0.0.1:2003/require/agentrouter/agent.router.user.js

The loader requires global DOM, finite-polling, JSON-storage, owner-checked rewrite-log, local JSON
downloader, and Shadow-DOM UI helpers plus AgentRouter account, per-user JSON, Dashboard, Token, and
Usage Log modules. Each page module owns its labels, fields, route, scan, and output behavior. The
shared helpers know nothing about AgentRouter. Polling checks every 500 ms for at most five minutes
and stops after success, timeout, or leaving the active page.

The Dashboard keeps one latest snapshot at the existing storage key. A successful scan rewrites
that record. Cached data is returned only when its owner matches the account currently shown on
the page, so a previous account balance cannot be reused for another account. Token uses its own
`token:last` record, temporarily reveals each masked Key input, reads the complete row including the
real key, then restores masking.

Usage Log uses `usage-log:last`. It reads only rows whose Type equals System, without partial
matches, and stores only the displayed Time, Type, and original untranslated Details. It does not
read pagination or any other Usage Log columns.

Dashboard, Token, and Usage Log are merged per account in localStorage and sent through
shared/downloader.js to the fixed local writer endpoint. The host rewrites:
apps/tampermonyet/database/agentrouter/<account>.json

The loader grants GM_xmlhttpRequest with @connect limited to 127.0.0.1, so the local write is owned
by Tampermonkey rather than by the AgentRouter page's fetch context.

Last output:
window.DhepilTampermonyet.agentRouterDashboard.readLast()
window.DhepilTampermonyet.agentRouterToken.readLast()
window.DhepilTampermonyet.agentRouterUsageLog.readLast()

Manual fallback:
window.DhepilTampermonyet.agentRouterDashboard.scanNow()
window.DhepilTampermonyet.agentRouterToken.scanNow()
window.DhepilTampermonyet.agentRouterUsageLog.scanNow()

Technical debt: Clear log UI is deferred. The rewrite-log remove operation is not wired to a
button yet.
