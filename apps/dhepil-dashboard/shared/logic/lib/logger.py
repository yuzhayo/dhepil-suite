"""
shared/logic/lib/logger.py
===========================
Logging sederhana ke terminal + file, dipakai semua provider biar formatnya
konsisten.

Disalin dari apps/agentrouter_dashboard/lib/logger.py (versi yang sudah
direview) - bukan di-import lintas app, sesuai aturan di AGENTS.md.
"""

from datetime import datetime


def log(msg, log_file=None):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    if log_file:
        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(line + "\n")
        except Exception:
            # Jangan biarkan kegagalan menulis log (mis. folder read-only)
            # ikut menjadi exception baru yang menutupi error aslinya.
            print(f"[WARNING] Gagal menulis log ke {log_file}")
