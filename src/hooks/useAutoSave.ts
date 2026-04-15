// hooks/useAutoSave.ts
// Déclenche une sauvegarde explicite toutes les AUTOSAVE_INTERVAL_SECONDS.

import { useEffect } from 'react';
import { GAME_CONSTANTS } from '../core/constants';
import { saveGame } from '../utils/saveLoad';
import { useGameStore } from '../store/useGameStore';

export function useAutoSave(): void {
  const gamePhase = useGameStore((s) => s.gamePhase);

  useEffect(() => {
    if (gamePhase !== 'playing' && gamePhase !== 'infinite') return;

    const id = setInterval(saveGame, GAME_CONSTANTS.AUTOSAVE_INTERVAL_SECONDS * 1000);
    return () => clearInterval(id);
  }, [gamePhase]);
}
