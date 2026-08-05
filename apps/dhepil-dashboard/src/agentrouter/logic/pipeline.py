"""
src/agentrouter/logic/pipeline.py
==================================
Orkestrator satu putaran pengambilan data AgentRouter.

Inilah satu-satunya tempat yang memutuskan gate file ditulis sebagai "ok" atau
"error". Aturannya sederhana dan tidak boleh dilanggar: fungsi ini SELALU
menulis gate file, apa pun yang terjadi. Kalau ada satu jalur keluar saja yang
tidak menulis, dashboard akan menampilkan angka lama tanpa penanda - kelas
kegagalan yang paling berbahaya untuk dashboard tanpa pengawasan.
"""

import traceback

from shared.logic.lib.config import ConfigError
from shared.logic.lib.gate import write_error, write_ok
from shared.logic.lib.http import HttpError
from shared.logic.lib.logger import log
from shared.logic.lib.validate import DataShapeError

from .api_client import fetch_self, to_gate_numbers
from .settings import PROVIDER_ID, PROVIDER_DIR, load_settings

import os

# Dipakai hanya kalau load_settings() sendiri gagal - saat itu kita belum tahu
# path gate/log dari config, tapi kegagalannya tetap harus sampai ke UI.
FALLBACK_GATE_FILE = os.path.join(PROVIDER_DIR, "data.json")
FALLBACK_LOG_FILE = os.path.join(PROVIDER_DIR, "log.txt")


def run_once():
    """
    Ambil data sekali lalu tulis gate file.

    Return True kalau gate file ditulis dengan status "ok", False kalau
    ditulis dengan status "error". Tidak pernah raise ke caller - caller
    (script tipis / scheduler) cuma perlu exit code.
    """
    # Tahap 1: config. Gagal di sini artinya kita belum punya path apa pun
    # dari config, jadi pakai path fallback.
    try:
        settings = load_settings()
    except ConfigError as e:
        log(f"Config tidak valid: {e}", FALLBACK_LOG_FILE)
        write_error(PROVIDER_ID, "config_invalid", str(e), FALLBACK_GATE_FILE)
        return False
    except Exception as e:
        log(f"Gagal memuat config: {e}", FALLBACK_LOG_FILE)
        log(traceback.format_exc(), FALLBACK_LOG_FILE)
        write_error(PROVIDER_ID, "unknown", f"Gagal memuat config: {e}", FALLBACK_GATE_FILE)
        return False

    gate_file = settings["gate_file"]
    log_file = settings["log_file"]

    # Tahap 2: fetch dan pemetaan. Tiap kategori kegagalan dipetakan ke kode
    # gate yang berbeda supaya UI bisa menyarankan tindakan yang tepat -
    # "cek koneksi" dan "login ulang" bukan saran yang bisa ditukar.
    try:
        raw = fetch_self(settings)
        numbers = to_gate_numbers(raw, settings["quota_per_unit"])

    except HttpError as e:
        log(f"Fetch gagal ({e.code}): {e.message}", log_file)
        write_error(PROVIDER_ID, e.code, e.message, gate_file)
        return False

    except DataShapeError as e:
        log(f"Bentuk response tidak sesuai: {e}", log_file)
        write_error(PROVIDER_ID, "response_shape_changed", str(e), gate_file)
        return False

    except Exception as e:
        log(f"Error tak terduga saat fetch: {e}", log_file)
        log(traceback.format_exc(), log_file)
        write_error(PROVIDER_ID, "unknown", f"Error tak terduga: {e}", gate_file)
        return False

    # Tahap 3: tulis sukses. write_ok() punya guard sendiri; kalau angkanya
    # ternyata tidak layak, kita turunkan jadi status error daripada memaksa
    # menulis "ok" dengan data yang tidak bisa dipercaya.
    try:
        write_ok(PROVIDER_ID, numbers, gate_file)
    except ValueError as e:
        log(f"Angka hasil tidak layak ditulis sebagai sukses: {e}", log_file)
        write_error(PROVIDER_ID, "response_shape_changed", str(e), gate_file)
        return False

    log(
        f"Sukses. balance={numbers['balance']} consumption={numbers['consumption']} "
        f"requests={numbers['requests']} -> {gate_file}",
        log_file,
    )
    return True
