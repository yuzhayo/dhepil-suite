# Clipboard App — Implementation Plan (Strict UI Separation)

## Context & Architecture Rules

Sesuai dengan `PLAYBOOK.md`, Clipboard App akan mengadopsi pola **Strict UI Separation**. Artinya:
1. **CoreUI (`root/ui/`)**: Semua visual komponen UI (Tabel spreadsheet, sel teks area, tombol, layout) **wajib** dibuat di sini sebagai komponen generik yang sepenuhnya terisolasi dan pasif (dumb components).
2. **Clipboard App (`apps/clipboard/`)**: Murni hanya berisi kode logika (_Engine_, _State Management_, _Local Storage Sync_) dan **Gate** (`ClipboardGate.tsx`). Gate bertugas memetakan data dan fungsi logika ke dalam properti (props) komponen CoreUI.

---

## 1. File Tree & Structure

```text
dhepil-suite/
├── ui/
│   ├── contracts.ts                  ← (UPDATE) Tambah tipe SpreadsheetViewModel
│   └── spreadsheet/
│       ├── Spreadsheet.tsx           ← (NEW) Komponen UI murni (Antd Table)
│       └── Spreadsheet.css           ← (NEW) Styling khusus grid dinamis
└── apps/clipboard/
    ├── app.manifest.json
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── app/
        │   └── ApplicationProviders.tsx
        ├── engine/
        │   ├── types.ts              ← (NEW) Model domain (Column, Row, SortMode)
        │   └── useClipboardEngine.ts ← (NEW) Logic CRUD & LocalStorage (Efisiensi Tinggi)
        ├── sync/
        │   └── sheetsAdapter.ts      ← (NEW) Placeholder sinkronisasi Google Sheets
        └── ClipboardGate.tsx         ← (NEW) Gate pengikat Engine <-> CoreUI
```

---

## 2. CoreUI: Generic DataGrid Component (`root/ui/`)

Komponen ini tidak tahu apa-apa soal Clipboard, ID, atau LocalStorage. Ia murni komponen UI untuk merender data tabular dengan teks area dinamis.

### `ui/contracts.ts` (Penambahan Tipe Generik)
```ts
export interface DataGridColumnViewModel {
  id: string;
  title: string;
}

export interface DataGridRowViewModel {
  id: string;
  cells: Record<string, string>; // columnId -> teks konten
}

export type DataGridSortMode = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

export interface DataGridViewModel {
  columns: DataGridColumnViewModel[];
  rows: DataGridRowViewModel[];
  sortColumn: string | null;
  sortMode: DataGridSortMode;
}
```

### `ui/data-grid/DataGrid.tsx`
Menerima `viewModel` dan *action handlers*:
- `onAddColumn()`, `onDeleteColumn(id)`, `onUpdateColumnTitle(id, title)`
- `onAddRow()`, `onDeleteRow(id)`
- `onUpdateCell(rowId, columnId, text)`
- `onCopyCell(text)` (UI hanya melempar teks yang diklik, Gate yang mengeksekusi `navigator.clipboard`)
- `onSortChange(columnId, sortMode)`

**Komponen Antd yang Digunakan:**
`Table`, `Input.TextArea` (autoSize), `Button`, `Popconfirm`, `Select`.

---

## 3. Clipboard App Logic (`apps/clipboard/src/engine/`)

Di sinilah **efisiensi tingkat tinggi** diimplementasikan.

### Data Model (`types.ts`)
```ts
export interface ClipboardColumn {
  id: string; // crypto.randomUUID()
  title: string;
}

export interface ClipboardRow {
  id: string;
  createdAt: number; // Timestamp integer (cepat diurutkan)
  updatedAt: number;
  cells: Record<string, string>; // Lookup O(1)
}
```
*Mengapa efisien?* Menyimpan `cells` sebagai `Record` memberikan akses O(1) ke data spesifik tanpa perlu *looping* untuk mencocokkan ID kolom saat *render* atau pembaruan data. `createdAt` menggunakan `number` (timestamp) lebih cepat untuk komputasi sortir dibandingkan objek `Date` atau string ISO.

### Logic Controller (`useClipboardEngine.ts`)
Sebuah *custom hook* yang menangani State dan Persistence:
1. **In-Memory State (`useState`)**: Mengelola sumber kebenaran utama selama sesi berjalan.
2. **Debounced LocalStorage Save (`useEffect`)**: Setiap kali state `rows` atau `columns` berubah, kita jadwalkan *save* ke `localStorage` dengan penundaan `500ms`. Jika user mengetik cepat di banyak sel secara berurutan, *save* hanya terjadi sekali di akhir. Mencegah *I/O blocking* di _main thread_!
3. **Memoized Sorting (`useMemo`)**: Fungsi sortir murni akan mengembalikan *array* baru HANYA jika `rows`, `sortColumn`, atau `sortMode` berubah. Mengetik di satu baris yang tidak memengaruhi parameter sortir tidak akan memicu kalkulasi ulang secara berat.
4. **Targeted State Update**: Menggunakan metode *immutable spread* per baris:
   ```ts
   setRows((prev) => prev.map(r => r.id === rowId ? { 
     ...r, 
     updatedAt: Date.now(), 
     cells: { ...r.cells, [colId]: newText } 
   } : r))
   ```

---

## 4. Clipboard Gate (`apps/clipboard/src/ClipboardGate.tsx`)

Satu-satunya komponen yang "tahu segalanya" dalam konteks aplikasi ini. Menjembatani hook Engine dengan UI DataGrid.

```tsx
import { App as AntdApp } from 'antd'; // Untuk toast message
import { DataGrid } from '@dhepil/coreui/data-grid'; // Contoh import dari ui/
import { useClipboardEngine } from './engine/useClipboardEngine';

export function ClipboardGate() {
  const engine = useClipboardEngine();
  const { message } = AntdApp.useApp();

  const handleCopyCell = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('Teks disalin!');
    } catch {
      message.error('Gagal menyalin.');
    }
  };

  return (
    <DataGrid 
      viewModel={engine.viewModel}
      onAddColumn={engine.addColumn}
      onUpdateCell={engine.updateCell}
      onCopyCell={handleCopyCell}
      // ... terus pasangkan semua handlers ke engine
    />
  );
}
```

---

## 5. Execution Order (Langkah Eksekusi Selanjutnya)

1. **Phase 1: Bangun CoreUI (`root/ui/`)**
   - Modifikasi `ui/contracts.ts` (Tambah tipe).
   - Buat `ui/data-grid/DataGrid.tsx` dan styling.
   - Buat test untuk memastikan isolasi.
2. **Phase 2: Scaffold App Clipboard (`apps/clipboard/`)**
   - Buat struktur folder, `.manifest.json`, Vite config.
3. **Phase 3: Tulis Engine Logic**
   - `types.ts` dan `useClipboardEngine.ts` (Lengkap dengan test untuk Debounce dan Sort).
4. **Phase 4: Rakit Gate**
   - Buat `ClipboardGate.tsx`, panggil `Spreadsheet`, run di dev server dan test fungsionalitas Copy/Paste.
