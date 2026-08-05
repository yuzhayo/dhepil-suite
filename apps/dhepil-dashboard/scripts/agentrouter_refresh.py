"""
scripts/agentrouter_refresh.py
===============================
Thin wrapper. Refresh sesi lalu ambil data dan tulis gate file.

Jalankan dari root app (atau lewat scheduler):
    python scripts/agentrouter_refresh.py

Urutan: refresh sesi -> ambil data. Kalau refresh sesi gagal, kita TETAP
menulis gate file dengan status error lalu berhenti - tidak melanjutkan ke
fetch dengan sesi basi, dan tidak membiarkan gate file lama tanpa penanda.

Exit code 0 = gate file sukses ditulis sebagai "ok", 1 = ditulis sebagai
"error". Scheduler bisa memakai exit code ini, tapi sumber kebenaran untuk
UI tetap gate file-nya sendiri.
"""

import os
import sys

APP_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, APP_ROOT)

from shared.logic.lib.gate import write_error  # noqa: E402
from shared.logic.lib.logger import log  # noqa: E402
from src.agentrouter.logic.auth import AuthError, automated_refresh_session  # noqa: E402
from src.agentrouter.logic.pipeline import run_once  # noqa: E402
from src.agentrouter.logic.settings import PROVIDER_ID, load_settings  # noqa: E402


def main():
    # Config dibaca di sini karena tahap refresh membutuhkannya. Kegagalan
    # config saat fetch ditangani ulang di dalam run_once() - keduanya perlu,
    # karena run_once() juga dipakai tanpa melalui script ini.
    try:
        settings = load_settings()
    except Exception as e:
        # Belum tahu path dari config, jadi biarkan run_once() yang menulis
        # gate error dengan path fallback-nya.
        log(f"Config tidak bisa dibaca: {e}")
        return 0 if run_once() else 1

    try:
        automated_refresh_session(settings)
    except AuthError as e:
        log(f"Refresh sesi gagal ({e.code}): {e.message}", settings["log_file"])
        write_error(PROVIDER_ID, e.code, e.message, settings["gate_file"])
        return 1
    except Exception as e:
        log(f"Refresh sesi gagal tak terduga: {e}", settings["log_file"])
        write_error(
            PROVIDER_ID,
            "unknown",
            f"Refresh sesi gagal tak terduga: {e}",
            settings["gate_file"],
        )
        return 1

    return 0 if run_once() else 1


if __name__ == "__main__":
    sys.exit(main())
