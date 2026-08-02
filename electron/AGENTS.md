# Shared Electron Runtime Rules

Aturan root `AGENTS.md` dan `PLAYBOOK.md` tetap berlaku.

- Folder ini hanya memiliki desktop shell, preload bridge, dependency, cache installer, dan build orchestration generik.
- Dilarang meng-import source atau business logic dari `apps/<id>/`.
- Renderer app hanya boleh dibaca sebagai build input melalui manifest/path yang tervalidasi.
- Jangan membuat konfigurasi Electron per app di folder ini; metadata spesifik app tetap di `apps/<id>/app.manifest.json`.
- Semua target delete/reset harus berada tepat di generated `electron/dist/`, `electron/release/<id>/`, atau temporary stage yang dibuat sendiri.
- Jangan mengubah stable port; dev desktop membaca `config/app-ports.lock.json`.
- Jangan mengubah system environment. `ELECTRON_RUN_AS_NODE` hanya boleh dibuang dari environment child process.
- Artifact `dist/` dan `release/` tidak boleh di-commit.
- Desktop build hanya membaca version app. Dilarang menambahkan auto-bump, changelog writer, Git commit/tag, atau push ke orchestrator Electron.
- Version/changelog app baru tetap dimiliki `tooling/release/` sesuai `apps/AGENTS.md` dan `PLAYBOOK.md` Section 11; sertakan `--include-electron` hanya saat perubahan shared Electron memang relevan.
