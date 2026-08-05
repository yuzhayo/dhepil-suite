import os

content = '''"""
src/agentrouter/logic/browser.py
=================================
Playwright-based authentication: manual login setup + automated session refresh.

Dipecah dari auth.py supaya browser automation terpisah dari file I/O (session.py).
"""

import json

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

from shared.logic.lib.logger import log
from src.agentrouter.logic.session import save_cookies


class AuthError(Exception):
    """Kegagalan login/refresh sesi, sudah dipetakan ke kode error gate."""

    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def interactive_setup_login(settings):
    """
    Buka browser NON-headless, user login manual, simpan storage state.
    Dijalankan sekali oleh user lewat setup_login.py.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        print(f"Membuka {settings['login_url']} ...")
        page.goto(settings["login_url"])

        print("\\n>>> Silakan login manual di jendela browser yang terbuka.")
        print(">>> Selesaikan proses login/approve jika diminta.")
        input(">>> Setelah masuk ke dashboard, kembali ke sini dan tekan ENTER... ")

        context.storage_state(path=settings["storage_state_file"])
        print(f"\\nStorage state disimpan ke {settings['storage_state_file']}")

        browser.close()


def automated_refresh_session(settings):
    """
    Buka browser HEADLESS memakai storage state yang sudah ada, jalankan alur
    login otomatis, lalu simpan cookie baru.

    Raise AuthError kalau gagal. Storage state ikut diperbarui saat sukses
    supaya sesi GitHub yang di-refresh tidak hilang di run berikutnya.
    """
    log_file = settings["log_file"]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        try:
            context = browser.new_context(storage_state=settings["storage_state_file"])
        except Exception as e:
            browser.close()
            raise AuthError(
                "auth_invalid",
                f"Storage state tidak bisa dipakai ({settings['storage_state_file']}): {e}. "
                "Jalankan setup_login.py untuk login manual sekali.",
            )

        page = context.new_page()
        timeout_ms = settings["login_redirect_timeout_ms"]

        try:
            log(f"Membuka {settings['login_url']} ...", log_file)
            page.goto(settings["login_url"], timeout=timeout_ms)

            log("Mengklik tombol login GitHub...", log_file)
            page.click(settings["github_login_button_selector"], timeout=timeout_ms)

            log("Menunggu redirect selesai...", log_file)
            page.wait_for_url(f"{settings['console_url']}**", timeout=timeout_ms)

            log("Login otomatis berhasil, menyimpan cookie...", log_file)
            cookies = context.cookies()

            save_cookies(settings, cookies)

            context.storage_state(path=settings["storage_state_file"])
            log(f"Cookie baru disimpan ke {settings['cookies_file']}", log_file)

        except PlaywrightTimeoutError as e:
            raise AuthError(
                "auth_invalid",
                "Timeout saat login otomatis. Kemungkinan GitHub meminta verifikasi "
                "manual, atau selector tombol login sudah berubah. Jalankan "
                f"setup_login.py untuk login manual sekali. Detail: {e}",
            )

        except AuthError:
            raise

        except Exception as e:
            raise AuthError("unknown", f"Error tak terduga saat refresh sesi: {e}")

        finally:
            browser.close()
'''

target = r'C:\VSCODE\dhepil-suite\apps\dhepil-dashboard\src\agentrouter\logic\browser.py'
with open(target, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done:', target)
