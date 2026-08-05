"""
src/agentrouter/logic/api_client.py
===================================
Komunikasi ke API AgentRouter dan pemetaan response-nya ke bentuk gate file.

Provider-specific: nama endpoint, nama header, nama field response, dan rumus
konversi quota ke USD hanya boleh ada di sini.

Rumus konversi dan nama field sudah TERVERIFIKASI cocok dengan dashboard resmi
AgentRouter - lihat docs/AGENTROUTER_API.md untuk buktinya. Kalau AgentRouter
mengubah struktur response mereka, cukup edit to_gate_numbers() di file ini.
"""

import json
import os

from shared.logic.lib.http import HttpError, get_json
from shared.logic.lib.validate import DataShapeError, require_int, require_keys, to_usd


def _load_cookie_header(cookies_file):
    """
    Rakit header Cookie dari cookies.json hasil refresh sesi.

    File belum ada = sesi memang belum pernah dibuat. Dipetakan ke auth_invalid
    (bukan config_invalid) karena tindakan perbaikannya sama dengan sesi
    kedaluwarsa: jalankan setup/refresh sesi.
    """
    if not os.path.exists(cookies_file):
        raise HttpError(
            "auth_invalid",
            f"File sesi belum ada ({cookies_file}). Jalankan setup_login.py "
            "dulu untuk login manual sekali.",
        )

    try:
        with open(cookies_file, "r", encoding="utf-8") as f:
            cookies = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        raise HttpError("auth_invalid", f"File sesi tidak bisa dibaca ({cookies_file}): {e}")

    if not isinstance(cookies, list) or not cookies:
        raise HttpError(
            "auth_invalid",
            f"File sesi kosong atau formatnya tidak seperti yang diharapkan ({cookies_file}). "
            "Jalankan refresh sesi ulang.",
        )

    return "; ".join(f"{c['name']}={c['value']}" for c in cookies)


def fetch_self(settings):
    """
    Ambil data akun dari endpoint self, kembalikan JSON mentah.

    Raise HttpError. Selain kegagalan HTTP biasa yang sudah ditangani shared,
    ada satu pola khas panel New-API yang harus dijaga di sini: server membalas
    HTTP 200 dengan body {"success": false, ...} saat sesi ditolak. Tanpa
    pengecekan ini, response tersebut lolos sebagai "sukses" dan baru meledak
    di tahap pemetaan dengan pesan yang menyesatkan (seolah struktur response
    berubah, padahal masalahnya auth).
    """
    headers = {
        "Cookie": _load_cookie_header(settings["cookies_file"]),
        "New-Api-User": str(settings["new_api_user_id"]),
        "Accept": "application/json, text/plain, */*",
    }

    raw_json = get_json(
        settings["api_self_endpoint"],
        headers,
        settings["api_request_timeout_s"],
    )

    if not isinstance(raw_json, dict):
        raise HttpError(
            "response_shape_changed",
            f"Response bukan objek JSON (tipe: {type(raw_json).__name__}).",
        )

    if raw_json.get("success") is False:
        message = raw_json.get("message") or raw_json.get("msg") or "(tidak ada pesan dari server)"
        raise HttpError(
            "auth_invalid",
            f"API menolak request walau HTTP 200 (success=false): {message}. "
            "Ini hampir selalu berarti sesi sudah tidak valid. Jalankan "
            "refresh_cookie.py; kalau tetap gagal, login manual ulang lewat "
            "setup_login.py.",
        )

    return raw_json


def to_gate_numbers(raw_json, quota_per_unit):
    """
    Petakan response mentah ke tiga angka yang dipahami gate file.

    Raise DataShapeError kalau bentuk response tidak sesuai. Sengaja tidak ada
    nilai default: angka 0 yang tampil rapi tidak bisa dibedakan user dari
    saldo yang benar-benar habis, dan itu kelas kegagalan terburuk untuk
    dashboard yang berjalan tanpa pengawasan.
    """
    if "data" not in raw_json:
        raise DataShapeError(
            "Response tidak punya field 'data'. Kemungkinan AgentRouter mengubah "
            "struktur response, atau auth ditolak sehingga yang dikembalikan "
            f"struktur error. Response (terpotong): {str(raw_json)[:300]}"
        )

    data = require_keys(
        raw_json["data"],
        ["quota", "used_quota", "request_count"],
        "field 'data' pada response /api/user/self",
    )

    return {
        "balance": to_usd(data["quota"], quota_per_unit, "quota"),
        "consumption": to_usd(data["used_quota"], quota_per_unit, "used_quota"),
        "requests": require_int(data["request_count"], "request_count"),
    }
