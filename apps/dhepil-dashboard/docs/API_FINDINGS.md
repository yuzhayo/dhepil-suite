# API Findings — AgentRouter

> Lihat `docs/AGENT_CONTEXT.md` dulu kalau belum familiar dengan project ini.

Dokumen ini mencatat hasil inspeksi manual (DevTools) terhadap API AgentRouter
yang dipakai dashboard console mereka. Ini bukan dokumentasi resmi dari
AgentRouter, murni hasil observasi dari akun github_251501, per 4 Agustus 2026.

## Platform

Berbasis panel New-API (terlihat dari header response X-Oneapi-Request-Id
dan struktur field yang khas seperti quota, used_quota, aff_code).

## Endpoint yang relevan

| Endpoint | Method | Guna |
|---|---|---|
| https://agentrouter.org/api/user/self | GET | Data akun: balance, consumption, request count (SATU-SATUNYA endpoint yang dipanggil kode) |

Catatan: `/api/status` sempat dicek manual (lewat DevTools) untuk mengambil
nilai `quota_per_unit`, tapi endpoint itu TIDAK dipanggil oleh kode mana pun
di project ini. Lihat bagian "Keputusan desain: quota_per_unit statis" di
bawah untuk alasannya.

## Autentikasi

Butuh dua hal sekaligus di request header:

1. Cookie session=... - didapat dari proses login (lihat auth flow di README)
2. Header New-Api-User - berisi user ID akun (untuk akun ini: 251502)
   - Terlihat di tab Request Headers saat inspect request self
   - Kemungkinan tiap akun beda ID-nya - ini alasan kenapa new_api_user_id
     ditaruh di user_data.json, bukan di kode

Tanpa header New-Api-User, kemungkinan request akan gagal/ditolak walau cookie
valid (belum diuji langsung, tapi ini pola umum di panel New-API untuk
memastikan cookie session cocok dengan user yang benar).

## Response /api/user/self (contoh, angka mentah)

Field yang dipakai dashboard:
- data.quota -> saldo saat ini (raw, perlu dikonversi)
- data.used_quota -> total konsumsi (raw, perlu dikonversi)
- data.request_count -> jumlah request (sudah angka langsung, tidak perlu konversi)

## Response /api/status (dicek manual sekali, bukan dipanggil kode)

Field penting: data.quota_per_unit (nilai untuk akun ini: 500000). Nilai ini
di-hardcode ke `user_data.json`, BUKAN diambil otomatis tiap kali dashboard
di-refresh. Detail alasannya di bawah.

## Rumus konversi (TERVERIFIKASI COCOK)

nilai_dollar = raw_value / quota_per_unit

Bukti verifikasi (dari screenshot dashboard awal vs response API):

| Raw value | quota_per_unit | Hasil hitung | Ditampilkan di dashboard | Cocok? |
|---|---|---|---|---|
| quota: 87312576 | 500000 | 174.625 | Current balance: $174.63 | Ya (dibulatkan) |
| used_quota: 100187424 | 500000 | 200.37 | Consumption: $200.37 | Ya |
| request_count: 570 | - (langsung) | 570 | Number of Requests: 570 | Ya |

## Keputusan desain: quota_per_unit statis, bukan fetch dinamis

`quota_per_unit` di-hardcode di `user_data.json` (hasil pengecekan manual
sekali ke `/api/status`), BUKAN diambil otomatis oleh kode setiap kali
`fetch_balance.py` jalan.

Ini keputusan sadar: lebih sedikit titik gagal (satu request API lebih
sedikit yang bisa timeout, gagal auth, atau berubah format tanpa terduga).

**Trade-off yang perlu diketahui:** kalau AgentRouter mengubah nilai
`quota_per_unit` di masa depan, dashboard akan menampilkan angka yang SALAH
tanpa error apa pun (perhitungan tetap jalan, cuma hasilnya keliru) - sampai
user sadar dan cek ulang manual ke `/api/status`, lalu update
`user_data.json`.

`config.json` dan `lib/loader.py` sengaja TIDAK punya field
`api_status_endpoint` lagi, supaya tidak ada kesan endpoint itu dipakai
kode - satu-satunya endpoint yang benar-benar dipanggil project ini adalah
`/api/user/self`.

## Selector tombol "Login with GitHub"

Hasil Copy Selector dari DevTools mengarah ke elemen span paling dalam di
dalam tombol, bukan elemen button itu sendiri. Untuk automasi Playwright,
lebih aman dan tahan lama pakai selector sampai level button:nth-child(1)
saja (klik akan tetap kena tombolnya karena event click bubbling), karena
struktur span internal lebih rentan berubah kalau AgentRouter update versi
UI library-nya (framework ini pakai Semi Design - terlihat dari class
semi-card, semi-button).

Selector lengkap (level button, dipakai di kode) disimpan di user_data.json
supaya gampang diganti kalau UI mereka berubah, tanpa harus edit file .py.

## Access Token / System Token

Belum dicek (di-skip dulu oleh user). Kalau nanti dicek dan ternyata
AgentRouter punya token permanen di halaman Personal Settings, ini akan jadi
cara yang jauh lebih baik dibanding pendekatan cookie+GitHub-relogin yang
dipakai sekarang, karena tidak butuh Playwright/browser automation sama
sekali, tinggal kirim header Authorization: Bearer <token> langsung. Kalau
ada, seluruh lib/auth.py dan refresh_cookie.py bisa dihapus, tinggal
lib/api_client.py yang dipakai (auth-nya tinggal ganti dari cookie jadi
bearer token).

## Hal yang belum terverifikasi / asumsi

- Apakah cookie session punya masa berlaku pasti (berapa hari) - belum diuji
- Apakah New-Api-User wajib atau sekadar ikut terkirim dari frontend (browser)
  tapi sebenarnya backend cuma butuh cookie - belum diuji langsung tanpa
  header ini
- Apakah ada rate limit untuk request otomatis ke endpoint ini

## Catatan keamanan

Screenshot cookie session yang dikirim user sebelumnya diredaksi dengan
coretan freehand, bukan blok solid/blur - cara ini tidak reliable untuk
menyembunyikan teks di data gambar. Disarankan logout+login ulang untuk
invalidate session lama sebagai langkah jaga-jaga.
