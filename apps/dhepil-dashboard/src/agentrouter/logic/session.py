"""
src/agentrouter/logic/session.py
=================================
Session management: load/save cookies, build auth header.
Murni file I/O, tidak ada Playwright di sini.

Dipecah dari auth.py supaya logic file-based terpisah dari browser automation.
"""

import json

from shared.logic.lib.logger import log


def load_cookies(settings):
    """
    Load cookies dari file JSON.
    Return list of cookie dicts, atau raise FileNotFoundError kalau file tidak ada.
    """
    cookies_file = settings["cookies_file"]
    
    try:
        with open(cookies_file, "r", encoding="utf-8") as f:
            cookies = json.load(f)
        log(f"Cookies loaded dari {cookies_file}", settings["log_file"])
        return cookies
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Cookies file tidak ditemukan: {cookies_file}. "
            "Jalankan setup_login.py untuk login manual sekali."
        )
    except json.JSONDecodeError as e:
        raise ValueError(f"Cookies file rusak ({cookies_file}): {e}")


def save_cookies(settings, cookies):
    """
    Save cookies ke file JSON.
    Cookies adalah list of dicts dari Playwright context.cookies().
    """
    cookies_file = settings["cookies_file"]
    
    with open(cookies_file, "w", encoding="utf-8") as f:
        json.dump(cookies, f, indent=2)
    
    log(f"Cookies disimpan ke {cookies_file}", settings["log_file"])


def build_auth_header(settings):
    """
    Build HTTP header dari cookies yang sudah ada.
    Return dict dengan key: Cookie, New-Api-User.
    
    Raise FileNotFoundError kalau cookies belum ada.
    """
    cookies = load_cookies(settings)
    
    # Format cookies jadi string: name1=value1; name2=value2
    cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in cookies)
    
    user_id = settings["user_id"]
    
    return {
        "Cookie": cookie_str,
        "New-Api-User": str(user_id),
    }
