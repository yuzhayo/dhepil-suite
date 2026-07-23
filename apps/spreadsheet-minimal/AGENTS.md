# Spreadsheet Minimal App Ownership

Folder ini dimiliki app `spreadsheet-minimal`. Port ditetapkan dan dikunci oleh root
control center.

- Jangan mengubah root control center atau `apps/dhepil` dari pekerjaan app ini.
- Pertahankan `app.manifest.json` sebagai kontrak discovery publik app.
- Sediakan script `dev` yang menerima argumen Vite `--host`, `--port`, dan `--strictPort`.
- Jika Electron ditambahkan, sediakan script `desktop:dev` di package app ini.
- Pertahankan arsitektur feature-oriented dan aturan parent-child app.
