# Agent Context — AgentRouter Dashboard Lokal

> **Baca file ini PERTAMA KALI** sebelum mengerjakan apa pun di project ini,
> siapa pun/apa pun kamu (Claude, Codex, agent lain, atau manusia yang mau
> cepat paham). File ini adalah peta project + state saat ini. Dokumen lain
> di `docs/` sifatnya lebih spesifik dan di-link dari sini.

---

## 1. Apa project ini

Dashboard lokal (HTML, jalan di PC user via Windows) yang menampilkan
balance, consumption, dan jumlah request dari akun AgentRouter milik user
(`https://agentrouter.org`, panel berbasis **New-API**). Data diambil lewat
API tidak resmi (reverse-engineered dari DevTools, bukan API publik yang
didokumentasikan AgentRouter), lalu ditampilkan ulang secara lokal supaya
user tidak perlu buka browser & login manual tiap kali mau cek saldo.

Ini automasi untuk **akun milik user sendiri** — bukan scraping akun orang
lain, bukan bypass proteksi apa pun selain menggantikan "buka browser
manual" dengan script.

## 2. State project SAAT INI (per dokumen ini ditulis)

| Aspek | Status |
|---|---|
| Metode autentikasi | **Cookie session + Playwright browser automation** (user login via GitHub OAuth, tidak punya password statis) |
| Access Token permanen | **Belum dicek** oleh user — kalau ternyata ada, lihat `docs/IF_ACCESS_TOKEN_EXISTS.md`, ini akan menggantikan seluruh pendekatan cookie |
| Rumus konversi quota ke USD | **Sudah terverifikasi**, lihat `docs/API_FINDINGS.md` |
| Header `New-Api-User` | Sudah dikonfirmasi wajib dikirim bareng cookie (untuk metode cookie-based) |
| Task Scheduler Windows | Sudah didesain (`setup_task_scheduler.ps1`), asumsinya jalan tiap 24 jam |
| Testing end-to-end di PC user | **Belum dikonfirmasi user sudah jalan sukses** — semua kode dibuat berdasarkan data yang user kirim dari DevTools, belum ada laporan "sudah jalan lancar di PC saya" |

**Kalau kamu agent yang melanjutkan project ini:** jangan asumsikan semua
kode di bawah ini sudah teruji jalan. Kalau user melapor error, cek dulu
apakah errornya konsisten dengan asumsi yang tertulis di `API_FINDINGS.md`
sebelum mengubah logic secara drastis.

## 3. Struktur file & tanggung jawab masing-masing

```
agentrouter_dashboard/
├── .gitignore
├── README.md
├── requirements.txt
├── user_data.json           # SATU-SATUNYA tempat data spesifik akun user (ID, selector, path, token kalau ada)
├── config.json               # Setting teknis stabil (URL, nama file, timeout) - jarang berubah
├── dashboard_template.html  # Template tampilan (placeholder {{BALANCE}}, dst)
│
├── lib/
│   ├── __init__.py            # Penanda folder ini package Python (kosong)
│   ├── loader.py               # Gabungkan config.json + user_data.json jadi satu dict settings
│   ├── auth.py                  # Playwright: login manual (setup) + refresh cookie (otomatis)
│   ├── api_client.py            # Fetch ke API AgentRouter + parse response jadi angka USD
│   ├── dashboard.py              # Generate dashboard.html dari template + data
│   └── logger.py                 # Logging seragam ke terminal + log.txt
│
├── setup_login.py             # Thin script, dijalankan user SEKALI (login manual pertama)
├── refresh_cookie.py          # Thin script, dijalankan otomatis (refresh cookie berkala)
├── fetch_balance.py           # Thin script, ambil data terbaru + update dashboard
├── run_daily.py                # Orkestrator: refresh_cookie -> fetch_balance, dengan logging
├── setup_task_scheduler.ps1   # Daftarkan run_daily.py ke Windows Task Scheduler (jalan sekali oleh user)
│
└── docs/
    ├── AGENT_CONTEXT.md                    # File ini
    ├── API_FINDINGS.md                     # Fakta hasil reverse-engineering API (endpoint, field, rumus konversi)
    ├── IF_ACCESS_TOKEN_EXISTS.md           # Runbook migrasi kalau ternyata ada Access Token permanen
    ├── REAL_BROWSER_REFRESH_FINDINGS.md    # Analisis risiko pakai Chrome asli sistem untuk refresh cookie
    ├── IF_REAL_BROWSER_REFRESH_NEEDED.md   # Runbook migrasi ke real browser refresh
    └── AGENT_PROMPT_GUIDE.md               # Panduan prompt untuk USER (bukan agent) agar tidak kena content-blocked
```

## 4. Prinsip arsitektur yang HARUS dipertahankan

Kalau kamu menambah fitur atau mengubah kode, ikuti aturan ini:

1. **Data spesifik akun user HANYA di `user_data.json`.** Jangan pernah
   hardcode user ID, selector, token, atau path ke dalam file `.py`.
2. **`lib/` berisi logic murni, generic.** Script di root (`setup_login.py`,
   dst) cuma "thin wrapper" yang manggil fungsi dari `lib/`, idealnya isinya
   cuma import + panggil fungsi + sedikit print. Kalau kamu nambah logic
   baru yang lumayan panjang, taruh di `lib/`, bukan langsung di script root.
3. **Rahasia (cookie, token) tidak pernah masuk git.** Selalu cek
   `.gitignore` ter-update setiap kali ada file baru yang berisi kredensial.
4. **Setiap klaim teknis (nama field API, rumus konversi, selector) harus
   berdasarkan bukti nyata** (screenshot/response yang user kirim), bukan
   asumsi/dugaan. Kalau terpaksa menebak karena user belum kasih data,
   TANDAI JELAS di kode/dokumentasi sebagai asumsi belum terverifikasi
   (lihat gaya penulisan di `API_FINDINGS.md` bagian "belum terverifikasi").
5. **Dokumentasi di `docs/` harus tetap sinkron dengan kode.** Kalau ubah
   struktur field/endpoint, update juga `API_FINDINGS.md` di bagian yang
   relevan — jangan biarkan dokumentasi basi.

## 5. Kapan baca dokumen mana

| Situasi | Baca ini |
|---|---|
| Mau paham gambaran besar project, baru pertama kali pegang | File ini (sudah kamu baca) |
| Butuh detail teknis API (field response, rumus konversi, selector) | `docs/API_FINDINGS.md` |
| User bilang "ternyata ada Access Token permanen" | `docs/IF_ACCESS_TOKEN_EXISTS.md` — ikuti langkahnya persis, termasuk bagian "input yang dibutuhkan dari user" sebelum mulai edit |
| User mau ganti mekanisme refresh cookie dari Playwright isolated browser ke Chrome asli sistem user (headless) | Baca `docs/REAL_BROWSER_REFRESH_FINDINGS.md` dulu (analisis risiko & trade-off), baru eksekusi sesuai `docs/IF_REAL_BROWSER_REFRESH_NEEDED.md` |
| User mau tahu cara mulai sesi baru dengan agent tanpa kena content-blocked | `docs/AGENT_PROMPT_GUIDE.md` — ini panduan untuk USER, bukan untuk agent baca sendiri saat kerja |
| User lapor script error/gagal | Cek `log.txt` dulu (kalau ada), lalu cocokkan dengan asumsi di `API_FINDINGS.md` bagian "belum terverifikasi" — kemungkinan besar akar masalahnya di situ |
| Mau nambah fitur baru (misal notifikasi Telegram kalau balance rendah) | Ikuti prinsip di Bagian 4 — taruh logic baru di `lib/`, data konfigurasinya di `user_data.json` |

## 6. Batasan & hal yang jangan dilakukan

- **Jangan** ubah `fetch_balance.py`/`lib/api_client.py` untuk menargetkan
  akun/user lain selain punya user sendiri. Scope project ini murni personal
  automation untuk 1 akun milik user.
- **Jangan** hapus dokumentasi "belum terverifikasi" di `API_FINDINGS.md`
  tanpa benar-benar mengujinya dulu — itu bukan sekadar catatan usang,
  tapi peringatan area rawan bug.
- **Jangan** commit `user_data.json` ke repository publik apa pun kalau
  sudah terisi token/data real — sarankan user pisahkan ke file terpisah
  yang di-gitignore kalau project ini nanti di-share/open source-kan.
