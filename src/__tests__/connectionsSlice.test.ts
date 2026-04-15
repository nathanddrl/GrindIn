// __tests__/connectionsSlice.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import {
  createConnectionsSlice,
  type ConnectionsSlice,
} from '../store/slices/connectionsSlice';
import { GAME_CONSTANTS } from '../core/constants';

const makeStore = () => create<ConnectionsSlice>()(createConnectionsSlice);

describe('connectionsSlice', () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
  });

  // ---------------------------------------------------------------------------
  // État initial
  // ---------------------------------------------------------------------------

  it('état initial correct', () => {
    const s = store.getState();
    expect(s.relations).toBe(0);
    expect(s.totalRelationsEarned).toBe(0);
    expect(s.pendingRequests).toBe(0);
    expect(s.incomingRequests).toBe(0);
    expect(s.acceptanceRate).toBe(GAME_CONSTANTS.BASE_ACCEPTANCE_RATE);
    expect(s.requestsProcessedPerCycle).toBe(GAME_CONSTANTS.BASE_REQUESTS_PER_CYCLE);
  });

  // ---------------------------------------------------------------------------
  // addPendingRequests
  // ---------------------------------------------------------------------------

  it('addPendingRequests incrémente correctement', () => {
    store.getState().addPendingRequests(5);
    expect(store.getState().pendingRequests).toBe(5);
    store.getState().addPendingRequests(3);
    expect(store.getState().pendingRequests).toBe(8);
  });

  // ---------------------------------------------------------------------------
  // processCycle
  // ---------------------------------------------------------------------------

  it('processCycle traite min(pending, perCycle) demandes', () => {
    store.getState().addPendingRequests(20); // > 10
    store.getState().setAcceptanceRate(50);
    const result = store.getState().processCycle();
    // min(20, 10) = 10 traitées, 50% → 5 acceptées
    expect(result.processed).toBe(10);
    expect(result.accepted).toBe(5);
    expect(result.rejected).toBe(5);
  });

  it('processCycle crédite relations et totalRelationsEarned', () => {
    store.getState().addPendingRequests(10);
    store.getState().setAcceptanceRate(100);
    store.getState().processCycle();
    expect(store.getState().relations).toBe(10);
    expect(store.getState().totalRelationsEarned).toBe(10);
  });

  it('processCycle décrémente pendingRequests', () => {
    store.getState().addPendingRequests(10);
    store.getState().setAcceptanceRate(100);
    store.getState().processCycle();
    expect(store.getState().pendingRequests).toBe(0);
  });

  it('processCycle file vide → résultat zéro, pas de crash', () => {
    const result = store.getState().processCycle();
    expect(result.processed).toBe(0);
    expect(result.accepted).toBe(0);
    expect(result.rejected).toBe(0);
    expect(store.getState().relations).toBe(0);
  });

  it('processCycle moins de demandes que perCycle', () => {
    store.getState().addPendingRequests(4);
    store.getState().setAcceptanceRate(100);
    const result = store.getState().processCycle();
    expect(result.processed).toBe(4);
    expect(result.accepted).toBe(4);
  });

  // ---------------------------------------------------------------------------
  // addRelations / spendRelations
  // ---------------------------------------------------------------------------

  it('addRelations incrémente relations ET totalRelationsEarned', () => {
    store.getState().addRelations(100);
    expect(store.getState().relations).toBe(100);
    expect(store.getState().totalRelationsEarned).toBe(100);
  });

  it('spendRelations réussit et décrémente quand solde suffisant', () => {
    store.getState().addRelations(100);
    const ok = store.getState().spendRelations(40);
    expect(ok).toBe(true);
    expect(store.getState().relations).toBe(60);
  });

  it('spendRelations échoue et ne décrémente pas quand solde insuffisant', () => {
    store.getState().addRelations(10);
    const ok = store.getState().spendRelations(100);
    expect(ok).toBe(false);
    expect(store.getState().relations).toBe(10);
  });

  it('spendRelations exact solde → succès, solde à 0', () => {
    store.getState().addRelations(50);
    const ok = store.getState().spendRelations(50);
    expect(ok).toBe(true);
    expect(store.getState().relations).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // resetRelations
  // ---------------------------------------------------------------------------

  it('resetRelations remet relations à 0 sans toucher totalRelationsEarned', () => {
    store.getState().addRelations(500);
    store.getState().resetRelations();
    expect(store.getState().relations).toBe(0);
    expect(store.getState().totalRelationsEarned).toBe(500);
  });

  // ---------------------------------------------------------------------------
  // setAcceptanceRate — plafond MAX_ACCEPTANCE_RATE
  // ---------------------------------------------------------------------------

  it('setAcceptanceRate plafonne à MAX_ACCEPTANCE_RATE', () => {
    store.getState().setAcceptanceRate(200);
    expect(store.getState().acceptanceRate).toBe(GAME_CONSTANTS.MAX_ACCEPTANCE_RATE);
  });

  it('setAcceptanceRate accepte une valeur sous le plafond', () => {
    store.getState().setAcceptanceRate(50);
    expect(store.getState().acceptanceRate).toBe(50);
  });

  // ---------------------------------------------------------------------------
  // setRequestsProcessedPerCycle
  // ---------------------------------------------------------------------------

  it('setRequestsProcessedPerCycle met à jour le débit du cycle', () => {
    store.getState().setRequestsProcessedPerCycle(25);
    expect(store.getState().requestsProcessedPerCycle).toBe(25);
  });
});
