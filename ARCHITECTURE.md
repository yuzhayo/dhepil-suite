# Dhepil Suite — Architecture

Reference documentation for the finished system. For how-to instructions see `PLAYBOOK.md`.

---

## What This Is

An npm-workspaces monorepo (`apps/*`) whose root is a **control center**: a React 19 + antd 6
dashboard that discovers, starts, stops, and tails logs for local Vite sub-apps.

- Root port: `1999` (strictPort, never allocated to apps)
- App port range: `2000–2999`
- Root owns orchestration only — no app business logic
- Apps are fully isolated — they never import the root or each other

---

## Repository Structure

```
dhepil-suite/
├── apps/                          # Isolated sub-apps (each self-contained)
│   └── <app-id>/
│       ├── app.manifest.json      # App identity and runtime contract
│       └── package.json           # Must have a `dev` script
├── config/
│   └── app-ports.lock.json        # Stable port assignments (tracked by Git)
├── scripts/                       # Vite middleware plugin — process orchestration
│   ├── project-contracts.ts       # Shared types (no logic)
│   ├── project-discovery.ts       # Folder scan and manifest validation
│   ├── project-port-registry.ts   # Port lock read/write/assign
│   ├── project-process.ts         # Spawn, kill, log, probe
│   └── project-manager.ts         # Orchestrator + Vite middleware endpoints
├── src/
│   └── features/control-center/   # The dashboard feature (layered, enforced)
├── test/
│   └── architecture/              # Import boundary enforcement tests
├── tooling/
│   └── eslint/                    # Boundary rule definitions
├── ARCHITECTURE.md                # This file
├── PLAYBOOK.md                    # How to add apps and features
├── CLAUDE.md                      # Agent guidance
└── AGENTS.md                      # Condensed agent rules
```

---

## Process Orchestration (`scripts/`)

`scripts/project-manager.ts` is a **Vite plugin**, not a standalone server. It registers
middleware on the dev server — process control only exists while `npm run dev` is running.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/projects` | Rescans `apps/*` and returns `ProjectSummary[]` |
| `POST` | `/api/projects/:id/start` | Starts a managed process |
| `POST` | `/api/projects/:id/stop` | Stops a managed process |

Mutating routes check request origin. All child processes are killed on server close and
process exit.

### Module Dependency Order (one-way, no cycles)

```
project-contracts  (types only — no logic)
        ↓
project-discovery / project-port-registry / project-process
        ↓
project-manager  (orchestrator + Vite middleware)
```

Rules:
- `project-discovery` must not spawn processes
- `project-port-registry` must not know about React or HTTP middleware
- `project-process` must not choose ports
- Nothing in `scripts/` may import from `src/` or `apps/`

---

## App Discovery

Every `GET /api/projects` triggers a full rescan:

1. Read direct children of `apps/`
2. Reject hidden folders, symlinks, and path escapes
3. Validate `app.manifest.json` and `package.json`
4. Sort valid apps by ID
5. Assign ports to new apps from the lock file
6. Build app state without killing running processes

### App Contract (minimum)

```
apps/<app-id>/
├── app.manifest.json
└── package.json
```

`app.manifest.json`:
```json
{
  "schemaVersion": 1,
  "id": "your-app-id",
  "name": "Human Readable Name",
  "runtime": "vite"
}
```

Rules: `id` must be `[a-z0-9-]` and match the folder name exactly. `runtime` only accepts
`"vite"`. No shell command fields allowed in the manifest.

`package.json` must have a `dev` script. The root always spawns:
```
npm run dev -- --host 127.0.0.1 --port <locked-port> --strictPort
```

Child env: `PORT`, `DHEPIL_PROJECT_ID`.

---

## Port Lock

Ports are assigned once and stored in `config/app-ports.lock.json` (tracked by Git).

```json
{
  "schemaVersion": 1,
  "assignments": {
    "dhepil": 2000,
    "spreadsheet-minimal": 2001
  }
}
```

Rules:
- Never auto-reassign a locked port on conflict — surface `port-conflict` status instead
- Deleting an app folder does not remove its assignment (restore the folder → same port)
- Port `1999` is reserved for the root and never allocated to apps
- Lock writes are atomic (write to temp file → rename)

---

## Project Status Model

| Status | Meaning | Start/Open | Stop/Kill |
|--------|---------|------------|-----------|
| `stopped` | Folder valid, port free, server dead | Start & open | Disabled |
| `starting` | Process created, HTTP not ready | Disabled | Active |
| `running` | Process active, HTTP responding | Open | Active |
| `stopping` | Kill in progress | Disabled | Loading |
| `error` | Spawn/process failed | Retry | Per process |
| `invalid` | Folder found, contract invalid | Disabled | Disabled |
| `external` | Port responding, not managed by root | Open (warning) | Disabled |
| `port-conflict` | Port occupied, app not verified | Disabled | Disabled |
| `not-found` | Folder deleted while process alive | Disabled | Kill active |

Cards for deleted+dead apps are hidden. Cards for deleted+running apps show as `not-found`
tombstones until the process is killed.

---

## Control Center Feature (`src/features/control-center/`)

The feature is split by ownership. Layers are machine-enforced by ESLint rules.

### Layer Map

```
screens/
  ControlCenterScreen.tsx     # Composition only: controller output → layout

application/
  controller/                 # Polling, cancellation, UI state flow
  commands/                   # One file per user action
  presenters/                 # Domain + app state → semantic view models
  extensions/                 # Plug-and-play logic modules
    contracts.ts              # Extension interface
    createExtensionHost.ts    # Host wiring
    loadExtensions.ts         # Auto-discovery via import.meta.glob
    modules/
      project-lifecycle/      # Built-in extension
      project-refresh/        # Built-in extension
      quick-kill/             # Built-in extension
  ports/                      # Adapter interfaces (ProjectManagerClient, ProjectWindow)
  composition/                # Concrete adapter wiring (createControlCenterRuntime.ts)
  view-models.ts              # UI-facing contract
  presentationLimits.ts       # Log retention and render limits

data/
  httpProjectManagerClient.ts # HTTP adapter
  browserProjectWindow.ts     # window.open adapter
  projectManagerResponse.ts   # Typed response parsing

domain/
  projectStatus.ts            # Status classification table and derived sets
  projectActionPolicy.ts      # canStart / canStop / canQuickKill / canOpen
  projectCollection.ts        # Filter, sort, type guards

ui/
  card/                       # ProjectCard, ProjectTerminal, cardDefinition
  grid/                       # ProjectGrid, gridDefinition
  header/                     # ControlCenterHeader, headerDefinition
  toolbar/                    # ProjectToolbar, toolbarDefinition
  layout/                     # ControlCenterLayout, layoutTokens.css

types.ts                      # Shared runtime contracts (ProjectStatus, ProjectSummary)
```

### Layer Ownership Rules

| Layer | Owns | Must not |
|-------|------|----------|
| `ui/` | Markup, local CSS, definition files | `fetch`, `window.open`, poll, filter, sort, persist |
| `application/commands/` | One user action per file | Touch React or antd |
| `application/presenters/` | Domain state → view model | Call HTTP or spawn |
| `application/ports/` | Adapter interfaces | Contain implementations |
| `data/` | HTTP + browser adapters | Import from `ui/` |
| `domain/` | Pure policy, no React | Import anything from above layers |
| `screens/ControlCenterScreen.tsx` | Controller output → layout | Import anything except `controller/` and `ui/layout/` |

### Enforcement

`tooling/eslint/controlCenterBoundaryConfigs.ts` owns the executable import rules.
`test/architecture/import-boundary.test.ts` proves each forbidden edge is rejected and each
allowed edge passes (48 tests).

When adding a real internal import edge:
1. Add the rule to `tooling/eslint/controlCenterBoundaryConfigs.ts`
2. Add a fixture case to `test/architecture/import-boundary.test.ts`
3. Never relax an existing rule — move the code to the correct layer instead

---

## Extension System

Extensions add actions without touching any existing file.

`loadExtensions.ts` uses `import.meta.glob('./modules/*/index.ts', { eager: true })` — Vite
resolves this at build time. Drop a folder under `modules/`, export a `ControlCenterExtension`
default, and it is wired automatically.

```ts
const myExtension: ControlCenterExtension = {
  schemaVersion: 1,
  id: 'my-extension',
  actions: {
    async 'project.my-action'(context, payload) {
      // context: refresh, startAndOpen, stop, quickKill, setPending, reportError
    },
  },
};
export default myExtension;
```

A missing action handler produces a disabled button state, not a crash.

---

## Layout System

All layout values are CSS custom properties defined in one file:

```
src/features/control-center/ui/layout/layoutTokens.css
```

Key tokens:

| Token | Default | Purpose |
|-------|---------|---------|
| `--layout-max-width` | `100%` | Workspace max width |
| `--layout-inline-gutter` | `16px` | Horizontal padding |
| `--layout-grid-card-min-width` | `320px` | Minimum card width before grid reflows |
| `--layout-grid-gap` | `12px` | Gap between cards |
| `--layout-section-gap` | `10px` | Gap between toolbar/alert/grid |

The grid uses `repeat(auto-fill, minmax(var(--layout-grid-card-min-width), 1fr))` — columns
reflow automatically as the window is resized. No mobile/tablet breakpoints. One breakpoint
at `900px` handles toolbar reflow at narrow window widths.

---

## Key Design Decisions

**Quick-kill === stop policy:** `canQuickKillProject` is intentionally identical to
`canStopProject` — both reject pending actions. This is enforced by tests. Changing it
requires updating `plan.md` §15.4.3, the policy, its tests, and the controller's concurrency
model together.

**No auto-reassign on port conflict:** The root surfaces `port-conflict` status and disables
Start. It never silently picks a different port.

**Tombstone for deleted+running apps:** A `not-found` card persists until the managed process
is killed, so the user always has a way to stop it.

**Pending blocks all actions:** While an action is in flight for a project, all further
actions on that project are blocked. The controller uses per-project `AbortController` and a
sequence number to prevent stale responses from overwriting state.

---

## Build Gate

Run from the repo root in this order — all must pass before committing:

```bash
npm run format:check   # Prettier
npm run lint           # ESLint (includes boundary rules)
npm run typecheck      # tsc --noEmit for web and node configs
npm run test           # Vitest (jsdom)
npm run build          # typecheck + Vite build
npx --yes antd lint src --format json   # antd v6 API lint
```

Note: the architecture boundary test (`test/architecture/import-boundary.test.ts`) is slow
on WSL `/mnt/c` due to cold ESLint startup. It passes but may time out at the default 5s
per-test limit. Run with `--testTimeout=60000` if it fails on time.

---

## Tech Stack

| Tool | Version |
|------|---------|
| React | 19 |
| antd | 6.5.1 |
| TypeScript | 6 |
| Vite | 7 |
| Vitest | 4 |
| ESLint | 9 |
| Prettier | 3 |
| Node | ≥ 24 |
| npm | 11 |

ESM only (`"type": "module"`). No CommonJS.
