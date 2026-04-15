// utils/saveLoad.ts
// Sérialisation / désérialisation localStorage avec versioning.
//
// Relation avec Zustand persist :
//   - Zustand persist (useGameStore) gère l'autosave automatique sur chaque setState.
//   - Ce module gère la couche explicite : export/import, suppression, validation,
//     affichage des métadonnées, et migrations manuelles si Zustand est bypassed.

import { SAVE_VERSION, GAME_CONSTANTS } from '../core/constants';
import { useGameStore } from '../store/useGameStore';
import type { GamePhase, FormationId, ActiveFormation } from '../core/types';

// ---------------------------------------------------------------------------
// CLÉ LOCALSTORAGE — doit correspondre au `name` de Zustand persist
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'grindin-save';

// ---------------------------------------------------------------------------
// TYPE DE L'ÉTAT PERSISTÉ
// Doit refléter exactement le retour de `partialize` dans useGameStore.
// Étendre quand de nouveaux slices sont ajoutés.
// ---------------------------------------------------------------------------

export interface PersistedState {
  gamePhase:               GamePhase;
  isBanned:                boolean;
  banRemainingSeconds:     number;
  clicksPerRequest:        number;
  cycleDuration:           number;
  lastTickAt:              number;
  lastCycleAt:             number;
  lastPostDecayAt:         number;
  relations:               number;
  totalRelationsEarned:    number;
  pendingRequests:         number;
  incomingRequests:        number;
  acceptanceRate:          number;
  requestsProcessedPerCycle: number;
  // Mindset
  completedFormations:     FormationId[];
  activeFormations:        ActiveFormation[];
  totalClicksBonus:        number;
}

// Format stocké par Zustand persist sur le disque
interface ZustandSave {
  state:    PersistedState;
  version:  number;
  savedAt?: number;
}

// Format enrichi pour l'export/import joueur
export interface SaveExport {
  appVersion: number;   // SAVE_VERSION au moment de l'export
  savedAt:    number;   // timestamp ms
  state:      PersistedState;
}

// Métadonnées légères affichables sans charger l'état complet
export interface SaveMetadata {
  version:          number;
  savedAt:          number | null;  // null si Zustand n'a pas encore écrit de savedAt
  relations:        number;
  totalRelationsEarned: number;
  gamePhase:        GamePhase;
}

// Résultats typés pour les opérations
export type SaveResult =
  | { ok: true }
  | { ok: false; error: string };

export type LoadResult =
  | { ok: true;  state: PersistedState; savedAt: number; migratedFrom?: number }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// REGISTRE DE MIGRATIONS
// Chaque entrée transforme l'état brut de la version N vers N+1.
// Les migrations sont chaînées automatiquement dans `applyMigrations`.
// ---------------------------------------------------------------------------

type MigrateFn = (state: PersistedState) => PersistedState;

const MIGRATIONS: Map<number, MigrateFn> = new Map([
  [2, (state) => ({
    ...state,
    completedFormations: state.completedFormations ?? [],
    activeFormations:    state.activeFormations    ?? [],
    totalClicksBonus:    state.totalClicksBonus    ?? 0,
  })],
]);

function applyMigrations(raw: PersistedState, fromVersion: number): PersistedState {
  let state = raw;
  for (let v = fromVersion + 1; v <= SAVE_VERSION; v++) {
    const migrate = MIGRATIONS.get(v);
    if (migrate) state = migrate(state);
  }
  return state;
}

function getPersistedStateDefaults(): PersistedState {
  const s = useGameStore.getState();
  return {
    gamePhase:               s.gamePhase,
    isBanned:                s.isBanned,
    banRemainingSeconds:     s.banRemainingSeconds,
    clicksPerRequest:        s.clicksPerRequest,
    cycleDuration:           s.cycleDuration,
    lastTickAt:              s.lastTickAt,
    lastCycleAt:             s.lastCycleAt,
    lastPostDecayAt:         s.lastPostDecayAt,
    relations:               s.relations,
    totalRelationsEarned:    s.totalRelationsEarned,
    pendingRequests:         s.pendingRequests,
    incomingRequests:        s.incomingRequests,
    acceptanceRate:          s.acceptanceRate,
    requestsProcessedPerCycle: s.requestsProcessedPerCycle,
    completedFormations:     s.completedFormations,
    activeFormations:        s.activeFormations,
    totalClicksBonus:        s.totalClicksBonus,
  };
}

// Extrait une valeur du candidat brut si son type correspond au défaut, sinon retourne le défaut.
// Le `as T` est justifié par le guard `typeof val === typeof def` juste avant.
function pickField<T>(c: Record<string, unknown>, key: string, def: T): T {
  const val = c[key];
  return typeof val === typeof def ? (val as T) : def;
}

// Extrait un tableau du candidat brut, retourne le défaut si ce n'est pas un tableau.
function pickArray<T>(c: Record<string, unknown>, key: string, def: T[]): T[] {
  const val = c[key];
  return Array.isArray(val) ? (val as T[]) : def;
}

function normalizePersistedState(raw: unknown): PersistedState | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const c = raw as Record<string, unknown>;
  const d = getPersistedStateDefaults();

  const clampNum = (v: number, min: number, max: number): number =>
    Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min;

  return {
    gamePhase:               pickField(c, 'gamePhase',               d.gamePhase),
    isBanned:                pickField(c, 'isBanned',                d.isBanned),
    banRemainingSeconds:     clampNum(pickField(c, 'banRemainingSeconds', d.banRemainingSeconds), 0, 86400),
    clicksPerRequest:        clampNum(pickField(c, 'clicksPerRequest',    d.clicksPerRequest),    1, 10000),
    cycleDuration:           clampNum(pickField(c, 'cycleDuration',       d.cycleDuration),       GAME_CONSTANTS.MIN_CYCLE_DURATION_SECONDS, 3600),
    lastTickAt:              clampNum(pickField(c, 'lastTickAt',          d.lastTickAt),          0, Infinity),
    lastCycleAt:             clampNum(pickField(c, 'lastCycleAt',         d.lastCycleAt),         0, Infinity),
    lastPostDecayAt:         clampNum(pickField(c, 'lastPostDecayAt',     d.lastPostDecayAt),     0, Infinity),
    relations:               clampNum(pickField(c, 'relations',           d.relations),           0, Infinity),
    totalRelationsEarned:    clampNum(pickField(c, 'totalRelationsEarned', d.totalRelationsEarned), 0, Infinity),
    pendingRequests:         clampNum(pickField(c, 'pendingRequests',     d.pendingRequests),     0, Infinity),
    incomingRequests:        clampNum(pickField(c, 'incomingRequests',    d.incomingRequests),    0, Infinity),
    acceptanceRate:          clampNum(pickField(c, 'acceptanceRate',      d.acceptanceRate),      0, GAME_CONSTANTS.MAX_ACCEPTANCE_RATE),
    requestsProcessedPerCycle: clampNum(pickField(c, 'requestsProcessedPerCycle', d.requestsProcessedPerCycle), 0, 1_000_000),
    completedFormations:     pickArray<FormationId>(c, 'completedFormations', d.completedFormations),
    activeFormations:        pickArray<ActiveFormation>(c, 'activeFormations', d.activeFormations),
    totalClicksBonus:        clampNum(pickField(c, 'totalClicksBonus', d.totalClicksBonus), 0, Infinity),
  };
}

// ---------------------------------------------------------------------------
// VALIDATION MINIMALE
// Vérifie que les champs critiques sont présents et bien typés.
// Normalise aussi les champs persistés manquants avec des valeurs par défaut.
// ---------------------------------------------------------------------------

function isValidPersistedState(obj: unknown): obj is PersistedState {
  if (typeof obj !== 'object' || obj === null) return false;

  const s = obj as Record<string, unknown>;

  // Les champs critiques doivent être présents dans le raw (pas comblés par les defaults)
  const hasCriticalFields =
    'relations'            in s &&
    'totalRelationsEarned' in s &&
    'gamePhase'            in s &&
    'acceptanceRate'       in s &&
    'cycleDuration'        in s;

  if (!hasCriticalFields) return false;

  const normalized = normalizePersistedState(s);
  if (!normalized) return false;

  const isValid =
    typeof normalized.relations            === 'number' &&
    typeof normalized.totalRelationsEarned === 'number' &&
    typeof normalized.gamePhase            === 'string' &&
    typeof normalized.acceptanceRate       === 'number' &&
    typeof normalized.cycleDuration        === 'number';

  if (!isValid) return false;

  Object.assign(s, normalized);
  return true;
}

// ---------------------------------------------------------------------------
// LECTURE BRUTE DU LOCALSTORAGE
// ---------------------------------------------------------------------------

function readRaw(): { data: ZustandSave; raw: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const data = parsed as ZustandSave;
    return { data, raw };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// API PUBLIQUE
// ---------------------------------------------------------------------------

/** Retourne `true` si une sauvegarde existe dans localStorage. */
export function hasSave(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Retourne les métadonnées de la sauvegarde sans charger l'état complet.
 * Utile pour l'écran de chargement ou les statistiques de session.
 */
export function getSaveMetadata(): SaveMetadata | null {
  const entry = readRaw();
  if (!entry) return null;
  const { data } = entry;
  const s = data.state ?? {};
  return {
    version:              data.version           ?? 0,
    savedAt:              data.savedAt ?? null,
    relations:            (s as PersistedState).relations            ?? 0,
    totalRelationsEarned: (s as PersistedState).totalRelationsEarned ?? 0,
    gamePhase:            (s as PersistedState).gamePhase            ?? 'playing',
  };
}

/**
 * Force l'écriture de l'état courant du store dans localStorage
 * (Zustand persist le fait automatiquement, mais cette fonction permet
 * un save explicite depuis le menu ou un raccourci clavier).
 * Elle enrichit la sauvegarde Zustand avec un champ `savedAt`.
 */
export function saveGame(): SaveResult {
  try {
    const existing = readRaw();
    const storeState = useGameStore.getState();

    const payload: ZustandSave & { savedAt: number } = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      state: {
        gamePhase:               storeState.gamePhase,
        isBanned:                storeState.isBanned,
        banRemainingSeconds:     storeState.banRemainingSeconds,
        clicksPerRequest:        storeState.clicksPerRequest,
        cycleDuration:           storeState.cycleDuration,
        lastTickAt:              storeState.lastTickAt,
        lastCycleAt:             storeState.lastCycleAt,
        lastPostDecayAt:         storeState.lastPostDecayAt,
        relations:               storeState.relations,
        totalRelationsEarned:    storeState.totalRelationsEarned,
        pendingRequests:         storeState.pendingRequests,
        incomingRequests:        storeState.incomingRequests,
        acceptanceRate:          storeState.acceptanceRate,
        requestsProcessedPerCycle: storeState.requestsProcessedPerCycle,
        completedFormations:     storeState.completedFormations,
        activeFormations:        storeState.activeFormations,
        totalClicksBonus:        storeState.totalClicksBonus,
      },
    };

    // Préserve les champs Zustand inconnus pour ne pas casser le middleware
    if (existing) {
      Object.assign(payload, {
        ...existing.data,
        ...payload,
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Lit et valide la sauvegarde depuis localStorage.
 * Applique les migrations si la version stockée est inférieure à `SAVE_VERSION`.
 */
export function loadGame(): LoadResult {
  const entry = readRaw();

  if (!entry) return { ok: false, error: 'Aucune sauvegarde trouvée.' };

  const { data } = entry;
  const storedVersion = data.version ?? 0;
  const savedAt = data.savedAt ?? Date.now();

  // Migration si nécessaire
  let state: PersistedState;
  let migratedFrom: number | undefined;
  if (storedVersion < SAVE_VERSION) {
    migratedFrom = storedVersion;
    state = applyMigrations(data.state, storedVersion);
  } else if (storedVersion > SAVE_VERSION) {
    return {
      ok: false,
      error: `Sauvegarde de version ${storedVersion} non supportée (version actuelle : ${SAVE_VERSION}).`,
    };
  } else {
    state = data.state;
  }

  if (!isValidPersistedState(state)) {
    return { ok: false, error: 'Sauvegarde corrompue ou incomplète.' };
  }

  return { ok: true, state, savedAt, migratedFrom };
}

/**
 * Applique un état chargé au store Zustand.
 * À appeler après `loadGame()` si un rechargement manuel est nécessaire
 * (cas normal : Zustand persist hydrate automatiquement au démarrage).
 */
export function hydrateStore(state: PersistedState): void {
  useGameStore.setState(state);
}

/** Efface la sauvegarde et remet le store à son état initial. */
export function deleteSave(): void {
  // setState déclenche Zustand persist qui réécrit dans localStorage de façon synchrone.
  // On supprime donc APRÈS le reset pour avoir le dernier mot.
  useGameStore.setState(useGameStore.getInitialState());
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Exporte la sauvegarde courante en chaîne base64.
 * Utilisable pour sauvegarder dans un fichier texte ou partager.
 */
export function exportSave(): string {
  const storeState = useGameStore.getState();

  const payload: SaveExport = {
    appVersion: SAVE_VERSION,
    savedAt:    Date.now(),
    state: {
      gamePhase:               storeState.gamePhase,
      isBanned:                storeState.isBanned,
      banRemainingSeconds:     storeState.banRemainingSeconds,
      clicksPerRequest:        storeState.clicksPerRequest,
      cycleDuration:           storeState.cycleDuration,
      lastTickAt:              storeState.lastTickAt,
      lastCycleAt:             storeState.lastCycleAt,
      lastPostDecayAt:         storeState.lastPostDecayAt,
      relations:               storeState.relations,
      totalRelationsEarned:    storeState.totalRelationsEarned,
      pendingRequests:         storeState.pendingRequests,
      incomingRequests:        storeState.incomingRequests,
      acceptanceRate:          storeState.acceptanceRate,
      requestsProcessedPerCycle: storeState.requestsProcessedPerCycle,
      completedFormations:     storeState.completedFormations,
      activeFormations:        storeState.activeFormations,
      totalClicksBonus:        storeState.totalClicksBonus,
    },
  };

  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

/**
 * Importe une sauvegarde depuis une chaîne base64 (produite par `exportSave`).
 * Valide, migre si besoin, puis hydrate le store et persiste dans localStorage.
 */
export function importSave(encoded: string): LoadResult {
  let parsed: SaveExport;

  try {
    const raw: unknown = JSON.parse(decodeURIComponent(atob(encoded.trim())));
    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, error: 'Chaîne d\'import invalide ou corrompue.' };
    }
    parsed = raw as SaveExport;
  } catch {
    return { ok: false, error: 'Chaîne d\'import invalide ou corrompue.' };
  }

  const storedVersion = parsed.appVersion ?? 0;
  const savedAt = parsed.savedAt ?? Date.now();

  let state: PersistedState;
  let migratedFrom: number | undefined;

  if (storedVersion < SAVE_VERSION) {
    migratedFrom = storedVersion;
    state = applyMigrations(parsed.state, storedVersion);
  } else if (storedVersion > SAVE_VERSION) {
    return {
      ok: false,
      error: `Export de version ${storedVersion} non supporté (version actuelle : ${SAVE_VERSION}).`,
    };
  } else {
    state = parsed.state;
  }

  if (!isValidPersistedState(state)) {
    return { ok: false, error: 'Export corrompu : champs critiques manquants.' };
  }

  hydrateStore(state);
  saveGame(); // persiste immédiatement dans localStorage
  return { ok: true, state, savedAt, migratedFrom };
}
