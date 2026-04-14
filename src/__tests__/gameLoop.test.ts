// __tests__/gameLoop.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startGameLoop,
  stopGameLoop,
  isLoopRunning,
  applyOfflineProgress,
} from '../core/gameLoop';
import { useGameStore } from '../store/useGameStore';

const DEFAULT_STATE = {
  gamePhase: 'playing' as const,
  isBanned: false,
  banRemainingSeconds: 0,
  cycleDuration: 30,
  acceptanceRate: 10,
  requestsProcessedPerCycle: 10,
  pendingRequests: 0,
  incomingRequests: 0,
  relations: 0,
  totalRelationsEarned: 0,
  clicksPerRequest: 1,
  lastTickAt: 0,
  lastCycleAt: 0,
  lastPostDecayAt: 0,
};

beforeEach(() => {
  vi.useFakeTimers();
  stopGameLoop();
  localStorage.clear();
  useGameStore.setState(DEFAULT_STATE);
});

afterEach(() => {
  stopGameLoop();
  vi.useRealTimers();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// start / stop / isLoopRunning
// ---------------------------------------------------------------------------

describe('startGameLoop / stopGameLoop', () => {
  it('démarre la boucle', () => {
    expect(isLoopRunning()).toBe(false);
    startGameLoop();
    expect(isLoopRunning()).toBe(true);
  });

  it('startGameLoop est idempotent (double appel sans effet)', () => {
    startGameLoop();
    startGameLoop();
    expect(isLoopRunning()).toBe(true);
    stopGameLoop();
    expect(isLoopRunning()).toBe(false);
  });

  it('stopGameLoop arrête la boucle', () => {
    startGameLoop();
    stopGameLoop();
    expect(isLoopRunning()).toBe(false);
  });

  it('stopGameLoop est idempotent (double appel sans crash)', () => {
    startGameLoop();
    stopGameLoop();
    stopGameLoop();
    expect(isLoopRunning()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cycle métier déclenché après cycleDuration
// ---------------------------------------------------------------------------

describe('cycle métier', () => {
  it('processCycle est appelé après cycleDuration', () => {
    useGameStore.setState({ pendingRequests: 10, acceptanceRate: 100 });
    startGameLoop();
    // 1er tick : arme lastCycleAt
    vi.advanceTimersByTime(100);
    // Avance d'un cycle complet
    vi.advanceTimersByTime(30_000);
    expect(useGameStore.getState().relations).toBeGreaterThan(0);
  });

  it('pas de cycle si isBanned', () => {
    // banRemainingSeconds élevé pour que tickBanTimer ne lève pas le ban pendant le test
    useGameStore.setState({ pendingRequests: 10, acceptanceRate: 100, isBanned: true, banRemainingSeconds: 3600 });
    startGameLoop();
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(30_000);
    expect(useGameStore.getState().relations).toBe(0);
  });

  it('la boucle s\'arrête toute seule si gamePhase est terminée', () => {
    startGameLoop();
    useGameStore.setState({ gamePhase: 'ended_free' });
    vi.advanceTimersByTime(100);
    expect(isLoopRunning()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// onCycle callback
// ---------------------------------------------------------------------------

describe('callback onCycle', () => {
  it('onCycle est appelé avec le résultat du cycle', () => {
    useGameStore.setState({ pendingRequests: 10, acceptanceRate: 100 });
    const onCycle = vi.fn();
    startGameLoop({ onCycle });
    vi.advanceTimersByTime(100);    // arme
    vi.advanceTimersByTime(30_000); // cycle
    expect(onCycle).toHaveBeenCalledOnce();
    const [result] = onCycle.mock.calls[0] as [{ accepted: number; processed: number }];
    expect(result.processed).toBe(10);
    expect(result.accepted).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// applyOfflineProgress
// ---------------------------------------------------------------------------

describe('applyOfflineProgress', () => {
  it('rejoue les cycles hors-ligne correctement', () => {
    const now = Date.now();
    // 65s offline → 2 cycles de 30s
    useGameStore.setState({
      lastTickAt: now - 65_000,
      pendingRequests: 100,
      acceptanceRate: 100,
      cycleDuration: 30,
      requestsProcessedPerCycle: 10,
    });
    applyOfflineProgress();
    // 2 cycles × 10 acceptés = 20
    expect(useGameStore.getState().relations).toBe(20);
  });

  it('ne fait rien si lastTickAt = 0 (première session)', () => {
    useGameStore.setState({ lastTickAt: 0, pendingRequests: 100, acceptanceRate: 100 });
    applyOfflineProgress();
    expect(useGameStore.getState().relations).toBe(0);
  });

  it('ne fait rien si moins d\'un cycle complet écoulé', () => {
    const now = Date.now();
    useGameStore.setState({
      lastTickAt: now - 10_000, // 10s < 30s
      pendingRequests: 100,
      acceptanceRate: 100,
      cycleDuration: 30,
    });
    applyOfflineProgress();
    expect(useGameStore.getState().relations).toBe(0);
  });

  it('plafonne à OFFLINE_MAX_HOURS (8h)', () => {
    const now = Date.now();
    const OFFLINE_MAX_HOURS = 8;
    // 24h offline → plafonné à 8h
    useGameStore.setState({
      lastTickAt: now - 24 * 3600 * 1000,
      pendingRequests: 99_999,
      acceptanceRate: 100,
      cycleDuration: 30,
      requestsProcessedPerCycle: 10,
    });
    applyOfflineProgress();
    const maxCycles = Math.floor((OFFLINE_MAX_HOURS * 3600) / 30); // 960
    expect(useGameStore.getState().relations).toBeLessThanOrEqual(maxCycles * 10);
  });

  it('ne fait rien si gamePhase est terminée', () => {
    const now = Date.now();
    useGameStore.setState({
      gamePhase: 'ended_free',
      lastTickAt: now - 65_000,
      pendingRequests: 100,
      acceptanceRate: 100,
    });
    applyOfflineProgress();
    expect(useGameStore.getState().relations).toBe(0);
  });
});
