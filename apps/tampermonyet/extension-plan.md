# Tampermonyet Extension — Implementation Plan

> **Status — 2026-08-04:** approved as a plan only. No extension production source has been
> implemented. This document owns the browser-side Tampermonyet extension. Chrome profile
> discovery, launch, backup, restore, and corruption recovery are explicitly outside this plan.

## 1. Objective

Replace the AgentRouter Tampermonkey loader with one local Manifest V3 extension that:

- runs only on `https://agentrouter.org/console*`;
- preserves the current Dashboard, API Token, and System-only Usage Log behavior;
- keeps one stacked panel, one global Auto scan state, manual scan, and page-scoped clear;
- keeps full API keys in the local account JSON while showing only masked values in the panel;
- writes through the existing Tampermonyet localhost writer to
  `database/agentrouter/<account>.json`;
- can be loaded into many independently supplied Chrome profiles from one extension build;
- does not require Tampermonkey, remote `@require`, Chrome Sync, or a Web Store account.

The migration must not change the current on-disk AgentRouter JSON contract merely to suit the
extension runtime.

## 2. Hard Boundary: Extension vs Profile Management

| Tampermonyet extension owns                         | Browser/profile tooling owns                         |
| --------------------------------------------------- | ---------------------------------------------------- |
| DOM reading on AgentRouter                          | Discovering Chrome `User Data` directories           |
| Dashboard/Token/Usage Log feature modules           | Choosing `--user-data-dir` / `--profile-directory`   |
| Stacked in-page panel and scan controls             | Starting, tracking, and stopping Chrome processes    |
| Per-profile scanner state                           | Mapping a Chrome profile to an AgentRouter account   |
| Message validation and localhost writer client      | Copying, adopting, backing up, or restoring profiles |
| Extension package, identity, permissions, and tests | Detecting or repairing corrupt Chrome profiles       |

Consequences:

- This plan does not scan, copy, rename, delete, or restore any Chrome profile directory.
- This plan does not add `browserProfileId`, paths, launch arguments, or recovery state to the
  AgentRouter JSON.
- Browser Launcher may later consume a pinned extension artifact through an explicit artifact
  contract. It must not import source from `apps/tampermonyet` at runtime.
- A Chrome profile used for acceptance is test input supplied externally; the extension never
  creates or mutates its directory directly.

Profile backup and restore decisions remain in the Browser Launcher scope and must not be added to
this file as extension phases.

## 3. Ownership and Target Structure

The extension remains part of the existing `tampermonyet` app, not a new npm workspace and not a
new Electron app.

```text
apps/tampermonyet/
├─ extension-plan.md
├─ extension/
│  ├─ manifest.template.json
│  ├─ src/
│  │  ├─ background/
│  │  │  └─ serviceWorker.ts
│  │  ├─ content/
│  │  │  └─ bootstrap.ts
│  │  ├─ features/
│  │  │  └─ agentrouter/
│  │  │     ├─ account.ts
│  │  │     ├─ controller.ts
│  │  │     ├─ dashboard.ts
│  │  │     ├─ token.ts
│  │  │     ├─ usageLog.ts
│  │  │     └─ userJson.ts
│  │  └─ shared/
│  │     ├─ dom.ts
│  │     ├─ polling.ts
│  │     ├─ storage.ts
│  │     ├─ ui.ts
│  │     └─ writerClient.ts
│  ├─ test/
│  └─ dist/                         # generated and ignored
├─ public/require/                  # existing Tampermonkey fallback
└─ server/databaseWriter.ts         # existing local writer
```

Rules:

- `content/bootstrap.ts` is a small composition root only.
- Site-specific DOM selectors and transformations stay under `features/agentrouter/`.
- Generic polling, UI, storage ports, and message contracts stay under `extension/src/shared/`.
- The service worker owns privileged cross-origin `fetch`; it never reads the page DOM.
- Content scripts own DOM access and communicate with the worker through validated messages.
- Future website scanners may become sibling feature folders inside this same extension. A new
  extension is required only when its permission/lifecycle boundary is materially different.

## 4. Manifest V3 Contract

Initial permissions must be the minimum below:

```json
{
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": ["http://127.0.0.1:2003/*"],
  "content_scripts": [
    {
      "matches": ["https://agentrouter.org/console*"],
      "run_at": "document_start",
      "all_frames": false,
      "js": ["content.js"]
    }
  ],
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "incognito": "not_allowed"
}
```

Explicitly excluded unless a later feature proves a need:

- `cookies`;
- `tabs`;
- `webRequest` / `declarativeNetRequest`;
- `downloads`;
- `nativeMessaging`;
- `debugger`;
- broad hosts such as `<all_urls>`.

All executable JavaScript must be included in the extension package. The existing remote
`@require` chain is a Tampermonkey fallback only and must not be reproduced with remote script
injection, `eval`, `new Function`, fetched commands, or dynamic code execution.

## 5. Runtime Data Flow

```text
AgentRouter DOM
  -> content feature scanner
  -> owner-checked per-account snapshot
  -> chrome.storage.local
  -> runtime message: save-agentrouter-json
  -> service worker validates sender + payload
  -> POST http://127.0.0.1:2003/api/database/agentrouter
  -> existing database writer validates owner
  -> database/agentrouter/<account>.json
```

### 5.1 Storage

- `chrome.storage.local` becomes the extension-owned cache and global Auto scan store.
- Storage keys remain namespaced by site and normalized account identity.
- Owner checks remain mandatory before read, rewrite, clear, or save.
- Conversion from the current synchronous Web Storage helper to the asynchronous Chrome Storage
  API must occur behind a storage port; DOM extraction functions remain pure/synchronous.
- The JSON writer remains the durable file output. Extension storage is not treated as a profile
  backup and is never copied by this feature.

### 5.2 Local writer

- Content scripts do not call localhost directly. They send a typed message to the service worker.
- The service worker accepts messages only from this extension and only from an AgentRouter tab
  whose URL matches the exact allowlist.
- The writer client accepts only the fixed endpoint, `POST`, bounded JSON, and the existing
  `{ owner, value }` contract.
- `server/databaseWriter.ts` keeps body-size and owner-equality validation.
- The extension must have a stable ID before the writer accepts
  `chrome-extension://<extension-id>`. The allowlist must use that exact ID; do not allow every
  `chrome-extension://` origin.
- Generate one extension signing identity. Commit only its public manifest key/ID; keep the private
  signing key outside Git. The same identity is used for unpacked development and packaged builds.
- During the rollback window the writer may allow the existing AgentRouter origin and the exact
  extension origin. Remove the legacy origin only after Tampermonkey retirement is approved.

## 6. Behavior Parity

The first production extension is a runtime migration, not a feature redesign. It must preserve:

### Dashboard

- route: `/console`;
- shell markers: Account Data + Usage Statistics;
- values: Current balance and Consumption;
- newest successful result rewrites the account's Dashboard section.

### API Token

- route: `/console/token`;
- shell markers: Create token + Query;
- temporarily reveal the masked key, read the complete visible row, and restore masked state;
- save the real key in local JSON and show only a masked preview in the panel.

### Usage Log

- route: `/console/log`;
- shell markers: Column settings + Query;
- save only rows whose Type is exactly `System`;
- preserve Time, Type, and Details exactly as displayed;
- do not add translation or pagination.

### Shared lifecycle

- one persistent stacked panel for all three sections;
- one global Auto scan checkbox;
- polling every 500 ms for at most five minutes, then stop;
- route change stops the previous scan and activates only the new route;
- missing source after page-shell/loading completion clears only the active section;
- manual Clear disables Auto scan and clears only the active section;
- data from two visible AgentRouter accounts must never be merged.

Auto-click/human-behavior automation is not part of the migration acceptance. Add it later as a
separate feature after the extension parity gate passes.

## 7. Tampermonkey Coexistence and Rollback

The current loader under `public/require/agentrouter/agent.router.user.js` remains available during
migration.

- Extension and userscript must not scan the same tab simultaneously.
- Add a shared DOM ownership marker because isolated JavaScript worlds cannot share globals.
- The first runtime to claim the marker owns the panel and scan lifecycle; the other stays idle and
  exposes a clear diagnostic status.
- Do not delete or rewrite the existing userscript modules during the extension spike.
- Rollback is: stop loading the extension, enable/update the existing userscript, then reload the
  AgentRouter page. The on-disk JSON contract remains compatible.
- Retire the userscript only after browser acceptance passes on all three routes and the rollback
  procedure has been exercised once.

## 8. Build and Artifact Contract

Planned app-owned commands:

```powershell
npm run extension:build --workspace @dhepil-suite/tampermonyet
npm run extension:verify --workspace @dhepil-suite/tampermonyet
```

Constraints:

- Use the app's existing TypeScript/Vite toolchain before adding a bundler dependency.
- Build content and service-worker entries separately so content output is a single executable
  bundle and the worker remains a valid module.
- Generate `extension/dist/manifest.json` from the template.
- Derive the extension manifest version from app release metadata; do not manually bump the app
  version, changelog, release commit, or tag.
- Output a deterministic inventory containing manifest version, extension ID, file list, and
  SHA-256 hashes. This inventory is the future artifact handoff boundary to Browser Launcher.
- `extension/dist/` is generated, ignored, and never the source of truth.

## 9. Implementation Phases and Gates

### Phase 0 — Contract freeze and disposable spike

- Capture current userscript behavior in regression tests before refactoring.
- Prove a minimal MV3 content script can read AgentRouter DOM in the isolated world.
- Prove service-worker `fetch` reaches the localhost writer with exact host permission.
- Prove a stable extension ID across two unpacked loads.
- Do not touch Chrome profile files and do not add launcher code.

**Gate:** one disposable extension reads a non-secret Dashboard label and writes a harmless fixture
through the test writer. The fixture is deleted after verification.

### Phase 1 — Runtime ports

- Introduce async storage and writer ports with focused tests.
- Keep DOM extractors independent of Chrome APIs.
- Add typed runtime messages and sender/URL/payload validation.
- Update the writer's exact origin allowlist for the stable extension ID.

**Gate:** storage isolation, owner mismatch rejection, malformed message rejection, payload limit,
and writer failure states are covered by tests.

### Phase 2 — AgentRouter parity

- Port Dashboard, Token, Usage Log, account identity, controller, and stacked UI.
- Preserve selectors, loading detection, five-minute finite polling, and clear semantics.
- Add the DOM ownership marker for userscript coexistence.

**Gate:** automated parity tests pass without changing the database JSON contract.

### Phase 3 — Build and local installation

- Add deterministic extension build/verify commands.
- Load the unpacked artifact into one externally supplied test profile.
- Reload the extension and browser to prove persistence and stable identity.
- Confirm no remote executable code is present in the built artifact.

**Gate:** `chrome://extensions` shows the expected stable ID and only the approved permissions.

### Phase 4 — Browser acceptance

- Verify `/console`, `/console/token`, and `/console/log` in a real signed-in session.
- Verify SPA navigation, reload, manual scan, Auto scan, clear, timeout, and missing-element clear.
- Verify only System Usage Log rows are stored.
- Verify full token value reaches only the local JSON while the panel remains masked.
- Run two externally supplied profiles and prove storage/JSON identity does not cross accounts.
- Exercise Tampermonkey rollback once.

**Gate:** browser-visible evidence and resulting JSON files pass. Tests/build alone are not a visual
or end-to-end PASS.

### Phase 5 — Optional Browser Launcher handoff

- Produce the pinned artifact inventory only.
- Browser Launcher independently decides how it installs or passes `--load-extension`.
- No profile path, backup, restore, or process-management implementation is added to Tampermonyet.

**Gate:** artifact contract is documented and consumed without cross-app source imports.

## 10. Validation Matrix

Automated:

- manifest schema and exact permission snapshot;
- no broad host permissions;
- no forbidden remote-code execution in built output;
- route resolution and single-controller lifecycle;
- DOM extraction fixtures for Dashboard, Token, and System Usage Log;
- owner-safe storage read/rewrite/clear;
- asynchronous storage failure and stale-write protection;
- content-to-worker message sender validation;
- writer success, HTTP error, timeout, unavailable host, and malformed payload;
- current database writer owner/path/body-limit tests;
- userscript/extension ownership-marker mutual exclusion.

Repository gates after implementation:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npx --yes antd lint . --format json
```

Manual browser evidence:

- exact extension ID and permission list;
- no duplicate panel when the userscript fallback is installed;
- all three routes and SPA navigation;
- storage separation across two supplied profiles;
- JSON rewrite at the fixed database path;
- Tampermonkey rollback.

## 11. Definition of Done

The extension migration is complete only when:

1. Tampermonkey is unnecessary for AgentRouter scanning.
2. One extension build serves all supplied profiles without per-profile source copies.
3. The extension is limited to AgentRouter and localhost writer permissions.
4. Dashboard, Token, Usage Log, stacked UI, Auto scan, manual scan, and clear match the accepted
   userscript behavior.
5. Account owner checks prevent cross-account storage and JSON writes.
6. The stable extension identity and exact writer allowlist are verified.
7. Automated gates and browser acceptance pass.
8. Rollback to the existing userscript is documented and tested.
9. No Chrome profile discovery, backup, restore, or filesystem mutation has leaked into the
   extension implementation.
