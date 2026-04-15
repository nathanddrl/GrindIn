// __tests__/mindsetSlice.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import {
  createMindsetSlice,
  type MindsetSlice,
  selectFormationAvailable,
  selectFormationProgress,
  selectClicksPerRequest,
} from '../store/slices/mindsetSlice';
import {
  createConnectionsSlice,
  type ConnectionsSlice,
} from '../store/slices/connectionsSlice';
import { FORMATIONS, GAME_CONSTANTS } from '../core/constants';

// ---------------------------------------------------------------------------
// Store de test — combine MindsetSlice + ConnectionsSlice (pour spendRelations)
// ---------------------------------------------------------------------------

type TestStore = MindsetSlice & ConnectionsSlice;

const makeStore = () =>
  create<TestStore>()((...args) => ({
    ...createConnectionsSlice(...args),
    ...createMindsetSlice(...args),
  }));

describe('mindsetSlice', () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
  });

  // ---------------------------------------------------------------------------
  // État initial
  // ---------------------------------------------------------------------------

  it('état initial correct', () => {
    const s = store.getState();
    expect(s.completedFormations).toEqual([]);
    expect(s.activeFormations).toEqual([]);
    expect(s.totalClicksBonus).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // buyFormation — garde-fous
  // ---------------------------------------------------------------------------

  it('buyFormation échoue si fonds insuffisants', () => {
    const ok = store.getState().buyFormation('growth_mindset_101');
    expect(ok).toBe(false);
    expect(store.getState().activeFormations).toHaveLength(0);
  });

  it('buyFormation dépense les relations et démarre la formation', () => {
    store.getState().addRelations(100);
    const ok = store.getState().buyFormation('growth_mindset_101');
    expect(ok).toBe(true);
    expect(store.getState().relations).toBe(100 - FORMATIONS.growth_mindset_101.cost);
    expect(store.getState().activeFormations).toHaveLength(1);
    expect(store.getState().activeFormations[0].formationId).toBe('growth_mindset_101');
    expect(store.getState().activeFormations[0].completed).toBe(false);
  });

  it('buyFormation échoue si formation déjà en cours', () => {
    store.getState().addRelations(500);
    store.getState().buyFormation('growth_mindset_101');
    const ok = store.getState().buyFormation('growth_mindset_101');
    expect(ok).toBe(false);
    expect(store.getState().activeFormations).toHaveLength(1);
  });

  it('buyFormation échoue si formation déjà complétée', () => {
    store.getState().addRelations(200);
    store.getState().buyFormation('growth_mindset_101');
    // Compléter manuellement via setState
    store.setState((s) => ({
      activeFormations: [],
      completedFormations: ['growth_mindset_101'],
      totalClicksBonus: s.totalClicksBonus + FORMATIONS.growth_mindset_101.clicksBonus,
    }));
    const ok = store.getState().buyFormation('growth_mindset_101');
    expect(ok).toBe(false);
  });

  it('buyFormation échoue si prérequis formation manquant', () => {
    // the_art_of_networking requiert growth_mindset_101
    store.getState().addRelations(1000);
    const ok = store.getState().buyFormation('the_art_of_networking');
    expect(ok).toBe(false);
    expect(store.getState().activeFormations).toHaveLength(0);
  });

  it('buyFormation réussit quand prérequis formation rempli', () => {
    store.setState({ completedFormations: ['growth_mindset_101'] });
    store.getState().addRelations(1000);
    const ok = store.getState().buyFormation('the_art_of_networking');
    expect(ok).toBe(true);
  });

  it('buyFormation échoue si requiredJobId absent de branding.cvJobs', () => {
    // become_a_thought_leader requiert job 'consultant'
    store.getState().addRelations(200_000);
    const ok = store.getState().buyFormation('become_a_thought_leader');
    expect(ok).toBe(false);
    expect(store.getState().activeFormations).toHaveLength(0);
  });

  it('buyFormation réussit quand requiredJobId présent dans branding.cvJobs', () => {
    store.setState({
      branding: { cvJobs: ['consultant'] },
    } as unknown as Partial<TestStore>);
    store.getState().addRelations(200_000);
    const ok = store.getState().buyFormation('become_a_thought_leader');
    expect(ok).toBe(true);
  });

  it('plusieurs formations peuvent être actives simultanément', () => {
    store.getState().addRelations(10_000);
    store.getState().buyFormation('growth_mindset_101');
    store.getState().buyFormation('personal_branding_basics');
    expect(store.getState().activeFormations).toHaveLength(2);
  });

  it('buyFormation calcule endsAt = startedAt + durée en ms', () => {
    store.getState().addRelations(100);
    const before = Date.now();
    store.getState().buyFormation('growth_mindset_101');
    const after = Date.now();
    const af = store.getState().activeFormations[0];
    const expectedDuration = FORMATIONS.growth_mindset_101.durationSeconds * 1000;
    expect(af.endsAt - af.startedAt).toBe(expectedDuration);
    expect(af.startedAt).toBeGreaterThanOrEqual(before);
    expect(af.startedAt).toBeLessThanOrEqual(after);
  });

  // ---------------------------------------------------------------------------
  // tickFormations — complétion
  // ---------------------------------------------------------------------------

  it('tickFormations ne fait rien si aucune formation active', () => {
    store.getState().tickFormations(Date.now());
    expect(store.getState().completedFormations).toHaveLength(0);
    expect(store.getState().totalClicksBonus).toBe(0);
  });

  it('tickFormations ne complète pas une formation avant son échéance', () => {
    store.getState().addRelations(100);
    store.getState().buyFormation('growth_mindset_101');
    const af = store.getState().activeFormations[0];
    // Tick avant endsAt
    store.getState().tickFormations(af.endsAt - 1000);
    expect(store.getState().completedFormations).toHaveLength(0);
    expect(store.getState().activeFormations[0].completed).toBe(false);
  });

  it('tickFormations complète la formation quand now >= endsAt', () => {
    store.getState().addRelations(100);
    store.getState().buyFormation('growth_mindset_101');
    const af = store.getState().activeFormations[0];
    store.getState().tickFormations(af.endsAt);
    expect(store.getState().completedFormations).toContain('growth_mindset_101');
    expect(store.getState().activeFormations[0].completed).toBe(true);
  });

  it('tickFormations applique le clicksBonus dans totalClicksBonus', () => {
    store.getState().addRelations(100);
    store.getState().buyFormation('growth_mindset_101');
    const af = store.getState().activeFormations[0];
    store.getState().tickFormations(af.endsAt);
    expect(store.getState().totalClicksBonus).toBe(FORMATIONS.growth_mindset_101.clicksBonus);
  });

  it('tickFormations accumule les bonus de plusieurs formations', () => {
    store.getState().addRelations(10_000);
    store.getState().buyFormation('growth_mindset_101');
    store.getState().buyFormation('personal_branding_basics');
    const [af1, af2] = store.getState().activeFormations;
    const t = Math.max(af1.endsAt, af2.endsAt);
    store.getState().tickFormations(t);
    const expected =
      FORMATIONS.growth_mindset_101.clicksBonus +
      FORMATIONS.personal_branding_basics.clicksBonus;
    expect(store.getState().totalClicksBonus).toBe(expected);
    expect(store.getState().completedFormations).toHaveLength(2);
  });

  it('tickFormations ne re-complète pas une formation déjà marquée completed', () => {
    store.getState().addRelations(100);
    store.getState().buyFormation('growth_mindset_101');
    const af = store.getState().activeFormations[0];
    store.getState().tickFormations(af.endsAt);
    const bonusAfterFirst = store.getState().totalClicksBonus;
    // Second tick au même timestamp
    store.getState().tickFormations(af.endsAt + 1000);
    expect(store.getState().totalClicksBonus).toBe(bonusAfterFirst);
  });

  // ---------------------------------------------------------------------------
  // resetActiveFormations (prestige)
  // ---------------------------------------------------------------------------

  it('resetActiveFormations vide les formations en cours', () => {
    store.getState().addRelations(1000);
    store.getState().buyFormation('growth_mindset_101');
    store.getState().resetActiveFormations();
    expect(store.getState().activeFormations).toHaveLength(0);
  });

  it('resetActiveFormations conserve completedFormations et totalClicksBonus', () => {
    store.setState({
      completedFormations: ['growth_mindset_101'],
      totalClicksBonus: 1,
    });
    store.getState().addRelations(500);
    store.getState().buyFormation('personal_branding_basics');
    store.getState().resetActiveFormations();
    expect(store.getState().completedFormations).toContain('growth_mindset_101');
    expect(store.getState().totalClicksBonus).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Malus burnout (formationSpeedDelta)
  // ---------------------------------------------------------------------------

  it('burnout actif allonge la durée de la formation de 30%', () => {
    // Injecter un sacrifice burnout actif — cast car sacrificesSlice n'existe pas encore
    store.setState({
      sacrifices: {
        sacrifices: {
          burnout: { active: true, malus: { formationSpeedDelta: -30 } },
        },
      },
    } as unknown as Partial<TestStore>);
    store.getState().addRelations(100);
    store.getState().buyFormation('growth_mindset_101');
    const af = store.getState().activeFormations[0];
    const baseDuration = FORMATIONS.growth_mindset_101.durationSeconds * 1000;
    const expectedDuration = Math.round(baseDuration * 1.3);
    expect(af.endsAt - af.startedAt).toBe(expectedDuration);
  });

  // ---------------------------------------------------------------------------
  // Sélecteurs
  // ---------------------------------------------------------------------------

  describe('selectFormationAvailable', () => {
    it('retourne true si formation disponible sans prérequis', () => {
      const s = store.getState();
      expect(selectFormationAvailable(s, 'growth_mindset_101')).toBe(true);
    });

    it('retourne false si formation déjà complétée', () => {
      store.setState({ completedFormations: ['growth_mindset_101'] });
      expect(selectFormationAvailable(store.getState(), 'growth_mindset_101')).toBe(false);
    });

    it('retourne false si formation déjà en cours', () => {
      store.getState().addRelations(100);
      store.getState().buyFormation('growth_mindset_101');
      expect(selectFormationAvailable(store.getState(), 'growth_mindset_101')).toBe(false);
    });

    it('retourne false si prérequis non rempli', () => {
      expect(selectFormationAvailable(store.getState(), 'the_art_of_networking')).toBe(false);
    });

    it('retourne true si prérequis rempli', () => {
      store.setState({ completedFormations: ['growth_mindset_101'] });
      expect(selectFormationAvailable(store.getState(), 'the_art_of_networking')).toBe(true);
    });

    it('retourne false si requiredJobId absent de cvJobs', () => {
      // become_a_thought_leader requiert job 'consultant'
      store.setState({ completedFormations: ['become_a_thought_leader'] }); // pas de prérequis formation
      expect(selectFormationAvailable(store.getState(), 'become_a_thought_leader', [])).toBe(false);
    });

    it('retourne true si requiredJobId présent dans cvJobs', () => {
      expect(selectFormationAvailable(store.getState(), 'become_a_thought_leader', ['consultant'])).toBe(true);
    });
  });

  describe('selectFormationProgress', () => {
    it('retourne null si formation non active', () => {
      expect(selectFormationProgress(store.getState(), 'growth_mindset_101', Date.now())).toBeNull();
    });

    it('retourne 0 au démarrage', () => {
      store.getState().addRelations(100);
      store.getState().buyFormation('growth_mindset_101');
      const af = store.getState().activeFormations[0];
      const progress = selectFormationProgress(store.getState(), 'growth_mindset_101', af.startedAt);
      expect(progress).toBe(0);
    });

    it('retourne 0.5 à mi-parcours', () => {
      store.getState().addRelations(100);
      store.getState().buyFormation('growth_mindset_101');
      const af = store.getState().activeFormations[0];
      const mid = af.startedAt + (af.endsAt - af.startedAt) / 2;
      const progress = selectFormationProgress(store.getState(), 'growth_mindset_101', mid);
      expect(progress).toBeCloseTo(0.5, 5);
    });

    it('retourne 1 quand terminée', () => {
      store.getState().addRelations(100);
      store.getState().buyFormation('growth_mindset_101');
      const af = store.getState().activeFormations[0];
      const progress = selectFormationProgress(store.getState(), 'growth_mindset_101', af.endsAt + 1000);
      expect(progress).toBe(1);
    });

    it('retourne null après complétion (completed = true)', () => {
      store.getState().addRelations(100);
      store.getState().buyFormation('growth_mindset_101');
      const af = store.getState().activeFormations[0];
      store.getState().tickFormations(af.endsAt);
      expect(selectFormationProgress(store.getState(), 'growth_mindset_101', af.endsAt + 1)).toBeNull();
    });
  });

  describe('selectClicksPerRequest', () => {
    it('retourne la valeur de base sans bonus', () => {
      expect(selectClicksPerRequest(store.getState())).toBe(GAME_CONSTANTS.BASE_CLICKS_PER_REQUEST);
    });

    it('retourne base + totalClicksBonus après formations', () => {
      store.setState({ totalClicksBonus: 5 });
      expect(selectClicksPerRequest(store.getState())).toBe(
        GAME_CONSTANTS.BASE_CLICKS_PER_REQUEST + 5,
      );
    });
  });
});
