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

The loader scans Current balance on `https://agentrouter.org/console`, real API keys on
`https://agentrouter.org/console/token`, and Usage Log on `https://agentrouter.org/console/log`.
Token temporarily opens every masked Key cell, reads the complete visible row, then restores the
masked display. Usage Log keeps only rows whose Type is exactly `System` and stores their displayed
Time, Type, and original untranslated Details. Each page uses a lightweight Shadow DOM panel and
polls every 500 ms for at most five minutes, then stops on success, timeout, or route exit. The
latest result rewrites one page-owned record through the shared owner-checked rewrite-log layered
on the unchanged JSON storage helper.

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

A Clear log UI remains recorded technical debt; the rewrite-log already exposes `remove()` but no
button calls it yet.

## Commands

```powershell
npm run typecheck --workspace @dhepil-suite/tampermonyet
npm run test --workspace @dhepil-suite/tampermonyet
npm run build --workspace @dhepil-suite/tampermonyet
```
