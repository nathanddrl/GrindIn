// features/clicker/ui/MainClickerButton.tsx
// Bouton principal d'envoi de demandes de connexion.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '../../../store/useGameStore';
import { selectCanClick } from '../../../store/useGameStore';
import { handleMainClick } from '../logic/clickerLogic';

export function MainClickerButton(): React.ReactElement {
  const canClick      = useGameStore(selectCanClick);
  const clicksPerReq  = useGameStore((s) => s.clicksPerRequest);
  const isBanned      = useGameStore((s) => s.isBanned);

  const [animating, setAnimating] = useState(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (animTimerRef.current !== null) clearTimeout(animTimerRef.current);
    };
  }, []);

  const onClick = useCallback(() => {
    if (!canClick) return;
    handleMainClick();
    if (animTimerRef.current !== null) clearTimeout(animTimerRef.current);
    setAnimating(true);
    animTimerRef.current = setTimeout(() => setAnimating(false), 150);
  }, [canClick]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canClick}
      aria-label={`Envoyer ${clicksPerReq} demande${clicksPerReq > 1 ? 's' : ''} de connexion`}
      className={[
        // layout
        'flex flex-col items-center justify-center gap-1',
        'w-full py-4 px-6 rounded-lg',
        // couleurs LinkedIn
        'bg-[#0A66C2] text-white font-semibold text-base',
        // shadow LinkedIn
        'shadow-[0_0_0_1px_rgba(0,0,0,0.15),0_2px_3px_rgba(0,0,0,0.2)]',
        // transition
        'transition-all duration-150 select-none',
        // hover / active
        canClick
          ? 'hover:bg-[#004182] active:scale-95 cursor-pointer'
          : 'opacity-50 cursor-not-allowed',
        // animation bounce au clic
        animating ? 'scale-95' : 'scale-100',
      ].join(' ')}
    >
      <span className="text-[16px] font-semibold leading-tight">
        Envoyer une demande de connexion
      </span>
      <span className="text-[13px] font-normal opacity-90">
        +{clicksPerReq} demande{clicksPerReq > 1 ? 's' : ''}
      </span>
      {isBanned && (
        <span className="text-[12px] font-normal opacity-80 mt-1">
          ⛔ Compte suspendu
        </span>
      )}
    </button>
  );
}
