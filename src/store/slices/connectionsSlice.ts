// store/slices/connectionsSlice.ts
// Slice Zustand — ressources principales : relations, demandes, taux d'acceptation, cycle

import type { StateCreator } from 'zustand';
import type { CycleResult } from '../../core/types';
import { GAME_CONSTANTS } from '../../core/constants';

// ---------------------------------------------------------------------------
// ÉTAT
// ---------------------------------------------------------------------------

export interface ConnectionsState {
  relations: number;
  totalRelationsEarned: number;   // jamais réinitialisé, sert aux seuils de prestige
  pendingRequests: number;
  incomingRequests: number;       // clicker secondaire — demandes reçues en attente
  acceptanceRate: number;         // taux calculé en % (base: 10, max: 95)
  requestsProcessedPerCycle: number; // base: 10 + contribution pyramide
}

// ---------------------------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------------------------

export interface ConnectionsActions {
  /** Ajoute des demandes envoyées (clic principal ou IA). */
  addPendingRequests: (count: number) => void;

  /** Ajoute des demandes reçues (clicker secondaire). */
  addIncomingRequests: (count: number) => void;

  /**
   * Accepte 1 demande reçue → +1 relation directement (hors cycle).
   * Retourne `true` si une demande était disponible, `false` sinon.
   */
  acceptIncomingRequest: () => boolean;

  /** Traite un cycle : accepte/rejette les demandes en attente, crédite les relations. */
  processCycle: () => CycleResult;

  /** Ajoute des relations sans passer par un cycle (bonus, prestige, debug). */
  addRelations: (amount: number) => void;

  /**
   * Dépense des relations. Retourne `true` si le solde était suffisant et que
   * la dépense a bien été effectuée, `false` sinon.
   */
  spendRelations: (amount: number) => boolean;

  /**
   * Réinitialise `relations` à 0 (prestige), sans toucher à `totalRelationsEarned`.
   */
  resetRelations: () => void;

  /** Met à jour le taux d'acceptation calculé (appelé par les modules branding / sacrifices). */
  setAcceptanceRate: (rate: number) => void;

  /** Met à jour le débit du cycle (appelé après un changement dans la pyramide). */
  setRequestsProcessedPerCycle: (count: number) => void;
}

// ---------------------------------------------------------------------------
// SLICE
// ---------------------------------------------------------------------------

export type ConnectionsSlice = ConnectionsState & ConnectionsActions;

export const createConnectionsSlice: StateCreator<
  ConnectionsSlice,
  [],
  [],
  ConnectionsSlice
> = (set, get) => ({
  // --- état initial ---
  relations: 0,
  totalRelationsEarned: 0,
  pendingRequests: 0,
  incomingRequests: 0,
  acceptanceRate: GAME_CONSTANTS.BASE_ACCEPTANCE_RATE,
  requestsProcessedPerCycle: GAME_CONSTANTS.BASE_REQUESTS_PER_CYCLE,

  // --- actions ---

  addPendingRequests: (count) =>
    set((s) => ({ pendingRequests: s.pendingRequests + count })),

  addIncomingRequests: (count) =>
    set((s) => ({ incomingRequests: s.incomingRequests + count })),

  acceptIncomingRequest: () => {
    if (get().incomingRequests <= 0) return false;
    set((s) => ({
      incomingRequests:     s.incomingRequests - 1,
      relations:            s.relations + 1,
      totalRelationsEarned: s.totalRelationsEarned + 1,
    }));
    return true;
  },

  processCycle: () => {
    const { pendingRequests, requestsProcessedPerCycle, acceptanceRate } = get();

    const processed = Math.min(pendingRequests, requestsProcessedPerCycle);
    const accepted  = Math.round(processed * (acceptanceRate / 100));
    const rejected  = processed - accepted;

    set((s) => ({
      pendingRequests:     s.pendingRequests - processed,
      relations:           s.relations + accepted,
      totalRelationsEarned: s.totalRelationsEarned + accepted,
    }));

    return { accepted, rejected, processed };
  },

  addRelations: (amount) =>
    set((s) => ({
      relations:            s.relations + amount,
      totalRelationsEarned: s.totalRelationsEarned + amount,
    })),

  spendRelations: (amount) => {
    if (get().relations < amount) return false;
    set((s) => ({ relations: s.relations - amount }));
    return true;
  },

  resetRelations: () => set({ relations: 0 }),

  setAcceptanceRate: (rate) =>
    set({ acceptanceRate: Math.min(rate, GAME_CONSTANTS.MAX_ACCEPTANCE_RATE) }),

  setRequestsProcessedPerCycle: (count) =>
    set({ requestsProcessedPerCycle: count }),
});

// ---------------------------------------------------------------------------
// SÉLECTEURS
// ---------------------------------------------------------------------------

/** Taux d'acceptation affiché, plafonné à MAX_ACCEPTANCE_RATE. */
export const selectAcceptanceRate = (s: ConnectionsState) =>
  Math.min(s.acceptanceRate, GAME_CONSTANTS.MAX_ACCEPTANCE_RATE);

/** Nombre de relations qui seront acceptées lors du prochain cycle idéal. */
export const selectProjectedRelationsPerCycle = (s: ConnectionsState) =>
  Math.round(
    Math.min(s.pendingRequests, s.requestsProcessedPerCycle) *
    (s.acceptanceRate / 100),
  );
