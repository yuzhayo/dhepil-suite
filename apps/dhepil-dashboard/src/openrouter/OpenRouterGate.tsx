/**
 * src/openrouter/OpenRouterGate.tsx
 * =================================
 * Composition root untuk provider OpenRouter.
 *
 * Logic-nya belum ditulis, tapi UI-nya sudah bisa berdiri sekarang: gate file
 * yang belum ada akan tampil sebagai state "belum ada data", bukan crash.
 * Ini konsekuensi yang diinginkan dari pemisahan gate - UI tidak menunggu
 * logic selesai untuk bisa dikerjakan.
 */

import { GatePanel } from '../../shared/ui/GatePanel';
import { useGate } from '../../shared/ui/useGate';

export const OPENROUTER_PROVIDER_ID = 'openrouter';

export function OpenRouterGate() {
  const { state, refresh } = useGate(OPENROUTER_PROVIDER_ID);

  return <GatePanel title="OpenRouter" state={state} onRefresh={refresh} />;
}
