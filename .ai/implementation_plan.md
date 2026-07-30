# Implementation Plan — Modular Engine + Root UI Restructure

## Tujuan

Mengubah arsitektur Dhepil Suite dari struktur nested feature-based menjadi:
- **Engine modular** (`src/engine/`): parent orchestrator dengan flat children, semua logic di satu tempat
- **Shared UI** (`ui/` di monorepo root): flat, bisa dikonsumsi semua apps
- **No presenter layer**: compose langsung di `ControlCenterScreen.tsx`

---

## Target File Tree

```
dhepil-suite/                       ← monorepo root
│
├─ ui/                              ← [NEW] shared UI, flat, bisa dipakai semua apps
│  ├─ ControlCenterLayout.tsx       ← dari features/ui/layout/
│  ├─ ControlCenterHeader.tsx       ← dari features/ui/header/
│  ├─ ProjectToolbar.tsx            ← dari features/ui/toolbar/
│  ├─ ProjectGrid.tsx               ← dari features/ui/grid/
│  ├─ ProjectCard.tsx               ← dari features/ui/card/
│  ├─ ProjectTerminal.tsx           ← dari features/ui/card/
│  └─ layoutTokens.css              ← dari features/ui/layout/
│
├─ src/
│  ├─ engine/                       ← semua logic, tidak ada file engine di luar folder ini
│  │  ├─ index.ts                   ← parent: barrel + wires children
│  │  ├─ contracts.ts               ← semua shared types (ProjectStatus, ProjectSummary, dll)
│  │  ├─ projectActionPolicy.ts     ← [FLAT] dari engine/domain/projectActionPolicy.ts
│  │  ├─ projectCollection.ts       ← [FLAT] dari engine/domain/projectCollection.ts
│  │  ├─ projectStatus.ts           ← [FLAT] dari engine/domain/projectStatus.ts
│  │  ├─ httpClient.ts              ← [FLAT] dari engine/data/httpProjectManagerClient.ts
│  │  ├─ browserWindow.ts           ← [FLAT] dari engine/data/browserProjectWindow.ts
│  │  ├─ responseParser.ts          ← [FLAT] dari engine/data/projectManagerResponse.ts
│  │  └─ children/                  ← feature children, FLAT FILES ONLY
│  │     ├─ projectLifecycle.ts     ← [MERGE] project-lifecycle/* → satu file
│  │     ├─ projectRefresh.ts       ← [FLAT] dari project-refresh/projectRefreshChild.ts
│  │     └─ quickKill.ts            ← [FLAT] dari quick-kill/quickKillChild.ts
│  │
│  ├─ ControlCenterScreen.tsx       ← [NEW] compose: engine → ui, inline state + polling
│  ├─ App.tsx                       ← update import screen
│  ├─ main.tsx                      ← tidak berubah
│  └─ styles.css                    ← tidak berubah
│
├─ apps/
│  ├─ dhepil/                       ← logic only, konsumsi ui/ dari root
│  └─ spreadsheet-minimal/          ← logic only
│
└─ scripts/                         ← tidak berubah
```

---

## Yang Dihapus

| Path saat ini | Alasan |
|---|---|
| `src/engine/children/project-lifecycle/` | Flatten → `engine/children/projectLifecycle.ts` |
| `src/engine/children/project-refresh/` | Flatten → `engine/children/projectRefresh.ts` |
| `src/engine/children/quick-kill/` | Flatten → `engine/children/quickKill.ts` |
| `src/engine/data/` | Flatten → flat files di `engine/` |
| `src/engine/domain/` | Flatten → flat files di `engine/` |
| `src/engine/extensions/` | Dihapus, konsep diganti children flat |
| `src/engine/createEngine.ts` | Digabung ke `engine/index.ts` atau direwrite |
| `src/features/control-center/application/` | Dihapus seluruhnya |
| `src/features/control-center/screens/` | ControlCenterScreen pindah ke `src/` root |
| `src/features/control-center/ui/` | Pindah ke `ui/` monorepo root |
| `src/features/control-center/` | Folder ini kosong, dihapus |

---

## Prinsip Wajib

1. **Children flat**: `engine/children/` hanya boleh berisi `.ts` files langsung. Tidak ada subfolder.
2. **Domain + data flat**: `projectActionPolicy.ts`, `httpClient.ts`, dll langsung di `engine/` — bukan di subfolder.
3. **Children tidak saling import**: satu child tidak boleh import child lain. Hanya `engine/index.ts` yang import semua children.
4. **Tidak ada engine file di luar `engine/`**: `contracts.ts`, domain, data, children — semua di dalam folder ini.
5. **UI tidak import engine**: `ui/` komponen hanya terima props, tidak import dari `engine/`.
6. **Screen sebagai composition root**: `ControlCenterScreen.tsx` adalah satu-satunya tempat yang memanggil engine dan mengoper data ke UI.

---

## Import Contract

```
engine/children/*.ts  → engine/contracts.ts + engine/*.ts (domain/data)
engine/index.ts       → engine/children/* + engine/contracts.ts + engine/*.ts
ControlCenterScreen   → engine/index.ts + ui/*
ui/*                  → props only, no engine import
apps/*                → ui/* (bisa), engine/* (tidak, hanya via screen)
```

---

## Migration Per File

### Phase A: Flatten engine/

| File lama | File baru | Aksi |
|---|---|---|
| `engine/children/project-lifecycle/projectLifecycleChild.ts` | `engine/children/projectLifecycle.ts` | Merge + rename |
| `engine/children/project-lifecycle/startupReadinessPolicy.ts` | Masuk ke `projectLifecycle.ts` | Merge |
| `engine/children/project-lifecycle/stopProject.ts` | Masuk ke `projectLifecycle.ts` | Merge |
| `engine/children/project-refresh/projectRefreshChild.ts` | `engine/children/projectRefresh.ts` | Rename |
| `engine/children/quick-kill/quickKillChild.ts` | `engine/children/quickKill.ts` | Rename |
| `engine/data/httpProjectManagerClient.ts` | `engine/httpClient.ts` | Move + rename |
| `engine/data/browserProjectWindow.ts` | `engine/browserWindow.ts` | Move + rename |
| `engine/data/projectManagerResponse.ts` | `engine/responseParser.ts` | Move + rename |
| `engine/domain/projectActionPolicy.ts` | `engine/projectActionPolicy.ts` | Move |
| `engine/domain/projectCollection.ts` | `engine/projectCollection.ts` | Move |
| `engine/domain/projectStatus.ts` | `engine/projectStatus.ts` | Move |
| `engine/extensions/*` | — | Hapus seluruhnya |

### Phase B: Move UI to root

| File lama | File baru |
|---|---|
| `features/control-center/ui/layout/ControlCenterLayout.tsx` | `ui/ControlCenterLayout.tsx` |
| `features/control-center/ui/layout/layoutTokens.css` | `ui/layoutTokens.css` |
| `features/control-center/ui/header/ControlCenterHeader.tsx` | `ui/ControlCenterHeader.tsx` |
| `features/control-center/ui/toolbar/ProjectToolbar.tsx` | `ui/ProjectToolbar.tsx` |
| `features/control-center/ui/grid/ProjectGrid.tsx` | `ui/ProjectGrid.tsx` |
| `features/control-center/ui/card/ProjectCard.tsx` | `ui/ProjectCard.tsx` |
| `features/control-center/ui/card/ProjectTerminal.tsx` | `ui/ProjectTerminal.tsx` |

### Phase C: Collapse application/ ke Screen

| File lama | Aksi |
|---|---|
| `features/.../application/controller/useControlCenterController.ts` | Logic absorb ke `ControlCenterScreen.tsx` |
| `features/.../application/presenters/*.ts` | Logic inline ke `ControlCenterScreen.tsx` |
| `features/.../application/view-models.ts` | Types pindah ke `engine/contracts.ts` |
| `features/.../application/presentationLimits.ts` | Constant inline ke screen |
| `features/.../screens/ControlCenterScreen.tsx` | Rewrite sebagai `src/ControlCenterScreen.tsx` |

---

## Verification Plan

```bash
npm run typecheck   # setelah setiap phase
npm run test        # setelah Phase E
npm run lint        # setelah Phase F
npm run build       # Phase G
```
