// store/slices/mindsetSlice.ts
// Slice Zustand — formations LinkedIn (Mindset module)

import type { StateCreator } from 'zustand';
import type { FormationId, JobId, ActiveFormation, MindsetState } from '../../core/types';
import type { ConnectionsSlice } from './connectionsSlice';
import { FORMATIONS, GAME_CONSTANTS } from '../../core/constants';

// ---------------------------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------------------------

export interface MindsetActions {
  /**
   * Tente d'acheter et de démarrer une formation.
   * Retourne `false` si prérequis manquants, déjà complétée, déjà en cours, ou fonds insuffisants.
   */
  buyFormation: (id: FormationId) => boolean;

  /**
   * Appelé à chaque UI tick (100ms).
   * Complète les formations dont `endsAt <= now` et applique les `clicksBonus`.
   * `formationSpeedDelta` est le delta % issu des sacrifices actifs (ex: -30 pour burnout).
   */
  tickFormations: (now: number) => void;

  /**
   * Prestige reset : vide les formations en cours, conserve completedFormations et totalClicksBonus.
   */
  resetActiveFormations: () => void;
}

// ---------------------------------------------------------------------------
// SLICE TYPE
// ---------------------------------------------------------------------------

export type MindsetSlice = MindsetState & MindsetActions;

// Cross-slice dependency : besoin de `spendRelations`, `relations`, et optionnellement
// `sacrifices.sacrifices` pour le malus burnout (absent tant que sacrificesSlice n'existe pas).
type SliceDeps = Pick<ConnectionsSlice, 'spendRelations' | 'relations'> & {
  sacrifices?: {
    sacrifices: Record<string, { active: boolean; malus: { formationSpeedDelta: number } }>;
  };
  branding?: { cvJobs: readonly JobId[] };
  setClicksPerRequest?: (count: number) => void;
};

// ---------------------------------------------------------------------------
// ÉTAT INITIAL
// ---------------------------------------------------------------------------

const INITIAL_STATE: MindsetState = {
  completedFormations: [],
  activeFormations: [],
  totalClicksBonus: 0,
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Calcule la durée réelle d'une formation en tenant compte du malus burnout. */
function computeRealDuration(baseSeconds: number, formationSpeedDelta: number): number {
  // formationSpeedDelta est négatif (ex: -30 = 30% plus lent → durée × 1.3)
  const multiplier = 1 - formationSpeedDelta / 100;
  return Math.round(baseSeconds * multiplier);
}

/** Agrège le formationSpeedDelta de tous les sacrifices actifs (0 si slice absent). */
function getFormationSpeedDelta(deps: SliceDeps): number {
  if (!deps.sacrifices) return 0;
  return Object.values(deps.sacrifices.sacrifices)
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.malus.formationSpeedDelta, 0);
}

// ---------------------------------------------------------------------------
// SLICE
// ---------------------------------------------------------------------------

export const createMindsetSlice: StateCreator<
  MindsetSlice & SliceDeps,
  [],
  [],
  MindsetSlice
> = (set, get) => ({
  ...INITIAL_STATE,

  buyFormation: (id) => {
    const state = get();
    const def = FORMATIONS[id];

    // Prérequis : formation déjà complétée ?
    if (state.completedFormations.includes(id)) return false;

    // Prérequis : déjà en cours ?
    if (state.activeFormations.some((af) => af.formationId === id)) return false;

    // Prérequis : formation prérequise complétée ?
    if (def.requiredFormationId && !state.completedFormations.includes(def.requiredFormationId)) {
      return false;
    }

    // Prérequis : job CV requis présent dans cvJobs ?
    if (def.requiredJobId && !(state.branding?.cvJobs ?? []).includes(def.requiredJobId)) {
      return false;
    }

    // Dépenser les relations
    if (!state.spendRelations(def.cost)) return false;

    // Calculer la durée réelle (malus burnout)
    const speedDelta = getFormationSpeedDelta(state);
    const realDuration = computeRealDuration(def.durationSeconds, speedDelta);
    const now = Date.now();

    const newActive: ActiveFormation = {
      formationId: id,
      startedAt: now,
      endsAt: now + realDuration * 1000,
      completed: false,
    };

    set((s) => ({ activeFormations: [...s.activeFormations, newActive] }));
    return true;
  },

  tickFormations: (now) => {
    const { activeFormations, completedFormations } = get();

    const justCompleted = activeFormations.filter((af) => !af.completed && af.endsAt <= now);
    if (justCompleted.length === 0) return;

    const newCompleted: FormationId[] = justCompleted.map((af) => af.formationId);
    const totalBonus = newCompleted.reduce((sum, id) => sum + FORMATIONS[id].clicksBonus, 0);

    set((s) => ({
      activeFormations: s.activeFormations.map((af) =>
        newCompleted.includes(af.formationId) ? { ...af, completed: true } : af,
      ),
      completedFormations: [
        ...completedFormations,
        ...newCompleted.filter((id) => !completedFormations.includes(id)),
      ],
      totalClicksBonus: s.totalClicksBonus + totalBonus,
    }));
  },

  resetActiveFormations: () =>
    set({ activeFormations: [] }),
});

// ---------------------------------------------------------------------------
// SÉLECTEURS
// ---------------------------------------------------------------------------

/** Vérifie si une formation est disponible à l'achat (prérequis OK, pas déjà complétée/en cours). */
export const selectFormationAvailable = (
  s: MindsetState,
  id: FormationId,
  cvJobs?: readonly JobId[],
): boolean => {
  if (s.completedFormations.includes(id)) return false;
  if (s.activeFormations.some((af) => af.formationId === id)) return false;
  const def = FORMATIONS[id];
  if (def.requiredFormationId && !s.completedFormations.includes(def.requiredFormationId)) {
    return false;
  }
  if (def.requiredJobId && !(cvJobs ?? []).includes(def.requiredJobId)) {
    return false;
  }
  return true;
};

/** Progression (0–1) d'une formation en cours, ou null si introuvable. */
export const selectFormationProgress = (
  s: MindsetState,
  id: FormationId,
  now: number,
): number | null => {
  const active = s.activeFormations.find((af) => af.formationId === id && !af.completed);
  if (!active) return null;
  const total = active.endsAt - active.startedAt;
  if (total <= 0) return 1;
  return Math.min(1, (now - active.startedAt) / total);
};

/** `clicksPerRequest` effectif = base + bonus formations. */
export const selectClicksPerRequest = (s: MindsetState): number =>
  GAME_CONSTANTS.BASE_CLICKS_PER_REQUEST + s.totalClicksBonus;
