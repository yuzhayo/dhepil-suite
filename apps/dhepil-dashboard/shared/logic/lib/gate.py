"""
shared/logic/lib/gate.py
=========================
Penulis gate file - satu-satunya jembatan antara logic dan UI.

Kontrak lengkap: docs/GATE_CONTRACT.md

Dua aturan yang paling penting di file ini:

1. Penulisan ATOMIK. Tulis ke temp file di folder yang sama, fsync, lalu
   os.replace(). os.replace() atomik di Windows maupun POSIX, jadi UI tidak
   akan pernah membaca file setengah jadi.

2. Kegagalan TETAP menulis gate file dengan status "error". Membiarkan gate
   file lama tanpa penanda adalah kelas bug terburuk untuk dashboard tak
   berpengawasan: angka basi akan tampil percaya diri seolah masih valid.
   Karena itu write_error() bukan opsional - dia bagian dari kontrak.
"""

import json
import os
import tempfile
from datetime import datetime, timezone

SCHEMA_VERSION = 1

# Kode error yang dikenal UI. Lihat tabel di docs/GATE_CONTRACT.md.
ERROR_CODES = frozenset(
    {
        "auth_invalid",
        "network_error",
        "response_shape_changed",
        "config_invalid",
        "unknown",
    }
)


def _now_iso():
    """Waktu sekarang, ISO 8601 dengan offset timezone lokal (bukan naive)."""
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def _write_atomic(payload, gate_file):
    """
    Tulis JSON ke gate_file secara atomik.

    Temp file dibuat di folder yang SAMA dengan target - os.replace() hanya
    dijamin atomik dalam satu filesystem, jadi temp di /tmp tidak aman.
    """
    target_dir = os.path.dirname(os.path.abspath(gate_file))
    os.makedirs(target_dir, exist_ok=True)

    fd, temp_path = tempfile.mkstemp(dir=target_dir, prefix=".gate-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp_path, gate_file)
    except BaseException:
        # Jangan tinggalkan sampah temp file kalau gagal di tengah jalan.
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        raise


def write_ok(provider, data, gate_file):
    """
    Tulis gate file sukses.

    `data` wajib sudah tervalidasi oleh provider-nya (angka, bukan None,
    bukan negatif). Guard di sini adalah jaring pengaman terakhir: kalau
    data tidak layak, kita TOLAK menulis status "ok" dan raise - lebih baik
    caller menangkapnya lalu memanggil write_error(), daripada UI menampilkan
    angka yang salah dengan penuh percaya diri.
    """
    required = ("balance", "consumption", "requests")

    missing = [k for k in required if k not in data]
    if missing:
        raise ValueError(f"data gate tidak lengkap, field hilang: {missing}")

    for key in required:
        value = data[key]
        # bool adalah subclass int di Python - tolak eksplisit supaya
        # True/False tidak lolos sebagai "angka".
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"field '{key}' bukan angka: {value!r}")
        if value < 0:
            raise ValueError(f"field '{key}' negatif: {value!r}")

    payload = {
        "schema_version": SCHEMA_VERSION,
        "provider": provider,
        "status": "ok",
        "last_updated": _now_iso(),
        "data": {
            "balance": round(float(data["balance"]), 2),
            "consumption": round(float(data["consumption"]), 2),
            "requests": int(data["requests"]),
        },
        "error": None,
    }
    _write_atomic(payload, gate_file)


def write_error(provider, code, message, gate_file):
    """
    Tulis gate file gagal.

    WAJIB dipanggil setiap kali fetch/parse gagal. Kode yang tidak dikenal
    dinormalisasi ke "unknown" supaya UI tidak pernah menerima code asing -
    pesan aslinya tetap ikut supaya informasinya tidak hilang.
    """
    if code not in ERROR_CODES:
        message = f"[{code}] {message}"
        code = "unknown"

    payload = {
        "schema_version": SCHEMA_VERSION,
        "provider": provider,
        "status": "error",
        "last_updated": _now_iso(),
        "data": None,
        "error": {
            "code": code,
            "message": str(message),
        },
    }
    _write_atomic(payload, gate_file)
