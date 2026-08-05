/**
 * shared/ui/gate.ts
 * =================
 * Sisi pembaca kontrak gate file. Lihat docs/GATE_CONTRACT.md.
 *
 * File ini adalah SATU-SATUNYA tempat UI menyentuh bentuk gate file. Tidak ada
 * komponen yang boleh membaca `data.json` langsung atau meng-import-nya statis:
 * import statis membekukan angka ke dalam bundle saat build, sehingga dashboard
 * akan menampilkan nilai lama tanpa tanda apa pun bahwa datanya basi.
 */

export const GATE_SCHEMA_VERSION = 1;

/** Ambang stale default: logic dijadwalkan harian, beri toleransi 1 jam. */
export const STALE_AFTER_MS = 25 * 60 * 60 * 1000;

export type GateErrorCode =
  | 'auth_invalid'
  | 'network_error'
  | 'response_shape_changed'
  | 'config_invalid'
  | 'unknown';

export interface GateNumbers {
  balance: number;
  consumption: number;
  requests: number;
}

/**
 * Hasil pembacaan gate file, sudah dinormalisasi jadi satu union yang
 * exhaustive. UI cukup melakukan switch atas `kind` - tidak ada state
 * setengah-valid yang perlu ditebak komponen.
 */
export type GateState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'ok'; numbers: GateNumbers; lastUpdated: Date; isStale: boolean }
  | { kind: 'error'; code: GateErrorCode; message: string; lastUpdated: Date | null }
  | { kind: 'invalid'; reason: string };

const KNOWN_ERROR_CODES: readonly GateErrorCode[] = [
  'auth_invalid',
  'network_error',
  'response_shape_changed',
  'config_invalid',
  'unknown',
];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Ubah JSON mentah jadi GateState.
 *
 * Dipisahkan dari fetch supaya bisa diuji tanpa jaringan, dan supaya aturan
 * validasinya terbaca di satu tempat. Apa pun yang tidak lolos validasi
 * menjadi `invalid` - bukan dipaksa jadi angka 0, karena angka 0 yang tampil
 * rapi tidak bisa dibedakan user dari saldo yang benar-benar habis.
 */
export function parseGatePayload(raw: unknown, now: number): GateState {
  if (typeof raw !== 'object' || raw === null) {
    return { kind: 'invalid', reason: 'Isi gate file bukan objek JSON.' };
  }

  const payload = raw as Record<string, unknown>;

  if (payload.schema_version !== GATE_SCHEMA_VERSION) {
    return {
      kind: 'invalid',
      reason:
        `Versi schema gate file tidak dikenal (${String(payload.schema_version)}, ` +
        `UI mengharapkan ${GATE_SCHEMA_VERSION}). Logic dan UI perlu disamakan.`,
    };
  }

  const lastUpdated = parseTimestamp(payload.last_updated);

  if (payload.status === 'error') {
    const error = payload.error as Record<string, unknown> | null | undefined;
    const rawCode = error?.code;
    const code = KNOWN_ERROR_CODES.includes(rawCode as GateErrorCode)
      ? (rawCode as GateErrorCode)
      : 'unknown';
    const message =
      typeof error?.message === 'string' && error.message.trim() !== ''
        ? error.message
        : 'Logic melaporkan kegagalan tanpa pesan detail.';

    return { kind: 'error', code, message, lastUpdated };
  }

  if (payload.status !== 'ok') {
    return {
      kind: 'invalid',
      reason: `Field 'status' tidak dikenal: ${String(payload.status)}.`,
    };
  }

  const data = payload.data as Record<string, unknown> | null | undefined;
  if (typeof data !== 'object' || data === null) {
    return {
      kind: 'invalid',
      reason: "Status 'ok' tapi field 'data' kosong. Gate file tidak konsisten.",
    };
  }

  // Status "ok" mewajibkan ketiganya angka. Kalau satu saja meleset, seluruh
  // pembacaan dianggap invalid - menampilkan sebagian angka lebih menyesatkan
  // daripada menampilkan error.
  if (
    !isFiniteNumber(data.balance) ||
    !isFiniteNumber(data.consumption) ||
    !isFiniteNumber(data.requests)
  ) {
    return {
      kind: 'invalid',
      reason:
        "Status 'ok' tapi ada angka yang tidak valid " +
        `(balance: ${String(data.balance)}, consumption: ${String(data.consumption)}, ` +
        `requests: ${String(data.requests)}).`,
    };
  }

  if (lastUpdated === null) {
    return {
      kind: 'invalid',
      reason: `Field 'last_updated' bukan waktu yang valid: ${String(payload.last_updated)}.`,
    };
  }

  return {
    kind: 'ok',
    numbers: {
      balance: data.balance,
      consumption: data.consumption,
      requests: data.requests,
    },
    lastUpdated,
    isStale: now - lastUpdated.getTime() > STALE_AFTER_MS,
  };
}

/**
 * Ambil gate file provider lewat URL stabil yang disediakan plugin Vite.
 *
 * `cache: 'no-store'` disengaja: gate file berubah di luar siklus build, dan
 * respons yang di-cache akan menampilkan angka lama seolah masih segar.
 */
export async function readGate(provider: string, now: number = Date.now()): Promise<GateState> {
  let response: Response;
  try {
    response = await fetch(`/gate/${provider}.json`, { cache: 'no-store' });
  } catch {
    return {
      kind: 'invalid',
      reason: 'Gate file tidak bisa dibaca (dev server tidak merespons).',
    };
  }

  // Gate file belum pernah ditulis logic - kondisi normal saat pertama pakai.
  if (response.status === 404) {
    return { kind: 'missing' };
  }

  if (!response.ok) {
    return {
      kind: 'invalid',
      reason: `Gagal membaca gate file (HTTP ${response.status}).`,
    };
  }

  try {
    return parseGatePayload(await response.json(), now);
  } catch {
    return {
      kind: 'invalid',
      reason: 'Isi gate file bukan JSON yang bisa diurai. Kemungkinan file rusak.',
    };
  }
}
