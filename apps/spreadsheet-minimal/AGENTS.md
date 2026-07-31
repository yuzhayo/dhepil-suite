# Spreadsheet Minimal App Ownership

Folder ini dimiliki app `spreadsheet-minimal`. Port ditetapkan dan dikunci oleh root
control center.

- Jangan mengubah root control center atau `apps/dhepil` dari pekerjaan app ini.
- Pertahankan `app.manifest.json` sebagai kontrak discovery publik app.
- Sediakan script `dev` yang menerima argumen Vite `--host`, `--port`, dan `--strictPort`.
- Electron saat ini disabled. Jika diaktifkan, ikuti `PLAYBOOK.md` Section 10: ubah metadata manifest dan tambahkan thin scripts `desktop:dev` + `desktop:build`.
- Jangan menambahkan dependency Electron, main/preload, atau electron-builder config ke app ini.
- Pertahankan arsitektur feature-oriented dan aturan parent-child app.
