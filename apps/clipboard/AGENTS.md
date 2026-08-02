# Clipboard App Ownership

Aturan parent `apps/AGENTS.md` berlaku penuh.

Folder ini dimiliki app `clipboard`. Stable port-nya `2002` dan desktop packaging sudah aktif.

- Jangan mengubah root control center atau source app lain dari pekerjaan app ini.
- Pertahankan `app.manifest.json` sebagai kontrak discovery dan metadata desktop publik.
- Pertahankan thin scripts `desktop:dev` dan `desktop:build` yang mendelegasikan ke shared toolchain.
- Jangan menambahkan dependency Electron, field `main`, main/preload, atau electron-builder config ke package app.
- Business logic Clipboard berada di `src/engine/`; Gate menghubungkannya ke generic CoreUI.
- Visual reusable tetap dimiliki root `ui/`, terutama `ui/data-grid/`.
- Perubahan kontrak desktop lintas app harus dilakukan di `electron/` sesuai `PLAYBOOK.md` Section 10, bukan diduplikasi di app ini.
- Version dan `CHANGELOG.md` dimiliki automation root. Jangan bump, edit, atau membuat release task manual; gunakan `npm run release:app -- clipboard` dari root.
