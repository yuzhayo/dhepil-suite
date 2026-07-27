# Plan — Dhepil Suite: Discovery, Stable Port Lock, dan Modular Control Center

## 0. Status Dokumen dan Sumber Kebenaran

Dokumen ini adalah satu-satunya plan canonical untuk root control center. Isinya
menggabungkan dua track yang saling berurutan:

1. **Discovery dan stable port lock** — baseline runtime yang sudah diimplementasikan
   dan harus dipertahankan.
2. **Modular control-center UI dan plug-and-play logic** — fase refactor berikutnya
   yang belum diimplementasikan.

Jangan membuat plan architecture kedua untuk feature yang sama. Jika keputusan baru
dibuat, tambahkan atau revisi bagian yang relevan di dokumen ini agar status dan
urutan kerja tetap konsisten.

`execution-plan.md` adalah breakdown operasional dari dokumen ini, bukan source of truth
architecture kedua. Jika keduanya berbeda, keputusan architecture harus diperbaiki di
`plan.md` terlebih dahulu lalu disalin konsisten ke execution breakdown.

## 1. Tujuan

Mengubah root control center Dhepil Suite pada port `1999` menjadi pengelola app lokal
yang plug-and-play:

- setiap app tetap terisolasi di `apps/<app-id>/`;
- folder app baru otomatis ditemukan tanpa mengedit registry manual;
- root memberikan satu port tetap kepada app baru dari rentang yang disediakan;
- port yang sudah diberikan disimpan dan selalu digunakan kembali, bukan dipilih ulang
  pada setiap start;
- app yang servernya tidak aktif tetap terlihat dan dapat dinyalakan dari dashboard;
- app yang foldernya sudah dihapus tidak meninggalkan card mati permanen;
- process yang masih berjalan ketika folder app dihapus tetap dapat dihentikan dengan aman;
- root tidak pernah menjalankan command arbitrer dari browser atau manifest.

Bagian discovery, stable port lock, process lifecycle, dan tombstone sudah tersedia
di runtime. Bagian modular UI, presenter, command boundary, dan extension host masih
merupakan rencana implementasi dan belum boleh dianggap selesai.

## 2. Snapshot Baseline Sebelum Discovery/Port Lock

Snapshot diperiksa pada 23 Juli 2026 di `C:\VSCODE\AntD\dhepil-suite`.

### Git

- Repository lokal mempunyai remote:
  `origin https://github.com/yuzhayo/dhepil-suite`.
- Branch lokal adalah `main`.
- Repository belum mempunyai commit lokal.
- Referensi `origin/main` saat ini dilaporkan `gone`.
- Seluruh source project, termasuk `apps/`, masih berstatus `untracked`.

Implikasi: implementasi harus menjaga seluruh file yang sudah ada sebagai pekerjaan
pengguna. Tidak boleh memakai reset, checkout paksa, atau cleanup file untracked.

### Struktur baseline

```text
dhepil-suite/
├─ src/                          # UI root control center
├─ scripts/
│  └─ project-manager.ts         # Registry, status, start, stop, dan log
├─ apps/
│  ├─ dhepil/
│  └─ spreadsheet-minimal/
├─ projects.config.json          # Registry dan port manual pada baseline lama
└─ package.json                  # npm workspace apps/*
```

Kedua app sudah benar-benar dipisahkan per folder dan masing-masing mempunyai
`package.json`, `src/`, konfigurasi Vite, serta instruksi `AGENTS.md`.

## 3. Perbandingan Baseline Lama dan Implementasi Discovery/Port Lock

| Area                      | Baseline lama                                    | Implementasi/kontrak saat ini                                           |
| ------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| Penemuan app              | Hanya membaca entri `projects.config.json`       | Scan langsung child folder `apps/*`                                     |
| Waktu discovery           | Sekali ketika `ProjectManager` dibuat            | Disinkronkan ulang saat API list/refresh dipanggil                      |
| Menambah app              | Harus membuat folder dan mengedit registry       | Drop/buat folder app yang memenuhi kontrak; card muncul otomatis        |
| ID app                    | Ditulis manual di registry                       | Berasal dari nama folder dan divalidasi                                 |
| Port                      | Ditulis manual di registry                       | Dialokasikan root sekali, lalu disimpan sebagai stable lock             |
| Start ulang               | Memakai port dari registry                       | Selalu memakai port lock yang sama                                      |
| Port bentrok              | HTTP listener dianggap `external`                | Port tidak dipindahkan; card menampilkan konflik/unmanaged              |
| App server mati           | Card tetap tampil                                | Tetap tampil dengan tombol `Start & buka`                               |
| Folder dihapus            | Entri registry tetap menghasilkan card `missing` | Card hilang jika tidak ada managed process                              |
| Folder dihapus saat aktif | Bergantung pada registry statis                  | Tombstone `App not found (404)` tetap tampil agar process dapat di-kill |
| App invalid               | Baru diketahui sebagian ketika Start             | Ditolak saat discovery dengan alasan validasi yang jelas                |
| Command start             | `devScript` berasal dari registry                | Selalu fixed `npm run dev`; manifest tidak boleh mengirim command       |
| Keamanan path             | Path registry divalidasi di bawah `apps/`        | Hanya direct child nyata; symlink/path escape ditolak                   |
| Persistence               | Tidak ada local state selain config statis       | Stable port map ditulis atomik ke local state root                      |
| Test discovery            | Belum ada                                        | Pure discovery, allocator, lifecycle, dan API behavior diuji            |

## 4. Keputusan Arsitektur

### 4.1 Folder adalah sumber keberadaan app

Sebuah app dianggap terpasang hanya jika ada sebagai direct child:

```text
apps/<app-id>/
```

App yang berhenti tidak boleh disembunyikan. Keberadaan folder dan status process adalah
dua hal berbeda:

```text
folder ada + process mati    -> card terlihat, status Tidak aktif, dapat di-start
folder ada + process hidup   -> card terlihat, dapat dibuka/dihentikan
folder hilang + process mati -> card disembunyikan
folder hilang + process hidup -> tombstone 404 terlihat, hanya dapat di-kill
```

### 4.2 Kontrak minimum app

Setiap app yang dapat dikelola root harus mempunyai:

```text
apps/<app-id>/
├─ app.manifest.json
└─ package.json
```

`package.json` wajib memiliki script `dev`. Untuk runtime Vite, script tersebut harus
menerima argumen:

```text
--host 127.0.0.1 --port <locked-port> --strictPort
```

Manifest minimum:

```json
{
  "schemaVersion": 1,
  "id": "spreadsheet-minimal",
  "name": "Spreadsheet Minimal",
  "runtime": "vite"
}
```

Field opsional:

```json
{
  "description": "Editor spreadsheet minimal.",
  "desktop": {
    "enabled": false,
    "script": "desktop:dev"
  }
}
```

Aturan:

- `id` hanya boleh `[a-z0-9-]`;
- `id` harus sama dengan nama folder;
- `name` wajib berupa string non-kosong;
- `schemaVersion` hanya menerima versi yang didukung;
- `runtime` pada fase pertama hanya menerima `vite`;
- manifest tidak mempunyai field shell command;
- start web selalu menjalankan script bernama `dev`;
- konfigurasi Electron tetap milik app dan hanya mengacu pada script yang sudah
  didefinisikan oleh kontrak root.

### 4.3 Stable port lock

Root menggunakan rentang port app:

```text
2000–2999
```

Port `1999` khusus root dan tidak pernah boleh dialokasikan kepada app.

Mapping disimpan di:

```text
config/app-ports.lock.json
```

Contoh:

```json
{
  "schemaVersion": 1,
  "assignments": {
    "dhepil": 2000,
    "spreadsheet-minimal": 2001,
    "app-baru": 2002
  }
}
```

Semantik lock:

1. App baru yang valid dan belum mempunyai mapping mendapat port kosong pertama.
2. Assignment ditulis ke disk sebelum app dapat dijalankan.
3. Root selalu menggunakan kembali port tersebut pada start berikutnya.
4. Root tidak mengganti port otomatis hanya karena port sedang dipakai.
5. Jika proses luar memakai locked port, root menampilkan konflik dan menonaktifkan
   Start sampai port kembali bebas.
6. Menghapus folder tidak langsung menghapus assignment.
7. Jika folder dengan ID sama dipasang kembali, port lama dipakai kembali.
8. Cleanup assignment menjadi operasi maintenance eksplisit di masa depan, bukan efek
   samping discovery.

Lock adalah reservasi di registry root, bukan listener Windows. Saat app berhenti, sistem
operasi masih memungkinkan process lain mengambil port itu; karena itu manager wajib
mendeteksi konflik, bukan melakukan reassignment diam-diam.

`config/app-ports.lock.json` adalah data root yang dilacak Git. Port identity stabil pada
mesin yang sama dan tetap dipertahankan ketika repository di-clone. Alokasi harus
deterministik untuk app baru dengan memproses ID secara alfabetis.

### 4.4 Ownership module root

`scripts/project-manager.ts` saat ini memegang terlalu banyak tanggung jawab. Implementasi
akan memisahkannya menjadi:

```text
scripts/
├─ project-manager.ts           # Orkestrasi lifecycle dan Vite middleware
├─ project-discovery.ts         # Scan folder dan validasi manifest/package
├─ project-port-registry.ts     # Baca, assign, validasi, dan tulis port lock
├─ project-process.ts           # Spawn/kill/log dan probe process
└─ project-contracts.ts         # Tipe runtime internal root
```

Batas ownership:

- discovery tidak melakukan spawn;
- port registry tidak mengetahui React atau HTTP middleware;
- process module tidak memilih port;
- manager mengoordinasikan hasil module dan membentuk API response;
- UI hanya memanggil endpoint terdefinisi dan tidak mengirim command.

Pemisahan dapat disesuaikan jika implementasi membuktikan module yang lebih sedikit lebih
jelas, tetapi discovery, persistence port, dan process lifecycle tetap harus mempunyai
batas yang dapat diuji.

## 5. Model Status Target

Status UI yang dibutuhkan:

| Status          | Arti                                                              | Start/Open                 | Stop/Kill      |
| --------------- | ----------------------------------------------------------------- | -------------------------- | -------------- |
| `stopped`       | Folder valid, locked port bebas, server mati                      | Start & buka               | Disabled       |
| `starting`      | Managed process dibuat tetapi HTTP belum siap                     | Disabled/loading           | Aktif          |
| `running`       | Managed process aktif dan HTTP merespons                          | Buka project               | Aktif          |
| `stopping`      | Kill sedang berjalan                                              | Disabled                   | Loading        |
| `error`         | Spawn/process app gagal                                           | Retry setelah kondisi aman | Sesuai process |
| `invalid`       | Folder ditemukan tetapi kontrak app tidak valid                   | Disabled                   | Disabled       |
| `external`      | Locked port merespons tetapi bukan managed process root           | Buka dengan peringatan     | Disabled       |
| `port-conflict` | Locked port terpakai tetapi endpoint app tidak siap/terverifikasi | Disabled                   | Disabled       |
| `not-found`     | Folder hilang saat managed process masih hidup                    | Disabled                   | Kill aktif     |

Status `missing` saat ini tidak lagi dipakai untuk folder yang sudah dihapus dan process
mati, sebab card tersebut harus disembunyikan.

Untuk process unmanaged, root tidak boleh menawarkan Kill. Quick Kill hanya berlaku untuk
PID yang diluncurkan dan masih dimiliki instance root tersebut.

## 6. Discovery dan Sinkronisasi

### 6.1 Scan

Setiap refresh `GET /api/projects` memicu fungsi sinkronisasi yang:

1. membaca direct children `apps/`;
2. mengabaikan file dan folder tersembunyi;
3. menolak symbolic link;
4. memastikan resolved real path tetap berada langsung di `apps/`;
5. membaca dan memvalidasi `app.manifest.json`;
6. membaca `package.json` dan memvalidasi script `dev`;
7. mengurutkan app valid berdasarkan ID;
8. memuat port lock;
9. memberikan locked port hanya kepada ID yang belum terdaftar;
10. membangun state app tanpa mematikan process yang sedang berjalan.

Sinkronisasi harus memakai satu in-flight promise/lock agar polling 1,5 detik, Refresh,
dan request Start tidak melakukan assignment atau write file secara bersamaan.

### 6.2 Penulisan lock

Penulisan `config/app-ports.lock.json` harus atomik:

1. serialize format canonical;
2. tulis ke temporary file di folder `config`;
3. rename temporary file menjadi `app-ports.lock.json`;
4. jika write gagal, jangan menganggap assignment sudah berhasil.

File rusak tidak boleh ditimpa diam-diam. Root menampilkan error registry yang dapat
ditindaklanjuti dan tidak menjalankan app sampai state diperbaiki.

### 6.3 Probe port

Pemeriksaan perlu membedakan:

- port TCP bebas;
- port TCP dipakai tetapi HTTP tidak merespons;
- HTTP merespons;
- process tersebut managed oleh root.

`fetch()` saja tidak cukup membuktikan port bebas karena listener non-HTTP dapat memakai
port. Gunakan primitive Node `node:net` tanpa dependency baru untuk probe TCP, kemudian
probe HTTP bila relevan.

## 7. Lifecycle Detail

### App baru

1. Pengguna menambahkan folder valid ke `apps/`.
2. Poll berikutnya menemukan app.
3. Root mengambil existing assignment atau memberikan port baru.
4. Card muncul dalam status `Tidak aktif`.
5. Pengguna menekan `Start & buka`.
6. Root menjalankan fixed `npm run dev -- --host 127.0.0.1 --port <port> --strictPort`.

### App tidak aktif

- Card selalu tetap ada selama folder dan kontraknya valid.
- Port tetap dicantumkan.
- Tombol `Start & buka` tetap tersedia jika locked port bebas.

### Locked port sedang dipakai

- Root tidak mengubah mapping.
- Root tidak mencoba port berikutnya.
- Jika unmanaged HTTP server terdeteksi, tampilkan status `external` dan peringatan bahwa
  identitas process tidak diverifikasi.
- Jika listener bukan HTTP, tampilkan `port-conflict`.
- Tombol Stop/Kill disabled karena PID bukan milik root.

### Folder dihapus ketika app mati

- Discovery tidak lagi mengembalikan card.
- Port assignment tetap tersimpan untuk kemungkinan restore.

### Folder dihapus ketika app masih aktif

- Runtime record managed tetap disimpan.
- API mengembalikan tombstone `not-found`.
- Card menampilkan `App not found (404)` beserta port dan PID.
- Tombol Start/Open disabled.
- Tombol Stop/Kill tetap aktif.
- Setelah process berhenti dan runtime record selesai dibersihkan, card menghilang pada
  refresh berikutnya.

### Root ditutup

- Perilaku sekarang dipertahankan: semua child process managed dihentikan.
- Process external tidak pernah disentuh.

## 8. Perubahan File yang Direncanakan

### Tambah

- `apps/dhepil/app.manifest.json`
- `apps/spreadsheet-minimal/app.manifest.json`
- module discovery/port/process/contracts di `scripts/` sesuai batas ownership
- unit test untuk discovery dan port registry
- fixture test di luar `apps/` produksi atau temporary test directory yang aman

### Ubah

- `scripts/project-manager.ts`
  - hapus ketergantungan registry statis;
  - lakukan rescan aman;
  - pertahankan runtime tombstone;
  - gunakan stable port registry;
  - bentuk status invalid/conflict/not-found.
- `src/features/control-center/types.ts`
  - sinkronkan status API baru.
- `src/features/control-center/application/useProjectManager.ts`
  - tangani terminal state baru selama proses start.
- `src/features/control-center/application/projectCollection.ts`
  - pastikan sorting/search tetap bekerja untuk status baru.
- `src/features/control-center/components/ProjectCard.tsx`
  - status, alert, dan enable/disable action sesuai lifecycle.
- `src/features/control-center/screens/ControlCenterScreen.tsx`
  - quick server list memasukkan tombstone managed yang masih dapat di-kill;
  - tidak menawarkan kill untuk external/conflict.
- `src/App.test.tsx`
  - ganti fixture `missing` dan tambahkan behavior not-found/conflict.
- `src/features/control-center/application/projectCollection.test.ts`
  - cover status baru jika memengaruhi active-first.
- `config/app-ports.lock.json`
  - simpan stable assignment sebagai data root yang dilacak Git.
- root dan app `AGENTS.md`
  - hapus aturan port/registry manual;
  - dokumentasikan manifest dan stable lock.

### Hapus

- `projects.config.json` setelah dua manifest existing terbukti terbaca dan test migrasi
  lulus.

Tidak ada file di artifact lama `C:\VSCODE\AntD\dhepil` yang boleh diimpor, dipindah,
atau dihapus.

## 9. Tahap Implementasi Baseline (Sudah Diterapkan)

### Fase 1 — Kontrak dan pure validation

- Tambahkan tipe manifest, discovered app, port assignment, dan runtime state.
- Implementasikan parser manifest/package dengan error terstruktur.
- Implementasikan validasi ID/path/direct-child.
- Tambahkan unit test untuk input valid dan invalid.

Exit criteria:

- app existing lulus kontrak;
- duplicate/mismatched ID, symlink, path escape, manifest rusak, dan script `dev` hilang
  ditolak secara deterministik.

### Fase 2 — Stable port registry

- Implementasikan load, validate, allocate, dan atomic save.
- Reservasi rentang `2000–2999`.
- Pertahankan assignment app yang foldernya hilang.
- Tambahkan serialization dan allocation tests.

Exit criteria:

- app yang sama selalu mendapat port sama setelah manager dibuat ulang;
- app baru mendapat port bebas berikutnya;
- duplicate/out-of-range/corrupt lock menghasilkan error;
- concurrent discovery tidak menghasilkan assignment ganda.

### Fase 3 — Dynamic discovery

- Ganti `projects.config.json` dengan scan `apps/*`.
- Tambahkan manifest untuk dua app saat ini.
- Rescan setiap list/refresh dengan synchronization guard.
- App valid baru muncul tanpa restart root.
- Folder app stopped yang dihapus menghilang tanpa restart root.

Exit criteria:

- tambah folder fixture valid -> muncul;
- hapus folder fixture stopped -> hilang;
- app existing tetap berada di port 2000 dan 2001.

### Fase 4 — Runtime lifecycle dan port conflict

- Pisahkan TCP occupancy dari HTTP readiness.
- Cegah start pada locked port yang dipakai unmanaged process.
- Pertahankan managed runtime saat folder menghilang.
- Implementasikan tombstone 404 dan kill.

Exit criteria:

- port conflict tidak menyebabkan reassignment;
- root tidak membunuh external process;
- folder dihapus saat running menghasilkan tombstone;
- tombstone hilang setelah managed process dihentikan.

### Fase 5 — UI integration

- Tambahkan presentation untuk `invalid`, `port-conflict`, dan `not-found`.
- Sesuaikan tombol Start/Open/Stop.
- Sesuaikan dropdown server aktif dan quick kill.
- Pertahankan grid/list/search/sort dan internal scrollbar yang sudah ada.

Exit criteria:

- stopped app terlihat dan dapat di-start;
- invalid/conflict tidak dapat di-start;
- not-found managed dapat di-kill;
- status tidak hanya dibedakan dengan warna;
- tidak ada perubahan layout besar di luar behavior status.

### Fase 6 — Migration cleanup dan dokumentasi

- Hapus `projects.config.json`.
- Perbarui root dan app `AGENTS.md`.
- Pastikan tidak ada referensi registry statis.
- Dokumentasikan cara menambah app:
  buat folder, manifest, package, lalu tunggu refresh dashboard.

## 10. Test Matrix

### Pure/unit

- parse manifest valid;
- manifest JSON rusak;
- schema version tidak didukung;
- ID invalid;
- ID berbeda dengan folder;
- `name` kosong;
- runtime tidak didukung;
- package tanpa `scripts.dev`;
- child berupa file;
- child berupa symlink;
- path escape;
- lock kosong;
- existing assignment dipakai ulang;
- port 1999 ditolak;
- assignment di luar rentang ditolak;
- duplicate port ditolak;
- alokasi memilih port kosong pertama;
- app hilang tidak langsung menghapus assignment;
- corrupt lock tidak ditimpa.

### Manager/API

- `GET /api/projects` menemukan app existing;
- app baru muncul setelah scan berikutnya;
- stopped app tetap dikembalikan;
- deleted stopped app tidak dikembalikan;
- deleted running app dikembalikan sebagai `not-found`;
- Start selalu memakai locked port;
- Start menolak unmanaged port conflict;
- Stop hanya bekerja pada managed PID;
- quick kill tidak dapat membunuh external process;
- log tetap dibatasi dan ANSI tetap dibersihkan.

### UI behavior

- card stopped mempunyai tombol Start aktif;
- card invalid/conflict mempunyai Start disabled dan alasan yang terlihat;
- external tidak mempunyai Stop aktif;
- tombstone mempunyai label 404 dan Kill aktif;
- tombstone hilang setelah response API tidak lagi memuatnya;
- search berdasarkan nama/folder/port tetap bekerja;
- sort active-first tetap konsisten;
- dropdown quick server hanya memberi action Kill kepada managed process.

## 11. Validasi Wajib Setelah Implementasi

Jalankan dari root `dhepil-suite`:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npx --yes antd lint src --format json
```

Runtime smoke test:

1. pastikan port 1999, 2000, dan 2001 bebas;
2. start root pada 1999;
3. verifikasi dua app existing muncul stopped dengan locked port;
4. start/stop masing-masing app dari dashboard;
5. tambahkan fixture app valid dan buktikan card muncul tanpa restart;
6. restart root dan buktikan fixture memakai port yang sama;
7. hapus fixture ketika stopped dan buktikan card hilang;
8. hapus fixture ketika running dan buktikan tombstone + Kill;
9. isi locked port dengan listener external dan buktikan tidak ada reassignment;
10. hentikan seluruh process QA dan pastikan tidak ada listener tertinggal.

Browser QA:

- desktop grid dan list;
- viewport sempit untuk toolbar/card overflow;
- keyboard focus untuk Start, Stop, dropdown, search, sort, dan segmented control;
- status stopped, running, external/conflict, invalid, serta not-found;
- tidak ada console error.

## 12. Acceptance Criteria

Implementasi dianggap selesai hanya jika:

- menambah folder app valid tidak memerlukan edit file registry root;
- card app baru muncul paling lambat setelah satu siklus polling;
- app mendapat tepat satu port dari root;
- port tersebut tetap sama setelah stop/start dan restart root;
- root tidak melakukan fallback/reassignment ketika locked port bentrok;
- app stopped tidak pernah disembunyikan selama foldernya masih ada;
- deleted stopped app hilang dari dashboard;
- deleted running app tetap mempunyai Kill melalui tombstone 404;
- setelah Kill, tombstone hilang;
- app external tidak dapat di-kill oleh root;
- tidak ada arbitrary command dari manifest atau request browser;
- app tidak mengimpor source root atau app lain;
- seluruh automated validation lulus;
- browser QA membuktikan behavior utama tanpa console error.

## 13. Risiko dan Guardrail

- **Race assignment:** serialize discovery dan atomic write.
- **Port dicuri process lain:** detect conflict, jangan reassign.
- **Wrong external app dibuka:** tampilkan status/peringatan unmanaged; jangan menganggap
  identitasnya terverifikasi.
- **Manifest berbahaya:** schema allowlist dan fixed script name.
- **Path traversal/symlink:** direct-child + realpath containment check.
- **Folder hilang saat process aktif:** simpan runtime snapshot minimum sampai process mati.
- **Corrupt lock:** fail closed dan tampilkan error; jangan overwrite otomatis.
- **Git cleanup berbahaya:** seluruh source saat ini untracked, sehingga implementasi tidak
  boleh menjalankan clean/reset terhadap working tree.
- **Perubahan app saling mengganggu:** setiap app tetap menjadi workspace dan ownership
  terpisah; root hanya membaca kontrak publiknya.

## 14. Di Luar Scope

- instalasi atau packaging Electron;
- menjalankan lebih dari satu instance untuk app yang sama;
- remote deployment atau process manager produksi;
- kill arbitrary PID;
- memilih atau mengubah port secara manual dari browser;
- menghapus port assignment otomatis;
- mengimpor code dari artifact lama;
- menambah dependency bila primitive Node bawaan sudah mencukupi.

## 15. Full Modular Control Center UI dan Plug-and-Play Logic

Bagian berikut adalah hasil full merge rencana modular ke plan canonical. Nomor
subbagian tetap dipertahankan di bawah section 15 agar tidak bertabrakan dengan bagian
discovery dan stable port lock di atas.

> Status aktual: bagian modular ini masih berupa rencana. Discovery, stable port lock,
> process lifecycle, dan tombstone pada bagian sebelumnya sudah tersedia di runtime.

### 1. Tujuan

Merombak feature `control-center` agar:

- Header, Toolbar, Grid, dan Card mempunyai owner UI masing-masing;
- penambahan atau penghapusan control hanya dilakukan pada definition milik area tersebut;
- file UI tidak memiliki business rule, data access, polling, filtering, atau lifecycle logic;
- logic baru dapat dipasang sebagai module terisolasi tanpa mengubah logic matang;
- screen hanya menjadi composition root;
- layout konsisten pada semua viewport melalui satu kontrak layout;
- behavior yang sudah bekerja—discovery, stable port, start, stop, quick kill, search, sort,
  grid/list, error, dan tombstone—tidak berubah selama refactor.

Dokumen ini hanya rencana implementasi. Penambahan dokumen ini tidak mengubah behavior
runtime.

### 2. Non-Goal

Refactor ini tidak mencakup:

- perubahan API `/api/projects`;
- perubahan process manager di `scripts/`;
- perubahan discovery app atau stable port lock;
- perubahan source app di `apps/*`;
- penambahan Electron;
- redesign visual besar;
- penambahan state-management dependency;
- pemindahan control center menjadi package terpisah;
- plugin dari source eksternal atau download runtime;
- eksekusi shell command dari plugin browser;
- penambahan CI workflow atau pre-commit hook tanpa persetujuan scope terpisah;
- optimasi probe/cache di `scripts/` tanpa pengukuran yang membuktikan bottleneck.

### 3. Kondisi Sekarang

#### `ControlCenterScreen.tsx`

Saat ini screen memiliki terlalu banyak tanggung jawab:

- state search, sort, dan view mode;
- pemilihan project aktif;
- filtering dan sorting project;
- pembentukan AntD menu items;
- policy quick kill;
- handler quick kill;
- markup Header;
- markup Toolbar;
- loading, error, empty, dan ready state;
- komposisi Grid dan Card.

Akibatnya, menambah satu control toolbar dapat menyentuh state, policy, markup, dan layout
dalam file yang sama.

#### `useProjectManager.ts`

Hook saat ini memiliki:

- HTTP access;
- polling;
- mounted-state guard;
- pending-state ownership;
- start command;
- stop command;
- waiting-tab browser integration;
- startup retry loop;
- error normalization.

Logic tersebut sudah bekerja, tetapi belum mempunyai adapter atau command boundary.

#### `ProjectCard.tsx`

Card masih menghitung:

- `canStart`;
- `canStop`;
- active/open state;
- action label;
- loading state;
- status presentation;
- log truncation.

UI card belum murni presentational.

#### `src/styles.css`

Global stylesheet saat ini memiliki:

- document reset;
- control-center shell;
- Header;
- Toolbar;
- Grid/List;
- Card;
- Terminal;
- quick-server menu;
- seluruh breakpoint.

Perubahan layout satu area berisiko memengaruhi area lain.

#### Test

Behavior dasar sudah diuji, tetapi test masih dominan pada screen besar. Belum ada test
khusus untuk:

- view-model contract;
- action policy;
- plugin validation;
- duplicate action ID;
- missing command;
- import boundary;
- layout invariant per viewport.

#### Temuan terverifikasi yang menjadi input refinement

Audit source aktual mengonfirmasi celah berikut:

1. **Status policy terduplikasi.** Klasifikasi `running`, `external`, terminal failure,
   active server, start, stop, dan quick-kill masih berupa literal berbeda di
   `useProjectManager.ts`, `ProjectCard.tsx`, `ControlCenterScreen.tsx`, dan
   `projectCollection.ts`.
2. **`useProjectManager.ts` memiliki beberapa concern sekaligus.** Hook menggabungkan
   HTTP, polling, mounted guard, pending state, startup retry, waiting-tab browser effect,
   dan error normalization.
3. **Screen masih memiliki policy dan AntD menu composition.** Pemilihan active project,
   quick-kill eligibility, menu item JSX, dan handler masih berada langsung di
   `ControlCenterScreen.tsx`.
4. **HTTP contract masih berupa cast.** `readProjects` dan `runAction` memakai global
   `fetch`, cast payload, dan generic `Error` tanpa adapter, response parser, typed error,
   atau cancellation.
5. **Manager belum mempunyai characterization concurrency/performance.** `stateFor`
   melakukan TCP/HTTP probe pada setiap list, sedangkan test belum secara eksplisit
   membuktikan single-flight synchronization untuk request yang overlap.
6. **Architecture boundary belum enforceable.** `eslint.config.ts` belum mempunyai rule
   import-boundary sehingga dependency direction masih bergantung pada review manual.
7. **Validation gate masih manual.** Belum ada `.github` workflow atau pre-commit hook.
   Ini dicatat sebagai follow-up terpisah, bukan diam-diam dimasukkan ke scope refactor.
8. **Log mempunyai dua limit tanpa kontrak tertulis.** Runtime menyimpan maksimum 120
   baris, sedangkan card merender 80 baris terakhir.

Keputusan refinement:

- domain status/policy dan architecture boundary dikerjakan sebelum extraction UI;
- retry timing, request cancellation, HTTP parsing, dan typed error menjadi kontrak
  eksplisit pada ports/adapters/commands;
- dua limit log boleh tetap berbeda, tetapi harus bernama, terdokumentasi, dan diuji;
- concurrency/origin-route tests masuk characterization baseline;
- CI dan probe caching tetap deferred sampai disetujui atau dibuktikan perlu.

### 4. Prinsip Target

#### 4.1 Satu owner untuk setiap area UI

```text
Header  -> ui/header/
Toolbar -> ui/toolbar/
Grid    -> ui/grid/
Card    -> ui/card/
Shell   -> ui/layout/
```

File di luar owner tidak boleh membuat ulang markup atau layout area tersebut.

#### 4.2 UI hanya menerima data siap-render

UI diperbolehkan:

- merender JSX;
- mengimpor Ant Design;
- mengimpor CSS miliknya;
- membaca props;
- melakukan render mapping;
- meneruskan callback;
- menormalisasi event UI menjadi value sederhana;
- mencocokkan definition action ID dengan `availableActionIds` untuk menonaktifkan
  handler yang tidak terpasang;
- menyediakan semantic HTML, accessible name, dan ARIA.

UI tidak diperbolehkan:

- `fetch`;
- polling atau timer;
- `window.open`;
- memilih project aktif;
- menentukan domain permission apakah action boleh dijalankan;
- menghitung status;
- filter atau sort data;
- memotong log;
- mengenal endpoint;
- mengimpor application hook, data adapter, atau plugin implementation;
- menyimpan business state.

Contoh yang tidak boleh tersisa di UI:

```ts
const canStop = project.managed && project.status !== 'stopping';
```

UI hanya menerima hasil akhirnya:

```ts
{
  disabled: false,
  loading: false,
  actionId: "project.stop"
}
```

Static label `"Stop server"` dan visual priority berasal dari `cardDefinition.ts`.

#### 4.3 Logic mengikuti Open–Closed Principle

- logic matang tertutup terhadap perubahan internal;
- fitur baru ditambahkan melalui module baru;
- module berkomunikasi melalui kontrak host;
- module tidak mengimpor internal module lain;
- controller tidak mempunyai switch statement untuk setiap plugin baru.

Status policy adalah invariant domain, bukan concern presenter:

```ts
type ProjectActionContext = {
  status: ProjectStatus;
  managed: boolean;
  pending: boolean;
};

function isActiveProject(status: ProjectStatus): boolean;
function isOpenReadyProject(status: ProjectStatus): boolean;
function isStartupTerminalFailure(status: ProjectStatus): boolean;
function canStartProject(context: ProjectActionContext): boolean;
function canStopProject(context: ProjectActionContext): boolean;
function canQuickKillProject(context: ProjectActionContext): boolean;
```

Presenter boleh mengubah hasil policy menjadi semantic action/status key,
disabled/loading, alert kind, dan dynamic value, tetapi tidak boleh menentukan ulang
policy dengan status literalnya sendiri. Static label/order/visual priority tetap milik
definition UI.

Policy invariant:

- pending action menonaktifkan start, stop, dan quick-kill;
- start hanya untuk unmanaged `stopped` atau `error`;
- stop/quick-kill hanya untuk managed project pada status family yang stoppable;
- `external` tidak pernah stoppable;
- managed `not-found` tetap stoppable agar tombstone dapat dibersihkan.

#### 4.4 Tidak ada dependency baru

Gunakan:

- React hooks yang sudah ada;
- TypeScript;
- Vite `import.meta.glob`;
- Ant Design 6;
- Vitest.

### 5. Struktur Target

```text
src/features/control-center/
├─ application/
│  ├─ controller/
│  │  └─ useControlCenterController.ts
│  ├─ composition/
│  │  └─ createControlCenterRuntime.ts
│  ├─ commands/
│  │  ├─ refreshProjects.ts
│  │  ├─ startAndOpenProject.ts
│  │  ├─ startupReadinessPolicy.ts
│  │  ├─ stopProject.ts
│  │  └─ quickKillProject.ts
│  ├─ extensions/
│  │  ├─ contracts.ts
│  │  ├─ createExtensionHost.ts
│  │  ├─ loadExtensions.ts
│  │  └─ modules/
│  │     ├─ project-lifecycle/
│  │     │  └─ index.ts
│  │     ├─ project-refresh/
│  │     │  └─ index.ts
│  │     └─ quick-kill/
│  │        └─ index.ts
│  ├─ ports/
│  │  ├─ ProjectManagerClient.ts
│  │  └─ ProjectWindow.ts
│  ├─ presenters/
│  │  ├─ createControlCenterViewModel.ts
│  │  ├─ createHeaderViewModel.ts
│  │  ├─ createToolbarViewModel.ts
│  │  ├─ createGridViewModel.ts
│  │  ├─ createProjectCardViewModel.ts
│  │  └─ presentationLimits.ts
│  ├─ view-models.ts
│  └─ useProjectManager.ts
├─ data/
│  ├─ httpProjectManagerClient.ts
│  ├─ projectManagerResponse.ts
│  └─ browserProjectWindow.ts
├─ domain/
│  ├─ project.ts
│  ├─ projectActionPolicy.ts
│  ├─ projectCollection.ts
│  └─ projectStatus.ts
├─ screens/
│  └─ ControlCenterScreen.tsx
├─ ui/
│  ├─ layout/
│  │  ├─ ControlCenterLayout.tsx
│  │  ├─ controlCenterLayout.css
│  │  └─ layoutTokens.css
│  ├─ header/
│  │  ├─ ControlCenterHeader.tsx
│  │  ├─ headerDefinition.ts
│  │  └─ ControlCenterHeader.css
│  ├─ toolbar/
│  │  ├─ ProjectToolbar.tsx
│  │  ├─ toolbarDefinition.ts
│  │  └─ ProjectToolbar.css
│  ├─ grid/
│  │  ├─ ProjectGrid.tsx
│  │  ├─ gridDefinition.ts
│  │  └─ ProjectGrid.css
│  └─ card/
│     ├─ ProjectCard.tsx
│     ├─ cardDefinition.ts
│     ├─ ProjectTerminal.tsx
│     └─ ProjectCard.css
└─ types.ts
```

Struktur boleh disederhanakan hanya jika ownership tetap sama. Jangan menggabungkan area
kembali ke screen besar.

### 6. Dependency Direction

```text
data adapters ──implements──> application ports
       │                           │
       └──── assembled by composition runtime
                                   │ injected into
                                   ▼
controller ──uses──> commands + extension host + presenters
                                   │
                                   ▼
                              view models
                                   │ rendered by
                                   ▼
                               pure UI
                                   │ composed by
                                   ▼
                                 screen

domain rules are consumed by commands and presenters, never by UI.
```

Aturan import:

```text
screen -> controller + UI
UI -> view-model types + AntD + local CSS
controller -> composition + commands + presenters + extensions
composition -> concrete data adapters + port wiring
commands -> ports + domain
extensions -> extension contracts + capabilities exposed by context
data -> application ports + API types
domain -> tidak mengimpor React, AntD, data, UI, atau application
```

Larangan:

- UI tidak mengimpor controller.
- UI tidak mengimpor data.
- UI tidak mengimpor extension module.
- extension module tidak mengimpor UI.
- extension module tidak mengimpor internal extension lain.
- domain tidak mengimpor layer lain.
- controller tidak mengimpor concrete data adapter secara langsung; wiring berada di
  `application/composition/createControlCenterRuntime.ts`.
- `application/composition/` adalah satu-satunya composition boundary yang boleh mengimpor
  concrete data adapter untuk membentuk port implementation.

Boundary harus menjadi executable guardrail, bukan dokumentasi saja:

- gunakan ESLint built-in `no-restricted-imports`; tidak perlu dependency baru;
- pasang rule untuk folder target `ui/`, `domain/`, `data/`, dan
  `application/extensions/` pada Fase 0 sebelum folder tersebut mulai dipakai;
- rule screen yang hanya mengizinkan controller + layout diaktifkan setelah import legacy
  dipindahkan pada Fase 8 agar baseline tidak dipaksa gagal;
- tambahkan architecture test kecil untuk invariant yang tidak praktis diekspresikan
  dengan glob ESLint;
- lint harus gagal jika layer baru melanggar dependency direction.

### 7. Source of Truth UI

#### 7.1 Header

Owner:

```text
ui/header/
```

`headerDefinition.ts` menjadi satu-satunya tempat untuk:

- title;
- subtitle;
- urutan action header;
- label;
- action ID;
- accessible name;
- visual priority.

Contoh kontrak:

```ts
interface HeaderActionDefinition {
  id: string;
  label: string;
  actionId: string;
  kind: 'default' | 'primary' | 'danger';
  order: number;
}
```

Jika ingin menambah atau menghapus tombol header, hanya definition ini yang diubah untuk
UI. Logic action dipasang sebagai extension terpisah.

#### 7.2 Toolbar

Owner:

```text
ui/toolbar/
```

`toolbarDefinition.ts` menjadi satu-satunya source of truth untuk:

- Search;
- Sort;
- Grid/List;
- Refresh;
- Active Server dropdown;
- Summary;
- control baru pada masa depan;
- order dan grouping control;
- responsive priority.

Definition bersifat deklaratif dan tidak memiliki callback implementation.

Contoh:

```ts
type ToolbarControlDefinition =
  | {
      id: 'project-search';
      kind: 'search';
      actionId: 'project.search.change';
      order: number;
    }
  | {
      id: 'project-refresh';
      kind: 'button';
      actionId: 'project.refresh';
      label: 'Refresh';
      order: number;
    };
```

`ProjectToolbar.tsx` hanya:

- membaca definition;
- mencocokkan definition dengan view model;
- merender control;
- meneruskan action ID dan payload.

#### 7.3 Grid

Owner:

```text
ui/grid/
```

`gridDefinition.ts` memiliki presentation contract:

- loading skeleton count;
- empty-state copy;
- grid/list accessible label;
- card ordering policy name dari view model;
- layout mode yang tersedia.

Grid menerima discriminated view model:

```ts
type ProjectGridViewModel =
  | { state: 'loading'; skeletonCount: number }
  | { state: 'empty'; title: string }
  | {
      state: 'ready';
      viewMode: 'grid' | 'list';
      projects: ProjectCardViewModel[];
    };
```

Grid tidak memutuskan kapan state loading/empty/ready terjadi.

`ProjectGrid.tsx` boleh mengimpor `ui/card/ProjectCard.tsx` sebagai peer UI untuk
melakukan render mapping `ProjectCardViewModel[]`. Larangan yang berlaku adalah
memasukkan policy, domain model, atau application logic ke dalam mapping tersebut.

#### 7.4 Card

Owner:

```text
ui/card/
```

`cardDefinition.ts` memiliki:

- urutan action;
- status presentation;
- tag presentation;
- alert presentation;
- terminal title.

Policy `canStart` dan `canStop` tidak berada di definition. Policy tersebut tetap domain
logic dan hasilnya dimasukkan ke view model.

Maximum rendered log lines tetap dimiliki
`application/presenters/presentationLimits.ts` karena pemotongan terjadi sebelum data
masuk UI; `cardDefinition.ts` tidak menduplikasi angka tersebut.

`ProjectCard.tsx` hanya menerima:

```ts
interface ProjectCardViewModel {
  id: string;
  name: string;
  status: StatusViewModel;
  actions: CardActionViewModel[];
  tags: TagViewModel[];
  alerts: AlertViewModel[];
  terminal: TerminalViewModel;
}
```

### 8. Layout Source of Truth

#### 8.1 Global style

`src/styles.css` setelah migrasi hanya boleh berisi:

- `:root` base color;
- box sizing;
- `html`, `body`, `#root`;
- base focus/tap behavior;
- `.sr-only` jika tetap global.

Semua style control center keluar dari global stylesheet.

#### 8.2 Layout tokens

`ui/layout/layoutTokens.css` menjadi satu-satunya tempat untuk nilai layout lintas-area:

```css
.control-center {
  --layout-max-width: 1180px;
  --layout-inline-gutter: 16px;
  --layout-section-gap: 10px;
  --toolbar-gap: 8px;
  --grid-gap: 12px;
  --grid-columns: 2;
  --grid-card-aspect: 1 / 1;
  --grid-terminal-height: auto;
  --list-terminal-height: 126px;
}
```

Breakpoint hanya didefinisikan di file ini. CSS Header/Toolbar/Grid/Card hanya mengonsumsi
variables.

Target viewport contract:

| Viewport  | Grid columns | Card       | Terminal                    |
| --------- | ------------ | ---------- | --------------------------- |
| ≥901px    | 2            | 1:1        | Mengisi sisa card           |
| 701–900px | 1            | Terkontrol | Mengisi sisa card           |
| ≤700px    | 1            | Auto       | Grid 180px, internal scroll |
| ≤480px    | 1            | Auto       | Grid 180px, compact gutter  |

#### 8.3 Scroll ownership

```text
body
└─ tidak scroll
   └─ ControlCenterLayout
      └─ tidak scroll
         └─ ProjectGrid scroll container
            └─ Card tidak scroll
               └─ ProjectTerminal pre scroll
```

Tidak boleh ada dua parent vertical scroll untuk isi yang sama.

### 9. Application View Models

`application/view-models.ts` adalah kontrak antara logic dan UI.

Minimal contract:

```ts
interface ControlCenterViewModel {
  header: HeaderViewModel;
  toolbar: ToolbarViewModel;
  grid: ProjectGridViewModel;
  availableActionIds: readonly string[];
  pageAlert?: AlertViewModel;
}

interface UiActionViewModel {
  actionId: string;
  disabled: boolean;
  loading: boolean;
}
```

Presenter bertanggung jawab untuk:

- menentukan semantic status key/tone;
- menentukan action tersedia, disabled, dan loading;
- menentukan loading dan disabled state;
- memilih semantic alert/tag kind dan dynamic value;
- membentuk quick-server items;
- memotong log;
- membentuk summary;
- mengubah domain model menjadi data siap render.

Definition UI bertanggung jawab untuk static copy, label, order, visual priority, dan
mapping semantic kind ke komponen AntD. Presenter/application tidak mengimpor definition
UI. Dengan pembagian ini, logic permission tetap domain/application sementara perubahan
label/layout tetap terlokalisasi pada owner UI.

Presenter harus pure dan mempunyai unit test langsung.

Log presentation memakai kontrak bernama:

```ts
export const MAX_RENDERED_LOG_LINES = 80;
```

Nilai ini berbeda secara sengaja dari `MAX_RUNTIME_LOG_LINES = 120` di process manager:
runtime mempertahankan sedikit history tambahan, sedangkan presenter membatasi payload
visual card. Component tidak boleh memanggil `slice(-80)` secara langsung. Kedua nilai
harus mempunyai test agar perubahan salah satu tidak menjadi drift tersembunyi.

### 10. Data dan Browser Adapters

#### `ProjectManagerClient`

Kontrak:

```ts
interface ProjectManagerClient {
  list(signal?: AbortSignal): Promise<ProjectSummary[]>;
  start(projectId: string, signal?: AbortSignal): Promise<void>;
  stop(projectId: string, signal?: AbortSignal): Promise<void>;
}
```

Implementasi HTTP dipindahkan ke:

```text
data/httpProjectManagerClient.ts
```

Adapter HTTP juga wajib memiliki:

- `parseProjectsResponse` untuk validasi minimum shape response sebelum masuk application;
- `ProjectManagerRequestError` dengan HTTP status, action, dan message terstruktur;
- fallback aman ketika error response bukan JSON;
- forwarding `AbortSignal` ke setiap request;
- tidak ada retry generik tersembunyi di adapter.

Startup readiness retry tetap menjadi policy command karena ia adalah workflow produk,
bukan transport behavior. Policy menerima konfigurasi/injection:

```ts
interface StartupReadinessPolicy {
  maximumAttempts: number;
  delayMilliseconds: number;
  sleep(milliseconds: number, signal?: AbortSignal): Promise<void>;
}
```

Production default mempertahankan behavior saat ini (`40 × 750 ms`). Test menyuntikkan
fake sleep/timer sehingga tidak menunggu 30 detik nyata.

Workflow readiness yang mengonsumsi policy harus memiliki runner terpisah dan wajib
menghormati `AbortSignal`:

```ts
interface StartupReadinessRunner {
  waitUntilReady(input: {
    readStatus(): Promise<ProjectSummary | undefined>;
    isReady(project: ProjectSummary | undefined): boolean;
    isTerminalFailure(project: ProjectSummary | undefined): boolean;
    signal?: AbortSignal;
  }): Promise<ProjectSummary>;
}
```

`sleep` production harus reject secara terkendali ketika signal dibatalkan; abort tidak
boleh diterjemahkan menjadi page error.

#### `ProjectWindow`

Kontrak:

```ts
interface ProjectWindow {
  prepare(project: ProjectSummary): PreparedProjectWindow | undefined;
  open(url: string): void;
}
```

Implementasi `window.open`, waiting page, close, dan redirect dipindahkan ke:

```text
data/browserProjectWindow.ts
```

Dengan demikian command dapat diuji tanpa browser sungguhan.

### 11. Plug-and-Play Logic Extensions

#### 11.1 Kontrak

```ts
interface ControlCenterExtension {
  schemaVersion: 1;
  id: string;
  actions: Record<string, ControlCenterAction>;
}

interface ControlCenterActionContext {
  refresh(): Promise<ProjectSummary[]>;
  startAndOpen(projectId: string): Promise<void>;
  stop(projectId: string): Promise<void>;
  quickKill(projectId: string): Promise<void>;
  setPending(projectId: string, pending: boolean): void;
  reportError(error: unknown): void;
}
```

Extension hanya menerima capability tingkat tinggi yang diberikan host. Extension tidak
menerima `ProjectManagerClient`, `ProjectWindow`, React state setter mentah, atau arbitrary
browser API. Port dan browser adapter tetap menjadi detail command/composition.

`createExtensionHost` mempublikasikan `actionIds` dan mengembalikan structured result untuk
unknown action. `ControlCenterViewModel.availableActionIds` membawa capability tersebut
ke pure UI bersama action ID local reducer milik controller. Header, Toolbar, dan Card
mencocokkan definition dengan daftar itu; action tanpa handler tetap terlihat tetapi
disabled. Jika action ID yang tidak terpasang tetap didispatch secara programmatic, host
mengembalikan structured diagnostic tanpa membuat dashboard crash. Application tidak
mengimpor definition UI.

#### 11.2 Discovery

Loader:

```ts
import.meta.glob('./modules/*/index.ts', {
  eager: true,
  import: 'default',
});
```

Memasang logic baru:

```text
application/extensions/modules/<extension-id>/index.ts
```

Tidak perlu mengubah controller atau extension matang.

#### 11.3 Guardrail

Host wajib memvalidasi:

- `schemaVersion === 1`;
- ID memakai pola stabil;
- extension ID unik;
- action ID unik;
- action berbentuk function;
- host mempublikasikan action ID yang terpasang;
- reconciliation definition UI menandai action tanpa handler sebagai disabled;
- error satu extension tidak merusak polling;
- action unknown ditolak dengan pesan terstruktur;
- extension tidak dapat mengirim shell command;
- extension tidak dapat kill PID secara langsung.

Jika UI definition menunjuk action yang belum terpasang:

- control tetap terlihat;
- control disabled;
- direct/programmatic dispatch menghasilkan structured diagnostic;
- dashboard tidak crash.

#### 11.4 Core extensions

Behavior existing dimigrasikan menjadi module:

```text
project-refresh -> project.refresh
project-lifecycle -> project.start-open, project.stop
quick-kill -> project.quick-kill
```

Search, sort, dan view mode boleh tetap menjadi core controller reducer karena semuanya
adalah local presentation state. Jangan memaksanya menjadi async plugin.

### 12. Controller

`useControlCenterController.ts` menjadi satu-satunya React state owner.

Controller memiliki:

- server project state;
- loading;
- page error;
- pending action state;
- search query;
- sort mode;
- view mode;
- polling lifecycle;
- active `AbortController` dan stale/unmounted request guard;
- action-level `AbortController` untuk startup/stop/quick-kill yang masih berjalan;
- monotonically increasing request sequence untuk menolak response out-of-order;
- action dispatcher;
- view-model composition.

Public API controller:

```ts
interface ControlCenterController {
  viewModel: ControlCenterViewModel;
  dispatch(actionId: string, payload?: unknown): void;
}
```

Screen tidak menerima raw project arrays atau raw pending-state map.

`application/composition/createControlCenterRuntime.ts` merakit concrete HTTP/browser
adapter, command, dan extension host menjadi dependency yang dikonsumsi controller.
Unmount harus membatalkan request refresh, action, dan startup readiness loop yang masih
berjalan, bukan hanya mencegah `setState`. Refresh polling baru tidak boleh membuat
unbounded request overlap jika request sebelumnya belum selesai.

### 13. Screen Target

Target akhir `ControlCenterScreen.tsx`:

```tsx
export function ControlCenterScreen() {
  const controller = useControlCenterController();

  return <ControlCenterLayout viewModel={controller.viewModel} onAction={controller.dispatch} />;
}
```

Screen tidak lagi mengimpor:

- AntD Button/Input/Dropdown/Select/Segmented;
- `selectProjects`;
- `ProjectCard`;
- status array;
- `MenuProps`;
- `useState`;
- `useMemo`.

### 14. Alur Menambah Fitur Baru

Contoh menambah tombol toolbar `Restart semua`:

1. Tambahkan satu UI definition di `ui/toolbar/toolbarDefinition.ts`.
2. Tambahkan module:

```text
application/extensions/modules/restart-all/index.ts
```

3. Module mendaftarkan action `project.restart-all`.
4. Tambahkan unit test extension.
5. Tambahkan component behavior test toolbar.

Tidak perlu mengubah:

- `ControlCenterScreen.tsx`;
- `useControlCenterController.ts`;
- extension lain;
- `ProjectGrid.tsx`;
- `ProjectCard.tsx`;
- process manager.

Menghapus fitur dilakukan dengan menghapus definition dan module miliknya.

### 15. Migration Phases

#### Fase 0 — Characterization dan boundary baseline

- Bekukan behavior existing melalui test.
- Catat accessible names dan user-visible states.
- Tambahkan ESLint `no-restricted-imports` untuk folder target yang belum dipakai sehingga
  boundary aktif sebelum code baru masuk.
- Tambahkan test untuk:
  - stopped;
  - running;
  - external;
  - port conflict;
  - invalid;
  - not-found;
  - loading;
  - empty;
  - page error;
  - quick kill;
  - search/sort/grid/list.
- Tambahkan manager characterization test untuk:
  - concurrent `list()` memakai satu synchronization result;
  - overlap `start()` + `list()` tidak menghasilkan assignment/race ganda;
  - mutation endpoint hanya menerima `POST` dengan same-origin check;
  - route `GET` hanya read-only;
  - runtime retention tetap maksimum 120 baris.
- Catat baseline probe cost dengan fixture 20 app; jangan menambah cache jika belum ada
  bottleneck terukur.

Exit criteria:

- test akan gagal jika behavior existing hilang;
- lint akan gagal untuk import layer target yang dilarang;
- concurrency dan route mutation contract mempunyai test;
- hasil pengukuran probe dicatat sebagai evidence;
- tidak ada perubahan visual.

#### Fase 1 — Domain policy dan view-model contract

- Pindahkan `projectCollection.ts` ke `domain/`.
- Buat `projectActionPolicy.ts`.
- Buat `projectStatus.ts`.
- Definisikan status family yang readonly dan function policy bernama:
  - `isActiveProject`;
  - `isOpenReadyProject`;
  - `isStartupTerminalFailure`;
  - `canStartProject`;
  - `canStopProject`;
  - `canQuickKillProject`.
- Larang consumer UI/application membuat array literal status untuk keputusan lifecycle.
- Buat `application/view-models.ts`.
- Buat pure card/toolbar/grid presenters.
- Buat `presentationLimits.ts` dengan `MAX_RENDERED_LOG_LINES`.
- Pindahkan `application/projectCollection.ts` menjadi `domain/projectCollection.ts`;
  tidak boleh ada dua runtime path untuk filter/sort.
- Perbarui import consumer lama secara mekanis pada fase yang sama; jangan menahan
  compatibility wrapper hanya untuk menunggu extraction UI.

Exit criteria:

- seluruh status/action policy diuji tanpa React;
- penambahan status baru menghasilkan compile/test failure pada policy/presentation yang
  belum lengkap;
- tidak ada raw lifecycle-status array di screen, card, atau command;
- `ProjectCard.tsx` belum diubah sampai contract stabil.
- `domain/projectCollection.ts` menjadi satu-satunya owner filter/sort.

#### Fase 2 — Ports dan data adapters

- Definisikan `ProjectManagerClient`.
- Definisikan `ProjectWindow`.
- Pindahkan HTTP access.
- Pindahkan waiting-tab browser logic.
- Tambahkan runtime response parser dan typed request error.
- Forward `AbortSignal` pada list/start/stop.
- Uji adapters dengan mocked fetch/window.

Exit criteria:

- command/application tidak memanggil global fetch/window langsung;
- payload malformed ditolak sebelum masuk controller;
- abort tidak dilaporkan sebagai page error produk;
- response/error behavior tetap sama.

#### Fase 3 — Commands dan extension host

- Ekstrak refresh/start/stop/quick-kill commands.
- Ekstrak startup readiness policy dan inject sleep/timing.
- Implementasikan extension contracts.
- Implementasikan loader dan validation.
- Pasang tiga core extensions.
- Tambahkan duplicate/missing/unknown/error isolation tests.

Exit criteria:

- extension baru dapat ditambahkan tanpa mengubah host;
- invalid extension gagal secara terkontrol;
- startup success, terminal failure, timeout, dan abort diuji tanpa real delay.

#### Fase 4 — Controller

- Buat `useControlCenterController`.
- Pindahkan polling dan seluruh state ownership.
- Tambahkan `AbortController`, stale/unmount guard, dan request sequence.
- Tambahkan dispatcher.
- Hasilkan satu `ControlCenterViewModel`.

Exit criteria:

- controller integration test lulus dengan fake adapters;
- unmount/refresh overlap tidak meninggalkan request atau state update terlambat;
- UI belum mempunyai business logic.

#### Fase 5 — Header dan Toolbar UI

- Ekstrak `ControlCenterHeader`.
- Buat `headerDefinition`.
- Ekstrak `ProjectToolbar`.
- Buat `toolbarDefinition`.
- Tambahkan component tests.

Exit criteria:

- screen tidak memiliki markup header/toolbar;
- add/remove control hanya menyentuh definition area;
- interaction hanya dispatch action ID.

#### Fase 6 — Grid, Card, dan Terminal UI

- Ekstrak `ProjectGrid`.
- Buat `gridDefinition`.
- Migrasikan `ProjectCard` menjadi pure view.
- Ekstrak `ProjectTerminal`.
- Pindahkan status/action/alert decisions ke presenter.
- Terapkan `MAX_RENDERED_LOG_LINES` di presenter; pertahankan terminal sebagai internal
  scroll owner.

Exit criteria:

- card tidak membaca raw `ProjectSummary`;
- card tidak menghitung permissions;
- terminal menerima string log siap render;
- card tidak mempunyai angka magic untuk truncation;
- loading/empty/ready diputuskan presenter.

#### Fase 7 — Layout ownership

- Tambahkan `layoutTokens.css`.
- Pindahkan Header CSS.
- Pindahkan Toolbar CSS.
- Pindahkan Grid CSS.
- Pindahkan Card/Terminal CSS.
- Sisakan reset di `src/styles.css`.
- Hapus media query feature dari global stylesheet.

Exit criteria:

- breakpoint hanya berada di layout token contract;
- component CSS tidak mendefinisikan viewport breakpoint sendiri;
- scroll ownership sesuai kontrak.

#### Fase 8 — Screen cleanup dan legacy removal

- Ubah screen menjadi composition root.
- Hapus component/application lama yang sudah tidak dipakai.
- Hapus stale imports.
- Perbarui `AGENTS.md`.
- Perbarui architecture plan/reference.

Exit criteria:

- tidak ada duplicate code path;
- tidak ada compatibility wrapper permanen;
- build tidak membawa file legacy.

### 16. Test Matrix

#### Domain

- active status classification;
- open-ready dan startup-terminal classification;
- start/open/stop eligibility;
- quick-kill eligibility;
- seluruh `ProjectStatus` tercakup secara exhaustive;
- tidak ada lifecycle status array di consumer;
- search;
- each sort mode;
- undefined port sorting;
- input array tidak dimutasi.

#### Presenter

- semua status menghasilkan semantic status/alert key yang benar;
- action availability dan disabled/loading state;
- static action/status/alert labels berasal dari UI definition, bukan presenter;
- external tidak dapat di-stop;
- not-found managed dapat di-kill;
- error alerts;
- maximum rendered logs;
- runtime 120 dan rendered 80 mempunyai contract/test terpisah;
- active server items;
- toolbar summary;
- loading/empty/ready grid state.

#### Extensions

- valid module registration;
- duplicate extension ID;
- duplicate action ID;
- unsupported schema;
- invalid action;
- unknown action;
- missing handler pada reconciliation UI definition;
- extension error isolation;
- new test module auto-discovered.

#### Controller

- initial loading;
- polling refresh;
- unmount cleanup;
- stale response tidak overwrite state baru;
- AbortSignal diteruskan dan request dibatalkan saat unmount;
- polling tidak membuat unbounded overlapping request;
- pending state per project;
- start and open;
- startup timeout;
- startup abort;
- startup retry memakai injected timing tanpa real 30-second wait;
- start terminal failure states;
- stop;
- quick kill;
- error reset after successful refresh;
- search/sort/view state.

#### UI

- Header renders definition order.
- Toolbar renders definition order.
- Toolbar dispatches action ID dan payload.
- Grid renders loading/empty/ready.
- Card renders view model tanpa menghitung policy.
- Terminal mempunyai accessible label dan live region.
- Disabled action tidak dispatch.

#### Architecture

- UI tidak mengimpor `data/`.
- UI tidak mengimpor controller/commands/extensions.
- domain tidak mengimpor React/AntD.
- extension tidak mengimpor UI.
- screen hanya mengimpor controller dan layout.
- ESLint boundary rule benar-benar gagal pada fixture import terlarang.
- architecture fixture menguji UI→data, domain→React, extension→UI, data→controller,
  controller→data, composition→data sebagai allowed edge, dan screen boundary setelah
  P18.

#### Data adapter

- response list valid diparse;
- malformed response ditolak;
- non-JSON error response menghasilkan typed error;
- HTTP status/action/message dipertahankan;
- AbortSignal diteruskan untuk list/start/stop;
- abort dibedakan dari application failure.

#### Manager/API baseline

- concurrent list menggunakan single-flight synchronization;
- overlap start/list tidak mengalokasikan ulang port;
- semua mutation route memakai POST + same-origin check;
- GET route tetap read-only;
- runtime log retention maksimum 120;
- probe measurement fixture 20 app dicatat tanpa mengubah behavior.

### 17. Browser QA Matrix

Viewport:

```text
390 × 844
768 × 900
1024 × 768
1440 × 900
```

Mode:

- Grid;
- List;
- search aktif;
- sort aktif-first;
- no active server;
- managed server aktif;
- external/conflict;
- invalid;
- tombstone 404;
- error alert;
- long terminal log.

Invariant:

- tidak ada horizontal body overflow;
- body tidak menjadi scroll owner;
- daftar app scroll pada Grid container;
- terminal log scroll internal;
- card tidak tumbuh mengikuti log;
- toolbar control tidak saling menimpa;
- header tidak memotong action;
- focus visible;
- keyboard dapat mengakses semua action;
- accessible name tetap stabil;
- tidak ada browser console error.

### 18. Required Validation

Setiap fase:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test -- --maxWorkers=2
```

Gate akhir:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test -- --maxWorkers=2
npm run build
npx --yes antd lint src --format json
```

Browser QA dilakukan setelah UI sudah terintegrasi pada P18, setelah cleanup P19, dan
diulang sebagai final gate setelah P20. P13–P17 cukup memakai component/unit/build gate;
isolated UI belum menjadi runtime screen sebelum P18.

### 19. Acceptance Criteria

Refactor selesai hanya jika:

- Header, Toolbar, Grid, Card, dan Terminal mempunyai owner folder masing-masing;
- seluruh control yang tampil didefinisikan di definition owner area;
- `ControlCenterScreen.tsx` hanya controller + layout composition;
- UI tidak melakukan fetch, polling, filter, sort, permissions, atau lifecycle decision;
- status/action policy hanya mempunyai satu source of truth;
- HTTP payload diparse dan error transport mempunyai typed contract;
- request/loop dapat dibatalkan dan stale response tidak overwrite state;
- card menerima view model siap render;
- log retention 120 dan rendered limit 80 bernama serta diuji;
- global stylesheet hanya menyimpan global rules;
- seluruh breakpoint feature dimiliki layout contract;
- extension baru dapat ditambahkan sebagai folder module;
- duplicate/invalid extension tidak merusak dashboard;
- missing action menghasilkan disabled state dan diagnostic;
- behavior existing tetap sama;
- seluruh automated validation lulus;
- browser QA pada empat viewport lulus;
- tidak ada legacy duplicate path.

### 20. Risiko dan Mitigasi

#### Over-engineering

Mitigasi:

- hanya tiga core extensions pada awal;
- jangan membuat package baru;
- jangan membuat dependency injection framework;
- kontrak tetap berupa TypeScript interface dan function.

#### UI definition dan action handler tidak sinkron

Mitigasi:

- reconciliation terhadap `ControlCenterViewModel.availableActionIds`;
- missing handler disabled;
- programmatic unknown dispatch menghasilkan structured diagnostic;
- unit test setiap definition action ID.

#### Refactor memutus behavior start/open

Mitigasi:

- characterization test sebelum extraction;
- `ProjectWindow` adapter;
- migrate command satu per satu.

#### Polling stale response

Mitigasi:

- request sequence dan AbortController;
- controller test untuk response out-of-order.

#### Status policy drift

Mitigasi:

- exhaustive `ProjectStatus` mapping;
- policy function bernama, bukan literal array di consumer;
- unit test yang gagal ketika status union bertambah tanpa classification.

#### Request cancellation dianggap error produk

Mitigasi:

- typed abort handling di adapter/controller;
- abort tidak mengisi page alert;
- unmount dan superseded refresh mempunyai integration test;
- startup readiness, stop, dan quick-kill action dibatalkan saat unmount.

#### CSS drift

Mitigasi:

- breakpoint hanya di layout token source;
- component CSS hanya menggunakan variables;
- browser measurement pada empat viewport.

#### Plugin saling mengganggu

Mitigasi:

- isolated action context;
- unique IDs;
- no sibling imports;
- error boundary pada dispatcher;
- module tidak mendapat process/PID API langsung.

### 21. File Lama yang Dipertahankan Sementara

Selama migrasi:

- `useProjectManager.ts` dipertahankan sampai controller baru lulus integration test;
- `ProjectCard.tsx` lama dipertahankan sampai pure card lulus behavior test;
- `src/styles.css` dikurangi bertahap setelah setiap owner CSS aktif.

File lama hanya dihapus ketika:

- pengganti mempunyai test;
- import telah dipindah;
- tidak ada runtime reference;
- phase validation lulus.

Tidak boleh ada dua implementasi aktif permanen.

### 22. Deferred Hardening dan Keputusan Scope

#### CI gate

Saat ini validasi masih dijalankan manual dan repository belum mempunyai `.github`
workflow atau pre-commit hook. CI direkomendasikan sebagai pekerjaan terpisah:

```text
format:check -> lint -> typecheck -> test --maxWorkers=2 -> build -> antd lint
```

CI tidak menjadi bagian otomatis dari refactor modular karena menambah surface
operasional/repository policy. Implementasi membutuhkan persetujuan eksplisit, lalu
workflow harus menggunakan versi Node/npm sesuai `package.json`.

#### Probe scalability

`ProjectManager.list()` mem-probe setiap app pada polling 1,5 detik. Sebelum membuat
cache:

1. ukur latency dan connection count pada fixture 20 app;
2. pastikan probe tetap paralel dan tidak meninggalkan socket;
3. tentukan threshold yang dianggap bottleneck;
4. hanya jika threshold gagal, pertimbangkan short-TTL cache per port yang dapat
   diinjeksi dan dibatalkan.

Cache tidak boleh menyembunyikan perubahan `running`, `external`, `port-conflict`, atau
`stopping`, dan tidak boleh mengubah stable port behavior.

#### Route mutation convention

Same-origin check saat ini diterapkan pada `POST start/stop`. Tambahkan test konvensi
bahwa endpoint state-changing baru:

- tidak menggunakan `GET`;
- wajib menggunakan method mutation eksplisit;
- wajib melewati same-origin validation;
- tidak menerima arbitrary action name.

Ini adalah guardrail test terhadap endpoint masa depan, bukan alasan mengubah
`GET /api/projects` yang read-only.
