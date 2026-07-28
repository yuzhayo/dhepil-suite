# Execution Plan — Dhepil Suite Modular Control Center

> Generated: 23 Jul 2026
> Refined: 23 Jul 2026 — contracts, phase ownership, fallback gates, and dependency order reconciled.
> Source of truth: `plan.md` (canonical), `AGENTS.md`, source & test files.
> Do not create a second architecture plan for the same feature.

---

## 0. Operating Rules

### Ownership

- Root (`src/`, `scripts/`, `config/`, `test/`, root config files): owned by control-center refactor.
- `apps/<id>/`: owned by respective app. **Never modify** when working on root.
- `scripts/`: backend runtime. Modify only to add tests or fix bugs — not part of modular UI refactor.
- `execution-plan.md`: update status as phases progress. Do not delete.

### Execution metadata exception

- `execution-plan.md` is allowed in every phase, including read-only phases.
- Only status, validation evidence, blockers, fallback outcome, and handoff may be updated.

### Architecture

- Parent-child: `src/features/control-center/` is the single feature folder for root dashboard.
- No circular imports between `src/` and `scripts/`. `src/` never imports `scripts/` directly.
- `domain/`, `data/`, `application/`, `ui/` must follow dependency direction in `plan.md §6`.

### Git safety

- Baseline commit: `45fd598 chore: establish dhepil suite baseline`.
- The original untracked-WIP list described P00 only and is no longer current. Inspect
  live `git status` before every phase and preserve unrelated changes.
- No reset, clean, or force-checkout ever.
- All changes are additive or refactor-in-place. Never delete a file without replacement tested.
- No commit unless explicitly requested.

### Dependencies

- Zero new npm dependencies. Use only: React 19, antd 6.5.1, TypeScript 6, Vite 7, Vitest 4, ESLint 9, Prettier 3.
- No state-management library, no DI framework, no shell/PID API in UI.

### Validation

- LSP may be disabled in agent sessions. Run `npm run typecheck` and `npm run lint` explicitly.
- Commands listed inside a phase are the narrow/extra checks for that phase. Before any
  code-changing phase may be marked PASS, also run the canonical phase gate from
  `plan.md`: `npm run format:check`, `npm run lint`, `npm run typecheck`, and
  `npm run test -- --maxWorkers=2`.
- Each phase runs its own validation commands. **Next phase may not start if current phase gate fails.**
- Browser QA is required after runtime integration (P18), final cleanup (P19), and the
  final gate (P21). P13–P17 use component/unit/build validation because their UI is not
  mounted in the runtime screen yet.

### Phase discipline

- One concern per phase. Max 1–5 main files per phase.
- If success criteria not met: stop, record error, attempt fallback, mark `BLOCKED` if fallback fails.
- Never widen scope without approval. Never change public contract just to make a test pass.
- A fallback must still satisfy every success criterion. Otherwise record it and mark the phase `BLOCKED`.
- UI fallback may preserve existing CSS temporarily; it must not introduce inline styles. Incomplete CSS migration is `BLOCKED`.
- The no-inline-style rule applies to the React control-center UI. The isolated waiting
  tab HTML owned by `browserProjectWindow` may preserve its existing generated styling.

### Refinement decisions

- `domain/projectCollection.ts` is the sole runtime owner for filter/sort; the old
  `application/projectCollection.ts` path is removed during P02.
- P05 defines the port signature and response contract; P06 owns actual
  `AbortSignal` forwarding and abort tests.
- Extensions receive high-level capabilities from `ControlCenterActionContext`, never
  raw `ProjectManagerClient` or `ProjectWindow`.
- `application/composition/createControlCenterRuntime.ts` is the only feature
  composition boundary allowed to assemble concrete data adapters.
- P12 owns refresh and action cancellation, including startup readiness cancellation on
  unmount.
- `ProjectGrid` may render the peer `ui/card/ProjectCard`; it may not add policy or raw
  domain data access.

---

## 1. Runtime and Historical Migration Baseline

### Runtime aktual (berjalan)

- Root Vite dev server on port **1999** (strictPort, `vite.config.ts`).
- `scripts/project-manager.ts` Vite middleware plugin handles all `/api/projects` routes.
- Five `scripts/` modules: `project-contracts` → `project-discovery`/`project-port-registry`/`project-process` → `project-manager`.
- Discovery: scans `apps/*` direct children on every `GET /api/projects`. Symlinks, path escapes, non-direct children rejected.
- Port lock: `config/app-ports.lock.json` with atomic write, range 2000–2999, never reassign on conflict.
- Process lifecycle: managed spawn/kill/log, tombstone `not-found` for deleted-running apps, external/port-conflict detection.
- `DHEPIL_GATE_NO_OPEN=1` env var prevents auto-open.

### Struktur historis sebelum modular refactor (`src/features/control-center/`)

Snapshot berikut menjelaskan alasan P00–P19 dijalankan; path legacy di bawah sudah
dihapus atau dipindahkan dan bukan struktur runtime aktif.

```
application/
  projectCollection.ts / .test.ts   # pure filter/sort
  useProjectManager.ts              # monolithic: fetch + polling + tab mgmt + actions
components/
  ProjectCard.tsx                   # semi-presentational (still computes policy)
screens/
  ControlCenterScreen.tsx           # composition + inline toolbar/header/quick-kill
types.ts                            # 9-status union + ProjectSummary + ProjectsResponse
```

### Implemented baseline (plan.md §9 Fase 1–6)

- Kontrak manifest + pure validation ✓
- Stable port registry (allocate, atomic write, reserved range) ✓
- Dynamic discovery (replace `projects.config.json`, now deleted) ✓
- Runtime lifecycle: port-conflict, tombstone, kill ✓
- UI integration: status invalid/conflict/not-found in card ✓
- Migration cleanup + AGENTS.md updated ✓

### Modular target implemented through P20 (plan.md §15)

- `ui/header/`, `ui/toolbar/`, `ui/grid/`, `ui/card/`, `ui/layout/` ✓
- `application/controller/`, `composition/`, `commands/`, `presenters/`, `extensions/`,
  `ports/` ✓
- `domain/` (`projectActionPolicy`, `projectStatus`, `projectCollection`) ✓
- `data/` adapters (`httpProjectManagerClient`, `browserProjectWindow`) ✓
- CSS migration to layout token contract per-area ✓
- Screen → composition-only (`controller + layout`) ✓
- Modular executable boundary owner in
  `tooling/eslint/controlCenterBoundaryConfigs.ts` ✓

### Commit baseline

```
45fd598 chore: establish dhepil suite baseline
```

The untracked-WIP note belonged to the historical baseline. Continuations must use live
`git status`; they must not infer current ownership from the P00 snapshot.

### Historical scope protection during migration

Daftar berikut merekam protection scope saat fase implementasi berjalan. Status fase
dan allowed files yang aktif tetap ditentukan oleh section phase masing-masing.

- `apps/*` — never modify
- `scripts/project-manager.ts` — only add tests or fix bugs, not part of UI refactor
- `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json` — do not change
- `AGENTS.md` — update only in P19 after all phases pass
- `plan.md` — update only in P19 after all phases pass

### Historical migration touch set

- `src/features/control-center/*` — all files under this folder are subject to refactor
- `eslint.config.ts` — add `no-restricted-imports` in P01
- `src/App.tsx` — may need minor import path updates if screen moves
- `src/App.test.tsx` — update imports if paths change

### Technical debt terverifikasi

1. **Status policy duplication** — lifecycle status arrays hardcoded in 4+ consumers (`useProjectManager.ts:98,115,126`, `ProjectCard.tsx:37,39`, `ControlCenterScreen.tsx:39`, `projectCollection.ts:6`).
2. **`useProjectManager.ts` multi-concern** — HTTP, polling, mounted-guard, pending-state, startup retry, waiting-tab, error normalization in one hook.
3. **Screen has policy + AntD menu composition** — `activeServerItems`, `handleQuickKill`, `activeProjects` filter inline in `ControlCenterScreen.tsx`.
4. **HTTP contract is a cast** — `readProjects`/`runAction` use global `fetch`, cast payload, generic `Error`, no adapter, no typed error, no cancellation.
5. **No concurrency/performance characterization** — `stateFor` does TCP+HTTP probe on every list; no test for single-flight synchronization overlap.
6. **No architecture import-boundary enforcement** — `eslint.config.ts` has no `no-restricted-imports`.
7. **No CI workflow** — validation is manual. Recorded as deferred scope.
8. **Two log limits without contract** — runtime stores 120 lines, card renders 80. Not a bug but undocumented.

---

## 2. Dependency Graph

```
P00 (Baseline Characterization)
  │
  ▼
P01 (Import Boundary Guardrail) ──────────────────────────────────────────────┐
  │                                                                            │
  ▼                                                                            │
P02 (Domain Status Classification) ────────────────────────────────────────────┤
  │                                                                            │
  ▼                                                                            │
P03 (Domain Action Policy) ────────────────────────────────────────────────────┤
  │                                                                            │
  ▼                                                                            │
P04 (View-Model Contracts) ────────────────────────────────────────────────────┤
  │                                                                            │
  ▼                                                                            │
P05 (HTTP Response Contract) ───┐                                              │
  │                             │                                              │
  ▼                             ▼                                              │
P06 (Cancellation) ──────── P07 (Startup Readiness Policy)                    │
  │                             │                                              │
  ├─────────────┬───────────────┘                                              │
  ▼             ▼                                                              │
P08 (Browser Window Adapter)                                                   │
  │                                                                             │
  ▼                                                                             │
P09 (Core Commands) ───────────────────────────────────────────────────────────┤
  │                                                                             │
  ▼                                                                             │
P10 (Extension Contract & Host) ───────────────────────────────────────────────┤
  │                                                                             │
  ▼                                                                             │
P11 (Extension Loader & Core Modules) ────────────────────────────────────────┤
  │                                                                             │
  ▼                                                                             │
P12 (Controller) ──────────────────────────────────────────────────────────────┤
  │                                                                             │
  ├────────────────────────────────────────────────────────────────────────────┤
  ▼                                                                            │
P13 (Header UI) ──── P14 (Toolbar UI) ──── P16 (Card/Terminal UI)
                                             │
                                             ▼
                                        P15 (Grid UI)
  │                                                                            │
  ▼                                                                            │
P17 (Layout Ownership) ────────────────────────────────────────────────────────┤
  │                                                                             │
  ▼                                                                             │
P18 (Screen Cleanup) ──────────────────────────────────────────────────────────┤
  │                                                                             │
  ▼                                                                             │
P19 (Legacy Removal) ──────────────────────────────────────────────────────────┤
  │                                                                             │
  ▼                                                                             │
P20 (Full Automated Validation) ───────────────────────────────────────────────┤
  │                                                                             │
  ▼                                                                             │
P21 (Browser QA & Final Audit) ◄───────────────────────────────────────────────┘
```

### Serial dependencies (must be sequential)

- P00 → P01 → P02 → P03 → P04 (domain/policy chain)
- P05 → P06 (HTTP contract before cancellation)
- P05 → P07 → P09 (ports before commands)
- P08 → P09 (adapter before commands)
- P09 → P10 → P11 → P12 (commands → extensions → controller)
- P12 → P13/P14/P16 (controller before UI extraction)
- P16 → P15 (Grid renders the peer Card component)
- P13/P14/P15 → P17 (all UI extraction before layout ownership)
- P17 → P18 → P19 → P20 → P21 (final cascade)

### Parallel-allowed phases

- P13, P14, and P16 can be done in parallel. P15 must wait for P16 because Grid renders
  the peer Card component.
- P06 and P07 can be done in any order (different concerns, both depend on P05)
- P20 and P21 are final gates

### Phase gate rule

If any phase fails its validation, all downstream phases that depend on it are BLOCKED.

---

## 3. Phase Index

| Phase | Tujuan                           | Allowed files                                                                                                                                                                                                                                                      | Forbidden files                                                                                 | Dependency         | Output                                                                                                           | Validation                                                           | Gate      |
| ----- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------- |
| P00   | Bekukan behavior + baseline test | `src/App.test.tsx`, `src/features/control-center/**/*.test.ts`, `scripts/**/*.test.ts`, `test/evidence/` (create)                                                                                                                                                  | `src/features/control-center/**/*.tsx` (source), `scripts/**/*.ts` (source), `eslint.config.ts` | None               | Additional characterization tests                                                                                | `npm run test`                                                       | Must pass |
| P01   | ESLint import-boundary guardrail | `eslint.config.ts`, `test/architecture/` (create), `src/features/control-center/**/*` (read only)                                                                                                                                                                  | `apps/*`, `scripts/*` (source)                                                                  | P00                | `no-restricted-imports` rules + negative architecture fixture                                                    | `npm run lint && npm run test`                                       | Must pass |
| P02   | Domain status classification     | `src/features/control-center/domain/` (create), `src/features/control-center/application/projectCollection.ts` (move/delete), `src/features/control-center/domain/projectCollection.ts`, tests, `screens/ControlCenterScreen.tsx` (import only), `types.ts` (read) | `scripts/*`, `apps/*`, `src/features/control-center/ui/`                                        | P01                | `domain/projectStatus.ts` + `domain/projectCollection.ts`                                                        | `npm run typecheck && npm run test`                                  | Must pass |
| P03   | Domain action policy             | `src/features/control-center/domain/` (create)                                                                                                                                                                                                                     | `scripts/*`, `apps/*`                                                                           | P02                | `domain/projectActionPolicy.ts`                                                                                  | `npm run typecheck && npm run test`                                  | Must pass |
| P04   | View-model contracts             | `src/features/control-center/application/` (create presenters/), `src/features/control-center/domain/` (read)                                                                                                                                                      | `scripts/*`, `apps/*`, `src/features/control-center/ui/`                                        | P03                | `application/view-models.ts`, `application/presenters/`                                                          | `npm run typecheck && npm run test`                                  | Must pass |
| P05   | HTTP response contract           | `src/features/control-center/data/` (create), `src/features/control-center/application/ports/` (create)                                                                                                                                                            | `scripts/*`, `apps/*`, `src/features/control-center/ui/`                                        | P04                | `data/httpProjectManagerClient.ts`, `application/ports/ProjectManagerClient.ts`                                  | `npm run typecheck && npm run test`                                  | Must pass |
| P06   | Transport cancellation           | `src/features/control-center/data/`, `src/features/control-center/application/ports/`                                                                                                                                                                              | `scripts/*`, `apps/*`, `src/features/control-center/application/controller/`                    | P05                | AbortSignal in adapters, abort tests                                                                             | `npm run typecheck && npm run test`                                  | Must pass |
| P07   | Startup readiness policy         | `src/features/control-center/application/` (create)                                                                                                                                                                                                                | `scripts/*`, `apps/*`                                                                           | P05                | `application/commands/startupReadinessPolicy.ts`                                                                 | `npm run typecheck && npm run test`                                  | Must pass |
| P08   | Browser window adapter           | `src/features/control-center/data/` (create), `src/features/control-center/application/ports/` (create)                                                                                                                                                            | `scripts/*`, `apps/*`                                                                           | P05                | `data/browserProjectWindow.ts`, `application/ports/ProjectWindow.ts`                                             | `npm run typecheck && npm run test`                                  | Must pass |
| P09   | Core commands                    | `src/features/control-center/application/commands/` (create)                                                                                                                                                                                                       | `scripts/*`, `apps/*`, `src/features/control-center/ui/`                                        | P06, P07, P08      | `application/commands/refreshProjects.ts`, `startAndOpenProject.ts`, `stopProject.ts`, `quickKillProject.ts`     | `npm run typecheck && npm run test`                                  | Must pass |
| P10   | Extension contract & host        | `src/features/control-center/application/extensions/` (create)                                                                                                                                                                                                     | `scripts/*`, `apps/*`, `src/features/control-center/ui/`                                        | P09                | `application/extensions/contracts.ts`, `createExtensionHost.ts`, `loadExtensions.ts`                             | `npm run typecheck && npm run test`                                  | Must pass |
| P11   | Extension loader & core modules  | `src/features/control-center/application/extensions/modules/` (create)                                                                                                                                                                                             | `scripts/*`, `apps/*`, `src/features/control-center/ui/`                                        | P10                | 3 core extension modules                                                                                         | `npm run typecheck && npm run test`                                  | Must pass |
| P12   | Controller                       | `src/features/control-center/application/controller/` (create), `src/features/control-center/application/composition/` (create)                                                                                                                                    | `scripts/*`, `apps/*`, `src/features/control-center/ui/`                                        | P11                | `application/composition/createControlCenterRuntime.ts` + `application/controller/useControlCenterController.ts` | `npm run typecheck && npm run test && npm run lint`                  | Must pass |
| P13   | Header UI                        | `src/features/control-center/ui/header/` (create)                                                                                                                                                                                                                  | `scripts/*`, `apps/*`, `src/features/control-center/application/` (source)                      | P12                | `ui/header/ControlCenterHeader.tsx`, `headerDefinition.ts`                                                       | `npm run typecheck && npm run test && npm run build`                 | Must pass |
| P14   | Toolbar UI                       | `src/features/control-center/ui/toolbar/` (create)                                                                                                                                                                                                                 | `scripts/*`, `apps/*`, `src/features/control-center/application/` (source)                      | P12                | `ui/toolbar/ProjectToolbar.tsx`, `toolbarDefinition.ts`                                                          | `npm run typecheck && npm run test && npm run build`                 | Must pass |
| P15   | Grid UI                          | `src/features/control-center/ui/grid/` (create), `src/features/control-center/ui/card/` (read only)                                                                                                                                                                | `scripts/*`, `apps/*`, `src/features/control-center/application/` (source)                      | P16                | `ui/grid/ProjectGrid.tsx`, `gridDefinition.ts`                                                                   | `npm run typecheck && npm run test && npm run build`                 | Must pass |
| P16   | Card & Terminal UI               | `src/features/control-center/ui/card/` (create)                                                                                                                                                                                                                    | `scripts/*`, `apps/*`, `src/features/control-center/application/` (source)                      | P12                | `ui/card/ProjectCard.tsx`, `cardDefinition.ts`, `ProjectTerminal.tsx`                                            | `npm run typecheck && npm run test && npm run build`                 | Must pass |
| P17   | Layout ownership                 | `src/features/control-center/ui/layout/` (create), `src/styles.css` (modify)                                                                                                                                                                                       | `scripts/*`, `apps/*`, `src/features/control-center/application/` (source)                      | P13, P14, P15, P16 | `ui/layout/ControlCenterLayout.tsx`, `layoutTokens.css`, reduced `src/styles.css`                                | `npm run typecheck && npm run test && npm run build`                 | Must pass |
| P18   | Screen cleanup                   | `src/features/control-center/screens/ControlCenterScreen.tsx` (modify), `eslint.config.ts`, `test/architecture/import-boundary.test.ts`, root imports/tests if required                                                                                            | `scripts/*`, `apps/*`                                                                           | P17                | Composition-only screen + enforced screen import boundary                                                        | `npm run lint && npm run typecheck && npm run test && npm run build` | Must pass |
| P19   | Legacy removal                   | `src/features/control-center/application/useProjectManager.ts` (delete), `src/features/control-center/application/projectCollection.ts` (verify absent), `src/features/control-center/components/` (delete old files), `AGENTS.md`, `plan.md`                      | `scripts/*`, `apps/*`                                                                           | P18                | No legacy files, updated docs                                                                                    | `npm run typecheck && npm run test && npm run build`                 | Must pass |
| P20   | Full automated validation        | All files (read only)                                                                                                                                                                                                                                              | Any file modification except execution metadata                                                 | P19                | Clean validation output                                                                                          | All validation commands                                              | Must pass |
| P21   | Browser QA & final audit         | Browser (read only)                                                                                                                                                                                                                                                | Any file modification except execution metadata                                                 | P20                | QA report                                                                                                        | Manual verification                                                  | Must pass |

---

## 4. Phase Details

### Phase P00 — Baseline Characterization

Status:

- PASS

Validation evidence (2026-07-23):

- P00 format remediation: `.claude/settings.json` processed by the explicitly approved `npx prettier --write .claude/settings.json`; JSON parse/reparse semantic comparison was identical. No key, value, behavior, permission, or configuration semantics changed.
- `npm run format:check` **PASS**.
- `npm run lint` **PASS**.
- `npm run typecheck` **PASS**.
- `npm run test -- --maxWorkers=2` **PASS**: 7 files, 28 tests.
- Targeted characterization run **PASS**: 4 files, 19 tests.
- Probe measurement **PASS**: fixture exactly 20 apps, 20 unique ports, `P00 probe fixture: 20 apps, list 20.23 ms`.

Handoff:

- P00 characterization tests/evidence are complete. P01 may begin; no P02 work performed.

Objective:

- Bekukan behavior existing melalui test dan catat baseline.

Why now:

- Semua refactor berikutnya butuh safety net agar tidak memutus behavior yang sudah berjalan. Tanpa characterization test, regresi tidak terdeteksi.

Preconditions:

- Baseline commit `45fd598`; intentional untracked WIP recorded in Git safety.

Allowed files:

- `src/App.test.tsx`
- `src/features/control-center/application/projectCollection.test.ts`
- `scripts/project-manager.test.ts`
- `scripts/project-discovery.test.ts`
- `scripts/project-port-registry.test.ts`
- `scripts/project-process.test.ts`
- `test/evidence/` (create)

Forbidden files:

- `src/features/control-center/**/*.tsx` (source — no modifications)
- `scripts/**/*.ts` (source — no modifications)
- `apps/*`
- `eslint.config.ts`

Implementation TODO:

1. Add UI characterization in `src/App.test.tsx`: loading, empty, page error, quick kill, search, sort, grid/list, and rendered status states.
2. Add collection behavior tests only in `application/projectCollection.test.ts`.
3. Add runtime behavior tests only in `scripts/project-manager.test.ts`: concurrent `list()` single-flight, overlap `start()` + `list()`, mutation route, GET read-only, and log retention 120.
4. Add a 20-app probe measurement fixture under `test/evidence/`; record timings in `test/evidence/p00-probe-measurement.md`. Do not change behavior.
5. Record accessible names and user-visible states in `test/evidence/p00-ui-baseline.md`.

Contracts:

- All existing tests must continue to pass.
- New tests must cover the 9 statuses, search, sort, grid/list, loading, empty, error, quick kill.
- Concurrency test must verify single-flight `synchronizeInFlight` behavior.
- Probe measurement must be recorded as evidence (not as a failing test).

Tests to add or update:

- `App.test.tsx`: stopped, running, external, port-conflict, invalid, not-found, loading, empty, page error, quick kill, search, sort, grid/list.
- `project-manager.test.ts`: concurrent list single-flight, overlap start+list, mutation route POST+same-origin, GET read-only, log retention 120.
- New fixture test file for 20-app probe measurement.

Validation commands:

```powershell
npm run test
npm run lint
npm run typecheck
```

Success criteria:

- All existing tests pass.
- New tests pass.
- Probe measurement results recorded.

Fallback if not achieved:

- If concurrency test is flaky, simplify to verify single-flight promise identity.
- If probe measurement fixture is too slow, optimize fixture setup without reducing the required 20 apps.

Stop conditions:

- Source code must not be modified (only the allowed characterization tests and evidence files).
- If existing test fails, stop and investigate — do not modify source to fix test.

Handoff:

- Files changed: ownership-specific test files and `test/evidence/p00-*.md`.
- Commands: `npm run test` passes, `npm run lint` passes, `npm run typecheck` passes.
- Known issue: Probe measurement may be slow; record timings.
- Next phase: P01.

---

### Phase P01 — Import Boundary Guardrail

Status:

- PASS

Implementation/evidence (2026-07-23):

- Updated `eslint.config.ts` with error-level `no-restricted-imports` flat-config scopes.
- Added `test/architecture/import-boundary.test.ts` with 25 negative boundary fixtures plus three allowed-edge fixtures.
- Targeted architecture test **PASS**: 1 file, 28 tests.
- `npm run format:check` **PASS**.
- `npm run lint` **PASS**.
- `npm run typecheck` **PASS**.
- `npm run test -- --maxWorkers=2` **PASS**: 8 files, 56 tests.
- `npm run build` **PASS**; existing chunk-size warning remains non-blocking.
- `npx --yes antd lint src --format json` **PASS**: 0 issues.
- Composition → data is explicitly allowed and tested.
- Extension sibling enforcement was reverified on 2026-07-24 using the realistic
  `application/extensions/modules/project-refresh/index.ts` fixture: `../quick-kill`
  and its subpaths are rejected by `no-restricted-imports` at severity 2, while
  `./internal` and the public `../../contracts` edge remain allowed.
- No source-specific exception or test-only ESLint override required.
- No dependency added.
- Existing source remains unchanged; target architecture folders are not yet present, so legacy imports remain unaffected.

Boundaries enforced:

- UI → data, controller, commands, extensions, scripts.
- Domain → React, AntD, data, UI, application, scripts.
- Extensions → sibling modules, UI, scripts.
- Data → UI, controller, commands, extensions, composition, scripts.
- Controller → data, UI, scripts.
- Composition → UI and screens are rejected; Composition → data remains allowed.

Handoff:

- P02 may begin from the canonical architecture state. P02 not started in this session.

Objective:

- Pasang ESLint `no-restricted-imports` untuk enforce dependency direction.

Why now:

- Sebelum file baru dibuat di folder target, boundary harus aktif agar agent tidak melanggar arsitektur secara tidak sengaja.

Preconditions:

- P00 PASS.

Allowed files:

- `eslint.config.ts`
- `test/architecture/` (create)
- `src/features/control-center/**/*` (read only — to verify existing imports)

Forbidden files:

- `apps/*`
- `scripts/*` (source)
- `src/features/control-center/**/*.tsx` (source — no modifications)

Implementation TODO:

1. Add error-level `no-restricted-imports` rules only for new target folders:
   - `src/features/control-center/ui/` → cannot import `data/`, `application/controller/`, `application/commands/`, `application/extensions/`, `scripts/`.
   - `src/features/control-center/domain/` → cannot import `react`, `antd`, `data/`, `ui/`, `application/`, `scripts/`.
   - `src/features/control-center/application/extensions/` → cannot import sibling extension modules, `ui/`, `scripts/`.
   - `src/features/control-center/data/` → cannot import `ui/`, `application/controller/`,
     `application/commands/`, `application/extensions/`, `application/composition/`,
     `scripts/`.
   - `src/features/control-center/application/controller/` → cannot import `data/`,
     `ui/`, or `scripts/`; it receives runtime dependencies from composition.
   - `src/features/control-center/application/composition/` → may import `data/` and
     application modules, but cannot import `ui/` or `screens/`.
2. Do not restrict `screens/` yet; P18 establishes its controller/layout-only boundary after migration.
3. Verify existing code does not violate any new rule (adjust patterns if needed).
4. Add `test/architecture/import-boundary.test.ts` using the installed ESLint API to lint
   virtual fixture paths. The test must prove each forbidden layer import fails without
   adding a forbidden source file to the normal lint set.
5. Run lint and the architecture test to confirm rules are active.

Contracts:

- Rules must match dependency direction in `plan.md §6`.
- Rules must not break existing code (adjust patterns if false positives).

Tests to add or update:

- `test/architecture/import-boundary.test.ts`: forbidden imports fail and allowed imports
  remain valid, including the single allowed composition→data edge.

Validation commands:

```powershell
npm run lint
npm run test -- test/architecture/import-boundary.test.ts
```

Success criteria:

- Lint passes with meaningful `no-restricted-imports` rules.
- Existing code does not violate any new rule.
- The negative architecture fixture fails for each forbidden edge.

Fallback if not achieved:

- If a rule causes false positive, allow the specific import path that is legitimate.
- If no error-level rule can enforce the boundary without a legitimate exception, record the exception and mark P01 `BLOCKED`.

Stop conditions:

- Must not modify feature source files (only eslint config and architecture test).
- Must not add new npm dependencies.

Handoff:

- Files changed: `eslint.config.ts`, `test/architecture/import-boundary.test.ts`.
- Commands: `npm run lint` and the architecture boundary test pass.
- Known issue: Rules for `screens/` may need adjustment until P18.
- Next phase: P02.

---

### Phase P02 — Domain Status Classification

Status:

- PASS

Scope clarification (2026-07-24):

- Added `src/features/control-center/components/ProjectCard.tsx` to P02 allowed files for
  one import-path update only. JSX, behavior, styling, props, and logic remain unchanged.
- Updated its type import from `../application/projectCollection` to
  `../domain/projectCollection`; no compatibility wrapper was added.

Validation evidence (2026-07-24):

- Added `src/features/control-center/domain/projectStatus.ts` with exhaustive
  `STATUS_CLASSIFICATION satisfies Record<ProjectStatus, StatusClassification>`, derived
  readonly status families, and classification functions.
- Moved `application/projectCollection.ts` and its test to `domain/`; collection now uses
  `ACTIVE_STATUSES` and preserves search, sort, undefined-port, non-mutation, and all 9
  status active-first behavior.
- `npm run format:check` **PASS**.
- `npm run lint` **PASS**.
- `npm run typecheck` **PASS**.
- `npm run test -- --maxWorkers=2` **PASS**: 9 files, 67 tests.
- `npm run build` **PASS**: Vite build completed; existing chunk-size warning only.
- `npx --yes antd lint src --format json` **PASS**: 0 issues.

Blocker:

- Resolved. No P02 blocker remains.

Objective:

- Buat `domain/projectStatus.ts` dengan status family readonly dan classification function,
  lalu pindahkan pure collection filter/sort ke `domain/projectCollection.ts`.

Why now:

- Duplikasi status literal adalah debt paling berdampak. Semua fase downstream (P03, P04, P09, P12) butuh satu source of truth.

Preconditions:

- P01 PASS.

Allowed files:

- `src/features/control-center/domain/` (create new files)
- `src/features/control-center/application/projectCollection.ts` (move/delete)
- `src/features/control-center/domain/projectCollection.ts` (create by move)
- `src/features/control-center/domain/projectCollection.test.ts` (move/update)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (import path only)
- `src/features/control-center/types.ts` (read only — source of truth for `ProjectStatus` type)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/ui/` (does not exist yet)

Implementation TODO:

1. Create `src/features/control-center/domain/` directory.
2. Create `src/features/control-center/domain/projectStatus.ts`:
   - Define one exhaustive `STATUS_CLASSIFICATION` using
     `satisfies Record<ProjectStatus, StatusClassification>`.
   - Derive `ACTIVE_STATUSES`, `OPEN_READY_STATUSES`, `STARTUP_TERMINAL_STATUSES`, and
     `STOPPABLE_STATUSES` as readonly sets from that map; do not hand-maintain both map
     and set literals.
   - Define `isActiveProject(status)`, `isOpenReadyProject(status)`, `isStartupTerminalFailure(status)`.
   - A new status must produce a type error until every classification field is specified.
3. Move `application/projectCollection.ts` and its test to `domain/`.
4. Update the moved collection module to import `ACTIVE_STATUSES` from
   `domain/projectStatus.ts` instead of its own Set.
5. Update all current imports, including the screen's import path, without changing
   screen markup or behavior; do not leave an application compatibility wrapper.
6. Add unit tests for every classification function and collection behavior.

Contracts:

- `ProjectStatus` type remains in `types.ts` (not moved — domain imports it).
- All classification functions must be pure and testable without React.
- Adding a new status to `ProjectStatus` union must cause a type error in classification functions.

Tests to add or update:

- `domain/projectStatus.test.ts`: exhaustive status coverage, every classification function.
- `domain/projectCollection.test.ts`: preserve search, sort, undefined-port, and
  non-mutation coverage after the move.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
```

Success criteria:

- `domain/projectStatus.ts` exists with all classification functions.
- `domain/projectCollection.ts` is the only runtime owner of filter/sort.
- `application/projectCollection.ts` no longer exists after the move.
- All tests pass.
- TypeScript exhaustive check on `ProjectStatus` works.

Fallback if not achieved:

- If exhaustive type-level classification is difficult, add a runtime table only as
  diagnostic coverage. Runtime-only coverage does not satisfy the compile-failure
  criterion; keep P02 `BLOCKED` until the exhaustive type contract exists.
- If `projectCollection.ts` cannot be migrated while preserving its tests, mark P02 `BLOCKED`.

Stop conditions:

- Must not modify UI behavior, markup, or scripts. The legacy screen may change only its
  `projectCollection` import path.
- Must not change `ProjectStatus` type definition.

Handoff:

- Files changed: `src/features/control-center/domain/projectStatus.ts`,
  `src/features/control-center/domain/projectStatus.test.ts`,
  `src/features/control-center/domain/projectCollection.ts`,
  `src/features/control-center/domain/projectCollection.test.ts`, and the allowed
  import-only change in `ControlCenterScreen.tsx`; old application paths are moved, not wrapped.
- Validation: tests and lint pass; typecheck remains BLOCKED by forbidden `ProjectCard.tsx` legacy import.
- No next phase: P03 and P04 must remain pending until P02 consumer scope is corrected.

---

### Phase P03 — Domain Action Policy

Status:

- PASS

Objective:

- Buat `domain/projectActionPolicy.ts` dengan `canStartProject`, `canStopProject`, `canQuickKillProject`, dan function terkait, hilangkan policy duplikasi dari component.

Why now:

- Policy logic tersebar di `ProjectCard.tsx`, `ControlCenterScreen.tsx`, dan `useProjectManager.ts`. Perlu satu source of truth sebelum UI extraction.

Preconditions:

- P02 PASS.

Allowed files:

- `src/features/control-center/domain/` (create new files)
- `src/features/control-center/domain/projectStatus.ts` (read)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/ui/` (does not exist yet)
- `src/features/control-center/components/ProjectCard.tsx` (will be updated later — do not modify yet)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (will be updated later — do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/domain/projectActionPolicy.ts`:
   - Define `ProjectActionContext = { status: ProjectStatus; managed: boolean; pending: boolean }`.
   - Implement `canStartProject(context)`: true only when not pending, not managed, and
     status is stopped or error.
   - Implement `canStopProject(context)`: true only when not pending, managed, and status
     belongs to the explicit stoppable status family.
   - Implement `canQuickKillProject(context)`: delegates to the same managed/stoppable
     invariant; presentation location does not change permission.
   - Implement `isActiveProject(status)`: delegates to `projectStatus.ts`.
   - Implement `isOpenReadyProject(status)`: running or external.
2. Add unit tests for every policy function with all status combinations.

Contracts:

- Policy functions must be pure and testable without React.
- `canStartProject` must not check `project.url` — that is a presenter concern.
- `canQuickKillProject` must not check `pendingActions` map — that is a controller concern (receives `pending` in context).
- External is never stoppable; managed `not-found` remains stoppable so the tombstone can
  be cleaned.

Tests to add or update:

- `domain/projectActionPolicy.test.ts`: exhaustive status coverage for each policy
  function, pending true/false, managed true/false, external cannot stop, and managed
  not-found can stop/quick-kill.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
```

Success criteria:

- `domain/projectActionPolicy.ts` exists with all policy functions.
- Tests cover all 9 statuses for each policy function.
- Policy functions are imported from domain, not defined inline.

Fallback if not achieved:

- If exhaustive status test is too verbose, use `it.each` parameterized test.

Stop conditions:

- Must not modify UI files or scripts.
- Must not modify `ProjectCard.tsx` or `ControlCenterScreen.tsx`.

Validation evidence (2026-07-24):

- Created `src/features/control-center/domain/projectActionPolicy.ts` with pure
  `ProjectActionContext`, start/open/stop/quick-kill decisions, pending guard, ownership
  guard, and delegation to P02 status classification.
- External status is never stoppable; managed `not-found` remains stoppable.
- `src/features/control-center/domain/projectActionPolicy.test.ts` uses table-driven tests:
  93 targeted assertions cover all 9 statuses, ownership, pending, start, open, stop, and
  quick-kill behavior.
- `npm run format:check` **PASS**.
- `npm run lint` **PASS**.
- `npm run typecheck` **PASS**.
- `npx vitest run src/features/control-center/domain/projectActionPolicy.test.ts --maxWorkers=2`
  **PASS**: 1 file, 93 tests.
- `npm run test -- --maxWorkers=2` **PASS**: 10 files, 160 tests.
- `npm run build` **PASS**; existing chunk-size warning only.
- `npx --yes antd lint src --format json` **PASS**: 0 issues.

Blocker:

- None.

Handoff:

- Files changed: `src/features/control-center/domain/projectActionPolicy.ts`,
  `src/features/control-center/domain/projectActionPolicy.test.ts`, and this evidence block.
- Existing consumer inline policy remains unchanged by design; P03 forbids UI/controller
  migration. Downstream consumer migration remains pending for its owning phases.
- P04 was pending at the time of this P03 handoff and was completed in the subsequent P04
  execution. P05 remains pending.

---

### Phase P04 — View-Model Contracts

Status:

- PASS

Implementation/evidence (2026-07-24):

- Replaced the duplicate view-model declarations with one contract source in
  `application/view-models.ts`.
- View models now expose semantic status/alert/tag keys and tones, dynamic values, stable
  `actionId` values, readonly collections, and a real loading/empty/ready discriminated
  union.
- `MAX_RENDERED_LOG_LINES = 80` is centralized in `presentationLimits.ts`; the presenter
  keeps the newest 80 log lines and exposes truncation metadata.
- Card, toolbar, grid, header, and root presenters are pure and do not import UI definitions,
  React, AntD, fetch, window, scripts, or concrete adapters.
- Card and toolbar actions use stable IDs and P03 policy results. Pending state no longer
  relies on substring matching or bypasses open/action policy.
- Toolbar exposes active-server items and summary counts. Header no longer invents settings,
  help, title, subtitle, labels, colors, or other static UI copy.
- Added targeted tests for all nine status presentations, action policy combinations,
  pending/loading state, newest-log retention, semantic alerts/tags, active-server items,
  grid states, root composition, and false-positive protection.
- `npx vitest run src/features/control-center/application/presenters --maxWorkers=2`
  **PASS**: 5 files, 43 tests.
- `npm run format:check` **PASS**.
- `npm run lint` **PASS**.
- `npm run typecheck` **PASS**.
- `npm run test -- --maxWorkers=2` **PASS**: 15 files, 203 tests.
- `npm run build` **PASS**; existing chunk-size warning only.
- `npx --yes antd lint src --format json` **PASS**: 0 issues.

Objective:

- Buat view-model types, presenter functions, dan `presentationLimits.ts`.

Why now:

- View-model contract adalah batas antara logic dan UI. Tanpa contract ini, UI extraction (P13–P16) tidak punya target.

Preconditions:

- P03 PASS.

Allowed files:

- `src/features/control-center/application/` (create new files)
- `src/features/control-center/domain/` (read only)
- `src/features/control-center/types.ts` (read only)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/ui/` (does not exist yet)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify yet)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/application/view-models.ts`:
   - `ControlCenterViewModel`, `HeaderViewModel`, `ToolbarViewModel`, `ProjectGridViewModel`, `ProjectCardViewModel`, `CardActionViewModel`, `UiActionViewModel`, `StatusViewModel`, `AlertViewModel`, `TagViewModel`, `TerminalViewModel`.
   - Action view models contain action ID plus availability/loading only; status, alert,
     and tag view models expose semantic keys/values rather than static UI copy.
   - `ControlCenterViewModel` carries `availableActionIds: readonly string[]` from the
     extension host so UI definitions can disable missing handlers without importing
     application modules.
2. Create `src/features/control-center/application/presentationLimits.ts`:
   - `export const MAX_RENDERED_LOG_LINES = 80`.
3. Create `src/features/control-center/application/presenters/createProjectCardViewModel.ts`:
   - Takes `ProjectSummary` + `pending` + `MAX_RENDERED_LOG_LINES`, returns `ProjectCardViewModel`.
   - Handles all 9 statuses as semantic status/alert keys, action
     availability/loading, tag values, and terminal data.
   - Does not own static UI labels, order, or AntD visual props; those belong to UI
     definition files.
   - Truncates logs to `MAX_RENDERED_LOG_LINES`.
4. Create `src/features/control-center/application/presenters/createToolbarViewModel.ts`:
   - Takes projects + search query + sort mode + view mode + pending actions, returns `ToolbarViewModel`.
   - Creates active server items, summary, quick-kill policy.
5. Create `src/features/control-center/application/presenters/createGridViewModel.ts`:
   - Returns `ProjectGridViewModel` with discriminated union (loading/empty/ready).
6. Create `src/features/control-center/application/presenters/createHeaderViewModel.ts`:
   - Returns `HeaderViewModel`.
7. Create `src/features/control-center/application/presenters/createControlCenterViewModel.ts`:
   - Composes header, toolbar, grid, and page alert into one `ControlCenterViewModel`.
8. Add unit tests for every presenter, including the root composition presenter.

Contracts:

- Presenters must be pure functions, no React hooks, no side effects.
- `ProjectCardViewModel` must not contain `ProjectSummary` — UI must not access raw domain data.
- `MAX_RENDERED_LOG_LINES` must be imported, not hardcoded.
- Presenters must not import `ui/` definitions.

Tests to add or update:

- Presenter tests for every status combination, semantic status/alert keys, action
  availability/loading, log truncation, and loading/empty/ready.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
```

Success criteria:

- All view-model types defined.
- All presenters implemented and tested.
- `createControlCenterViewModel` is the only root view-model composition owner.
- `MAX_RENDERED_LOG_LINES` defined and used in presenter.
- No UI files modified.

Fallback if not achieved:

- If view-model types are too many, stage minimal `ProjectCardViewModel` and
  `ControlCenterViewModel` inside P04, but do not mark P04 PASS until every required
  presenter/view-model contract and test is complete.

Stop conditions:

- Must not modify UI files or scripts.
- Must not modify `ProjectCard.tsx` or `ControlCenterScreen.tsx`.

Handoff:

- Files changed: `src/features/control-center/application/view-models.ts`, `src/features/control-center/application/presentationLimits.ts`, `src/features/control-center/application/presenters/*.ts`, `src/features/control-center/application/presenters/*.test.ts`.
- Commands: `npm run typecheck && npm run test && npm run lint` passes.
- Known issue: Presenters are not yet wired to any consumer.
- Next phase: P05.

---

### Phase P05 — HTTP Response Contract

Status:

- PASS

Validation evidence (2026-07-24):

- Created the typed `ProjectManagerClient` port, strict response/error parsers, and HTTP adapter without touching legacy hook, UI, scripts, or apps.
- The adapter preserves the GET read-only endpoint, same-origin POST mutation endpoints, `Accept` header, action-error precedence, status-code GET message, and no retry/timeout/backoff.
- `ProjectManagerRequestError` exposes typed `status`, `action`, `kind`, and `message`; HTTP, network, invalid JSON, malformed payload, and safe non-JSON action-error fallback are distinguishable.
- P05 defines the optional `AbortSignal` contract; P06 owns and now implements forwarding.
- Remediation validation: `npx vitest run src/features/control-center/data --maxWorkers=2` **PASS**: 3 files, 34 tests.
- Canonical gate after remediation **PASS**: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test -- --maxWorkers=2` (23 files, 258 tests), `npm run build`, and `npx --yes antd lint src --format json` (0 issues).

Handoff:

- P05 success criteria are complete. P06, P07, and P08 may begin; no P10 work performed.

Objective:

- Buat `ProjectManagerClient` port, `httpProjectManagerClient` adapter, response parser, dan typed error.

Why now:

- `useProjectManager.ts` calls `fetch()` directly. Adapter abstraction is needed before commands (P09) and cancellation (P06).

Preconditions:

- P04 PASS.

Allowed files:

- `src/features/control-center/data/` (create new files)
- `src/features/control-center/application/ports/` (create new files)
- `src/features/control-center/types.ts` (read only)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/ui/`
- `src/features/control-center/application/useProjectManager.ts` (do not modify yet)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify yet)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/application/ports/ProjectManagerClient.ts`:
   - `interface ProjectManagerClient { list(signal?: AbortSignal): Promise<ProjectSummary[]>; start(projectId: string, signal?: AbortSignal): Promise<void>; stop(projectId: string, signal?: AbortSignal): Promise<void>; }`.
2. Create `src/features/control-center/data/projectManagerResponse.ts`:
   - `parseProjectsResponse(raw: unknown): ProjectSummary[]` — validates minimum shape.
   - `ProjectManagerRequestError` class with `status`, `action`, `message` fields.
   - Fallback for non-JSON error responses.
3. Create `src/features/control-center/data/httpProjectManagerClient.ts`:
   - Implements `ProjectManagerClient`.
   - Uses `fetch`; accepts the port signal but deliberately defers forwarding to P06.
   - Uses `parseProjectsResponse` and `ProjectManagerRequestError`.
   - No retry logic (retry is command policy, not transport).
4. Add unit tests with mocked fetch.

Contracts:

- `ProjectManagerClient` must accept `AbortSignal` (even if not used by the fake adapter).
- P05 must not claim abort propagation; that behavior belongs exclusively to P06.
- `httpProjectManagerClient` must not have retry, timeout, or backoff.
- Error must distinguish between HTTP error, malformed JSON, and non-JSON error.

Tests to add or update:

- `data/httpProjectManagerClient.test.ts`: success, malformed response, non-JSON error,
  and HTTP error. Abort propagation is tested only in P06.
- `data/projectManagerResponse.test.ts`: valid list, missing fields, wrong types.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
```

Success criteria:

- `ProjectManagerClient` port defined.
- `httpProjectManagerClient` implements port with tests.
- `ProjectManagerRequestError` has typed fields.
- Abort forwarding is not part of the P05 gate.
- No UI files modified.

Fallback if not achieved:

- If `parseProjectsResponse` rejects an existing valid payload, document which fields are
  truly optional and relax only those fields. Never pass data missing fields required by
  domain/presenters; otherwise mark P05 `BLOCKED`.

Stop conditions:

- Must not modify scripts or UI files.

Handoff:

- Files changed: `src/features/control-center/application/ports/ProjectManagerClient.ts`, `src/features/control-center/data/projectManagerResponse.ts`, `src/features/control-center/data/httpProjectManagerClient.ts`, test files.
- Commands: `npm run typecheck && npm run test && npm run lint` passes.
- Known issue: Adapter is not yet wired to any consumer.
- Next phases: P06, P07, P08 (parallel).

---

### Phase P06 — Cancellation and Request Lifecycle

Status:

- PASS

Validation evidence (2026-07-24):

- Forwarded optional `AbortSignal` through every list/start/stop `fetch` request while retaining GET/POST, same-origin URLs, and `Accept` header behavior.
- Added typed `cancelled` request-error classification, distinct from network, HTTP, invalid JSON, and malformed-response failures.
- Tests prove signal forwarding, fetch-level abort classification, body-read abort classification, custom abort reasons, and completed results remaining unchanged after a later abort.
- Scope remains transport-only: no controller, UI, stale-response sequencing, polling overlap, cleanup, or unmount-state work was added; P12 retains those concerns.
- Remediation validation **PASS**: targeted data tests (3 files, 34 tests) and the canonical full gate (23 files, 258 tests).

Handoff:

- P06 success criteria are complete. P07 may begin; P10 work has not started.

Objective:

- Tambahkan transport-only `AbortSignal` forwarding pada adapter dan pertahankan
  abort sebagai transport cancellation, bukan page error.

Why now:

- Depends on P05. Controller lifecycle, stale responses, and polling overlap belong exclusively to P12.

Preconditions:

- P05 PASS.

Allowed files:

- `src/features/control-center/data/` (modify)
- `src/features/control-center/application/ports/` (modify)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/ui/`
- `src/features/control-center/application/useProjectManager.ts` (do not modify yet)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify yet)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Update `httpProjectManagerClient.ts` to forward `AbortSignal` to `fetch`.
2. Create test for abort behavior: abort before response rejects with a cancellation
   classification; abort after response does not change a completed result.
3. Test adapter abort propagation only; application/page-error classification belongs to P12.

Contracts:

- Adapter must preserve enough information for P12 to identify cancellation.
- `AbortController.abort()` must cancel in-flight requests.
- No request sequencing, polling, state, or component lifecycle logic exists in this phase.

Tests to add or update:

- `data/httpProjectManagerClient.test.ts`: abort scenarios.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
```

Success criteria:

- `AbortSignal` forwarded to all fetch calls.
- Abort tests pass.
- No modification to UI files.

Fallback if not achieved:

- No fallback. If transport abort propagation cannot be proven, mark P06 `BLOCKED`.

Stop conditions:

- Must not modify scripts or UI files.

Handoff:

- Files changed: `src/features/control-center/data/httpProjectManagerClient.ts`, test files.
- Commands: `npm run typecheck && npm run test && npm run lint` passes.
- Next phase: P09 (after P07 and P08 also pass).

---

### Phase P07 — Startup Readiness Policy

Status:

- PASS

Validation evidence (2026-07-24):

- Created pure injected `StartupReadinessPolicy` and `StartupReadinessRunner` with the legacy default of 40 attempts × 750 ms.
- `waitUntilReady` returns only ready projects, terminates immediately on terminal status, reports configured timeout metadata through `StartupReadinessTimeoutError`, and stops reads after abort.
- Default sleep uses platform-neutral `globalThis` timers, removes its abort listener on completion, and rejects with the typed `StartupReadinessCancelledError`; its headless cancellation and timer cleanup are covered directly.
- Targeted command suite after remediation: `npx vitest run src/features/control-center/application/commands --maxWorkers=2` **PASS**: 5 files, 21 tests.
- Canonical full gate after remediation **PASS**: 23 files, 258 tests; build and AntD lint also pass.

Handoff:

- P07 success criteria are complete. P08 may begin; P10 work has not started.

Objective:

- Pisahkan startup retry logic dari browser effect, buat injected sleep/timing.

Why now:

- `useProjectManager.ts` has inline startup retry (40 × 750ms) mixed with waiting-tab. Must be extracted before commands (P09).

Preconditions:

- P05 PASS.

Allowed files:

- `src/features/control-center/application/commands/` (create new files)
- `src/features/control-center/application/ports/` (read only)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/ui/`
- `src/features/control-center/application/useProjectManager.ts` (do not modify yet)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify yet)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/application/commands/startupReadinessPolicy.ts`:
   - `interface StartupReadinessPolicy { maximumAttempts: number; delayMilliseconds: number; sleep(ms: number, signal?: AbortSignal): Promise<void>; }`.
   - Add `waitUntilReady(input)` runner that receives `readStatus`, `isReady`,
     `isTerminalFailure`, and `signal`.
   - Default sleep must be signal-aware and reject with a cancellation error when
     aborted.
2. Add unit tests with injected fake sleep/status reader (no real 30-second wait).
3. Test success, timeout, terminal failure, and abort scenarios against the runner.

Contracts:

- Default must match current behavior: 40 attempts × 750ms = 30 seconds.
- Test must use injected fake sleep to avoid real delays.
- `waitUntilReady` must stop reading and sleeping after abort.
- Policy must be separate from browser window logic.

Tests to add or update:

- `application/commands/startupReadinessPolicy.test.ts`: success, timeout, terminal failure, abort.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
```

Success criteria:

- `StartupReadinessPolicy` and `waitUntilReady` exist with signal-aware default sleep.
- Tests pass with fake timers.
- No real 30-second wait in tests.

Fallback if not achieved:

- If fake timer test is flaky, use `vi.useFakeTimers` with `vi.advanceTimersByTime`.

Stop conditions:

- Must not modify scripts or UI files.

Handoff:

- Files changed: `src/features/control-center/application/commands/startupReadinessPolicy.ts`, test file.
- Commands: `npm run typecheck && npm run test && npm run lint` passes.
- Next phase: P09 (after P06 and P08 also pass).

---

### Phase P08 — Browser Window Adapter

Status:

- PASS

Validation evidence (2026-07-24):

- Created `ProjectWindow`/`PreparedProjectWindow` port and `browserProjectWindow` adapter.
- Adapter exclusively owns synchronous `window.open`, named blank waiting tab, legacy waiting copy/style, protected new-tab open, redirect/close exposure, and popup-blocked `undefined` result.
- It contains no status, retry, readiness, or controller logic.
- Targeted: `npx vitest run src/features/control-center/data/browserProjectWindow.test.ts --maxWorkers=2` **PASS**: 1 file, 4 tests.
- Validation **PASS**: `npm run format:check`, `npm run typecheck`, `npm run test -- --maxWorkers=2` (19 files, 239 tests), `npm run lint`.

Handoff:

- P08 success criteria are complete. P09 may begin because P06, P07, and P08 are PASS; P10 work has not started.

Objective:

- Buat `ProjectWindow` port dan `browserProjectWindow` adapter, pindahkan waiting-tab, open, redirect, close.

Why now:

- `useProjectManager.ts` has `window.open` and waiting-tab logic mixed with business logic. Must be extracted before commands (P09).

Preconditions:

- P05 PASS.

Allowed files:

- `src/features/control-center/application/ports/` (create new files)
- `src/features/control-center/data/` (create new files)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/ui/`
- `src/features/control-center/application/useProjectManager.ts` (do not modify yet)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify yet)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/application/ports/ProjectWindow.ts`:
   - `interface PreparedProjectWindow { opener: null; close(): void; location: { replace(url: string): void }; }`.
   - `interface ProjectWindow { prepare(project: ProjectSummary): PreparedProjectWindow | undefined; open(url: string): void; }`.
2. Create `src/features/control-center/data/browserProjectWindow.ts`:
   - Implements `ProjectWindow`.
   - `prepare`: calls `window.open('about:blank', ...)`, sets waiting page content.
   - `open`: calls `window.open(url, '_blank', 'noopener,noreferrer')`.
3. Add unit tests with mocked `window.open`.

Contracts:

- `ProjectWindow` must not have business logic (no retry, no status check).
- `prepare` must return `undefined` if `window.open` returns `null` (popup blocked).
- Adapter must be testable without browser via adapter double.

Tests to add or update:

- `data/browserProjectWindow.test.ts`: open, prepare, popup blocked, close, redirect.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
```

Success criteria:

- `ProjectWindow` port defined.
- `browserProjectWindow` adapter implements port with tests.
- No UI files modified.

Fallback if not achieved:

- If `window.open` mock is complex, test adapter with `vi.stubGlobal` for `window.open`.

Stop conditions:

- Must not modify scripts or UI files.

Handoff:

- Files changed: `src/features/control-center/application/ports/ProjectWindow.ts`, `src/features/control-center/data/browserProjectWindow.ts`, test files.
- Commands: `npm run typecheck && npm run test && npm run lint` passes.
- Next phase: P09 (after P06 and P07 also pass).

---

### Phase P09 — Core Commands

Status:

- PASS

Validation evidence (2026-07-24):

- Created framework-agnostic, dependency-injected refresh, start/open, stop, and quick-kill commands; none call `fetch`, `window.open`, `setTimeout`, React, or UI directly.
- `refreshProjects` forwards cancellation. Start/open uses domain readiness/start policies and injected ports, opens ready URLs without mutation, blocks invalid/ineligible projects before client access, redirects prepared tabs on readiness, falls back after popup block, and closes prepared tabs on failure/abort.
- Stop and quick-kill apply domain policy before forwarding to the same stop transport; managed `not-found` remains quick-killable and external projects remain protected.
- The cancellation test now performs a real abort, proves the same signal reaches readiness, and verifies the prepared tab closes.
- Targeted: `npx vitest run src/features/control-center/application/commands --maxWorkers=2` **PASS**: 5 files, 21 tests.
- Required full gate **PASS**: `npm run format:check`; `npm run lint`; `npm run typecheck`; `npm run test -- --maxWorkers=2` (23 files, 258 tests); `npm run build`; `npx --yes antd lint src --format json` (0 issues).

Warnings:

- Vite reports the pre-existing generated JS chunk above 500 kB. Build succeeds; no P05-P09 code splitting scope added.
- AntD CLI reports an available 6.5.2 update. No dependency update performed.

Handoff:

- P09 success criteria are complete. P10 has not been started by instruction.

Objective:

- Ekstrak refresh, start/open, stop, quick-kill commands menggunakan ports, domain policy, dan adapters.

Why now:

- Command adalah action boundary antara controller dan ports. Wajib sebelum extension host (P10) dan controller (P12).

Preconditions:

- P06 PASS, P07 PASS, P08 PASS.

Allowed files:

- `src/features/control-center/application/commands/` (create new files)
- `src/features/control-center/application/ports/` (read only)
- `src/features/control-center/domain/` (read only)
- `src/features/control-center/application/presenters/` (read only)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/ui/`
- `src/features/control-center/application/useProjectManager.ts` (do not modify yet)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify yet)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/application/commands/refreshProjects.ts`:
   - `async function refreshProjects(client: ProjectManagerClient, signal?: AbortSignal): Promise<ProjectSummary[]>`.
   - Calls `client.list(signal)`, returns projects.
2. Create `src/features/control-center/application/commands/startAndOpenProject.ts`:
   - Use an object input containing `project`, `pending`, `client`, `window`,
     `readiness`, optional `signal`, and abort-aware `refresh`.
   - If already running/external with URL → open.
   - Else validate `canStartProject`; an ineligible project must not call the client.
   - When eligible → prepare waiting tab, call client.start, poll readiness, on success
     redirect, on failure/abort close the waiting tab.
3. Create `src/features/control-center/application/commands/stopProject.ts`:
   - Use an object input containing `project`, `pending`, `client`, and optional `signal`.
   - Calls `client.stop(project.id, signal)`.
4. Create `src/features/control-center/application/commands/quickKillProject.ts`:
   - Use the same project/pending/client/signal input contract as stop.
   - Calls `client.stop(project.id, signal)`.
5. Add unit tests with fake adapters.

Contracts:

- Commands must not call `fetch`, `window.open`, or `setTimeout` directly — use injected ports.
- Commands must not have React state or hooks.
- `startAndOpenProject` must use injected `StartupReadinessRunner` for timing and pass
  its signal to every refresh/readiness operation.
- Start/open must enforce `canStartProject` or `isOpenReadyProject`; invalid/ineligible
  status never reaches the client.
- Stop and quick-kill must enforce the domain action policy before calling the client.

Tests to add or update:

- `application/commands/refreshProjects.test.ts`, `startAndOpenProject.test.ts`, `stopProject.test.ts`, `quickKillProject.test.ts`.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
```

Success criteria:

- All 4 commands implemented and tested with fake adapters.
- No UI files modified.
- Commands are framework-agnostic, dependency-injected orchestration functions, not hooks;
  their side effects occur only through injected ports.

Fallback if not achieved:

- If `startAndOpenProject` is too complex, split into `startProject` (without open) and `openProject` (separate command).

Stop conditions:

- Must not modify scripts or UI files.

Handoff:

- Files changed: `src/features/control-center/application/commands/refreshProjects.ts`, `startAndOpenProject.ts`, `stopProject.ts`, `quickKillProject.ts`, test files.
- Commands: `npm run typecheck && npm run test && npm run lint` passes.
- Next phase: P10.

---

### Phase P10 — Extension Contract and Host

Status:

- PASS

Validation evidence (2026-07-28):

- Added typed extension contracts, configuration validation, stable sorted/frozen action IDs, structured unknown-action and action-failure results, plus failure isolation through `reportError`.
- Added eager `import.meta.glob('./modules/*/index.ts', { eager: true, import: 'default' })` discovery with deterministic path ordering and injectable module maps for tests.
- Targeted host/loader validation **PASS**: 1 file, 7 tests; typecheck and lint **PASS**.
- No UI, scripts, apps, legacy hook, card, or screen files were modified.

Handoff result:

- P10 success criteria are complete; no fallback was used. P11 was allowed to begin.

Objective:

- Buat extension contract, validation, dan host.

Why now:

- Extension host dibutuhkan sebelum core extensions (P11) dan controller (P12).

Preconditions:

- P09 PASS.

Allowed files:

- `src/features/control-center/application/extensions/` (create new files)
- `src/features/control-center/application/commands/` (read only)
- `src/features/control-center/application/ports/` (read only)
- `src/features/control-center/domain/` (read only)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/ui/`
- `src/features/control-center/application/useProjectManager.ts` (do not modify yet)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify yet)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/application/extensions/contracts.ts`:
   - `ControlCenterExtension`, `ControlCenterAction`, `ControlCenterActionContext`,
     `ExtensionDispatchResult`.
   - Context exposes only `refresh`, `startAndOpen`, `stop`, `quickKill`, `setPending`,
     and `reportError`; it does not expose raw ports.
2. Create `src/features/control-center/application/extensions/createExtensionHost.ts`:
   - `createExtensionHost(extensions, context)`.
   - Validates: schemaVersion, unique IDs, action IDs, action functions.
   - Returns `{ dispatch(actionId, payload): Promise<ExtensionDispatchResult>; actionIds: string[] }`.
3. Create `src/features/control-center/application/extensions/loadExtensions.ts`:
   - `loadExtensions(imports = discoveredModules): ControlCenterExtension[]`.
   - `discoveredModules` is the eager `import.meta.glob('./modules/*/index.ts')` result;
     tests inject a controlled module map through the optional argument.
4. Add unit tests for validation, duplicate IDs, unknown action, and error isolation.

Contracts:

- Extension action must not receive `ProjectManagerClient` or `ProjectWindow` directly —
  it receives only high-level `ControlCenterActionContext` capabilities.
- Error in one extension must not crash the host.
- Unknown action ID and extension failure must return a structured result, not throw
  through the controller.

Tests to add or update:

- `application/extensions/createExtensionHost.test.ts`: valid, duplicate, unsupported
  schema, invalid action, unknown action, error isolation.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
```

Success criteria:

- Extension contract, host, and loader implemented.
- Validation tests pass.
- Error isolation proven.
- Host publishes a stable `actionIds` list for later UI-definition reconciliation.

Fallback if not achieved:

- If `import.meta.glob` typing is difficult, an explicit array may be used only as a
  temporary diagnostic. It cannot satisfy P10/P11 plug-and-play criteria; keep P10
  `BLOCKED` until discovery works or the canonical architecture is explicitly revised.

Stop conditions:

- Must not modify scripts or UI files.

Handoff:

- Files changed: `src/features/control-center/application/extensions/contracts.ts`, `createExtensionHost.ts`, `loadExtensions.ts`, test files.
- Commands: `npm run typecheck && npm run test && npm run lint` passes.
- Next phase: P11.

---

### Phase P11 — Extension Loader and Core Modules

Status:

- PASS

Validation evidence (2026-07-28):

- Added the three auto-discovered core modules: `project-refresh`, `project-lifecycle`, and `quick-kill`.
- Discovery resolves all modules without an explicit production registry and publishes exactly `project.refresh`, `project.start-open`, `project.stop`, and `project.quick-kill`.
- Modules use only high-level context capabilities, validate project-ID payloads before invocation, and do not import sibling modules, UI, shell, PID, scripts, or raw ports.
- Targeted extension validation **PASS**: 4 files, 14 tests; typecheck and lint **PASS**.

Handoff result:

- P11 success criteria are complete; no fallback was used. P12 was allowed to begin.

Objective:

- Buat 3 core extension modules (refresh, lifecycle, quick-kill) menggunakan `import.meta.glob`.

Why now:

- Core extensions dibutuhkan sebelum controller (P12) dan setelah extension host (P10).

Preconditions:

- P10 PASS.

Allowed files:

- `src/features/control-center/application/extensions/modules/` (create new files)
- `src/features/control-center/application/extensions/` (read only)
- `src/features/control-center/application/commands/` (read only)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/ui/`
- `src/features/control-center/application/useProjectManager.ts` (do not modify yet)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify yet)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/application/extensions/modules/project-refresh/index.ts`:
   - Action `project.refresh`: calls `context.refresh()`.
2. Create `src/features/control-center/application/extensions/modules/project-lifecycle/index.ts`:
   - Actions `project.start-open`, `project.stop`: call the corresponding high-level
     context capabilities backed by P09 commands.
3. Create `src/features/control-center/application/extensions/modules/quick-kill/index.ts`:
   - Action `project.quick-kill`: calls `context.quickKill()`.
4. Add unit tests for each module.

Contracts:

- Modules must not import sibling modules.
- Modules must not import UI.
- Modules must not access shell/PID API.

Tests to add or update:

- `application/extensions/modules/project-refresh/index.test.ts`, `project-lifecycle/index.test.ts`, `quick-kill/index.test.ts`.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
```

Success criteria:

- 3 core extension modules implemented and tested.
- `import.meta.glob` pattern works for discovery.
- No UI files modified.

Fallback if not achieved:

- If `import.meta.glob` resolution fails, an explicit array may isolate the problem but
  cannot satisfy auto-discovery. Record evidence and mark P11 `BLOCKED`.

Stop conditions:

- Must not modify scripts or UI files.

Handoff:

- Files changed: 3 extension module folders with `index.ts` and test files.
- Commands: `npm run typecheck && npm run test && npm run lint` passes.
- Next phase: P12.

---

### Phase P12 — Controller

Status:

- PASS

Validation evidence (2026-07-28):

- Added the only concrete composition boundary for HTTP/browser adapters, P09 commands, readiness policy, P10 host, and P11 modules.
- Added a single controller state owner producing only `{ viewModel, dispatch }`, with initial loading, 1500 ms polling, single-flight overlap prevention, monotonic request sequencing, stale-response rejection, refresh/action controllers, per-project pending state, and local search/sort/view reducers.
- Cancellation does not create page error; unmount clears polling, aborts active refresh plus startup/stop/quick-kill actions, and guards late state updates.
- Tests cover composition wiring, initial/loading state, polling overlap, stale response, refresh abort, pending start/stop/quick-kill, action cleanup, startup timeout, direct open, error recovery, local reducer state, and unmount cleanup.
- Targeted composition/controller validation **PASS**: 2 files, 14 tests.
- Canonical full gate **PASS**: format, lint, typecheck, 29 files/286 tests, build, and AntD lint with 0 issues.
- No UI, scripts, apps, legacy hook, card, or screen files were modified.

Handoff result:

- P12 success criteria are complete; no fallback was used. P13, P14, and P16 may begin; P15 waits for P16.

Objective:

- Buat `useControlCenterController` dengan state ownership, polling, pending state, request sequence, stale-response protection, abort/unmount cleanup, dan view-model composition.

Why now:

- Controller adalah jembatan antara commands/extensions dan UI. Wajib sebelum UI extraction (P13–P16).

Preconditions:

- P11 PASS.

Allowed files:

- `src/features/control-center/application/controller/` (create new files)
- `src/features/control-center/application/composition/` (create new files)
- `src/features/control-center/application/commands/` (read only)
- `src/features/control-center/application/extensions/` (read only)
- `src/features/control-center/application/presenters/` (read only)
- `src/features/control-center/application/ports/` (read only)
- `src/features/control-center/data/` (read only)
- `src/features/control-center/domain/` (read only)
- `src/features/control-center/application/view-models.ts` (read only)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/ui/`
- `src/features/control-center/application/useProjectManager.ts` (do not modify yet)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify yet)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/application/composition/createControlCenterRuntime.ts`:
   - Assemble concrete HTTP/browser adapters, P09 commands, P10 host, and P11 modules.
   - Expose only the `ControlCenterRuntime` contract consumed by the controller.
   - This is the only composition boundary allowed to import concrete data adapters.
2. Create `src/features/control-center/application/controller/useControlCenterController.ts`:
   - State: projects, loading, pageError, pendingActions, searchQuery, sortMode, viewMode.
   - Polling: `setInterval` with 1500ms; prevent overlapping polls.
   - Request sequence: monotonically increasing counter; stale response must not update state.
   - Lifecycle: own an `AbortController` per in-flight refresh and a collection of
     action controllers; cleanup aborts all of them and clears the interval on unmount.
   - `dispatch(actionId, payload)`: maps to extension actions.
   - Combines host `actionIds` with the fixed local reducer action IDs for
     search/sort/view into `ControlCenterViewModel.availableActionIds`.
   - Returns `{ viewModel: ControlCenterViewModel, dispatch }`.
3. Add integration tests with fake runtime/ports.

Contracts:

- Controller must produce a single `ControlCenterViewModel`.
- Controller must not expose raw `ProjectSummary[]` to UI.
- Stale responses must be discarded.
- Abort must not set page error.
- Polling must not overlap refreshes.
- Startup readiness, stop, and quick-kill actions are cancelled on unmount.
- No state update may occur after unmount.

Tests to add or update:

- `application/controller/useControlCenterController.test.ts`: initial loading, polling
  refresh and overlap prevention, unmount cleanup, stale response, refresh abort without
  page error, startup abort, stop abort, quick-kill abort, pending state, start/open,
  stop, quick kill, error reset, search/sort/view state.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
```

Success criteria:

- `useControlCenterController` implemented and tested.
- `createControlCenterRuntime` assembles concrete dependencies without leaking them to UI.
- View model produced correctly.
- No UI files modified.

Fallback if not achieved:

- If integration setup is complex, use a controlled fake runtime; coverage for stale
  response, overlap prevention, refresh abort, action abort, and unmount cleanup remains
  mandatory. Otherwise mark P12 `BLOCKED`.

Stop conditions:

- Must not modify scripts or UI files.

Handoff:

- Files changed: `src/features/control-center/application/composition/createControlCenterRuntime.ts`,
  `src/features/control-center/application/controller/useControlCenterController.ts`, test files.
- Commands: `npm run typecheck && npm run test && npm run lint` passes.
- Next phases: P13, P14, and P16 may run in parallel; P15 waits for P16.

---

### Phase P13 — Header UI

Status:

- PASS

Validation evidence (2026-07-28):

- Added declarative header title, subtitle, action order, labels, accessible names, visual kind, and stable action IDs in `ui/header/headerDefinition.ts`.
- `ControlCenterHeader` reads only `HeaderViewModel`, reconciles handler availability through `availableActionIds`, and forwards the declared action ID through `onAction`.
- Missing handlers and view-model-disabled actions remain visible and disabled.
- Targeted validation **PASS**: 1 file, 4 tests.
- Phase gate **PASS**: typecheck, lint, 30 files/290 tests, and build.
- Legacy screen, legacy card, scripts, apps, controller, and application source were not modified.

Handoff result:

- P13 success criteria are complete; no fallback was used. P17 still waits for P14 and P15.

Objective:

- Buat `ui/header/` dengan `ControlCenterHeader.tsx` dan `headerDefinition.ts`.

Why now:

- Header adalah area UI pertama yang diekstrak dari `ControlCenterScreen.tsx`.

Preconditions:

- P12 PASS.

Allowed files:

- `src/features/control-center/ui/header/` (create new files)
- `src/features/control-center/application/view-models.ts` (read only)
- `src/features/control-center/application/controller/` (read only)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/application/useProjectManager.ts` (do not modify)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/ui/header/headerDefinition.ts`:
   - `HeaderActionDefinition[]` with id, label, actionId, kind, order.
2. Create `src/features/control-center/ui/header/ControlCenterHeader.tsx`:
   - Receives `HeaderViewModel`, `availableActionIds`, and
     `onAction: (actionId: string) => void`.
   - Renders title, subtitle, and action buttons based on definition.
   - Keeps a missing-handler action visible but disabled.
3. Create `src/features/control-center/ui/header/ControlCenterHeader.css`:
   - Local styles only. Use AntD/component-local values during extraction; cross-area
     layout variables are wired in P17 so this phase does not reference undefined tokens.
4. Add component tests.

Contracts:

- Header must not call `dispatch`, `fetch`, or `window.open`.
- Header must not read `ProjectSummary` directly.
- All actions go through `onAction` callback.
- Missing handlers are disabled through `availableActionIds`; Header does not import the
  extension host.

Tests to add or update:

- `ui/header/ControlCenterHeader.test.tsx`: renders definition order, dispatches action
  ID, disables an action whose handler is unavailable.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
```

Success criteria:

- Header UI component implemented and tested.
- No modification to `ControlCenterScreen.tsx` yet.

Fallback if not achieved:

- Preserve existing CSS temporarily; do not add inline styles. If local CSS extraction cannot meet the phase criteria, mark P13 `BLOCKED`.

Stop conditions:

- Must not modify scripts or other UI areas.

Handoff:

- Files changed: `src/features/control-center/ui/header/ControlCenterHeader.tsx`, `headerDefinition.ts`, CSS, test file.
- Commands: `npm run typecheck && npm run test && npm run lint && npm run build` passes.
- Next phase: P17 (after P14, P15, P16 also pass).

---

### Phase P14 — Toolbar UI

Status:

- PASS

Validation evidence (2026-07-28):

- Added declarative search, sort, grid/list, refresh, active-server dropdown, summary, order, grouping, responsive priority, accessible labels, and stable action IDs in `ui/toolbar/toolbarDefinition.ts`.
- `ProjectToolbar` is controlled entirely by `ToolbarViewModel`; it has no local business state, policy, fetch, window, polling, or extension-host import.
- Search, sort, view, refresh, and quick-kill forward their unchanged action IDs and payloads; quick-kill forwards the selected project ID string.
- Missing handlers remain visible and disabled, including the active-server dropdown.
- Targeted validation **PASS**: 1 file, 5 tests.
- Phase gate **PASS**: typecheck, lint, 31 files/295 tests, and build.
- Legacy screen, legacy card, scripts, apps, controller, and application source were not modified.

Handoff result:

- P14 success criteria are complete; no fallback was used. P17 still waits for P15.

Objective:

- Buat `ui/toolbar/` dengan `ProjectToolbar.tsx` dan `toolbarDefinition.ts`.

Why now:

- Toolbar adalah area UI kedua yang diekstrak dari `ControlCenterScreen.tsx`.

Preconditions:

- P12 PASS.

Allowed files:

- `src/features/control-center/ui/toolbar/` (create new files)
- `src/features/control-center/application/view-models.ts` (read only)
- `src/features/control-center/application/controller/` (read only)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/application/useProjectManager.ts` (do not modify)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/ui/toolbar/toolbarDefinition.ts`:
   - `ToolbarControlDefinition[]` for search, sort, grid/list, refresh, quick-server dropdown, summary.
2. Create `src/features/control-center/ui/toolbar/ProjectToolbar.tsx`:
   - Receives `ToolbarViewModel`, `availableActionIds`, and
     `onAction: (actionId: string, payload?: unknown) => void`.
   - Renders controls based on definition.
   - Keeps a missing-handler control visible but disabled.
3. Create `src/features/control-center/ui/toolbar/ProjectToolbar.css`:
   - Local styles only.
4. Add component tests.

Contracts:

- Toolbar must not compute policy (quick-kill eligibility, active server list).
- Toolbar must not have `useState` for search/sort/view — these are managed by controller.
- Toolbar must not call `fetch`, `window.open`, or polling.
- Toolbar reconciles definition IDs only against `availableActionIds`; it does not import
  the extension host or compute domain policy.

Tests to add or update:

- `ui/toolbar/ProjectToolbar.test.tsx`: renders definition order, dispatches action ID and
  payload, disables a control whose handler is unavailable.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
```

Success criteria:

- Toolbar UI component implemented and tested.
- No modification to `ControlCenterScreen.tsx` yet.

Fallback if not achieved:

- Preserve existing CSS temporarily; do not add inline styles. If the existing quick-server behavior cannot be retained, mark P14 `BLOCKED`.

Stop conditions:

- Must not modify scripts or other UI areas.

Handoff:

- Files changed: `src/features/control-center/ui/toolbar/ProjectToolbar.tsx`, `toolbarDefinition.ts`, CSS, test file.
- Commands: `npm run typecheck && npm run test && npm run lint && npm run build` passes.
- Next phase: P17 (after P13, P15, P16 also pass).

---

### Phase P15 — Grid UI

Status:

- PASS

Validation evidence (2026-07-28):

- Added definition-owned skeleton count, loading/empty copy, accessible layout labels, available layout modes, and the `view-model-order` presentation contract in `ui/grid/gridDefinition.ts`.
- `ProjectGrid` renders only the discriminated loading, empty, or ready branch supplied by `ProjectGridViewModel`.
- Ready state renders the peer pure `ui/card/ProjectCard` and forwards `availableActionIds`, action IDs, and payloads unchanged.
- Grid owns collection scrolling and supports both grid and list CSS modes without raw `ProjectSummary` or policy access.
- Targeted validation **PASS**: 1 file, 5 tests.
- Phase gate **PASS**: typecheck, lint, 34 files/308 tests, and build.
- Legacy screen, legacy card, scripts, apps, controller, and application source were not modified.

Handoff result:

- P15 success criteria are complete; no fallback was used. P17 may begin because P13, P14, P15, and P16 are PASS.

Objective:

- Buat `ui/grid/` dengan `ProjectGrid.tsx` dan `gridDefinition.ts`.

Why now:

- Grid adalah area UI ketiga yang diekstrak dari `ControlCenterScreen.tsx`.

Preconditions:

- P16 PASS.

Allowed files:

- `src/features/control-center/ui/grid/` (create new files)
- `src/features/control-center/ui/card/` (read only — peer pure UI component)
- `src/features/control-center/application/view-models.ts` (read only)
- `src/features/control-center/application/controller/` (read only)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/application/useProjectManager.ts` (do not modify)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify yet)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/ui/grid/gridDefinition.ts`:
   - Loading skeleton count, empty-state copy, accessible label, available layout modes.
2. Create `src/features/control-center/ui/grid/ProjectGrid.tsx`:
   - Receives `ProjectGridViewModel`, `availableActionIds`, and `onAction`.
   - Renders loading skeleton, empty state, or grid/list of cards.
   - May import the peer `ui/card/ProjectCard.tsx` only for render mapping and forwards
     `availableActionIds`.
3. Create `src/features/control-center/ui/grid/ProjectGrid.css`:
   - Local styles only.
4. Add component tests.

Contracts:

- Grid must not decide between loading/empty/ready — that is in view model.
- Grid may import `ProjectCard` as a peer UI renderer; it must not compute policy or
  access raw `ProjectSummary`.

Tests to add or update:

- `ui/grid/ProjectGrid.test.tsx`: renders loading, empty, ready states.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
```

Success criteria:

- Grid UI component implemented and tested.
- No modification to `ControlCenterScreen.tsx` yet.

Fallback if not achieved:

- Preserve existing CSS temporarily; do not add inline styles. If grid and list cannot both satisfy the criteria, mark P15 `BLOCKED`.

Stop conditions:

- Must not modify scripts or other UI areas.

Handoff:

- Files changed: `src/features/control-center/ui/grid/ProjectGrid.tsx`, `gridDefinition.ts`, CSS, test file.
- Commands: `npm run typecheck && npm run test && npm run lint && npm run build` passes.
- Next phase: P17 (after P13, P14, P16 also pass).

---

### Phase P16 — Card and Terminal UI

Status:

- PASS

Validation evidence (2026-07-28):

- Added definition-owned action order and labels, exhaustive status badges, tag copy, alert copy/tone mapping, and terminal copy in `ui/card/cardDefinition.ts`.
- `ProjectCard` reads only `ProjectCardViewModel`; domain-disabled state comes from action view models, while handler availability comes only from `availableActionIds`.
- Card actions forward the stable action ID and project ID string; missing semantic state or missing handler leaves the definition action visible and disabled.
- `ProjectTerminal` receives only `TerminalViewModel`, renders an accessible keyboard-focusable `<pre aria-live="polite">`, and is the log scroll owner. It does not slice or truncate logs.
- Targeted validation **PASS**: 2 files, 8 tests.
- Phase gate **PASS**: typecheck, lint, 33 files/303 tests, and build.
- Legacy screen, legacy card, scripts, apps, controller, presenter limits, and application source were not modified.

Handoff result:

- P16 success criteria are complete; no fallback was used. P15 subsequently completed.

Objective:

- Buat `ui/card/` dengan `ProjectCard.tsx`, `cardDefinition.ts`, dan `ProjectTerminal.tsx`.

Why now:

- Card adalah komponen paling kompleks. Ekstraksi terakhir sebelum layout ownership.

Preconditions:

- P12 PASS.

Allowed files:

- `src/features/control-center/ui/card/` (create new files)
- `src/features/control-center/application/view-models.ts` (read only)
- `src/features/control-center/application/controller/` (read only)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/application/useProjectManager.ts` (do not modify)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify yet — old file)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/ui/card/cardDefinition.ts`:
   - Action order, status presentation, tag presentation, alert presentation, terminal title.
2. Create `src/features/control-center/ui/card/ProjectTerminal.tsx`:
   - Receives `TerminalViewModel`, renders `<pre>` with scroll.
   - Has accessible label and `aria-live="polite"`.
3. Create `src/features/control-center/ui/card/ProjectCard.tsx`:
   - Receives `ProjectCardViewModel`, `availableActionIds`, and `onAction`.
   - Renders title, badge, actions, tags, alerts, terminal.
   - Does not compute `canStart`, `canStop`, or any policy.
   - Keeps a definition action without a registered handler visible but disabled.
4. Create `src/features/control-center/ui/card/ProjectCard.css`:
   - Local styles only.
5. Add component tests.

Contracts:

- Card must not read `ProjectSummary` — only `ProjectCardViewModel`.
- Card must not compute `canStart`/`canStop`/`canQuickKill`.
- Card may reconcile definition action IDs against `availableActionIds`; this is handler
  availability, not domain permission.
- Terminal must be the scroll owner for log content.
- Card/Terminal must not truncate logs; `TerminalViewModel` is already limited by the
  presenter-owned `presentationLimits.ts`.

Tests to add or update:

- `ui/card/ProjectCard.test.tsx`: renders view model, dispatches action, domain-disabled
  state, and missing-handler disabled state.
- `ui/card/ProjectTerminal.test.tsx`: accessible label, scroll, log content.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
```

Success criteria:

- Card and Terminal UI components implemented and tested.
- Card does not compute policy.
- No modification to old `components/ProjectCard.tsx` or `ControlCenterScreen.tsx` yet.

Fallback if not achieved:

- Preserve existing CSS temporarily; do not add inline styles. If card, alerts, or terminal criteria remain incomplete, mark P16 `BLOCKED`.

Stop conditions:

- Must not modify scripts or other UI areas.

Handoff:

- Files changed: `src/features/control-center/ui/card/ProjectCard.tsx`, `ProjectTerminal.tsx`, `cardDefinition.ts`, CSS, test files.
- Commands: `npm run typecheck && npm run test && npm run lint && npm run build` passes.
- Next phase: P15. P17 remains blocked until P13, P14, and P15 also pass.

---

### Phase P17 — Layout Ownership

Status:

- PASS

Validation evidence (2026-07-28):

- Added `ControlCenterLayout` as the pure composition owner for Header, Toolbar, page alert, and Grid; all action IDs and payloads remain forwarded through `onAction`.
- Added `layoutTokens.css` as the only owner of responsive breakpoints and cross-area layout values for gutters, gaps, columns, card aspect ratio, and terminal heights.
- Header, Toolbar, Grid, Card, and Terminal CSS now consume layout variables and contain no media queries.
- Reduced `src/styles.css` to root color/base behavior, box sizing, document/root sizing, tap behavior, and `.sr-only`.
- Scroll ownership is explicit: body/layout/workspace do not scroll, ProjectGrid owns collection scrolling, and ProjectTerminal `<pre>` owns log scrolling.
- Targeted layout validation **PASS**: 1 file, 4 tests.
- Canonical phase gate **PASS**: format, lint, typecheck, 35 files/312 tests, build, and AntD lint with 0 issues.
- Legacy screen, legacy card, controller, scripts, and apps were not modified.

Handoff result:

- P17 success criteria are complete; no fallback was used. P18 may begin.

Objective:

- Buat `ui/layout/` dengan `layoutTokens.css`, `ControlCenterLayout.tsx`, pindahkan breakpoint dan token, kurangi `src/styles.css`.

Why now:

- Layout ownership diperlukan sebelum screen cleanup (P18). Semua UI area sudah diekstrak.

Preconditions:

- P13 PASS, P14 PASS, P15 PASS, P16 PASS.

Allowed files:

- `src/features/control-center/ui/layout/` (create new files)
- `src/styles.css` (modify)
- `src/features/control-center/ui/header/` (modify CSS only)
- `src/features/control-center/ui/toolbar/` (modify CSS only)
- `src/features/control-center/ui/grid/` (modify CSS only)
- `src/features/control-center/ui/card/` (modify CSS only)
- `src/features/control-center/application/view-models.ts` (read only)
- `src/features/control-center/ui/` (read only — all UI areas)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/application/useProjectManager.ts` (do not modify)
- `src/features/control-center/components/ProjectCard.tsx` (do not modify yet)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (do not modify yet)

Implementation TODO:

1. Create `src/features/control-center/ui/layout/layoutTokens.css`:
   - CSS custom properties for layout max-width, gutters, gaps, grid columns, aspect ratios, terminal heights.
   - All breakpoint media queries in one place.
2. Create `src/features/control-center/ui/layout/ControlCenterLayout.tsx`:
   - Receives `ControlCenterViewModel` and `onAction`.
   - Composes Header, Toolbar, Grid, and page alert.
   - Passes `viewModel.availableActionIds` to Header, Toolbar, and Grid for definition
     reconciliation.
   - Scroll ownership: body no scroll, grid scrolls.
3. Create `src/features/control-center/ui/layout/controlCenterLayout.css`:
   - Layout structure only (grid/flex for shell).
4. Migrate CSS from `src/styles.css`:
   - Move `.control-center`, `.control-center-header`, `.project-section`, `.project-scroll`, `.project-toolbar`, `.project-card`, `.project-console`, `.quick-server-item`, media queries to respective UI area CSS files.
   - Keep only reset, `:root`, `html`, `body`, `#root`, `.sr-only` in `src/styles.css`.

Contracts:

- Breakpoint media queries must only be in `layoutTokens.css`.
- Component CSS must only use CSS variables, not hardcoded breakpoints.
- Scroll ownership must follow: body no scroll → layout no scroll → grid scrolls → terminal pre scrolls.

Tests to add or update:

- `ui/layout/ControlCenterLayout.test.tsx`: renders all areas, scroll ownership.
- Component/layout contract test only. Manual browser QA is deferred until P21, after
  P18 has mounted the new layout in the runtime screen.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
```

Success criteria:

- `layoutTokens.css` has all breakpoint and token definitions.
- `ControlCenterLayout` composes all UI areas.
- `src/styles.css` reduced to global reset only.
- Build passes.

Fallback if not achieved:

- Preserve legacy CSS in `src/styles.css` only while repairing migration; do not add inline styles. If `src/styles.css` cannot be reduced per success criteria, mark P17 `BLOCKED`.

Stop conditions:

- Must not modify scripts or apps.

Handoff:

- Files changed: `src/features/control-center/ui/layout/ControlCenterLayout.tsx`, `layoutTokens.css`, `controlCenterLayout.css`, `src/styles.css` (reduced), test files.
- Commands: `npm run typecheck && npm run test && npm run lint && npm run build` passes.
- Next phase: P18.

---

### Phase P18 — Screen Cleanup

Status:

- PASS

Validation evidence (2026-07-28):

- Rewrote `ControlCenterScreen.tsx` as a composition-only root with exactly two production imports: `useControlCenterController` and `ControlCenterLayout`.
- Removed all inline React state, AntD markup, collection selection, quick-server mapping, lifecycle policy, and legacy card usage from the screen.
- Activated an executable ESLint boundary for production screen files and added negative architecture fixtures for AntD, data, commands, presenters, and peer UI imports plus positive controller/layout fixtures.
- Added a screen integration test proving the controller view model is rendered through the layout and action dispatch is forwarded.
- Resolved pre-existing integration compatibility gaps without changing `App.test.tsx`: dynamic card/dropdown accessible names again match visible labels, and Grid ordering remains observable through the established collection contract.
- Targeted screen/architecture validation **PASS**: 2 files, 36 tests.
- Canonical automated gate **PASS**: format, lint, typecheck, 36 files/320 tests, build, and AntD lint with 0 issues.
- Runtime HTTP smoke **PASS**: `/` returned 200 with the root mount and `/api/projects` returned 200 with a projects payload.

Deferred technical debt (user-approved 2026-07-28):

- Browser control remained unavailable after repeated tool discovery, so the 1440px and 390px smoke, Grid/List interaction, horizontal-overflow check, and console-error inspection were not executed.
- The user explicitly approved deferring this evidence as technical debt and accepting P18 on its automated and runtime HTTP evidence.
- This is not a browser-QA `PASS`. Visual and responsive behavior remains unverified and must be completed in P21 or before release.

Handoff result:

- P18 is accepted as `PASS` through the explicit browser-QA exception above.
- P19 may start after the canonical gate is re-run and P18 is committed separately.

Objective:

- Ubah `ControlCenterScreen.tsx` menjadi composition root (controller + layout).

Why now:

- Semua UI area sudah diekstrak. Screen inline code harus dihapus.

Preconditions:

- P17 PASS.

Allowed files:

- `src/features/control-center/screens/ControlCenterScreen.tsx` (modify)
- `src/features/control-center/application/controller/` (read only)
- `src/features/control-center/ui/layout/` (read only)
- `eslint.config.ts` (activate screen boundary)
- `test/architecture/import-boundary.test.ts` (add screen fixture)
- `src/App.tsx` (modify only if import path changes)
- `src/App.test.tsx` (modify only if import path changes)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/application/useProjectManager.ts` (do not modify yet)
- `src/features/control-center/components/` (do not modify yet)

Implementation TODO:

1. Rewrite `ControlCenterScreen.tsx`:
   ```tsx
   export function ControlCenterScreen() {
     const controller = useControlCenterController();
     return <ControlCenterLayout viewModel={controller.viewModel} onAction={controller.dispatch} />;
   }
   ```
2. Remove all inline imports: AntD Button/Input/Dropdown/Select/Segmented, `selectProjects`, `ProjectCard`, `MenuProps`, `useState`, `useMemo`.
3. Remove `activeProjects`, `activeServerItems`, `handleQuickKill`, `sortOptions`, `visibleProjects` — all now in controller/presenter.
4. Update `src/App.tsx` import if path changed.
5. Update `src/App.test.tsx` import if path changed.
6. Activate the ESLint screen rule: screen may import only controller, layout, React type
   utilities if required, and its own local test types.
7. Extend the architecture test so a screen import from AntD, data, commands, presenter,
   or peer UI outside layout fails.

Contracts:

- Screen must not import AntD components directly.
- Screen must not have `useState` or `useMemo`.
- Screen must only import controller and layout.
- Screen boundary must be executable through ESLint and the negative architecture fixture.

Tests to add or update:

- `screens/ControlCenterScreen.test.tsx`: basic render test (integration with controller).
- `test/architecture/import-boundary.test.ts`: screen forbidden/allowed imports.
- Browser smoke after runtime integration: 390px and 1440px, Grid/List, start/open/stop
  controls, no horizontal overflow, no console error.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
```

Success criteria:

- Screen is composition-only: controller + layout.
- All inline state, policy, and markup removed.
- ESLint rejects screen imports outside controller/layout.
- Tests pass with updated imports.
- P18 browser smoke is recorded; unavailable browser means P18 remains `BLOCKED`.

Fallback if not achieved:

- Repair the composition migration. A compatibility wrapper retaining inline state, policy, or markup does not satisfy the criteria; mark P18 `BLOCKED`.

Stop conditions:

- Must not modify scripts or apps.

Handoff:

- Files changed: `src/features/control-center/screens/ControlCenterScreen.tsx`,
  `eslint.config.ts`, `test/architecture/import-boundary.test.ts`, `src/App.tsx` (if
  needed), `src/App.test.tsx` (if needed).
- Commands: `npm run typecheck && npm run test && npm run lint && npm run build` passes.
- Next phase: P19.

---

### Phase P19 — Legacy Removal

Status:

- PASS

Validation evidence (2026-07-28):

- Verified that no runtime or test import referenced the legacy hook or card before deletion.
- Deleted `application/useProjectManager.ts` and `components/ProjectCard.tsx`, then removed the empty legacy `components/` directory.
- Verified that `application/projectCollection.ts` remains absent and `domain/projectCollection.ts` is the only active collection owner.
- Verified that `ControlCenterScreen.tsx` remains composition-only and no obsolete presenter path exists.
- Updated `AGENTS.md` to the implemented modular structure and corrected the canonical `plan.md` status, implementation tree, historical baseline labeling, and legacy-cleanup record.
- Canonical automated gate **PASS**: format, lint, typecheck, 36 files/320 tests, build, and AntD lint with 0 issues.
- Post-cleanup runtime HTTP smoke **PASS**: `/` returned 200 with the root mount and `/api/projects` returned 200 with 2 projects; port 1999 was released afterward.

Deferred technical debt (user-approved 2026-07-28):

- Browser control remains unavailable, so the required 1440px/390px, Grid/List, horizontal-overflow, and console-error smoke was not executed.
- The user explicitly approved treating this browser evidence as technical debt. This is not a browser-QA `PASS`; it remains required in P21 or before release.

Handoff result:

- P19 is accepted as `PASS` through the explicit browser-QA exception above.
- No active legacy or duplicate runtime path remains. P20 may start.

Objective:

- Hapus file lama hanya setelah replacement memiliki test. Update `AGENTS.md` dan `plan.md`.

Why now:

- Legacy files (`useProjectManager.ts`, `application/projectCollection.ts`,
  `components/ProjectCard.tsx`, and any obsolete presenter path) must be removed after
  replacement behavior is verified.

Preconditions:

- P18 PASS.

Allowed files:

- `src/features/control-center/application/useProjectManager.ts` (delete)
- `src/features/control-center/application/projectCollection.ts` (verify absent after P02)
- `src/features/control-center/components/ProjectCard.tsx` (delete)
- `src/features/control-center/screens/ControlCenterScreen.tsx` (verify no stale imports)
- `AGENTS.md` (update)
- `plan.md` (update status)

Forbidden files:

- `scripts/*`
- `apps/*`
- `src/features/control-center/ui/` (already implemented)
- `src/features/control-center/domain/` (already implemented)
- `src/features/control-center/data/` (already implemented)
- `src/features/control-center/application/controller/` (already implemented)
- `src/features/control-center/application/commands/` (already implemented)
- `src/features/control-center/application/extensions/` (already implemented)

Implementation TODO:

1. Verify no runtime or test import references any legacy path before deletion.
2. Delete `useProjectManager.ts`.
3. Verify `components/ProjectCard.tsx` is not imported anywhere (replaced by `ui/card/ProjectCard.tsx`).
4. Delete `components/ProjectCard.tsx`.
5. Verify `domain/projectCollection.ts` is the only collection import path; any active
   application copy or compatibility wrapper marks P19 `BLOCKED`.
6. Delete only empty legacy directories within the allowed paths.
7. Update `AGENTS.md`:
   - Update "Feature Structure (Current)" to reflect modular structure.
   - Update "Target Architecture" to mark as implemented.
   - Remove references to `useProjectManager.ts` as monolithic.
8. Update `plan.md` §15 status: mark modular phases as implemented.

Contracts:

- Must not delete any file that still has runtime imports.
- `AGENTS.md` and `plan.md` must be accurate after update.
- No compatibility wrapper left behind.
- Any active legacy file or duplicate runtime path blocks P19. `@deprecated` is not a success state.

Tests to add or update:

- Run full test suite to verify no import errors.
- Repeat the P18 browser smoke after legacy deletion to prove the active runtime path did
  not change.

Validation commands:

```powershell
npm run typecheck
npm run test
npm run lint
npm run build
npm run format:check
```

Success criteria:

- Legacy files deleted.
- No active legacy or duplicate runtime path remains.
- `AGENTS.md` reflects current modular structure.
- `plan.md` §15 status updated.
- All tests pass.
- Build passes.
- Post-cleanup browser smoke is recorded; unavailable browser means P19 remains `BLOCKED`.

Fallback if not achieved:

- If a legacy file is still imported or a duplicate path remains active, keep it unchanged, record the import evidence, and mark P19 `BLOCKED`.

Stop conditions:

- Must not delete a file that is still referenced by tests or imports.

Handoff:

- Files changed: Deleted legacy files, `AGENTS.md`, `plan.md`.
- Commands: `npm run typecheck && npm run test && npm run lint && npm run build && npm run format:check` passes.
- Next phase: P20.

---

### Phase P20 — Full Automated Validation

Status:

- PASS

Validation evidence (2026-07-28):

- `npm run format:check` **PASS**: all files use Prettier formatting.
- `npm run lint` **PASS**: ESLint completed without errors or warnings.
- `npm run typecheck` **PASS**: web and node TypeScript projects completed without diagnostics.
- `npm run test -- --maxWorkers=2` **PASS**: 36 files, 333 tests.
- `npm run build` **PASS**: Vite transformed 1639 modules and produced the production bundle.
- `npx --yes antd lint src --format json` **PASS**: 0 issues, 0 skipped files, non-partial result.
- Read-only residual scan found no runtime/test legacy imports, suppression comments, TODO/FIXME markers, deprecated annotations, or direct console warning/error calls.

Existing warning audit and approved disposition:

- Command: `npm run build`.
- Exact warning: `Some chunks are larger than 500 kB after minification.`
- Generated source: `dist/assets/index-CMy3h6ox.js` is 801.53 kB (258.27 kB gzip). Vite's configured source is the root static entry; `vite.config.ts` does not override the default 500 kB warning threshold.
- Disposition: approved as existing low-severity technical debt for P20. The build succeeds, the warning predates this phase, and no functional or architecture gate fails.
- Follow-up: do not suppress the warning by raising `chunkSizeWarningLimit`. Bundle analysis and measured code-splitting may be handled in a separately authorized performance phase.
- No new warning was observed in format, lint, typecheck, test, build, or AntD lint output.

Resolved remediation (P20-R1, user-authorized 2026-07-28):

- Extracted all concrete control-center flat-config boundaries into
  `tooling/eslint/controlCenterBoundaryConfigs.ts`; root `eslint.config.ts` now only
  composes the feature-owned module.
- The UI guardrail lists only internal layers that currently exist. It intentionally
  allows `application/view-models`, AntD, CSS, local UI, and peer UI; no generic
  dependency-graph framework or speculative alias rule was added.
- Independent architecture fixtures now reject UI imports from data, domain, raw feature
  types, screens, scripts, controller, commands, extensions, presenters, composition,
  ports, and presentation limits. A nested UI fixture proves depth-independent matching.
- Positive fixtures prove view models, AntD, CSS, local UI, and peer UI remain valid.
- Targeted architecture validation **PASS**: 1 file, 48 tests.
- Corrected the canonical `presentationLimits.ts` path and documented the modular
  guardrail owner. No dependency or production runtime behavior changed.

Handoff result:

- P20 automated validation and its authorized boundary remediation are complete.
- The existing Vite warning remains audited low-severity technical debt. P21 may start
  and still owns final runtime/browser QA.

Objective:

- Jalankan seluruh validasi end-to-end.

Why now:

- Final gate sebelum browser QA.

Preconditions:

- P19 PASS.

Allowed files:

- All files (read only)

Forbidden files:

- Any file modification

Implementation TODO:

1. Run full validation:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test -- --maxWorkers=2
npm run build
npx --yes antd lint src --format json
```

Contracts:

- All commands must pass without errors.
- Every error is blocking.
- New warnings require audit and must be resolved or explicitly approved before P20 can pass.
- Existing warnings must be recorded explicitly with command, exact text, source, and approved disposition; unrecorded warnings block P20.

Tests to add or update:

- None.

Validation commands:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test -- --maxWorkers=2
npm run build
npx --yes antd lint src --format json
```

Success criteria:

- All commands pass.
- No errors.
- No new unaudited warnings.
- Every existing warning is explicitly recorded and approved.

Fallback if not achieved:

- Do not modify files inside P20. Record the exact failing command/output, mark P20
  `BLOCKED`, and return to the owning implementation phase or create an explicitly
  approved remediation phase. A known tool issue, warning, or skipped command cannot
  produce PASS.

Stop conditions:

- Any validation failure blocks P21.

Handoff:

- Output: clean validation output.
- Known issue: Record any warnings.
- Next phase: P21.

---

### Phase P21 — Browser QA and Final Audit

Status:

- PENDING

Objective:

- Validasi visual dan behavior di browser.

Why now:

- Final phase — no more code changes.

Preconditions:

- P20 PASS.

Allowed files:

- None (browser only)

Forbidden files:

- Any file modification

Implementation TODO:

1. Start root dev server:

```powershell
npm run dev
```

2. Verify on viewports: 390×844, 768×900, 1024×768, 1440×900.
3. Verify modes: Grid, List, search, sort, no active server, managed server, external/conflict, invalid, tombstone, error alert, long terminal log.
4. Verify invariants: no horizontal overflow, body not scroll owner, grid scrolls, terminal scrolls, card does not grow with log, toolbar controls not overlapping, header not clipping, focus visible, keyboard accessible, accessible names stable, no console errors.

Contracts:

- Browser QA must be done on at least 2 viewports (390px and 1440px).
- Document any discrepancies.

Tests to add or update:

- None.

Validation commands:

- Manual browser verification.

Success criteria:

- All behavior matches plan.md §5 (Model Status Target).
- No console errors.
- All viewports render correctly.
- Keyboard navigation works.

Fallback if not achieved:

- Record the discrepancy and mark P21 `BLOCKED`. Create an approved remediation phase before modifying source; rerun P20 after it passes.

Stop conditions:

- Must not modify source code during QA.

Handoff:

- Output: QA report.
- Final: `execution-plan.md` status updated to all PASS.

---

## 5. Quality Gates Global

Eksekusi dianggap tidak lulus jika:

- typecheck gagal
- lint gagal
- test existing gagal
- status policy masih terduplikasi
- UI memanggil `fetch`, `window.open`, polling, atau process API
- stale response dapat menimpa state baru
- request tidak dapat dibatalkan
- startup readiness/action masih berjalan setelah unmount
- import boundary dilanggar
- architecture fixture tidak membuktikan forbidden import gagal
- browser QA diperlukan tetapi tidak tersedia
- perubahan keluar dari allowed files
- fallback tidak memenuhi success criteria
- legacy atau duplicate runtime path masih aktif setelah P19
- error validasi, warning baru tanpa audit, atau warning existing tanpa catatan eksplisit

---

## 6. Resume Protocol untuk Context Kecil

Setiap agent yang melanjutkan wajib:

1. Baca `AGENTS.md`
2. Baca `plan.md`
3. Baca `execution-plan.md`
4. Jalankan `git status`
5. Cari phase terakhir dengan status `IN_PROGRESS`, `BLOCKED`, atau `PASS`
6. Jangan ulang phase `PASS`
7. Jangan mulai phase berikutnya jika gate belum `PASS`
8. Baca hanya file yang termasuk `Allowed files` fase aktif
9. Jika context atau evidence tidak cukup, tulis `BLOCKED` dan berhenti
10. Laporkan command dan hasil aktual, bukan hasil dari sesi lama

---

## 7. Fallback and Recovery Rules

Jika success criteria tidak tercapai:

- Jangan lanjut ke fase berikutnya
- Pertahankan perubahan yang sudah ada
- Jangan jalankan reset, clean, atau checkout paksa
- Catat error dan file yang terdampak
- Coba fallback paling kecil
- Jika fallback gagal, tandai `BLOCKED`
- Jangan memperluas scope tanpa approval
- Jangan mengubah public contract hanya untuk membuat test lulus

---

## 8. Final Acceptance Checklist

- [ ] P00 — Baseline Characterization PASS
- [ ] P01 — Import Boundary Guardrail PASS
- [ ] P02 — Domain Status Classification PASS
- [ ] P03 — Domain Action Policy PASS
- [ ] P04 — View-Model Contracts PASS
- [ ] P05 — HTTP Response Contract PASS
- [ ] P06 — Cancellation and Request Lifecycle PASS
- [ ] P07 — Startup Readiness Policy PASS
- [ ] P08 — Browser Window Adapter PASS
- [ ] P09 — Core Commands PASS
- [ ] P10 — Extension Contract and Host PASS
- [ ] P11 — Extension Loader and Core Modules PASS
- [ ] P12 — Controller PASS
- [ ] P13 — Header UI PASS
- [ ] P14 — Toolbar UI PASS
- [ ] P15 — Grid UI PASS
- [ ] P16 — Card and Terminal UI PASS
- [ ] P17 — Layout Ownership PASS
- [ ] P18 — Screen Cleanup PASS
- [ ] P19 — Legacy Removal PASS
- [ ] P20 — Full Automated Validation PASS
- [ ] P21 — Browser QA and Final Audit PASS
- [ ] Status policy not duplicated
- [ ] UI does not call `fetch`, `window.open`, polling, or process API
- [ ] Stale response cannot overwrite newer state
- [ ] Refresh, startup, stop, and quick-kill actions cancel on unmount
- [ ] Import boundary enforced by ESLint
- [ ] Negative architecture fixture proves forbidden imports fail
- [ ] `domain/projectCollection.ts` is the only collection runtime path
- [ ] `AGENTS.md` and `plan.md` updated to reflect current state
