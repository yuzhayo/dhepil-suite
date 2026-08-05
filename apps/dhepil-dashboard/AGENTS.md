# Dhepil Dashboard App Ownership

Aturan parent `apps/AGENTS.md` dan `PLAYBOOK.md` berlaku penuh.

Folder ini dimiliki app `dhepil-dashboard`. Desktop packaging belum aktif (`desktop.enabled: false`).

## Batas kepemilikan

- Jangan mengubah root control center atau source app lain dari pekerjaan app ini.
- Jangan meng-import business logic app lain (termasuk `apps/agentrouter_dashboard`). Code yang dipakai bersama harus di-copy ke `shared/`, bukan di-import lintas app.
- Pertahankan `app.manifest.json` sebagai kontrak discovery.
- Visual reusable generic tetap dimiliki root `ui/`. `shared/ui/` di app ini hanya untuk komponen yang reusable antar provider di dalam app ini saja.
- Version dan `CHANGELOG.md` dimiliki automation root. Gunakan `npm run release:app -- dhepil-dashboard`.

## Aturan gate file (kontrak inti app ini)

UI dan logic **tidak saling kenal**. Satu-satunya penghubung adalah gate file JSON.

- Gate file berada di `src/<provider>/data.json`.
- Logic (Python) hanya boleh **menulis** gate file. Tidak pernah dipanggil langsung oleh UI.
- UI (React) hanya boleh **membaca** gate file. Tidak pernah memanggil API provider langsung.
- Schema gate file didokumentasikan di `docs/GATE_CONTRACT.md`. Perubahan schema wajib update docs itu dulu.
- Logic wajib tulis atomik (temp file lalu rename) supaya UI tidak pernah membaca file setengah jadi.
- Logic wajib tetap menulis gate file saat gagal, dengan `status: "error"` dan `error_message` terisi. Jangan tinggalkan data lama tanpa penanda.
- UI wajib memvalidasi field wajib sebelum render, dan menampilkan peringatan bila data stale.

## Pembagian logic

- `shared/logic/lib/` = generic, tidak tahu provider apa pun (http helper, gate writer, validasi angka, logger).
- `src/<provider>/` = provider-specific (endpoint, auth, mapping field response ke schema gate).
- Data spesifik akun (user id, token, path, selector) hanya di file config/user data, jangan hardcode di source.
- Rahasia (cookie, token, storage state) tidak masuk git.
