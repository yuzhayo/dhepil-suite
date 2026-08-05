"""
shared/logic/lib/config.py
===========================
Baca file konfigurasi provider dan gabungkan jadi satu dict settings.

Generic: file ini tidak tahu field apa yang dibutuhkan provider mana. Dia
cuma tahu polanya - tiap provider punya config.json (setting teknis stabil)
dan user_data.json (data spesifik akun user, di-gitignore).

Pemisahan ini disalin dari apps/agentrouter_dashboard/lib/loader.py, dengan
alasan yang sama: data akun user tidak boleh pernah hardcode di source.
"""

import json
import os


class ConfigError(Exception):
    """
    Config/user data tidak bisa dibaca atau tidak lengkap.

    Dibedakan dari error lain supaya caller bisa memetakan ini ke gate error
    code "config_invalid" tanpa menebak dari string pesan.
    """


def _read_json(path, label):
    if not os.path.exists(path):
        raise ConfigError(
            f"{label} tidak ditemukan di {path}. "
            f"Salin dari {os.path.basename(path)}.example lalu isi datanya."
        )
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise ConfigError(f"{label} bukan JSON valid ({path}): {e}")


def load_provider_config(provider_dir):
    """
    Baca config.json + user_data.json dari folder provider.

    Return dict dengan dua key: "config" dan "user_data". Sengaja TIDAK
    di-flatten di sini - tiap provider yang tahu field apa yang dia butuhkan,
    jadi flattening-nya dilakukan di src/<provider>/logic/settings.py.
    """
    config_path = os.path.join(provider_dir, "config.json")
    user_data_path = os.path.join(provider_dir, "user_data.json")

    return {
        "config": _read_json(config_path, "config.json"),
        "user_data": _read_json(user_data_path, "user_data.json"),
    }


def require(source, path, label):
    """
    Ambil nilai bersarang dari dict dengan pesan error yang jelas kalau hilang.

    `path` berupa list key, misal ["auth", "new_api_user_id"].

    Tanpa ini, field yang hilang muncul sebagai KeyError mentah tanpa konteks
    file mana yang perlu diperbaiki user - untuk script tak berpengawasan itu
    berarti user cuma lihat traceback tanpa tahu harus ngapain.
    """
    current = source
    for index, key in enumerate(path):
        if not isinstance(current, dict) or key not in current:
            trail = ".".join(path[: index + 1])
            raise ConfigError(f"Field '{trail}' tidak ada di {label}.")
        current = current[key]
    return current
