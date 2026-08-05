/**
 * src/agentrouter/AgentRouterGate.tsx
 * ===================================
 * Composition root untuk provider AgentRouter.
 *
 * Isinya sengaja tipis: satu-satunya hal provider-specific di sisi UI adalah
 * ID provider dan judulnya. Semua pembacaan dan rendering ditangani shared/ui,
 * karena bentuk data tiap provider sudah diseragamkan oleh gate file.
 */

import { GatePanel } from '../../shared/ui/GatePanel';
import { useGate } from '../../shared/ui/useGate';

export const AGENTROUTER_PROVIDER_ID = 'agentrouter';

export function AgentRouterGate() {
  const { state, refresh } = useGate(AGENTROUTER_PROVIDER_ID);

  return <GatePanel title="AgentRouter" state={state} onRefresh={refresh} />;
}
