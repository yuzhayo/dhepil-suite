# Tampermonyet App Rules

Folder ini dimiliki oleh app `tampermonyet` dan mengikuti root `AGENTS.md` serta `PLAYBOOK.md`.

- `tampermonkey/` adalah arsip source lama di dalam app ini. Jangan mengimpornya langsung ke
  runtime atau memasukkannya ke validation root.
- Module userscript hanya boleh masuk ke `public/require/` melalui perubahan eksplisit dan bertahap.
- Pertahankan entry app sebagai composition root kecil; logic host/module berada di feature pemiliknya.
- Gunakan Ant Design 6 untuk primitive UI yang tersedia.
- App ini web-only. Jangan menambahkan Electron dependency, main, atau preload.
- Version, changelog, commit release, dan tag tetap dimiliki tooling release root.
