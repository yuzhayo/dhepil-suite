"""
scripts/agentrouter_fetch.py
=============================
Thin wrapper. Ambil data pakai sesi yang sudah ada, tulis gate file.

Jalankan dari root app:
    python scripts/agentrouter_fetch.py

Bedanya dengan agentrouter_refresh.py: script ini TIDAK menyentuh browser sama
sekali. Pakai ini untuk update cepat saat sesi masih segar, atau saat sedang
menguji sisi UI tanpa perlu menjalankan Playwright.
"""

import os
import sys

APP_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, APP_ROOT)

from src.agentrouter.logic.pipeline import run_once  # noqa: E402

if __name__ == "__main__":
    sys.exit(0 if run_once() else 1)
