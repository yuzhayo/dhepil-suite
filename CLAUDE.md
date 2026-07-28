# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repo root, in this order (the build gate expects all of them green):

```bash
npm run format:check   # prettier --check .
npm run lint           # eslint . (includes control-center boundary rules)
npm run typecheck      # tsc --noEmit for tsconfig.web.json and tsconfig.node.json
npm run test           # vitest run (jsdom)
npm run build          # typecheck + vite build
npm run dev            # control center on 127.0.0.1:1999 (strictPort)
```

Single test file or single case:

```bash
npx vitest run src/features/control-center/domain/projectStatus.test.ts
npx vitest run -t 'quick kill'
```

antd v6 API lint: `npx --yes antd lint src --format json`.

`DHEPIL_GATE_NO_OPEN=1 npm run dev` suppresses the browser auto-open.

## What this repo is

An npm-workspaces monorepo (`apps/*`) whose root is a control center: a React 19 + antd 6
dashboard that discovers, starts, stops, and tails logs for local Vite sub-apps. The root owns
orchestration only — it holds no app business logic, and apps never import the root or each other.

## Process orchestration lives in `scripts/`

`scripts/project-manager.ts` is a Vite plugin, not a standalone server. It registers middleware on
the dev server for three endpoints, so process control only exists while `npm run dev` is running:

- `GET /api/projects` — rescans `apps/*` on every call and returns `ProjectSummary[]`
- `POST /api/projects/:id/start`
- `POST /api/projects/:id/stop`

Mutating routes check request origin; children are killed on server close and process exit.

Module dependencies are strictly one-way and enforced by convention plus tests:
`project-contracts` (types) → `project-discovery` / `project-port-registry` / `project-process` →
`project-manager` (orchestrator). No cycles, and nothing here may import from `src/` or `apps/`.
Spawning a process anywhere else — especially in React — is out of bounds.

## Discovery and the port lock

An app is discovered when `apps/<id>/` has `app.manifest.json` (`schemaVersion: 1`,
`runtime: "vite"`, `id` matching the folder name) and a `package.json` with a `dev` script. Only
direct children count; symlinks and path escapes are rejected. Adding an app needs no registry
edit — the card appears on the next poll.

Ports come from the range 2000–2999 and are assigned once into the tracked file
`config/app-ports.lock.json`. Never auto-reassign a locked port on conflict; surface the conflict
as `port-conflict` status instead. The root always spawns
`npm run dev -- --host 127.0.0.1 --port <locked-port> --strictPort`, with `PORT` and
`DHEPIL_PROJECT_ID` in the child env.

`ProjectStatus` (`src/features/control-center/types.ts`) is the shared status vocabulary:
`stopped | starting | running | stopping | error | invalid | external | port-conflict | not-found`.

## Layered control-center feature

`src/features/control-center/` is split by ownership, and the layering is machine-enforced:

- `ui/` (`header`, `toolbar`, `grid`, `card`, `layout`) — markup and local CSS only. Consumes view
  models and callbacks via props. No `fetch`, no `window.open`, no polling, filtering, sorting, or
  persistence.
- `application/controller/` — polling, cancellation, UI state flow.
- `application/commands/` — one file per user action.
- `application/presenters/` — domain and application state → semantic view models.
  `application/view-models.ts` is the UI-facing contract.
- `application/extensions/` — plug-and-play logic modules under `modules/<name>/`, wired through
  `contracts.ts`. Modules must not import siblings and cannot touch shell or process APIs.
- `application/composition/createControlCenterRuntime.ts` — the only place concrete adapters are
  chosen; every dependency is overridable for tests.
- `application/ports/` — adapter interfaces (`ProjectManagerClient`, `ProjectWindow`).
- `data/` — HTTP and browser-window adapters.
- `domain/` — pure policy and collection rules. No React, no antd.
- `screens/ControlCenterScreen.tsx` — composition only: controller output → layout. It may import
  _only_ `application/controller/` and `ui/layout/`.

### Enforcement

`tooling/eslint/controlCenterBoundaryConfigs.ts` owns the executable import rules; root
`eslint.config.ts` just composes them. `test/architecture/import-boundary.test.ts` lints virtual
fixture files through the real ESLint config to prove each forbidden edge is rejected and each
allowed edge passes.

When introducing a real internal edge, add the rule to the tooling module _and_ a fixture case to
the architecture test. Do not relax an existing rule to make an import work — move the code to the
layer that owns that concern.

## Testing notes

Vitest 4 + jsdom + @testing-library/react. `test/setup.ts` mocks `matchMedia` and `ResizeObserver`
because antd needs them. Fetch is mocked with `vi.stubGlobal` / `vi.unstubAllGlobals`. Tests sit
next to their subject; `scripts/*.test.ts` are picked up automatically via `tsconfig.node.json`, so
`npm run test` covers both web and node sides.

## Boundaries when working

- Working inside `apps/<name>`: do not modify the root or another app.
- Working in the root: do not modify app source.
- Electron is opt-in per app via `app.manifest.json.desktop` (with a `desktop:dev` script in that
  app), never a root dependency.
- `projects.config.json` no longer exists; `config/app-ports.lock.json` is the only registry.

## References

- `plan.md` — the single canonical implementation plan (architecture, status model, phases,
  acceptance tests). Do not start a second parallel plan for the control center.
- `AGENTS.md` — condensed root rules; `apps/<name>/AGENTS.md` — per-app ownership (written in
  Indonesian).

Stack: React 19, antd 6.5.1, TypeScript 6, Vite 7, Vitest 4, ESLint 9, Prettier 3, ESM only,
Node >= 24, npm 11.
