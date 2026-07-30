# Handoff — Dhepil Suite

Dokumen ini untuk new account / new session. Baca ini DULU sebelum membuka file lain.

---

## Status Sekarang (2026-07-30)

Project sedang dalam proses **restructuring arsitektur besar** — dari struktur lama (features/control-center nested deep) ke struktur baru (engine modular + shared UI di root monorepo).

**Phase A (flatten engine) dan Phase B (move UI to root) sudah selesai dan di-commit.**
Next: Phase C — Collapse presenter/controller ke ControlCenterScreen.tsx.

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
  ├─ contracts.ts
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
  └─ layoutTokens.css

src/features/control-center/  ← MASIH ADA, harus dihapus setelah Phase C+D
  ├─ application/
  │  ├─ controller/useControlCenterController.ts  ← absorb ke Screen (Phase C)
  │  ├─ presenters/*.ts                           ← inline ke Screen (Phase C)
  │  ├─ view-models.ts                            ← types → engine/contracts.ts (Phase C)
  │  └─ presentationLimits.ts                     ← inline ke Screen (Phase C)
  └─ screens/ControlCenterScreen.tsx              ← rewrite ke src/ root (Phase C)
```

---

## Deviations Log

### Phase A
- **Extension host removed early**: `useControlCenterController.ts` was updated in Phase A to remove extension host dependency and inline dispatch logic. Per plan, this was Phase C scope. Done early because extensions were deleted in Phase A — leaving the controller broken until Phase C would block typecheck.
- **`createEngine.ts` kept separate**: Plan said "Digabung ke `engine/index.ts` atau direwrite". It was rewritten (extensions removed) but kept as separate file. `index.ts` re-exports it. Acceptable — cleaner separation.

### Phase B
- **Extra files moved**: Plan table listed 7 `.tsx` files. Actually moved 22 files (including CSS, tests, definition files). These were necessary — components import them.
- **`tsconfig.web.json` updated**: Added `"ui"` to `"include"` array. Not in plan but required for typecheck to find moved files.
- **`ui/` files temporarily import from `src/features/.../view-models`**: This coupling will be resolved in Phase C when view-model types move to `engine/contracts.ts`.

---

## File yang Harus Dibaca

1. `.ai/task.md` — checklist phases lengkap (A ✅, B ✅, C–G pending)
2. `.ai/implementation_plan.md` — detail teknis migration per file
3. `.ai/plan.md` — arsitektur canonical + system design
