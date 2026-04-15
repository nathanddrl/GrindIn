// features/clicker/ui/CycleCountdown.tsx
// Barre de progression + secondes restantes jusqu'au prochain cycle.

import React from 'react';
import { useGameStore } from '../../../store/useGameStore';

export function CycleCountdown(): React.ReactElement {
  const lastCycleAt              = useGameStore((s) => s.lastCycleAt);
  const cycleDuration            = useGameStore((s) => s.cycleDuration);
  const isBanned                 = useGameStore((s) => s.isBanned);
  const requestsProcessedPerCycle = useGameStore((s) => s.requestsProcessedPerCycle);
  // lastTickAt se met à jour toutes les 100 ms — pilote les re-renders
  const lastTickAt               = useGameStore((s) => s.lastTickAt);

  const cycleMs   = cycleDuration * 1_000;
  const elapsed   = lastCycleAt > 0 ? Math.max(0, lastTickAt - lastCycleAt) : 0;
  const progress  = lastCycleAt > 0 ? Math.min(1, elapsed / cycleMs) : 0;
  const remaining = Math.max(0, cycleDuration - elapsed / 1_000);

  const label = isBanned
    ? 'Compte suspendu'
    : lastCycleAt === 0
      ? 'En attente...'
      : `Prochain cycle dans ${remaining.toFixed(1)} s`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-[#00000099]">Cycle de traitement</span>
        <span className="text-[12px] text-[#00000099]">{label}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-[#00000099]">Demandes traitées/cycle</span>
        <span className="text-[12px] font-semibold text-[#000000E6]">{requestsProcessedPerCycle}</span>
      </div>

      <div className="h-2 rounded-full bg-[#00000014] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: isBanned ? '#CC1016' : '#0A66C2',
          }}
        />
      </div>
    </div>
  );
}
