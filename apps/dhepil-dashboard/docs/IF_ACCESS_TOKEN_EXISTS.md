# Runbook: Migrasi ke Access Token (baca ini kalau AgentRouter punya token permanen)

> **Untuk siapa dokumen ini:** agent/asisten AI (atau siapa pun) yang ditugaskan
> melanjutkan project `agentrouter_dashboard` setelah user menemukan Access
> Token / System Token di halaman Personal Settings AgentRouter.
>
> **Baca `docs/AGENT_CONTEXT.md` dulu** kalau belum familiar dengan struktur
> project ini secara keseluruhan — dokumen ini asumsinya kamu sudah paham
> konteks dasar (arsitektur `lib/` vs `user_data.json`, dst).
>
> **Prasyarat sebelum mengerjakan apa pun di sini:** user harus sudah
> memberikan minimal 4 hal (lihat "Input yang dibutuhkan" di bawah). Kalau
> belum lengkap, TANYAKAN ke user dulu, jangan menebak.

---

## 1. Konteks project (baca dulu biar paham situasi)

- Project ini adalah dashboard lokal yang sinkron balance/usage dari akun
  AgentRouter (panel berbasis New-API) milik user.
- Versi SEKARANG pakai autentikasi **cookie session + Playwright browser
  automation** (lihat `lib/auth.py`, `setup_login.py`, `refresh_cookie.py`)
  karena user login pakai GitHub OAuth tanpa password statis, jadi cookie
  perlu di-refresh berkala dengan cara "pura-pura login" pakai sesi GitHub
  yang tersimpan.
- Kalau ternyata AgentRouter punya **Access Token permanen**, seluruh
  kerumitan di atas (Playwright, refresh cookie, dependency ke sesi GitHub)
  **tidak dibutuhkan lagi**. Tugas dokumen ini: memandu migrasi ke pendekatan
  yang jauh lebih sederhana itu.
- Struktur project modular: `user_data.json` = data spesifik akun user,
  `config.json` = setting stabil, `lib/` = logic murni. Prinsip ini
  **HARUS tetap dipertahankan** setelah migrasi — jangan hardcode data akun
  user ke dalam file `lib/*.py`.

Referensi lain yang wajib dibaca sebelum mengerjakan:
- `docs/API_FINDINGS.md` — detail endpoint, field response, rumus konversi quota ke dollar (rumus ini TETAP BERLAKU, tidak berubah oleh migrasi token)
- `lib/api_client.py` — kode yang akan diedit
- `lib/auth.py`, `setup_login.py`, `refresh_cookie.py` — kode yang akan dihapus

---

## 2. Input yang dibutuhkan dari user SEBELUM mulai kerja

Jangan mulai edit kode sebelum user memberi jawaban untuk ke-4 hal ini
(screenshot halaman token + contoh token boleh disensor sebagian karakter
tengahnya):

1. **Bentuk token** — contoh formatnya seperti apa (mis. `sk-xxxxx`, UUID, string acak panjang tertentu)
2. **Nama header yang dipakai untuk kirim token** — cek dengan cara:
   - Kalau ada halaman "test API" atau contoh curl di UI-nya, lihat langsung di situ, ATAU
   - Generate token, lalu coba hit `GET /api/user/self` pakai token itu di header `Authorization: Bearer <token>` via Postman/curl/browser DevTools > cek response-nya sukses atau 401
   - Kemungkinan besar formatnya `Authorization: Bearer <token>` (konvensi umum), tapi WAJIB diverifikasi, jangan asumsi
3. **Apakah token punya expiry** — ada tanggal kadaluarsa atau permanen sampai di-revoke manual?
4. **Apakah header `New-Api-User` tetap wajib dikirim bareng token** — coba request tanpa header itu, kalau tetap sukses berarti tidak wajib lagi

Kalau salah satu dari ini belum ada jawabannya, **TANYA ke user**, jangan
lanjut ke bagian 3.

---

## 3. Langkah eksekusi (setelah input di atas lengkap)

### 3.1 Update `user_data.json`

Hapus field yang sudah tidak relevan, tambah field token:

```json
{
  "auth": {
    "access_token": "ISI_DARI_USER_DI_SINI",
    "auth_header_name": "Authorization",
    "auth_header_prefix": "Bearer "
  },
  "quota": {
    "quota_per_unit": 500000
  }
}
```

Hapus: `new_api_user_id` (kecuali user konfirmasi di poin 2.4 masih wajib —
kalau begitu, PERTAHANKAN field ini), `github_login_button_selector`.
Hapus juga blok `windows.project_path` KALAU `setup_task_scheduler.ps1`
juga ikut disederhanakan (lihat 3.5) — kalau task scheduler tetap dipakai
untuk jadwalkan `fetch_balance.py` harian, field ini tetap dibutuhkan.

### 3.2 Edit `lib/api_client.py`

Ganti fungsi `fetch_self()`. Sebelum:

```python
def fetch_self(settings):
    cookie_header = _load_cookie_header(settings["cookies_file"])
    headers = {
        "Cookie": cookie_header,
        "New-Api-User": str(settings["new_api_user_id"]),
        "Accept": "application/json, text/plain, */*",
    }
    resp = requests.get(settings["api_self_endpoint"], headers=headers, timeout=settings["api_request_timeout_s"])
    resp.raise_for_status()
    return resp.json()
```

Sesudah (sesuaikan nama header persis dengan hasil verifikasi user di poin 2.2):

```python
def fetch_self(settings):
    headers = {
        settings["auth_header_name"]: f"{settings['auth_header_prefix']}{settings['access_token']}",
        "Accept": "application/json, text/plain, */*",
    }
    resp = requests.get(settings["api_self_endpoint"], headers=headers, timeout=settings["api_request_timeout_s"])
    resp.raise_for_status()
    return resp.json()
```

Hapus fungsi `_load_cookie_header()` kalau sudah tidak dipakai di mana pun lagi.

**JANGAN UBAH** fungsi `parse_self_response()` — rumus konversi quota tidak
terkait dengan metode autentikasi, tetap sama.

### 3.3 Update `lib/loader.py`

Tambah field baru di `load_settings()` yang membaca dari `user_data.json`:
```python
"access_token": user_data["auth"]["access_token"],
"auth_header_name": user_data["auth"]["auth_header_name"],
"auth_header_prefix": user_data["auth"]["auth_header_prefix"],
```
Hapus baris yang baca `github_login_button_selector` dan (kalau tidak
dipakai lagi) `new_api_user_id`, `storage_state_file`, `cookies_file`.

### 3.4 Hapus file-file ini sepenuhnya

- `lib/auth.py`
- `setup_login.py`
- `refresh_cookie.py`
- Baris `playwright==...` di `requirements.txt`

### 3.5 Sederhanakan `run_daily.py`

Sebelum: subprocess `refresh_cookie.py` lalu `fetch_balance.py`.
Sesudah: langsung panggil `fetch_balance.py` saja (via subprocess atau
langsung import fungsinya) — tidak ada lagi tahap refresh.

### 3.6 Update `config.json`

Field `login_url` dan `console_url` di bawah `urls` kemungkinan sudah
tidak dipakai lagi. Cek dulu apakah masih direferensikan di kode lain
sebelum dihapus (`grep -rn "login_url\|console_url" .` dari root project).

### 3.7 Update `.gitignore`

Hapus baris `storage_state.json` dan `cookies.json` (file itu tidak akan
pernah ada lagi). **Tambahkan** peringatan bahwa `user_data.json` sendiri
sekarang berisi rahasia (`access_token`) — pertimbangkan pisahkan token ke
file terpisah `secrets.json` yang di-gitignore, supaya `user_data.json`
(yang berisi banyak field non-rahasia lain) tetap aman untuk dilihat orang
lain kalau perlu, sementara `secrets.json` benar-benar privat. Ini opsional,
tanyakan preferensi user.

### 3.8 Update `README.md` dan `docs/API_FINDINGS.md`

- README: hapus seluruh bagian yang menyebut `setup_login.py`,
  `refresh_cookie.py`, Playwright, storage state. Ganti langkah setup jadi:
  isi `access_token` di `user_data.json`, langsung `python fetch_balance.py`.
- API_FINDINGS.md: tambahkan section baru "Access Token" berisi hasil
  temuan poin 2.1-2.4 di atas (format token, nama header, expiry, status
  `New-Api-User`), supaya jadi source of truth juga untuk migrasi ini.

---

## 4. Verifikasi setelah migrasi selesai

Checklist sebelum menganggap migrasi selesai:

- [ ] `python fetch_balance.py` jalan sukses tanpa perlu `refresh_cookie.py` sama sekali
- [ ] `dashboard.html` ter-generate dengan angka balance yang benar (cocokkan manual sekali ke dashboard resmi AgentRouter)
- [ ] Tidak ada lagi referensi ke `playwright`, `storage_state`, `cookies_file` di kode manapun (`grep -rn "playwright\|storage_state\|cookies_file" .`)
- [ ] `access_token` tidak ter-commit ke git kalau user pakai git (`git status` harus tidak menunjukkan file yang berisi token sebagai tracked/staged)
- [ ] README mencerminkan alur baru yang lebih sederhana

---

## 5. Yang TIDAK berubah (supaya tidak dikerjakan ulang tanpa perlu)

- Rumus konversi `raw_value / quota_per_unit` — tetap valid
- `lib/dashboard.py`, `dashboard_template.html` — tidak tersentuh sama sekali
- Endpoint `/api/user/self` — tetap sama (hanya ini yang dipakai kode)
- Struktur folder `lib/` sebagai prinsip modular — dipertahankan, hanya isinya yang menyusut
