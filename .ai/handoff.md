# Dhepil Suite — Current Handoff

> **Snapshot:** 2026-08-02. Dokumen ini mencatat kondisi repository aktual setelah WIP release tooling di-commit dan scaffold app dihapus. Keputusan arsitektur tetap dimiliki `PLAYBOOK.md`; rencana browser launcher dimiliki `browser-plan.md` di root.

## Update 2026-08-04 — Tampermonyet AgentRouter Dashboard + Token + Usage Log Require

Satu loader installable `public/require/agentrouter/agent.router.user.js` versi `0.8.0` memuat page
module Dashboard, Token, dan Usage Log. Dashboard membaca nama akun serta `Current balance`. Token scanner
versi `0.2.0` membuka masked Key secara otomatis, membaca real key beserta metadata row, lalu
mengembalikan input ke masked. Identitas akun ketiga halaman dimiliki helper situs
`agentrouter/account.js`.

Usage Log versi `0.1.0` hanya membaca row dengan Type tepat `System`; partial match dan semua type
lain diabaikan. Snapshot menyimpan Time, Type, dan Details sesuai teks yang tampil tanpa parsing
waktu atau terjemahan, tidak membaca pagination, lalu me-rewrite `usage-log:last` untuk akun aktif.

Helper generik berada di `shared/`: DOM, finite polling, JSON storage, owner-checked rewrite-log,
downloader, dan Shadow DOM UI. `agentrouter/userJson.js` menggabungkan hasil Dashboard, Token, dan
Usage Log menjadi satu JSON localStorage per akun. Downloader memakai grant `GM_xmlhttpRequest` dengan
`@connect 127.0.0.1`, sehingga request lokal dimiliki Tampermonkey dan tidak memicu izin Local
Network Access untuk origin AgentRouter. Downloader mengirim JSON ke endpoint host lokal; plugin
Vite `server/databaseWriter.ts` menulis ulang file tetap
`apps/tampermonyet/database/agentrouter/<account>.json`. Folder database mengabaikan seluruh JSON
melalui `.gitignore`.

Dashboard, Token, dan Usage Log tetap mempunyai record terbaru masing-masing (`dashboard:last`,
`token:last`, dan `usage-log:last`) serta hanya mengizinkan read/rewrite ketika owner cocok dengan akun yang terlihat.
Polling berjalan setiap 500 ms maksimal lima menit lalu berhenti saat berhasil, timeout, atau
keluar route. Tombol scan ulang menjadi fallback manual. Clear-log button tetap technical debt;
operasi `storageRewriteLog.remove()` sudah tersedia tetapi belum dihubungkan ke UI.

Validasi Windows: app test PASS (7 file/22 test), root test PASS (38 file/172 test), ESLint PASS,
typecheck/build root dan app PASS, Prettier PASS, `git diff --check` PASS, dan AntD lint
`apps/tampermonyet/src` PASS. Inspeksi read-only Chrome pada `/console/log` memverifikasi tabel nyata
berada di `main`, memakai role `grid`, mempunyai `tbody`, serta header Time, Type, dan Details yang
cocok dengan selector. Akun saat inspeksi mempunyai nol row, sehingga filter System pada row nyata
belum dapat diverifikasi melalui browser. Pemeriksaan AgentRouter Token
nyata membuktikan visibility mengubah input masked menjadi real key dan dapat dikembalikan ke
masked tanpa mencetak nilainya. Endpoint port `2003` berhasil menulis/rewrite payload dummy ke
path database yang benar; file smoke sudah dihapus. Seluruh URL require baru merespons HTTP 200
`text/javascript`. Instalasi/update loader versi `0.8.0` dan alur penuh melalui Tampermonkey masih
perlu diuji.

## Update 2026-08-04 — Legacy Tampermonkey Archive

Folder lokal lama `apps/tampermonkey` dipindahkan ke
`apps/tampermonyet/tampermonkey` sebagai arsip referensi yang tidak diimpor ke runtime. ESLint,
root/app Vitest, Prettier, dan Git mengabaikan arsip tersebut agar source lama tidak mengganggu
validation app baru. Migrasi module ke `public/require/` tetap harus dilakukan eksplisit dan
bertahap.

## Update 2026-08-04 — Card Metadata Popover

Reusable `ui/card-grid/Card.tsx` sekarang menampilkan tombol ikon informasi di header card ketika
metadata tersedia. Port, path, PID, ownership process, dan kesiapan Electron tidak lagi memenuhi
body card; metadata yang sama ditampilkan melalui Ant Design `Popover` saat ikon diklik. Status
project dan terminal process tetap selalu terlihat. Perubahan tidak menambah kontrak Gate atau
dependency baru.

## Update 2026-08-04 — Preboot Tsconfig Cleanup

Root sekarang mempunyai `scripts/project-tsconfig-cleaner.ts`. Hook `predev`, `pretest`, dan
`prebuild` memindai direct-child directory `apps/*` dan membuang reference app dari root
`tsconfig.json` bila folder app terkait sudah tidak ada. Cleanup bersifat idempotent dan tidak
menghapus source, package lock, process, atau port app aktif. Test fokus berada di
`scripts/project-tsconfig-cleaner.test.ts`.

## Update 2026-08-04 — Cached App Catalog dan Port Reuse

`app.manifest.json` sekarang menjadi opt-in katalog. Folder tanpa manifest diabaikan; manifest yang
ada tetapi rusak tetap muncul sebagai invalid dan disimpan di cache sampai initial/manual Refresh
berikutnya. Polling 1,5 detik hanya membaca katalog cache dan status process/HTTP. Scan eksplisit
merapikan port assignment app yang foldernya hilang sehingga port dapat dipakai app baru tanpa
memindahkan port app yang masih ada.

## Status Repository

Dhepil Suite adalah monorepo development control center pada port `1999`. App di `apps/*` ditemukan dari `app.manifest.json`, memperoleh stable port dari `config/app-ports.lock.json`, dan dapat dibangun mandiri bila opt-in desktop.

| App            | Port | Desktop  |
| -------------- | ---- | -------- |
| `clipboard`    | 2002 | enabled  |
| `tampermonyet` | 2003 | disabled |

`dhepil` dan `spreadsheet-minimal` dihapus pada `3dbd01f`; keduanya hanya scaffold welcome-screen
tanpa business logic. Assignment lama `2000`/`2001` sudah dibersihkan oleh rekonsiliasi katalog
dan sekarang tersedia untuk app baru. Root package tetap bernama `dhepil-suite`.

Root control center tidak menjadi runtime dependency artifact final. Source app tidak mengimpor root atau app lain.

## Checkpoint yang Sudah Di-commit

Sesi 2026-08-02 meng-commit seluruh WIP yang sebelumnya menggantung:

```text
3dbd01f chore(apps): remove dhepil and spreadsheet-minimal scaffolds
8c9524b docs(browser): promote canonical launcher plan to root
d53972b docs(clipboard): move plan into app and add release contract
4f337e1 docs: document automatic release contract
d3d5c8f docs(apps): add inherited workspace guardrails
4a6401d feat(release): add automatic app versioning and changelog tooling
```

Checkpoint sebelumnya:

```text
da2448f docs: add clipboard app implementation and backlog documentation
75dabbd feat(electron): centralize per-app desktop builds
4dfba07 feat(ui): centralize shared Ant Design theme
fde197f fix(ui): contain grid card actions
94bb5e7 docs(browser): add standalone launcher implementation plan
```

Belum ada push. Perubahan tersebut mencakup:

- shared Electron build/runtime ownership di `electron/`;
- per-app desktop opt-in melalui manifest dan thin scripts;
- shared Ant Design theme, toggle, persistence, dan same-window synchronization;
- UI control-center fluid desktop dan containment action/card;
- port-independent process-manager test;
- sinkronisasi root/app ownership dan Electron playbook;
- satu plan kanonis browser launcher yang self-contained dan belum diimplementasikan.

## Electron yang Sudah Terverifikasi

Clipboard adalah app desktop pertama yang opt-in. Artifact checkpoint berada di `electron/release/clipboard/`:

```text
Clipboard-Setup-0.1.0.exe
Clipboard-Setup-0.1.0.exe.blockmap
win-unpacked/Clipboard.exe
```

Checkpoint sebelumnya membuktikan installer NSIS x64, packaged executable, sandboxed preload, app-specific `userData`, cleanup smoke process, dan app ASAR minimal. SHA256 installer saat checkpoint: `D08A00F800BDEED4D29B45BC7558D912334AFBB4FAB5B518E79EC40EB924D7A4`.

Artifact generated bukan source of truth dan dapat berubah setelah build berikutnya. Prosedur opt-in app baru ada di `PLAYBOOK.md` Section 10 dan `electron/README.md`.

## Automatic App Releases

Tooling modular di `tooling/release/` kini mengelola version, per-app `CHANGELOG.md`, validasi app, release commit, dan annotated tag secara otomatis. Kontrak canonical berada di `PLAYBOOK.md` Section 11.

- `npm run release:check`: dry-run semua app yang berubah.
- `npm run release:changed`: release semua app terdampak.
- `npm run release:app -- <id>`: release satu app.
- Git tag memakai `<app-id>-v<version>` dan run pertama melakukan bootstrap tanpa bump.
- `apps/<id>/` memengaruhi app tersebut; shared `ui/` memengaruhi semua app.
- `electron/` hanya dihitung dengan `--include-electron` untuk app desktop-enabled.
- Release tidak pernah push atau menjalankan packaging Electron.
- Working tree harus bersih; file version/lock/changelog dipulihkan bila validasi gagal.
- `apps/AGENTS.md` sekarang menjadi inherited guardrail untuk setiap app baru, bahkan sebelum app mempunyai `AGENTS.md` lokal.

Workflow app baru sudah disinkronkan di root `AGENTS.md`, `apps/AGENTS.md`, `PLAYBOOK.md`, Electron README/AGENTS, dan plan app yang membuat package baru. Scaffold dimulai dari `0.1.0`; `CHANGELOG.md` boleh belum ada; agent tidak boleh membuat todo manual untuk bump version/changelog/tag.

Dry-run aktual hanya menemukan `clipboard` sebagai bootstrap `0.1.0` tanpa mutasi. **Belum ada satu pun tag release.** Ketiga app sempat memiliki `CHANGELOG.md` bertanggal 2026-08-01 hasil release run yang berhenti sebelum tagging; file-file itu dihapus agar tooling membuat baseline dengan tanggal yang benar pada release pertama.

## Validation Aktual

Dijalankan 2026-08-02 dari WSL pada tree bersih setelah penghapusan app:

- `npm run format:check`: PASS.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS, termasuk `tooling/`.
- `npx --yes @ant-design/cli lint . --format json`: PASS, 0 issue.
- `npm run release:check`: PASS; hanya `clipboard` yang direncanakan bootstrap `v0.1.0`.

**Belum terverifikasi:** `npm run test` dan `npm run build` **tidak dapat dijalankan dari WSL**. `node_modules` dipasang dari Windows dan hanya memiliki `@rolldown/binding-win32-x64-msvc`, sehingga Vite 8 gagal dengan `Cannot find module '../rolldown-binding.linux-x64-gnu.node'`. Ini batasan environment, bukan defect kode. Jalankan kedua gate itu dari Windows sebelum push. Jangan menjalankan `npm install` polos dari WSL karena akan menukar binding native dan merusak toolchain Windows; gunakan `npm install --package-lock-only --ignore-scripts` bila hanya perlu sinkronisasi lock.

Baseline terakhir yang pernah PASS penuh adalah 2026-08-01 dari Windows: 30 file / 146 test. Angka itu belum diverifikasi ulang setelah dua app dihapus.

Browser visual QA belum dijalankan karena browser-control runtime tidak tersedia. Jangan menganggap layout visual PASS hanya dari build/test lokal.

## Warning yang Masih Terbuka

- `npm install` melaporkan 16 high-severity vulnerability pada dependency development/transitive. Tidak dijalankan `npm audit fix --force` karena dapat mengubah dependency secara destruktif.
- Bundle root masih memberi warning ukuran chunk lebih dari 500 kB.
- Server user pada port `2000` harus dipertahankan; test tidak lagi mengasumsikan port tersebut kosong.

## Next Work

`browser-plan.md` adalah plan-only. Implementasi `apps/browser-launcher/` belum dimulai dan wajib mulai dari **Fase 0**, termasuk legal/redistribution CfT, packaged `node:sqlite` spike, safe ZIP extractor, offline seed staging, dan perluasan capability contract di `PLAYBOOK.md`.

Jangan mulai dari UI dan jangan membuat `browser-plan1.md` atau plan paralel baru. System Chrome, Edge, default browser, serta root port `1999` bukan fallback runtime artifact final.
