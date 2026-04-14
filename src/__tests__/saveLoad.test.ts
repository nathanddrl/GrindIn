// __tests__/saveLoad.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useGameStore } from '../store/useGameStore';
import {
  saveGame,
  loadGame,
  exportSave,
  importSave,
  hasSave,
  getSaveMetadata,
  deleteSave,
  STORAGE_KEY,
} from '../utils/saveLoad';
import { SAVE_VERSION } from '../core/constants';

// État par défaut réinjecté avant chaque test
const DEFAULT_STATE = {
  gamePhase: 'playing' as const,
  isBanned: false,
  banRemainingSeconds: 0,
  clicksPerRequest: 1,
  cycleDuration: 30,
  lastTickAt: 0,
  lastCycleAt: 0,
  lastPostDecayAt: 0,
  relations: 0,
  totalRelationsEarned: 0,
  pendingRequests: 0,
  incomingRequests: 0,
  acceptanceRate: 10,
  requestsProcessedPerCycle: 10,
};

beforeEach(() => {
  // setState déclenche Zustand persist → écrit dans localStorage.
  // On clear APRÈS pour partir avec un localStorage vide.
  useGameStore.setState(DEFAULT_STATE);
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// hasSave
// ---------------------------------------------------------------------------

describe('hasSave', () => {
  it('retourne false quand aucune save', () => {
    expect(hasSave()).toBe(false);
  });

  it('retourne true après saveGame', () => {
    saveGame();
    expect(hasSave()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// saveGame + loadGame
// ---------------------------------------------------------------------------

describe('saveGame / loadGame', () => {
  it('saveGame écrit dans localStorage', () => {
    const result = saveGame();
    expect(result.ok).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('loadGame retourne une erreur si aucune save', () => {
    const result = loadGame();
    expect(result.ok).toBe(false);
  });

  it('roundtrip save → load préserve les données', () => {
    useGameStore.setState({ relations: 42, totalRelationsEarned: 100, acceptanceRate: 55 });
    saveGame();
    const result = loadGame();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.relations).toBe(42);
    expect(result.state.totalRelationsEarned).toBe(100);
    expect(result.state.acceptanceRate).toBe(55);
  });

  it('loadGame stocke un savedAt', () => {
    saveGame();
    const result = loadGame();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.savedAt).toBeGreaterThan(0);
  });

  it('loadGame rejette une save corrompue (champs critiques manquants)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SAVE_VERSION, state: { invalid: true } }),
    );
    const result = loadGame();
    expect(result.ok).toBe(false);
  });

  it('loadGame rejette une version future', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 999, state: {} }),
    );
    const result = loadGame();
    expect(result.ok).toBe(false);
  });

  it('loadGame applique une migration de version antérieure', () => {
    // Simule une save v0 — doit être migrée vers SAVE_VERSION
    // (aucune migration enregistrée pour l'instant → état passé tel quel)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 0,
        state: { ...DEFAULT_STATE },
      }),
    );
    const result = loadGame();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migratedFrom).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getSaveMetadata
// ---------------------------------------------------------------------------

describe('getSaveMetadata', () => {
  it('retourne null sans save', () => {
    expect(getSaveMetadata()).toBeNull();
  });

  it('retourne les métadonnées correctes après saveGame', () => {
    useGameStore.setState({ relations: 77, totalRelationsEarned: 200 });
    saveGame();
    const meta = getSaveMetadata();
    expect(meta).not.toBeNull();
    expect(meta?.relations).toBe(77);
    expect(meta?.totalRelationsEarned).toBe(200);
    expect(meta?.version).toBe(SAVE_VERSION);
    expect(meta?.gamePhase).toBe('playing');
  });
});

// ---------------------------------------------------------------------------
// deleteSave
// ---------------------------------------------------------------------------

describe('deleteSave', () => {
  it('supprime la save du localStorage', () => {
    saveGame();
    expect(hasSave()).toBe(true);
    deleteSave();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// exportSave / importSave
// ---------------------------------------------------------------------------

describe('exportSave / importSave', () => {
  it('roundtrip export → import préserve les données', () => {
    useGameStore.setState({ relations: 123, totalRelationsEarned: 456 });
    const encoded = exportSave();

    localStorage.clear();
    useGameStore.setState(DEFAULT_STATE);

    const result = importSave(encoded);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.relations).toBe(123);
    expect(result.state.totalRelationsEarned).toBe(456);
  });

  it('importSave rejette une chaîne invalide', () => {
    const result = importSave('not!!valid!!base64');
    expect(result.ok).toBe(false);
  });

  it('importSave rejette une version future', () => {
    const payload = { appVersion: 999, savedAt: Date.now(), state: DEFAULT_STATE };
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    const result = importSave(encoded);
    expect(result.ok).toBe(false);
  });

  it('importSave persiste dans localStorage', () => {
    useGameStore.setState({ relations: 50 });
    const encoded = exportSave();
    localStorage.clear();
    importSave(encoded);
    expect(hasSave()).toBe(true);
  });
});
