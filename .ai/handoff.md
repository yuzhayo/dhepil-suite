# Handoff Document

## Status Terakhir

Shared Electron runtime dan build orchestration sudah dipusatkan di `electron/`. Clipboard adalah app desktop pertama yang opt-in dan installer Windows-nya berhasil dibangun serta dijalankan.

## Pekerjaan Selesai

1. Menambahkan npm workspace `@dhepil-suite/desktop-runtime` di `electron/package.json`.
2. Memindahkan seluruh ownership Electron ke `electron/`:
   - generic main process;
   - sandboxed preload;
   - cached binary installer;
   - dev/build/build-all orchestrator;
   - generated runtime dan release per app.
3. Root hanya memiliki command entry point:
   - `npm run desktop:dev -- <app-id>`;
   - `npm run desktop:build -- <app-id> [--dir]`;
   - `npm run desktop:build:all [-- --dir]`.
4. Clipboard opt-in melalui `app.manifest.json` dan thin package scripts. Package Clipboard tidak lagi memiliki Electron dependency, main/preload, atau electron-builder config.
5. Renderer desktop dibangun dengan asset relatif langsung ke temporary staging di luar npm workspace. Ini mencegah dependency production root ikut masuk ke `app.asar`.
6. Dev launcher memakai stable port dari `config/app-ports.lock.json` dan membersihkan `ELECTRON_RUN_AS_NODE` hanya dari child environment.
7. Data Electron diisolasi per app ID. Clipboard memakai `%APPDATA%\Dhepil Suite Apps\clipboard`.
8. Source contract dan prosedur app baru didokumentasikan di `PLAYBOOK.md`, `AGENTS.md`, dan `electron/README.md`.
9. Artifact generated lama `apps/clipboard/dist-electron` sudah dikeluarkan dari folder app dan digantikan oleh clean release terpusat; tidak ada lagi output Electron di folder app.

## Artifact Terverifikasi

```text
electron/release/clipboard/
├─ Clipboard-Setup-0.1.0.exe
├─ Clipboard-Setup-0.1.0.exe.blockmap
└─ win-unpacked/Clipboard.exe
```

- Installer NSIS x64: PASS.
- Packaged `Clipboard.exe`: hidup, responsive, dan membuka window `Clipboard App`.
- Isolasi userData `Dhepil Suite Apps\clipboard`: PASS.
- Sandboxed preload CommonJS: PASS; stderr smoke test kosong.
- Cleanup smoke process: PASS, tidak ada proses tersisa.
- `app.asar`: hanya 11 entry main/preload/renderer/package; tidak membawa `node_modules`.
- SHA256 installer: `D08A00F800BDEED4D29B45BC7558D912334AFBB4FAB5B518E79EC40EB924D7A4`.

## Validation Aktual

- `node --check electron/scripts/desktop.mjs`: PASS.
- `node --check electron/scripts/install-electron.cjs`: PASS.
- `npm run typecheck`: PASS, termasuk Electron workspace.
- `npm run test -- scripts/project-discovery.test.ts --maxWorkers=2`: PASS, 4/4.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npx --yes antd lint src --format json`: PASS, 0 issue.
- `npm audit --omit=dev`: PASS, 0 vulnerability production.
- `npm run format:check`: belum PASS karena 11 file UI/plan WIP yang sudah ada dan berada di luar scope Electron.
- Full `npm run test -- --maxWorkers=2`: 98 PASS, 1 FAIL. Test lama `project-manager.test.ts` mengasumsikan port 2000 kosong, sementara server user sedang aktif di port 2000. Server tersebut tidak dihentikan.

## Warning

- Build renderer memberi warning chunk lebih dari 500 kB; non-blocking dan bukan kegagalan Electron.
- `npm install` melaporkan 16 high-severity vulnerability pada dependency development transitive. Tidak dijalankan `npm audit fix --force`.
- Working tree masih memiliki WIP UI/theme milik user. Perubahan tersebut dipertahankan dan tidak diformat atau di-reset.

## Fokus Selanjutnya

Untuk app baru, selesaikan renderer Vite, stable port, manifest desktop, dan dua thin scripts. Tidak perlu menambah dependency atau konfigurasi Electron. Jalankan unpacked build sebagai smoke test sebelum installer penuh.
