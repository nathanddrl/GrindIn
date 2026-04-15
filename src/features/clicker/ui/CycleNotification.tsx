// features/clicker/ui/CycleNotification.tsx
// Toast flottant affiché 3 s après chaque cycle : "+X relations | Y ignorées"

import React from 'react';
import { useGameStore } from '../../../store/useGameStore';

const DISPLAY_MS = 3_000;

export function CycleNotification(): React.ReactElement | null {
  const result      = useGameStore((s) => s.cycleLastResult);
  const resultAt    = useGameStore((s) => s.cycleLastResultAt);
  const lastTickAt  = useGameStore((s) => s.lastTickAt);

  if (!result || resultAt === 0) return null;
  if (result.processed === 0)    return null;
  if (lastTickAt - resultAt > DISPLAY_MS) return null;

  const age      = lastTickAt - resultAt;
  const opacity  = age < DISPLAY_MS * 0.75 ? 1 : 1 - (age - DISPLAY_MS * 0.75) / (DISPLAY_MS * 0.25);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ opacity: Math.max(0, opacity) }}
      className={[
        'pointer-events-none',
        'flex items-center gap-2 px-4 py-2 rounded-lg',
        'bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15),0_2px_3px_rgba(0,0,0,0.2)]',
        'text-[14px] font-semibold text-[#000000E6]',
        'transition-opacity duration-300',
      ].join(' ')}
    >
      <span className="text-[#057642]">
        +{result.accepted.toLocaleString('fr-FR')} relations 🤝
      </span>
      {result.rejected > 0 && (
        <span className="text-[#00000099] font-normal">
          | {result.rejected.toLocaleString('fr-FR')} ignorée{result.rejected > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
