// __tests__/connectionsSlice.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    expect(s.cycleLastResult).toBeNull();
    expect(s.cycleLastResultAt).toBe(0);
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
    // Mock : 5 sous 0.5 (acceptés), 5 au-dessus (rejetés) → 5 acceptées sur 10
    const spy = vi.spyOn(Math, 'random');
    for (let i = 0; i < 5; i++) spy.mockReturnValueOnce(0.4);
    for (let i = 0; i < 5; i++) spy.mockReturnValueOnce(0.6);

    store.getState().addPendingRequests(20); // > 10
    store.getState().setAcceptanceRate(50);
    const result = store.getState().processCycle();
    // min(20, 10) = 10 traitées, 50% → 5 acceptées
    expect(result.processed).toBe(10);
    expect(result.accepted).toBe(5);
    expect(result.rejected).toBe(5);

    spy.mockRestore();
  });

  it('processCycle crédite relations et totalRelationsEarned', () => {
    // setState contourne le cap 95 % — on teste la pure arithmétique du cycle
    store.setState({ pendingRequests: 10, acceptanceRate: 100 });
    store.getState().processCycle();
    expect(store.getState().relations).toBe(10);
    expect(store.getState().totalRelationsEarned).toBe(10);
  });

  it('processCycle décrémente pendingRequests', () => {
    store.setState({ pendingRequests: 10, acceptanceRate: 100 });
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

  it('processCycle évalue chaque demande individuellement', () => {
    // Mock : 3 sous 0.35 (acceptés), 7 au-dessus (rejetés) → 3 acceptées sur 10
    const spy = vi.spyOn(Math, 'random');
    for (let i = 0; i < 3; i++) spy.mockReturnValueOnce(0.3);
    for (let i = 0; i < 7; i++) spy.mockReturnValueOnce(0.4);

    store.getState().addPendingRequests(10);
    store.getState().setAcceptanceRate(35);
    const result = store.getState().processCycle();
    expect(result.accepted).toBe(3);
    expect(result.rejected).toBe(7);

    spy.mockRestore();
  });

  it('processCycle stocke le résultat dans cycleLastResult', () => {
    store.setState({ pendingRequests: 5, acceptanceRate: 100 });
    store.getState().processCycle();
    const { cycleLastResult, cycleLastResultAt } = store.getState();
    expect(cycleLastResult).not.toBeNull();
    expect(cycleLastResult?.processed).toBe(5);
    expect(cycleLastResult?.accepted).toBe(5);
    expect(cycleLastResultAt).toBeGreaterThan(0);
  });

  it('processCycle met à jour cycleLastResultAt à chaque appel', () => {
    store.getState().addPendingRequests(10);
    store.getState().processCycle();
    const first = store.getState().cycleLastResultAt;
    store.getState().addPendingRequests(10);
    store.getState().processCycle();
    const second = store.getState().cycleLastResultAt;
    expect(second).toBeGreaterThanOrEqual(first);
  });

  it('processCycle moins de demandes que perCycle', () => {
    store.setState({ pendingRequests: 4, acceptanceRate: 100 });
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

  // ---------------------------------------------------------------------------
  // acceptIncomingRequest
  // ---------------------------------------------------------------------------

  it('acceptIncomingRequest retourne false si incomingRequests = 0', () => {
    const ok = store.getState().acceptIncomingRequest();
    expect(ok).toBe(false);
    expect(store.getState().relations).toBe(0);
  });

  it('acceptIncomingRequest décrémente incomingRequests et ajoute 1 relation', () => {
    store.getState().addIncomingRequests(3);
    const ok = store.getState().acceptIncomingRequest();
    expect(ok).toBe(true);
    expect(store.getState().incomingRequests).toBe(2);
    expect(store.getState().relations).toBe(1);
    expect(store.getState().totalRelationsEarned).toBe(1);
  });

  it('acceptIncomingRequest ne peut pas descendre en dessous de 0', () => {
    store.getState().addIncomingRequests(1);
    store.getState().acceptIncomingRequest();
    const ok = store.getState().acceptIncomingRequest();
    expect(ok).toBe(false);
    expect(store.getState().incomingRequests).toBe(0);
    expect(store.getState().relations).toBe(1);
  });

  it('acceptIncomingRequest incrémente totalRelationsEarned', () => {
    store.getState().addIncomingRequests(2);
    store.getState().acceptIncomingRequest();
    store.getState().acceptIncomingRequest();
    expect(store.getState().totalRelationsEarned).toBe(2);
  });
});
