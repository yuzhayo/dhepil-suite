# Dhepil Suite

Root control center for managing local Vite sub-apps. npm workspaces monorepo (`apps/*`).

## Commands (run from root, in order)

```bash
npm run format:check     # Prettier
npm run lint             # ESLint (typescript-eslint, react-hooks, react-refresh)
npm run typecheck        # tsc --noEmit -p tsconfig.web.json && tsc --noEmit -p tsconfig.node.json
npm run test             # vitest run (jsdom, @testing-library/react)
npm run build            # typecheck + vite build
npx --yes antd lint src --format json   # antd v6 API lint
```

## Architecture

- **Root** (`src/`): React dashboard on port **1999** (strictPort, `vite.config.ts`). Only manages discovery, status, logs, start, stop, open.
- **Scripts** (`scripts/`): Vite middleware plugin. Five modules with strict one-way deps: `project-contracts` → `project-discovery`/`project-port-registry`/`project-process` → `project-manager`. Process spawning only here, never in React.
- **Apps** (`apps/<id>/`): Isolated workspaces. Each has `app.manifest.json` + `package.json` with `dev` script.

## Discovery & Port Lock

- Root scans `apps/*` direct children on every `GET /api/projects`. Symlinks, path escapes, non-direct children rejected.
- Apps need `app.manifest.json` (`schemaVersion: 1`, `runtime: "vite"`, `id` = folder name) and `package.json` with `dev` script.
- Ports `2000-2999` are assigned once and stored in the tracked root registry
  `config/app-ports.lock.json`. Never auto-reassign a locked port on conflict.
- Root always spawns `npm run dev -- --host 127.0.0.1 --port <locked-port> --strictPort`.
- Env set in spawned process: `PORT`, `DHEPIL_PROJECT_ID`.

## Key Constraints

- App code must not import root or other apps. Root must not contain app business logic.
- Working in `apps/<name>`: do not modify root or other apps.
- Working in root: do not modify app source code.
- Electron is optional per-app, declared in `app.manifest.json.desktop`. Not a root dependency.
- `DHEPIL_GATE_NO_OPEN=1` env var prevents browser auto-open on dev start.
- `projects.config.json` is deleted. Port registry is `config/app-ports.lock.json` only.

## Feature Structure (Current)

`src/features/control-center/` is partially modularized:

```
application/
  projectCollection.ts / .test.ts  # pure filter/sort
  useProjectManager.ts             # monolithic: fetch + polling + tab mgmt + actions
components/
  ProjectCard.tsx                  # stateless, prop-driven
screens/
  ControlCenterScreen.tsx          # composition root with inline toolbar/header/quick-kill
types.ts                           # pure domain types (9-status union)
```

### Target Architecture (planned per `plan.md`)

Per `plan.md` sections 4–15, the target is `src/features/<feature>/` with `screens/`,
`components/`, `ui/`, `application/` (controller/commands/presenters/extensions),
`data/`, and `domain/`. For `control-center`:

- `ui/header/`, `ui/toolbar/`, `ui/grid/`, `ui/card/`, `ui/layout/` own markup and local styles.
- `application/controller/` owns state flow.
- `application/commands/` owns user actions.
- `application/presenters/` owns view models.
- `application/extensions/` owns plug-and-play logic modules.
- `data/` owns HTTP and browser adapters; UI must not call `fetch` or `window.open`.
- `domain/` owns pure action policy and project transformations.

### UI and logic boundary

- `ControlCenterScreen` is composition only: controller output → layout → UI components.
- UI components receive view models and callbacks through props. They must not own
  polling, filtering, sorting, process policy, persistence, or data access.
- Application/data/domain modules must not import UI modules. UI must not import
  `scripts/`, repositories, or other feature internals.
- New logic modules must use the extension contract and remain local to the feature;
  they cannot execute arbitrary shell commands or access process APIs.

`plan.md` is the single canonical implementation plan. Do not create a second
parallel architecture plan for the same control-center feature.

## Testing

- Vitest 4 + jsdom + @testing-library/react.
- Test setup (`test/setup.ts`): mocks `matchMedia` and `ResizeObserver` for antd.
- Tests use `vi.stubGlobal`/`vi.unstubAllGlobals` for fetch mocking.
- Script tests live in `scripts/` (Vitest picks them up via tsconfig.node.json). No special command needed — `npm run test` discovers them automatically.

## Tech Stack

React 19, antd 6.5.1, TypeScript 6, Vite 7, Vitest 4, Prettier 3, ESLint 9. `"type": "module"`. Node >=24, npm 11.

## References

- `plan.md` — canonical implementation plan (architecture, status model, phases, acceptance tests)
- `apps/<name>/AGENTS.md` — per-app ownership rules
- Adding an app: create `apps/<id>/app.manifest.json` + `package.json` with `dev` script; no registry edit needed. Card appears on next poll.
- `scripts/` module deps: `project-contracts` (types) → `project-discovery`/`project-port-registry`/`project-process` → `project-manager` (orchestrator). No circular imports. No imports from `src/` or `apps/`.
