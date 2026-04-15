// core/gameLoop.ts
// Boucle de jeu principale : tick UI (100 ms) + cycle métier (durée variable).
//
// Responsabilités par fréquence :
//   100 ms  — tick UI : décompte ban, vérification échéances
//   variable — cycle métier : processCycle() selon cycleDuration
//   variable — demandes entrantes : addIncomingRequests selon acceptanceRate
//   5 s     — tick IA : addPendingRequests si l'IA est active        [stub]
//   30 s    — decay du branding : recalcul acceptanceRate sans post   [stub]
//   30 s    — autosave : Zustand/persist écrit dans localStorage

import { GAME_CONSTANTS } from './constants';
import { useGameStore } from '../store/useGameStore';
import type { CycleResult } from './types';

// ---------------------------------------------------------------------------
// TYPES PUBLICS
// ---------------------------------------------------------------------------

export interface LoopCallbacks {
  /** Appelé après chaque cycle métier, avec le résultat. */
  onCycle?: (result: CycleResult, now: number) => void;
  /** Appelé à chaque tick UI (100 ms). */
  onTick?: (now: number) => void;
  /** Appelé lors du calcul du rattrapage hors-ligne, avec le nb de cycles joués. */
  onOfflineProgress?: (cyclesReplayed: number, secondsElapsed: number) => void;
}

// ---------------------------------------------------------------------------
// ÉTAT INTERNE DU MODULE (hors store — pas besoin de persister)
// ---------------------------------------------------------------------------

let intervalId: ReturnType<typeof setInterval> | null = null;
let callbacks: LoopCallbacks = {};

// Timestamps internes non persistés (réinitialisés à chaque démarrage du loop)
let lastIncomingAt  = 0; // dernière émission de demande entrante
let lastAITickAt    = 0; // dernier tick IA
let lastAutosaveAt  = 0; // dernier autosave

// ---------------------------------------------------------------------------
// CALCUL DE L'INTERVALLE DES DEMANDES ENTRANTES
// Plus acceptanceRate est élevé, plus les demandes arrivent vite.
// interval = BASE - (rate * FACTOR), plancher = MIN
// ---------------------------------------------------------------------------

function incomingIntervalMs(acceptanceRate: number): number {
  const effectiveRate = Math.max(
    0,
    acceptanceRate - GAME_CONSTANTS.BASE_ACCEPTANCE_RATE,
  );

  const seconds = Math.max(
    GAME_CONSTANTS.MIN_INCOMING_INTERVAL_SECONDS,
    GAME_CONSTANTS.BASE_INCOMING_INTERVAL_SECONDS
      - effectiveRate
        * GAME_CONSTANTS.INCOMING_RATE_FACTOR
        * GAME_CONSTANTS.INCOMING_RATE_SCALING,
  );
  return seconds * 1000;
}

// ---------------------------------------------------------------------------
// TICK PRINCIPAL — appelé toutes les UI_TICK_MS
// ---------------------------------------------------------------------------

function tick(): void {
  const store = useGameStore.getState();
  const now = Date.now();

  // Arrêt si la partie est terminée
  if (store.gamePhase !== 'playing' && store.gamePhase !== 'infinite') {
    stopGameLoop();
    return;
  }

  const elapsedMs = store.lastTickAt > 0 ? now - store.lastTickAt : 0;
  const elapsedSec = elapsedMs / 1000;

  // --- Décompte ban IA ---
  if (store.isBanned && elapsedSec > 0) {
    store.tickBanTimer(elapsedSec);
  }

  // --- Formations Mindset : complétion & sync clicksPerRequest ---
  {
    const prevBonus = store.totalClicksBonus;
    store.tickFormations(now);
    const newBonus = useGameStore.getState().totalClicksBonus;
    if (newBonus !== prevBonus) {
      useGameStore.getState().setClicksPerRequest(
        GAME_CONSTANTS.BASE_CLICKS_PER_REQUEST + newBonus,
      );
    }
  }

  // --- Cycle métier ---
  const cycleMs = store.cycleDuration * 1000;
  if (store.lastCycleAt === 0) {
    // Premier tick : armer le cycle sans le déclencher
    store.updateTimestamps(now, { lastCycleAt: now });
  } else if (!store.isBanned && now - store.lastCycleAt >= cycleMs) {
    const cyclesDue = Math.min(
      Math.floor((now - store.lastCycleAt) / cycleMs),
      10, // plafond anti-freeze si gros lag
    );
    let lastResult: CycleResult | null = null;
    for (let i = 0; i < cyclesDue; i++) {
      lastResult = store.processCycle();
    }
    // Avancer lastCycleAt du nombre exact de cycles joués (pas "= now")
    // pour conserver le reliquat et ne pas décaler le prochain cycle.
    store.updateTimestamps(now, {
      lastCycleAt: store.lastCycleAt + cyclesDue * cycleMs,
    });
    if (lastResult) callbacks.onCycle?.(lastResult, now);
  }

  // --- Demandes entrantes (clicker secondaire) ---
  const incIntervalMs = incomingIntervalMs(store.acceptanceRate);
  if (!store.isBanned && lastIncomingAt > 0 && now - lastIncomingAt >= incIntervalMs) {
    store.addIncomingRequests(1);
    lastIncomingAt = now;
  } else if (lastIncomingAt === 0) {
    lastIncomingAt = now;
  }

  // --- Tick IA (STUB — sera activé quand aiGrowthSlice existera) ---
  // TODO: if (store.aiGrowth.purchased && !store.isBanned) {
  //   const aiInterval = GAME_CONSTANTS.AI_TICK_INTERVAL_SECONDS * 1000;
  //   if (now - lastAITickAt >= aiInterval) {
  //     const { requestsPer5s } = AI_EFFICIENCY[store.aiGrowth.efficiencyLevel];
  //     store.addPendingRequests(requestsPer5s);
  //     checkAIDetection(store, now);
  //     lastAITickAt = now;
  //   }
  // }
  void lastAITickAt; // évite l'avertissement "unused variable"

  // --- Decay du branding (STUB — sera activé quand brandingSlice existera) ---
  // TODO: applyPostDecay(store, now);

  // --- Autosave — Zustand/persist écrit automatiquement à chaque setState,
  //     mais on force un write explicite pour le timestamp savedAt si nécessaire.
  if (lastAutosaveAt > 0 && now - lastAutosaveAt >= GAME_CONSTANTS.AUTOSAVE_INTERVAL_SECONDS * 1000) {
    // Zustand persist écoute les mutations — rien à faire ici pour l'instant.
    // Laisser ce point d'ancrage pour un éventuel hook de sauvegarde cloud.
    lastAutosaveAt = now;
  } else if (lastAutosaveAt === 0) {
    lastAutosaveAt = now;
  }

  // --- Mise à jour du timestamp global ---
  store.updateTimestamps(now, { lastTickAt: now });

  callbacks.onTick?.(now);
}

// ---------------------------------------------------------------------------
// RATTRAPAGE HORS-LIGNE
// À appeler une seule fois, avant startGameLoop(), lors de l'initialisation.
// ---------------------------------------------------------------------------

export function applyOfflineProgress(opts: Pick<LoopCallbacks, 'onOfflineProgress'> = {}): void {
  const store = useGameStore.getState();
  const now = Date.now();
  const { lastTickAt, cycleDuration, gamePhase } = store;

  if (gamePhase !== 'playing' && gamePhase !== 'infinite') return;
  if (lastTickAt === 0) return; // première session, rien à rattraper

  const offlineSec = Math.min(
    (now - lastTickAt) / 1000,
    GAME_CONSTANTS.OFFLINE_MAX_HOURS * 3600,
  );

  if (offlineSec < cycleDuration) return; // pas même un cycle complet

  const cyclesReplayed = Math.floor(offlineSec / cycleDuration);

  for (let i = 0; i < cyclesReplayed; i++) {
    store.processCycle();
  }

  // Avancer les timestamps pour que tick() ne rejoue pas ces cycles
  const { lastCycleAt } = useGameStore.getState();
  const cycleMs = cycleDuration * 1000;
  const newLastCycleAt = lastCycleAt + cyclesReplayed * cycleMs;
  useGameStore.getState().updateTimestamps(now, {
    lastTickAt: now,
    lastCycleAt: newLastCycleAt,
  });

  opts.onOfflineProgress?.(cyclesReplayed, offlineSec);
}

// ---------------------------------------------------------------------------
// API PUBLIQUE
// ---------------------------------------------------------------------------

/** Démarre la boucle. Idempotent : un deuxième appel est sans effet. */
export function startGameLoop(opts: LoopCallbacks = {}): void {
  if (intervalId !== null) return;
  callbacks = opts;
  // Réinitialise les timestamps internes pour ne pas hériter d'un état stale
  lastIncomingAt = 0;
  lastAITickAt   = 0;
  lastAutosaveAt = 0;
  intervalId = setInterval(tick, GAME_CONSTANTS.UI_TICK_MS);
}

/** Arrête la boucle. Idempotent. */
export function stopGameLoop(): void {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
  callbacks  = {};
}

/** Indique si la boucle tourne actuellement. */
export function isLoopRunning(): boolean {
  return intervalId !== null;
}
