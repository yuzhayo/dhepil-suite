# Clipboard App — Implementation Plan

## Context

Dhepil Suite monorepo belum memiliki app clipboard. App ini adalah grid spreadsheet local-first dengan baris dan kolom dinamis, textarea multibaris per cell, tombol Copy per cell, persist localStorage, dan placeholder integrasi Google Sheets manual dua arah. App akan ditemukan otomatis oleh control center tanpa registry manual.

### Mengapa tidak menggunakan `root/ui/` sebagai layout dasar

`root/ui/` (CoreLayout, Header, Toolbar, CardGrid, Card, Terminal) adalah **shared UI khusus untuk control center dashboard** di port 1999, bukan library generik. Bukti:

- `ui/CoreLayout.tsx` mengimpor dari `src/engine/contracts` (ControlCenterViewModel)
- `ui/card-grid/Card.tsx` mengimpor dari `src/engine/contracts` (ProjectCardViewModel, CardActionViewModel, TerminalViewModel, dll.)
- `ui/toolbar/Toolbar.tsx` mengimpor dari `src/engine/contracts` (ToolbarViewModel)
- `ui/header/Header.tsx` mengimpor dari `src/engine/contracts` (HeaderViewModel)

Semua ViewModel ini adalah kontrak internal control center. App tidak memiliki akses ke engine root dan tidak boleh mengimpor dari `src/`. PLAYBOOK.md §4.2: "App DILARANG memuat kode UI dari app lain, dan dilarang mengubah source code `src/` (Root Control Center)."

**Pola yang benar** (sudah dipakai oleh `dhepil` dan `spreadsheet-minimal`): setiap app memiliki `ApplicationProviders.tsx` sendiri yang membungkus `ConfigProvider` + `AntdApp` dari antd, lalu membangun screen dengan komponen antd murni. Inilah yang dilakukan plan ini.

## Requirements (Confirmed)

- **Grid dinamis**: tambah/hapus baris dan kolom
- **Header kolom dapat diedit** (nama kolom sebagai judul)
- **Cell**: `Input.TextArea` multibaris (`autoSize={{ minRows: 1, maxRows: 8 }}`), satu baris tetap nyaman
- **Copy**: ikon per cell, salin isi teks saja via `navigator.clipboard.writeText()`
- **Sort**: pilih kolom + arah (newest, oldest, title-asc, title-desc)
- **Persist**: localStorage via custom hook
- **Sync**: placeholder adapter untuk Google Sheets, manual dua arah, kode Tampermonkey/Apps Script ditambahkan user nanti
- **Ant Design 6**, React 19, TypeScript 6, Vite 8, ESM only
- **Responsif & accessible**

---

## File Tree

```
apps/clipboard/
├── AGENTS.md
├── app.manifest.json
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── vite-env.d.ts
    ├── app/
    │   └── ApplicationProviders.tsx
    ├── features/
    │   └── clipboard/
    │       ├── data/
    │       │   ├── types.ts
    │       │   └── useClipboardData.ts
    │       ├── screens/
    │       │   ├── ClipboardScreen.tsx
    │       │   └── ClipboardScreen.css
    │       ├── sync/
    │       │   └── sheetsAdapter.ts
    │       └── __tests__/
    │           └── ClipboardScreen.test.tsx
    └── styles/
        └── global.css
```

### Penjelasan per file

| File                                                        | Sumber                                             | Penjelasan                                                                                                         |
| ----------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `AGENTS.md`                                                 | Copy dari `spreadsheet-minimal`, ganti nama        | Aturan kepemilikan app, kontrak discovery, script dev Vite                                                         |
| `app.manifest.json`                                         | Copy, ganti `id: "clipboard"`, `name: "Clipboard"` | Kontrak discovery otomatis: schemaVersion 1, id cocok folder, runtime vite                                         |
| `index.html`                                                | Copy, ganti `<title>` dan `theme-color`            | HTML entry point dengan `<div id="root">` dan `<script type="module" src="/src/main.tsx">`                         |
| `package.json`                                              | Copy, ganti `name: "@dhepil-suite/clipboard"`      | npm package dengan script `dev`, `build`, `typecheck`, `preview`; deps antd/react/vite                             |
| `tsconfig.json`                                             | Copy persis dari `spreadsheet-minimal`             | Identik: target ES2022, Bundler resolution, react-jsx, strict, include src + vite.config.ts                        |
| `vite.config.ts`                                            | Copy persis dari `spreadsheet-minimal`             | Identik 3 baris: `import react from '@vitejs/plugin-react'; export default defineConfig({ plugins: [react()] });`  |
| `src/main.tsx`                                              | Copy persis                                        | `createRoot` + `<StrictMode><App /></StrictMode>` + import global.css                                              |
| `src/vite-env.d.ts`                                         | Copy persis                                        | `/// <reference types="vite/client" />`                                                                            |
| `src/App.tsx`                                               | Copy, ganti import screen                          | Render `<ApplicationProviders><ClipboardScreen /></ApplicationProviders>`                                          |
| `src/app/ApplicationProviders.tsx`                          | Copy, ganti `colorPrimary: '#722ed1'`              | `ConfigProvider` + `AntdApp` wrapper; ungu untuk membedakan dari app lain                                          |
| `src/styles/global.css`                                     | Copy persis                                        | Reset + box-sizing + root min-height                                                                               |
| `src/features/clipboard/data/types.ts`                      | **BARU**                                           | Interface `ClipboardColumn`, `ClipboardRow`, `ClipboardCell`, `SortMode`, `STORAGE_KEY`                            |
| `src/features/clipboard/data/useClipboardData.ts`           | **BARU**                                           | Custom hook: load/save localStorage, CRUD kolom/baris/cell, sort, debounce 500ms                                   |
| `src/features/clipboard/screens/ClipboardScreen.tsx`        | **BARU**                                           | Screen utama: antd Table + Input.TextArea + Copy/Delete + Select sort + Empty state                                |
| `src/features/clipboard/screens/ClipboardScreen.css`        | **BARU**                                           | Styling minimal: grid scroll, responsive padding, color accent                                                     |
| `src/features/clipboard/sync/sheetsAdapter.ts`              | **BARU**                                           | Placeholder interface `SheetsSyncAdapter` + factory `createSheetsAdapter()` — throw error sampai diimplementasikan |
| `src/features/clipboard/__tests__/ClipboardScreen.test.tsx` | **BARU**                                           | 10 test case: render, CRUD, copy, sort, localStorage round-trip                                                    |

---

## Data Model

```ts
interface ClipboardColumn {
  id: string; // crypto.randomUUID()
  title: string; // nama kolom, editable
}

interface ClipboardRow {
  id: string; // crypto.randomUUID()
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  cells: Record<string, string>; // columnId → content
}

type SortMode = 'newest' | 'oldest' | 'title-asc' | 'title-desc';
```

- `ClipboardColumn[]` — daftar kolom, tiap kolom punya id dan title editable
- `ClipboardRow[]` — daftar baris, tiap baris punya map `cells: { [columnId]: content }`
- `SortMode` — 4 mode: waktu terbaru, waktu lama, judul A-Z, judul Z-A
- localStorage key: `"clipboard-data"`

### Mengapa model ini?

1. **Kolom dan baris independen** — tambah/hapus kolom tidak merusak data baris lain; hanya key `cells[columnId]` yang ikut terhapus
2. **`Record<string, string>` untuk cells** — lookup O(1) per columnId, tidak perlu loop
3. **`crypto.randomUUID()`** — stable ID, nol dependency, siap sync (ID tetap lintas session)
4. **`createdAt`/`updatedAt`** — cukup untuk conflict resolution last-write-wins saat sync nanti

---

## localStorage Hook Design

```ts
function useClipboardData(): {
  columns: ClipboardColumn[];
  rows: ClipboardRow[];
  sortColumn: string | null;
  sortMode: SortMode;
  setSortColumn: (id: string | null) => void;
  setSortMode: (mode: SortMode) => void;
  addColumn: () => string;
  updateColumn: (id: string, patch: Partial<Pick<ClipboardColumn, 'title'>>) => void;
  deleteColumn: (id: string) => void;
  addRow: () => string;
  updateCell: (rowId: string, columnId: string, content: string) => void;
  deleteRow: (id: string) => void;
  sortedRows: ClipboardRow[];
};
```

- **Load**: `useState` initializer — `JSON.parse(localStorage.getItem(STORAGE_KEY))`, validasi struktur, entry invalid dibuang, fallback `{ columns: [], rows: [] }`
- **Save**: `useEffect` + `useRef` timeout — debounce 500ms, cancel cleanup
- **addColumn**: prepend `{ id: crypto.randomUUID(), title: 'Kolom Baru' }`
- **deleteColumn**: filter kolom + hapus `cells[columnId]` dari semua baris
- **addRow**: prepend `{ id: crypto.randomUUID(), createdAt, updatedAt, cells: {} }`
- **updateCell**: `rows[rowId].cells[columnId] = content` + update `updatedAt`
- **sortedRows**: `useMemo` — `newest` (identity), `oldest` (reverse), `title-asc`/`title-desc` (sort by `cells[sortColumn]` dengan `localeCompare`)

---

## UI Components

### Screen Layout

```
┌─────────────────────────────────────────────────────┐
│  Clipboard                                          │
│                                                      │
│  [Sort Column ▼]  [Sort ▼]  [+ Kolom]  [+ Baris]    │
│                                                      │
│  ┌──────────────┬──────────────┬──────────────┐      │
│  │ Kolom 1  [✕] │ Kolom 2  [✕] │ Kolom 3  [✕] │      │
│  ├──────────────┼──────────────┼──────────────┤      │
│  │ [textarea]   │ [textarea]   │ [textarea]   │ [✕]  │
│  │ [📋]         │ [📋]         │ [📋]         │      │
│  ├──────────────┼──────────────┼──────────────┤      │
│  │ [textarea]   │ [textarea]   │ [textarea]   │ [✕]  │
│  │ [📋]         │ [📋]         │ [📋]         │      │
│  └──────────────┴──────────────┴──────────────┘      │
└─────────────────────────────────────────────────────┘
```

### Komponen antd yang digunakan (semua diimpor langsung dari `antd`)

Tidak ada komponen dari `root/ui/`. Semua diimpor dari `antd` dan `@ant-design/icons`:

```ts
import { App, Button, Empty, Input, Popconfirm, Select, Space, Table, Typography } from 'antd';
import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
```

| Komponen           | Import              | Penggunaan                                                                                                      | Alasan                                                      |
| ------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `Table`            | `antd`              | Grid utama, `dataSource={sortedRows}`, `columns` dinamis, `pagination={false}`, `scroll={{ x: 'max-content' }}` | Sudah ada di antd 6; native sorting, accessible, responsive |
| `Input`            | `antd`              | Edit title kolom di header, `variant="borderless"`                                                              | Ringan, tidak mengganggu layout                             |
| `Input.TextArea`   | `antd`              | Isi cell, `autoSize={{ minRows: 1, maxRows: 8 }}`, `variant="borderless"`                                       | Satu baris tetap nyaman, bisa meluas                        |
| `Button`           | `antd`              | Copy, Tambah, Hapus                                                                                             | Standar antd                                                |
| `CopyOutlined`     | `@ant-design/icons` | Ikon tombol Copy                                                                                                | Ikon universal                                              |
| `PlusOutlined`     | `@ant-design/icons` | Ikon tombol Tambah Kolom / Tambah Baris                                                                         | Jelas, standar                                              |
| `DeleteOutlined`   | `@ant-design/icons` | Ikon tombol Hapus Kolom / Hapus Baris                                                                           | Ikon universal                                              |
| `Popconfirm`       | `antd`              | Konfirmasi hapus kolom/baris, `trigger="click"`                                                                 | Lebih ringan dari modal                                     |
| `Select`           | `antd`              | Pilih kolom sort, pilih mode sort                                                                               | Compact, standar antd                                       |
| `Typography.Title` | `antd`              | Judul halaman "Clipboard"                                                                                       | Konsisten dengan app lain                                   |
| `Space`            | `antd`              | Layout toolbar (gap antar tombol)                                                                               | Standar antd                                                |
| `Empty`            | `antd`              | State kosong saat belum ada baris                                                                               | Standar antd                                                |
| `App.useApp()`     | `antd`              | `message.success('Disalin')` / `message.error('Gagal menyalin')`                                                | Sudah ada `AntdApp` wrapper di `ApplicationProviders.tsx`   |

### Copy behavior

```ts
try {
  await navigator.clipboard.writeText(content);
  message.success('Disalin');
} catch {
  message.error('Gagal menyalin');
}
```

### Responsive

- `scroll={{ x: 'max-content' }}` — horizontal scroll jika kolom melebihi viewport
- CSS: padding 16px desktop, 12px mobile; max-width 100%
- antd Table otomatis responsive

### Accessibility

- `aria-label` di setiap input, button, select
- antd Table native `role="table"`, `role="columnheader"`, `role="cell"`
- `message` announcements via `aria-live`

---

## Google Sheets Sync (Phase 2 — placeholder)

**`sheetsAdapter.ts`** hanya interface dan factory:

```ts
export interface SheetsSyncAdapter {
  exportData(columns: ClipboardColumn[], rows: ClipboardRow[]): Promise<void>;
  importData(): Promise<{ columns: ClipboardColumn[]; rows: ClipboardRow[] }>;
}

export function createSheetsAdapter(): SheetsSyncAdapter {
  return {
    async exportData() {
      throw new Error(
        'Sync adapter belum diimplementasikan. Letakkan kode Tampermonkey/Apps Script di folder ini.',
      );
    },
    async importData() {
      throw new Error('Sync adapter belum diimplementasikan.');
    },
  };
}
```

UI: dua tombol di header — "Ekspor ke Sheets" dan "Impor dari Sheets" — disabled sampai adapter diimplementasikan. Setelah user menaruh kode:

1. Inspeksi kontrak: URL, method, auth, request/response body
2. Implementasi `exportData` (POST/PUT data ke Sheets)
3. Implementasi `importData` (GET dari Sheets, map ke `ClipboardColumn[]` + `ClipboardRow[]`)
4. Conflict: merge by `updatedAt`, last-write-wins

---

## Test Plan

**1 file**: `src/features/clipboard/__tests__/ClipboardScreen.test.tsx`

**10 test cases**:

| #   | Test               | Assertion                                                     |
| --- | ------------------ | ------------------------------------------------------------- |
| 1   | Render empty state | `<Empty>` muncul, tidak ada table                             |
| 2   | Tambah kolom       | Kolom baru muncul dengan title "Kolom Baru"                   |
| 3   | Tambah baris       | Baris baru muncul dengan cell kosong                          |
| 4   | Edit title kolom   | Input menerima teks, nilai tersimpan                          |
| 5   | Ketik di cell      | TextArea menerima teks, nilai tersimpan                       |
| 6   | Klik Copy          | `navigator.clipboard.writeText` dipanggil dengan content cell |
| 7   | Hapus kolom        | Popconfirm muncul, konfirmasi → kolom hilang                  |
| 8   | Hapus baris        | Popconfirm muncul, konfirmasi → baris hilang                  |
| 9   | Sort               | Ganti Select → urutan baris berubah                           |
| 10  | localStorage       | Reload hook → data terbaca kembali                            |

Mock: `navigator.clipboard` via `vi.fn()`, `App.useApp()` via `vi.mock()`, `localStorage` via `vi.stubGlobal()` atau langsung.

---

## Validation Gate

Dari root:

```bash
npm run format:check     # Prettier
npm run lint             # ESLint
npm run typecheck        # TypeScript (tsc --noEmit -p tsconfig.web.json && tsc --noEmit -p tsconfig.node.json)
npm run test             # Vitest
npm run build            # Vite build (root control center)
npx --yes antd lint src --format json
```

Semua 6 harus lulus.

---

## Yang Tidak Dibangun (Sengaja Diskip)

| Fitur                               | Alasan                                           | Kapan ditambah    |
| ----------------------------------- | ------------------------------------------------ | ----------------- |
| Drag-and-drop kolom/baris           | Kompleks, butuh library atau implementasi manual | User minta        |
| Search/filter                       | Cell count belum besar                           | Saat > 50 cell    |
| Pin/favorite, kategori, color label | Tidak diminta                                    | User minta        |
| Dark mode custom                    | antd ConfigProvider sudah handle                 | User minta custom |
| Multi-select / bulk copy            | Tidak diminta                                    | User minta        |
| Keyboard shortcuts                  | Tidak diminta                                    | User minta        |
| Undo/redo                           | Kompleks                                         | User minta        |
| Autosave indicator                  | Debounce 500ms cukup cepat, tidak perlu UI       | User minta        |

---

## Execution Order

1. **Scaffold**: Copy `spreadsheet-minimal` → `clipboard`, ganti 8 file
2. **Data layer**: `types.ts` → `useClipboardData.ts`
3. **UI**: `ClipboardScreen.tsx` + `ClipboardScreen.css`
4. **Sync placeholder**: `sheetsAdapter.ts`
5. **Test**: `ClipboardScreen.test.tsx`
6. **Validation gate**: format → lint → typecheck → test → build → antd lint
