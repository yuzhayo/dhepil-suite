# Plan: Pemisahan Daily Refresh Flow + Multi-Account

## Goal
Pisahkan daily refresh code flow supaya reusable untuk multi-akun. Satu flow yang sama dipakai untuk semua akun AgentRouter (dan nanti OpenRouter). Tidak perlu buat flow sendiri-sendiri per akun.

## Prinsip
- Satu flow, banyak akun - caller loop akun, flow tetap sama
- Parameterized - semua function terima dict settings, tidak load internal
- Fail loudly - error harus kelihatan, bukan silent failure
- Gate file per akun - satu akun = satu data-ACCOUNT_ID.json

## Struktur Baru
  src/agentrouter/
  |- config.json              # setting shared (URL, timeout, selector)
  |- accounts.json            # daftar akun: [{id, label}, ...]
  |- akun1/                   # subfolder per akun
  |   |- user_data.json       # kredensial (gitignored)
  |   |- storage_state.json   # Playwright session (gitignored)
  |   |- cookies.json         # refreshed cookies (gitignored)
  |   |- data.json            # gate file untuk akun ini
  |   +- log.txt
  +- akun2/
      +- ...

## Step Implementasi

### Step 1: Buat accounts.json
- File baru: src/agentrouter/accounts.json
- Format: [{id: akun1, label: Akun Utama}, ...]
- Minimal 1 akun default

### Step 2: Buat session.py (pecah dari auth.py)
- File baru: src/agentrouter/logic/session.py
- Fungsi: load_cookies(settings) -> list[dict]
- Fungsi: save_cookies(settings, cookies)
- Fungsi: build_auth_header(settings) -> dict
- Tidak ada Playwright di sini - murni file I/O

### Step 3: Buat browser.py (pecah dari auth.py)
- File baru: src/agentrouter/logic/browser.py
- Fungsi: interactive_setup_login(settings) (dari auth.py)
- Fungsi: automated_refresh_session(settings) (dari auth.py)
- auth.py jadi wrapper tipis atau dihapus

### Step 4: Buat daily.py (orkestrator baru)
- File baru: src/agentrouter/logic/daily.py
- Fungsi: run_daily(settings) - parameterized
- Flow: refresh auth -> fetch data -> write gate
- Semua exit path tulis gate file (sukses atau gagal)

### Step 5: Update settings.py
- Load accounts.json
- Fungsi: load_account_settings(account_id) -> dict
- Gabung config.json + ACCOUNT_ID/user_data.json
- Resolve semua path ke subfolder akun

### Step 6: Update pipeline.py
- Pastikan run_once(settings) sudah parameterized
- Gate file output: data-ACCOUNT_ID.json

### Step 7: Update scripts
- scripts/agentrouter_refresh.py - loop akun, panggil browser.automated_refresh_session
- scripts/agentrouter_fetch.py - loop akun, panggil pipeline.run_once
- Script baru: scripts/agentrouter_daily.py - loop akun, panggil daily.run_daily

### Step 8: Update UI
- shared/ui/useGate.ts - load semua data-*.json, bukan cuma data.json
- shared/ui/GatePanel.tsx - render list akun, tampilkan data per akun
- Tampilkan account_label dari gate file

### Step 9: Update docs
- GATE_CONTRACT.md - schema v2 dengan account_id + account_label
- AGENT_CONTEXT.md - update struktur folder baru
- Tambah contoh accounts.json di docs

### Step 10: Testing
- Test dengan 1 akun dulu (backward compatible)
- Test dengan 2 akun (multi-account)
- Test error path: auth gagal, fetch gagal
- Test gate file: setiap exit path tulis file

## Status
- [x] Plan dibuat
- [ ] Step 1: accounts.json
- [ ] Step 2: session.py
- [ ] Step 3: browser.py
- [ ] Step 4: daily.py
- [ ] Step 5: settings.py
- [ ] Step 6: pipeline.py
- [ ] Step 7: scripts
- [ ] Step 8: UI
- [ ] Step 9: docs
- [ ] Step 10: testing
