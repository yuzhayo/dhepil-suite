# P00 UI Baseline

Source: existing `src/App.test.tsx` plus P00 characterization tests. Accessible names and user-visible states are recorded from the mounted dashboard.

## Accessible names

- Heading: `Dhepil Suite`
- Project articles: `Project <project name>`
- Search input: `Cari project`
- Sort select: `Urutkan project`
- View segmented control: `Mode tampilan project`
- Project collection: `Daftar project mode grid` or `Daftar project mode list`
- Loading collection: `Memuat project`
- Log region: `Log <project name>`
- Action buttons: `Start & buka`, `Buka project`, `Tidak tersedia`, `Stop server`
- Quick server menu trigger: `Server aktif (<count>) ▾`

## User-visible states

- `stopped`: `Tidak aktif`; `Start & buka` enabled; `Stop server` disabled.
- `starting`: `Sedang dinyalakan`; start action unavailable/loading; stop disabled unless managed.
- `running`: `Aktif`; managed process exposes enabled `Stop server`.
- `stopping`: `Sedang dihentikan`; stop action loading.
- `error`: `Terjadi error`; `Process gagal` alert; retry/start path visible.
- `invalid`: `Konfigurasi tidak valid`; `Kontrak app tidak valid`; actions unavailable.
- `external`: `Aktif di luar dashboard`; warning `Server berjalan di luar root`; root stop disabled.
- `port-conflict`: `Port bentrok`; locked-port warning; start unavailable.
- `not-found`: `App not found (404)`; folder-loss alert; managed stop/kill remains enabled.
- Loading: skeleton collection labelled `Memuat project`.
- Empty: `Project tidak ditemukan`.
- Page error: `Control center mengalami masalah`, error detail, `Coba lagi`.
- Search: filters by visible project data including port/path.
- Sort: name ascending/descending, port ascending, active-first.
- View: `Grid` and `List` preserve collection accessible label.
- Quick kill: active managed project menu item exposes `Kill`; unmanaged item exposes `External` and is disabled.

Evidence is characterization, not a redesign or browser-QA claim.
