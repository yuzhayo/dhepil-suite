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
