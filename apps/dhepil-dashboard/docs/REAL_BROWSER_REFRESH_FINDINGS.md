# Findings: Refresh Cookie via Real System Browser (Headless)

> Baca `docs/AGENT_CONTEXT.md` dulu kalau belum familiar dengan project ini.
> Dokumen ini pasangan dari `docs/IF_REAL_BROWSER_REFRESH_NEEDED.md` (runbook
> eksekusinya). File ini isinya fakta teknis + analisis trade-off, bukan
> langkah kerja.

---

## 1. Apa bedanya dengan pendekatan saat ini

**Pendekatan saat ini** (`lib/auth.py`, sudah jalan):
- Playwright buka browser **terisolasi** (profile kosong bawaan Playwright)
- Sesi login (termasuk GitHub) disimpan manual sekali ke `storage_state.json`
  lewat `setup_login.py`
- Browser terisolasi ini sama sekali terpisah dari Chrome yang user pakai
  sehari-hari — tidak menyentuh profile asli, cookie asli, password
  tersimpan, history, extension, dsb milik user

**Pendekatan alternatif ini** (real system browser):
- Playwright/automation langsung menjalankan **profile Chrome asli user**
  (folder `User Data` yang sama dipakai Chrome sehari-hari)
- Idenya: karena user sudah login GitHub di Chrome asli mereka, sesi itu
  otomatis "ketarik" tanpa perlu setup awal terpisah (`setup_login.py` jadi
  tidak wajib lagi)
- Bisa jalan headless (`headless=True`) sambil tetap memakai profile asli

## 2. Cara kerja teknis

Playwright punya API `launch_persistent_context()` (beda dari
`launch()` + `new_context()` yang dipakai pendekatan sekarang):

```python
context = playwright.chromium.launch_persistent_context(
    user_data_dir=CHROME_PROFILE_PATH,
    headless=True,
    channel="chrome",  # pakai Chrome asli yang terinstall, bukan Chromium bundling Playwright
)
```

`CHROME_PROFILE_PATH` di Windows biasanya:
```
C:\Users\<username>\AppData\Local\Google\Chrome\User Data
```
(Ini folder root — profile default ada di subfolder `Default`, profile
tambahan ada di `Profile 1`, `Profile 2`, dst. User perlu konfirmasi profile
mana yang dipakai kalau Chrome mereka multi-profile.)

## 3. Risiko & keterbatasan yang WAJIB diketahui sebelum implementasi

### 3.1 Chrome tidak boleh sedang terbuka dengan profile yang sama

Chrome mengunci folder profile-nya (`SingletonLock`) selagi ada instance
yang jalan. Kalau user lagi buka Chrome browsing biasa dan script otomatis
mencoba pakai profile yang sama, akan **error/gagal launch**, atau — lebih
berbahaya — Chrome bisa auto-restore/crash recovery yang tidak diinginkan.

**Implikasi:** kalau script ini dijadwalkan jalan otomatis (misal jam 3
pagi via Task Scheduler), user harus memastikan Chrome benar-benar tertutup
saat itu, atau script harus punya logic untuk deteksi/tutup paksa Chrome
dulu (berisiko: bisa menutup tab kerja user yang belum ke-save).

### 3.2 Akses jauh lebih luas dari yang dibutuhkan

Profile Chrome asli berisi **semua** cookie, saved password, history, dan
sesi login user — bukan cuma AgentRouter. Automation yang jalan di profile
ini secara teknis *bisa* mengakses semua itu, walau script yang kita tulis
cuma menyasar AgentRouter. Ini melanggar prinsip *least privilege*
(automation idealnya hanya punya akses ke apa yang benar-benar dibutuhkan).

**Bandingkan dengan pendekatan sekarang:** `storage_state.json` isinya
CUMA sesi yang sengaja disimpan user waktu `setup_login.py` (biasanya cuma
AgentRouter + GitHub OAuth token terkait). Jauh lebih terbatas.

### 3.3 Alternatif yang lebih aman: profile Chrome KHUSUS automation

Daripada pakai profile harian user, opsi lebih aman: buat **profile Chrome
baru khusus untuk automation ini** (`chrome://settings` → Add Profile, atau
lewat `--user-data-dir` custom saat Chrome pertama kali dijalankan manual).
User login GitHub SEKALI di profile khusus ini, lalu automation selalu pakai
profile ini secara headless.

**Ini secara efektif = pendekatan `storage_state.json` yang sudah ada**,
cuma medium penyimpanannya beda (folder profile Chrome asli vs file JSON
Playwright). Kalau user memang mau "profile real Chrome" (bukan Playwright
storage state) alasannya biasanya salah satu dari:
- Ingin sesekali browsing manual di profile itu juga (dual-purpose)
- Menghindari isu tertentu di `storage_state.json` (misal ada mekanisme
  deteksi otomasi yang lebih ketat kalau bukan pakai Chrome asli beneran)

Kalau alasannya bukan salah satu itu, **rekomendasikan user tetap pakai
`storage_state.json`** (pendekatan sekarang) karena lebih aman & sudah
terbukti jalan.

### 3.4 Deteksi otomasi (anti-bot)

Beberapa situs punya deteksi "headless browser" atau "automation" (lewat
fingerprinting `navigator.webdriver`, dsb). Kalau AgentRouter/GitHub punya
proteksi semacam ini, pakai Chrome asli dengan `channel="chrome"` (bukan
Chromium bundling Playwright) BISA membantu lolos deteksi lebih baik —
ini salah satu alasan valid untuk pendekatan ini. Tapi ini belum
terverifikasi perlu atau tidak untuk kasus AgentRouter (sejauh ini
`launch()` biasa dengan Chromium bundling belum dilaporkan gagal karena
terdeteksi bot).

## 4. Input yang perlu dikonfirmasi user sebelum implementasi

1. Lokasi persis folder profile Chrome yang mau dipakai (cek lewat
   `chrome://version` di address bar Chrome user, lihat field "Profile Path")
2. Apakah user setuju pakai **profile khusus baru** (lebih aman, direkomendasikan)
   atau **profile harian mereka** (lebih berisiko, lihat 3.1-3.2)
3. Apakah script ini akan dijadwalkan jalan otomatis tanpa pengawasan (Task
   Scheduler) — kalau ya, WAJIB pakai profile khusus (bukan profile harian)
   supaya tidak konflik saat user sedang browsing
4. Versi Chrome yang terinstall (`chrome://version`) — buat memastikan
   compatible dengan Playwright versi yang dipakai

## 5. Ringkasan rekomendasi

| Skenario | Rekomendasi |
|---|---|
| User cuma mau cookie tetap fresh, tidak masalah pakai file `storage_state.json` terpisah | **Tetap pakai pendekatan sekarang** (`lib/auth.py`), tidak perlu migrasi ke real browser |
| User mau automation jalan lewat Chrome asli, tapi bisa terima pakai profile Chrome BARU khusus automation | Lanjut ke `docs/IF_REAL_BROWSER_REFRESH_NEEDED.md`, pakai opsi **profile khusus** |
| User mau automation pakai profile Chrome HARIAN mereka | Bisa, tapi WAJIB user paham & terima risiko di bagian 3.1 & 3.2 sebelum lanjut. Sarankan sekali lagi ke user pakai profile khusus sebelum eksekusi |
