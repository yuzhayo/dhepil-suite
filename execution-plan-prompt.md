# Prompt untuk Membuat `execution-plan.md`

Workspace:

```text
C:\VSCODE\AntD\dhepil-suite
```

## Instruksi Utama

Buat atau perbarui file berikut:

```text
execution-plan.md
```

Buat **execution plan end-to-end** untuk implementasi modular control center Dhepil
Suite. Plan harus di-breakdown sampai level TODO yang dapat dijalankan oleh agent lain
dengan context kecil, setelah context di-compact, atau setelah sesi baru dimulai.

Pada tugas ini:

- hanya buat atau perbarui `execution-plan.md`;
- jangan mengubah source code;
- jangan mengubah `package.json`;
- jangan mengubah test;
- jangan mengubah `AGENTS.md`;
- jangan membuat commit;
- jangan membuat plan architecture kedua.

## Wajib Dibaca Sebelum Menulis Plan

Baca dan pahami:

1. `AGENTS.md`
2. `plan.md`
3. `git status`
4. seluruh file di `src/features/control-center/`
5. seluruh file di `scripts/`
6. `config/app-ports.lock.json`
7. test yang terkait control center dan project manager
8. `package.json`, `eslint.config.ts`, `vite.config.ts`, `vitest.config.ts`, dan
   konfigurasi TypeScript

Jangan menganggap arsitektur target di `plan.md` sudah diimplementasikan. Bedakan
secara eksplisit antara:

- runtime yang sudah aktif;
- file yang sudah ada;
- target architecture;
- fase yang belum selesai.

## Kondisi Runtime yang Harus Dipertahankan

Plan wajib mempertahankan behavior berikut:

- root berjalan di port `1999`;
- app berjalan di port stable dari `config/app-ports.lock.json`;
- discovery langsung dari `apps/*`;
- app baru muncul tanpa edit registry manual;
- start dan open project;
- stop server;
- quick kill managed process;
- external process tidak boleh di-kill;
- port conflict tidak boleh melakukan reassignment;
- invalid app;
- deleted running app menghasilkan tombstone `not-found` / 404;
- search;
- sort;
- grid/list;
- loading;
- empty state;
- page error;
- terminal output dan internal scroll;
- responsive 390px dan desktop.

Jangan mengubah source app di `apps/*`.

## Status Implementasi Aktual

Plan harus mencatat:

- discovery dan stable port lock sudah implemented;
- scripts runtime sudah terbagi menjadi:
  - `project-contracts`;
  - `project-discovery`;
  - `project-port-registry`;
  - `project-process`;
  - `project-manager`;
- `control-center` masih monolithic sebagian;
- modular `ui/`, `domain/`, `data/`, `controller/`, `commands/`, `presenters/`, dan
  `extensions/` belum seluruhnya ada;
- `useProjectManager.ts` masih menangani HTTP, polling, pending state, startup retry,
  waiting-tab, dan error normalization;
- status lifecycle masih memiliki literal yang tersebar di beberapa consumer;
- architecture import boundary belum sepenuhnya executable;
- CI workflow belum ada dan harus dicatat sebagai deferred scope, bukan ditambahkan
  diam-diam ke refactor utama.

## Source of Truth dan Prioritas Instruksi

Gunakan urutan prioritas berikut:

1. Instruksi user pada sesi aktif;
2. `AGENTS.md`;
3. `plan.md`;
4. `execution-plan.md`;
5. source dan test aktual;
6. asumsi umum.

Jika dokumen bertentangan dengan source aktual:

- source aktual menjadi evidence;
- catat konflik;
- jangan menyamarkan target architecture sebagai implemented;
- buat fallback atau decision point;
- jangan mengubah public contract tanpa approval.

## Struktur Wajib `execution-plan.md`

### 0. Operating Rules

Tuliskan:

- aturan ownership file;
- aturan parent-child architecture;
- aturan no-reset, no-clean, no-force-checkout;
- aturan tidak menyentuh `apps/*` saat bekerja di root;
- aturan tidak mengimpor artifact lama;
- aturan tidak menambah dependency tanpa kebutuhan dan approval;
- aturan validasi saat LSP disabled;
- aturan browser QA;
- aturan bahwa fase berikutnya tidak boleh dimulai jika gate fase aktif gagal.

### 1. Current Baseline

Dokumentasikan:

- kondisi runtime aktual;
- struktur file aktual;
- implemented baseline;
- target yang masih pending;
- commit baseline jika ada;
- file protected;
- file yang akan disentuh dalam refactor;
- technical debt yang sudah terverifikasi.

### 2. Dependency Graph

Buat dependency graph antar fase.

Tunjukkan:

- fase yang wajib serial;
- fase yang boleh paralel;
- contract yang menjadi dependency;
- fase yang harus berhenti jika fase sebelumnya gagal.

### 3. Phase Index

Buat tabel berikut:

| Phase | Tujuan | Allowed files | Forbidden files | Dependency | Output | Validation | Gate |
| ----- | ------ | ------------- | --------------- | ---------- | ------ | ---------- | ---- |

Setiap fase harus kecil, fokus, dan dapat diverifikasi dalam satu sesi agent.

Batasi setiap fase pada:

- satu concern utama;
- maksimal 1–5 file utama;
- satu boundary arsitektur;
- satu perubahan behavior atau satu extraction besar;
- satu set validation yang jelas.

### 4. Format Detail Setiap Fase

Setiap fase harus menggunakan format ini:

````markdown
### Phase PXX — <nama fase>

Status:

- PENDING

Objective:

- <satu kalimat>

Why now:

- <alasan urutan fase>

Preconditions:

- <fase atau contract yang harus PASS>

Allowed files:

- <path eksplisit>

Forbidden files:

- <path eksplisit>

Implementation TODO:

1. ...
2. ...
3. ...

Contracts:

- <type/interface/function dan behavior yang dipertahankan>

Tests to add or update:

- <behavior test>

Validation commands:

```powershell
...
```
````

Success criteria:

- <criteria objektif>

Fallback if not achieved:

- <perbaikan minimal>
- <alternatif yang tetap menjaga contract>
- <kapan harus berhenti>

Stop conditions:

- <kondisi yang memblokir fase>

Handoff:

- <file berubah>
- <command dan hasil>
- <known issue>
- <fase berikutnya>

````

Jangan memakai success criteria subjektif seperti “kode sudah bagus” atau “setara
Opus”. Gunakan bukti berupa test, lint, typecheck, build, atau browser measurement.

## Urutan Fase Minimum

Gunakan urutan berikut kecuali evidence source menunjukkan alasan kuat untuk mengubahnya:

### P00 — Baseline Characterization

- bekukan behavior existing;
- catat accessible names;
- cover stopped, running, external, conflict, invalid, not-found, loading, empty,
  error, quick kill, search, sort, grid/list;
- test concurrent `list()` single-flight;
- test overlap `start()` dan `list()`;
- test mutation route harus POST dan same-origin;
- ukur probe baseline untuk fixture 20 app;
- tambahkan boundary guardrail awal.

### P01 — Import Boundary Guardrail

- gunakan ESLint built-in `no-restricted-imports`;
- UI tidak boleh import data, controller, commands, extensions, atau scripts;
- domain tidak boleh import React, AntD, UI, data, atau application;
- extension tidak boleh import UI atau extension sibling;
- jangan membuat dependency baru.

### P02 — Domain Status Classification

- buat `domain/projectStatus.ts`;
- buat status family readonly;
- buat classification function;
- pastikan semua `ProjectStatus` exhaustive;
- hilangkan status array literal dari consumer.

### P03 — Domain Action Policy

- buat `domain/projectActionPolicy.ts`;
- implementasikan:
  - `canStartProject`;
  - `canStopProject`;
  - `canQuickKillProject`;
  - `isActiveProject`;
  - `isOpenReadyProject`;
  - `isStartupTerminalFailure`;
- test seluruh status dan managed/pending context.

### P04 — View-Model Contracts

- buat `application/view-models.ts`;
- buat presenter untuk header, toolbar, grid, card, alert, quick-server items;
- pindahkan log truncation ke presenter;
- definisikan `MAX_RENDERED_LOG_LINES = 80`;
- pertahankan runtime log retention `120` sebagai contract terpisah.

### P05 — HTTP Response Contract

- buat `ProjectManagerClient`;
- buat `httpProjectManagerClient`;
- buat response parser;
- buat `ProjectManagerRequestError`;
- tangani response non-JSON;
- pertahankan status/action/message.

### P06 — Cancellation dan Request Lifecycle

- tambahkan `AbortSignal` ke list/start/stop;
- gunakan `AbortController`;
- cegah stale response overwrite state baru;
- jangan tampilkan abort sebagai page error;
- test unmount dan out-of-order response.

### P07 — Startup Readiness Policy

- pisahkan startup retry dari browser effect;
- buat injected sleep/timing;
- default harus tetap `40 × 750 ms`;
- test success, timeout, terminal failure, dan abort tanpa menunggu waktu nyata.

### P08 — Browser Window Adapter

- buat `ProjectWindow`;
- pindahkan `window.open`;
- pindahkan waiting-tab;
- pindahkan redirect;
- pindahkan close;
- test tanpa browser sungguhan melalui adapter double.

### P09 — Core Commands

- ekstrak refresh;
- ekstrak start/open;
- ekstrak stop;
- ekstrak quick kill;
- command hanya memakai ports, domain policy, dan adapter.

### P10 — Extension Contract dan Host

- buat extension contract;
- validasi schema;
- validasi extension ID;
- validasi action ID;
- missing handler harus disabled;
- unknown action harus error terstruktur;
- error extension tidak boleh menghentikan polling.

### P11 — Extension Loader dan Core Modules

- gunakan `import.meta.glob`;
- buat module refresh;
- buat module lifecycle;
- buat module quick-kill;
- module tidak boleh mengakses shell/PID API;
- module tidak boleh import sibling.

### P12 — Controller

- buat `useControlCenterController`;
- pindahkan state ownership;
- pindahkan polling;
- tambahkan pending state;
- tambahkan request sequence;
- tambahkan abort/unmount guard;
- hasilkan `ControlCenterViewModel`.

### P13 — Header UI

- buat `ui/header/`;
- buat `headerDefinition.ts`;
- pindahkan markup header;
- UI hanya render definition dan dispatch action.

### P14 — Toolbar UI

- buat `ui/toolbar/`;
- buat `toolbarDefinition.ts`;
- pindahkan search, sort, grid/list, refresh, dan quick-server controls;
- UI tidak menghitung policy.

### P15 — Grid UI

- buat `ui/grid/`;
- buat `gridDefinition.ts`;
- pindahkan loading, empty, ready composition;
- grid menerima view model.

### P16 — Card dan Terminal UI

- buat `ui/card/`;
- buat `cardDefinition.ts`;
- ekstrak terminal;
- card tidak membaca raw domain policy;
- card hanya render view model;
- terminal tetap menjadi scroll owner.

### P17 — Layout Ownership

- buat `ui/layout/`;
- buat `layoutTokens.css`;
- pindahkan breakpoint dan token;
- kurangi `src/styles.css` menjadi reset/base global;
- validasi 390px, 768px, 1024px, dan 1440px.

### P18 — Screen Cleanup

- screen hanya controller + layout;
- hapus inline header/toolbar/quick-kill;
- hapus import lama;
- tidak ada duplicate code path.

### P19 — Legacy Removal

- hapus file lama hanya setelah replacement memiliki test;
- pastikan tidak ada runtime reference;
- pastikan tidak ada compatibility wrapper permanen;
- update `AGENTS.md` dan `plan.md` jika status berubah.

### P20 — Full Automated Validation

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test -- --maxWorkers=2
npm run build
npx --yes antd lint src --format json
````

### P21 — Browser QA dan Final Audit

Validasi:

- desktop;
- 390px;
- grid/list;
- search/sort;
- start/open;
- stop/quick kill;
- external/conflict;
- invalid;
- tombstone;
- long terminal log;
- keyboard focus;
- no horizontal overflow;
- no console error.

## Quality Gates Global

Eksekusi dianggap tidak lulus jika:

- typecheck gagal;
- lint gagal;
- test existing gagal;
- status policy masih terduplikasi;
- UI memanggil `fetch`, `window.open`, polling, atau process API;
- stale response dapat menimpa state baru;
- request tidak dapat dibatalkan;
- import boundary dilanggar;
- browser QA diperlukan tetapi tidak tersedia;
- perubahan keluar dari allowed files.

## Resume Protocol untuk Context Kecil

Setiap agent yang melanjutkan wajib:

1. membaca `AGENTS.md`;
2. membaca `plan.md`;
3. membaca `execution-plan.md`;
4. menjalankan `git status`;
5. mencari phase terakhir dengan status `IN_PROGRESS`, `BLOCKED`, atau `PASS`;
6. tidak mengulang phase `PASS`;
7. tidak memulai phase berikutnya jika gate belum `PASS`;
8. membaca hanya file yang termasuk `Allowed files` fase aktif;
9. jika context atau evidence tidak cukup, menulis `BLOCKED` dan berhenti;
10. melaporkan command dan hasil aktual, bukan hasil dari sesi lama.

## Fallback dan Recovery Rules

Jika success criteria tidak tercapai:

- jangan lanjut ke fase berikutnya;
- pertahankan perubahan yang sudah ada;
- jangan menjalankan reset, clean, atau checkout paksa;
- catat error dan file yang terdampak;
- coba fallback paling kecil;
- jika fallback gagal, tandai `BLOCKED`;
- jangan memperluas scope tanpa approval;
- jangan mengubah public contract hanya untuk membuat test lulus.

## Final Acceptance Checklist

Execution plan harus berisi:

- seluruh phase;
- dependency graph;
- allowed/forbidden files;
- TODO detail;
- contract;
- test;
- command validation;
- success criteria;
- fallback;
- stop condition;
- handoff;
- browser QA matrix;
- resume protocol;
- final acceptance checklist.
