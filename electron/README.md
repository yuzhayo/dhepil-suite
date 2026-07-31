# Shared Electron Runtime

Folder ini adalah implementasi desktop terpusat Dhepil Suite. Sumber kebenaran arsitektur tetap [`../PLAYBOOK.md`](../PLAYBOOK.md#10-electron-desktop-packaging).

## Prinsip

- Satu dependency/runtime Electron untuk development seluruh monorepo.
- Main process dan preload bersifat generik, tanpa business logic app.
- App opt-in melalui `apps/<id>/app.manifest.json` dan thin package scripts.
- Build menghasilkan artifact standalone per app di `release/<id>/`.
- Renderer selalu dibangun dengan base relatif agar asset bekerja melalui `file://`.
- Temporary staging berada di OS temp supaya dependency root tidak ikut masuk ke `app.asar`.

## Struktur

```text
electron/
├─ main/index.ts
├─ preload/index.cts
├─ scripts/
│  ├─ desktop.mjs
│  └─ install-electron.cjs
├─ icon.png
├─ package.json
├─ tsconfig.json
├─ dist/                 # generated, ignored
└─ release/<app-id>/     # generated, ignored
```

## Command

```bash
# Development satu app
npm run desktop:dev -- clipboard

# Installer NSIS satu app
npm run desktop:build -- clipboard

# Unpacked smoke build
npm run desktop:build -- clipboard --dir

# Semua app yang desktop.enabled = true
npm run desktop:build:all
npm run desktop:build:all -- --dir
```

Alias yang sama tersedia dari package app:

```bash
npm run desktop:dev --workspace @dhepil-suite/clipboard
npm run desktop:build --workspace @dhepil-suite/clipboard
```

## Menambahkan App Desktop

1. Pastikan app Vite sudah valid dan memiliki stable port.
2. Aktifkan `desktop.enabled` di manifest.
3. Tambahkan script `desktop:dev` dan `desktop:build` yang mendelegasikan ke `scripts/desktop.mjs`.
4. Jalankan unpacked build terlebih dahulu.
5. Setelah smoke test lulus, buat installer penuh.

Jangan menambahkan Electron, electron-builder, main process, preload, atau build config ke package app.

## Output Clipboard Saat Ini

```text
electron/release/clipboard/
├─ Clipboard-Setup-0.1.0.exe
├─ Clipboard-Setup-0.1.0.exe.blockmap
└─ win-unpacked/
   └─ Clipboard.exe
```

Output di-ignore Git dan aman diregenerasi. Satu toolchain menghemat dependency development, tetapi tiap installer standalone tetap membawa runtime Electron sendiri.
