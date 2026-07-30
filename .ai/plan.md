# Plan — Dhepil Suite Canonical Architecture

Dokumen ini adalah **satu-satunya sumber kebenaran arsitektur**. Jangan buat dokumen architecture kedua.
Jika ada keputusan baru, update bagian yang relevan di sini.

---

## 1. Apa Ini

npm-workspaces monorepo (`apps/*`) dengan **root control center** di port `1999` — sebuah React 19 + antd 6 dashboard yang mengelola, menyalakan, menghentikan, dan memonitor log app Vite lokal.

---

## 2. Repository Structure

```
dhepil-suite/
├─ ui/                    ← shared UI components (bisa dipakai semua apps)
├─ src/                   ← root control center app (port 1999)
│  ├─ engine/             ← semua logic (parent orchestrator + children)
│  ├─ ControlCenterScreen.tsx
│  ├─ App.tsx
│  └─ main.tsx
├─ apps/
│  └─ <app-id>/           ← app isolasi (logic only, pakai shared ui/)
│     ├─ app.manifest.json
│     └─ package.json
├─ config/
│  └─ app-ports.lock.json ← port assignment permanen (tracked by Git)
├─ scripts/               ← Vite middleware plugin
├─ tooling/               ← ESLint boundary configs
├─ test/                  ← architecture boundary tests
└─ .ai/                   ← context docs untuk AI sessions
```

---

## 3. Engine Architecture (`src/engine/`)

### Prinsip

- **Parent orchestrator**: `engine/index.ts` wires semua children dan expose public API
- **Flat children**: `engine/children/` hanya berisi `.ts` files langsung — tidak ada subfolder
- **Children tidak saling import**: isolasi total antar children, hanya parent yang tahu semua
- **Domain + data flat**: `projectActionPolicy.ts`, `httpClient.ts`, dll langsung di `engine/` root
- **Tidak ada file engine di luar folder `src/engine/`**

### File Tree Target

```
src/engine/
├─ index.ts                 ← parent: barrel + wires children
├─ contracts.ts             ← semua shared types
├─ projectActionPolicy.ts   ← domain: canStart/canStop/canKill rules
├─ projectCollection.ts     ← domain: filter, sort
├─ projectStatus.ts         ← domain: status classification
├─ httpClient.ts            ← data: HTTP adapter
├─ browserWindow.ts         ← data: window.open adapter
├─ responseParser.ts        ← data: response parsing + typed error
└─ children/
   ├─ projectLifecycle.ts   ← child: start + open + stop logic
   ├─ projectRefresh.ts     ← child: polling + refresh
   └─ quickKill.ts          ← child: quick kill
```

### Menambah Child Baru

Buat satu file `.ts` di `engine/children/`. Export fungsi child. Import dan wire di `engine/index.ts`. Selesai — tidak perlu edit file lain.

---

## 4. Shared UI (`ui/`)

- Flat components di monorepo root — bukan di dalam `src/features/`
- Semua apps boleh import dari `ui/`
- UI components **tidak boleh import dari `engine/`** — hanya terima props
- Jika app butuh UI spesifik, tambah file baru di `ui/` (bukan buat folder `ui/` baru di app)

```
ui/
├─ ControlCenterLayout.tsx
├─ ControlCenterHeader.tsx
├─ ProjectToolbar.tsx
├─ ProjectGrid.tsx
├─ ProjectCard.tsx
├─ ProjectTerminal.tsx
└─ layoutTokens.css
```

---

## 5. Screen Composition (`src/ControlCenterScreen.tsx`)

Tidak ada presenter layer atau controller hook terpisah. Screen adalah satu-satunya tempat yang:
- Memanggil engine
- Mengelola React state + polling
- Memetakan engine output ke UI props
- Merender `ui/` components

---

## 6. Apps (`apps/<id>/`)

- Logic only — tidak ada UI code di dalam app
- Wajib: `app.manifest.json` + `package.json` dengan `dev` script
- Dilarang: import dari `src/` root atau app lain

### `app.manifest.json` minimal:
```json
{
  "schemaVersion": 1,
  "id": "your-app-id",
  "name": "Human Readable Name",
  "runtime": "vite"
}
```

### Menambah App Baru:
1. Buat folder di `apps/<id>/`
2. Tulis `app.manifest.json` dan `package.json`
3. App otomatis muncul di dashboard pada polling berikutnya — tidak perlu edit registry

---

## 7. Scripts (`scripts/`)

Vite plugin — bukan standalone server. Hanya aktif selama `npm run dev`.

Module dependency order (one-way, no cycles):
```
project-contracts (types only)
       ↓
project-discovery / project-port-registry / project-process
       ↓
project-manager (orchestrator + Vite middleware)
```

- Tidak boleh import dari `src/` atau `ui/`
- `project-discovery` tidak boleh spawn processes
- `project-process` tidak boleh pilih port

### API Endpoints:
| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/projects` | Rescan `apps/*`, return `ProjectSummary[]` |
| `POST` | `/api/projects/:id/start` | Start managed process |
| `POST` | `/api/projects/:id/stop` | Stop managed process |

---

## 8. Port Lock

- Root selalu di port `1999` (strictPort, tidak pernah dialokasi ke app)
- App range: `2000–2999`, assigned sekali, disimpan di `config/app-ports.lock.json`
- **Tidak pernah auto-reassign** jika port konflik — tampilkan status `port-conflict`
- Hapus folder app → tidak hapus port assignment (restore folder → port sama kembali)

---

## 9. Project Status Model

| Status | Makna | Start | Stop |
|---|---|---|---|
| `stopped` | Folder valid, server mati | ✅ | — |
| `starting` | Process ada, HTTP belum siap | — | ✅ |
| `running` | HTTP responding | Open | ✅ |
| `stopping` | Kill in progress | — | Loading |
| `error` | Spawn gagal | Retry | per process |
| `invalid` | Manifest/package.json invalid | — | — |
| `external` | Port responding, bukan milik root | Open (warn) | — |
| `port-conflict` | Port terpakai, tidak terverifikasi | — | — |
| `not-found` | Folder dihapus, process masih hidup | — | Kill ✅ |

- App deleted + dead: card disembunyikan
- App deleted + running: card tampil sebagai `not-found` tombstone sampai di-Kill

---

## 10. Import Contract

```
engine/children/*.ts     → engine/contracts.ts + engine/*.ts
engine/index.ts          → engine/children/* + semua flat files engine
ControlCenterScreen.tsx  → engine/index.ts + ui/*
ui/*                     → props only, DILARANG import engine
apps/*                   → ui/* (boleh), engine/* (DILARANG)
scripts/*                → DILARANG import src/ atau ui/
```

---

## 11. Build Gate

Jalankan dari root, urut, semua harus hijau sebelum commit:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npx --yes antd lint src --format json
```

---

## 12. Tech Stack

| Tool | Version |
|---|---|
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

---

## 13. Key Design Decisions

**Flat children, no subfolder**: Children adalah unit terkecil — satu file = satu concern. Subfolder hanya menambah navigasi tanpa manfaat jika scope-nya kecil.

**Domain + data flat di engine root**: Mereka adalah internal engine, bukan "layer" tersendiri. Flat = mudah dibaca, mudah refactor.

**UI di monorepo root**: Agar semua apps bisa pakai tanpa circular dependency. App tidak perlu tahu di mana UI "tinggal" di app lain.

**Tidak ada presenter layer**: Presenter di antara engine dan UI hanya menambah file tanpa menambah isolasi nyata. Screen cukup sebagai composition boundary.

**Tidak ada extensions/modules**: Extensions host menambah indirection untuk masalah yang bisa diselesaikan dengan menambah children flat file.
