// features/clicker/ui/PendingRequestsCounter.tsx
// Affiche le nombre de demandes en attente de traitement.

import React from 'react';
import { useGameStore } from '../../../store/useGameStore';
import { selectPending } from '../../../store/useGameStore';
import { Tooltip } from '../../../components/Tooltip';

export function PendingRequestsCounter(): React.ReactElement {
  const pending = useGameStore(selectPending);

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15),0_2px_3px_rgba(0,0,0,0.2)]">
      <span className="text-[14px] text-[#00000099] font-normal flex items-center gap-1">
        Demandes en attente
        <Tooltip text="Tes demandes envoyées et pas encore traitées. On croise les doigts." />
      </span>
      <span className="text-[16px] font-semibold text-[#000000E6]">
        {pending.toLocaleString('fr-FR')}
      </span>
    </div>
  );
}
