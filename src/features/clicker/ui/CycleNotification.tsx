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
        'flex max-w-[min(92vw,34rem)] flex-col items-center gap-2 rounded-2xl px-6 py-5 text-center',
        'border border-[var(--linkedin-border)] bg-white/98 shadow-[0_12px_30px_rgba(0,0,0,0.18)]',
        'text-[18px] font-semibold text-[#000000E6] sm:text-[24px]',
        'transition-opacity duration-300',
      ].join(' ')}
    >
      <span className="text-[#057642]">
        +{result.accepted.toLocaleString('fr-FR')} relations 🤝
      </span>
      {result.rejected > 0 && (
        <span className="font-normal text-[14px] text-[#00000099] sm:text-[16px]">
          | {result.rejected.toLocaleString('fr-FR')} ignorée{result.rejected > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
