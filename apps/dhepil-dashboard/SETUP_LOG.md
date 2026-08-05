# Dhepil Dashboard - Setup Log

**Dibuat:** 2026-08-05
**Status:** Struktur & AgentRouter logic selesai. Belum pernah dijalankan end-to-end di PC Windows.

---

## Tujuan

Dashboard multi-provider (AgentRouter + OpenRouter) untuk monitoring balance & usage akun API pribadi. UI dan logic **tidak saling kenal** — satu-satunya penghubung adalah gate file JSON.

Kenapa dipisah: logic butuh Python (Playwright, requests) dan jalan terjadwal tanpa pengawasan; UI butuh React dan jalan saat dibuka user. Menyatukan keduanya berarti UI harus menunggu logic dan sebaliknya. Dengan gate file, dua sisi bisa dikerjakan dan diuji terpisah.

---

## Keputusan yang diambil

| Pertanyaan | Keputusan | Alasan |
|---|---|---|
| Lokasi gate file | `src/<provider>/data.json` | Terkumpul di folder provider-nya sendiri, jelas milik siapa saat provider bertambah |
| Nasib `agentrouter_dashboard` lama | Dibiarkan di tempatnya, kode di-**copy** bukan di-import | Aturan `apps/AGENTS.md`: app tidak boleh import source app lain |
| Stack UI | React 19 + Vite 8 + Antd 6 + TS, mengikuti pola `apps/clipboard` | Konsisten dengan app lain di suite, pakai `ui/theme/` root |
| Pembagian generic vs specific | Generic di `shared/`, provider-specific di `src/<provider>/` | Sesuai arahan; menghindari shared yang tahu detail satu provider |

---

## Struktur akhir

```
dhepil-dashboard/
├── app.manifest.json          # kontrak discovery control center
├── package.json               # v0.1.0
├── vite.config.ts             # + plugin gate file (lihat catatan di bawah)
├── tsconfig.json
├── index.html
├── requirements.txt           # requests, playwright
├── AGENTS.md                  # ownership + aturan gate file
│
├── docs/
│   └── GATE_CONTRACT.md       # ⭐ kontrak tunggal logic <-> UI
│
├── shared/                    # GENERIC — tidak tahu provider apa pun
│   ├── logic/lib/
│   │   ├── gate.py            # penulis gate file (atomic write)
│   │   ├── http.py            # GET JSON + kategorisasi kegagalan
│   │   ├── config.py          # baca config.json + user_data.json
│   │   ├── validate.py        # guard angka/tipe/field
│   │   └── logger.py          # (disalin dari app lama)
│   └── ui/
│       ├── gate.ts            # pembaca + validator gate file
│       ├── useGate.ts         # hook polling
│       └── GatePanel.tsx      # panel render semua state gate
│
├── src/
│   ├── App.tsx                # layout + dua panel provider
│   ├── main.tsx
│   ├── app/ApplicationProviders.tsx
│   ├── styles/global.css
│   │
│   ├── agentrouter/           # SPECIFIC
│   │   ├── AgentRouterGate.tsx
│   │   ├── config.json        # URL, nama file, timeout
│   │   ├── user_data.json.example
│   │   ├── .gitignore         # data.json, cookies, storage state, user_data
│   │   └── logic/
│   │       ├── settings.py    # flatten config utk AgentRouter
│   │       ├── api_client.py  # endpoint + mapping field + konversi USD
│   │       ├── auth.py        # Playwright login & refresh sesi
│   │       └── pipeline.py    # orkestrator: SELALU tulis gate file
│   │
│   └── openrouter/
│       └── OpenRouterGate.tsx # UI siap, logic belum ditulis
│
└── scripts/                   # thin wrappers
    ├── agentrouter_setup_login.py   # sekali, manual
    ├── agentrouter_refresh.py       # refresh sesi + fetch (utk scheduler)
    └── agentrouter_fetch.py         # fetch saja, tanpa browser
```

---

## Kontrak gate file (ringkas — lengkapnya di `docs/GATE_CONTRACT.md`)

```json
{
  "schema_version": 1,
  "provider": "agentrouter",
  "status": "ok",
  "last_updated": "2026-08-05T17:30:00+07:00",
  "data": { "balance": 174.63, "consumption": 200.37, "requests": 570 },
  "error": null
}
```

Saat gagal: `status: "error"`, `data: null`, `error: { code, message }`.

Kode error: `auth_invalid`, `network_error`, `response_shape_changed`, `config_invalid`, `unknown`.

**Catatan:** schema ini berbeda dari draft awal di log ini (yang datar, tanpa `schema_version`/`provider`/`data`). Diubah saat implementasi karena:
- `schema_version` — tanpa ini, UI dan logic bisa diam-diam tidak sinkron setelah salah satu diubah
- `provider` — deteksi kalau gate file salah folder
- `data` bersarang — memaksa `data: null` saat error, jadi tidak mungkin ada angka nyangkut dari run sebelumnya

---

## Prinsip yang dijaga di kode

Prioritas utama: **"gagal tidak kelihatan gagal" lebih berbahaya daripada crash.** Dashboard tak berpengawasan yang menampilkan angka salah dengan percaya diri lebih buruk daripada yang menampilkan error jelas.

Konsekuensinya di kode:

1. `pipeline.py` **selalu** menulis gate file di setiap jalur keluar. Tidak ada cabang yang membiarkan gate file lama tanpa penanda.
2. Tidak ada nilai default. Angka yang tidak lolos validasi jadi error, bukan `0` — user tidak bisa membedakan `$0.00` hasil bug dari saldo yang benar-benar habis.
3. `write_ok()` punya guard sendiri sebagai jaring terakhir; kalau angka tidak layak, pipeline menurunkannya jadi status error.
4. UI menolak render angka apa pun saat gate file invalid.
5. Stale detection (>25 jam) tampil sebagai peringatan walau `status: "ok"` — tanpa itu angka basi terlihat identik dengan angka segar.
6. `bool` ditolak eksplisit di semua validator, karena `bool` adalah subclass `int` di Python dan `True` akan diam-diam terhitung sebagai `1`.

---

## Catatan implementasi yang tidak terlihat dari struktur

**Plugin gate file di `vite.config.ts`.** Gate file ada di dalam `src/`, tapi tidak boleh di-import statis — kalau di-import, isinya ikut ter-bundle saat build dan angkanya beku selamanya. Plugin ini menyediakan URL `/gate/<provider>.json` yang membaca ulang dari disk tiap request (dev) dan menyalin ke `dist/gate/` (build), dengan header `no-store` supaya browser tidak meng-cache.

**`auth.py` raise, tidak return False.** Versi lama di `agentrouter_dashboard` mengembalikan `False` saat gagal. Diubah jadi raise `AuthError` karena return value memaksa setiap caller ingat memeriksanya — kalau lupa sekali saja, kegagalan lewat tanpa jejak.

**Path fallback di `pipeline.py`.** Kalau `load_settings()` sendiri yang gagal, kita belum tahu path gate file dari config. Path fallback dipakai supaya kegagalan config tetap sampai ke UI, bukan hilang di terminal.

---

## Verifikasi yang sudah dijalankan

| Cek | Hasil |
|---|---|
| `tsc --noEmit` untuk app ini | ✅ bersih |
| `python3 -m compileall` seluruh logic | ✅ bersih |
| Gate writer: tulis ok & error, normalisasi kode asing | ✅ |
| Gate writer: tolak negatif / bool / string / field kurang | ✅ 4/4 ditolak |
| Gate writer: tidak meninggalkan temp file | ✅ |
| Mapping response: angka asli yang sudah terverifikasi | ✅ balance 174.63, consumption 200.37, requests 570 — cocok dengan dashboard resmi |
| Mapping response: 7 skenario rusak | ✅ 7/7 ditolak dengan pesan actionable |

**Belum diverifikasi (butuh Windows):** Playwright login/refresh, request sungguhan ke API, `npm run dev`, dan tampilan UI di browser. Aku jalan di WSL dan tidak bisa menjalankan Vite maupun Playwright di sini.

---

## Yang belum dikerjakan

- [ ] Logic OpenRouter (UI-nya sudah siap, akan tampil "belum ada data")
- [ ] Scheduler Windows untuk `agentrouter_refresh.py`
- [ ] `docs/AGENTROUTER_API.md` — dirujuk dari `api_client.py` tapi belum dibuat (isinya: bukti rumus konversi & field response, dari `agentrouter_dashboard/docs/API_FINDINGS.md`)
- [ ] Registrasi port di control center (perlu `npm install` + Refresh dari root)

## Langkah berikutnya untuk user

1. `npm install` dari root suite (link workspace baru)
2. Copy `src/agentrouter/user_data.json.example` → `user_data.json`, isi data akun
3. `pip install -r apps/dhepil-dashboard/requirements.txt` lalu `playwright install chromium`
4. `python scripts/agentrouter_setup_login.py` (dari folder app, sekali saja)
5. `python scripts/agentrouter_refresh.py` — cek `src/agentrouter/data.json` terisi
6. `npm run dev` dari root, tekan Refresh di control center untuk alokasi port, lalu buka app-nya
