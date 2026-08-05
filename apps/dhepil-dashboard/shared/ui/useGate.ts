/**
 * shared/ui/useGate.ts
 * ====================
 * Hook pembaca gate file: baca sekali saat mount, lalu poll berkala.
 *
 * Polling dipakai (bukan file watcher) karena logic berjalan sebagai proses
 * terpisah yang tidak punya kanal komunikasi ke UI - satu-satunya penghubung
 * adalah file, sesuai kontrak di docs/GATE_CONTRACT.md.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { readGate, type GateState } from './gate';

/** Gate file berubah paling cepat sekali sehari; 60 detik sudah lebih dari cukup. */
const DEFAULT_POLL_MS = 60_000;

export function useGate(provider: string, pollMs: number = DEFAULT_POLL_MS) {
  const [state, setState] = useState<GateState>({ kind: 'loading' });

  // Cegah respons dari request lama menimpa hasil yang lebih baru, mis. saat
  // refresh manual ditekan bersamaan dengan poll terjadwal.
  const requestSeq = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;
    const next = await readGate(provider);
    if (seq === requestSeq.current) {
      setState(next);
    }
  }, [provider]);

  useEffect(() => {
    // Ganti provider berarti data lama tidak relevan lagi - kembalikan ke
    // loading supaya angka provider sebelumnya tidak sempat tampil.
    setState({ kind: 'loading' });
    void refresh();

    const timer = window.setInterval(() => {
      void refresh();
    }, pollMs);

    return () => window.clearInterval(timer);
  }, [refresh, pollMs]);

  return { state, refresh };
}
