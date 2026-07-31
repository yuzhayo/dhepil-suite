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

## Validation Aktual

- `npm run format:check`: PASS.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test -- --maxWorkers=2`: PASS, 21 files / 104 tests.
- `npm run build`: PASS; warning chunk Vite lebih dari 500 kB tetap non-blocking.
- `npx --yes antd lint . --format json`: PASS, 0 issue.
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
