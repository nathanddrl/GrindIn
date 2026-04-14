// hooks/useGameLoop.ts
// Attache et détache la boucle de jeu au cycle de vie du composant racine.
// À monter une seule fois (App ou main), jamais dans un composant enfant.

import { useEffect, useRef } from 'react';
import {
  startGameLoop,
  stopGameLoop,
  applyOfflineProgress,
  type LoopCallbacks,
} from '../core/gameLoop';

export function useGameLoop(callbacks: LoopCallbacks = {}): void {
  // Ref stable : les callbacks peuvent changer sans redémarrer la boucle
  const callbacksRef = useRef<LoopCallbacks>(callbacks);
  useEffect(() => { callbacksRef.current = callbacks; });

  useEffect(() => {
    // Rattrapage hors-ligne avant le premier tick
    applyOfflineProgress();

    startGameLoop({
      onCycle:           (...args) => callbacksRef.current.onCycle?.(...args),
      onTick:            (...args) => callbacksRef.current.onTick?.(...args),
      onOfflineProgress: (...args) => callbacksRef.current.onOfflineProgress?.(...args),
    });

    return stopGameLoop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionnellement vide : la boucle ne se relance pas entre renders
}
