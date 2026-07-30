# Implementation Plan — Terminal Auto-Clear & Auto-Scroll

## Latar Belakang
Sesuai permintaan Anda, kita akan menambahkan dua fitur *quality-of-life* pada komponen Terminal:
1. **Auto-Clear:** Terminal otomatis dibersihkan ketika server sengaja dimatikan (`stopped`).
2. **Auto-Scroll:** Terminal selalu otomatis di-*scroll* ke baris paling bawah setiap kali ada baris *log* baru yang masuk.

---

## Proposed Changes

### `src/ControlCenterScreen.tsx`
Menambahkan aturan sederhana pada fungsi pembuatan *View Model* Terminal.
- Mengubah fungsi pembantu `createTerminalViewModel` agar juga menerima argumen `status`.
- Jika `status === 'stopped'`, fungsi tersebut akan mengembalikan himpunan *log* kosong (`[]`), sehingga Terminal langsung tampak bersih di UI tanpa harus menghapus data log asli yang mungkin masih tersimpan di *backend*.
- (Jika statusnya adalah `error` karena aplikasi *crash*, log akan tetap dipertahankan agar Anda bisa melihat pesan *error*-nya).

### `ui/card-grid/Terminal.tsx`
Menambahkan fitur *auto-scroll* menggunakan siklus *React hook* standar.
- Meng-import `useEffect` dan `useRef` dari React.
- Mengaitkan `useRef` ke dalam elemen `<pre>` milik terminal.
- Menggunakan `useEffect` yang memantau perubahan variabel `content` (isi teks log). Setiap kali teks berubah atau bertambah panjang, *scroll* paksa elemen `<pre>` agar `scrollTop = scrollHeight`, menjamin visibilitas baris paling akhir di bagian bawah.

---

## Verification Plan

### Manual Verification
1. Jalankan server aplikasi apa saja.
2. Pantau terminal yang sedang mengeluarkan log. Pastikan terminal secara otomatis terus ter-scroll ke baris terbawah.
3. Klik tombol "Stop server".
4. Verifikasi bahwa segera setelah statusnya berubah menjadi "Tidak aktif", kotak terminal langsung mereset teks menjadi "Belum ada output process." (kosong).
