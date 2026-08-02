# Implementation Ledger — Workspace Consolidation

> **Status:** COMPLETE pada 2026-08-01. File ini mencatat pekerjaan konsolidasi yang sudah dijalankan; bukan sumber keputusan arsitektur baru.

> **Addendum app baru:** Setelah ledger ini selesai, release automation menjadi kontrak canonical. Semua app baru mewarisi `apps/AGENTS.md` dan wajib mengikuti `PLAYBOOK.md` Sections 4, 10, dan 11; jangan membuat workflow version/changelog manual dari isi historis ledger ini.

## Objective

Mengaudit seluruh tracked/untracked WIP, mempertahankan perubahan yang benar, memperbaiki blocker validation, dan membuat checkpoint commit kecil tanpa push atau destructive Git operation.

## Completed Work

1. Ownership Clipboard didokumentasikan di app-level `AGENTS.md`.
2. Test process manager tidak lagi bergantung pada fixed port `2000` yang dapat sedang dipakai user.
3. Formatting debt pada engine Clipboard diselesaikan tanpa mengubah behavior.
4. Shared Ant Design theme dipusatkan dengan provider, toggle, persistence, tests, dan integrasi root/app.
5. Header memperoleh slot `extra` yang kecil; usulan refactor Header generik penuh dibatalkan karena tidak diperlukan dan berisiko memindahkan logic ke screen.
6. Action/card layout control center diperbaiki agar tidak saling menimpa pada fluid desktop width.
7. `PLAYBOOK.md`, root/app ownership docs, dan Electron documentation disinkronkan dengan struktur aktual.
8. Dua draft browser launcher dikonsolidasikan menjadi satu `browser-plan.md`; implementasi browser launcher belum dimulai.

## Checkpoints

```text
e84ac0b docs(clipboard): add app ownership guardrails
68c04ab test: stabilize local validation baseline
4dfba07 feat(ui): centralize shared Ant Design theme
fde197f fix(ui): contain grid card actions
6d89b66 docs: sync architecture and desktop playbook
94bb5e7 docs(browser): add standalone launcher implementation plan
```

## Validation Contract

Final consolidation gate:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test -- --maxWorkers=2
npm run build
npx --yes antd lint . --format json
```

Expected recorded result: seluruh command PASS; test 21 files / 104 tests; Ant Design lint 0 issue; hanya warning bundle chunk >500 kB. Browser visual QA tetap `NOT RUN` bila browser-control runtime tidak tersedia.

## Remaining Work

Tidak ada source WIP yang sengaja ditinggalkan oleh konsolidasi ini. Pekerjaan produk berikutnya harus memakai plan kanonisnya sendiri:

- browser launcher: mulai `browser-plan.md` Fase 0;
- app baru: ikuti `apps/AGENTS.md` serta `PLAYBOOK.md` Sections 4 dan 11;
- app desktop baru: tambahkan `PLAYBOOK.md` Section 10, lalu release version secara otomatis sebelum installer final;
- dependency vulnerability remediation: audit terpisah, jangan memakai forced upgrade sebagai bagian cleanup umum.

File ini tidak mengotorisasi implementasi fase browser launcher atau perubahan source app berikutnya.
