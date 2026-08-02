# Apps Workspace Rules

Aturan ini berlaku otomatis untuk setiap direct child `apps/<id>/`, termasuk app baru yang belum mempunyai `AGENTS.md` lokal. Root `AGENTS.md` dan `PLAYBOOK.md` tetap authoritative; file app-level hanya boleh menambah aturan khusus app tanpa melemahkan kontrak ini.

## New App Contract

- Buat app hanya sebagai direct child `apps/<id>/`; ID harus lowercase kebab-case dan sama dengan `app.manifest.json#id`.
- Mulai `package.json#version` dari `0.1.0`, tetapi jangan menaikkannya manual setelah itu.
- Sediakan minimal manifest valid, package workspace dengan script `dev`, konfigurasi Vite/TypeScript, entry React, dan `AGENTS.md` lokal yang menyatakan ownership app.
- Gunakan Ant Design 6 untuk primitive UI yang tersedia dan pertahankan business logic di dalam ownership app.
- App dilarang meng-import source root control center, source app lain, atau dependency Electron langsung.
- Electron hanya diaktifkan melalui metadata manifest dan thin scripts sesuai `PLAYBOOK.md` Section 10.

## Automatic Release Contract

- Version, `CHANGELOG.md`, release commit, dan tag dimiliki tooling root `tooling/release/`.
- Jangan membuat, mengedit, atau menjadwalkan bump version/changelog secara manual. `CHANGELOG.md` boleh belum ada ketika app dibuat; tooling membuat baseline pada release pertama.
- Commit source app terlebih dahulu sampai working tree bersih, lalu gunakan `npm run release:check` dan `npm run release:app -- <id>` dari root.
- Gunakan `--include-electron` hanya jika perubahan shared `electron/` memang harus masuk impact release app desktop.
- Packaging Electron bukan release dan tidak menaikkan version. Jalankan smoke build/installer secara terpisah setelah release version yang dimaksud tersedia.
- Tooling release tidak pernah push. Jangan mengganti tag otomatis dengan tag manual.

Checklist lengkap pembuatan app berada di `PLAYBOOK.md` Section 4; packaging desktop di Section 10; policy version/changelog di Section 11.
