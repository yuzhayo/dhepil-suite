"""
shared/logic/lib/validate.py
=============================
Validasi angka mentah dari response provider sebelum dipakai.

Generic: tidak tahu nama field milik provider mana pun - caller yang mengirim
nama field sebagai label untuk pesan errornya.

Kenapa ini ada sebagai file terpisah: prioritas utama dashboard tak
berpengawasan adalah mencegah "gagal tidak kelihatan gagal". Angka yang salah
tapi tampil rapi jauh lebih berbahaya daripada crash, karena user percaya
angkanya. Semua fungsi di sini karena itu memilih raise, bukan mengembalikan
nilai default seperti 0.
"""


class DataShapeError(Exception):
    """
    Response provider tidak berbentuk seperti yang diharapkan.

    Dipetakan ke gate error code "response_shape_changed".
    """


def require_number(value, label, allow_negative=False):
    """
    Pastikan `value` angka yang layak dipakai untuk perhitungan.

    bool ditolak eksplisit karena di Python bool adalah subclass int, jadi
    True akan lolos isinstance(..., int) dan diam-diam dihitung sebagai 1.
    """
    if value is None:
        raise DataShapeError(f"Field '{label}' bernilai null.")

    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise DataShapeError(
            f"Field '{label}' bukan angka (tipe: {type(value).__name__}, "
            f"nilai: {value!r}). Kemungkinan provider mengubah tipe data."
        )

    if not allow_negative and value < 0:
        raise DataShapeError(
            f"Field '{label}' bernilai negatif ({value}). Ini tidak valid - "
            "kemungkinan bug di sisi provider atau data corrupt. Jangan "
            "percaya angka ini sebelum dicek manual di dashboard resmi."
        )

    return value


def require_int(value, label, allow_negative=False):
    """Sama seperti require_number, tapi menolak float (mis. jumlah request)."""
    if isinstance(value, bool) or not isinstance(value, int):
        raise DataShapeError(
            f"Field '{label}' bukan integer (tipe: {type(value).__name__}, "
            f"nilai: {value!r}). Kemungkinan provider mengubah tipe data."
        )

    if not allow_negative and value < 0:
        raise DataShapeError(f"Field '{label}' bernilai negatif ({value}).")

    return value


def require_keys(source, keys, label):
    """
    Pastikan dict punya semua key wajib, dengan pesan yang menyebut mana saja
    yang hilang sekaligus - bukan gagal satu per satu tiap kali dijalankan.
    """
    if source is None:
        raise DataShapeError(
            f"{label} bernilai null. Kemungkinan auth tidak valid sehingga "
            "provider mengembalikan data kosong."
        )

    if not isinstance(source, dict):
        raise DataShapeError(
            f"{label} bukan objek (tipe: {type(source).__name__}). "
            "Kemungkinan provider mengubah struktur response."
        )

    missing = [k for k in keys if k not in source]
    if missing:
        raise DataShapeError(
            f"Field wajib hilang dari {label}: {missing}. Kemungkinan provider "
            "mengubah nama field - mapping di logic provider perlu disesuaikan."
        )

    return source


def to_usd(raw_value, divisor, label):
    """
    Konversi angka mentah quota ke USD.

    `divisor` divalidasi di sini karena divisor 0/None adalah kesalahan config
    yang paling gampang terjadi, dan akibatnya (ZeroDivisionError mentah di
    tengah script terjadwal) tidak memberi tahu user file mana yang salah.
    """
    if not divisor:
        raise DataShapeError(
            f"Pembagi konversi untuk '{label}' tidak valid (kosong atau 0). "
            "Cek nilai quota_per_unit di user_data.json provider."
        )

    return round(require_number(raw_value, label) / divisor, 2)
