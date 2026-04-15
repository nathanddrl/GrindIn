// features/clicker/logic/clickerLogic.ts
// Logique pure du clicker principal — aucun effet de bord React ici.

import { useGameStore } from '../../../store/useGameStore';

/** Envoie des demandes de connexion si le joueur n'est pas banni. */
export function handleMainClick(): void {
  const { isBanned, clicksPerRequest, addPendingRequests } = useGameStore.getState();
  if (isBanned) return;
  addPendingRequests(clicksPerRequest);
}
