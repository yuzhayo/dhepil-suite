# Browser Launcher — Canonical Architecture and Implementation Plan

> **Status — 2026-08-01:** Plan canonical untuk app `browser-launcher`, tetap tunduk pada `PLAYBOOK.md`. Implementasi belum dimulai dan wajib berhenti pada gate fase yang belum lulus. Keputusan produk bertanda **OPEN** harus ditutup sebelum fase terkait.

## 1. Tujuan

Membuat app desktop Dhepil Suite yang:

- menampilkan daftar akun email;
- menjalankan managed browser dengan profile terisolasi yang tidak bergantung pada Chrome reguler di PC;
- memakai satu `user-data-dir` terisolasi per akun;
- mengizinkan banyak akun berjalan bersamaan;
- mempertahankan cookie, sesi login, history, bookmark, extension, dan preferensi tiap akun;
- memasang launcher melalui installer Windows NSIS x64 seperti app desktop biasa;
- memperbarui runtime browser tanpa merusak atau menghapus profil akun.

Electron hanya menjadi launcher dan control plane. Halaman web dibuka pada jendela browser eksternal, bukan ditanam ke `BrowserWindow`, `WebContentsView`, atau renderer Electron.

### 1.1 Hard invariant: ekosistem mandiri

Artifact final wajib menjadi ekosistem aplikasi mandiri di atas Windows:

- tidak memakai Chrome, Edge, default browser, profile, extension directory, atau executable browser yang sudah terpasang di Windows;
- tidak mencari browser melalui registry, `Program Files`, PATH, file association, atau policy browser sistem;
- tidak memiliki fallback diam-diam maupun manual ke system browser;
- tidak memerlukan root control center port `1999`, monorepo, Node.js, npm, Vite dev server, atau app Dhepil Suite lain setelah instalasi;
- membawa Electron runtime dan satu managed browser runtime awal yang tervalidasi di dalam installer;
- tetap dapat menyelesaikan first-run storage setup dan membuka browser managed tanpa download runtime awal;
- menyimpan settings, database, runtime, profile, recovery, dan log di namespace app sendiri;
- memakai network hanya untuk halaman yang dibuka user dan pemeliharaan update, bukan untuk memenuhi dependency sistem yang hilang.

Ketergantungan pada Windows API, filesystem, network stack, GPU driver, certificate store, dan DPAPI tetap ada. Istilah yang digunakan adalah **self-contained application ecosystem**, bukan bebas dari operating system.

## 2. Keputusan Arsitektur

| Area                 | Keputusan canonical                                             |
| -------------------- | --------------------------------------------------------------- |
| App ID               | `browser-launcher`                                              |
| UI                   | Vite + React 19 + Ant Design 6                                  |
| Desktop shell        | Shared workspace `electron/` saat build                         |
| Target awal          | Windows NSIS x64                                                |
| Runtime browser awal | Chrome for Testing Stable x64 sebagai pilot                     |
| Browser window       | Proses managed eksternal dari Electron main process             |
| Isolasi              | Satu `user-data-dir` per account UUID                           |
| Metadata             | SQLite sejak versi pertama                                      |
| Lokasi data          | Managed root pilihan user; tidak hard-code `D:`                 |
| Seed runtime         | Dibundel ke installer sebagai managed asset di luar ASAR        |
| Update runtime       | Versioned install; aktivasi atomic setelah isolated smoke test  |
| Password Google      | Tidak pernah disimpan atau diterima launcher                    |
| Portability          | Tidak dijanjikan; profil terikat enkripsi Windows/Chrome        |
| Runtime fallback     | Tidak berpindah ke system browser atau provider lain            |
| Artifact final       | Standalone; root suite hanya development dan build-time tooling |

## 3. Batas Produk dan Non-Goals

Versi pertama tidak akan:

- membuat browser engine sendiri;
- menanam browser ke UI Electron;
- memakai atau membuka system-installed Chrome, Edge, maupun default browser;
- bergantung pada root control center setelah app dibangun;
- menyimpan password, cookie, token OAuth, atau kredensial Google;
- mengotomasi login Google;
- menjanjikan profile portable antar-PC atau antar-Windows-user;
- menjanjikan Google Chrome Sync;
- memasang extension secara diam-diam di luar kebijakan Chrome;
- mematikan sandbox, web security, Safe Browsing, atau client-side phishing protection;
- menghentikan semua proses Chrome lewat nama executable;
- memigrasikan profile otomatis ke runtime browser berbeda;
- mendukung macOS/Linux sebelum kontrak Windows stabil.

Launcher memberi pemisahan sesi dan mengurangi salah akun. Launcher bukan batas keamanan terhadap orang lain yang memiliki akses ke Windows user yang sama.

## 4. Risiko Utama Chrome for Testing

Chrome for Testing (CfT) ditujukan untuk automation/testing, bukan browsing reguler. Penggunaan sebagai browser akun membawa risiko:

1. CfT tidak melakukan security update otomatis.
2. Google dapat mengubah API, format archive, atau kebijakan distribusi.
3. Launcher menjadi owner update runtime, integrity validation, activation, rollback, dan cleanup.
4. Extension, codec, DRM, Google services, serta browser sign-in tidak dianggap kompatibel sampai diuji.
5. Runtime yang tertinggal dari Stable harus terlihat jelas dan dapat memblokir launch bila melewati kebijakan keamanan yang disetujui.

Karena itu updater adalah critical path, bukan fitur opsional. Produk belum layak dipakai untuk browsing email produksi sebelum update end-to-end terbukti.

CfT tetap hanya runtime pilot. Jika lisensi/redistribution, signing, atau penggunaan untuk target produk tidak dapat disetujui pada Fase 0, implementasi **BLOCKED**. Plan tidak boleh menggantinya dengan browser sistem untuk mengejar jadwal.

## 5. Struktur Repository yang Direncanakan

```text
dhepil-suite/
├─ apps/
│  └─ browser-launcher/
│     ├─ AGENTS.md
│     ├─ app.manifest.json
│     ├─ index.html
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ vite.config.ts
│     └─ src/
│        ├─ app/
│        │  └─ ApplicationProviders.tsx
│        ├─ domain/
│        │  ├─ accountPolicy.ts
│        │  ├─ runtimePolicy.ts
│        │  └─ types.ts
│        ├─ engine/
│        │  ├─ children/             # flat, satu owner per operasi
│        │  │  ├─ accountCommands.ts
│        │  │  ├─ operationState.ts
│        │  │  ├─ runtimeCommands.ts
│        │  │  └─ storageSetup.ts
│        │  ├─ contracts.ts
│        │  └─ index.ts              # public headless engine API
│        ├─ data/
│        │  └─ windowManagedBrowserClient.ts
│        ├─ ui/
│        │  ├─ account-list/
│        │  ├─ account-form/
│        │  ├─ runtime-status/
│        │  └─ storage-setup/
│        ├─ styles/
│        │  └─ global.css
│        ├─ App.tsx
│        ├─ BrowserLauncherGate.tsx
│        └─ main.tsx
├─ electron/
│  ├─ capabilities/
│  │  └─ managed-browser/
│  │     ├─ children/
│  │     │  ├─ accounts.ts
│  │     │  ├─ operationJournal.ts
│  │     │  ├─ profiles.ts
│  │     │  ├─ runtimeInstall.ts
│  │     │  ├─ runtimeLaunch.ts
│  │     │  └─ runtimeUpdates.ts
│  │     ├─ contracts.ts
│  │     ├─ index.ts
│  │     ├─ preload.ts
│  │     └─ runtime-lock.json
│  ├─ main/
│  │  ├─ capabilityHost.ts
│  │  └─ index.ts                  # generic shell only
│  ├─ preload/
│  │  ├─ capabilityBridge.cts
│  │  └─ index.cts                # generic bridge only
│  └─ scripts/
│     └─ desktop.mjs
└─ browser-plan.md
```

Catatan:

- App tidak memiliki Electron dependency, main, preload, atau electron-builder config sendiri.
- Domain, engine, Gate, dan UI khusus produk tetap dimiliki `apps/browser-launcher/`.
- Browser process, filesystem, SQLite, extraction, download, dan update adalah privileged operations di `electron/capabilities/managed-browser/`, bukan di generic `electron/main/`.
- `electron/main/` dan `electron/preload/` tetap generic host/bridge. Capability browser hanya dimuat untuk app yang diizinkan metadata desktop; app lain tidak menerima IPC browser.
- Capability module tidak boleh meng-import UI app. App berkomunikasi hanya melalui typed contract dan preload bridge.
- `BrowserLauncherGate.tsx` hanya composition/mapping boundary; tidak menjalankan fetch, SQLite, filesystem, spawn, retry loop, atau business policy.
- Tidak ada presenter layer. Leaf UI menerima props presentasional dan event callback dari Gate/engine sesuai kontrak repo.
- `ui/` hanya menerima komponen generik jika reuse nyata terbukti. UI khusus akun tetap di app untuk menghindari abstraksi prematur.

Kontrak capability ini adalah perluasan arsitektur canonical. Fase 0 wajib memperbarui `PLAYBOOK.md` dan architecture tests terlebih dahulu. Sampai perubahan itu disetujui, business logic browser dilarang ditempatkan langsung di `electron/main/`.

## 6. Manifest dan Capability Desktop

Manifest target:

```json
{
  "schemaVersion": 1,
  "id": "browser-launcher",
  "name": "Browser Launcher",
  "runtime": "vite",
  "description": "Launcher managed browser dengan profil terisolasi per akun.",
  "desktop": {
    "enabled": true,
    "script": "desktop:dev",
    "appId": "com.dhepil.browser.launcher",
    "productName": "Browser Launcher",
    "capabilities": ["managed-browser"]
  }
}
```

`desktop.capabilities` belum ada pada kontrak sekarang. Fase 0–1 harus menambahkan kontrak generik berikut sebelum capability dipakai:

1. memvalidasi capability yang dikenal;
2. menolak duplikat, unknown capability, shell command, executable path, dan arbitrary build hook dari manifest app;
3. menulis capability tervalidasi ke staged `package.json` untuk packaged app;
4. meneruskan capability tervalidasi melalui child environment khusus pada development;
5. membuat generic main/preload host hanya mendaftarkan IPC capability yang diizinkan;
6. memvalidasi app ID, capability, dan sender frame pada setiap IPC;
7. menolak pemanggilan IPC capability dari app lain;
8. membundle capability implementation dan asset seed hanya ketika capability tersebut aktif.

Versi runtime seed, URL sumber build, hash, platform, dan expected signing metadata dimiliki `electron/capabilities/managed-browser/runtime-lock.json`, bukan manifest renderer. Manifest app tidak boleh mengarahkan build ke executable atau archive arbitrary.

## 7. Model Penyimpanan

### 7.1 Pemisahan program dan data

Folder instalasi program berisi executable, resource launcher, dan read-only seed runtime yang dibawa installer:

```text
<install-dir>/
├─ Browser Launcher.exe
└─ resources/
   └─ managed-browser-seed/
      ├─ runtime-lock.json
      └─ <verified-runtime-archive>
```

Tidak ada account database atau profile browser di `<install-dir>`. Seed hanya sumber bootstrap lokal; runtime yang dapat di-update di-install secara versioned ke managed root. Update/uninstall program tidak boleh menyentuh data akun tanpa tindakan eksplisit.

### 7.2 Bootstrap settings

Shared Electron saat ini mengisolasi app data ke:

```text
%APPDATA%\Dhepil Suite Apps\browser-launcher\
```

Folder ini menyimpan bootstrap kecil:

```text
%APPDATA%\Dhepil Suite Apps\browser-launcher\
└─ settings.json
```

Draft:

```json
{
  "schemaVersion": 1,
  "instanceId": "<launcher-instance-uuid>",
  "managedRoot": "D:\\Dhepil Browser",
  "managedRootMarkerId": "<marker-uuid>"
}
```

`settings.json` hanya menyimpan pointer managed root dan preferensi kecil yang diperlukan sebelum database dibuka. Tulis secara atomic melalui temporary file lalu rename.

### 7.3 Managed root

Managed root dipilih user saat setup pertama, bukan saat installer NSIS memilih lokasi program.

```text
<managed-root>/
├─ .dhepil-managed-browser.json
├─ launcher.sqlite
├─ runtime/
│  └─ versions/
│     ├─ <version-a>/
│     │  └─ chrome-win64/
│     │     └─ chrome.exe
│     └─ <version-b>/
│        └─ chrome-win64/
│           └─ chrome.exe
├─ profiles/
│  ├─ <account-uuid-a>/
│  └─ <account-uuid-b>/
├─ updates/
│  ├─ downloads/
│  └─ staging/
├─ recovery/
│  └─ profiles/
└─ logs/
```

Aturan:

- account UUID menjadi nama folder; email tidak menjadi nama path;
- runtime dan profile wajib terpisah;
- database menyimpan path relatif terhadap managed root jika memungkinkan;
- managed root harus absolute, writable, dan bukan root drive langsung;
- UNC/network path ditolak pada versi awal;
- folder baru harus kosong; folder existing hanya dapat dipakai melalui explicit adoption flow setelah konflik diperiksa;
- marker memuat schema version, app ID, instance ID, marker ID, dan waktu pembuatan;
- setiap open memverifikasi marker terhadap bootstrap settings sebelum database atau profile disentuh;
- canonical/real path setiap segment diverifikasi; symlink, junction, dan reparse point yang keluar managed root ditolak;
- destructive operation tidak boleh mengandalkan prefix string saja untuk containment;
- ruang kosong diperiksa sebelum seed install, download, extraction, reset, dan backup;
- path tervalidasi ulang setiap kali aplikasi dibuka karena drive dapat dilepas atau letter dapat berubah.

Jika marker hilang, mismatch, atau folder tampak dimiliki instalasi lain, launcher masuk recovery mode dan tidak melakukan write/delete otomatis.

### 7.4 DPAPI dan portability

Chrome mengenkripsi sebagian data sensitif melalui mekanisme Windows/Chrome yang terikat pada konteks Windows user dan perangkat. Konsekuensi produk:

- memindahkan profile di `D:` ke PC lain tidak menjamin cookie/password dapat didekripsi;
- Windows user lain pada PC sama tidak dijanjikan dapat memakai sesi tersebut;
- backup bukan portable-login backup;
- launcher tidak mencoba mengekstrak, mendekripsi, atau memindahkan key material Chrome;
- restore lintas PC tidak didukung pada versi awal;
- UI backup/reset harus menjelaskan bahwa sesi login dan password mungkin tidak dapat dipulihkan.

## 8. Database SQLite

Gunakan SQLite sejak versi pertama. Kandidat awal adalah `node:sqlite` bawaan runtime Node/Electron, tetapi API masih harus lulus packaged compatibility, migration, WAL, backup, dan corruption-recovery spike. Jika risikonya tidak diterima, Fase 0 memilih adapter lain beserta strategi native dependency packaging; jangan membiarkan renderer mengakses database.

### 8.1 Schema awal

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  profile_directory TEXT NOT NULL UNIQUE,
  start_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_launched_at TEXT,
  last_runtime_version TEXT,
  profile_runtime_floor TEXT,
  archived_at TEXT
);

CREATE TABLE runtime_versions (
  version TEXT PRIMARY KEY,
  runtime_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  executable_relative_path TEXT NOT NULL,
  source_url TEXT NOT NULL,
  archive_sha256 TEXT NOT NULL,
  archive_size_bytes INTEGER NOT NULL,
  installed_at TEXT NOT NULL,
  validated_at TEXT,
  validation_method TEXT,
  state TEXT NOT NULL CHECK (state IN ('staging', 'ready', 'active', 'retained', 'failed')),
  failure_reason TEXT
);

CREATE TABLE runtime_state (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  active_version TEXT,
  pending_version TEXT,
  generation INTEGER NOT NULL DEFAULT 0,
  last_check_at TEXT,
  last_success_at TEXT,
  health TEXT NOT NULL CHECK (health IN ('unknown', 'ok', 'degraded', 'unavailable')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (active_version) REFERENCES runtime_versions(version),
  FOREIGN KEY (pending_version) REFERENCES runtime_versions(version)
);

CREATE TABLE profile_operations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('archive', 'reset', 'restore', 'purge')),
  source_relative_path TEXT NOT NULL,
  destination_relative_path TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('prepared', 'moved', 'committed', 'failed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  error TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE account_runtime_history (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  runtime_version TEXT NOT NULL,
  attempted_at TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('requested', 'spawned', 'failed')),
  error TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (runtime_version) REFERENCES runtime_versions(version)
);
```

### 8.2 Database rules

- semua write memakai prepared statement dan transaction;
- migration hanya maju; downgrade schema tidak didukung;
- email divalidasi sebagai identifier tampilan, bukan bukti akun Google;
- email bukan identity key dan beberapa profile boleh memakai label email sama; account UUID tetap source of truth;
- `profile_directory` selalu relative path yang dibuat launcher;
- version comparison memakai parser komponen numerik, bukan lexicographic string comparison;
- `profile_runtime_floor` dinaikkan secara konservatif sebelum profile disentuh runtime baru dan tidak pernah diturunkan otomatis;
- `runtime_state.generation` dipakai untuk compare-and-swap aktivasi global;
- filesystem rename dan transaction database dijembatani durable operation journal serta startup reconciliation;
- data browser tidak dimasukkan ke SQLite;
- WAL checkpoint dan backup database dilakukan sebelum migration app;
- database corrupt tidak boleh memicu penghapusan profile otomatis.

## 9. Lifecycle Akun

### 9.1 Tambah akun

1. Renderer mengirim hanya `displayName`, `email`, dan `startUrl` melalui typed preload API.
2. Main process memvalidasi panjang, email, URL `https:`, dan batas jumlah akun.
3. Main membuat UUID dengan `crypto.randomUUID()`.
4. Main menetapkan `profiles/<uuid>`; renderer tidak boleh memilih arbitrary path.
5. Main menyimpan account dalam transaction.
6. Main meluncurkan runtime aktif dengan profile baru.
7. User login langsung di browser.
8. Launcher tidak menerima password, cookie, atau token.

Jika launch pertama gagal sebelum Chrome membuat profile, account tetap ada dengan status belum pernah diluncurkan. User dapat retry atau menghapus record kosong.

### 9.2 Launch akun

Argumen minimum:

```text
--user-data-dir=<absolute-managed-profile-path>
--no-first-run
--no-default-browser-check
--new-window
<validated-start-url>
```

Larangan default:

```text
--no-sandbox
--disable-web-security
--ignore-certificate-errors
--disable-client-side-phishing-detection
--remote-debugging-port
```

`--disable-background-networking` juga tidak dipakai sebagai default karena dapat merusak security service, extension, dan web app behavior.

Launch memakai `spawn()` dengan argument array, bukan command string. Browser tetap hidup jika Electron launcher ditutup. Runtime path dan profile path berasal dari database/managed root, bukan renderer.

### 9.3 Edit akun

User dapat mengubah:

- display name;
- email label;
- start URL yang lolos allow-rule.

Mengubah email tidak memindahkan atau mengganti profile. Email hanya metadata launcher. Login aktual tetap ditentukan sesi di dalam profile.

### 9.4 Arsip dan hapus akun

Default action adalah archive, bukan delete profile.

Penghapusan permanen memerlukan dialog yang menyebut data yang hilang:

- sesi login;
- cookies;
- history;
- bookmarks lokal;
- extension dan extension data;
- password/autofill yang tersimpan.

Sebelum penghapusan:

1. main process menampilkan native confirmation yang menyebut data terdampak;
2. pastikan profile tidak sedang dipakai dengan mekanisme yang dapat dibuktikan; status `unknown` berarti operasi ditolak;
3. tulis operation journal berstatus `prepared` dalam transaction;
4. pindahkan folder ke `recovery/profiles/<uuid>-<timestamp>` secara atomic pada volume sama;
5. tandai journal `moved`, lalu account archived/deleted dalam transaction final;
6. tandai journal `committed`;
7. hapus recovery hanya melalui cleanup terpisah setelah retention period dan verifikasi ulang containment.

Tidak ada recursive delete langsung dari path yang berasal dari renderer.

Jika process/crash terjadi di antara transaction dan rename, startup reconciliation membaca journal serta keadaan filesystem untuk menyelesaikan atau memulihkan operasi. Folder recovery tanpa journal atau mismatch tidak dihapus otomatis.

### 9.5 Reset profile

Reset adalah tindakan destructive dan tidak identik dengan menghapus account:

1. tampilkan penjelasan di renderer lalu minta native confirmation dari main process;
2. tolak bila profile aktif atau status penggunaan tidak dapat dibuktikan;
3. jalankan durable operation journal yang sama dengan archive;
4. rename profile lama ke recovery;
5. buat folder profile baru saat launch berikutnya;
6. reset `last_runtime_version` dan `profile_runtime_floor` hanya untuk profile baru, bukan recovery lama;
7. pertahankan metadata account;
8. sediakan undo selama retention period bila folder baru belum dipakai atau setelah konfirmasi conflict.

## 10. Extension

Target browser diharapkan dapat memasang extension seperti browser Chromium biasa, tetapi dukungan bukan asumsi universal.

Aturan versi awal:

- user memasang extension sendiri melalui jalur browser yang didukung;
- extension tersimpan per `user-data-dir`;
- launcher tidak menyimpan `.crx`, tidak sideload diam-diam, dan tidak memodifikasi extension database;
- extension yang memerlukan native messaging host, enterprise policy, proprietary service, DRM, atau Google browser sync harus diuji khusus;
- extension kritis masuk acceptance matrix sebelum produksi;
- perpindahan runtime dapat membutuhkan reinstall extension dan tidak dijanjikan kompatibel.

Extension bundled milik produk belum masuk scope. Jika dibutuhkan, rancang signing, update, policy, permission disclosure, dan compatibility test terpisah.

## 11. Runtime Management

### 11.1 Hindari abstraksi prematur

Versi pertama hanya memiliki satu runtime nyata: Chrome for Testing. Jangan membuat interface dengan tiga implementasi kosong.

Pisahkan module konkret berdasarkan tanggung jawab:

```text
chromeForTestingCatalog
chromeForTestingDownload
browserRuntimeSeed
browserRuntimeInstall
browserRuntimeLaunch
```

Kontrak database dan launcher tidak menyimpan istilah path hard-coded selain runtime type/version. Interface provider baru dibuat saat runtime kedua benar-benar dipilih dan diuji.

Deliberate simplification:

```text
ponytail: one concrete CfT provider; add provider interface when second verified runtime exists.
```

### 11.2 Source versi

Build installer dan runtime updater memakai endpoint JSON resmi Chrome for Testing untuk Stable channel. Build menghasilkan `runtime-lock.json` immutable yang menyimpan:

- version;
- download URL;
- platform dan artifact name;
- archive size;
- SHA-256 hasil build acquisition;
- signing/Authenticode metadata yang benar-benar dapat diverifikasi;
- waktu acquisition dan validation;
- source metadata yang diperlukan untuk audit lokal.

Installer production gagal dibangun jika seed archive tidak tersedia, tidak cocok lock, tidak lolos bounded extraction test, atau executable validation gagal. Seed tidak diambil dari browser sistem dan tidak diunduh oleh installer pada PC user.

Jadwal default:

- check saat launcher mulai jika check terakhir lebih dari 24 jam;
- tidak menghalangi UI ketika runtime aman masih tersedia;
- manual “Check for updates” tersedia;
- backoff pada kegagalan jaringan;
- `degraded`/`unavailable` tidak memicu perpindahan provider otomatis.

### 11.3 Download dan integrity

Pipeline update runtime setelah instalasi:

1. fetch catalog hanya lewat HTTPS dan host allowlist;
2. pilih artifact `win64` Stable;
3. download ke filename temporary dalam `updates/downloads/`;
4. batasi ukuran maksimum dan minimum archive;
5. hitung SHA-256 archive untuk audit/cache identity;
6. verifikasi checksum/signature hanya bila sumber kepercayaan resmi yang independen tersedia;
7. extract ke staging baru;
8. validasi path archive agar tidak terjadi zip-slip;
9. validasi file wajib dan executable;
10. verifikasi Authenticode executable jika hasil investigasi menunjukkan chain yang dapat diandalkan;
11. smoke launch dengan temporary profile;
12. pindahkan staging menjadi `runtime/versions/<version>`;
13. tandai `ready` dalam transaction.

SHA-256 yang dihitung dari file download tidak membuktikan authenticity. Plan tidak boleh mengklaim supply-chain verification sampai sumber checksum/signature resmi diverifikasi.

Node/Electron tidak menyediakan ZIP container extractor generik sebagai kontrak aplikasi. Fase 0 wajib memilih satu mekanisme extraction dan membuktikan packaging-nya:

- dependency pure-JS yang direview lalu dibundle ke capability output; atau
- exact production dependency yang disertakan staging secara eksplisit.

Runtime tidak boleh menjalankan `npx`, PowerShell-generated extraction script, atau tool arbitrary dari PATH. Extractor wajib memiliki limit total uncompressed bytes, entry count, path depth, compression ratio, duplicate destination, symlink/reparse entry, dan zip-slip tests.

### 11.4 Atomic activation

Jangan memakai symlink `current` sebagai source of truth. SQLite menyimpan `active_version` dan `pending_version`.

Activation:

1. runtime baru sudah `ready` dan lulus temporary-profile smoke check tanpa account profile;
2. satu global activation mutex membaca `runtime_state.generation`;
3. transaction compare-and-swap menetapkan `pending_version`;
4. isolated activation probe dijalankan kembali dari final versioned folder;
5. transaction dengan generation yang sama mengubah pending menjadi active;
6. runtime sebelumnya berubah menjadi `retained`;
7. process browser lama tetap berjalan dari folder lamanya;
8. tidak ada overwrite file runtime aktif;
9. account launch hanya membaca active version setelah activation transaction selesai.

Account profile tidak pernah dipakai sebagai canary aktivasi. Sebelum spawn account, launcher secara konservatif menaikkan `profile_runtime_floor`, menulis runtime history `requested`, lalu baru menyentuh profile. Dua account berbeda boleh launch bersamaan setelah active version final, tetapi tidak boleh melakukan aktivasi global paralel.

Jika pending runtime gagal sebelum aktivasi penuh:

- catat `failed` dan alasan;
- pertahankan active runtime lama;
- tampilkan warning;
- jangan menyentuh account profile.

### 11.5 Rollback

Rollback hanya memilih runtime retained yang masih ada. Batas keras:

- jangan membuka profile dengan runtime di bawah `profile_runtime_floor`;
- fallback aman memakai temporary probe profile, bukan account profile;
- rollback global tidak menurunkan profile yang sudah disentuh versi lebih baru;
- account yang membutuhkan runtime lebih baru tetap diblokir sampai runtime aman tersebut tersedia lagi;
- acknowledgement user tidak menghapus downgrade safety rule;
- database rollback tidak berarti profile format rollback.

### 11.6 Cleanup runtime

Default simpan:

- active runtime;
- pending runtime bila ada;
- seluruh retained runtime yang masih mungkin dipakai process/profile sampai ownership dapat dibuktikan.

Automatic runtime deletion **disabled pada v1**. Folder hanya menjadi cleanup candidate ketika:

- folder bukan active/pending;
- process reconciliation membuktikan tidak ada process memakai executable itu; status `unknown` dianggap masih digunakan;
- tidak ada account yang `profile_runtime_floor`-nya membutuhkan runtime tersebut sebagai recovery floor;
- retention minimum terlewati;
- path tervalidasi berada di `runtime/versions/`;
- user sudah menutup seluruh managed browser bila reconciliation belum tersedia.

Deletion baru boleh diaktifkan setelah Fase 6 lulus. Delete failure atau file lock hanya dicatat; jangan melakukan partial recursive cleanup lalu menganggap folder hilang.

## 12. Monitoring Proses

### 12.1 Batas observasi

PID hasil `spawn()` bukan source of truth penuh karena Chromium dapat:

- membuat banyak child process;
- meneruskan request ke process profile yang sudah hidup;
- keluar dari initial process setelah handoff;
- ditutup langsung oleh user;
- crash di luar launcher.

Versi pertama tidak menjanjikan status real-time akurat. UI memakai status:

- `Never launched`;
- `Last launched <time>`;
- `Launch requested`;
- `Launch failed`.

Hindari badge `Running` sebelum mekanisme observasi tervalidasi.

Selama observasi belum kuat, archive/reset/purge profile ditolak setelah launcher restart bila penggunaan profile tidak dapat dibuktikan. `Unknown` bukan sinonim `stopped`.

### 12.2 Process tracking fase berikutnya

Jika status running menjadi kebutuhan nyata:

- catat initial PID, runtime version, profile UUID, dan launch time di memory;
- dengarkan `error` dan `exit` initial child;
- pada Windows, cocokkan process executable path dan command line/profile path melalui API teruji;
- jangan kill berdasarkan `chrome.exe` saja;
- setelah launcher restart, lakukan reconciliation terhadap process OS;
- proses yang hilang ditandai stopped/crashed tanpa mengubah profile;
- crash berulang menghasilkan warning, bukan reset otomatis.

Close/terminate dari launcher hanya boleh menargetkan instance account yang teridentifikasi kuat. Graceful close harus didahulukan; force kill butuh konfirmasi karena dapat merusak profile.

## 13. Multi-Account Concurrency

Setiap account memiliki profile directory berbeda:

```text
profiles/<uuid-a>
profiles/<uuid-b>
```

Karena itu beberapa akun dapat berjalan bersamaan. Aturan:

- akun yang sama tidak diluncurkan paralel oleh dua operasi launcher;
- per-account launch memakai in-memory mutex;
- runtime update boleh berjalan saat browser aktif karena install memakai versioned folder;
- satu global activation mutex + database generation CAS melindungi transisi pending/active;
- activation runtime baru hanya memengaruhi launch setelah transaction selesai;
- database write memakai transaction;
- reset/delete account ditolak bila launch/reset/delete account yang sama sedang berlangsung.

Tidak ada global lock untuk account launch biasa; akun berbeda tetap dapat dibuka bersamaan. Global lock hanya memiliki owner sempit untuk runtime activation dan migration.

## 14. Backup dan Recovery

Versi awal menyediakan local safety recovery, bukan portable profile backup.

Cakupan:

- backup `launcher.sqlite` sebelum migration;
- rename-to-recovery sebelum reset/delete profile;
- export metadata akun tanpa secrets;
- dokumentasi manual copy saat semua browser dan launcher benar-benar tertutup.

Tidak dijanjikan:

- restore session/password pada PC lain;
- backup konsisten ketika Chrome masih menulis profile;
- cloud sync profile;
- merge dua profile;
- migrasi profile antar-runtime.

Backup profile penuh masuk fase lanjutan setelah strategi lock/snapshot, storage size, DPAPI disclosure, dan restore test disetujui.

## 15. IPC dan Security Boundary

Renderer tidak mendapat akses Node.js. Preload mengekspos API sempit:

```ts
interface ManagedBrowserApi {
  listAccounts(): Promise<AccountSummary[]>;
  createAccount(input: CreateAccountInput): Promise<AccountSummary>;
  updateAccount(id: string, input: UpdateAccountInput): Promise<AccountSummary>;
  launchAccount(id: string): Promise<LaunchResult>;
  archiveAccount(id: string): Promise<ProfileOperationResult>;
  resetProfile(id: string): Promise<ProfileOperationResult>;
  listRecoveryItems(): Promise<RecoveryItem[]>;
  restoreRecoveryItem(id: string): Promise<ProfileOperationResult>;
  purgeRecoveryItem(id: string): Promise<ProfileOperationResult>;
  getRuntimeStatus(): Promise<RuntimeStatus>;
  checkRuntimeUpdate(): Promise<RuntimeStatus>;
  installRuntimeUpdate(): Promise<RuntimeOperation>;
  getRuntimeOperation(id: string): Promise<RuntimeOperation>;
  cancelRuntimeOperation(id: string): Promise<RuntimeOperation>;
  onRuntimeOperationProgress(listener: (event: RuntimeOperationProgress) => void): () => void;
  selectManagedRoot(): Promise<ManagedRootResult>;
}
```

Main process rules:

- validasi semua payload sebagai `unknown`;
- UUID, path, URL, panjang string, dan state transition diperiksa ulang;
- renderer mengirim account ID, bukan executable/profile path;
- hanya HTTPS start URL pada versi awal;
- semua operasi file dibatasi managed root;
- account browsing selalu memakai managed runtime; `shell.openExternal()` dan default browser sistem tidak dipakai oleh capability ini;
- navigation dan new-window Electron ditolak kecuali route internal renderer yang diizinkan;
- CSP renderer diterapkan;
- setiap handler memvalidasi capability, app ID, `event.senderFrame`, exact dev origin, dan exact packaged renderer location;
- destructive IPC memeriksa account state lalu main process menampilkan native confirmation; renderer-generated token bukan security boundary;
- progress bridge mengekspos payload terpilih dan unsubscribe function, bukan raw `ipcRenderer.on`;
- satu file TypeScript contract menjadi source of truth main, preload, dan renderer adapter;
- dev mode menerima capability tervalidasi hanya dari `desktop.mjs`; packaged mode membaca staged metadata yang tervalidasi;
- log tidak memuat URL query sensitif, cookie, token, atau raw browser output yang mengandung secrets.

## 16. UI Draft

Ant Design 6 dipakai untuk primitive yang tersedia:

- `Layout`, `Card`, `List` atau `Table` untuk akun;
- `Button`, `Dropdown`, `Modal`, `Popconfirm` untuk actions;
- `Form`, `Input`, `Select` untuk account setup;
- `Alert`, `Badge`, `Progress`, `Result` untuk runtime/update state;
- `App` message/notification API untuk feedback;
- shared theme provider dari `ui/theme/`.

Layar minimum:

1. **First-run storage setup**
   - pilih managed root;
   - tampilkan ruang kosong;
   - jelaskan profile tidak portable;
   - install dan smoke-test bundled seed runtime secara lokal tanpa network.

2. **Account list**
   - display name;
   - email label;
   - last launched;
   - Open;
   - edit/archive/reset melalui secondary menu.

3. **Add account**
   - display name;
   - email;
   - start URL default Gmail;
   - setelah save, tombol “Open and sign in”.

4. **Runtime status**
   - installed/available version;
   - last update check;
   - health;
   - download/install progress;
   - warning jika runtime outdated.

Parent `App.tsx` hanya menyusun provider dan Gate. Gate menghubungkan engine/render state ke komponen. Logic visual ditempatkan pada child terkecil sesuai `PLAYBOOK.md`.

UI adalah PC-only dan fluid mengikuti lebar display. Release QA memakai 1280, 1366/1440, 1920, dan 2560 px serta continuous resize sweep. Mobile/tablet breakpoint bukan release gate. Keyboard order, visible focus, modal focus return, no horizontal page overflow, dan zoom 100–200% tetap diverifikasi.

Copy produk harus memakai istilah “managed browser dengan profile terisolasi”, bukan menjanjikan anonymous/private browsing. Produk tidak menyediakan VPN, network anonymity, anti-fingerprinting, atau perlindungan terhadap user Windows yang sama.

## 17. Packaging dan Instalasi

Gunakan shared `electron/scripts/desktop.mjs` dan installer NSIS x64 yang sudah ada.

Model awal yang direkomendasikan:

- installer membawa Electron launcher dan satu seed runtime CfT yang lock/validation-nya telah lulus build gate;
- seed berada di `extraResources` di luar app ASAR;
- first run menyalin/extract seed ke managed root secara versioned tanpa network;
- build gagal bila seed runtime tidak tersedia atau tidak cocok `runtime-lock.json`;
- browser binary tidak dibaca dari instalasi sistem;
- runtime update tidak membutuhkan update launcher;
- installer dapat memilih lokasi program, tetapi managed root dipilih terpisah di first-run UI.

`desktop.mjs` tetap orchestrator tunggal. Capability menambahkan staged metadata, bundled output, dan `extraResources` secara allowlisted; manifest app tidak menyediakan arbitrary build config. Artifact final harus dapat dijalankan tanpa repo, port 1999, Node/npm, atau download runtime pertama.

Packaging production **BLOCKED** sampai lisensi/redistribution, ukuran artifact, code signing, update path, dan offline installation test disetujui. Jika CfT tidak boleh dibundel, arsitektur kembali ke Fase 0; system browser bukan fallback.

Uninstall default:

- menghapus launcher dan resource program;
- tidak menghapus managed root;
- menawarkan penghapusan data hanya lewat flow terpisah dengan disclosure jelas;
- tidak menjalankan recursive delete akun tanpa pilihan eksplisit user.

## 18. Runtime Fallback

Tidak ada switch ke browser sistem setelah endpoint CfT gagal. Kegagalan catalog tidak berarti installed runtime rusak.

Urutan respons:

1. terus gunakan active runtime jika masih memenuhi security policy;
2. retry dengan backoff;
3. tampilkan health `degraded` atau `unavailable`;
4. izinkan user melakukan retry/diagnosis;
5. blokir update atau launch sesuai security-age policy, bukan mengganti provider.

Kandidat investigasi, bukan kontrak:

| Kandidat                         | Status draft     | Catatan                                                                                      |
| -------------------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| Puppeteer browser download layer | Evaluasi pertama | Masih memakai CfT di belakang layar; fallback API/tooling, bukan fallback binary independen. |
| Ungoogled Chromium               | Riset saja       | Trusted build, update cadence, code signing, extension, dan redistribution belum terbukti.   |
| Chromium snapshot                | Tidak dipilih    | Bukan stable release channel untuk daily use.                                                |
| Build Chromium sendiri           | Non-goal         | Biaya build, signing, update infra, dan security response terlalu besar.                     |
| Microsoft Edge/system Chrome     | Dilarang         | Melanggar hard invariant; tidak boleh menjadi runtime atau fallback.                         |

Klaim bahwa semua Chromium-based browser dapat memakai profile yang sama tidak dijadikan kontrak. History/bookmark mungkin serupa, tetapi cookie encryption, feature flags, extensions, schema migrations, dan downgrade behavior dapat berbeda.

Jika runtime kedua disetujui:

- buat provider interface berdasarkan dua implementasi nyata;
- runtime kedua juga wajib dibundle/dikelola aplikasi dan tidak boleh mengambil browser sistem;
- gunakan profile baru secara default;
- migrasi existing profile memerlukan backup dan compatibility test;
- runtime switch tidak pernah otomatis karena health endpoint gagal.

## 19. Security Policy Runtime

Sebelum launch produksi, tetapkan policy terukur:

- maksimum umur runtime sejak Stable security release;
- kapan launch diberi warning;
- kapan launch diblokir;
- emergency update procedure;
- catalog outage procedure;
- revocation untuk runtime diketahui rentan;
- audit log update tanpa data browsing.

**OPEN:** nilai hari untuk warning/block. Jangan mengarang angka sebelum kebutuhan operasional dan kemampuan update dibuktikan.

## 20. Fase Implementasi

Setiap fase adalah checkpoint mandiri. Fase berikutnya hanya boleh dimulai setelah validation dan exit criteria fase aktif lulus. Jika fallback yang tertulis tidak dapat mempertahankan hard invariant, fase berstatus **BLOCKED**; implementor tidak boleh mengganti runtime dengan browser sistem atau memperluas scope diam-diam.

### Fase 0 — Tutup keputusan dan buktikan toolchain

- [ ] Setujui CfT hanya sebagai runtime pilot dengan disclosure yang tepat.
- [ ] Verifikasi lisensi, redistribution, archive source, checksum/signature yang benar-benar tersedia, Authenticode, dan kebutuhan code signing installer.
- [ ] Pilih nama produk final; app ID canonical tetap `browser-launcher` kecuali keputusan eksplisit mengubahnya sebelum implementasi.
- [ ] Tetapkan managed-root marker, ownership/adoption, real-path, dan reparse-point rules.
- [ ] Tetapkan extension acceptance matrix, recovery retention, dan security-age policy.
- [ ] Putuskan serta dokumentasikan library/executable extractor ZIP; buktikan zip-slip, archive bomb, file-count, size, path-depth, dan timeout limits.
- [ ] Buat spike `node:sqlite` pada Electron 43 packaged build, bukan hanya Vite/dev.
- [ ] Buat `runtime-lock.json` dari seed resmi dan buktikan build dapat stage seed melalui `extraResources` secara deterministic.
- [ ] Buktikan installer dapat dipasang pada Windows user/VM bersih dengan network dinonaktifkan dan memiliki seluruh file untuk first run.
- [ ] Perbarui `PLAYBOOK.md` dengan kontrak capability generik sebelum mengubah host Electron bersama.

Success criteria: keputusan kritis tertutup; packaged spike membaca/menulis SQLite; extractor dan seed staging tervalidasi; installer offline berisi seed yang cocok lock; belum ada klaim production-ready.

Fallback/BLOCKED: boleh mengganti tool extractor atau format staging selama kontrak keamanan sama. Jika CfT tidak legal/praktis untuk dibundle, `node:sqlite` gagal pada packaged Electron, atau seed tidak dapat diverifikasi, hentikan fase dan revisi arsitektur; browser sistem bukan fallback.

### Fase 1 — App shell, capability skeleton, dan storage

- [ ] Buat `apps/browser-launcher/` mengikuti discovery app dan ownership di `AGENTS.md`.
- [ ] Gunakan Ant Design 6, shared theme contract, parent/children naming, dan dependency boundaries dari `PLAYBOOK.md`.
- [ ] Aktifkan desktop melalui manifest/thin scripts tanpa arbitrary executable/build hook dari manifest.
- [ ] Tambahkan allowlisted `managed-browser` capability ke host/preload generik dan architecture import tests.
- [ ] Implementasikan first-run managed-root setup, marker ownership/adoption, containment, real-path, dan reparse-point checks.
- [ ] Implementasikan migration SQLite, account CRUD berbasis UUID, runtime metadata, operation journal, dan transaction tests.
- [ ] Pastikan banyak profile boleh memakai label email yang sama; email bukan identity atau unique key.

Success criteria: dev dan packaged app dapat membuat/list/edit/archive metadata; capability skeleton tervalidasi; tidak ada browser runtime yang dijalankan; tests membuktikan path containment, marker ownership, migration, dan transaction rollback.

Fallback/BLOCKED: migration boleh disederhanakan hanya jika schema canonical tetap forward-migratable. Kegagalan marker/path safety atau packaged SQLite membuat fase **BLOCKED**; jangan menyimpan database di renderer/localStorage sebagai jalan pintas.

### Fase 2 — Offline seed installation

- [ ] Install/copy/extract seed yang sudah dibundle dari `extraResources`; first run tidak melakukan network fetch.
- [ ] Terapkan bounded safe extraction dan integrity/authenticity checks dari Fase 0.
- [ ] Gunakan staging directory, fsync/close yang diperlukan, atomic rename, dan versioned runtime directory.
- [ ] Jalankan isolated temporary-profile smoke probe; jangan pernah memakai profile akun sebagai canary.
- [ ] Commit runtime install melalui journal + SQLite state transition dan global generation compare-and-swap.
- [ ] Implementasikan operation ID, progress, cancel, recovery status, dan cleanup staging yang idempotent.
- [ ] Uji seed hilang, lock mismatch, archive corrupt, traversal, archive bomb, cancel, crash, dan retry offline.

Success criteria: fresh packaged install dengan network mati dapat memasang dan smoke-launch managed runtime valid tanpa membuat profile akun; kegagalan tidak menghasilkan runtime setengah aktif.

Fallback/BLOCKED: user boleh retry atau memilih managed root baru. Jika bundled seed invalid/hilang, tampilkan recovery diagnosis dan blokir launch; jangan mengunduh diam-diam dan jangan membuka browser sistem.

### Fase 3 — Account launch dan profile floor

- [ ] Implementasikan typed IPC/preload capability dengan exact sender/app/capability validation.
- [ ] Validasi executable, runtime generation, profile containment, URL HTTPS, dan operation ownership di main process.
- [ ] Launch satu `user-data-dir` UUID per account melalui managed runtime aktif.
- [ ] Implementasikan per-account launch mutex tanpa mengunci launch akun lain.
- [ ] Naikkan `profile_runtime_floor` secara durable sebelum spawn; runtime di bawah floor tidak boleh membuka profile.
- [ ] Simpan `last_launched_at`, runtime version, audit event, dan launch error tanpa data browsing/sensitif.
- [ ] Uji dua akun berjalan bersamaan, label email duplikat, popup failure, launcher close, dan session persistence.

Success criteria: user dapat login manual; dua profile independen dapat berjalan bersamaan; session bertahan; downgrade di bawah floor diblokir; root suite/repo tidak diperlukan oleh packaged app.

Fallback/BLOCKED: kegagalan launch kembali ke UI diagnosis/retry dan tidak mengubah active runtime. Jangan memakai `shell.openExternal`, default browser, atau profile sistem.

### Fase 4 — Online updater dan atomic activation

- [ ] Fetch catalog Stable dengan interval maksimum sekali per 24 jam dan retry/backoff yang dapat dibatalkan.
- [ ] Download ke staging dengan progress, cancel, size/hash validation, dan operation journal.
- [ ] Install versi baru berdampingan saat runtime lama masih dipakai; jangan overwrite active directory.
- [ ] Jalankan isolated smoke probe, lalu aktivasi melalui global mutex + generation compare-and-swap.
- [ ] Launch berikutnya memakai active runtime baru; process lama tetap hidup pada binary lamanya.
- [ ] Implementasikan rollback hanya ke runtime yang memenuhi global policy dan seluruh profile floor terkait.
- [ ] Uji stale response, concurrent updater, cancel, catalog outage, corrupt download, dan interruption pada setiap state.

Success criteria: update gagal atau overlap tidak merusak active runtime, database, profile, maupun seed fallback; updater tidak pernah menguji runtime pada profile akun asli.

Fallback/BLOCKED: terus gunakan active runtime bila masih memenuhi security policy; jika tidak, blokir launch dengan diagnosis. Retained-version cleanup otomatis tetap nonaktif pada fase ini.

### Fase 5 — Recovery dan hardening

- [ ] Implementasikan archive/reset memakai durable `profile_operations` journal dengan state `prepared`, `moved`, dan `committed`.
- [ ] Rekonsiliasi journal saat startup untuk crash di antara filesystem rename dan SQLite commit.
- [ ] Gunakan native/main-owned destructive confirmation; renderer tidak menjadi authority.
- [ ] Tambahkan DPAPI/non-portability disclosure dan backup database sebelum migration.
- [ ] Terapkan runtime age warning/block/revocation policy dan audit log tanpa data browsing.
- [ ] Uji extension acceptance matrix, IPC sender spoofing, recovery retention, dan packaged security smoke.
- [ ] Buktikan installer update dan uninstall default tidak menghapus managed root.

Success criteria: destructive operation recoverable selama retention; crash reconciliation deterministic; security boundary dan disclosure lulus review; production masih diblokir bila signing/redistribution gate belum selesai.

Fallback/BLOCKED: jika journal ambigu, hentikan mutation dan tampilkan recovery workflow; jangan melakukan recursive delete otomatis. Unknown runtime/process state selalu diperlakukan sebagai masih dipakai.

### Fase 6 — Process reconciliation dan cleanup, hanya bila dibutuhkan

- [ ] Verifikasi kebutuhan product untuk status real-time, graceful close, kill, dan automatic runtime cleanup.
- [ ] Implementasikan Windows process reconciliation berdasarkan executable real path, profile path/launch token, instance ID, dan ownership marker; nama process saja tidak cukup.
- [ ] Cocokkan surviving process setelah launcher restart dan tandai state yang tidak dapat dibuktikan sebagai `unknown`.
- [ ] Aktifkan graceful close/kill hanya untuk process yang ownership-nya terbukti.
- [ ] Aktifkan retained-runtime cleanup hanya setelah reconciliation membuktikan tidak ada process yang memakai versi tersebut.
- [ ] Uji launcher crash/restart, banyak runtime hidup bersamaan, unknown process, PID reuse, dan cleanup interruption.

Success criteria: UI `Running` dan destructive process action hanya muncul bila status/ownership terbukti; runtime aktif, in-use, floor-required, seed recovery, dan unknown tidak pernah terhapus.

Fallback/BLOCKED: bila reconciliation tidak terpercaya, pertahankan v1 tanpa real-time status, kill, dan automatic cleanup. Manual diagnosis boleh ditambahkan; unsafe heuristic tidak boleh diaktifkan.

## 21. Verification Gate

Build gate repository tetap wajib:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npx --yes antd lint . --format json
```

Saat app sudah dibuat, jalankan juga lint terarah:

```bash
npx --yes antd lint apps/browser-launcher/src --format json
```

Desktop gate:

```bash
npm run desktop:dev -- browser-launcher
npm run desktop:build -- browser-launcher --dir
npm run desktop:build -- browser-launcher
```

End-to-end checklist minimum:

1. Installer benar-benar membawa seed yang cocok `runtime-lock.json`.
2. Fresh Windows user/VM dengan network dinonaktifkan dapat install, memilih managed root, memasang seed, dan membuka managed runtime.
3. Packaged app berjalan ketika repo, Node/npm, Vite, control center port 1999, dan app suite lain tidak tersedia.
4. Tidak ada lookup executable/profile/extension browser melalui registry, PATH, `Program Files`, file association, atau default browser.
5. Seed/archive corrupt, lock mismatch, traversal, archive bomb, dan extraction limit ditolak.
6. Cancel/crash saat install direkonsiliasi tanpa runtime setengah aktif.
7. Dua akun login dan berjalan bersamaan, termasuk dua profile dengan label email sama.
8. Cookie/session bertahan setelah browser dan launcher restart.
9. Extension acceptance list bertahan per profile.
10. Launcher ditutup tanpa menutup browser managed.
11. Browser ditutup langsung tanpa merusak launcher state.
12. Runtime baru di-install ketika runtime lama masih berjalan.
13. Isolated probe dan atomic CAS mengaktifkan versi baru; profile akun tidak pernah dipakai sebagai canary.
14. Launch berikutnya memakai versi baru; process lama tetap hidup.
15. Profile floor mencegah downgrade; acknowledgment user tidak melewati floor.
16. Catalog/download gagal dan active runtime lama tetap dipakai hanya jika security policy mengizinkan.
17. Reset/archive crash direkonsiliasi dari journal dan memindahkan data ke recovery, bukan delete langsung.
18. Unknown/in-use/active/floor-required/seed-recovery runtime tidak dihapus.
19. Exact IPC sender validation menolak renderer/origin/capability yang salah; progress subscription dapat dibatalkan dan dibersihkan.
20. Update launcher tidak menghapus `launcher.sqlite`, runtime, atau profiles.
21. Uninstall default mempertahankan managed root.
22. Windows user/PC lain tidak dijanjikan memulihkan session terenkripsi.
23. Tidak ada password, cookie, token, URL query sensitif, atau data browsing dalam log.
24. Packaged executable memakai capability IPC yang sama dengan dev.
25. QA PC-only lulus pada lebar 1280, 1366/1440, 1920, dan 2560 px, continuous resize, zoom 100–200%, keyboard/focus, serta tanpa horizontal page overflow.

## 22. Keputusan OPEN untuk Review

1. Apa nama produk final untuk display name, executable, installer, dan Windows app identity? App ID internal sementara tetap `browser-launcher`.
2. Apakah CfT setelah pilot boleh menuju production bila seluruh redistribution/signing/security gate lulus? Sampai disetujui, targetnya pilot internal.
3. Managed root default memakai drive dengan ruang terbesar atau selalu meminta user memilih?
4. Apakah start URL dibatasi ke allowlist atau menerima semua URL HTTPS yang tervalidasi? Default awal: Gmail, tanpa kredensial.
5. Extension mana yang wajib lolos sebelum rilis?
6. Berapa retention recovery profile dan runtime lama?
7. Berapa umur runtime untuk warning dan hard block?
8. Apakah telemetry aplikasi dibutuhkan? Default plan: tidak ada telemetry.
9. Apakah status browser real-time benar-benar dibutuhkan pada versi pertama? Default plan: tidak, kecuali Fase 6 dibuktikan aman.
10. Apakah user boleh memindahkan managed root setelah akun dibuat? Default plan: belum.

Keputusan yang sudah tertutup dan bukan lagi **OPEN**: installer wajib membawa seed untuk first run offline; satu email boleh menjadi label beberapa profile UUID; data deletion hanya melalui launcher dengan disclosure, bukan uninstall default.

## 23. Rekomendasi Review

Urutan review sebelum kode:

1. setujui batas penggunaan CfT;
2. setujui model penyimpanan dan DPAPI disclosure;
3. setujui account/profile lifecycle;
4. setujui update/rollback/security policy;
5. setujui Electron capability boundary;
6. tutup keputusan **OPEN** untuk Fase 0;
7. baru pecah implementasi menjadi diff kecil per fase.

Jangan mulai dari UI. Storage, runtime update, dan security boundary menentukan apakah produk aman dibangun.
