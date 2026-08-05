"""
shared/logic/lib/http.py
=========================
HTTP GET generic yang mengembalikan JSON, dengan kegagalan yang sudah
dikategorikan ke kode error gate file.

Generic: file ini tidak tahu endpoint atau bentuk response provider mana pun.
Dia hanya tahu satu hal yang berlaku umum - panel API pribadi lazim membalas
HTTP 200 dengan body HTML halaman login saat sesi sudah kedaluwarsa, jadi
status code 200 saja TIDAK cukup untuk menyimpulkan sukses.
"""

import requests


class HttpError(Exception):
    """
    Kegagalan HTTP yang sudah dipetakan ke kode error gate file.

    `code` selalu salah satu dari ERROR_CODES di gate.py, supaya caller bisa
    langsung meneruskannya ke write_error() tanpa menebak kategori dari string.
    """

    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def get_json(url, headers, timeout_s):
    """
    GET `url` lalu kembalikan body-nya sebagai objek Python.

    Raise HttpError dengan code yang sudah dikategorikan. Tidak pernah
    mengembalikan None atau dict kosong sebagai penanda gagal - caller tidak
    boleh perlu membedakan "gagal" dari "sukses tapi kosong".
    """
    try:
        resp = requests.get(url, headers=headers, timeout=timeout_s)
    except requests.exceptions.Timeout:
        raise HttpError(
            "network_error",
            f"Request ke {url} timeout setelah {timeout_s} detik.",
        )
    except requests.exceptions.ConnectionError as e:
        raise HttpError(
            "network_error",
            f"Tidak bisa menghubungi {url}. Cek koneksi internet. Detail: {e}",
        )
    except requests.exceptions.RequestException as e:
        raise HttpError("network_error", f"Request ke {url} gagal: {e}")

    # 401/403 hampir selalu berarti sesi/kredensial sudah tidak valid -
    # dipisahkan supaya UI bisa menyarankan login ulang, bukan cek koneksi.
    if resp.status_code in (401, 403):
        raise HttpError(
            "auth_invalid",
            f"Akses ditolak (HTTP {resp.status_code}). Sesi kemungkinan sudah "
            "kedaluwarsa - perlu refresh sesi atau login manual ulang.",
        )

    if resp.status_code >= 400:
        raise HttpError(
            "network_error",
            f"Server membalas HTTP {resp.status_code} untuk {url}.",
        )

    try:
        return resp.json()
    except ValueError:
        # Inilah kasus yang paling menipu: HTTP 200 tapi body-nya HTML halaman
        # login. Kalau tidak dijaga di sini, parser di atasnya akan gagal
        # dengan pesan yang menyesatkan (seolah field response berubah).
        content_type = resp.headers.get("Content-Type", "tidak diketahui")
        raise HttpError(
            "auth_invalid",
            f"Response dari {url} bukan JSON (Content-Type: {content_type}). "
            "Ini pola khas halaman login - sesi kemungkinan sudah kedaluwarsa.",
        )
