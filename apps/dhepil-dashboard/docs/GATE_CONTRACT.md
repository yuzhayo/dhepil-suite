# Gate File Contract

> Kontrak tunggal antara **logic** (Python, penulis) dan **UI** (React, pembaca).
> UI tidak pernah memanggil API provider. Logic tidak pernah tahu ada UI.
> Perubahan schema di sini wajib dilakukan SEBELUM mengubah kode di kedua sisi.

---

## 1. Lokasi

```
src/<provider>/data.json
```

Provider yang ada saat ini:

| Provider | Gate file |
|---|---|
| AgentRouter | `src/agentrouter/data.json` |
| OpenRouter | `src/openrouter/data.json` |

Semua gate file berada di `src/<provider>/` supaya jelas milik provider mana — tidak ada folder gate terpisah.

## 2. Schema

```json
{
  "schema_version": 1,
  "provider": "agentrouter",
  "status": "ok",
  "last_updated": "2026-08-05T17:30:00+07:00",
  "data": {
    "balance": 174.63,
    "consumption": 200.37,
    "requests": 570
  },
  "error": null
}
```

### Field wajib (selalu ada, apa pun status-nya)

| Field | Tipe | Keterangan |
|---|---|---|
| `schema_version` | integer | Versi format file ini. Saat ini `1`. UI wajib menolak versi yang tidak dikenal. |
| `provider` | string | ID provider, harus sama dengan nama folder-nya. |
| `status` | `"ok"` \| `"error"` | Satu-satunya penanda sukses/gagal. |
| `last_updated` | string ISO 8601 dengan offset timezone | Waktu logic selesai menulis file ini. |
| `data` | object \| `null` | Angka hasil fetch. `null` saat `status: "error"`. |
| `error` | object \| `null` | Detail kegagalan. `null` saat `status: "ok"`. |

### Bentuk `data` (saat `status: "ok"`)

| Field | Tipe | Keterangan |
|---|---|---|
| `balance` | number | Saldo dalam USD, sudah dikonversi, dibulatkan 2 desimal. |
| `consumption` | number | Total konsumsi USD, sudah dikonversi, dibulatkan 2 desimal. |
| `requests` | integer | Jumlah request, angka apa adanya dari provider. |

Saat `status: "ok"`, ketiga field ini WAJIB ada dan bertipe angka. Logic tidak boleh menulis `status: "ok"` dengan salah satu field kosong, `null`, atau string.

### Bentuk `error` (saat `status: "error"`)

| Field | Tipe | Keterangan |
|---|---|---|
| `code` | string | Kategori mesin-readable, lihat tabel di bawah. |
| `message` | string | Pesan actionable untuk dibaca manusia di UI. |

Kode error yang dikenal:

| `code` | Arti | Saran tindakan yang harus muncul di UI |
|---|---|---|
| `auth_invalid` | Sesi/kredensial tidak lagi valid | Jalankan refresh sesi, atau login ulang manual |
| `network_error` | Tidak bisa menghubungi provider | Cek koneksi internet |
| `response_shape_changed` | Field/tipe response provider berubah | Perlu update mapping di logic provider |
| `config_invalid` | Config/user data salah atau tidak lengkap | Cek file config provider |
| `unknown` | Kegagalan tak terduga | Cek log logic |

## 3. Aturan penulisan (kewajiban sisi logic)

1. **Atomik.** Tulis ke file temporer di folder yang sama, `flush` + `fsync`, lalu `os.replace()` ke nama final. UI tidak boleh pernah membaca file setengah jadi.
2. **Selalu menulis, termasuk saat gagal.** Kegagalan fetch WAJIB tetap menghasilkan gate file dengan `status: "error"`. Membiarkan file lama tanpa penanda adalah kelas bug terburuk di sini — angka basi akan tampil seolah valid.
3. **Jangan pernah menulis `status: "ok"` dengan angka yang belum lolos validasi.** Angka negatif, `null`, string, atau tipe tak terduga harus menjadi `status: "error"` dengan `code: "response_shape_changed"`, bukan dipaksa jadi 0.
4. **`last_updated` diisi waktu penulisan gate file**, bukan waktu request dikirim.

## 4. Aturan pembacaan (kewajiban sisi UI)

1. **Baca saat runtime, jangan di-import statis.** Gate file berubah di luar siklus build; kalau di-import statis, angkanya beku di bundle.
2. **Validasi sebelum render.** Cek `schema_version` dikenal, `status` valid, dan (saat `ok`) ketiga field `data` bertipe angka. Kalau tidak lolos, tampilkan state error UI — jangan render angka setengah valid.
3. **Deteksi stale.** Bandingkan `last_updated` dengan sekarang. Ambang default: peringatan bila lebih tua dari 25 jam (logic dijadwalkan harian). Data stale wajib terlihat jelas di UI walau `status: "ok"`.
4. **Handle gate file belum ada.** Saat pertama kali dipakai, file bisa belum dibuat. Ini bukan error — tampilkan state "belum ada data".
5. **Jangan pernah memanggil API provider dari UI.** Kalau UI butuh data baru, itu tugas logic; UI hanya membaca hasilnya.

## 5. Yang sengaja TIDAK ada di kontrak ini

- **Trigger dari UI ke logic.** Belum ada. Logic dijalankan terpisah (scheduler / manual). Kalau nanti dibutuhkan, itu penambahan kontrak baru, bukan boleh diakali dengan UI memanggil API langsung.
- **Riwayat historis.** Gate file hanya menyimpan snapshot terakhir, bukan time series.
- **Rahasia apa pun.** Cookie, token, user id tidak boleh masuk gate file. Gate file berisi angka hasil saja.
