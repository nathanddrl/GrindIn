// store/slices/brandingSlice.ts
// Slice Zustand — posts LinkedIn, CV jobs, taux d'acceptation (Branding module)

import type { StateCreator } from 'zustand';
import type { PostTypeId, JobId, ActivePost, BrandingState, FormationId } from '../../core/types';
import type { ConnectionsSlice } from './connectionsSlice';
import { POST_TYPES, JOBS, GAME_CONSTANTS } from '../../core/constants';

// ---------------------------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------------------------

export interface BrandingActions {
  /** Publie un post. Retourne false si cooldown actif, prérequis manquants ou fonds insuffisants. */
  publishPost: (id: PostTypeId) => boolean;

  /** Ajoute un job au CV. Retourne false si déjà acquis, prérequis manquants ou fonds insuffisants. */
  addCvJob: (id: JobId) => boolean;

  /**
   * Appelé à chaque UI tick (100ms).
   * Expire les posts/viral/trending, recalcule le taux d'acceptation.
   */
  tickBranding: (now: number) => void;

  /** Prestige reset : conserve cvJobs, cvPermanentBonus et baseAcceptanceRate. */
  resetBrandingForPrestige: () => void;
}

// ---------------------------------------------------------------------------
// SLICE TYPE
// ---------------------------------------------------------------------------

export type BrandingSlice = BrandingState & BrandingActions;

type SliceDeps = Pick<ConnectionsSlice, 'spendRelations' | 'relations' | 'setAcceptanceRate'> & {
  completedFormations?: FormationId[];
  sacrifices?: {
    sacrifices: Record<string, { active: boolean; malus: { acceptanceDelta: number } }>;
  };
};

// ---------------------------------------------------------------------------
// ÉTAT INITIAL
// ---------------------------------------------------------------------------

const POST_TYPE_IDS: PostTypeId[] = [
  'post_motivant', 'anecdote_inspirante', 'thread_dev_perso', 'temoignage_entrepreneur',
  'analyse_marche_bidon', 'tendance_linkedin', 'article_medium', 'post_viral',
];

function makeZeroRecord(): Record<PostTypeId, number> {
  return Object.fromEntries(POST_TYPE_IDS.map((id) => [id, 0])) as Record<PostTypeId, number>;
}

const INITIAL_STATE: BrandingState = {
  activePost: null,
  viralPost: null,
  postCooldowns: makeZeroRecord(),
  postPurchaseCounts: makeZeroRecord(),
  baseAcceptanceRate: GAME_CONSTANTS.BASE_ACCEPTANCE_RATE,
  cvJobs: [],
  cvPermanentBonus: 0,
  isTrending: false,
  trendingExpiresAt: 0,
  lastPostEndedAt: null,
  badBuzzExpiresAt: 0,
};

// ---------------------------------------------------------------------------
// HELPERS PURES
// ---------------------------------------------------------------------------

/** Coût d'un post en fonction du nombre de fois déjà acheté. */
function computePostCost(id: PostTypeId, purchaseCount: number): number {
  const def = POST_TYPES[id];
  return Math.round(def.baseCost * Math.pow(def.costMultiplier, purchaseCount));
}

/** Malus de decay dynamique basé sur le temps écoulé sans post actif (en %). */
function computeDecayPenalty(branding: BrandingState, now: number): number {
  if (branding.activePost !== null) return 0;
  if (branding.lastPostEndedAt === null) return 0;
  const elapsed = now - branding.lastPostEndedAt;
  const grace = GAME_CONSTANTS.DECAY_GRACE_PERIOD_SECONDS * 1000;
  if (elapsed <= grace) return 0;
  const steps = Math.floor((elapsed - grace) / 30_000);
  const raw = steps * GAME_CONSTANTS.DECAY_RATE_PER_30S;
  const maxDecay = branding.baseAcceptanceRate * (1 - GAME_CONSTANTS.DECAY_FLOOR_RATIO);
  return Math.min(raw, maxDecay);
}

/** Calcule le taux d'acceptation final à partir des composantes branding. */
function computeAcceptanceRate(
  branding: BrandingState,
  now: number,
  sacrificeMalusDelta: number,
): number {
  const postBonus = (branding.activePost?.bonusAmount ?? 0) + (branding.viralPost?.bonusAmount ?? 0);
  const effectivePostBonus = now < branding.badBuzzExpiresAt
    ? postBonus * (1 - GAME_CONSTANTS.BAD_BUZZ_PENALTY_RATIO)
    : postBonus;
  const decay = computeDecayPenalty(branding, now);
  const raw = branding.baseAcceptanceRate
    + branding.cvPermanentBonus
    + effectivePostBonus
    + sacrificeMalusDelta
    - decay;
  return Math.min(GAME_CONSTANTS.MAX_ACCEPTANCE_RATE, Math.max(0, raw));
}

/** Agrège le acceptanceDelta de tous les sacrifices actifs (0 si slice absent). */
function getSacrificeMalusDelta(deps: SliceDeps): number {
  if (!deps.sacrifices) return 0;
  return Object.values(deps.sacrifices.sacrifices)
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.malus.acceptanceDelta, 0);
}

// ---------------------------------------------------------------------------
// SLICE
// ---------------------------------------------------------------------------

export const createBrandingSlice: StateCreator<
  BrandingSlice & SliceDeps,
  [],
  [],
  BrandingSlice
> = (set, get) => ({
  ...INITIAL_STATE,

  publishPost: (id) => {
    if (id === 'post_viral') return false; // déclenché automatiquement uniquement

    const state = get();
    const def = POST_TYPES[id];
    const now = Date.now();

    // Cooldown actif ?
    if (state.postCooldowns[id] > now) return false;

    // Prérequis job CV ?
    if (def.requiredJobId && !state.cvJobs.includes(def.requiredJobId)) return false;

    const cost = computePostCost(id, state.postPurchaseCounts[id]);
    if (!state.spendRelations(cost)) return false;

    // Bonus réel : tendance_linkedin réduit si isTrending === false
    const actualBonus = id === 'tendance_linkedin' && !state.isTrending
      ? GAME_CONSTANTS.TRENDING_REDUCED_BONUS
      : def.acceptanceBonus;

    const activePost: ActivePost = {
      postTypeId: id,
      expiresAt: now + def.durationSeconds * 1000,
      bonusAmount: actualBonus,
    };

    // Viral trigger
    const isViral = Math.random() * 100 < (def.viralChance ?? 0);
    const viralPost: ActivePost | null = isViral
      ? { postTypeId: 'post_viral', expiresAt: now + GAME_CONSTANTS.VIRAL_DURATION_SECONDS * 1000, bonusAmount: GAME_CONSTANTS.VIRAL_BONUS_PERCENT }
      : null;

    set((s) => ({
      activePost,
      viralPost: isViral ? viralPost : s.viralPost,
      postCooldowns: { ...s.postCooldowns, [id]: now + def.cooldownSeconds * 1000 },
      postPurchaseCounts: { ...s.postPurchaseCounts, [id]: s.postPurchaseCounts[id] + 1 },
    }));

    const updated = get();
    updated.setAcceptanceRate(computeAcceptanceRate(updated, now, getSacrificeMalusDelta(updated)));
    return true;
  },

  addCvJob: (id) => {
    const state = get();
    const def = JOBS[id];

    if (state.cvJobs.includes(id)) return false;
    if (def.requiredFormationId && !(state.completedFormations ?? []).includes(def.requiredFormationId)) {
      return false;
    }
    if (!state.spendRelations(def.cost)) return false;

    const now = Date.now();
    const badBuzzTriggered = def.isFake
      && def.fakeBadBuzzRisk !== undefined
      && Math.random() * 100 < def.fakeBadBuzzRisk;

    set((s) => ({
      cvJobs: [...s.cvJobs, id],
      cvPermanentBonus: s.cvPermanentBonus + def.permanentAcceptanceBonus,
      badBuzzExpiresAt: badBuzzTriggered
        ? now + GAME_CONSTANTS.BAD_BUZZ_DURATION_SECONDS * 1000
        : s.badBuzzExpiresAt,
    }));

    const updated = get();
    updated.setAcceptanceRate(computeAcceptanceRate(updated, now, getSacrificeMalusDelta(updated)));
    return true;
  },

  tickBranding: (now) => {
    const state = get();
    type BrandingUpdate = Partial<Pick<BrandingState,
      'activePost' | 'viralPost' | 'isTrending' | 'trendingExpiresAt' | 'lastPostEndedAt'>>;
    const updates: BrandingUpdate = {};

    if (state.activePost !== null && now >= state.activePost.expiresAt) {
      updates.activePost = null;
      updates.lastPostEndedAt = state.activePost.expiresAt;
    }
    if (state.viralPost !== null && now >= state.viralPost.expiresAt) {
      updates.viralPost = null;
    }
    if (state.isTrending && now >= state.trendingExpiresAt) {
      updates.isTrending = false;
    }

    // Activation aléatoire de la tendance (seulement si pas déjà active)
    if (!state.isTrending && Math.random() < GAME_CONSTANTS.TRENDING_ACTIVATION_CHANCE_PER_TICK) {
      updates.isTrending = true;
      updates.trendingExpiresAt = now + GAME_CONSTANTS.TRENDING_DURATION_SECONDS * 1000;
    }

    if (Object.keys(updates).length > 0) set(updates);

    const current = get();
    current.setAcceptanceRate(computeAcceptanceRate(current, now, getSacrificeMalusDelta(current)));
  },

  resetBrandingForPrestige: () =>
    set({
      activePost: null,
      viralPost: null,
      postCooldowns: makeZeroRecord(),
      postPurchaseCounts: makeZeroRecord(),
      lastPostEndedAt: null,
      badBuzzExpiresAt: 0,
      isTrending: false,
      trendingExpiresAt: 0,
      // cvJobs, cvPermanentBonus, baseAcceptanceRate : conservés (survie au prestige)
    }),
});

// ---------------------------------------------------------------------------
// SÉLECTEURS
// ---------------------------------------------------------------------------

/** Bonus post effectif (principal + viral), réduit de moitié si bad buzz actif. */
export const selectPostBonus = (s: BrandingState, now: number): number => {
  const raw = (s.activePost?.bonusAmount ?? 0) + (s.viralPost?.bonusAmount ?? 0);
  return now < s.badBuzzExpiresAt ? raw * (1 - GAME_CONSTANTS.BAD_BUZZ_PENALTY_RATIO) : raw;
};

/** Coût du prochain achat d'un post donné. */
export const selectPostCost = (s: BrandingState, id: PostTypeId): number =>
  computePostCost(id, s.postPurchaseCounts[id]);

/** Indique si un post peut être publié (cooldown expiré + prérequis job OK). */
export const selectCanPublish = (s: BrandingState, id: PostTypeId, now: number): boolean => {
  if (id === 'post_viral') return false;
  const requiredJob = POST_TYPES[id].requiredJobId;
  return s.postCooldowns[id] <= now && (!requiredJob || s.cvJobs.includes(requiredJob));
};

/** Décroissance du taux d'acceptation en % (0 si post actif ou dans la grâce). */
export const selectDecayPenalty = (s: BrandingState, now: number): number =>
  computeDecayPenalty(s, now);
