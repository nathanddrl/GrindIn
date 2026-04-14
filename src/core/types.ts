// core/types.ts
// Types globaux du jeu LinkedIn Clicker — source de vérité TypeScript

// ---------------------------------------------------------------------------
// PHASE DE JEU
// ---------------------------------------------------------------------------

export type GamePhase = 'playing' | 'ended_free' | 'ended_fusion' | 'infinite';

export type EndingChoice = 'disconnection' | 'fusion';

// ---------------------------------------------------------------------------
// MODULE MINDSET — Formations
// ---------------------------------------------------------------------------

export type FormationId =
  | 'growth_mindset_101'
  | 'personal_branding_basics'
  | 'the_art_of_networking'
  | 'hustle_culture_masterclass'
  | 'think_and_grow_rich_summary'
  | 'linkedin_optimization_pro'
  | 'become_a_thought_leader'
  | 'manifestation_et_business';

export interface Formation {
  id: FormationId;
  label: string;
  description: string;              // texte satirique
  cost: number;                     // en relations
  durationSeconds: number;          // temps d'apprentissage
  clicksBonus: number;              // +X demandes/clic à la fin
  requiredJobId?: JobId;            // job CV requis pour débloquer
  requiredFormationId?: FormationId; // formation prérequis
}

export interface ActiveFormation {
  formationId: FormationId;
  startedAt: number;                // timestamp ms
  endsAt: number;                   // timestamp ms
  completed: boolean;
}

export interface MindsetState {
  completedFormations: FormationId[];
  activeFormations: ActiveFormation[]; // plusieurs en parallèle
  totalClicksBonus: number;         // somme des bonus de toutes les formations terminées
}

// ---------------------------------------------------------------------------
// MODULE BRANDING — Posts & CV
// ---------------------------------------------------------------------------

export type PostTypeId =
  | 'post_motivant'
  | 'anecdote_inspirante'
  | 'thread_dev_perso'
  | 'temoignage_entrepreneur'
  | 'analyse_marche_bidon'
  | 'tendance_linkedin'
  | 'article_medium'
  | 'post_viral';

export interface PostType {
  id: PostTypeId;
  label: string;
  acceptanceBonus: number;          // +% temporaire sur acceptanceRate
  durationSeconds: number;          // durée du boost
  cooldownSeconds: number;          // délai avant re-publication
  baseCost: number;                 // coût en relations (1ère fois)
  costMultiplier: number;           // coût x N à chaque achat suivant
  spamRisk: boolean;                // si vrai, pénalité si posté trop tôt
  requiredJobId?: JobId;            // job CV requis
  viralChance?: number;             // % de chance de déclencher le boost viral
}

export interface ActivePost {
  postTypeId: PostTypeId;
  expiresAt: number;                // timestamp ms
  bonusAmount: number;              // bonus réel appliqué (peut varier si viral)
}

export type JobId =
  | 'stagiaire'
  | 'charge_de_projet'
  | 'consultant'
  | 'business_developer'
  | 'ceo_startup'
  | 'coach_de_vie'
  | 'thought_leader'
  | 'serial_entrepreneur';

export interface Job {
  id: JobId;
  label: string;
  cost: number;                     // en relations
  permanentAcceptanceBonus: number; // +% fixe et permanent sur baseAcceptanceRate
  requiredFormationId?: FormationId;
  isFake: boolean;
  fakeBadBuzzRisk?: number;         // si isFake, % de risque de bad buzz
}

export interface BrandingState {
  activePost: ActivePost | null;    // un seul post actif à la fois
  postCooldowns: Record<PostTypeId, number>;       // timestamp de fin de cooldown
  postPurchaseCounts: Record<PostTypeId, number>;  // nb de fois acheté (pour coût croissant)
  baseAcceptanceRate: number;       // taux de base hors posts et malus
  cvJobs: JobId[];                  // jobs ajoutés au CV
  cvPermanentBonus: number;         // somme des bonus permanents des jobs
  isTrending: boolean;              // tendance active (boost les posts "tendance")
  trendingExpiresAt: number;        // timestamp ms
  lastPostEndedAt: number | null;   // pour calculer le decay (null = jamais posté)
}

// ---------------------------------------------------------------------------
// MODULE PYRAMIDE — Leadership
// ---------------------------------------------------------------------------

export type PyramidLevel = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = Toi-même (Leader)
// 1 = Disciples Directs
// 2 = Managers
// 3 = Coachs Influenceurs
// 4 = Thought Leaders
// 5 = Visionnaires Éclairés

export interface PyramidTier {
  level: PyramidLevel;
  label: string;
  unlockCost: number;
  relationsPerDisciple: number;      // +X requestsProcessedPerCycle par disciple
  recruitmentPerDay: number;         // disciples recrutés auto/jour (0 = désactivé)
  recruitmentUpgradeCost: number;    // coût pour débloquer +1 recrutement/jour
  currentDisciples: number;
  maxDisciples: number;
}

export interface PyramidState {
  tiers: Record<PyramidLevel, PyramidTier>;
  unlockedLevels: PyramidLevel[];
}

// ---------------------------------------------------------------------------
// MODULE SACRIFICES — Investissement Personnel
// ---------------------------------------------------------------------------

export type SacrificeId =
  | 'no_sleep'
  | 'no_friends'
  | 'no_family'
  | 'no_weekends'
  | 'no_lunch'
  | 'no_sport'
  | 'divorce'
  | 'burnout'
  | 'linkedin_fusion';

export interface SacrificeMalus {
  acceptanceDelta: number;           // en % (négatif = malus sur acceptanceRate)
  recruitmentDelta: number;          // en % sur le recrutement pyramide (négatif)
  postEfficiencyDelta: number;       // en % sur l'effet des posts (négatif)
  formationSpeedDelta: number;       // en % sur la vitesse d'apprentissage (négatif)
  recruitmentCostDelta: number;      // en % sur le coût de recrutement (positif = plus cher)
}

export interface Sacrifice {
  id: SacrificeId;
  label: string;
  flavourText: string;               // texte satirique
  unlockCost: number;
  cycleReductionSeconds: number;     // toujours -5s par sacrifice actif
  malus: SacrificeMalus;
  unlocked: boolean;
  active: boolean;
  isPointOfNoReturn: boolean;        // true uniquement pour linkedin_fusion
}

export interface SacrificesState {
  sacrifices: Record<SacrificeId, Sacrifice>;
  isFusionActive: boolean;           // si true, tous les sacrifices actifs sont verrouillés
}

// ---------------------------------------------------------------------------
// MODULE IA GROWTH HACKING — Autoclicker
// ---------------------------------------------------------------------------

export type AIEfficiencyLevel = 0 | 1 | 2 | 3;
export type AIDissimulationLevel = 0 | 1 | 2 | 3;

export interface AIGrowthState {
  purchased: boolean;
  efficiencyLevel: AIEfficiencyLevel;       // 0 = base (1 req/5s)
  dissimulationLevel: AIDissimulationLevel;
  detectionRisk: number;                    // % calculé dynamiquement
  isBanned: boolean;
  banEndsAt: number;                        // timestamp ms
  banPayoffCost: number;                    // coût pour lever le ban immédiatement
}

// ---------------------------------------------------------------------------
// MODULE PRESTIGE — Paliers
// ---------------------------------------------------------------------------

export interface PrestigeTier {
  tier: number;
  requiredTotalRelations: number;    // seuil sur totalRelationsEarned
  problem: string;                   // texte du problème bloquant (affiché au joueur)
  solution: string;                  // texte de la solution absurde
  solutionCost: number;              // coût en relations pour débloquer le palier suivant
  titleUnlocked: string;
  isUnlocked: boolean;
  isCurrent: boolean;
}

export interface PrestigeState {
  currentTier: number;
  unlockedTiers: number[];
  titlesEarned: string[];
  resetCount: number;
}

// ---------------------------------------------------------------------------
// RÉSULTAT DU CYCLE MÉTIER
// ---------------------------------------------------------------------------

export interface CycleResult {
  accepted: number;
  rejected: number;
  processed: number;
}

// ---------------------------------------------------------------------------
// PERSISTANCE
// ---------------------------------------------------------------------------

export interface SaveData {
  version: number;
  savedAt: number;                   // timestamp ms
  gameState: GameState;
}

// ---------------------------------------------------------------------------
// ÉTAT GLOBAL DU JEU — GameState (racine du store Zustand)
// ---------------------------------------------------------------------------

export interface GameState {
  // Ressource principale
  relations: number;
  totalRelationsEarned: number;      // jamais réinitialisé, sert aux seuils de palier

  // Demandes
  pendingRequests: number;
  incomingRequests: number;          // clicker secondaire — demandes reçues en attente

  // Variables clés du jeu
  clicksPerRequest: number;          // demandes envoyées par clic (base: 1)
  acceptanceRate: number;            // taux d'acceptation calculé en % (base: 10, max: 95)
  requestsProcessedPerCycle: number; // demandes traitées par cycle (base: 10 + pyramide)
  cycleDuration: number;             // durée du cycle en secondes (base: 30 - sacrifices)

  // Modules
  mindset: MindsetState;
  branding: BrandingState;
  pyramid: PyramidState;
  sacrifices: SacrificesState;
  aiGrowth: AIGrowthState;
  prestige: PrestigeState;

  // État global
  isBanned: boolean;                 // ban IA actif — bloque clicker + cycle
  banRemainingSeconds: number;
  gamePhase: GamePhase;

  // Timestamps internes (en ms)
  lastTickAt: number;
  lastCycleAt: number;
  lastPostDecayAt: number;
}
