// features/clicker/ui/IncomingClickerPanel.tsx
// Clicker secondaire — demandes reçues en attente + bouton Accepter.

import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../../store/useGameStore';
import { selectCanClick } from '../../../store/useGameStore';
import { handleAcceptIncoming, computeIncomingIntervalSeconds } from '../logic/incomingClickerLogic';

export function IncomingClickerPanel(): React.ReactElement {
  const canClick       = useGameStore(selectCanClick);
  const incoming       = useGameStore((s) => s.incomingRequests);
  const acceptanceRate = useGameStore((s) => s.acceptanceRate);

  const intervalSec = computeIncomingIntervalSeconds(acceptanceRate);
  const canAccept   = canClick && incoming > 0;

  const [animating, setAnimating] = useState(false);

  const onClick = useCallback(() => {
    if (!canAccept) return;
    handleAcceptIncoming();
    setAnimating(true);
    setTimeout(() => setAnimating(false), 150);
  }, [canAccept]);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15),0_2px_3px_rgba(0,0,0,0.2)]">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <span className="text-[16px] font-semibold text-[#000000E6]">
          Demandes reçues
        </span>
        <span className="text-[12px] text-[#00000099]">
          +1 toutes les {intervalSec.toFixed(0)}s
        </span>
      </div>

      {/* Compteur */}
      <div className="flex items-center gap-2">
        <span className="text-[32px] font-bold text-[#0A66C2] leading-none">
          {incoming.toLocaleString('fr-FR')}
        </span>
        <span className="text-[14px] text-[#00000099]">en attente</span>
      </div>

      {/* Bouton Accepter */}
      <button
        type="button"
        onClick={onClick}
        disabled={!canAccept}
        aria-label="Accepter une demande reçue — +1 relation"
        className={[
          'flex items-center justify-center gap-1',
          'py-2 px-4 rounded-lg border',
          'text-[14px] font-semibold',
          'transition-all duration-150 select-none',
          canAccept
            ? [
                'border-[#0A66C2] text-[#0A66C2] bg-transparent',
                'hover:bg-[#0A66C2] hover:text-white cursor-pointer',
                'active:scale-95',
                animating ? 'scale-95' : 'scale-100',
              ].join(' ')
            : 'border-[#00000014] text-[#00000099] bg-transparent cursor-not-allowed opacity-50',
        ].join(' ')}
      >
        Accepter
        <span className="text-[12px] font-normal opacity-80">+1 relation</span>
      </button>
    </div>
  );
}
