# Handoff — Dhepil Suite

Dokumen ini untuk new account / new session. Baca ini DULU sebelum membuka file lain.

---

## Status Sekarang (2026-07-30)

Project sedang dalam proses **restructuring arsitektur besar** — dari struktur lama (features/control-center nested deep) ke struktur baru (engine modular + shared UI di root monorepo).

**Phase A–F selesai dan di-commit.**
Next: Phase G — Full Validation Gate.

---

## Arsitektur Target (yang harus dicapai)

```
dhepil-suite/                 ← monorepo root
│
├─ ui/                        ← shared UI, flat, bisa dipakai semua apps
│  ├─ ControlCenterLayout.tsx
│  ├─ ControlCenterHeader.tsx
│  ├─ ProjectToolbar.tsx
│  ├─ ProjectGrid.tsx
│  ├─ ProjectCard.tsx
│  ├─ ProjectTerminal.tsx
│  ├─ *Definition.ts          ← card/grid/header/toolbar definitions
│  ├─ *.css                   ← component styles
│  └─ layoutTokens.css
│
├─ src/                       ← root control center app
│  ├─ engine/                 ← semua logic disini, TIDAK ADA file engine di luar folder ini
│  │  ├─ index.ts             ← parent orchestrator, wires children
│  │  ├─ contracts.ts         ← semua shared types
│  │  ├─ createEngine.ts      ← runtime factory (tanpa extensions)
│  │  ├─ projectActionPolicy.ts   ← domain: action rules (flat)
│  │  ├─ projectCollection.ts     ← domain: filter + sort
│  │  ├─ projectStatus.ts         ← domain: status model
│  │  ├─ httpClient.ts            ← data: HTTP adapter
│  │  ├─ browserWindow.ts         ← data: window.open adapter
│  │  ├─ responseParser.ts        ← data: response parsing
│  │  └─ children/               ← feature children, FLAT FILES ONLY (no subfolder)
│  │     ├─ projectLifecycle.ts  ← child: start + stop + open + readiness
│  │     ├─ projectRefresh.ts    ← child: polling + refresh
│  │     └─ quickKill.ts         ← child: quick kill
│  ├─ ControlCenterScreen.tsx    ← compose engine output → ui (no separate presenter layer)
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ styles.css
│
├─ apps/
│  ├─ dhepil/                 ← logic only, konsumsi ui/ dari root
│  └─ spreadsheet-minimal/    ← logic only
│
└─ scripts/                   ← Vite middleware plugin, jangan diubah
```

---

## Prinsip Arsitektur

1. **Engine = parent orchestrator.** Semua feature logic ada di `src/engine/`. Children adalah flat `.ts` files di `engine/children/` — tidak ada subfolder di dalam children.
2. **Children tidak saling import.** Hanya parent (`engine/index.ts`) yang tahu semua children.
3. **Domain dan data adalah flat files di engine root** — bukan subfolder `engine/data/` atau `engine/domain/`.
4. **UI di monorepo root** (`ui/`) — bukan di dalam `src/features/`. Semua apps bisa pakai.
5. **Tidak ada presenter/controller layer terpisah.** Compose langsung di `ControlCenterScreen.tsx`.
6. **Apps baru = logic only.** Tidak boleh duplikat UI. Tambah UI child di `ui/` jika perlu komponen baru.

---

## State Saat Ini (file tree aktual)

```
src/engine/               ← ✅ SELESAI (Phase A) — flat, no subfolders kecuali children/
  ├─ children/
  │  ├─ projectLifecycle.ts   ← merged dari 3 file
  │  ├─ projectRefresh.ts
  │  └─ quickKill.ts
  ├─ contracts.ts             ← includes view-model types (Phase C)
  ├─ createEngine.ts          ← tanpa extensions
  ├─ index.ts
  ├─ projectActionPolicy.ts
  ├─ projectCollection.ts
  ├─ projectStatus.ts
  ├─ httpClient.ts
  ├─ browserWindow.ts
  └─ responseParser.ts

ui/                       ← ✅ SELESAI (Phase B) — flat, 22 files
  ├─ ControlCenterLayout.tsx + test + css
  ├─ ControlCenterHeader.tsx + test + css
  ├─ ProjectToolbar.tsx + test + css
  ├─ ProjectGrid.tsx + test + css
  ├─ ProjectCard.tsx + test + css
  ├─ ProjectTerminal.tsx + test
  ├─ *Definition.ts (card, grid, header, toolbar)
  └─ layoutTokens.css         ← all imports now use engine/contracts

src/ControlCenterScreen.tsx  ← ✅ SELESAI (Phase C) — composition root, 628 lines
  - Absorbs controller state + polling + dispatch
  - Inlines all presenter mapping logic
  - Renders ControlCenterLayout from ui/

src/features/control-center/  ← EMPTY folder, Phase D will delete
```

---

## Deviations Log

### Phase A

- **Extension host removed early**: `useControlCenterController.ts` was updated in Phase A to remove extension host dependency and inline dispatch logic. Per plan, this was Phase C scope. Done early because extensions were deleted in Phase A — leaving the controller broken until Phase C would block typecheck.
- **`createEngine.ts` kept separate**: Plan said "Digabung ke `engine/index.ts` atau direwrite". It was rewritten (extensions removed) but kept as separate file. `index.ts` re-exports it. Acceptable — cleaner separation.

### Phase B

- **Extra files moved**: Plan table listed 7 `.tsx` files. Actually moved 22 files (including CSS, tests, definition files). These were necessary — components import them.
- **`tsconfig.web.json` updated**: Added `"ui"` to `"include"` array. Not in plan but required for typecheck to find moved files.
- **`ui/` files temporarily import from `src/features/.../view-models`**: Resolved in Phase C.

### Phase C

- **`React` import unused**: Line 1 imports `React` — not needed with React 19 JSX transform. Minor lint issue for Phase F.
- **Presenter tests deleted without replacement**: 7 test files (`createControlCenterViewModel.test.ts`, `createGridViewModel.test.ts`, etc.) were deleted. Phase E will address test coverage for the new Screen.
- **Screen is 628 lines**: Large but expected — replaces 5 separate files (~600 lines combined). Matches the "no separate presenter" architecture intent.

### Phase F

- **`ui/` allowed to import `engine/contracts`**: Plan said `ui/* → props only, no engine import`. But all 12 UI files use `import type` from `engine/contracts.ts` for view model types (`ProjectCardViewModel`, `ToolbarViewModel`, etc.). Blocking these would require extracting types to a separate shared package. Pragmatic exception: `contracts.ts` only exports TypeScript interfaces — no runtime coupling. ESLint rule blocks all other `engine/` modules.
- **Extra restrictions beyond plan**: Added `engine → scripts/` and `engine → ControlCenterScreen` restrictions. Plan only specified `engine → ui/`, `App.tsx`, `apps/`. Added for completeness and to prevent circular imports (Screen imports engine → engine must not import Screen back).
- **Pre-existing lint fix in scope**: Removed unused `StartupReadinessCancelledError` import from `projectLifecycle.test.ts`. Left over from Phase A (merge); not Phase F scope but blocked `npm run lint` pass.

---

## File yang Harus Dibaca

1. `.ai/task.md` — checklist phases lengkap (A ✅, B ✅, C ✅, D–G pending)
2. `.ai/implementation_plan.md` — detail teknis migration per file
3. `.ai/plan.md` — arsitektur canonical + system design
