"""
scripts/agentrouter_setup_login.py
===================================
Thin wrapper. Dijalankan SEKALI oleh user untuk login manual pertama kali.

Jalankan dari root app:
    python scripts/agentrouter_setup_login.py

Semua logic ada di src/agentrouter/logic/ - file ini sengaja hanya
menyambungkan path lalu memanggil fungsinya.
"""

import os
import sys

# Root app perlu masuk sys.path supaya `shared.` dan `src.` bisa di-import
# apa pun direktori tempat script ini dijalankan (mis. oleh Task Scheduler).
APP_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, APP_ROOT)

from src.agentrouter.logic.auth import interactive_setup_login  # noqa: E402
from src.agentrouter.logic.settings import load_settings  # noqa: E402

if __name__ == "__main__":
    interactive_setup_login(load_settings())
