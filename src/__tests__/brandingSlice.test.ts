// __tests__/brandingSlice.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import {
  createBrandingSlice,
  type BrandingSlice,
  selectPostBonus,
  selectPostCost,
  selectCanPublish,
  selectDecayPenalty,
} from '../store/slices/brandingSlice';
import {
  createConnectionsSlice,
  type ConnectionsSlice,
} from '../store/slices/connectionsSlice';
import { POST_TYPES, JOBS, GAME_CONSTANTS } from '../core/constants';
import type { BrandingState } from '../core/types';

// ---------------------------------------------------------------------------
// Store de test — combine BrandingSlice + ConnectionsSlice
// ---------------------------------------------------------------------------

type TestStore = BrandingSlice & ConnectionsSlice;

const makeStore = () =>
  create<TestStore>()((...args) => ({
    ...createConnectionsSlice(...args),
    ...createBrandingSlice(...args),
  }));

describe('brandingSlice', () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // État initial
  // ---------------------------------------------------------------------------

  it('état initial correct', () => {
    const s = store.getState();
    expect(s.activePost).toBeNull();
    expect(s.viralPost).toBeNull();
    expect(s.cvJobs).toEqual([]);
    expect(s.cvPermanentBonus).toBe(0);
    expect(s.baseAcceptanceRate).toBe(GAME_CONSTANTS.BASE_ACCEPTANCE_RATE);
    expect(s.isTrending).toBe(false);
    expect(s.lastPostEndedAt).toBeNull();
    expect(s.badBuzzExpiresAt).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // publishPost — garde-fous
  // ---------------------------------------------------------------------------

  it('publishPost("post_viral") retourne false (déclenché automatiquement)', () => {
    store.getState().addRelations(100_000);
    expect(store.getState().publishPost('post_viral')).toBe(false);
    expect(store.getState().activePost).toBeNull();
  });

  it('publishPost échoue si fonds insuffisants', () => {
    expect(store.getState().publishPost('post_motivant')).toBe(false);
    expect(store.getState().activePost).toBeNull();
  });

  it('publishPost échoue si cooldown actif', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // pas de viral
    store.getState().addRelations(500);
    store.getState().publishPost('post_motivant');
    // Deuxième publication immédiate — cooldown actif
    store.getState().addRelations(500);
    const ok = store.getState().publishPost('post_motivant');
    expect(ok).toBe(false);
    expect(store.getState().postPurchaseCounts['post_motivant']).toBe(1);
  });

  it('publishPost échoue si requiredJobId absent du CV', () => {
    store.getState().addRelations(10_000);
    // analyse_marche_bidon requiert job 'consultant'
    const ok = store.getState().publishPost('analyse_marche_bidon');
    expect(ok).toBe(false);
    expect(store.getState().activePost).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // publishPost — cas nominal
  // ---------------------------------------------------------------------------

  it('publishPost dépense les relations et active le post', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    store.getState().addRelations(1_000);
    const cost = POST_TYPES['post_motivant'].baseCost;
    const ok = store.getState().publishPost('post_motivant');
    expect(ok).toBe(true);
    expect(store.getState().relations).toBe(1_000 - cost);
    expect(store.getState().activePost?.postTypeId).toBe('post_motivant');
    expect(store.getState().activePost?.bonusAmount).toBe(POST_TYPES['post_motivant'].acceptanceBonus);
  });

  it('publishPost définit le cooldown et incrémente postPurchaseCounts', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const now = Date.now();
    store.getState().addRelations(1_000);
    store.getState().publishPost('post_motivant');
    const cooldownMs = POST_TYPES['post_motivant'].cooldownSeconds * 1000;
    expect(store.getState().postCooldowns['post_motivant']).toBeGreaterThanOrEqual(now + cooldownMs);
    expect(store.getState().postPurchaseCounts['post_motivant']).toBe(1);
  });

  it('publishPost met à jour acceptanceRate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    store.getState().addRelations(1_000);
    store.getState().publishPost('post_motivant');
    const expected = GAME_CONSTANTS.BASE_ACCEPTANCE_RATE + POST_TYPES['post_motivant'].acceptanceBonus;
    expect(store.getState().acceptanceRate).toBe(expected);
  });

  it('publier un nouveau post remplace le précédent', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    store.getState().addRelations(10_000);
    store.getState().publishPost('post_motivant');
    // Dépasser le cooldown du post_motivant (30s)
    store.setState({
      postCooldowns: { ...store.getState().postCooldowns, post_motivant: 0 },
    });
    store.getState().publishPost('post_motivant');
    expect(store.getState().activePost?.postTypeId).toBe('post_motivant');
    expect(store.getState().postPurchaseCounts['post_motivant']).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // publishPost — tendance_linkedin bonus conditionnel
  // ---------------------------------------------------------------------------

  it('tendance_linkedin : bonus réduit quand isTrending = false', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    store.getState().addRelations(100_000);
    store.getState().publishPost('tendance_linkedin');
    expect(store.getState().activePost?.bonusAmount).toBe(GAME_CONSTANTS.TRENDING_REDUCED_BONUS);
  });

  it('tendance_linkedin : bonus plein quand isTrending = true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    store.setState({ isTrending: true, trendingExpiresAt: Date.now() + 999_999 });
    store.getState().addRelations(100_000);
    store.getState().publishPost('tendance_linkedin');
    expect(store.getState().activePost?.bonusAmount).toBe(POST_TYPES['tendance_linkedin'].acceptanceBonus);
  });

  // ---------------------------------------------------------------------------
  // publishPost — bonus viral
  // ---------------------------------------------------------------------------

  it('viral déclenché quand Math.random() < VIRAL_CHANCE / 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // 1% → < 5% → viral
    store.getState().addRelations(1_000);
    store.getState().publishPost('post_motivant');
    expect(store.getState().viralPost).not.toBeNull();
    expect(store.getState().viralPost?.bonusAmount).toBe(GAME_CONSTANTS.VIRAL_BONUS_PERCENT);
    expect(store.getState().viralPost?.postTypeId).toBe('post_viral');
  });

  it('pas de viral quand Math.random() >= VIRAL_CHANCE / 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // 90% → >= 5%
    store.getState().addRelations(1_000);
    store.getState().publishPost('post_motivant');
    expect(store.getState().viralPost).toBeNull();
  });

  it('viral existant conservé si nouveau post ne déclenche pas de viral', () => {
    const existingViral = {
      postTypeId: 'post_viral' as const,
      expiresAt: Date.now() + 999_999,
      bonusAmount: 25,
    };
    store.setState({ viralPost: existingViral });
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // pas de nouveau viral
    store.getState().addRelations(1_000);
    store.getState().publishPost('post_motivant');
    expect(store.getState().viralPost).toEqual(existingViral);
  });

  // ---------------------------------------------------------------------------
  // addCvJob — garde-fous
  // ---------------------------------------------------------------------------

  it('addCvJob échoue si fonds insuffisants', () => {
    expect(store.getState().addCvJob('stagiaire')).toBe(false);
    expect(store.getState().cvJobs).toHaveLength(0);
  });

  it('addCvJob échoue si job déjà acquis', () => {
    store.getState().addRelations(10_000);
    store.getState().addCvJob('stagiaire');
    const ok = store.getState().addCvJob('stagiaire');
    expect(ok).toBe(false);
    expect(store.getState().cvJobs).toHaveLength(1);
  });

  it('addCvJob échoue si prérequis formation manquant', () => {
    // consultant requiert personal_branding_basics
    store.getState().addRelations(100_000);
    const ok = store.getState().addCvJob('consultant');
    expect(ok).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // addCvJob — cas nominal
  // ---------------------------------------------------------------------------

  it('addCvJob dépense les relations et ajoute le job + bonus', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // pas de bad buzz
    store.getState().addRelations(10_000);
    const cost = JOBS['stagiaire'].cost;
    const ok = store.getState().addCvJob('stagiaire');
    expect(ok).toBe(true);
    expect(store.getState().relations).toBe(10_000 - cost);
    expect(store.getState().cvJobs).toContain('stagiaire');
    expect(store.getState().cvPermanentBonus).toBe(JOBS['stagiaire'].permanentAcceptanceBonus);
  });

  it('addCvJob met à jour acceptanceRate avec le bonus permanent', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    store.getState().addRelations(10_000);
    store.getState().addCvJob('stagiaire');
    const expected = GAME_CONSTANTS.BASE_ACCEPTANCE_RATE + JOBS['stagiaire'].permanentAcceptanceBonus;
    expect(store.getState().acceptanceRate).toBe(expected);
  });

  it('addCvJob réussit avec prérequis formation rempli', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    store.setState({ completedFormations: ['personal_branding_basics'] } as unknown as Partial<TestStore>);
    store.getState().addRelations(100_000);
    const ok = store.getState().addCvJob('consultant');
    expect(ok).toBe(true);
    expect(store.getState().cvJobs).toContain('consultant');
  });

  it('accumule les bonus de plusieurs jobs', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    store.getState().addRelations(100_000);
    store.getState().addCvJob('stagiaire');
    store.getState().addCvJob('charge_de_projet');
    const expected = JOBS['stagiaire'].permanentAcceptanceBonus + JOBS['charge_de_projet'].permanentAcceptanceBonus;
    expect(store.getState().cvPermanentBonus).toBe(expected);
  });

  // ---------------------------------------------------------------------------
  // addCvJob — bad buzz (job fake)
  // ---------------------------------------------------------------------------

  it('bad buzz déclenché sur job fake quand Math.random() < risk / 100', () => {
    // ceo_startup : fakeBadBuzzRisk = 5 → déclenché si random * 100 < 5 → random < 0.05
    vi.spyOn(Math, 'random').mockReturnValue(0.04);
    store.getState().addRelations(1_000_000);
    const before = Date.now();
    store.getState().addCvJob('ceo_startup');
    expect(store.getState().badBuzzExpiresAt).toBeGreaterThan(before);
    const expectedDuration = GAME_CONSTANTS.BAD_BUZZ_DURATION_SECONDS * 1000;
    expect(store.getState().badBuzzExpiresAt).toBeGreaterThanOrEqual(before + expectedDuration - 50);
  });

  it('pas de bad buzz sur job non-fake', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0); // même à 0%, pas de bad buzz si isFake=false
    store.getState().addRelations(10_000);
    store.getState().addCvJob('stagiaire');
    expect(store.getState().badBuzzExpiresAt).toBe(0);
  });

  it('pas de bad buzz quand Math.random() >= risk / 100', () => {
    // ceo_startup risk = 5 → pas de bad buzz si random >= 0.05
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    store.getState().addRelations(1_000_000);
    store.getState().addCvJob('ceo_startup');
    expect(store.getState().badBuzzExpiresAt).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // tickBranding — expiration des posts
  // ---------------------------------------------------------------------------

  it('tickBranding expire le post actif et définit lastPostEndedAt', () => {
    const expiredAt = Date.now() - 1000;
    store.setState({
      activePost: { postTypeId: 'post_motivant', expiresAt: expiredAt, bonusAmount: 1 },
    });
    store.getState().tickBranding(Date.now());
    expect(store.getState().activePost).toBeNull();
    expect(store.getState().lastPostEndedAt).toBe(expiredAt);
  });

  it('tickBranding expire le post viral', () => {
    const expiredAt = Date.now() - 1000;
    store.setState({
      viralPost: { postTypeId: 'post_viral', expiresAt: expiredAt, bonusAmount: 25 },
    });
    store.getState().tickBranding(Date.now());
    expect(store.getState().viralPost).toBeNull();
  });

  it('tickBranding expire la tendance active', () => {
    store.setState({ isTrending: true, trendingExpiresAt: Date.now() - 1 });
    store.getState().tickBranding(Date.now());
    expect(store.getState().isTrending).toBe(false);
  });

  it('tickBranding ne touche pas un post encore actif', () => {
    const post = { postTypeId: 'post_motivant' as const, expiresAt: Date.now() + 999_999, bonusAmount: 1 };
    store.setState({ activePost: post });
    store.getState().tickBranding(Date.now());
    expect(store.getState().activePost).toEqual(post);
    expect(store.getState().lastPostEndedAt).toBeNull();
  });

  it('tickBranding recalcule acceptanceRate à chaque appel', () => {
    // Pas de post, pas de job → taux de base
    store.getState().tickBranding(Date.now());
    expect(store.getState().acceptanceRate).toBe(GAME_CONSTANTS.BASE_ACCEPTANCE_RATE);
  });

  it('tickBranding applique la décroissance après la période de grâce', () => {
    const now = Date.now();
    const grace = GAME_CONSTANTS.DECAY_GRACE_PERIOD_SECONDS * 1000;
    // Simuler que le post a expiré il y a 150s (30s après la grâce de 120s → 1 step de decay)
    store.setState({ lastPostEndedAt: now - grace - 30_000 });
    store.getState().tickBranding(now);
    const expected = GAME_CONSTANTS.BASE_ACCEPTANCE_RATE - GAME_CONSTANTS.DECAY_RATE_PER_30S;
    expect(store.getState().acceptanceRate).toBeCloseTo(expected, 5);
  });

  // ---------------------------------------------------------------------------
  // resetBrandingForPrestige
  // ---------------------------------------------------------------------------

  it('resetBrandingForPrestige réinitialise les données éphémères', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // viral
    store.getState().addRelations(10_000);
    store.getState().publishPost('post_motivant');
    store.getState().resetBrandingForPrestige();
    const s = store.getState();
    expect(s.activePost).toBeNull();
    expect(s.viralPost).toBeNull();
    expect(s.lastPostEndedAt).toBeNull();
    expect(s.badBuzzExpiresAt).toBe(0);
    expect(s.isTrending).toBe(false);
    expect(Object.values(s.postCooldowns).every((v) => v === 0)).toBe(true);
    expect(Object.values(s.postPurchaseCounts).every((v) => v === 0)).toBe(true);
  });

  it('resetBrandingForPrestige conserve cvJobs, cvPermanentBonus et baseAcceptanceRate', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    store.getState().addRelations(10_000);
    store.getState().addCvJob('stagiaire');
    const bonusBefore = store.getState().cvPermanentBonus;
    store.getState().resetBrandingForPrestige();
    expect(store.getState().cvJobs).toContain('stagiaire');
    expect(store.getState().cvPermanentBonus).toBe(bonusBefore);
    expect(store.getState().baseAcceptanceRate).toBe(GAME_CONSTANTS.BASE_ACCEPTANCE_RATE);
  });

  // ---------------------------------------------------------------------------
  // Sélecteurs
  // ---------------------------------------------------------------------------

  describe('selectPostBonus', () => {
    it('retourne 0 sans post actif ni viral', () => {
      expect(selectPostBonus(store.getState(), Date.now())).toBe(0);
    });

    it('retourne le bonus du post actif', () => {
      store.setState({
        activePost: { postTypeId: 'post_motivant', expiresAt: Date.now() + 99999, bonusAmount: 5 },
      });
      expect(selectPostBonus(store.getState(), Date.now())).toBe(5);
    });

    it('cumule le bonus viral au bonus du post actif', () => {
      store.setState({
        activePost: { postTypeId: 'post_motivant', expiresAt: Date.now() + 99999, bonusAmount: 5 },
        viralPost:  { postTypeId: 'post_viral',    expiresAt: Date.now() + 99999, bonusAmount: 25 },
      });
      expect(selectPostBonus(store.getState(), Date.now())).toBe(30);
    });

    it('applique le malus bad buzz (× 0.5) pendant la durée active', () => {
      const now = Date.now();
      store.setState({
        activePost:      { postTypeId: 'post_motivant', expiresAt: now + 99999, bonusAmount: 10 },
        badBuzzExpiresAt: now + 99999,
      });
      const expected = 10 * (1 - GAME_CONSTANTS.BAD_BUZZ_PENALTY_RATIO);
      expect(selectPostBonus(store.getState(), now)).toBeCloseTo(expected, 5);
    });

    it("n'applique plus le malus apres expiration du bad buzz", () => {
      const now = Date.now();
      store.setState({
        activePost:      { postTypeId: 'post_motivant', expiresAt: now + 99999, bonusAmount: 10 },
        badBuzzExpiresAt: now - 1, // expiré
      });
      expect(selectPostBonus(store.getState(), now)).toBe(10);
    });
  });

  describe('selectPostCost', () => {
    it('retourne baseCost au premier achat (purchaseCount = 0)', () => {
      expect(selectPostCost(store.getState(), 'post_motivant')).toBe(POST_TYPES['post_motivant'].baseCost);
    });

    it('applique le multiplicateur au deuxième achat', () => {
      store.setState({ postPurchaseCounts: { ...store.getState().postPurchaseCounts, post_motivant: 1 } });
      const expected = Math.round(POST_TYPES['post_motivant'].baseCost * POST_TYPES['post_motivant'].costMultiplier);
      expect(selectPostCost(store.getState(), 'post_motivant')).toBe(expected);
    });
  });

  describe('selectCanPublish', () => {
    it('retourne false pour post_viral', () => {
      expect(selectCanPublish(store.getState(), 'post_viral', Date.now())).toBe(false);
    });

    it('retourne true si cooldown expiré et pas de prérequis', () => {
      expect(selectCanPublish(store.getState(), 'post_motivant', Date.now())).toBe(true);
    });

    it('retourne false si cooldown actif', () => {
      store.setState({ postCooldowns: { ...store.getState().postCooldowns, post_motivant: Date.now() + 99999 } });
      expect(selectCanPublish(store.getState(), 'post_motivant', Date.now())).toBe(false);
    });

    it('retourne false si requiredJobId absent du CV', () => {
      expect(selectCanPublish(store.getState(), 'analyse_marche_bidon', Date.now())).toBe(false);
    });

    it('retourne true si requiredJobId présent dans cvJobs', () => {
      store.setState({ cvJobs: ['consultant'] });
      expect(selectCanPublish(store.getState(), 'analyse_marche_bidon', Date.now())).toBe(true);
    });
  });

  describe('selectDecayPenalty', () => {
    const baseBranding = (): BrandingState => ({
      ...store.getState(),
      activePost: null,
    });

    it('retourne 0 si post actif', () => {
      const s: BrandingState = {
        ...baseBranding(),
        activePost: { postTypeId: 'post_motivant', expiresAt: Date.now() + 9999, bonusAmount: 1 },
        lastPostEndedAt: Date.now() - 999_999,
      };
      expect(selectDecayPenalty(s, Date.now())).toBe(0);
    });

    it('retourne 0 si jamais posté (lastPostEndedAt = null)', () => {
      expect(selectDecayPenalty(baseBranding(), Date.now())).toBe(0);
    });

    it('retourne 0 dans la période de grâce (< 120s)', () => {
      const now = Date.now();
      const s: BrandingState = { ...baseBranding(), lastPostEndedAt: now - 90_000 }; // 90s < 120s
      expect(selectDecayPenalty(s, now)).toBe(0);
    });

    it('retourne 0.5 après 1 step de decay (30s après la grâce)', () => {
      const now = Date.now();
      const grace = GAME_CONSTANTS.DECAY_GRACE_PERIOD_SECONDS * 1000;
      const s: BrandingState = { ...baseBranding(), lastPostEndedAt: now - grace - 30_000 };
      expect(selectDecayPenalty(s, now)).toBe(GAME_CONSTANTS.DECAY_RATE_PER_30S);
    });

    it('retourne 1.0 après 2 steps de decay', () => {
      const now = Date.now();
      const grace = GAME_CONSTANTS.DECAY_GRACE_PERIOD_SECONDS * 1000;
      const s: BrandingState = { ...baseBranding(), lastPostEndedAt: now - grace - 60_000 };
      expect(selectDecayPenalty(s, now)).toBe(GAME_CONSTANTS.DECAY_RATE_PER_30S * 2);
    });

    it('plafonne au maximum (baseAcceptanceRate × (1 - DECAY_FLOOR_RATIO))', () => {
      const now = Date.now();
      const s: BrandingState = { ...baseBranding(), lastPostEndedAt: now - 99_999_999 }; // très longtemps
      const max = GAME_CONSTANTS.BASE_ACCEPTANCE_RATE * (1 - GAME_CONSTANTS.DECAY_FLOOR_RATIO);
      expect(selectDecayPenalty(s, now)).toBe(max);
    });
  });
});
