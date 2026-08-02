# Dhepil Suite — Current Handoff

> **Snapshot:** 2026-08-01. Dokumen ini mencatat kondisi repository aktual setelah konsolidasi WIP. Keputusan arsitektur tetap dimiliki `PLAYBOOK.md`; rencana browser launcher dimiliki `browser-plan.md`.

## Status Repository

Dhepil Suite adalah monorepo development control center pada port `1999`. App di `apps/*` ditemukan dari `app.manifest.json`, memperoleh stable port dari `config/app-ports.lock.json`, dan dapat dibangun mandiri bila opt-in desktop.

| App                   | Port | Desktop  |
| --------------------- | ---- | -------- |
| `dhepil`              | 2000 | disabled |
| `spreadsheet-minimal` | 2001 | disabled |
| `clipboard`           | 2002 | enabled  |

Root control center tidak menjadi runtime dependency artifact final. Source app tidak mengimpor root atau app lain.

## Checkpoint yang Sudah Di-commit

```text
75dabbd feat(electron): centralize per-app desktop builds
e84ac0b docs(clipboard): add app ownership guardrails
68c04ab test: stabilize local validation baseline
4dfba07 feat(ui): centralize shared Ant Design theme
fde197f fix(ui): contain grid card actions
6d89b66 docs: sync architecture and desktop playbook
94bb5e7 docs(browser): add standalone launcher implementation plan
```

Perubahan tersebut mencakup:

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

Dry-run aktual menemukan `clipboard`, `dhepil`, dan `spreadsheet-minimal` sebagai bootstrap `0.1.0` tanpa mutasi. Tag belum dibuat karena release nyata sengaja tidak dijalankan pada working tree WIP.

## Validation Aktual

- `npm run format:check`: PASS.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test -- --maxWorkers=2`: PASS, 30 files / 146 tests. Termasuk temporary-repo integration untuk release sukses dan expected build-failure rollback.
- `npm run build`: PASS; warning chunk Vite lebih dari 500 kB tetap non-blocking.
- `npx --yes antd lint . --format json`: PASS, 0 issue.
- `npm run release:check`: PASS; 3 app ditemukan, dry-run tidak memutasi file/tag.
- Markdown app-creation contract audit: PASS; seluruh 9 dokumen yang mengatur/membuat app merujuk automatic release dan tidak meminta version/changelog manual.
- Build renderer `clipboard`: PASS.
- Build renderer `spreadsheet-minimal`: PASS.

Browser visual QA belum dijalankan karena browser-control runtime tidak tersedia pada sesi konsolidasi. Jangan menganggap layout visual PASS hanya dari build/test lokal.

## Warning yang Masih Terbuka

- `npm install` melaporkan 16 high-severity vulnerability pada dependency development/transitive. Tidak dijalankan `npm audit fix --force` karena dapat mengubah dependency secara destruktif.
- Bundle root masih memberi warning ukuran chunk lebih dari 500 kB.
- Server user pada port `2000` harus dipertahankan; test tidak lagi mengasumsikan port tersebut kosong.

## Next Work

`browser-plan.md` adalah plan-only. Implementasi `apps/browser-launcher/` belum dimulai dan wajib mulai dari **Fase 0**, termasuk legal/redistribution CfT, packaged `node:sqlite` spike, safe ZIP extractor, offline seed staging, dan perluasan capability contract di `PLAYBOOK.md`.

Jangan mulai dari UI dan jangan membuat `browser-plan1.md` atau plan paralel baru. System Chrome, Edge, default browser, serta root port `1999` bukan fallback runtime artifact final.
