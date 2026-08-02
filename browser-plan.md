# Browser Launcher — Canonical Architecture and Implementation Plan

> **Status — 2026-08-01:** Plan canonical untuk app `browser-launcher`, tunduk pada `PLAYBOOK.md`
> dan `AGENTS.md`. Implementasi belum dimulai dan wajib berhenti pada gate fase yang belum lulus.
> Keputusan bertanda **OPEN** harus ditutup sebelum fase terkait.
>
> **Menggantikan:** `.ai/browser-plan.md` (canonical lama), `browser-plan2.md` (draft pengukuran),
> `browser-plan.md` v1, `browser-plan1.md` v1.1. Setelah dokumen ini disetujui, keempatnya dihapus
> agar tidak ada dua sumber keputusan.
>
> **Lokasi:** root repo. `PLAYBOOK.md:163` menetapkan `.ai/` hanya untuk _transient implementation
> status + handoff_ — plan canonical tidak boleh tinggal di sana. §6 dokumen ini juga menempatkan
> `browser-plan.md` di root.

**Tanda status:**

| Tanda             | Arti                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `[TERUKUR]`       | Diukur langsung di PC target pada 2026-07-31                          |
| `[TERVERIFIKASI]` | Dicek ke API resmi, dokumentasi vendor, atau kode repo dalam sesi ini |
| `[BELUM DIUJI]`   | Asumsi yang wajib dibuktikan sebelum fase terkait                     |
| `[OPEN]`          | Menunggu keputusan                                                    |

Klaim `[TERVERIFIKASI]` yang berasal dari sumber eksternal (CfT API, issue tracker, dokumentasi
Chrome) diverifikasi pada tanggal di atas dan **wajib dicek ulang di Fase 0A** sebelum dijadikan
dasar implementasi.

---

## 1. Tujuan

Membuat app desktop Dhepil Suite yang:

- menampilkan daftar akun email;
- menjalankan managed browser dengan profile terisolasi yang tidak bergantung pada Chrome reguler
  di PC;
- memakai satu `user-data-dir` terisolasi per akun;
- mengizinkan banyak akun berjalan bersamaan;
- mempertahankan cookie, sesi login, history, bookmark, extension, dan preferensi tiap akun;
- memberi proxy berbeda per akun;
- memasang launcher melalui installer Windows NSIS x64 seperti app desktop biasa;
- memperbarui runtime browser tanpa merusak atau menghapus profil akun.

Electron hanya menjadi launcher dan control plane. Halaman web dibuka pada jendela browser
eksternal, bukan ditanam ke `BrowserWindow`, `WebContentsView`, atau renderer Electron.

### 1.1 Hard invariant: ekosistem mandiri

Artifact final wajib menjadi ekosistem aplikasi mandiri di atas Windows:

- tidak memakai Chrome, Edge, default browser, profile, extension directory, atau executable
  browser yang sudah terpasang di Windows;
- tidak mencari browser melalui registry, `Program Files`, PATH, file association, atau policy
  browser sistem;
- tidak memiliki fallback diam-diam maupun manual ke system browser;
- tidak memerlukan root control center port `1999`, monorepo, Node.js, npm, Vite dev server, atau
  app Dhepil Suite lain setelah instalasi;
- membawa Electron runtime dan satu managed browser runtime awal yang tervalidasi di dalam
  installer;
- tetap dapat menyelesaikan first-run storage setup dan membuka browser managed tanpa download
  runtime awal;
- menyimpan settings, database, runtime, profile, recovery, dan log di namespace app sendiri;
- memakai network hanya untuk halaman yang dibuka user dan pemeliharaan update, bukan untuk
  memenuhi dependency sistem yang hilang.

Ketergantungan pada Windows API, filesystem, network stack, GPU driver, certificate store, dan
DPAPI tetap ada. Istilah yang digunakan adalah **self-contained application ecosystem**, bukan
bebas dari operating system.

> **Catatan penegakan `[TERUKUR]`:** Chrome reguler **ada** di PC target
> (`C:\Program Files\Google\Chrome\Application\chrome.exe` v150.0.7871.187, auto-update aktif),
> begitu juga Edge. Keduanya **tidak boleh** dipakai, dicari, atau dijadikan fallback. Fakta ini
> dicatat justru supaya invariant di atas dapat diuji secara eksplisit di §21.1 checklist no. 4.

### 1.2 Scope produk nyata

Kebutuhan yang benar-benar dipakai, sesempit mungkin:

- membuka website biasa;
- login Google dan GitHub, sesi bertahan per akun;
- proxy berbeda per akun;
- extension userscript (Tampermonkey);
- bookmark bar + pinned tab per akun;
- 20–50+ akun tersimpan, 5–6 aktif bersamaan.

**Bukan pengganti browser harian.** User tetap memakai Chrome reguler untuk browsing sehari-hari.
Konsekuensi: codec proprietary, DRM/Widevine, dan streaming **tidak** menjadi acceptance criteria.

---

## 2. Keputusan Arsitektur

| Area                   | Keputusan canonical                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| App ID                 | `browser-launcher`                                                                                               |
| UI                     | Vite + React 19 + Ant Design 6                                                                                   |
| Desktop shell          | Shared workspace `electron/` saat build                                                                          |
| Ownership logic        | `electron/capabilities/managed-browser/`, **bukan** `electron/main/`                                             |
| Target awal            | Windows NSIS x64                                                                                                 |
| Runtime browser awal   | Chrome for Testing Stable x64 sebagai pilot                                                                      |
| Runtime yang ditolak   | Playwright Chromium (§4.2), system Chrome/Edge (§1.1), ungoogled-chromium (§14)                                  |
| Browser window         | Proses managed eksternal dari Electron main process                                                              |
| Isolasi                | Satu `user-data-dir` per account UUID                                                                            |
| Identitas akun         | **UUID** satu-satunya identity dan nama folder; email adalah label (§10.1)                                       |
| Policy email           | Satu-email-satu-profil aktif default, **dapat dimatikan**; ditegakkan di main process tanpa unique index (§10.1) |
| Metadata               | SQLite sejak versi pertama                                                                                       |
| Lokasi data            | Managed root pilihan user; tidak hard-code `D:`                                                                  |
| Seed runtime           | Dibundel ke installer sebagai managed asset di luar ASAR                                                         |
| Seed extension         | Dibundel ke installer via `extension-lock.json`; install offline (§11.5)                                         |
| Update runtime         | Versioned install; aktivasi atomic setelah isolated smoke test                                                   |
| Cleanup runtime        | **Nonaktif pada v1** sampai process ownership terbukti (§13.6)                                                   |
| Rollback               | `profile_runtime_floor` + runtime history, bukan satu nilai terakhir                                             |
| Cache per profil       | Dibatasi (default kandidat 250 MB, wajib divalidasi ulang di CfT — §5.2)                                         |
| Proxy                  | Per akun via relay lokal; kredensial ciphertext di SQLite (§12). **Schema Fase 1, fitur aktif Fase 6** (§12.7)   |
| Extension              | Vendored + `--load-extension`; Web Store tidak tersedia di CfT (§11)                                             |
| Start URL              | Dikirim hanya saat profil belum `initialized` (§10.2, §10.3)                                                     |
| First launch           | State machine `uninitialized` → `launching` → `initialized` dengan generation guard (§10.3)                      |
| Password Google        | Tidak pernah disimpan atau diterima launcher                                                                     |
| Portability            | Tidak dijanjikan; profil terikat enkripsi Windows/Chrome                                                         |
| Artifact final         | Standalone; root suite hanya development dan build-time tooling                                                  |
| Target distribusi awal | Pribadi/unsigned, satu PC — tetapi artifact tetap standalone + seed                                              |
| Distribusi publik      | **BLOCKED** sampai signing/licensing/redistribution gate lulus (§7.2)                                            |

---

## 3. Batas Produk dan Non-Goals

Versi pertama tidak akan:

- membuat browser engine sendiri;
- menanam browser ke UI Electron;
- memakai atau membuka system-installed Chrome, Edge, maupun default browser;
- bergantung pada root control center setelah app dibangun;
- menyimpan password, cookie, token OAuth, atau kredensial Google/GitHub;
- mengotomasi login;
- menjanjikan profile portable antar-PC atau antar-Windows-user;
- menjanjikan Google Chrome Sync;
- memasang extension di luar daftar vendored yang terlihat di UI;
- melakukan fingerprint spoofing / anti-detect — justru berisiko memicu security check Google;
- mematikan sandbox, web security, Safe Browsing, atau client-side phishing protection;
- menghentikan semua proses Chrome lewat nama executable;
- memigrasikan profile otomatis ke runtime browser berbeda;
- menjanjikan codec proprietary, DRM/Widevine, atau streaming;
- menyediakan telemetry;
- mendukung macOS/Linux sebelum kontrak Windows stabil.

Launcher memberi pemisahan sesi dan mengurangi salah akun. Launcher **bukan** batas keamanan
terhadap orang lain yang memiliki akses ke Windows user yang sama.

---

## 4. Risiko Runtime

### 4.1 Chrome for Testing

CfT ditujukan untuk automation/testing, bukan browsing reguler. Risikonya:

1. CfT tidak melakukan security update otomatis.
2. Google dapat mengubah API, format archive, atau kebijakan distribusi.
3. Launcher menjadi owner update runtime, integrity validation, activation, rollback, dan cleanup.
4. Extension, Google services, serta browser sign-in tidak dianggap kompatibel sampai diuji.
5. Runtime yang tertinggal dari Stable harus terlihat jelas dan dapat memblokir launch bila
   melewati kebijakan keamanan yang disetujui.

Karena itu **updater adalah critical path, bukan fitur opsional**. Di sini akan tersimpan 20+ sesi
login Google/GitHub aktif — aset bernilai tinggi di browser yang keamanannya bergantung pada
updater buatan sendiri.

CfT tetap hanya runtime pilot. Jika lisensi/redistribution, signing, atau penggunaan untuk target
produk tidak dapat disetujui pada Fase 0, implementasi **BLOCKED**. Plan tidak boleh menggantinya
dengan browser sistem untuk mengejar jadwal.

### 4.2 Kenapa bukan Playwright `[TERVERIFIKASI]`

Playwright sempat diusulkan sebagai runtime. Ditolak karena tiga alasan independen:

**a. Sign-in Google gagal — terdokumentasi 4 tahun.**

| Issue                                                                                       | Temuan                                                                  |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [#3060](https://github.com/microsoft/playwright/issues/3060) (2020)                         | Gmail login gagal, `headless: false`                                    |
| [#19420](https://github.com/microsoft/playwright/issues/19420) (2022)                       | Repro minimal `chromium.launch(headless=False)` → `accounts.google.com` |
| [#31212](https://github.com/microsoft/playwright/issues/31212) (2024)                       | `ignoreDefaultArgs: ['--enable-automation']` → **tetap ditolak**        |
| [mcp-playwright#147](https://github.com/executeautomation/mcp-playwright/issues/147) (2025) | Masih terjadi                                                           |

Issue #31212 yang menentukan: membuang flag automation tidak cukup. Yang terdeteksi adalah
**koneksi CDP itu sendiri**. Maintainer memperlakukan ini as-designed.

**b. Konflik lifecycle.** Playwright memiliki proses browser; kalau proses Node induk mati, browser
mati. Kebutuhan kita sebaliknya (§10.2).

**c. Bukan versi stable.** `browsers.json` Playwright: Chromium `152.0.7977.8` rev 1237. CfT Stable
`151.0.7922.71` — Playwright lebih baru dari stable, artinya build pre-release.

**Konsekuensi ke desain:** larangan `--remote-debugging-port` (§10.2) bukan formalitas. CDP adalah
persis yang membuat Playwright ditolak Google.

**Yang tetap berguna:** pisahkan lapisan _download_ dari lapisan _launch_. `@puppeteer/browsers`
sebagai **library** (bukan CLI) tetap kandidat untuk update layer — `chrome@stable` memberi CfT
stable. `[OPEN]` putuskan di Fase 4.

### 4.3 Risiko utama yang belum tertutup `[BELUM DIUJI]`

Dua hal yang mudah tertukar:

|                                                                 | Status di CfT                                 |
| --------------------------------------------------------------- | --------------------------------------------- |
| **Browser sign-in / Chrome Sync** (login ke browser untuk sync) | Dibuang CfT — **tidak dibutuhkan** (§1.2)     |
| **Web login** (buka `accounts.google.com` di tab, dapat cookie) | **Belum terverifikasi — ini yang dibutuhkan** |

Secara teknis alasan Playwright ditolak tidak berlaku di sini: kegagalan Playwright berasal dari
CDP, dan CfT yang di-spawn polos tidak punya CDP. Tapi CfT tetap build non-standard.

GitHub kemungkinan besar aman — GitHub tidak memfingerprint browser saat login. Kekhawatiran ada
pada Google.

**Ini gate pertama Fase 0A.** Kalau gagal, arsitektur kembali ke Fase 0; browser sistem bukan
fallback (§1.1).

---

## 5. Pengukuran PC Target

Angka di bawah diukur langsung pada 2026-07-31. Semua keputusan sizing berangkat dari sini, bukan
perkiraan. Semua diambil dari profil **Chrome reguler** sebagai baseline — bukan CfT — sehingga
harus divalidasi ulang terhadap CfT (§5.2).

### 5.1 Komposisi profil `[TERUKUR]`

Profil `Default` = 1.5 GB:

```
CACHE — dapat dihapus tanpa kehilangan login
  Cache                      418 MB
  Code Cache                 302 MB
  Service Worker             454 MB
  GPUCache + Dawn*             8 MB
  ─────────────────────────────────
  SUBTOTAL                 1.182 MB   ← 79% dari profil

SESI / LOGIN — wajib dipertahankan
  Extensions                 198 MB
  IndexedDB                   58 MB
  Local Storage              3,6 MB
  History                    2,4 MB
  Login Data + Web Data      0,2 MB   ← sesi login sesungguhnya
  Preferences + Bookmarks    0,1 MB
  ─────────────────────────────────
  SUBTOTAL                   270 MB   ← 21% dari profil
```

**Temuan:** 79% profil adalah cache yang dapat dibuang. Sesi login sesungguhnya < 1 MB.

### 5.2 Cache cap — kandidat default, belum final

```
--disk-cache-size=262144000     (250 MB)
```

| Jumlah akun | Tanpa cap | Dengan cap 250 MB |
| ----------- | --------- | ----------------- |
| 20          | ~28 GB    | ~10 GB            |
| 40          | ~56 GB    | ~20 GB            |

Angka 28 GB bukan proyeksi — itu ukuran folder `User Data` Chrome di PC target sekarang
(29 profil) `[TERUKUR]`.

> **`[BELUM DIUJI]`** Nilai 250 MB berasal dari Chrome reguler. Efektivitas dan efek sampingnya
> pada CfT (perilaku Service Worker, offline web app, evict aggressiveness) **wajib divalidasi di
> Fase 0A** sebelum dijadikan default final. Flag ini juga tidak membatasi `Service Worker` dan
> `Code Cache` secara langsung — ukur hasil nyatanya, jangan asumsikan proporsi di atas terbawa.

### 5.3 Disk cukup, RAM jadi plafon `[TERUKUR]`

```
C:  931 GB total, 380 GB bebas
D:  7.3 TB total, 1.9 TB bebas
RAM 15 GB total
Chrome sekarang: 19 proses, 2.12 GB   ← untuk 1 profil aktif
```

Tiap `user-data-dir` adalah process tree penuh, bukan tab. 6–7 akun bersamaan ≈ 13 GB → mesin
habis.

**Konsekuensi desain:**

- 20+ akun berarti **20+ tersimpan, 5–6 aktif bersamaan**;
- **tidak ada tombol "Buka semua"** — dilarang by design;
- pada ≥5 akun aktif, tampilkan peringatan RAM;
- managed root default menawarkan drive dengan ruang terbesar, tetapi **tidak hard-code `D:`**
  (§2, §8.3).

### 5.4 Runtime footprint

```
CfT win64 zip           201.082.763 bytes (~201 MB)   [TERVERIFIKASI]
Terekstrak              belum diukur → Fase 0A
Slot dipertahankan      active + pending + seluruh retained (cleanup nonaktif v1, §13.6)
```

`recovery/profiles/` memakai rename atomic pada volume sama — tidak menggandakan disk saat operasi,
tetapi menahan ruang selama retention.

`[OPEN]` Retention recovery dan retained runtime — tutup setelah ukuran terekstrak diukur.

---

## 6. Struktur Repository

```text
dhepil-suite/
├─ apps/
│  └─ browser-launcher/
│     ├─ AGENTS.md
│     ├─ CHANGELOG.md              # automation-owned; boleh absent sampai release pertama
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
│        │  ├─ proxyPolicy.ts
│        │  ├─ runtimePolicy.ts
│        │  └─ types.ts
│        ├─ engine/
│        │  ├─ children/             # flat, satu owner per operasi
│        │  │  ├─ accountCommands.ts
│        │  │  ├─ operationState.ts
│        │  │  ├─ proxyCommands.ts
│        │  │  ├─ runtimeCommands.ts
│        │  │  └─ storageSetup.ts
│        │  ├─ contracts.ts
│        │  └─ index.ts              # public headless engine API
│        ├─ data/
│        │  └─ windowManagedBrowserClient.ts
│        ├─ ui/
│        │  ├─ account-table/
│        │  ├─ account-form/
│        │  ├─ proxy-manager/
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
│  │     │  ├─ proxyRelay.ts
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
│  │  └─ index.cts                 # generic bridge only
│  └─ scripts/
│     └─ desktop.mjs
└─ browser-plan.md
```

Catatan:

- App tidak memiliki Electron dependency, main, preload, atau electron-builder config sendiri.
- App mewarisi `apps/AGENTS.md`, package dimulai dari `0.1.0`, dan version/changelog/tag berikutnya hanya dikelola `tooling/release/`; plan ini tidak mengotorisasi bump manual.
- Domain, engine, Gate, dan UI khusus produk tetap dimiliki `apps/browser-launcher/`.
- Browser process, filesystem, SQLite, extraction, download, proxy relay, dan update adalah
  privileged operations di `electron/capabilities/managed-browser/`, **bukan** di generic
  `electron/main/`.
- `electron/main/` dan `electron/preload/` tetap generic host/bridge. Capability browser hanya
  dimuat untuk app yang diizinkan metadata desktop.
- Capability module tidak boleh meng-import UI app. App berkomunikasi hanya melalui typed contract
  dan preload bridge.
- `BrowserLauncherGate.tsx` hanya composition/mapping boundary; tidak menjalankan fetch, SQLite,
  filesystem, spawn, retry loop, atau business policy.
- Tidak ada presenter layer. Leaf UI menerima props presentasional dan event callback dari
  Gate/engine.
- `ui/` root repo hanya menerima komponen generik jika reuse nyata terbukti. UI khusus akun tetap di
  app.

> **Penegakan `[TERVERIFIKASI]`:** `PLAYBOOK.md:245` — "`electron/main/` dan `electron/preload/`
> adalah shell generik; **dilarang memuat business logic app**". Menaruh `browserAccounts.ts` /
> `browserRuntime.ts` langsung di `electron/main/` melanggar aturan ini. `PLAYBOOK.md:172`
> mewajibkan engine modular dengan `children/` flat — satu `useBrowserLauncherEngine.ts` monolitik
> juga melanggar.

Kontrak capability ini adalah perluasan arsitektur canonical. Fase 0B/1 wajib memperbarui
`PLAYBOOK.md` dan architecture tests terlebih dahulu. Sampai perubahan itu disetujui, business
logic browser dilarang ditempatkan langsung di `electron/main/`.

### 6.1 Manifest dan capability

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

`desktop.capabilities` belum ada pada kontrak sekarang. Fase 0B–1 harus menambahkan kontrak generik:

1. memvalidasi capability yang dikenal;
2. menolak duplikat, unknown capability, shell command, executable path, dan arbitrary build hook
   dari manifest app;
3. menulis capability tervalidasi ke staged `package.json` untuk packaged app;
4. meneruskan capability tervalidasi melalui child environment khusus pada development;
5. membuat generic main/preload host hanya mendaftarkan IPC capability yang diizinkan;
6. memvalidasi app ID, capability, dan sender frame pada setiap IPC;
7. menolak pemanggilan IPC capability dari app lain;
8. membundle capability implementation dan asset seed hanya ketika capability tersebut aktif.

> **Ruang lingkup:** implementasikan **satu capability konkret** (`managed-browser`), bukan
> framework abstrak untuk N capability. App ID tetap bagian dari validasi — `desktop.mjs:275` sudah
> menulis `dhepilDesktopAppId` dan `electron/main/index.ts:22-23` sudah membacanya
> `[TERVERIFIKASI]` — tetapi app ID **bukan satu-satunya boundary**. Sender frame, origin, dan
> capability allowlist tetap divalidasi (§17).

Versi runtime seed, URL sumber build, hash, platform, dan expected signing metadata dimiliki
`electron/capabilities/managed-browser/runtime-lock.json`, bukan manifest renderer. Manifest app
tidak boleh mengarahkan build ke executable atau archive arbitrary.

### 6.2 Stable port — via discovery, bukan edit manual

`config/app-ports.lock.json` saat ini `[TERUKUR]`:

```json
{ "dhepil": 2000, "spreadsheet-minimal": 2001, "clipboard": 2002 }
```

**Jangan edit file ini secara manual.** `scripts/project-port-registry.ts` memiliki
`minimumProjectPort = 2000` dan logika alokasi + validasi format `[TERVERIFIKASI]`. Buat folder app
dan `app.manifest.json` lebih dulu, lalu jalankan discovery/Refresh sehingga port dialokasikan oleh
registry. Hasilnya kemungkinan `2003`, tetapi angka itu **output**, bukan input.

`electron/AGENTS.md` menegaskan dev desktop membaca lock ini dan melarang mengubah stable port
secara sepihak.

---

## 7. Packaging dan Distribusi

Gunakan shared `electron/scripts/desktop.mjs` dan installer NSIS x64 yang sudah ada.

### 7.1 Model: offline seed

- installer membawa Electron launcher **dan satu seed runtime CfT** yang lock/validation-nya lulus
  build gate;
- seed berada di `extraResources` di luar app ASAR;
- first run menyalin/extract seed ke managed root secara versioned **tanpa network**;
- build gagal bila seed tidak tersedia atau tidak cocok `runtime-lock.json`;
- browser binary tidak dibaca dari instalasi sistem;
- download network hanya untuk **update berikutnya**, bukan first run;
- runtime update tidak membutuhkan update launcher;
- installer dapat memilih lokasi program, tetapi managed root dipilih terpisah di first-run UI.

> **Kenapa seed, bukan download-on-first-run:** first run tanpa network harus tetap berhasil
> (§1.1). Download ~201 MB pada first run melanggar invariant itu dan membuat app tidak dapat
> dipakai bila catalog sedang down.

`desktop.mjs` tetap orchestrator tunggal. Capability menambahkan staged metadata, bundled output,
dan `extraResources` secara allowlisted; manifest app tidak menyediakan arbitrary build config.

> **Gap implementasi `[TERVERIFIKASI]`:** `desktop.mjs:314` saat ini memakai
> `files: ['out/**/*', 'package.json']` dan **tidak memiliki `extraResources`**. Staged
> `package.json` (`desktop.mjs:267-280`) juga disintesis tanpa field `dependencies`, dengan
> `npmRebuild: false` dan `buildDependenciesFromSource: false` (`:309-310`). Artinya: seed staging
> dan native dependency apa pun **belum didukung orchestrator** — ini pekerjaan Fase 0B, bukan
> asumsi.

### 7.2 Target distribusi awal

Target awal adalah **pemakaian pribadi pada satu PC, unsigned**. Konsekuensi yang diizinkan:

- code signing installer tidak menjadi gate untuk pemakaian pribadi;
- `desktop:build -- browser-launcher --dir` cukup untuk iterasi harian.

Yang **tidak** ikut dilonggarkan:

- artifact tetap **standalone** dan tetap **membawa seed** (§1.1 tidak dinegosiasikan);
- guardrail IPC, capability boundary, operation journal, dan containment tetap penuh (§17, §13.3);
- installer NSIS tetap menjadi jalur rilis, bukan diganti folder-copy.

**Distribusi publik tetap BLOCKED** sampai lisensi/redistribution CfT, ukuran artifact, code
signing, update path, dan offline installation test disetujui. Jika CfT tidak boleh dibundel,
arsitektur kembali ke Fase 0; system browser bukan fallback.

> Alasan guardrail tidak dilonggarkan meski satu PC: operasi ini menjalankan executable, membuka
> profile berisi 20+ sesi login aktif, mengakses database, dan melakukan recursive filesystem
> operation. Risikonya berasal dari **kekuatan operasinya**, bukan dari jumlah audiens.

### 7.3 Uninstall

- menghapus launcher dan resource program;
- tidak menghapus managed root;
- menawarkan penghapusan data hanya lewat flow terpisah dengan disclosure jelas;
- tidak menjalankan recursive delete akun tanpa pilihan eksplisit user.

---

## 8. Model Penyimpanan

### 8.1 Pemisahan program dan data

```text
<install-dir>/
├─ Browser Launcher.exe
└─ resources/
   └─ managed-browser-seed/
      ├─ runtime-lock.json
      └─ <verified-runtime-archive>
```

Tidak ada account database atau profile browser di `<install-dir>`. Seed hanya sumber bootstrap
lokal; runtime yang dapat di-update di-install secara versioned ke managed root.

### 8.2 Bootstrap settings

Shared Electron mengisolasi app data ke `%APPDATA%\Dhepil Suite Apps\browser-launcher\`
(`electron/main/index.ts:34-35` `[TERVERIFIKASI]`).

```json
{
  "schemaVersion": 1,
  "instanceId": "<launcher-instance-uuid>",
  "managedRoot": "D:\\Dhepil Browser",
  "managedRootMarkerId": "<marker-uuid>"
}
```

Hanya pointer managed root dan preferensi kecil yang diperlukan sebelum database dibuka — ada alasan
chicken-and-egg yang sah. Tulis atomic via temporary file lalu rename.

Bila file hilang/corrupt atau `managedRoot` tidak ditemukan (drive dilepas, letter berubah): masuk
recovery mode / first-run wizard. **Jangan** membuat ulang data di lokasi default secara diam-diam.

### 8.3 Managed root

Dipilih user saat setup pertama, bukan saat installer memilih lokasi program. First-run menawarkan
drive dengan ruang terbesar sebagai **saran**, bukan hard-code.

```text
<managed-root>/
├─ .dhepil-managed-browser.json      ← ownership marker
├─ launcher.sqlite
├─ runtime/
│  └─ versions/<version>/chrome-win64/chrome.exe
├─ profiles/<account-uuid>/
├─ extensions/<vendored-extension>/   ← §11
├─ updates/{downloads,staging}/
├─ recovery/profiles/
└─ logs/
```

> **Layout archive `[TERVERIFIKASI]`:** zip CfT memiliki prefix internal `chrome-win64/`, sehingga
> ekstraksi menghasilkan `versions/<v>/chrome-win64/chrome.exe`. Simpan
> `executable_relative_path` di database; jangan asumsikan `chrome.exe` berada di root folder versi.

Aturan:

- account UUID menjadi nama folder; **email tidak pernah menjadi nama path**;
- runtime dan profile wajib terpisah;
- database menyimpan path relatif terhadap managed root;
- managed root harus absolute, writable, dan bukan root drive langsung;
- UNC/network path ditolak pada versi awal;
- folder baru harus kosong; folder existing hanya melalui explicit adoption flow setelah konflik
  diperiksa;
- marker memuat schema version, app ID, instance ID, marker ID, dan waktu pembuatan;
- setiap open memverifikasi marker terhadap bootstrap settings sebelum database/profile disentuh;
- canonical/real path setiap segment diverifikasi; symlink, junction, dan reparse point yang keluar
  managed root ditolak;
- destructive operation tidak boleh mengandalkan prefix string saja untuk containment;
- ruang kosong diperiksa sebelum seed install, download, extraction, reset, dan backup;
- path tervalidasi ulang setiap kali aplikasi dibuka.

Jika marker hilang, mismatch, atau folder tampak dimiliki instalasi lain, launcher masuk recovery
mode dan tidak melakukan write/delete otomatis.

### 8.4 DPAPI dan portability

Chrome mengenkripsi sebagian data sensitif melalui mekanisme yang terikat pada konteks Windows user
dan perangkat:

- memindahkan profile ke PC lain tidak menjamin cookie/password dapat didekripsi;
- Windows user lain pada PC sama tidak dijanjikan dapat memakai sesi tersebut;
- backup bukan portable-login backup;
- launcher tidak mencoba mengekstrak, mendekripsi, atau memindahkan key material Chrome;
- restore lintas PC tidak didukung;
- UI backup/reset harus menjelaskan sesi login dan password mungkin tidak dapat dipulihkan.

---

## 9. Database SQLite

Kandidat awal `node:sqlite` bawaan runtime Electron, tetapi wajib lulus packaged compatibility,
migration, WAL, backup, dan corruption-recovery spike. Renderer **tidak pernah** mengakses database.

> **Risiko `[TERVERIFIKASI]`:** pada Electron 35 (Node 22.9) modul ini flag-gated dan
> `--experimental-sqlite` tidak dapat diteruskan
> ([electron#45532](https://github.com/electron/electron/issues/45532)). Repo memakai Electron
> `43.2.0` (`electron/package.json:14`) yang kemungkinan sudah unflagged, tetapi **versi Node
> bundled-nya belum terverifikasi**. `engines: node>=24` di root tidak menjawab ini — itu Node dev.
>
> **Risiko kedua:** `DatabaseSync` bersifat sinkron sementara main process juga melayani IPC dan
> progress download. Aman untuk metadata kecil, tetapi migration/VACUUM tidak boleh berjalan saat
> download streaming.
>
> Jika spike gagal, Fase 0B memilih adapter lain **beserta strategi native dependency packaging** —
> yang berarti mengubah `desktop.mjs` (§7.1).

### 9.1 Schema awal

```sql
-- WAL persisten per-database → di migration
PRAGMA journal_mode = WAL;

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Schema proxy dibuat sejak migration pertama (Fase 1), tetapi fitur proxy
-- baru aktif setelah relay Fase 6 dinyatakan PASS (§12.7).
CREATE TABLE proxies (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  scheme TEXT NOT NULL CHECK (scheme IN ('http', 'https', 'socks5')),
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT,
  password_ciphertext BLOB,            -- hasil safeStorage.encryptString()
  password_scheme_version INTEGER,     -- versi format enkripsi
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,                 -- UUID = satu-satunya identity
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,                 -- label; TIDAK ada unique index (§10.1)
  profile_directory TEXT NOT NULL UNIQUE,
  start_url TEXT NOT NULL,             -- dikirim hanya saat profile belum 'initialized'
  color TEXT,
  proxy_id TEXT REFERENCES proxies(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_launched_at TEXT,
  last_runtime_version TEXT,
  profile_runtime_floor TEXT,          -- batas downgrade, naik konservatif

  -- First-launch state machine (§10.3)
  profile_state TEXT NOT NULL DEFAULT 'uninitialized'
    CHECK (profile_state IN ('uninitialized', 'launching', 'initialized')),
  profile_initialized_at TEXT,         -- diisi HANYA saat masuk 'initialized'
  init_operation_id TEXT,              -- operasi yang sedang memegang 'launching'
  init_generation INTEGER NOT NULL DEFAULT 0,  -- guard anti stale write
  init_attempt_count INTEGER NOT NULL DEFAULT 0,
  last_init_error TEXT,

  archived_at TEXT
);

-- Tidak ada unique index untuk email. Policy satu-email-satu-profil ditegakkan
-- transaction-safe di main process agar dapat dimatikan tanpa migration (§10.1).
-- Index non-unique hanya untuk kecepatan lookup konflik:
CREATE INDEX accounts_email_lookup ON accounts(lower(email));
CREATE INDEX accounts_active_lookup ON accounts(archived_at);

CREATE TABLE runtime_versions (
  version TEXT PRIMARY KEY,
  runtime_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  executable_relative_path TEXT NOT NULL,
  source_url TEXT NOT NULL,
  archive_sha256 TEXT NOT NULL,        -- cache identity, BUKAN authenticity
  archive_size_bytes INTEGER NOT NULL,
  installed_at TEXT NOT NULL,
  validated_at TEXT,
  validation_method TEXT,
  state TEXT NOT NULL
    CHECK (state IN ('staging', 'ready', 'active', 'retained', 'failed')),
  failure_reason TEXT
);

CREATE TABLE runtime_state (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  active_version TEXT,
  pending_version TEXT,
  generation INTEGER NOT NULL DEFAULT 0,
  last_check_at TEXT,
  last_success_at TEXT,
  health TEXT NOT NULL
    CHECK (health IN ('unknown', 'ok', 'degraded', 'unavailable')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (active_version) REFERENCES runtime_versions(version),
  FOREIGN KEY (pending_version) REFERENCES runtime_versions(version)
);

CREATE TABLE profile_operations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN ('archive', 'reset', 'restore', 'purge')),
  source_relative_path TEXT NOT NULL,
  destination_relative_path TEXT NOT NULL,
  state TEXT NOT NULL
    CHECK (state IN ('prepared', 'moved', 'committed', 'failed')),
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
  outcome TEXT NOT NULL
    CHECK (outcome IN ('requested', 'spawned', 'failed')),
  error TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (runtime_version) REFERENCES runtime_versions(version)
);
```

### 9.2 Database rules

- semua write memakai prepared statement dan transaction;
- **`PRAGMA foreign_keys = ON` di-set pada setiap open-connection**, bukan hanya di migration —
  pragma ini per-koneksi dan default OFF, berbeda dari WAL yang persisten per-database;
- migration hanya maju; downgrade schema tidak didukung;
- email divalidasi sebagai identifier tampilan, bukan bukti akun Google;
- **email bukan identity key dan tidak memiliki unique index**; account UUID tetap satu-satunya
  identity. Policy satu-email-satu-profil ditegakkan transaction-safe di main process (§10.1)
  sehingga dapat dimatikan tanpa migration;
- write yang tunduk pada policy email memakai transaction `BEGIN IMMEDIATE` agar cek dan tulis tidak
  terpisah (§10.1);
- `profile_directory` selalu relative path yang dibuat launcher;
- transisi `profile_state` hanya boleh ditulis oleh operasi yang memegang `init_operation_id` dan
  `init_generation` yang cocok (§10.3);
- version comparison memakai parser komponen numerik, bukan lexicographic string;
- `profile_runtime_floor` dinaikkan konservatif sebelum profile disentuh runtime baru dan tidak
  pernah diturunkan otomatis;
- `runtime_state.generation` dipakai untuk compare-and-swap aktivasi global;
- filesystem rename dan transaction database dijembatani durable operation journal + startup
  reconciliation;
- kredensial proxy disimpan sebagai ciphertext (§12.5), tidak pernah plaintext;
- data browser tidak dimasukkan ke SQLite;
- WAL checkpoint dan backup database dilakukan sebelum migration app;
- database corrupt tidak boleh memicu penghapusan profile otomatis.

---

## 10. Lifecycle Akun

### 10.1 Identitas akun dan policy email

**UUID adalah satu-satunya identity.** Email adalah label. Ini tidak bernegosiasi: email dapat
berubah, dapat duplikat secara sah (alias, delegated mailbox), dan tidak boleh menentukan nama folder
atau primary key.

Di atas fondasi itu berlaku **policy produk**: **satu email = satu profil aktif**, aktif secara
default dan **dapat dimatikan** di Settings.

|                    | Keputusan                                                                              |
| ------------------ | -------------------------------------------------------------------------------------- |
| Primary key        | `accounts.id` (UUID)                                                                   |
| Nama folder profil | `profiles/<uuid>`                                                                      |
| Email di database  | kolom biasa, `NOT NULL`, **bukan key dan tanpa unique index**                          |
| Policy keunikan    | runtime policy di main process, dibaca dari `settings`, bukan constraint schema        |
| Ubah email         | **diizinkan** — email hanya label; tidak memindahkan profil, tidak mengubah sesi login |

#### Kenapa tidak ada unique index sama sekali

Policy ini **dapat dimatikan tanpa schema migration**. Unique index — parsial maupun penuh —
membuat itu mustahil: mematikan policy berarti men-drop index, dan itu adalah migration. Dua kontrak
tersebut tidak dapat hidup bersama.

Alasan kedua, index parsial `WHERE archived_at IS NULL` punya lubang yang tidak dapat ditutup di
level DB: akun baru boleh memakai email milik akun **archived**, lalu unarchive akun lama gagal
dengan constraint error tanpa jalan keluar yang jelas.

Karena itu: **tidak ada unique index untuk email.** Penegakan sepenuhnya di main process, di dalam
transaction yang sama dengan write-nya.

#### Penegakan transaction-safe

Policy diperiksa **di dalam transaction yang menulis**, bukan sebelum transaction dibuka. Cek-lalu-
tulis di luar transaction adalah TOCTOU race: dua create bersamaan dengan email sama dapat lolos
keduanya.

Kontrak minimum:

- baca kandidat konflik dan tulis account dalam **satu transaction** (`BEGIN IMMEDIATE` atau
  ekuivalen, sehingga writer lain menunggu, bukan membaca snapshot basi);
- pembandingan email memakai normalisasi yang sama di semua jalur (trim + casefold);
- policy dibaca dari `settings` **di dalam** transaction yang sama, sehingga toggle policy tidak
  membuat dua operasi bersamaan memakai aturan berbeda;
- kegagalan policy melempar error domain bertipe (`EMAIL_POLICY_CONFLICT`) dengan `conflictingId`
  dan `conflictingDisplayName`, bukan error SQLite mentah;
- `app.requestSingleInstanceLock()` (§16.3) menutup race lintas proses; transaction menutup race
  intra-proses.

#### Tiga jalur konflik dan pesan recovery

| Jalur         | Perilaku ketika policy aktif dan email bentrok                                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Create**    | Ditolak. Pesan: "Email ini sudah dipakai profil **<nama>**." Aksi: buka profil itu, pakai email lain, atau matikan policy di Settings.                                                                    |
| **Update**    | Ditolak. Sama seperti create, ditambah opsi mengembalikan email sebelumnya. Akun tidak berubah sama sekali — bukan partial write.                                                                         |
| **Unarchive** | Ditolak dengan **dua pilihan eksplisit**: (a) ubah email akun yang dipulihkan lalu unarchive, atau (b) archive akun yang sedang menempati email itu lalu ulangi. Akun tetap archived sampai user memilih. |

Ketika policy **dimatikan**, ketiga jalur berhenti memeriksa duplikat dan tidak ada schema yang
berubah. Menyalakan kembali policy **tidak** mem-backfill atau menolak data lama: akun duplikat yang
sudah ada tetap dibiarkan, dan penegakan hanya berlaku untuk write berikutnya. Tampilkan peringatan
non-blocking bila duplikat existing terdeteksi saat policy dinyalakan.

#### Test requirement

- **Concurrent create**: dua create bersamaan dengan email sama → tepat satu berhasil, satu gagal
  dengan `EMAIL_POLICY_CONFLICT`; tidak ada dua akun aktif beremail sama.
- **Concurrent update**: dua update bersamaan yang mengarah ke email sama → tepat satu berhasil.
- **Update race dengan create**: create dan update yang menargetkan email sama → tepat satu berhasil.
- **Unarchive conflict**: unarchive ke email yang sudah ditempati → ditolak, akun tetap archived,
  kedua opsi recovery dapat dijalankan dan berhasil.
- **Policy toggle**: mematikan policy tidak menjalankan migration; duplikat dapat dibuat; menyalakan
  kembali tidak menghapus atau menolak data lama.
- **Normalisasi**: `A@B.com`, `a@b.com`, dan `a@b.com` diperlakukan sama di semua jalur.

### 10.2 Tambah akun dan launch

**Tambah akun:**

1. Renderer mengirim `displayName`, `email`, `startUrl`, `proxyId?` melalui typed preload API.
2. Main memvalidasi panjang, format email, URL `https:`, batas jumlah akun.
3. Main membuka transaction, memeriksa policy email di dalamnya (§10.1), membuat UUID
   (`crypto.randomUUID()`), menetapkan `profiles/<uuid>`, dan menyimpan account —
   **semuanya dalam satu transaction**. Renderer tidak boleh memilih arbitrary path.
4. Account tersimpan dengan `profile_state = 'uninitialized'`.
5. Launch pertama dijalankan sebagai operasi terpisah mengikuti state machine §10.3.

Membuat account dan meluncurkannya adalah **dua operasi berbeda**. Account yang gagal diluncurkan
tetap ada sebagai record valid dengan `profile_state = 'uninitialized'` dan dapat di-retry.

**Argumen launch:**

```text
--user-data-dir=<absolute-managed-profile-path>
--disk-cache-size=<cache-cap-bytes>            §5.2, nilai dari settings
--load-extension=<managed-root>/extensions/... §11
--no-first-run
--no-default-browser-check
[<validated-start-url>]                        HANYA bila profile_state != 'initialized'
```

> **`--proxy-server` belum ada di sini.** Flag proxy baru ditambahkan setelah relay Fase 6
> dinyatakan PASS. Sampai saat itu, akun yang memiliki `proxy_id` **tidak diluncurkan sama sekali** —
> bukan diluncurkan direct. Lihat §12.7 untuk kontrak lengkap fase proxy.

**Larangan default:**

```text
--no-sandbox
--disable-web-security
--ignore-certificate-errors
--disable-client-side-phishing-detection
--remote-debugging-port
--disable-background-networking
```

Bukan formalitas: mematikannya merusak situs, extension, dan web app behavior.
`--remote-debugging-port` khususnya — CDP adalah persis yang membuat Playwright ditolak Google
(§4.2).

Launch memakai `spawn()` dengan **argument array**, bukan command string. `detached`, `stdio`
ignore, lalu `unref()` — browser tetap hidup jika Electron launcher ditutup. Setelah proxy aktif
(Fase 6), akun berproxy tunduk pada keputusan lifecycle §12.4. Runtime path dan profile path berasal
dari database/managed root, bukan renderer.

**Klik ganda akun yang sama:** Chrome singleton lock bersifat per-`user-data-dir` dan memfokuskan
window yang ada. Per-account launch mutex tetap dipakai agar tidak ada dua operasi launcher paralel
untuk akun sama.

### 10.3 First launch dan profile initialization

`spawn()` yang mengembalikan PID **bukan** bukti profile terbentuk. Chrome dapat keluar seketika
karena singleton lock, executable rusak, argumen ditolak, atau disk penuh — semuanya setelah
`spawn()` sukses. Menandai `initialized` di titik itu membuat start URL hilang selamanya untuk
profile yang sebenarnya tidak pernah ada.

#### State machine

```text
uninitialized ──launch diminta──► launching ──bukti objektif──► initialized
      ▲                               │
      └────────gagal / timeout────────┘
```

| State           | Arti                                                           | Start URL dikirim? |
| --------------- | -------------------------------------------------------------- | ------------------ |
| `uninitialized` | Profile belum pernah terbentuk; retryable                      | **Ya**             |
| `launching`     | Satu operasi sedang mencoba; tidak ada yang lain boleh menulis | Ya (operasi itu)   |
| `initialized`   | Profile terbukti ada dan dipakai                               | **Tidak**          |

#### Bukti objektif untuk `initialized`

Transisi `launching` → `initialized` **hanya** setelah semua terpenuhi:

1. `profiles/<uuid>/` ada dan berada di dalam managed root (real-path, §8.3);
2. file penanda minimum yang ditulis Chrome sendiri sudah ada — minimum `Local State` di root
   profile dan direktori `Default/`. **`[BELUM DIUJI]`** daftar file minimum yang benar-benar stabil
   antar versi CfT wajib dikonfirmasi di Fase 0A dan dicatat sebagai konstanta, bukan ditebak;
3. process bertahan melewati **readiness window** tanpa exit — nilai awal 5 detik, dikonfirmasi di
   Fase 0A. Exit sebelum window habis dianggap gagal, apa pun exit code-nya;
4. tidak ada `error` event dari child handle selama window.

Bila window habis dan process masih hidup **tetapi** bukti filesystem belum lengkap, state tetap
`launching` sampai timeout keras (nilai awal 30 detik), lalu turun ke `uninitialized` dengan
`last_init_error` terisi. Tidak ada state "mungkin berhasil".

#### Idempotency dan generation guard

Setiap percobaan launch mendapat `init_operation_id` (UUID) dan menaikkan `init_generation` dalam
transaction yang sama saat masuk `launching`.

- write apa pun ke `profile_state`, `profile_initialized_at`, atau `last_init_error` **wajib**
  menyertakan `init_operation_id` dan `init_generation` yang cocok; yang tidak cocok **diabaikan
  secara diam** dan dicatat sebagai stale;
- operasi launch baru untuk akun yang sedang `launching` **ditolak** oleh per-account mutex, bukan
  menimpa;
- akibatnya, operasi lambat yang selesai setelah operasi lebih baru dimulai tidak dapat menulis state
  milik operasi baru;
- `init_attempt_count` naik setiap masuk `launching`, untuk backoff UI dan diagnosis.

#### Crash dan restart

| Situasi                                 | Perilaku                                                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `spawn()` gagal (ENOENT, EACCES)        | Tetap `uninitialized`; `last_init_error` diisi; retry mengirim start URL                                                               |
| Crash **sebelum** bukti lengkap         | Turun ke `uninitialized`; retry mengirim start URL                                                                                     |
| Crash **setelah** `initialized`         | Tetap `initialized`; launch berikutnya **tidak** mengirim start URL                                                                    |
| Launcher restart saat state `launching` | Startup reconciliation menurunkan ke `uninitialized` — `launching` tidak dapat bertahan lintas proses karena tidak ada pemiliknya lagi |
| Reset profile (§10.6)                   | Kembali ke `uninitialized`, `init_generation` dinaikkan, start URL dikirim lagi                                                        |

Reconciliation `launching` → `uninitialized` saat startup aman karena `launching` hanya bermakna
"ada operasi in-flight di proses ini". Setelah proses mati, klaim itu tidak dapat diverifikasi, dan
`uninitialized` adalah state yang retryable — bukan destruktif.

#### Test requirement

- **spawn failure**: executable tidak ada → state tetap `uninitialized`, error tercatat, retry
  mengirim start URL;
- **crash sebelum profile dibuat**: process exit dalam readiness window → `uninitialized`, retryable;
- **crash setelah initialized**: relaunch tidak mengirim start URL;
- **retry berhasil**: setelah dua kegagalan, percobaan ketiga mencapai `initialized`;
  `init_attempt_count` = 3;
- **overlap**: launch kedua saat state `launching` ditolak mutex; hanya satu `init_operation_id`
  aktif;
- **stale write**: operasi lama yang selesai belakangan tidak menimpa state operasi baru
  (generation mismatch diabaikan);
- **launcher restart**: state `launching` yang tertinggal di database turun ke `uninitialized` saat
  startup, tidak menggantung selamanya;
- **singleton-lock exit**: launch akun yang browsernya sudah hidup tidak menurunkan state
  `initialized` menjadi `uninitialized`.

### 10.4 Session restore, bookmark, pinned tab `[TERUKUR]`

Diverifikasi dari 29 profil Chrome di PC target:

```
Bookmarks (JSON lokal, 26 KB)
  bookmark_bar   children=35     ← lokal, tidak butuh sync
  other          children=1      ← lokal
  synced         children=0      ← satu-satunya yang butuh Google Sync, dan kosong

bookmark_bar: { show_on_all_tabs: true }

Sessions/  2.1 MB
├── Session_*   ← sesi tersimpan otomatis
└── Tabs_*      ← pinned tab
```

**Bookmark bar, pin bookmark, dan pinned tab semuanya lokal** — tersimpan di dalam `user-data-dir`,
otomatis terisolasi per akun. Yang hilang hanya sinkronisasi antar-profil, dan itu justru diinginkan.

**Preseed `Preferences` TIDAK MUNGKIN `[TERVERIFIKASI]`.** Pref berikut MAC-signed di
`Secure Preferences`:

```
PROTECTED: session.restore_on_startup      + _encrypted_hash
PROTECTED: session.startup_urls            + _encrypted_hash
PROTECTED: extensions.ui.developer_mode    + _encrypted_hash
```

Menulisnya langsung membuat hash tidak cocok → Chrome menganggap tampering dan mereset ke default.
Launcher **tidak boleh** menulis file preference Chrome.

**Tetapi tidak dibutuhkan.** Di 29 profil PC target, `restore_on_startup` bernilai `None` di
semuanya — tidak pernah di-set — namun sesi dan pinned tab tetap tersimpan di `Sessions/` dan
dipulihkan. Karena itu launcher cukup **tidak mengirim start URL** setelah profile mencapai state
`initialized` (§10.2, §10.3).

`[BELUM DIUJI]` Apakah CfT tanpa argumen URL memulihkan tab **non-pinned**. Default resmi Chrome
adalah membuka New Tab. Bila tidak, mitigasinya satu langkah manual sekali per profil (Settings →
"Continue where you left off"). → Fase 0A.

### 10.5 Edit akun

Dapat diubah: display name, warna, start URL yang lolos allow-rule, proxy assignment, **email**.

Mengubah email tidak memindahkan atau mengganti profile — email hanya metadata. Login aktual
ditentukan sesi di dalam profile. Perubahan email tetap melewati policy §10.1.

### 10.6 Arsip, hapus, reset

Default action adalah **archive**, bukan delete profile.

Penghapusan permanen memerlukan dialog yang menyebut data yang hilang: sesi login, cookies, history,
bookmarks lokal, extension dan extension data, password/autofill tersimpan.

Sebelum penghapusan:

1. main process menampilkan **native confirmation** yang menyebut data terdampak;
2. pastikan profile tidak sedang dipakai dengan mekanisme yang dapat dibuktikan; status `unknown`
   berarti operasi **ditolak**;
3. tulis operation journal berstatus `prepared` dalam transaction;
4. pindahkan folder ke `recovery/profiles/<uuid>-<timestamp>` secara atomic pada volume sama;
5. tandai journal `moved`, lalu account archived/deleted dalam transaction final;
6. tandai journal `committed`;
7. hapus recovery hanya melalui cleanup terpisah setelah retention dan verifikasi ulang containment.

Tidak ada recursive delete langsung dari path yang berasal dari renderer.

> **Kenapa journal, bukan sekadar rename + update DB:** rename filesystem dan commit SQLite tidak
> dapat dibuat atomic bersama. Bila crash terjadi di antaranya, startup reconciliation membaca
> journal serta keadaan filesystem untuk menyelesaikan atau memulihkan operasi. Folder recovery
> tanpa journal atau mismatch **tidak dihapus otomatis**.

**Reset profile** memakai journal yang sama, tetapi metadata account dipertahankan:

1. penjelasan di renderer, lalu native confirmation dari main process;
2. tolak bila profile aktif, status penggunaan tidak dapat dibuktikan, atau `profile_state` masih
   `launching`;
3. rename profile lama ke recovery via journal;
4. dalam transaction final: set `profile_state = 'uninitialized'`, `profile_initialized_at = NULL`,
   `init_operation_id = NULL`, dan **naikkan `init_generation`** sehingga operasi launch lama tidak
   dapat menulis state profile baru (§10.3);
5. folder profile baru dibuat saat launch berikutnya, dan start URL dikirim lagi;
6. reset `last_runtime_version` dan `profile_runtime_floor` hanya untuk profile baru, bukan recovery
   lama;
7. sediakan undo selama retention bila folder baru belum dipakai.

---

## 11. Extension

### 11.1 Chrome Web Store tidak tersedia di CfT `[TERVERIFIKASI]`

CfT membuang integrasi Google services — termasuk API key yang dibutuhkan alur install Web Store.
Ini bukan bug dan bukan komponen yang dapat ditambahkan, serta berlaku untuk semua build Chromium
non-Chrome.

Konsekuensi: aturan "user memasang extension sendiri melalui jalur browser yang didukung" **tidak
dapat dipertahankan** — jalur itu tidak ada di runtime managed.

### 11.2 Model: vendored, launcher-managed, terlihat

Extension yang disetujui di-vendor ke `<managed-root>/extensions/<name>/`, lalu di-inject:

```
--load-extension=<managed-root>/extensions/<name>
```

Untuk 20+ akun ini lebih baik daripada install manual per profil: satu salinan, versi ter-pin,
konsisten di semua profil. Data userscript tetap per-profil di dalam `user-data-dir`.

Aturan:

- **tidak ada sideload diam-diam** — UI wajib menampilkan extension apa yang aktif dan versinya;
- extension masuk **acceptance matrix** dan disetujui sebelum di-vendor;
- launcher tidak memodifikasi extension database di dalam profil;
- perpindahan runtime dapat membutuhkan reinstall extension dan tidak dijanjikan kompatibel;
- extension yang memerlukan native messaging host, enterprise policy, proprietary service, DRM,
  atau Google browser sync harus diuji khusus.

### 11.3 Tampermonkey — dua detail yang menentukan

**a. Extension ID harus stabil.** Userscript terikat pada ID extension; ID berubah = userscript
hilang. Pertahankan field `key` dari manifest asli saat mem-vendor agar ID terkunci.

**b. Developer mode `[TERVERIFIKASI]`.** Tampermonkey 5.0+ memerlukan developer mode karena MV3 —
userscript hanya berjalan lewat `chrome.userScripts` API yang wajib diaktifkan user. Sejak Chrome
138 tersedia toggle per-extension "Allow user scripts".

`extensions.ui.developer_mode` MAC-protected → tidak dapat di-preseed (§10.4). Jalur manual
berfungsi dan permanen — terbukti di PC target: dua profil memiliki `devmode=True` yang bertahan
`[TERUKUR]`. Untuk 20 akun berarti satu kali toggle per profil.

`[BELUM DIUJI]` `--load-extension` mungkin tidak memerlukan developer mode karena extension dimuat
lewat command line, bukan dari `chrome://extensions`. → Fase 0A.

### 11.4 Di luar scope

Extension bundled milik produk sendiri belum masuk scope. Jika dibutuhkan, rancang signing, update,
policy, permission disclosure, dan compatibility test terpisah.

### 11.5 Packaging offline — `extension-lock.json`

Extension vendored **tidak boleh diunduh saat first run**. Alasannya sama dengan seed runtime (§7.1):
first run tanpa network harus tetap berhasil (§1.1). Karena `--load-extension` ada di argumen launch
(§10.2), extension yang hilang berarti launch gagal atau berjalan tanpa userscript — keduanya tidak
dapat diterima.

**Kontrak asset.** Extension dibawa installer melalui `extraResources` yang allowlisted, sejajar
dengan seed runtime:

```text
<install-dir>/resources/
├─ managed-browser-seed/
│  ├─ runtime-lock.json
│  └─ <verified-runtime-archive>
└─ managed-browser-extensions/
   ├─ extension-lock.json
   └─ <extension-id>/<version>/…        ← unpacked, siap --load-extension
```

`electron/capabilities/managed-browser/extension-lock.json` dimiliki capability, **bukan** manifest
renderer — aturan yang sama dengan `runtime-lock.json` (§6.1). Manifest app tidak boleh mengarahkan
build ke archive atau direktori extension arbitrary.

Field wajib per entry:

| Field                   | Arti                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `name`                  | nama yang ditampilkan di UI (§11.2)                                |
| `version`               | versi ter-pin                                                      |
| `source`                | asal asset (URL atau path vendored) untuk audit                    |
| `sha256`                | **cache identity dan deteksi korupsi**, bukan authenticity (§13.3) |
| `archive_size_bytes`    | batas atas/bawah saat validasi                                     |
| `extension_id`          | ID yang harus stabil (§11.3a)                                      |
| `manifest_key`          | field `key` dari manifest asli yang mengunci ID                    |
| `licensing_status`      | `approved` \| `pending` \| `rejected`                              |
| `redistribution_status` | `approved` \| `pending` \| `rejected`                              |
| `acquired_at`           | waktu acquisition                                                  |
| `validated_at`          | waktu validation build gate                                        |
| `validation_method`     | cara validasi yang benar-benar dilakukan                           |

**Build gate.** Build **gagal** bila: asset extension hilang; hash tidak cocok lock; `extension_id`
hasil load tidak sama dengan lock; `manifest_key` tidak ada padahal ID harus stabil; atau
`licensing_status`/`redistribution_status` bukan `approved`.

> **Tampermonkey belum boleh dibundel** sampai licensing/redistribution disetujui. Sampai itu terjadi
> statusnya `pending` dan build production menolaknya. Ini gate yang sama dengan CfT (§7.2) —
> mem-vendor extension pihak ketiga ke installer adalah redistribusi. → Fase 0B.

**Install di first run.** Deterministic, offline, dan memakai mekanisme yang sama dengan runtime:

1. baca `extension-lock.json` dari `extraResources`;
2. validasi hash, ukuran, dan struktur manifest setiap entry;
3. extract/copy ke `<managed-root>/extensions/staging/<id>-<version>/` dengan extractor ber-limit
   yang sama seperti §13.3 (zip-slip, entry count, path depth, compression ratio);
4. verifikasi `extension_id` hasil load cocok lock — bila tidak, **tolak**, jangan aktifkan;
5. atomic rename staging → `<managed-root>/extensions/<id>/<version>/`;
6. catat state di database dalam transaction;
7. `--load-extension` menunjuk ke versi aktif, bukan ke folder staging.

**Update extension** memakai pola yang sama dengan runtime (§13.4): versioned side-by-side, staging →
validasi → atomic activation. Aturan keras:

- versi lama **tidak dihapus** selama masih mungkin dipakai — sejajar dengan cleanup runtime yang
  nonaktif pada v1 (§13.6);
- update **tidak pernah** menyentuh data userscript. Userscript tersimpan di dalam `user-data-dir`
  per profil (§11.2) dan terikat pada `extension_id`; karena ID dikunci `manifest_key`, update versi
  tidak menghilangkan userscript;
- bila `extension_id` berubah antar versi, itu **bukan update** — itu extension lain, dan harus
  melewati acceptance matrix ulang;
- launch diblokir dengan diagnosis bila extension aktif hilang/rusak, bukan berjalan diam-diam tanpa
  extension.

Validation yang wajib ada (→ §21.1 no. 16, 16a–16c):

- install offline dari `extraResources` tanpa network;
- lock mismatch (hash, ukuran, ID) ditolak;
- `extension_id` stabil setelah update **extension** dan setelah update **runtime**;
- userscript bertahan melewati kedua jenis update;
- extension hilang/rusak → launch diblokir dengan pesan jelas, bukan silent-degrade.

---

## 12. Proxy Per Akun

### 12.1 `--proxy-server` tidak menerima kredensial `[TERVERIFIKASI]`

```
--proxy-server=user:pass@host:port    → "no supported proxies", gagal
--proxy-server=host:port              → jalan, tetapi Chrome menampilkan dialog
                                         username/password setiap start
```

By design, dikonfirmasi developer Chromium, tercatat di
[crbug 40471183](https://issues.chromium.org/issues/40471183). Untuk 20+ akun berkredensial ini
berarti 20 dialog manual.

### 12.2 Jalur extension tertutup di MV3 `[TERVERIFIKASI]`

Dokumentasi resmi Chrome, verbatim:

> _"As of Manifest V3, the `webRequestBlocking` permission is no longer available for most
> extensions... Policy installed extensions can continue to use `webRequestBlocking`."_

`onAuthRequired` masih ada dan `asyncBlocking` masih didukung, tetapi memerlukan
`webRequestBlocking` yang kini terbatas pada extension yang dipasang via enterprise policy.
**Ditolak** — menambah permukaan kerja besar untuk mekanisme yang dapat berubah.

### 12.3 Keputusan: relay lokal

```
Chrome (--proxy-server=127.0.0.1:<port-akun>)
   → relay lokal milik capability
      → proxy upstream (user:pass)
```

**Prior art `[TERVERIFIKASI]`:** [zhom/donutbrowser](https://github.com/zhom/donutbrowser) (3.5k★,
Rust/Tauri, AGPL-3.0, aktif) adalah proyek open-source terdekat dengan arsitektur ini, dengan proxy
per-profil sebagai fitur inti. Implementasinya memakai relay lokal — `proxy_server.rs` (94 KB) dan
`socks5_local.rs` (31 KB), dengan komentar eksplisit soal _upstream-dial_ dan _"every upstream type
(direct, HTTP/HTTPS...)"_. Bukan flag, bukan extension.

> **Lisensi:** AGPL-3.0. Boleh dibaca untuk memahami pendekatan; **jangan copy-paste** kecuali
> proyek ini juga AGPL. Catatan: donutbrowser memakai fork Chromium anti-fingerprint — bagian itu
> **tidak** diikuti (§3).

Desain:

- satu relay dimiliki `capabilities/managed-browser/children/proxyRelay.ts`;
- satu port loopback per akun aktif; binding hanya ke `127.0.0.1`;
- mapping port↔akun di memory, direkonsiliasi saat launch;
- kredensial di-decrypt saat relay start dan **tidak pernah** masuk argumen command line — command
  line terlihat di Task Manager;
- relay menolak koneksi dari proses selain yang diharapkan sejauh dapat diverifikasi.

### 12.4 Konflik lifecycle — harus diputuskan

Ada kontradiksi nyata yang muncul **setelah** relay Fase 6 aktif: §10.2 menetapkan browser tetap
hidup setelah launcher ditutup, tetapi relay proxy berjalan di dalam proses launcher dan mati
bersamanya. Browser yang masih hidup akan kehilangan proxy.

**Larangan mutlak:** tidak boleh ada fallback diam-diam ke koneksi direct. Trafik yang seharusnya
lewat proxy tidak boleh keluar tanpa proxy tanpa user mengetahuinya. Aturan ini berlaku sejak Fase 1
dalam bentuk blokir launch (§12.7), bukan hanya setelah relay ada.

`[OPEN]` Pilih satu:

| Opsi                                                            | Konsekuensi                                                                                                                              |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Launcher tetap hidup di tray** selama ada akun proxy aktif | Lebih sederhana; launcher tidak benar-benar "ditutup" saat proxy dipakai. Perlu UI tray + peringatan saat user menutup window            |
| **B. Relay sebagai detached managed sidecar**                   | Browser benar-benar independen; menambah satu proses yang harus dipantau, direkonsiliasi, dan dibersihkan — termasuk saat launcher crash |

Default plan sebelum keputusan: **Opsi A**, karena tidak menambah proses baru yang perlu
reconciliation (§16 belum menyediakannya pada v1). Saat user menutup launcher dengan akun proxy
aktif, tampilkan konfirmasi eksplisit yang menyebut konsekuensinya.

Akun **tanpa** proxy tidak terpengaruh dan tetap hidup setelah launcher ditutup.

### 12.5 Penyimpanan kredensial

`safeStorage` adalah **API encrypt/decrypt**, bukan tempat penyimpanan. Ciphertext-nya tetap harus
disimpan sendiri:

- `proxies.password_ciphertext` BLOB ← hasil `safeStorage.encryptString()`;
- `proxies.password_scheme_version` INTEGER ← versi format, agar rotasi/migrasi mungkin;
- cek `safeStorage.isEncryptionAvailable()` sebelum menyimpan; bila tidak tersedia, **tolak
  menyimpan kredensial** dan jelaskan ke user — jangan fallback ke plaintext;
- decrypt hanya di main process, hanya saat relay start;
- **jangan** log URL proxy berkredensial, header auth, atau hasil decrypt;
- export metadata akun tidak menyertakan kredensial.

Ini satu-satunya secret yang dimiliki produk ini.

### 12.6 DNS leak `[BELUM DIUJI]`

Dengan SOCKS5, Chrome dapat me-resolve DNS secara lokal sehingga IP asli bocor meskipun trafik HTTP
lewat proxy. Sinyal dari ekosistem: fork `ToRaNek/donutbrowser-fixed` mendaftarkan "SOCKS4 DNS"
sebagai bug yang diperbaiki, dan donutbrowser menyediakan per-profile DNS blocking.

Wajib ditangani eksplisit dan diuji, bukan diasumsikan beres. → Fase 6.

### 12.7 Urutan implementasi — schema Fase 1, fitur Fase 6

Proxy memiliki jarak panjang antara **schema** dan **fitur**. Schema dibuat lebih dulu karena
migration hanya maju (§9.2) dan menambah kolom saat puluhan akun sudah hidup jauh lebih mahal. Tetapi
tidak ada bagian proxy yang boleh **berfungsi** sebelum relay Fase 6 lulus.

| Fase | Yang ada                                                       | Yang belum                                          |
| ---- | -------------------------------------------------------------- | --------------------------------------------------- |
| 1    | Tabel `proxies`, `accounts.proxy_id`, storage contract (§12.5) | Relay, assignment, test connection, launch berproxy |
| 2–5  | Sama seperti Fase 1                                            | Sama seperti Fase 1                                 |
| 3    | Launch **direct saja**                                         | `--proxy-server` belum pernah muncul di argumen     |
| 6    | Relay, assignment, test connection, launch berproxy            | —                                                   |

**Aturan keras sebelum Fase 6 PASS:**

1. **`--proxy-server` tidak boleh muncul di argumen launch.** Bukan dinonaktifkan lewat konfigurasi —
   memang belum diimplementasikan (§10.2).
2. **UI proxy disabled, bukan disembunyikan.** Proxy manager dan kolom assignment tampil dalam
   keadaan disabled dengan penjelasan "tersedia setelah relay proxy selesai (Fase 6)". Menyembunyikan
   fitur membuat user tidak tahu bahwa metadata proxy tidak berpengaruh.
3. **IPC proxy yang belum siap mengembalikan error eksplisit.** `upsertProxy`, `testProxy`, dan
   assignment mengembalikan `PROXY_NOT_AVAILABLE` — bukan sukses palsu, bukan no-op diam.
4. **Akun dengan `proxy_id` tidak boleh diluncurkan.** Launch **diblokir** dengan pesan yang menyebut
   alasannya dan menawarkan dua pilihan: hapus proxy assignment untuk memakai koneksi direct secara
   sadar, atau tunggu Fase 6. Ini bentuk paling awal dari **no-direct-fallback** (§12.4) — bukan
   pengecualian terhadapnya.

> **Kenapa diblokir, bukan diluncurkan direct:** meluncurkan akun berproxy tanpa proxy adalah
> definisi silent direct fallback. User memasang proxy karena punya alasan; mengabaikannya diam-diam
> mengirim trafik lewat jalur yang tidak diinginkan. Memblokir dengan pesan jelas selalu lebih baik
> daripada bocor tanpa sepengetahuan user, dan aturan ini berlaku sejak Fase 1 — bukan hanya setelah
> relay ada.

**Setelah Fase 6 PASS**, kontrak berubah menjadi: akun berproxy hanya diluncurkan jika relay untuk
akun itu benar-benar hidup dan siap. Relay gagal start = launch diblokir, bukan direct.

**Konsistensi yang harus dijaga di dokumen ini:** §2 (tabel keputusan), §10.2 (argumen launch), §17
(IPC), §18.2 dan §18.5 (UI), Fase 1/3/6 (§20), serta §21.1 no. 24–27 semuanya harus menyatakan hal
yang sama. Bila salah satu berubah, ubah semuanya.

---

## 13. Runtime Management

### 13.1 Hindari abstraksi prematur

Versi pertama hanya memiliki satu runtime nyata: Chrome for Testing. Jangan membuat interface dengan
tiga implementasi kosong.

Module konkret per tanggung jawab:

```text
chromeForTestingCatalog
chromeForTestingDownload
browserRuntimeSeed
browserRuntimeInstall
browserRuntimeLaunch
```

Deliberate simplification:

```text
ponytail: one concrete CfT provider; add provider interface when second verified runtime exists.
```

### 13.2 Source versi dan runtime-lock

Build installer dan runtime updater memakai endpoint JSON resmi CfT untuk Stable channel. Build
menghasilkan `runtime-lock.json` immutable yang menyimpan version, download URL, platform, artifact
name, archive size, SHA-256 hasil build acquisition, signing/Authenticode metadata yang benar-benar
dapat diverifikasi, waktu acquisition/validation, dan source metadata untuk audit lokal.

Installer production gagal dibangun jika seed archive tidak tersedia, tidak cocok lock, tidak lolos
bounded extraction test, atau executable validation gagal. Seed tidak diambil dari browser sistem dan
tidak diunduh oleh installer pada PC user.

Jadwal update: check saat launcher mulai bila check terakhir >24 jam; tidak menghalangi UI selama
runtime aman tersedia; tombol manual "Check for updates"; backoff pada kegagalan;
`degraded`/`unavailable` tidak memicu perpindahan provider.

### 13.3 Integrity — batasnya eksplisit `[TERVERIFIKASI]`

Struktur nyata setiap entry download di catalog CfT hanya dua field:

```json
{ "platform": "win64", "url": "https://storage.googleapis.com/.../chrome-win64.zip" }
```

**Tidak ada** `sha256`, `md5`, `checksum`, atau `digest`. Stable saat dokumen ini ditulis:
`151.0.7922.71`, revision 1654411.

Yang tersedia hanya response header GCS:

```
x-goog-hash: crc32c=K8RF7g==
x-goog-hash: md5=0DXp8lsMfLxR+kYA0/Wwlg==
```

Itu **integritas transfer**, bukan authenticity rantai pasok. SHA-256 yang dihitung dari file
download berfungsi sebagai **cache identity dan deteksi korupsi**, bukan bukti asal. Plan tidak boleh
mengklaim supply-chain verification sampai sumber checksum/signature resmi terverifikasi.

Anchor kepercayaan yang sebenarnya: HTTPS ke bucket milik Google + verifikasi Authenticode pada
`chrome.exe` hasil ekstrak. `[BELUM DIUJI]` keandalan chain-nya → Fase 0A.

**Pipeline update (setelah instalasi):**

1. fetch catalog hanya lewat HTTPS dan host allowlist;
2. pilih artifact `win64` Stable;
3. download ke filename temporary dalam `updates/downloads/`;
4. batasi ukuran maksimum dan minimum archive;
5. hitung SHA-256 archive untuk audit/cache identity;
6. verifikasi checksum/signature hanya bila sumber kepercayaan resmi independen tersedia;
7. extract ke staging baru;
8. validasi path archive agar tidak terjadi zip-slip;
9. validasi file wajib dan executable;
10. verifikasi Authenticode bila chain terbukti dapat diandalkan;
11. smoke launch dengan **temporary profile**;
12. pindahkan staging menjadi `runtime/versions/<version>`;
13. tandai `ready` dalam transaction.

**Extractor.** Node/Electron tidak menyediakan ZIP container extractor generik sebagai kontrak
aplikasi. Fase 0B wajib memilih satu mekanisme dan membuktikan packaging-nya: dependency pure-JS yang
direview lalu dibundle ke capability output, atau exact production dependency yang disertakan staging
secara eksplisit.

Runtime **tidak boleh** menjalankan `npx`, PowerShell-generated extraction script, atau tool
arbitrary dari PATH. Extractor wajib memiliki limit total uncompressed bytes, entry count, path
depth, compression ratio, duplicate destination, symlink/reparse entry, dan zip-slip tests.

> `npx @puppeteer/browsers` sebagai perintah runtime **tidak valid** — packaged app tidak membawa
> Node/npx. Bila dipakai, harus sebagai library yang ikut ter-bundle (§4.2, dan gap `dependencies`
> di §7.1).

### 13.4 Atomic activation

Jangan memakai symlink `current` sebagai source of truth. SQLite menyimpan `active_version` dan
`pending_version`.

1. runtime baru sudah `ready` dan lulus temporary-profile smoke check **tanpa account profile**;
2. satu global activation mutex membaca `runtime_state.generation`;
3. transaction compare-and-swap menetapkan `pending_version`;
4. isolated activation probe dijalankan kembali dari final versioned folder;
5. transaction dengan generation yang sama mengubah pending menjadi active;
6. runtime sebelumnya berubah menjadi `retained`;
7. process browser lama tetap berjalan dari folder lamanya;
8. tidak ada overwrite file runtime aktif;
9. account launch hanya membaca active version setelah activation transaction selesai.

**Account profile tidak pernah dipakai sebagai canary aktivasi.** Sebelum spawn account, launcher
menaikkan `profile_runtime_floor` secara konservatif, menulis runtime history `requested`, lalu baru
menyentuh profile.

Dua account berbeda boleh launch bersamaan setelah active version final, tetapi tidak boleh ada
aktivasi global paralel.

Jika pending runtime gagal sebelum aktivasi penuh: catat `failed` + alasan, pertahankan active lama,
tampilkan warning, **jangan menyentuh account profile**.

### 13.5 Rollback

Rollback hanya memilih runtime retained yang masih ada. Batas keras:

- jangan membuka profile dengan runtime di bawah `profile_runtime_floor`;
- fallback aman memakai temporary probe profile, bukan account profile;
- rollback global tidak menurunkan profile yang sudah disentuh versi lebih baru;
- account yang membutuhkan runtime lebih baru tetap **diblokir** sampai runtime aman tersedia lagi;
- acknowledgement user tidak menghapus downgrade safety rule;
- database rollback tidak berarti profile format rollback.

> **Kenapa floor, bukan `last_launched_runtime` saja:** satu nilai "terakhir dipakai" tidak
> menangkap seluruh race dan update case — profile dapat disentuh versi lebih baru dalam operasi yang
> gagal di tengah, atau oleh proses yang masih hidup dari versi sebelumnya. Floor bergerak satu arah
> dan menjadi invariant yang dapat diperiksa; `last_runtime_version` + `account_runtime_history`
> melengkapinya untuk audit.
>
> Konteks tambahan: Chrome menolak profile dari versi lebih baru ("Your profile can not be used
> because it is from a newer version of Google Chrome"). Flag `--allow-profile-downgrade` ada di
> Chromium, tetapi **tidak ditemukan dokumentasi otoritatif** soal dukungannya — jangan bangun fitur
> di atas asumsi itu. Dengan 20+ akun, satu kesalahan downgrade berdampak pada banyak profil.

### 13.6 Cleanup runtime — nonaktif pada v1

Default simpan: active runtime, pending runtime bila ada, dan **seluruh retained runtime** yang masih
mungkin dipakai process/profile sampai ownership dapat dibuktikan.

**Automatic runtime deletion DISABLED pada v1.** Folder hanya menjadi cleanup candidate ketika:

- folder bukan active/pending;
- process reconciliation membuktikan tidak ada process memakai executable itu; status `unknown`
  dianggap **masih digunakan**;
- tidak ada account yang `profile_runtime_floor`-nya membutuhkan runtime itu sebagai recovery floor;
- retention minimum terlewati;
- path tervalidasi berada di `runtime/versions/`;
- user sudah menutup seluruh managed browser bila reconciliation belum tersedia.

Deletion baru boleh diaktifkan setelah Fase 7 lulus. Delete failure atau file lock hanya dicatat;
jangan melakukan partial recursive cleanup lalu menganggap folder hilang.

> **Kenapa nonaktif:** §16.1 menyatakan status proses tidak dapat dibuktikan pada v1. Menghapus
> runtime memerlukan bukti bahwa tidak ada proses yang memakainya — bukti yang belum ada. Menyimpan
> beberapa folder runtime jauh lebih murah daripada menghapus binary yang sedang dipakai 5 browser
> aktif. Trade-off disk didokumentasikan di §5.4.

---

## 14. Runtime Fallback

Tidak ada switch ke browser sistem setelah endpoint CfT gagal. Kegagalan catalog tidak berarti
installed runtime rusak — dan karena installer membawa seed (§7.1), first run tetap berhasil offline.

Urutan respons:

1. terus gunakan active runtime jika masih memenuhi security policy;
2. retry dengan backoff;
3. tampilkan health `degraded` atau `unavailable`;
4. izinkan user melakukan retry/diagnosis;
5. blokir update atau launch sesuai security-age policy, bukan mengganti provider.

Kandidat investigasi, bukan kontrak:

| Kandidat                         | Status        | Catatan                                                                                                                                                     |
| -------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Puppeteer browser download layer | Evaluasi      | Masih memakai CfT di belakang layar; fallback API/tooling, bukan binary independen. Harus sebagai library, bukan CLI (§13.3)                                |
| Ungoogled Chromium               | Riset saja    | Trusted build, update cadence, signing, extension, redistribution belum terbukti. Membuang Google API key — berlawanan dengan kebutuhan login Google (§1.2) |
| Chromium snapshot                | Tidak dipilih | Bukan stable release channel                                                                                                                                |
| Playwright Chromium              | **Dilarang**  | Sign-in Google gagal via CDP; lifecycle bertabrakan; pre-release (§4.2)                                                                                     |
| Build Chromium sendiri           | Non-goal      | Biaya build, signing, update infra terlalu besar                                                                                                            |
| Microsoft Edge / system Chrome   | **Dilarang**  | Melanggar hard invariant §1.1                                                                                                                               |
| Fork anti-fingerprint            | **Dilarang**  | Berisiko memicu security check Google (§3)                                                                                                                  |

Klaim bahwa semua browser berbasis Chromium dapat memakai profile yang sama **tidak** dijadikan
kontrak. History/bookmark mungkin serupa, tetapi cookie encryption, feature flags, extensions, schema
migrations, dan downgrade behavior dapat berbeda.

Jika runtime kedua disetujui: buat provider interface berdasarkan dua implementasi nyata; runtime
kedua juga wajib dibundle/dikelola aplikasi; gunakan profile baru secara default; migrasi profile
existing memerlukan backup dan compatibility test; runtime switch tidak pernah otomatis karena health
endpoint gagal.

---

## 15. Security Policy Runtime

Sebelum launch produksi, tetapkan policy terukur:

- maksimum umur runtime sejak Stable security release;
- kapan launch diberi warning;
- kapan launch diblokir;
- emergency update procedure;
- catalog outage procedure;
- revocation untuk runtime yang diketahui rentan;
- audit log update tanpa data browsing.

**OPEN:** nilai hari untuk warning/block. Jangan mengarang angka sebelum kebutuhan operasional dan
kemampuan update dibuktikan.

Relevansinya tinggi meski target awal pribadi: CfT tidak auto-update, dan di sini tersimpan 20+ sesi
login aktif (§4.1).

---

## 16. Monitoring Proses dan Concurrency

### 16.1 Batas observasi

PID hasil `spawn()` bukan source of truth penuh karena Chromium dapat membuat banyak child process,
meneruskan request ke process profile yang sudah hidup, keluar dari initial process setelah handoff,
ditutup langsung oleh user, atau crash di luar launcher. `process.kill(pid, 0)` juga rentan PID
reuse.

Versi pertama **tidak menjanjikan status real-time**. UI memakai status:

```
Never launched · Last launched <time> · Launch requested · Launch failed
```

**Hindari badge `Running`** sebelum mekanisme observasi tervalidasi.

Selama observasi belum kuat, archive/reset/purge profile **ditolak** setelah launcher restart bila
penggunaan profile tidak dapat dibuktikan. `Unknown` bukan sinonim `stopped`.

Untuk tracking dasar dalam satu sesi: dengarkan event `error`/`exit` dari initial child, bukan
polling berkala.

### 16.2 Process tracking fase berikutnya

Jika status running menjadi kebutuhan nyata: catat initial PID, runtime version, profile UUID, dan
launch time di memory; cocokkan process executable path dan command line/profile path melalui API
teruji pada Windows; jangan kill berdasarkan `chrome.exe` saja; setelah launcher restart lakukan
reconciliation; proses yang hilang ditandai stopped/crashed tanpa mengubah profile; crash berulang
menghasilkan warning, bukan reset otomatis.

Close/terminate dari launcher hanya boleh menargetkan instance account yang teridentifikasi kuat.
Graceful close didahulukan; force kill butuh konfirmasi karena dapat merusak profile.

### 16.3 Multi-account concurrency

Setiap account memiliki profile directory berbeda, sehingga beberapa akun dapat berjalan bersamaan.

- **`app.requestSingleInstanceLock()` wajib** — mencegah dua instance launcher menulis
  `launcher.sqlite`, `updates/staging/`, dan operation journal secara bersamaan. Tanpa ini, mutex
  per-account tidak bermakna lintas proses;
- akun yang sama tidak diluncurkan paralel oleh dua operasi launcher (per-account in-memory mutex);
- runtime update boleh berjalan saat browser aktif karena install memakai versioned folder;
- satu global activation mutex + database generation CAS melindungi transisi pending/active;
- activation runtime baru hanya memengaruhi launch setelah transaction selesai;
- database write memakai transaction;
- reset/delete account ditolak bila launch/reset/delete account yang sama sedang berlangsung.

Tidak ada global lock untuk account launch biasa. Global lock hanya dimiliki runtime activation dan
migration.

### 16.4 Deteksi runtime hilang

Saat startup, verifikasi runtime aktif masih ada dan executable (user menghapus folder manual, AV
mengarantina `chrome.exe`). Bila hilang: tawarkan re-install dari seed atau update, tampilkan
diagnosis, jangan crash, jangan mengunduh diam-diam.

---

## 17. IPC dan Security Boundary

Renderer tidak mendapat akses Node.js (`sandbox: true`, `contextIsolation: true`,
`nodeIntegration: false` — `electron/main/index.ts:49-54` `[TERVERIFIKASI]`).

```ts
interface ManagedBrowserApi {
  listAccounts(): Promise<AccountSummary[]>;
  createAccount(input: CreateAccountInput): Promise<AccountSummary>;
  updateAccount(id: string, input: UpdateAccountInput): Promise<AccountSummary>;
  launchAccount(id: string): Promise<LaunchResult>;
  archiveAccount(id: string): Promise<ProfileOperationResult>;
  unarchiveAccount(id: string): Promise<ProfileOperationResult>;
  resetProfile(id: string): Promise<ProfileOperationResult>;
  clearProfileCache(id: string): Promise<ProfileOperationResult>;
  listRecoveryItems(): Promise<RecoveryItem[]>;
  restoreRecoveryItem(id: string): Promise<ProfileOperationResult>;
  purgeRecoveryItem(id: string): Promise<ProfileOperationResult>;
  // Proxy — hanya terdaftar bila proxy capability aktif (§12.7).
  // Sebelum Fase 6 PASS, handler ini TIDAK didaftarkan sama sekali.
  listProxies(): Promise<ProxySummary[]>;
  upsertProxy(input: ProxyInput): Promise<ProxySummary>;
  deleteProxy(id: string): Promise<void>;
  testProxy(id: string): Promise<ProxyTestResult>;
  getProxyFeatureState(): Promise<ProxyFeatureState>; // selalu tersedia; UI membaca ini
  getRuntimeStatus(): Promise<RuntimeStatus>;
  checkRuntimeUpdate(): Promise<RuntimeStatus>;
  installRuntimeUpdate(): Promise<RuntimeOperation>;
  getRuntimeOperation(id: string): Promise<RuntimeOperation>;
  cancelRuntimeOperation(id: string): Promise<RuntimeOperation>;
  onRuntimeOperationProgress(listener: (event: RuntimeOperationProgress) => void): () => void;
  selectManagedRoot(): Promise<ManagedRootResult>;
}
```

`ProxySummary` tidak pernah memuat password atau ciphertext.

`getProxyFeatureState()` selalu tersedia dan mengembalikan `'unavailable' | 'available'`. Sebelum
Fase 6 PASS nilainya `'unavailable'`, handler proxy lain **tidak didaftarkan**, dan pemanggilannya
menghasilkan `PROXY_NOT_AVAILABLE` — bukan sukses palsu (§12.7). UI membaca state ini untuk
men-disable kontrol proxy, bukan menyembunyikannya.

`launchAccount()` mengembalikan `LaunchResult` yang dapat berstatus **blocked** dengan alasan
bertipe, termasuk `PROXY_NOT_AVAILABLE` (akun punya `proxy_id` tetapi relay belum ada, §12.7),
`RUNTIME_BELOW_FLOOR` (§13.5), `RUNTIME_MISSING` (§16.4), dan `EXTENSION_MISSING` (§11.5). Blocked
bukan error tak terduga — itu hasil yang sah dan harus ditampilkan dengan jalan keluar.

Main process rules:

- validasi semua payload sebagai `unknown`;
- UUID, path, URL, panjang string, dan state transition diperiksa ulang;
- renderer mengirim **account ID**, bukan executable/profile path;
- hanya HTTPS start URL pada versi awal;
- semua operasi file dibatasi managed root dengan real-path containment (§8.3);
- account browsing selalu memakai managed runtime; `shell.openExternal()` dan default browser sistem
  tidak dipakai capability ini;
- navigation dan new-window Electron ditolak kecuali route internal renderer yang diizinkan;
- **CSP renderer diterapkan**;
- setiap handler memvalidasi capability, app ID, `event.senderFrame`, exact dev origin, dan exact
  packaged renderer location;
- **destructive IPC memeriksa account state lalu main process menampilkan native confirmation**;
  renderer-generated token bukan security boundary;
- progress bridge mengekspos payload terpilih dan unsubscribe function, bukan raw `ipcRenderer.on`;
- satu file TypeScript contract menjadi source of truth main, preload, dan renderer adapter;
- dev mode menerima capability tervalidasi hanya dari `desktop.mjs`; packaged mode membaca staged
  metadata tervalidasi;
- log tidak memuat kredensial proxy, URL query sensitif, cookie, token, atau raw browser output yang
  mengandung secrets.

> **Kenapa guardrail tetap penuh meski satu PC (§7.2):** capability ini menjalankan executable,
> membuka profile berisi 20+ sesi login aktif, mengakses database, melakukan recursive filesystem
> operation, dan memegang kredensial proxy. Risiko berasal dari kekuatan operasinya. Native
> confirmation juga berfungsi sebagai pengaman terhadap bug aplikasi sendiri, bukan hanya terhadap
> penyerang.

---

## 18. UI

Ant Design 6 via antd MCP — aturan repo mewajibkan konsultasi MCP sebelum menyentuh file UI.

### 18.1 Table, bukan card grid

Untuk 20–50 akun, card grid tidak dapat di-scan. Gunakan `Table`:

| Kolom                | Catatan                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Warna + display name | identifikasi cepat                                                                                       |
| Email                | label (§10.1)                                                                                            |
| Proxy                | label proxy, atau "direct". Sebelum Fase 6: badge "proxy belum aktif" bila akun punya `proxy_id` (§12.7) |
| Status profile       | `uninitialized` / `launching` / `initialized` dari §10.3                                                 |
| Terakhir dibuka      | sortable                                                                                                 |
| Ukuran profil        | alat kerja pada skala ini, bukan hiasan (§5)                                                             |
| Aksi                 | Open · menu: edit / reset / archive / bersihkan cache                                                    |

Plus search nama/email, sort, dan filter by proxy.

Tombol **Open** disabled dengan tooltip beralasan bila `launchAccount` akan blocked — akun berproxy
sebelum Fase 6, runtime di bawah floor, runtime/extension hilang (§17). Jangan biarkan user mengklik
lalu menerima error yang bisa diprediksi sebelumnya.

### 18.2 Layar minimum

1. **First-run storage setup** — pilih managed root (saran drive terbesar), tampilkan ruang kosong,
   jelaskan profile tidak portable, install dan smoke-test bundled seed runtime **dan extension**
   (§11.5) **tanpa network**.
2. **Account list** — Table di atas.
3. **Add account** — display name, email, start URL default Gmail, proxy opsional (disabled sebelum
   Fase 6).
4. **Proxy manager** — CRUD proxy, test connection, assign ke akun; tidak pernah menampilkan
   password tersimpan. **Disabled sebelum Fase 6** (§18.5).
5. **Runtime status** — installed/available version, last check, health, progress, warning bila
   outdated.
6. **Settings** — managed root, cache cap, daftar extension vendored yang aktif beserta versi dan ID
   (§11.2), toggle policy email (§10.1), retention recovery.

### 18.3 Peringatan RAM

Pada ≥5 akun aktif tampilkan `Alert` yang menyebut kapasitas nyata mesin (§5.3). **Tidak ada tombol
"Buka semua"**.

### 18.4 Toggle policy email

Settings menyediakan toggle satu-email-satu-profil (§10.1). Saat dimatikan, jelaskan bahwa duplikat
akan diizinkan dan tidak ada schema yang berubah. Saat dinyalakan sementara duplikat existing sudah
ada, tampilkan peringatan non-blocking yang menyebut akun mana — jangan menolak menyalakan policy dan
jangan mengubah data lama.

### 18.5 Proxy disabled sebelum Fase 6

Kontrol proxy **tampil dalam keadaan disabled**, bukan disembunyikan (§12.7). UI membaca
`getProxyFeatureState()` dan menampilkan penjelasan singkat: "Proxy per akun tersedia setelah relay
proxy selesai." Menyembunyikannya membuat user tidak tahu bahwa metadata proxy belum berpengaruh.

Bila akun sudah memiliki `proxy_id` sebelum Fase 6, tombol Open **disabled** dengan tooltip yang
menyebut dua jalan keluar: hapus assignment untuk memakai direct secara sadar, atau tunggu Fase 6.
Jangan pernah meluncurkannya direct secara diam-diam.

### 18.6 Struktur dan QA

Parent `App.tsx` hanya menyusun provider dan Gate. Gate menghubungkan engine/render state ke
komponen. Logic visual ditempatkan pada child terkecil sesuai `PLAYBOOK.md`.

UI PC-only dan fluid mengikuti lebar display. Release QA memakai 1280, 1366/1440, 1920, dan 2560 px
serta continuous resize sweep. Mobile/tablet breakpoint bukan release gate. Keyboard order, visible
focus, modal focus return, no horizontal page overflow, dan zoom 100–200% tetap diverifikasi.

Copy produk memakai istilah **"managed browser dengan profile terisolasi"**, bukan menjanjikan
anonymous/private browsing. Produk tidak menyediakan VPN, network anonymity, anti-fingerprinting,
atau perlindungan terhadap user Windows yang sama. Proxy adalah **routing egress**, bukan anonimitas.

---

## 19. Backup dan Recovery

Versi awal menyediakan local safety recovery, bukan portable profile backup.

Cakupan: backup `launcher.sqlite` sebelum migration; rename-to-recovery sebelum reset/delete profile;
export metadata akun tanpa secrets; dokumentasi manual copy saat semua browser dan launcher
benar-benar tertutup.

Tidak dijanjikan: restore session/password pada PC lain; backup konsisten ketika Chrome masih menulis
profile; cloud sync profile; merge dua profile; migrasi profile antar-runtime.

Backup profile penuh masuk fase lanjutan setelah strategi lock/snapshot, storage size, DPAPI
disclosure, dan restore test disetujui.

---

## 20. Fase Implementasi

Setiap fase adalah checkpoint mandiri. Fase berikutnya hanya boleh dimulai setelah validation dan
exit criteria fase aktif lulus. Jika fallback yang tertulis tidak dapat mempertahankan hard
invariant, fase berstatus **BLOCKED**; implementor tidak boleh mengganti runtime dengan browser
sistem atau memperluas scope diam-diam.

### Fase 0A — Manual viability, tanpa production code

Gate paling menentukan. Tidak menulis kode produksi; hanya menjalankan binary dan mengamati.
Perkiraan setengah hari.

- [ ] **Login Google di CfT polos** — unduh CfT Stable, jalankan `chrome.exe --user-data-dir=<temp>`,
      sign-in Gmail, tutup, buka lagi, sesi bertahan? ← **jika gagal, arsitektur kembali ke Fase 0**
- [ ] Login GitHub — idem
- [ ] Ulangi login Google **melalui egress berbeda** — lihat batasan di bawah
- [ ] Vendor Tampermonkey + `--load-extension` → userscript berjalan? developer mode diperlukan?
      (§11.3b)
- [ ] Buka CfT **tanpa argumen URL** → tab non-pinned dan pinned tab kembali? (§10.4)
- [ ] **Tentukan bukti objektif profile initialization** — file/direktori minimum apa yang benar-benar
      dibuat CfT, dan berapa readiness window yang realistis (§10.3)
- [ ] **Validasi cache cap terhadap CfT** — ukur profil setelah pemakaian dengan/tanpa
      `--disk-cache-size`; konfirmasi 250 MB layak jadi default (§5.2)
- [ ] Ukur ukuran CfT terekstrak untuk budget disk (§5.4)
- [ ] Cek Authenticode `chrome.exe` — chain dapat diandalkan? (§13.3)
- [ ] Verifikasi ulang klaim eksternal `[TERVERIFIKASI]` yang berumur (CfT catalog shape, versi
      Stable, MV3 `webRequestBlocking`, crbug proxy credentials)

#### Batasan tes proxy pada fase ini

Production relay **belum ada** dan tidak boleh dibuat di sini (§12.7). Tes ini hanya menjawab satu
pertanyaan: **apakah login Google dan GitHub tetap berhasil ketika trafik keluar dari IP yang berbeda?**

Aturan:

- pakai **disposable manual relay** atau proxy **non-auth** yang Anda kendalikan — konfigurasi manual
  di luar aplikasi, bukan kode di dalam repo;
- **kredensial tidak boleh masuk command line atau log**. Karena `--proxy-server` memang tidak
  menerima kredensial (§12.1), pakai proxy non-auth agar tidak ada kredensial sama sekali dalam tes
  ini;
- hasilnya **hanya** membuktikan perilaku login/session melalui egress berbeda. Tes ini **tidak**
  memvalidasi relay design, tidak memvalidasi penanganan kredensial, dan **tidak** menguji DNS leak;
- DNS leak (§12.6), authenticated relay, dan no-direct-fallback tetap sepenuhnya milik Fase 6;
- **kode disposable dari fase ini tidak boleh menjadi fondasi production.** Bila sesuatu ditulis
  untuk menjalankan tes, tandai sebagai throwaway dan jangan salin ke `capabilities/`. Relay
  production ditulis dari nol di Fase 6 mengikuti §12.3.

**Success criteria:** login Google dan GitHub berhasil dan persisten, baik direct maupun melalui
egress berbeda. Item lain boleh kuning dengan mitigasi tercatat.

**Fallback/BLOCKED:** jika login Google gagal pada CfT polos, hentikan. Browser sistem bukan
fallback (§1.1); runtime alternatif harus melewati §14 dan tetap dibundel. Jika login gagal **hanya**
melalui egress berbeda, catat sebagai risiko produk untuk Fase 6 — jangan blokir Fase 1–5, karena
launch berproxy memang belum ada sampai Fase 6 (§12.7).

### Fase 0B — Technical spike, disposable

Kode boleh ditulis, tetapi **disposable** dan tidak menjadi fondasi produksi.

- [ ] Spike `node:sqlite` pada Electron 43 **packaged build**, bukan hanya dev (§9)
- [ ] Pilih dan buktikan extractor ZIP: zip-slip, archive bomb, file-count, size, path-depth,
      timeout (§13.3)
- [ ] Buktikan `desktop.mjs` dapat men-stage `extraResources` secara deterministic untuk **seed
      runtime dan extension** — saat ini **belum ada** (§7.1, §11.5)
- [ ] Buat `runtime-lock.json` dari seed resmi
- [ ] Buat `extension-lock.json` dan tentukan status licensing/redistribution Tampermonkey (§11.5)
- [ ] Buktikan installer dapat dipasang pada Windows user/VM bersih **dengan network dinonaktifkan**
      dan memiliki seluruh file untuk first run
- [ ] Verifikasi lisensi, redistribution, dan kebutuhan code signing untuk target pribadi maupun
      publik
- [ ] Perbarui `PLAYBOOK.md` dengan kontrak capability generik **sebelum** mengubah host Electron
      bersama (§6)
- [ ] Tetapkan managed-root marker, ownership/adoption, real-path, dan reparse-point rules
- [ ] Tetapkan extension acceptance matrix, recovery retention, dan security-age policy

**Success criteria:** packaged spike membaca/menulis SQLite; extractor, seed runtime, dan seed
extension tervalidasi; installer offline berisi keduanya sesuai lock; `PLAYBOOK.md` sudah memuat
kontrak capability.

**Fallback/BLOCKED:** boleh mengganti extractor atau format staging selama kontrak keamanan sama.
Jika CfT tidak legal/praktis dibundel, `node:sqlite` gagal pada packaged Electron, atau seed tidak
dapat diverifikasi — hentikan dan revisi arsitektur. Jika **extension** tidak boleh diredistribusi,
Fase 1–5 tetap jalan tanpa extension bundled; `--load-extension` dihilangkan dari argumen launch dan
Tampermonkey menjadi keputusan OPEN, bukan blocker seluruh produk.

### Fase 1 — App shell, capability skeleton, storage

- [ ] Buat `apps/browser-launcher/` mengikuti discovery app dan ownership di `AGENTS.md`
- [ ] Ikuti inherited `apps/AGENTS.md`; mulai package dari `0.1.0`; jangan membuat version bump, changelog entry, atau tag manual
- [ ] **Alokasikan stable port melalui discovery/Refresh**, bukan edit manual
      `app-ports.lock.json` (§6.2)
- [ ] Ant Design 6, shared theme contract, parent/children naming, dependency boundaries
- [ ] Aktifkan desktop melalui manifest/thin scripts tanpa arbitrary executable/build hook
- [ ] Tambahkan allowlisted `managed-browser` capability ke host/preload generik + architecture
      import tests
- [ ] First-run managed-root setup: marker ownership/adoption, containment, real-path, reparse-point
- [ ] Migration SQLite lengkap sesuai §9.1 — termasuk tabel `proxies` dan kolom state machine
      `profile_state`/`init_*`; **tanpa unique index untuk email** (§10.1)
- [ ] Account CRUD berbasis UUID, runtime metadata, operation journal, transaction tests
- [ ] **Storage contract proxy saja** — tabel + `accounts.proxy_id` + kontrak ciphertext (§12.5).
      **Tanpa** relay, assignment aktif, test connection, atau launch berproxy (§12.7)
- [ ] `getProxyFeatureState()` mengembalikan `'unavailable'`; handler proxy lain tidak didaftarkan
- [ ] Tegakkan policy email §10.1 **transaction-safe** di main process, termasuk toggle policy dan
      **jalur konflik create/update/unarchive**
- [ ] `app.requestSingleInstanceLock()`

**Success criteria:** dev dan packaged app dapat membuat/list/edit/archive/unarchive metadata;
capability skeleton tervalidasi; belum ada browser runtime dijalankan; UI proxy tampil **disabled**
dengan alasan; tests membuktikan path containment, marker ownership, migration, transaction rollback,
**concurrent create/update email**, **unarchive conflict**, dan **policy toggle tanpa migration**
(§10.1).

**Fallback/BLOCKED:** migration boleh disederhanakan hanya jika schema tetap forward-migratable.
Kegagalan marker/path safety atau packaged SQLite membuat fase **BLOCKED**; jangan menyimpan database
di renderer/localStorage. Jangan menambahkan unique index email sebagai jalan pintas penegakan policy.

### Fase 2 — Offline seed installation

- [ ] Install/copy/extract seed runtime dari `extraResources`; first run **tanpa network fetch**
- [ ] **Install extension vendored dari `extraResources`** sesuai `extension-lock.json` (§11.5);
      validasi hash, ukuran, dan `extension_id`
- [ ] Bounded safe extraction dan integrity/authenticity checks dari Fase 0B — dipakai untuk runtime
      **dan** extension
- [ ] Staging directory, fsync/close yang diperlukan, atomic rename, versioned runtime directory
- [ ] Isolated temporary-profile smoke probe; **jangan** memakai profile akun sebagai canary
- [ ] Commit runtime install via journal + SQLite state transition + generation CAS
- [ ] Operation ID, progress, cancel, recovery status, cleanup staging idempotent
- [ ] Deteksi runtime **dan extension** hilang/rusak saat startup (§16.4, §11.5)
- [ ] Uji seed hilang, lock mismatch, archive corrupt, traversal, archive bomb, cancel, crash, retry
      offline — untuk runtime dan extension

**Success criteria:** fresh packaged install dengan network mati dapat memasang runtime dan extension
valid, lalu smoke-launch managed runtime tanpa membuat profile akun; kegagalan tidak menghasilkan
runtime atau extension setengah aktif.

**Fallback/BLOCKED:** user boleh retry atau memilih managed root baru. Jika bundled seed
invalid/hilang, tampilkan recovery diagnosis dan blokir launch; jangan mengunduh diam-diam dan jangan
membuka browser sistem. Jika extension tidak disetujui untuk diredistribusi (§11.5),
`--load-extension` dihilangkan dan fase tetap dapat lulus tanpa extension.

### Fase 3 — Account launch direct, profile floor, dan first-launch state

**Fase ini meluncurkan akun secara direct saja.** `--proxy-server` belum ada di argumen mana pun
(§12.7).

- [ ] Typed IPC/preload capability dengan exact sender/app/capability validation
- [ ] Validasi executable, runtime generation, profile containment, URL HTTPS, operation ownership di
      main process
- [ ] Launch satu `user-data-dir` UUID per account melalui managed runtime aktif
- [ ] Flag §10.2 termasuk `--disk-cache-size` dan `--load-extension`; **tanpa `--proxy-server`**
- [ ] **Implementasikan state machine first launch** §10.3: `uninitialized`/`launching`/`initialized`,
      bukti objektif, readiness window, `init_operation_id` + `init_generation` guard
- [ ] Start URL hanya bila `profile_state != 'initialized'`
- [ ] Startup reconciliation menurunkan `launching` yang tertinggal ke `uninitialized`
- [ ] **Blokir launch untuk akun yang punya `proxy_id`** dengan pesan dan dua jalan keluar (§12.7) —
      jangan pernah meluncurkannya direct diam-diam
- [ ] Per-account launch mutex tanpa mengunci launch akun lain
- [ ] Naikkan `profile_runtime_floor` durable **sebelum** spawn; runtime di bawah floor tidak boleh
      membuka profile
- [ ] Simpan `last_launched_at`, runtime version, audit event, launch error tanpa data sensitif
- [ ] Uji dua akun bersamaan, popup failure, launcher close, session persistence, bookmark + pinned
      tab per profil
- [ ] Uji seluruh test requirement §10.3: spawn failure, crash sebelum/sesudah initialized, retry,
      overlap, stale write, launcher restart, singleton-lock exit

**Success criteria:** user dapat login manual pada akun direct; dua profile independen berjalan
bersamaan; session, bookmark, dan pinned tab bertahan; start URL tidak pernah hilang karena spawn
yang gagal; downgrade di bawah floor diblokir; akun berproxy **diblokir dengan pesan**, bukan
diluncurkan direct; packaged app tidak memerlukan repo/port 1999.

**Fallback/BLOCKED:** kegagalan launch kembali ke UI diagnosis/retry dan tidak mengubah active
runtime. Jangan memakai `shell.openExternal`, default browser, atau profile sistem. Jangan menandai
`initialized` tanpa bukti objektif §10.3.

### Fase 4 — Online updater dan atomic activation

Updater adalah critical path keamanan (§4.1). **Selesaikan sebelum memindahkan banyak akun nyata ke
app ini.**

- [ ] Fetch catalog Stable maksimum sekali per 24 jam dengan retry/backoff yang dapat dibatalkan
- [ ] Download ke staging dengan progress, cancel, size/hash validation, operation journal
- [ ] Install versi baru berdampingan saat runtime lama dipakai; jangan overwrite active directory
- [ ] Isolated smoke probe, lalu aktivasi via global mutex + generation CAS
- [ ] Launch berikutnya memakai active baru; process lama tetap hidup pada binary lamanya
- [ ] Rollback hanya ke runtime yang memenuhi global policy dan seluruh profile floor terkait
- [ ] `[OPEN]` putuskan: implementasi download sendiri atau `@puppeteer/browsers` sebagai library
- [ ] Uji stale response, concurrent updater, cancel, catalog outage, corrupt download, interruption
      pada setiap state

**Success criteria:** update gagal atau overlap tidak merusak active runtime, database, profile,
maupun seed fallback; updater tidak pernah menguji runtime pada profile akun asli.

**Fallback/BLOCKED:** terus gunakan active runtime bila masih memenuhi security policy; jika tidak,
blokir launch dengan diagnosis. Retained-version cleanup otomatis tetap **nonaktif**.

### Fase 5 — Recovery dan hardening

- [ ] Archive/reset memakai durable `profile_operations` journal (`prepared`/`moved`/`committed`)
- [ ] Rekonsiliasi journal saat startup untuk crash di antara rename dan SQLite commit
- [ ] Native/main-owned destructive confirmation; renderer bukan authority
- [ ] Unarchive dengan resolusi konflik email eksplisit dan kedua opsi recovery berfungsi (§10.1)
- [ ] Reset profile menaikkan `init_generation` dan mengembalikan state ke `uninitialized` (§10.6)
- [ ] **Update extension versioned** dengan atomic activation; userscript bertahan; ID stabil (§11.5)
- [ ] DPAPI/non-portability disclosure dan backup database sebelum migration
- [ ] Runtime age warning/block/revocation policy dan audit log tanpa data browsing
- [ ] Uji extension acceptance matrix, IPC sender spoofing, recovery retention, packaged security
      smoke
- [ ] Buktikan installer update dan uninstall default tidak menghapus managed root

**Success criteria:** destructive operation recoverable selama retention; crash reconciliation
deterministic; security boundary dan disclosure lulus review.

**Fallback/BLOCKED:** jika journal ambigu, hentikan mutation dan tampilkan recovery workflow; jangan
melakukan recursive delete otomatis. Unknown runtime/process state selalu diperlakukan sebagai masih
dipakai.

### Fase 6 — Proxy per akun

Fase pertama yang membuat proxy **berfungsi**. Schema-nya sudah ada sejak Fase 1; relay, assignment,
test connection, dan `--proxy-server` semuanya baru di sini (§12.7).

- [ ] Relay lokal di `capabilities/managed-browser/children/proxyRelay.ts` — **ditulis dari nol**,
      bukan mengangkat kode disposable Fase 0A
- [ ] Port loopback per akun aktif; binding hanya `127.0.0.1`
- [ ] Kredensial: `safeStorage` encrypt → `password_ciphertext` BLOB + scheme version (§12.5)
- [ ] Tolak menyimpan kredensial bila `isEncryptionAvailable()` false; jangan fallback plaintext
- [ ] **Tutup `[OPEN]` §12.4**: tray-resident launcher atau detached sidecar
- [ ] Aktifkan `--proxy-server=127.0.0.1:<relay-port>` di argumen launch (§10.2)
- [ ] `getProxyFeatureState()` → `'available'`; daftarkan handler proxy; aktifkan UI (§18.5)
- [ ] **Larangan fallback direct** — akun berproxy hanya diluncurkan bila relay-nya hidup dan siap;
      relay gagal = launch **diblokir**, bukan direct
- [ ] **Uji DNS leak** untuk SOCKS5 (§12.6)
- [ ] Test connection di UI tanpa membocorkan kredensial ke log

**Success criteria:** akun berbeda egress lewat proxy berbeda tanpa dialog auth; tidak ada DNS leak;
tidak ada fallback direct diam-diam pada jalur mana pun; kredensial tidak pernah plaintext atau
muncul di command line; akun tanpa proxy tetap berperilaku seperti Fase 3.

**Fallback/BLOCKED:** jika relay tidak dapat menjamin no-direct-fallback, fitur proxy **ditahan** —
`getProxyFeatureState()` tetap `'unavailable'` dan akun berproxy tetap diblokir seperti Fase 1–5
(§12.7). Jangan rilis proxy yang bisa bocor tanpa sepengetahuan user.

### Fase 7 — Process reconciliation dan cleanup, hanya bila dibutuhkan

- [ ] Verifikasi kebutuhan product untuk status real-time, graceful close, kill, automatic cleanup
- [ ] Windows process reconciliation berdasarkan executable real path, profile path/launch token,
      instance ID, ownership marker; nama process saja tidak cukup
- [ ] Cocokkan surviving process setelah launcher restart; state yang tidak dapat dibuktikan =
      `unknown`
- [ ] Graceful close/kill hanya untuk process yang ownership-nya terbukti
- [ ] Aktifkan retained-runtime cleanup **hanya setelah** reconciliation membuktikan tidak ada
      process memakai versi tersebut
- [ ] Uji launcher crash/restart, banyak runtime hidup bersamaan, unknown process, PID reuse, cleanup
      interruption

**Success criteria:** UI `Running` dan destructive process action hanya muncul bila status/ownership
terbukti; runtime aktif, in-use, floor-required, seed recovery, dan unknown tidak pernah terhapus.

**Fallback/BLOCKED:** bila reconciliation tidak terpercaya, pertahankan v1 tanpa real-time status,
kill, dan automatic cleanup. Manual diagnosis boleh ditambahkan; unsafe heuristic tidak boleh
diaktifkan.

---

## 21. Verification Gate

Build gate repository (`PLAYBOOK.md:57-66`):

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npx --yes antd lint . --format json
```

Setelah app dibuat, tambahan lint terarah:

```bash
npx --yes antd lint apps/browser-launcher/src --format json
```

Desktop dev dan unpacked smoke gate:

```bash
npm run desktop:dev -- browser-launcher
npm run desktop:build -- browser-launcher --dir
```

Hanya ketika fase release sudah diterima, source sudah di-commit, dan working tree bersih, jalankan automatic release lalu installer final:

```bash
npm run release:check
npm run release:app -- browser-launcher --include-electron
npm run desktop:build -- browser-launcher
```

Jangan menentukan version, mengedit `CHANGELOG.md`, atau membuat tag dari plan ini. Packaging membaca version hasil automation dan tidak melakukan bump sendiri.

### 21.1 Checklist end-to-end

**Ekosistem mandiri**

1. Installer benar-benar membawa seed yang cocok `runtime-lock.json`.
2. Fresh Windows user/VM dengan network dinonaktifkan dapat install, memilih managed root, memasang
   seed, dan membuka managed runtime.
3. Packaged app berjalan ketika repo, Node/npm, Vite, port 1999, dan app suite lain tidak tersedia.
4. Tidak ada lookup executable/profile/extension browser melalui registry, PATH, `Program Files`,
   file association, atau default browser — meskipun Chrome dan Edge terpasang di mesin (§1.1).

**Runtime dan update**

5. Seed/archive corrupt, lock mismatch, traversal, archive bomb, dan extraction limit ditolak.
6. Cancel/crash saat install direkonsiliasi tanpa runtime setengah aktif.
7. Runtime baru di-install ketika runtime lama masih berjalan.
8. Isolated probe dan atomic CAS mengaktifkan versi baru; profile akun tidak pernah dipakai sebagai
   canary.
9. Launch berikutnya memakai versi baru; process lama tetap hidup.
10. Profile floor mencegah downgrade; acknowledgment user tidak melewati floor.
11. Catalog/download gagal dan active runtime lama tetap dipakai hanya jika security policy
    mengizinkan.
12. Unknown/in-use/active/floor-required/seed-recovery runtime tidak dihapus.

**Akun dan profil**

13. Dua akun login dan berjalan bersamaan.
14. Cookie/session bertahan setelah browser dan launcher restart.
15. **Bookmark bar dan pinned tab bertahan per profil.**
16. **Extension terpasang offline** dari `extraResources` tanpa network; lock mismatch (hash, ukuran,
    ID) ditolak (§11.5).
17. **Extension ID stabil** setelah update extension **dan** setelah update runtime; **userscript
    bertahan** melewati keduanya (§11.5).
18. Extension aktif hilang/rusak → launch **diblokir** dengan pesan, bukan berjalan tanpa extension.
19. Policy email ditegakkan **transaction-safe**: create/update bersamaan dengan email sama →
    tepat satu berhasil; **unarchive yang berkonflik memberi dua jalan keluar eksplisit**, bukan
    constraint error (§10.1).
20. **Mematikan policy email tidak menjalankan migration**; menyalakannya kembali tidak menolak atau
    mengubah duplikat yang sudah ada. **Tidak ada unique index email di schema.**
21. **First launch tahan gagal** (§10.3): `spawn()` gagal atau crash sebelum bukti → state
    `uninitialized` dan retry **tetap mengirim start URL**; crash setelah `initialized` → start URL
    tidak diulang.
22. **Stale/overlapping launch tidak menimpa state** operasi yang lebih baru; `launching` yang
    tertinggal setelah launcher restart turun ke `uninitialized`, tidak menggantung.
23. Launcher ditutup tanpa menutup browser managed.
24. Browser ditutup langsung tanpa merusak launcher state.
25. Reset/archive crash direkonsiliasi dari journal dan memindahkan data ke recovery, bukan delete
    langsung. Reset menaikkan `init_generation` (§10.6).

**Skala**

26. **Cache cap efektif** — ukur profil setelah pemakaian berat dan bandingkan dengan §5.1.
27. 20+ akun tersimpan; Table tetap dapat di-search/sort; kolom ukuran profil akurat.
28. Peringatan RAM muncul pada ≥5 akun aktif; tidak ada aksi "Buka semua".

**Proxy — gating sebelum Fase 6 (§12.7)**

29. **Sebelum Fase 6 PASS:** `--proxy-server` **tidak pernah** muncul di argumen launch mana pun.
30. **Sebelum Fase 6 PASS:** akun dengan `proxy_id` **ditolak launch** dengan pesan jelas; **tidak
    pernah** diluncurkan direct secara diam-diam.
31. **Sebelum Fase 6 PASS:** UI proxy assignment dan test connection disabled dengan alasan terlihat;
    `testProxy()` dan `assignProxy()` menolak dengan `PROXY_NOT_AVAILABLE`.

**Proxy — setelah Fase 6 PASS**

32. Akun A dan B keluar dari IP berbeda sesuai assignment.
33. **Tidak ada DNS leak** pada SOCKS5.
34. **Tidak ada fallback direct** ketika relay mati atau gagal start — trafik berhenti dan launch
    diblokir, bukan bocor.
35. Kredensial proxy tidak pernah plaintext di database, tidak muncul di command line, log, atau
    export metadata.

**Keamanan dan housekeeping**

36. Exact IPC sender validation menolak renderer/origin/capability yang salah; progress subscription
    dapat dibatalkan dan dibersihkan.
37. Destructive action melewati native confirmation dari main process.
38. Update launcher tidak menghapus `launcher.sqlite`, runtime, atau profiles.
39. Uninstall default mempertahankan managed root.
40. Windows user/PC lain tidak dijanjikan memulihkan session terenkripsi.
41. Tidak ada password, cookie, token, URL query sensitif, atau data browsing dalam log.
42. Packaged executable memakai capability IPC yang sama dengan dev.
43. QA PC-only lulus pada 1280, 1366/1440, 1920, 2560 px, continuous resize, zoom 100–200%,
    keyboard/focus, tanpa horizontal page overflow.

---

## 22. Keputusan OPEN

### Dapat ditutup sekarang

| #   | Pertanyaan                                                                      | Default plan                             |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | Nama produk final untuk display name, executable, installer                     | App ID internal tetap `browser-launcher` |
| 2   | Download layer: implementasi sendiri atau `@puppeteer/browsers` sebagai library | Putuskan di Fase 4                       |

### Butuh data dari Fase 0

| #   | Pertanyaan                                                          | Sumber                                        |
| --- | ------------------------------------------------------------------- | --------------------------------------------- |
| 3   | Nilai cache cap final                                               | §5.2 — validasi terhadap CfT                  |
| 4   | Retention recovery profile dan retained runtime                     | §5.4 — butuh ukuran terekstrak                |
| 5   | Developer mode Tampermonkey dapat dihindari?                        | §11.3b                                        |
| 6   | Tab non-pinned kembali tanpa argumen URL?                           | §10.4                                         |
| 7   | Authenticode chain dapat diandalkan?                                | §13.3                                         |
| 8   | **File/direktori minimum sebagai bukti profile initialization**     | §10.3 — konstanta, jangan ditebak             |
| 9   | **Readiness window dan timeout keras first launch**                 | §10.3 — nilai awal 5 s / 30 s                 |
| 10  | **Licensing/redistribution Tampermonkey disetujui untuk dibundel?** | §11.5 — bila tidak, extension keluar dari v1  |
| 11  | CfT boleh menuju production bila gate redistribution/signing lulus? | §7.2 — sampai disetujui, target pilot pribadi |

### Butuh keputusan user

| #   | Pertanyaan                                                 | Default plan                                        |
| --- | ---------------------------------------------------------- | --------------------------------------------------- |
| 12  | **Lifecycle proxy: tray-resident atau detached sidecar?**  | Opsi A tray-resident (§12.4) — **paling berdampak** |
| 13  | Managed root: sarankan drive terbesar atau selalu tanya?   | Sarankan, user tetap memilih                        |
| 14  | Start URL dibatasi allowlist atau semua HTTPS tervalidasi? | Semua HTTPS; default Gmail                          |
| 15  | Extension mana yang wajib lolos acceptance matrix?         | Tampermonkey minimum                                |
| 16  | Umur runtime untuk warning dan hard block?                 | §15 — jangan mengarang angka                        |
| 17  | Batas jumlah akun maksimum?                                | Tanpa batas keras, peringatan pada ≥5 aktif         |
| 18  | User boleh memindahkan managed root setelah akun dibuat?   | Belum                                               |
| 19  | Telemetry?                                                 | Tidak ada                                           |
| 20  | Status browser real-time dibutuhkan di v1?                 | Tidak, kecuali Fase 7 terbukti aman                 |

### Sudah tertutup, bukan lagi OPEN

- installer wajib membawa seed runtime **dan extension** untuk first run offline;
- UUID adalah satu-satunya identity; email adalah label — **email tidak menjadi primary key, nama folder, atau memiliki unique index**;
- **policy satu-email-satu-profil dapat dimatikan tanpa migration** (§10.1);
- data deletion hanya melalui launcher dengan disclosure, bukan uninstall default;
- system browser dilarang sebagai runtime maupun fallback;
- Playwright ditolak sebagai launcher;
- proxy masuk scope v1, tetapi **schema dibuat Fase 1 dan fitur aktif Fase 6** (§12.7);
- automatic runtime cleanup nonaktif sampai Fase 7;
- plan canonical tinggal di root, bukan `.ai/`.

---

## 23. Rekomendasi Review

Urutan review sebelum kode:

1. setujui batas penggunaan CfT dan target distribusi awal (§7.2);
2. setujui model penyimpanan, seed offline, dan DPAPI disclosure;
3. setujui account/profile lifecycle dan policy email (§10.1);
4. setujui update/rollback/security policy;
5. setujui Electron capability boundary (§6);
6. **tutup `[OPEN]` §12.4 lifecycle proxy** — ini mengubah bentuk UI dan process model;
7. tutup keputusan OPEN untuk Fase 0;
8. baru pecah implementasi menjadi diff kecil per fase.

Jangan mulai dari UI. Storage, runtime update, dan security boundary menentukan apakah produk aman
dibangun.

### 23.1 Housekeeping setelah plan ini disetujui

- [ ] Hapus `.ai/browser-plan.md` — plan canonical pindah ke root (`PLAYBOOK.md:163`)
- [ ] Hapus `browser-plan2.md` — sudah diserap ke dokumen ini
- [ ] Hapus `browser-plan1.md` dan versi v1 lama bila masih ada
- [ ] Perbarui `.ai/handoff.md` agar menunjuk ke `browser-plan.md` di root
- [ ] Commit plan ini agar tidak lagi untracked

Tujuannya satu: **agent berikutnya hanya menemukan satu sumber keputusan.**
