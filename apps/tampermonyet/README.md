# Tampermonyet

Clean Dhepil Suite app for hosting local Tampermonkey `@require` modules.

Current scope is intentionally small:

- Vite/React/Ant Design scaffold.
- Stable Dhepil Suite port.
- `public/health.json` host check.
- AgentRouter Dashboard, Token, and Usage Log scanners under `public/require/`.

Legacy source is retained under `tampermonkey/` inside this app as a reference-only archive. The
archive is not imported or served by the app and is excluded from root lint, test, and format
validation. Modules will move into `public/require/` through explicit follow-up slices.

## AgentRouter scanner

With Tampermonyet running on its stable port, open this URL to install the small local loader:

```text
http://127.0.0.1:2003/require/agentrouter/agent.router.user.js
```

The loader scans Current balance and Consumption on `https://agentrouter.org/console`, real API keys on
`https://agentrouter.org/console/token`, and Usage Log on `https://agentrouter.org/console/log`.
Token temporarily opens every masked Key cell, reads the complete visible row, then restores the
masked display. Usage Log keeps only rows whose Type is exactly `System` and stores their displayed
Time, Type, and original untranslated Details. One persistent Shadow DOM panel stacks Dashboard,
API Token, and Usage Log sections so stored and missing data remain visible across route changes.
Dashboard shows balance plus consumption; API Token shows the count plus a masked preview while the
complete key remains available only in the stored JSON.
The compact two-row header keeps the account with its English status (`Saved`, `Scanning`,
`Warning`, or `Error`) on the first row and the complete database path on the second row.
The active page polls every 500 ms for at most five minutes, then stops on success, timeout, or
route exit. The latest result rewrites one page-owned record through the shared owner-checked
rewrite-log layered on the unchanged JSON storage helper.

On reload or route activation, each scanner first waits for its page shell markers: Dashboard uses
Account Data and Usage Statistics, Token uses Create token and Query, and Usage Log uses Column
settings and Query. Only after those markers exist can a missing data source trigger an immediate
clear. While the document, spinner, progress bar, busy state, or page shell is still loading,
polling continues for at most five minutes. The scanner rewrites only the active page section in
the matching account JSON to `null` and keeps Auto scan enabled. A present but temporarily
unreadable source element reports timeout without deleting stored data.

The AgentRouter panel has one persisted **Auto scan** checkbox shared by all three routes. It is
enabled by default; checking it starts the active page scan immediately. The scan and clear button
labels identify the active page. Manual scan does not enable Auto scan. Clear disables the global
Auto scan state, clears only the active page data for the account currently shown, and rewrites the
same per-account JSON with that section set to `null`.

The loader grants `GM_xmlhttpRequest` only for `127.0.0.1`. Local JSON writes therefore travel
through Tampermonkey instead of the AgentRouter page's `fetch`, avoiding Chrome's per-site Local
Network Access prompt.

Dashboard, Token, and Usage Log results are merged into one complete localStorage JSON per account.
The shared downloader posts that JSON to the local Tampermonyet host, which rewrites this fixed
file:

```text
apps/tampermonyet/database/agentrouter/<account>.json
```

Database JSON files are ignored by Git. Keep the Tampermonyet dev server running because the
browser cannot write the repository path without the local writer endpoint.

```js
window.DhepilTampermonyet.agentRouterDashboard.readLast();
window.DhepilTampermonyet.agentRouterToken.readLast();
window.DhepilTampermonyet.agentRouterUsageLog.readLast();
```

Manual fallback remains available without a second userscript:

```js
window.DhepilTampermonyet.agentRouterDashboard.scanNow();
window.DhepilTampermonyet.agentRouterToken.scanNow();
window.DhepilTampermonyet.agentRouterUsageLog.scanNow();
```

## Commands

```powershell
npm run typecheck --workspace @dhepil-suite/tampermonyet
npm run test --workspace @dhepil-suite/tampermonyet
npm run build --workspace @dhepil-suite/tampermonyet
```
