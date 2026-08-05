# Runbook: Implementasi Refresh Cookie via Real System Browser

> **Untuk siapa dokumen ini:** agent/asisten AI yang ditugaskan mengubah
> `refresh_cookie.py` dari pendekatan `storage_state.json` (Playwright
> isolated browser) menjadi pendekatan real Chrome profile (headless).
>
> **Baca dulu:** `docs/AGENT_CONTEXT.md` (konteks project) dan
> `docs/REAL_BROWSER_REFRESH_FINDINGS.md` (fakta teknis & analisis risiko
> pendekatan ini) SEBELUM mengerjakan langkah di bawah.
>
> **Prasyarat:** user sudah menjawab ke-4 poin di Bagian 4
> `REAL_BROWSER_REFRESH_FINDINGS.md`, TERMASUK sudah memilih antara
> "profile khusus" vs "profile harian". Kalau belum, TANYAKAN dulu,
> jangan asumsikan.

---

## 1. Yang TIDAK berubah

- `lib/api_client.py`, `lib/dashboard.py`, `fetch_balance.py` — tidak tersentuh
- Rumus konversi quota, endpoint API — tetap sama, lihat `docs/API_FINDINGS.md`
- `setup_login.py` — **konsepnya tetap ada** (user tetap perlu login manual
  sekali di awal), tapi isinya berubah total (lihat Bagian 3)
- Format `cookies.json` yang dibaca `lib/api_client.py` — **usahakan tetap
  sama** (list of dict `{name, value, domain, ...}`) supaya `api_client.py`
  tidak perlu diubah sama sekali. Playwright `context.cookies()` tetap
  mengembalikan format ini walau context-nya persistent, jadi ini seharusnya
  otomatis kompatibel.

## 2. Yang berubah secara konsep

| Sebelum | Sesudah |
|---|---|
| `storage_state.json` (file JSON hasil export Playwright) | Folder profile Chrome asli (`user_data_dir`) |
| `p.chromium.launch()` + `new_context()` | `p.chromium.launch_persistent_context(user_data_dir=..., channel="chrome")` |
| Browser Chromium bundling Playwright | Chrome asli yang terinstall di sistem user |
| Tidak butuh Chrome terinstall terpisah (Playwright bawa browser sendiri) | **WAJIB** Chrome asli terinstall di PC user |

## 3. File yang diedit

### 3.1 `user_data.json` — tambah field baru

```json
{
  "browser": {
    "chrome_user_data_dir": "ISI_DARI_USER_chrome://version_Profile_Path",
    "use_dedicated_profile": true
  }
}
```

- `chrome_user_data_dir`: path folder profile (root `User Data`, BUKAN
  subfolder `Default` — Playwright butuh root-nya, lalu pilih profile
  lewat parameter terpisah kalau bukan `Default`)
- `use_dedicated_profile`: `true` kalau user pilih opsi aman (profile
  khusus automation), `false` kalau user memaksa pakai profile harian
  (harus sudah dikonfirmasi user paham risikonya — lihat
  `REAL_BROWSER_REFRESH_FINDINGS.md` bagian 3.1-3.2)

### 3.2 `lib/loader.py` — tambah field ke `load_settings()`

```python
"chrome_user_data_dir": user_data["browser"]["chrome_user_data_dir"],
"use_dedicated_profile": user_data["browser"]["use_dedicated_profile"],
```

### 3.3 `lib/auth.py` — ganti isi fungsi

Fungsi `interactive_setup_login()` dan `automated_refresh_cookie()` diganti
total. Kerangka barunya:

```python
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
import json
from lib.logger import log


def interactive_setup_login(settings):
    """
    Buka Chrome asli (persistent context) NON-headless, user login manual
    sekali. Karena persistent context, begitu browser ditutup, sesi login
    otomatis tersimpan di folder profile-nya sendiri (tidak perlu langkah
    export terpisah seperti storage_state.json).
    """
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=settings["chrome_user_data_dir"],
            headless=False,
            channel="chrome",
        )
        page = context.new_page()
        page.goto(settings["login_url"])

        print("\n>>> Silakan login manual di jendela Chrome yang terbuka.")
        input(">>> Setelah masuk ke dashboard AgentRouter, kembali ke sini dan tekan ENTER... ")

        context.close()  # sesi otomatis tersimpan di profile folder


def automated_refresh_cookie(settings):
    """
    Buka Chrome asli (persistent context) HEADLESS memakai profile yang
    sudah login, klik tombol login GitHub otomatis, tangkap cookie baru.
    """
    log_file = settings["log_file"]

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=settings["chrome_user_data_dir"],
            headless=True,
            channel="chrome",
        )
        page = context.new_page()

        try:
            log(f"Membuka {settings['login_url']} ...", log_file)
            page.goto(settings["login_url"], timeout=settings["login_redirect_timeout_ms"])

            log("Mengklik tombol login GitHub...", log_file)
            page.click(settings["github_login_button_selector"], timeout=settings["login_redirect_timeout_ms"])

            log("Menunggu redirect selesai...", log_file)
            page.wait_for_url(f"{settings['console_url']}**", timeout=settings["login_redirect_timeout_ms"])

            cookies = context.cookies()
            with open(settings["cookies_file"], "w", encoding="utf-8") as f:
                json.dump(cookies, f, indent=2)

            log(f"Cookie baru disimpan ke {settings['cookies_file']}", log_file)
            context.close()
            return True

        except PlaywrightTimeoutError as e:
            log(f"GAGAL: timeout - {e}", log_file)
            context.close()
            return False

        except Exception as e:
            # PENTING: tangkap khusus error "profile locked" (SingletonLock)
            # supaya pesan errornya jelas ke user, bukan traceback mentah
            if "SingletonLock" in str(e) or "already running" in str(e).lower():
                log("GAGAL: Chrome sedang terbuka dengan profile yang sama. Tutup Chrome dulu (kalau pakai profile harian) sebelum refresh otomatis jalan.", log_file)
            else:
                log(f"GAGAL: error tak terduga - {e}", log_file)
            context.close()
            return False
```

**Catatan implementasi:** `storage_state_file` di `settings` sudah tidak
dipakai fungsi-fungsi ini lagi — boleh dibiarkan di `config.json`/`loader.py`
(tidak mengganggu) atau dihapus kalau mau bersih-bersih sekalian.

### 3.4 `setup_task_scheduler.ps1` — tambah peringatan

Kalau `use_dedicated_profile` = `false` (user pakai profile harian), WAJIB
tambahkan komentar peringatan di script ini bahwa Chrome harus tertutup
saat jadwal jalan, dan pertimbangkan jam yang benar-benar user tidak akan
sedang pakai Chrome.

## 4. Hal yang HARUS ditanyakan ke user kalau belum jelas

- Apakah mereka mengerti bahwa headless Chrome dengan `channel="chrome"`
  butuh Chrome versi tertentu terinstall (bukan cuma Playwright's bundled
  Chromium)? Kalau Chrome belum ada / versi tidak kompatibel, install dulu.
- Kalau pilih profile khusus: pastikan user benar-benar bikin profile BARU
  dulu di Chrome (`chrome://settings` → Add Profile) SEBELUM jalankan
  `setup_login.py` versi baru ini, dan `chrome_user_data_dir` di
  `user_data.json` mengarah ke folder profile baru itu, bukan default.

## 5. Verifikasi setelah implementasi

- [ ] `python setup_login.py` berhasil buka Chrome asli (bukan Chromium generik — cek dari tampilan/versi browser yang terbuka)
- [ ] Setelah login manual & tutup browser, folder `chrome_user_data_dir` berisi data profile (cek ada file/folder baru di situ)
- [ ] `python refresh_cookie.py` sukses jalan headless TANPA Chrome manual terbuka di background
- [ ] Kalau `use_dedicated_profile: false`, uji juga skenario Chrome manual sedang terbuka → pastikan error message-nya jelas (sesuai penanganan di 3.3), bukan crash tanpa keterangan
- [ ] `cookies.json` hasilnya tetap format yang sama, `fetch_balance.py` tetap jalan tanpa perlu diubah
