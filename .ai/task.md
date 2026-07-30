# Task — Architecture Restructure: Modular Engine + Root UI

**Tujuan:** Mengubah struktur dari nested `features/control-center/` ke arsitektur modular:
- `src/engine/` = parent orchestrator + flat children (logic only)
- `ui/` = shared UI di monorepo root (bisa dipakai semua apps)
- `src/ControlCenterScreen.tsx` = compose langsung, tanpa presenter layer terpisah

Lihat target lengkap: [implementation_plan.md](./implementation_plan.md)

---

## Changelog

### 2026-07-30 (sebelumnya — conversation a240e9ea)
- Phase 1: copy runtime code ke `src/engine/` ✅
- Phase 2: rewire consumers → engine imports ✅
- Phase 3: hapus duplikat dari `application/` ✅

### 2026-07-30 (conversation b3b93037 — sekarang)
- Audit arsitektur → ditemukan `engine/` masih over-engineered (subfolder dalam children, extensions layer, data/domain subfolder)
- Diskusi arsitektur target baru: flat children, UI di root monorepo, compose langsung
- Plan, task, implementation_plan, handoff ditulis ulang untuk mencerminkan target baru
- **Belum ada code yang diubah untuk target baru**

---

## Phase A — Flatten `src/engine/`

Hapus subfolder di dalam engine, jadikan flat files.

- [ ] Flatten `engine/children/project-lifecycle/` → `engine/children/projectLifecycle.ts`
  - Merge: `projectLifecycleChild.ts` + `startupReadinessPolicy.ts` + `stopProject.ts`
- [ ] Flatten `engine/children/project-refresh/` → `engine/children/projectRefresh.ts`
- [ ] Flatten `engine/children/quick-kill/` → `engine/children/quickKill.ts`
- [ ] Flatten `engine/data/*.ts` → flat di `engine/` (rename sesuai target)
  - `httpProjectManagerClient.ts` → `engine/httpClient.ts`
  - `browserProjectWindow.ts` → `engine/browserWindow.ts`
  - `projectManagerResponse.ts` → `engine/responseParser.ts`
- [ ] Flatten `engine/domain/*.ts` → flat di `engine/`
  - `projectActionPolicy.ts` → `engine/projectActionPolicy.ts`
  - `projectCollection.ts` → `engine/projectCollection.ts`
  - `projectStatus.ts` → `engine/projectStatus.ts`
- [ ] Hapus `engine/extensions/` seluruhnya (ganti dengan children flat)
- [ ] Update `engine/createEngine.ts` → tidak lagi pakai extensions host
- [ ] Update `engine/index.ts` → barrel exports semua flat files
- [ ] Verify: `npm run typecheck`

## Phase B — Pindah UI ke Monorepo Root

- [ ] Buat folder `ui/` di root monorepo
- [ ] Pindah `src/features/control-center/ui/layout/*.tsx|css` → `ui/`
- [ ] Pindah `src/features/control-center/ui/header/*.tsx|css` → `ui/`
- [ ] Pindah `src/features/control-center/ui/toolbar/*.tsx|css` → `ui/`
- [ ] Pindah `src/features/control-center/ui/grid/*.tsx|css` → `ui/`
- [ ] Pindah `src/features/control-center/ui/card/*.tsx|css` → `ui/`
- [ ] Update semua import yang mengacu ke lokasi lama
- [ ] Verify: `npm run typecheck`

## Phase C — Collapse Presenter/Controller ke Screen

- [ ] Buat `src/ControlCenterScreen.tsx` baru (polling + state + compose inline)
  - Absorb logic dari `useControlCenterController.ts`
  - Absorb mapping dari semua `presenters/*.ts`
  - Render UI components dari `ui/` langsung
- [ ] Hapus `src/features/control-center/application/` seluruhnya
- [ ] Hapus `src/features/control-center/screens/`
- [ ] Update `src/App.tsx` → import dari `src/ControlCenterScreen.tsx`
- [ ] Verify: `npm run typecheck`

## Phase D — Hapus `features/` Seluruhnya

- [ ] Pastikan `src/features/` kosong
- [ ] Hapus folder `src/features/`
- [ ] Verify: tidak ada import yang masih referensi `features/`

## Phase E — Pindah + Update Tests

- [ ] Pindah test children ke `engine/children/*.test.ts`
- [ ] Pindah test domain/data ke `engine/*.test.ts`
- [ ] Update/hapus test presenter dan controller (digabung ke screen test jika perlu)
- [ ] Update test UI → import dari `ui/` bukan `features/`
- [ ] Verify: `npm run test`

## Phase F — Update ESLint Boundaries

- [ ] Update `tooling/eslint/controlCenterBoundaryConfigs.ts`
  - engine → tidak boleh import dari `ui/`, `src/App.tsx`, atau `apps/`
  - `ui/` → tidak boleh import dari `engine/` langsung
  - `ControlCenterScreen.tsx` → boleh import dari `engine/` dan `ui/`
- [ ] Verify: `npm run lint`

## Phase G — Full Validation Gate

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npx --yes antd lint src --format json`
