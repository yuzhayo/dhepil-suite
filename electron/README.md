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

Panduan canonical dan troubleshooting lengkap berada di [`PLAYBOOK.md` Section 10](../PLAYBOOK.md#10-electron-desktop-packaging).

### 1. Pastikan app siap

App harus berupa direct child `apps/<id>/` dengan:

- `app.manifest.json`;
- `package.json`;
- `tsconfig.json`;
- `vite.config.ts`;
- renderer Vite yang lulus typecheck;
- stable port di `config/app-ports.lock.json` untuk desktop dev.

### 2. Aktifkan manifest

```json
{
  "schemaVersion": 1,
  "id": "my-new-app",
  "name": "My New App",
  "runtime": "vite",
  "desktop": {
    "enabled": true,
    "script": "desktop:dev",
    "appId": "com.dhepil.my.new.app",
    "productName": "My New App"
  }
}
```

`appId` dan `productName` dapat dihilangkan untuk memakai default. Tambahkan `"icon": "assets/icon.png"` hanya jika app memiliki icon sendiri; path harus tetap berada di folder app.

### 3. Tambahkan thin scripts

```json
{
  "scripts": {
    "desktop:dev": "node ../../electron/scripts/desktop.mjs dev my-new-app",
    "desktop:build": "node ../../electron/scripts/desktop.mjs build my-new-app"
  }
}
```

### 4. Validasi berurutan

```bash
npm run typecheck --workspace @dhepil-suite/my-new-app
npm run desktop:dev -- my-new-app
npm run desktop:build -- my-new-app --dir
npm run desktop:build -- my-new-app
```

Periksa executable unpacked sebelum membuat installer final. Build berikutnya membersihkan seluruh `release/<app-id>/`, jadi jangan menyimpan file manual di sana.

Jangan menambahkan Electron, electron-builder, main process, preload, atau build config ke package app.

## Current Desktop Apps

| App                   | Port   | Desktop  |
| --------------------- | ------ | -------- |
| `clipboard`           | `2002` | Enabled  |
| `dhepil`              | `2000` | Disabled |
| `spreadsheet-minimal` | `2001` | Disabled |

## Output Clipboard Saat Ini

```text
electron/release/clipboard/
├─ Clipboard-Setup-0.1.0.exe
├─ Clipboard-Setup-0.1.0.exe.blockmap
└─ win-unpacked/
   └─ Clipboard.exe
```

Output di-ignore Git dan aman diregenerasi. Satu toolchain menghemat dependency development, tetapi tiap installer standalone tetap membawa runtime Electron sendiri.
