AgentRouter Console scanner

Install in Tampermonkey:
http://127.0.0.1:2003/require/agentrouter/agent.router.user.js

The loader requires global DOM, finite-polling, JSON-storage, owner-checked rewrite-log, local JSON
downloader, reusable stacked-section UI, and Shadow-DOM panel helpers plus AgentRouter account,
per-user JSON, global controller, Dashboard, Token, and Usage Log modules. Each page module owns its
selectors, scan, and output behavior. The AgentRouter controller owns its route, one panel, and one
Auto scan state. Shared helpers know nothing about AgentRouter. Polling checks every 500 ms for at
most five minutes and stops after success, timeout, or leaving the active page.

On reload or route activation, each scanner waits for page-specific shell markers before a missing
data source may trigger an immediate clear. Dashboard uses Account Data plus Usage Statistics,
Token uses Create token plus Query, and Usage Log uses Column settings plus Query. While document
loading, a spinner, progress bar, busy state, or the shell markers are not ready, polling waits for
at most five minutes. Automatic stale clear rewrites only the active page section in the matching
account JSON to null and keeps Auto scan enabled. A present but temporarily unreadable source
reports timeout without deleting stored data.

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

One persistent panel stacks Dashboard, API Token, and Usage Log so missing and stored sections stay
visible during SPA navigation. One persisted Auto scan checkbox applies to every AgentRouter route.
The two-row panel header keeps account identity with an English status and dot on the first row,
then shows the complete per-account database path on the second row. Dashboard displays Current
balance plus Consumption, while API Token displays its count and a masked key preview.
Checking it scans the active page immediately. Manual scan remains available while Auto scan is
disabled. Clear disables global Auto scan, removes only the active page result for the visible
account, and rewrites the same per-account JSON with that page section set to null.

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
