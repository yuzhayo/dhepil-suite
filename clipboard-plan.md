# Clipboard App — Current Implementation and Backlog

> **Status aktual — 2026-08-01:** Dokumen ini mencatat kondisi Clipboard dan backlog khusus app. Sumber kebenaran arsitektur monorepo tetap `PLAYBOOK.md`.

## 1. Runtime dan Packaging

| Item            | Kondisi aktual                              |
| --------------- | ------------------------------------------- |
| App ID          | `clipboard`                                 |
| Package         | `@dhepil-suite/clipboard`                   |
| Runtime         | Vite + React 19 + Ant Design 6              |
| Stable port     | `2002`                                      |
| Persistence     | Browser/Electron renderer `localStorage`    |
| Electron        | Enabled melalui shared workspace `electron` |
| Installer       | Windows NSIS x64 berhasil dibuat            |
| Release output  | `electron/release/clipboard/`               |
| Google Sheets   | Belum diimplementasikan                     |
| Dedicated tests | Belum tersedia                              |

Clipboard tidak memiliki Electron dependency, main process, preload, atau build config sendiri. `app.manifest.json` dan thin package scripts hanya mendelegasikan ke toolchain terpusat sesuai `PLAYBOOK.md` Section 10.

## 2. Struktur Aktual

```text
dhepil-suite/
├─ ui/
│  ├─ contracts.ts
│  ├─ data-grid/
│  │  ├─ DataGrid.tsx
│  │  └─ DataGrid.css
│  └─ theme/
│     ├─ SharedThemeProvider.tsx
│     ├─ ThemeToggle.tsx
│     └─ useSharedTheme.ts
├─ apps/clipboard/
│  ├─ AGENTS.md
│  ├─ app.manifest.json
│  ├─ index.html
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ vite.config.ts
│  └─ src/
│     ├─ app/ApplicationProviders.tsx
│     ├─ engine/
│     │  ├─ types.ts
│     │  └─ useClipboardEngine.ts
│     ├─ styles/global.css
│     ├─ App.tsx
│     ├─ ClipboardGate.tsx
│     └─ main.tsx
└─ electron/
   ├─ main/
   ├─ preload/
   ├─ scripts/
   └─ release/clipboard/   # generated, ignored
```

`ui/theme/` dan integrasi provider sudah menjadi shared checkpoint. Perubahan theme berikutnya tetap harus mempertahankan kontrak generik, sinkronisasi preference, dan isolasi business logic app.

## 3. Kontrak UI Generik

`ui/data-grid/DataGrid.tsx` adalah presentational component generik. Kontraknya dimiliki `ui/contracts.ts`, bukan Clipboard.

Data yang diterima:

- daftar kolom `{ id, title }`;
- daftar baris `{ id, cells }`;
- kolom dan mode sort aktif.

Action handler yang tersedia:

- tambah, hapus, dan rename kolom;
- tambah dan hapus baris;
- ubah isi cell;
- salin isi cell;
- ubah kolom/mode sort.

Komponen Ant Design yang dipakai saat ini adalah `Table`, `Input`, `Input.TextArea`, `Button`, `Popconfirm`, `Select`, dan `Space`. `DataGrid` tidak membaca `localStorage` dan tidak meng-import engine Clipboard.

## 4. Engine Clipboard

`apps/clipboard/src/engine/useClipboardEngine.ts` saat ini memiliki:

- state kolom dan baris in-memory;
- ID berbasis `crypto.randomUUID()`;
- cell lookup berbentuk `Record<columnId, text>`;
- immutable add/update/delete;
- cleanup data cell saat kolom dihapus;
- sort `newest`, `oldest`, `title-asc`, dan `title-desc`;
- memoized sorted rows;
- persistence `localStorage` dengan key `clipboard-data`;
- debounce save `500ms`.

`apps/clipboard/src/engine/types.ts` memiliki dua model domain: `ClipboardColumn` dan `ClipboardRow`.

## 5. Gate dan Provider

`ClipboardGate.tsx` menghubungkan engine ke generic `DataGrid`. Gate juga memiliki browser capability `navigator.clipboard.writeText()` dan menerjemahkan hasilnya menjadi Ant Design message.

`ApplicationProviders.tsx` memasang shared theme provider. `App.tsx` hanya menyusun provider dan Gate.

## 6. Kontrak Electron Clipboard

Manifest Clipboard saat ini:

```json
{
  "desktop": {
    "enabled": true,
    "script": "desktop:dev",
    "appId": "com.dhepil.clipboard",
    "productName": "Clipboard"
  }
}
```

Thin scripts package:

```json
{
  "desktop:dev": "node ../../electron/scripts/desktop.mjs dev clipboard",
  "desktop:build": "node ../../electron/scripts/desktop.mjs build clipboard"
}
```

Command dari root:

```bash
npm run desktop:dev -- clipboard
npm run desktop:build -- clipboard --dir
npm run desktop:build -- clipboard
```

## 7. Backlog Terverifikasi

Backlog berikut belum ada di source aktual:

1. Unit/integration test khusus `useClipboardEngine`, `ClipboardGate`, dan `DataGrid`.
2. Adapter Google Sheets atau folder `src/sync/`.
3. Contract sync, conflict handling, auth, dan retry untuk remote persistence.

Jangan menganggap Google Sheets sebagai kontrak aktif sebelum adapter dan boundary-nya dirancang serta disetujui. Perubahan berikutnya tetap harus mempertahankan pemisahan generic CoreUI, engine app, dan Gate.
