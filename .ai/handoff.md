# Handoff — Dhepil Suite

Dokumen ini untuk new account / new session. Baca ini DULU sebelum membuka file lain.

---

## Status Sekarang (2026-07-30)

Project telah **SELESAI 100%** direstrukturisasi arsitekturnya.
- **Engine Layer** (`src/engine/`): Sudah 100% modular, *flat children*, dan semua data/domain terpusat.
- **UI Layer** (`ui/` di monorepo root): Sudah 100% mengadopsi pola **CoreUI Parent-Children Orchestration**. Semua komponen dipisahkan ke dalam folder mandiri (`header/`, `toolbar/`, `card-grid/`) dan dienkapsulasi rapat dari komponen lain melalui *ESLint boundary rules*.
- **Semua Test & Typecheck Lulus**.

Fokus pengerjaan selanjutnya HANYALAH pengembangan *feature* baru atau penyesuaian UI *responsive design* (CSS tokens).

---

## Arsitektur Saat Ini (Final)

```text
dhepil-suite/                 ← monorepo root
│
├─ ui/                        ← shared UI, diisolasi per komponen
│  ├─ CoreLayout.tsx          ← Parent Orchestrator
│  ├─ CoreLayout.css          
│  ├─ CoreLayout.tokens.css   ← CSS tokens (single source of truth for breakpoints)
│  ├─ header/                 ← Child (independen)
│  ├─ toolbar/                ← Child (independen)
│  └─ card-grid/              ← Child (Card + Grid + Terminal + Definition)
│
├─ src/                       ← root control center app
│  ├─ engine/                 ← SEMUA logic (domain, data, process orchestration)
│  │  ├─ index.ts             ← parent orchestrator
│  │  ├─ contracts.ts         ← shared types
│  │  ├─ children/            ← feature children (FLAT FILES ONLY)
│  │  │  ├─ projectLifecycle.ts
│  │  │  ├─ projectRefresh.ts
│  │  │  └─ quickKill.ts
│  │  └─ [domain/data flat files...]
│  ├─ ControlCenterScreen.tsx ← Composition root (compose engine → ui props)
│  └─ App.tsx
│
├─ apps/                      ← Target workspaces managed by root
├─ config/                    ← app-ports.lock.json
└─ scripts/                   ← Vite middleware plugin (project-manager, process, dll)
```

---

## Prinsip Arsitektur Wajib

1. **Flat Logic di Engine**: Semua module feature di `src/engine/children/` adalah FLAT FILE (`.ts`). Tidak boleh ada subfolder.
2. **UI Component Encapsulation**: 
   - `ui/header/`, `ui/toolbar/`, dan `ui/card-grid/` tidak saling mengetahui. 
   - Komponen UI dilarang keras meng-import antar *children sibling*.
   - Semua *definition file* hanya boleh dipakai oleh komponen *child* di folder yang sama.
   - Semua rules di-enforce oleh `tooling/eslint/controlCenterBoundaryConfigs.ts`.
3. **No Presenter**: `ControlCenterScreen.tsx` bertugas memanggil engine, melakukan polling, memegang *state*, dan mengirimkan *props* langsung ke `ui/CoreLayout`.
4. **Build Gate Validation**: `npm run typecheck`, `npm run lint`, dan `npm run test` dijamin selalu hijau.

---

## File yang Harus Dibaca (Canonical Documentation)

1. `.ai/plan.md` — Arsitektur canonical sistem, system design (scripts vs root vs apps).
2. `.ai/coreui_analysis.md` — Desain detail untuk lapisan antarmuka UI (CoreUI encapsulation).
