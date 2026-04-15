// store/useGameStore.ts
// Store Zustand principal — assemble tous les slices en un état global persistant.

import { create, type StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { GamePhase } from '../core/types';
import { GAME_CONSTANTS, SAVE_VERSION } from '../core/constants';

import {
  createConnectionsSlice,
  type ConnectionsSlice,
} from './slices/connectionsSlice';

// ---------------------------------------------------------------------------
// SLICE MÉTA — état global non rattaché à un module fonctionnel
// ---------------------------------------------------------------------------

interface GameMetaState {
  gamePhase: GamePhase;
  isBanned: boolean;                // ban IA actif — bloque clicker + cycle
  banRemainingSeconds: number;
  clicksPerRequest: number;         // demandes envoyées par clic (base: 1)
  cycleDuration: number;            // durée du cycle en secondes (base: 30 - sacrifices)

  // Timestamps internes (ms)
  lastTickAt: number;
  lastCycleAt: number;
  lastPostDecayAt: number;
}

interface GameMetaActions {
  setGamePhase: (phase: GamePhase) => void;
  setBanned: (banned: boolean, remainingSeconds?: number) => void;
  tickBanTimer: (elapsedSeconds: number) => void;
  setClicksPerRequest: (count: number) => void;
  setCycleDuration: (seconds: number) => void;
  updateTimestamps: (now: number, fields: Partial<Pick<GameMetaState, 'lastTickAt' | 'lastCycleAt' | 'lastPostDecayAt'>>) => void;
}

type GameMetaSlice = GameMetaState & GameMetaActions;

const createGameMetaSlice: StateCreator<GameStore, [], [], GameMetaSlice> = (set) => ({
  // --- état initial ---
  gamePhase: 'playing',
  isBanned: false,
  banRemainingSeconds: 0,
  clicksPerRequest: GAME_CONSTANTS.BASE_CLICKS_PER_REQUEST,
  cycleDuration: GAME_CONSTANTS.BASE_CYCLE_DURATION_SECONDS,
  lastTickAt: 0,
  lastCycleAt: 0,
  lastPostDecayAt: 0,

  // --- actions ---
  setGamePhase: (phase) => set({ gamePhase: phase }),

  setBanned: (banned, remainingSeconds = 0) =>
    set({ isBanned: banned, banRemainingSeconds: banned ? remainingSeconds : 0 }),

  tickBanTimer: (elapsedSeconds) =>
    set((s) => {
      const next = Math.max(0, s.banRemainingSeconds - elapsedSeconds);
      return { banRemainingSeconds: next, isBanned: next > 0 };
    }),

  setClicksPerRequest: (count) => set({ clicksPerRequest: count }),

  setCycleDuration: (seconds) =>
    set({ cycleDuration: Math.max(seconds, GAME_CONSTANTS.MIN_CYCLE_DURATION_SECONDS) }),

  updateTimestamps: (_now, fields) => set(fields),
});

// ---------------------------------------------------------------------------
// TYPE RACINE DU STORE
// Ajouter chaque nouveau slice ici au fur et à mesure.
// ---------------------------------------------------------------------------

export type GameStore =
  & GameMetaSlice
  & ConnectionsSlice;
// À venir :
// & MindsetSlice
// & BrandingSlice
// & PyramidSlice
// & SacrificesSlice
// & AIGrowthSlice
// & PrestigeSlice

// ---------------------------------------------------------------------------
// CRÉATION DU STORE
// ---------------------------------------------------------------------------

export const useGameStore = create<GameStore>()(
  persist(
    (...args) => ({
      ...createGameMetaSlice(...args),
      ...createConnectionsSlice(...args),
    }),
    {
      name: 'grindin-save',
      version: SAVE_VERSION,
      storage: createJSONStorage(() => localStorage),

      // N'exclure les timestamps de la sauvegarde qu'en phase de développement
      // pour éviter des dérives après rechargement.
      // En production, on les persiste pour le calcul de l'offline progress.
      partialize: (s) => ({
        gamePhase:               s.gamePhase,
        isBanned:                s.isBanned,
        banRemainingSeconds:     s.banRemainingSeconds,
        clicksPerRequest:        s.clicksPerRequest,
        cycleDuration:           s.cycleDuration,
        lastTickAt:              s.lastTickAt,
        lastCycleAt:             s.lastCycleAt,
        lastPostDecayAt:         s.lastPostDecayAt,
        relations:               s.relations,
        totalRelationsEarned:    s.totalRelationsEarned,
        pendingRequests:         s.pendingRequests,
        incomingRequests:        s.incomingRequests,
        acceptanceRate:          s.acceptanceRate,
        requestsProcessedPerCycle: s.requestsProcessedPerCycle,
        // cycleLastResult + cycleLastResultAt : éphémères, non persistés
      }),

      migrate: (persisted, fromVersion) => {
        // Prochains paliers de migration à brancher ici :
        // if (fromVersion < 2) { ... }
        void fromVersion;
        return persisted as GameStore;
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// SÉLECTEURS GLOBAUX
// Préférer des sélecteurs stables (référence constante) pour éviter les
// re-renders inutiles dans les composants React.
// ---------------------------------------------------------------------------

export const selectGamePhase    = (s: GameStore) => s.gamePhase;
export const selectIsBanned     = (s: GameStore) => s.isBanned;
export const selectRelations    = (s: GameStore) => s.relations;
export const selectPending      = (s: GameStore) => s.pendingRequests;
export const selectAcceptance   = (s: GameStore) => s.acceptanceRate;
export const selectCycleDuration = (s: GameStore) => s.cycleDuration;

/** Indique si le joueur peut cliquer (pas banni, phase active). */
export const selectCanClick = (s: GameStore) =>
  !s.isBanned && s.gamePhase === 'playing';
