# Handoff Document

**Status Terakhir**: 
Fitur terminal *auto-clear* dan *auto-scroll* telah selesai diimplementasikan dengan sempurna dan mematuhi arsitektur CoreUI Encapsulation.

**Pekerjaan Selesai**:
1. Memperbaiki logika presentasi: memindahkan logika pembersihan array terminal dari Parent (`ControlCenterScreen.tsx`) murni ke Child (`ui/card-grid/Terminal.tsx`).
2. Menambahkan fitur auto-scroll menggunakan `useRef` dan `useEffect` di `Terminal.tsx`.
3. Menulis ulang dokumentasi arsitektur menjadi **`PLAYBOOK.md`** di *root directory*.
4. Memperbarui **`AGENTS.md`** dengan peringatan keras mengenai peletakan logika di *parent components*.

**Kondisi Codebase Saat Ini**:
- **Dilarang keras menaruh logika presentasi/kondisional di Parent Orchestrator**. Selalu taruh logika visual (seperti filter log, *scroll*, manipulasi DOM) di dalam komponen *Child* terkecil.
- Seluruh arsitektur, panduan *tech stack*, dan cara menambahkan app baru kini telah dikompilasi secara terpusat di `PLAYBOOK.md`. Silakan baca file tersebut jika Anda bingung mengenai arsitektur.
- `.ai/` folder kini murni hanya berisi file pelacakan temporer (`implementation_plan.md` & `handoff.md`).

**Fokus Selanjutnya**:
Pengembangan *feature* baru di dalam target `apps/`, atau perbaikan UI spesifik lainnya yang dibebankan kepada komponen *child* masing-masing. Arsitektur *engine* dan layout saat ini sangat stabil.
