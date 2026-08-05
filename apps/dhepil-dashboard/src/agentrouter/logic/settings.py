"""
src/agentrouter/logic/settings.py
==================================
Gabungkan config.json + user_data.json AgentRouter jadi satu dict datar.

Provider-specific: file inilah yang tahu field apa saja yang dibutuhkan
AgentRouter. shared/logic/lib/config.py sengaja tidak tahu apa-apa soal ini.
"""

import os

from shared.logic.lib.config import load_provider_config, require

PROVIDER_ID = "agentrouter"

# Folder src/agentrouter/ - tempat config, user data, dan gate file berada.
PROVIDER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_settings():
    """
    Baca semua setting yang dibutuhkan logic AgentRouter.

    Raise ConfigError (dari shared) dengan pesan yang menyebut field mana yang
    hilang - caller memetakannya ke gate error code "config_invalid".
    """
    raw = load_provider_config(PROVIDER_DIR)
    config = raw["config"]
    user_data = raw["user_data"]

    def _path(filename):
        return os.path.join(PROVIDER_DIR, filename)

    return {
        "provider": PROVIDER_ID,
        # Gate file dikumpulkan di folder provider ini sendiri, bukan folder
        # terpusat - supaya jelas milik siapa saat ada banyak provider.
        "gate_file": _path("data.json"),
        "log_file": _path("log.txt"),
        # dari config.json
        "login_url": require(config, ["urls", "login_url"], "config.json"),
        "console_url": require(config, ["urls", "console_url"], "config.json"),
        "api_self_endpoint": require(config, ["urls", "api_self_endpoint"], "config.json"),
        "storage_state_file": _path(
            require(config, ["files", "storage_state_file"], "config.json")
        ),
        "cookies_file": _path(require(config, ["files", "cookies_file"], "config.json")),
        "login_redirect_timeout_ms": require(
            config, ["timeouts", "login_redirect_timeout_ms"], "config.json"
        ),
        "api_request_timeout_s": require(
            config, ["timeouts", "api_request_timeout_s"], "config.json"
        ),
        # dari user_data.json (data spesifik akun, di-gitignore)
        "new_api_user_id": require(user_data, ["auth", "new_api_user_id"], "user_data.json"),
        "github_login_button_selector": require(
            user_data, ["auth", "github_login_button_selector"], "user_data.json"
        ),
        "quota_per_unit": require(user_data, ["quota", "quota_per_unit"], "user_data.json"),
    }
