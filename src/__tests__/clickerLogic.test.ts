// __tests__/clickerLogic.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../store/useGameStore';
import { handleMainClick } from '../features/clicker/logic/clickerLogic';
import { handleAcceptIncoming, computeIncomingIntervalSeconds } from '../features/clicker/logic/incomingClickerLogic';
import { GAME_CONSTANTS } from '../core/constants';

const DEFAULT_STATE = {
  gamePhase: 'playing' as const,
  isBanned: false,
  banRemainingSeconds: 0,
  clicksPerRequest: 1,
  cycleDuration: 30,
  acceptanceRate: GAME_CONSTANTS.BASE_ACCEPTANCE_RATE,
  requestsProcessedPerCycle: GAME_CONSTANTS.BASE_REQUESTS_PER_CYCLE,
  pendingRequests: 0,
  incomingRequests: 0,
  relations: 0,
  totalRelationsEarned: 0,
  lastTickAt: 0,
  lastCycleAt: 0,
  lastPostDecayAt: 0,
  cycleLastResult: null,
  cycleLastResultAt: 0,
};

beforeEach(() => {
  useGameStore.setState(DEFAULT_STATE);
});

// ---------------------------------------------------------------------------
// handleMainClick
// ---------------------------------------------------------------------------

describe('handleMainClick', () => {
  it('ajoute clicksPerRequest à pendingRequests', () => {
    useGameStore.setState({ clicksPerRequest: 3 });
    handleMainClick();
    expect(useGameStore.getState().pendingRequests).toBe(3);
  });

  it('clics multiples s\'accumulent', () => {
    useGameStore.setState({ clicksPerRequest: 2 });
    handleMainClick();
    handleMainClick();
    expect(useGameStore.getState().pendingRequests).toBe(4);
  });

  it('ne fait rien si isBanned', () => {
    useGameStore.setState({ isBanned: true, banRemainingSeconds: 60 });
    handleMainClick();
    expect(useGameStore.getState().pendingRequests).toBe(0);
  });


});

// ---------------------------------------------------------------------------
// handleAcceptIncoming
// ---------------------------------------------------------------------------

describe('handleAcceptIncoming', () => {
  it('accepte 1 demande et ajoute 1 relation', () => {
    useGameStore.setState({ incomingRequests: 5 });
    const ok = handleAcceptIncoming();
    expect(ok).toBe(true);
    expect(useGameStore.getState().incomingRequests).toBe(4);
    expect(useGameStore.getState().relations).toBe(1);
  });

  it('retourne false et ne modifie rien si incomingRequests = 0', () => {
    const ok = handleAcceptIncoming();
    expect(ok).toBe(false);
    expect(useGameStore.getState().relations).toBe(0);
  });

  it('retourne false si isBanned', () => {
    useGameStore.setState({ isBanned: true, banRemainingSeconds: 60, incomingRequests: 3 });
    const ok = handleAcceptIncoming();
    expect(ok).toBe(false);
    expect(useGameStore.getState().incomingRequests).toBe(3);
    expect(useGameStore.getState().relations).toBe(0);
  });

  it('vide correctement la file une par une', () => {
    useGameStore.setState({ incomingRequests: 2 });
    handleAcceptIncoming();
    handleAcceptIncoming();
    expect(useGameStore.getState().incomingRequests).toBe(0);
    expect(useGameStore.getState().relations).toBe(2);
    const ok = handleAcceptIncoming();
    expect(ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeIncomingIntervalSeconds
// ---------------------------------------------------------------------------

describe('computeIncomingIntervalSeconds', () => {
  it('retourne BASE à acceptanceRate = 0', () => {
    expect(computeIncomingIntervalSeconds(0)).toBe(GAME_CONSTANTS.BASE_INCOMING_INTERVAL_SECONDS);
  });

  it('diminue avec un acceptanceRate plus élevé', () => {
    const low  = computeIncomingIntervalSeconds(10);
    const high = computeIncomingIntervalSeconds(50);
    expect(high).toBeLessThan(low);
  });

  it('ne descend jamais sous MIN_INCOMING_INTERVAL_SECONDS', () => {
    expect(computeIncomingIntervalSeconds(9999)).toBe(GAME_CONSTANTS.MIN_INCOMING_INTERVAL_SECONDS);
  });

  it('formule : BASE - rate * FACTOR, plancher MIN', () => {
    const rate = 20;
    const expected = Math.max(
      GAME_CONSTANTS.MIN_INCOMING_INTERVAL_SECONDS,
      GAME_CONSTANTS.BASE_INCOMING_INTERVAL_SECONDS - rate * GAME_CONSTANTS.INCOMING_RATE_FACTOR,
    );
    expect(computeIncomingIntervalSeconds(rate)).toBe(expected);
  });
});
