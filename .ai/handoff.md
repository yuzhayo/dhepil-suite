# Handoff — Dhepil Suite

Dokumen ini untuk new account / new session. Baca ini DULU sebelum membuka file lain.

---

## Status Sekarang (2026-07-30)

Project sedang dalam proses **restructuring arsitektur besar** — dari struktur lama (features/control-center nested deep) ke struktur baru (engine modular + shared UI di root monorepo).

**Belum ada code yang diubah untuk target baru ini.** Kita masih dalam fase perencanaan/dokumentasi.

---

## Arsitektur Target (yang harus dicapai)

```
dhepil-suite/                 ← monorepo root
│
├─ ui/                        ← NEW: shared UI, flat, bisa dipakai semua apps
│  ├─ ControlCenterLayout.tsx
│  ├─ ControlCenterHeader.tsx
│  ├─ ProjectToolbar.tsx
│  ├─ ProjectGrid.tsx
│  ├─ ProjectCard.tsx
│  ├─ ProjectTerminal.tsx
│  └─ layoutTokens.css
│
├─ src/                       ← root control center app
│  ├─ engine/                 ← semua logic disini, TIDAK ADA file engine di luar folder ini
│  │  ├─ index.ts             ← parent orchestrator, wires children
│  │  ├─ contracts.ts         ← semua shared types
│  │  ├─ projectActionPolicy.ts   ← domain: action rules (flat, bukan subfolder)
│  │  ├─ projectCollection.ts     ← domain: filter + sort
│  │  ├─ projectStatus.ts         ← domain: status model
│  │  ├─ httpClient.ts            ← data: HTTP adapter
│  │  ├─ browserWindow.ts         ← data: window.open adapter
│  │  ├─ responseParser.ts        ← data: response parsing
│  │  └─ children/               ← feature children, FLAT FILES ONLY (no subfolder)
│  │     ├─ projectLifecycle.ts  ← child: start + stop + open
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
src/engine/            ← sudah ada, tapi struktur BELUM benar
  ├─ children/
  │  ├─ project-lifecycle/   ← MASIH PAKAI SUBFOLDER (harus di-flatten)
  │  ├─ project-refresh/     ← MASIH PAKAI SUBFOLDER
  │  └─ quick-kill/          ← MASIH PAKAI SUBFOLDER
  ├─ data/                   ← MASIH SUBFOLDER (harus flat di engine/)
  ├─ domain/                 ← MASIH SUBFOLDER (harus flat di engine/)
  └─ extensions/             ← HARUS DIHAPUS (konsep diganti children flat)

src/features/control-center/  ← HARUS DIHAPUS SELURUHNYA
  ├─ application/ (presenters, controller, view-models)
  ├─ screens/
  └─ ui/                      ← dipindah ke monorepo root ui/
```

---

## File yang Harus Dibaca

1. `.ai/task.md` — checklist phases lengkap
2. `.ai/implementation_plan.md` — detail teknis migration per file
3. `.ai/plan.md` — arsitektur canonical + system design
