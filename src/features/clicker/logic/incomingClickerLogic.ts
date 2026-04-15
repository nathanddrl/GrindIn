// features/clicker/logic/incomingClickerLogic.ts
// Logique pure du clicker secondaire — acceptation des demandes reçues.

import { useGameStore } from '../../../store/useGameStore';
import { GAME_CONSTANTS } from '../../../core/constants';

/** Accepte 1 demande reçue si disponible et joueur non banni. */
export function handleAcceptIncoming(): boolean {
  const { isBanned, acceptIncomingRequest } = useGameStore.getState();
  if (isBanned) return false;
  return acceptIncomingRequest();
}

/**
 * Calcule l'intervalle d'accumulation des demandes entrantes en secondes.
 * Exposé pour l'affichage UI du timer.
 */
export function computeIncomingIntervalSeconds(acceptanceRate: number): number {
  const effectiveRate = Math.max(
    0,
    acceptanceRate - GAME_CONSTANTS.BASE_ACCEPTANCE_RATE,
  );

  return Math.max(
    GAME_CONSTANTS.MIN_INCOMING_INTERVAL_SECONDS,
    GAME_CONSTANTS.BASE_INCOMING_INTERVAL_SECONDS
      - effectiveRate
        * GAME_CONSTANTS.INCOMING_RATE_FACTOR
        * GAME_CONSTANTS.INCOMING_RATE_SCALING,
  );
}
