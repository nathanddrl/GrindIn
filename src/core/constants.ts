// core/constants.ts
// Source unique de toutes les valeurs numériques du jeu.
// Aucun magic number ailleurs dans la codebase.

import type {
  FormationId, PostTypeId, JobId,
  PyramidLevel, SacrificeId, SacrificeMalus,
  Formation, PostType, Job, PyramidTier, Sacrifice, PrestigeTier,
} from './types';

// ---------------------------------------------------------------------------
// PARAMÈTRES GLOBAUX DU JEU
// ---------------------------------------------------------------------------

export const GAME_CONSTANTS = {
  // Cycle métier
  BASE_CYCLE_DURATION_SECONDS:     30,
  MIN_CYCLE_DURATION_SECONDS:       5,
  BASE_REQUESTS_PER_CYCLE:         10,

  // UI tick
  UI_TICK_MS:                     100,

  // Taux d'acceptation
  BASE_ACCEPTANCE_RATE:            10,
  MAX_ACCEPTANCE_RATE:             95,

  // Clicker principal
  BASE_CLICKS_PER_REQUEST:          1,

  // Clicker secondaire — demandes entrantes
  MIN_INCOMING_INTERVAL_SECONDS:    5,
  BASE_INCOMING_INTERVAL_SECONDS:  60,
  INCOMING_RATE_FACTOR:           0.5, // combiné avec SCALING : chaque point au-dessus de BASE_ACCEPTANCE_RATE réduit l'intervalle de FACTOR × SCALING = 0.2s
  INCOMING_RATE_SCALING:          0.4, // atténue INCOMING_RATE_FACTOR (formule : BASE - max(0, rate - BASE_ACCEPTANCE_RATE) * FACTOR * SCALING)

  // Branding decay (sans post actif)
  DECAY_GRACE_PERIOD_SECONDS:     120, // délai avant que le decay commence
  DECAY_RATE_PER_30S:             0.5, // % perdu toutes les 30s
  DECAY_FLOOR_RATIO:              0.5, // plancher = baseAcceptanceRate × 0.5

  // Bad buzz (job fake)
  BAD_BUZZ_DURATION_SECONDS:      120,
  BAD_BUZZ_PENALTY_RATIO:         0.5, // postBonus × -0.5

  // IA Growth Hacking
  AI_TICK_INTERVAL_SECONDS:         5,
  AI_BASE_DETECTION_RISK:           5, // % de base
  AI_MIN_DETECTION_RISK:            1,
  AI_BAN_DURATION_SECONDS:         60,
  AI_BAN_PAYOFF_BASE:             500, // banPayoffCost = AI_BAN_PAYOFF_BASE × (efficiencyLevel + 1)
  AI_UNLOCK_MIN_RELATIONS:    100_000, // palier 5 requis pour acheter l'IA

  // Post viral
  VIRAL_CHANCE_PERCENT:             5,
  VIRAL_BONUS_PERCENT:             25,
  VIRAL_DURATION_SECONDS:       1_800,

  // tendance_linkedin sans tendance active
  TRENDING_REDUCED_BONUS:           6, // au lieu de 12%
  TRENDING_ACTIVATION_CHANCE_PER_TICK: 0.001, // ~0.1% par tick (100ms) ≈ activation toutes les ~100s
  TRENDING_DURATION_SECONDS:       1_800, // 30min

  // Offline progress
  OFFLINE_MAX_HOURS:                8,

  // Autosave
  AUTOSAVE_INTERVAL_SECONDS:       30,

  // Fin du jeu
  INFINITE_MODE_RELATIONS_PER_SECOND: 1_000_000,
} as const;

// ---------------------------------------------------------------------------
// SAVE VERSION
// ---------------------------------------------------------------------------

export const SAVE_VERSION = 2;

// ---------------------------------------------------------------------------
// CATALOGUE — Formations (Mindset)
// ---------------------------------------------------------------------------

export const FORMATIONS: Record<FormationId, Omit<Formation, 'id'>> = {
  growth_mindset_101: {
    label: 'Growth Mindset 101',
    description: 'Apprenez à appeler vos échecs des "opportunités d\'apprentissage".',
    cost: 50, durationSeconds: 30, clicksBonus: 1,
  },
  personal_branding_basics: {
    label: 'Personal Branding Basics',
    description: 'Construisez votre marque personnelle en 5 posts et une photo pro.',
    cost: 200, durationSeconds: 60, clicksBonus: 2,
  },
  the_art_of_networking: {
    label: 'The Art of Networking',
    description: 'Transformez chaque conversation en opportunité business.',
    cost: 500, durationSeconds: 90, clicksBonus: 3,
    requiredFormationId: 'growth_mindset_101',
  },
  hustle_culture_masterclass: {
    label: 'Hustle Culture Masterclass',
    description: 'Dormez 4h, travaillez 20h. Les weekends sont pour les faibles.',
    cost: 2_000, durationSeconds: 180, clicksBonus: 5,
    requiredFormationId: 'personal_branding_basics',
  },
  think_and_grow_rich_summary: {
    label: 'Think & Grow Rich (Résumé YouTube)',
    description: 'Le résumé en 12 minutes qui remplace la lecture du livre entier.',
    cost: 8_000, durationSeconds: 300, clicksBonus: 8,
  },
  linkedin_optimization_pro: {
    label: 'LinkedIn Optimization Pro',
    description: 'Optimisez votre profil avec 47 mots-clés et un banner Canva.',
    cost: 25_000, durationSeconds: 600, clicksBonus: 12,
    requiredFormationId: 'the_art_of_networking',
  },
  become_a_thought_leader: {
    label: 'Become a Thought Leader',
    description: 'Devenez expert en tout en publiant des threads sur des sujets que vous ne maîtrisez pas.',
    cost: 100_000, durationSeconds: 1_200, clicksBonus: 20,
    requiredJobId: 'consultant',
  },
  manifestation_et_business: {
    label: 'Manifestation & Business™',
    description: 'La loi de l\'attraction appliquée au chiffre d\'affaires. Ça marche si vous y croyez vraiment.',
    cost: 500_000, durationSeconds: 2_700, clicksBonus: 40,
    requiredFormationId: 'become_a_thought_leader',
  },
};

// ---------------------------------------------------------------------------
// CATALOGUE — Posts (Branding)
// ---------------------------------------------------------------------------

export const POST_TYPES: Record<PostTypeId, Omit<PostType, 'id'>> = {
  post_motivant: {
    label: 'Ne lâchez rien ! 💪',
    acceptanceBonus: 1,  durationSeconds: 60,   cooldownSeconds: 30,
    baseCost: 10,        costMultiplier: 1.2,   spamRisk: false,
    viralChance: GAME_CONSTANTS.VIRAL_CHANCE_PERCENT,
  },
  anecdote_inspirante: {
    label: 'Ce matin, j\'ai réalisé que...',
    acceptanceBonus: 3,  durationSeconds: 180,  cooldownSeconds: 90,
    baseCost: 50,        costMultiplier: 1.5,   spamRisk: false,
    viralChance: GAME_CONSTANTS.VIRAL_CHANCE_PERCENT,
  },
  thread_dev_perso: {
    label: 'Thread : 10 leçons de vie 🧵',
    acceptanceBonus: 5,  durationSeconds: 300,  cooldownSeconds: 180,
    baseCost: 200,       costMultiplier: 1.8,   spamRisk: false,
    viralChance: GAME_CONSTANTS.VIRAL_CHANCE_PERCENT,
  },
  temoignage_entrepreneur: {
    label: 'J\'ai tout quitté pour entreprendre',
    acceptanceBonus: 8,  durationSeconds: 420,  cooldownSeconds: 600,
    baseCost: 500,       costMultiplier: 2.0,   spamRisk: true,
    viralChance: GAME_CONSTANTS.VIRAL_CHANCE_PERCENT,
  },
  analyse_marche_bidon: {
    label: 'Analyse : Le marché en 2025',
    acceptanceBonus: 10, durationSeconds: 600,  cooldownSeconds: 300,
    baseCost: 1_500,     costMultiplier: 2.5,   spamRisk: false,
    requiredJobId: 'consultant',
    viralChance: GAME_CONSTANTS.VIRAL_CHANCE_PERCENT,
  },
  tendance_linkedin: {
    label: 'Post sur la tendance du moment',
    acceptanceBonus: 12, durationSeconds: 600,  cooldownSeconds: 120,
    baseCost: 3_000,     costMultiplier: 2.0,   spamRisk: false,
    viralChance: GAME_CONSTANTS.VIRAL_CHANCE_PERCENT,
  },
  article_medium: {
    label: 'Mon article Medium',
    acceptanceBonus: 15, durationSeconds: 900,  cooldownSeconds: 900,
    baseCost: 8_000,     costMultiplier: 3.0,   spamRisk: false,
    viralChance: GAME_CONSTANTS.VIRAL_CHANCE_PERCENT,
  },
  post_viral: {
    // Déclenché aléatoirement — jamais acheté directement
    label: '🔥 Post Viral',
    acceptanceBonus: GAME_CONSTANTS.VIRAL_BONUS_PERCENT,
    durationSeconds: GAME_CONSTANTS.VIRAL_DURATION_SECONDS,
    cooldownSeconds: 0, baseCost: 0, costMultiplier: 1, spamRisk: false,
  },
};

// ---------------------------------------------------------------------------
// CATALOGUE — Jobs CV (Branding)
// ---------------------------------------------------------------------------

export const JOBS: Record<JobId, Omit<Job, 'id'>> = {
  stagiaire:           { label: 'Stagiaire @ une boîte cool',            cost: 100,       permanentAcceptanceBonus: 1,  isFake: false },
  charge_de_projet:    { label: 'Chargé de Projet Digital',              cost: 500,       permanentAcceptanceBonus: 2,  isFake: false },
  consultant:          { label: 'Consultant Indépendant',                cost: 2_000,     permanentAcceptanceBonus: 4,  isFake: false, requiredFormationId: 'personal_branding_basics' },
  business_developer:  { label: 'Business Developer',                    cost: 8_000,     permanentAcceptanceBonus: 5,  isFake: false },
  ceo_startup:         { label: 'CEO @ MaStartup™',                      cost: 30_000,    permanentAcceptanceBonus: 8,  isFake: true,  fakeBadBuzzRisk: 5,  requiredFormationId: undefined },
  coach_de_vie:        { label: 'Life Coach Certifié™',                  cost: 80_000,    permanentAcceptanceBonus: 10, isFake: true,  fakeBadBuzzRisk: 10 },
  thought_leader:      { label: 'Thought Leader & Speaker',              cost: 300_000,   permanentAcceptanceBonus: 15, isFake: true,  fakeBadBuzzRisk: 15, requiredFormationId: 'become_a_thought_leader' },
  serial_entrepreneur: { label: 'Serial Entrepreneur (x3 exits)',        cost: 1_000_000, permanentAcceptanceBonus: 20, isFake: true,  fakeBadBuzzRisk: 25, requiredFormationId: undefined },
};

// ---------------------------------------------------------------------------
// CATALOGUE — Pyramide (Leadership)
// ---------------------------------------------------------------------------

type PyramidTierDef = Omit<PyramidTier, 'level' | 'currentDisciples' | 'recruitmentPerDay'>;

export const PYRAMID_TIERS: Record<PyramidLevel, PyramidTierDef> = {
  0: { label: 'Toi-même (Leader)',       unlockCost: 0,         relationsPerDisciple: 10,  recruitmentUpgradeCost: 0,         maxDisciples: 1 },
  1: { label: 'Disciples Directs',       unlockCost: 1_000,     relationsPerDisciple: 5,   recruitmentUpgradeCost: 2_000,     maxDisciples: 9999 },
  2: { label: 'Managers',                unlockCost: 5_000,     relationsPerDisciple: 10,  recruitmentUpgradeCost: 10_000,    maxDisciples: 9999 },
  3: { label: 'Coachs Influenceurs',     unlockCost: 25_000,    relationsPerDisciple: 25,  recruitmentUpgradeCost: 50_000,    maxDisciples: 9999 },
  4: { label: 'Thought Leaders',         unlockCost: 100_000,   relationsPerDisciple: 50,  recruitmentUpgradeCost: 200_000,   maxDisciples: 9999 },
  5: { label: 'Visionnaires Éclairés',   unlockCost: 500_000,   relationsPerDisciple: 100, recruitmentUpgradeCost: 1_000_000, maxDisciples: 9999 },
};

// ---------------------------------------------------------------------------
// CATALOGUE — Sacrifices
// ---------------------------------------------------------------------------

const ZERO_MALUS: SacrificeMalus = {
  acceptanceDelta: 0, recruitmentDelta: 0,
  postEfficiencyDelta: 0, formationSpeedDelta: 0, recruitmentCostDelta: 0,
};

type SacrificeDef = Omit<Sacrifice, 'id' | 'unlocked' | 'active'>;

export const SACRIFICES: Record<SacrificeId, SacrificeDef> = {
  no_sleep: {
    label: 'Arrêter de Dormir',
    flavourText: '4h de sommeil c\'est déjà du luxe. Les winners dorment debout.',
    unlockCost: 10_000, cycleReductionSeconds: 5, isPointOfNoReturn: false,
    malus: { ...ZERO_MALUS, acceptanceDelta: -5 },
  },
  no_friends: {
    label: 'Plus d\'Amis, Que du Business',
    flavourText: 'Tes amis ne comprennent pas ta vision. Ils te ralentissent.',
    unlockCost: 20_000, cycleReductionSeconds: 5, isPointOfNoReturn: false,
    malus: { ...ZERO_MALUS, recruitmentDelta: -5 },
  },
  no_family: {
    label: 'Abandonner sa Famille',
    flavourText: 'Le succès est un voyage solitaire. Ta famille te rejoindra au sommet.',
    unlockCost: 40_000, cycleReductionSeconds: 5, isPointOfNoReturn: false,
    malus: { ...ZERO_MALUS, acceptanceDelta: -10 },
  },
  no_weekends: {
    label: 'Pas de Week-ends',
    flavourText: 'TGIF ? Non. TGIW. Thank God It\'s Weekday.',
    unlockCost: 80_000, cycleReductionSeconds: 5, isPointOfNoReturn: false,
    malus: { ...ZERO_MALUS, recruitmentCostDelta: 10 },
  },
  no_lunch: {
    label: 'Zéro Pause Déjeuner',
    flavourText: 'Les calories se mangent en réunion Zoom. Soylent Green is connections.',
    unlockCost: 160_000, cycleReductionSeconds: 5, isPointOfNoReturn: false,
    malus: { ...ZERO_MALUS, postEfficiencyDelta: -10 },
  },
  no_sport: {
    label: 'Optimisation Corporelle',
    flavourText: 'Ton seul sport : courir d\'une réunion à l\'autre.',
    unlockCost: 320_000, cycleReductionSeconds: 5, isPointOfNoReturn: false,
    malus: { ...ZERO_MALUS, recruitmentDelta: -15 },
  },
  divorce: {
    label: 'Divorce Stratégique',
    flavourText: 'Libéré des contraintes domestiques, tu peux enfin te consacrer à LinkedIn 24/7.',
    unlockCost: 640_000, cycleReductionSeconds: 5, isPointOfNoReturn: false,
    malus: { ...ZERO_MALUS, acceptanceDelta: -20 },
  },
  burnout: {
    label: 'Burn-out Volontaire',
    flavourText: 'Le burnout est le badge des véritables warriors. Tu le portes avec fierté.',
    unlockCost: 1_280_000, cycleReductionSeconds: 5, isPointOfNoReturn: false,
    malus: { ...ZERO_MALUS, formationSpeedDelta: -30 },
  },
  linkedin_fusion: {
    label: 'Fusion Totale avec LinkedIn™',
    flavourText: 'Tu ne fais plus qu\'un avec la plateforme. Tu ES le réseau.',
    unlockCost: 2_560_000, cycleReductionSeconds: 5, isPointOfNoReturn: true,
    malus: ZERO_MALUS, // effet géré séparément (isFusionActive)
  },
};

// ---------------------------------------------------------------------------
// CATALOGUE — IA Growth Hacking (upgrades)
// ---------------------------------------------------------------------------

export const AI_EFFICIENCY: Record<0 | 1 | 2 | 3, { requestsPer5s: number; cost: number; detectionRiskAdd: number }> = {
  0: { requestsPer5s:  1, cost:       5_000, detectionRiskAdd: 0  }, // achat initial
  1: { requestsPer5s:  2, cost:      10_000, detectionRiskAdd: 2  },
  2: { requestsPer5s:  5, cost:      50_000, detectionRiskAdd: 5  },
  3: { requestsPer5s: 10, cost:     100_000, detectionRiskAdd: 10 },
};

export const AI_DISSIMULATION: Record<0 | 1 | 2 | 3, { cost: number; detectionRiskReduce: number }> = {
  0: { cost:       0, detectionRiskReduce:  0 },
  1: { cost:  25_000, detectionRiskReduce:  2 },
  2: { cost: 100_000, detectionRiskReduce:  5 },
  3: { cost: 250_000, detectionRiskReduce: 10 },
};

// ---------------------------------------------------------------------------
// CATALOGUE — Paliers de Prestige
// Note : paliers 14+ dépassent Number.MAX_SAFE_INTEGER — utiliser big.js à partir du palier 14.
// ---------------------------------------------------------------------------

export const PRESTIGE_TIERS: Omit<PrestigeTier, 'isUnlocked' | 'isCurrent'>[] = [
  { tier:  1, requiredTotalRelations:                    0, solutionCost:                    0, titleUnlocked: '',                                        problem: '',                                                     solution: '' },
  { tier:  2, requiredTotalRelations:                1_000, solutionCost:                  500, titleUnlocked: 'Stagiaire Ambitieux',                     problem: 'Ton réseau est trop petit pour être pris au sérieux.',  solution: 'Payer pour paraître plus connecté.' },
  { tier:  3, requiredTotalRelations:                5_000, solutionCost:                2_500, titleUnlocked: 'Alternant Exploité',                      problem: 'LinkedIn te suggère des gens que tu connais vraiment.', solution: 'Déménager dans une autre ville.' },
  { tier:  4, requiredTotalRelations:               25_000, solutionCost:               12_500, titleUnlocked: 'Diplômé de Grande École Marketing',       problem: 'Tes anciens contacts se souviennent de toi.',           solution: 'Changer de prénom sur LinkedIn.' },
  { tier:  5, requiredTotalRelations:              100_000, solutionCost:               50_000, titleUnlocked: 'Junior Faussement Heureux',                problem: 'L\'algorithme LinkedIn te pénalise pour spam.',         solution: 'Acheter un abonnement Premium.' },
  { tier:  6, requiredTotalRelations:              500_000, solutionCost:              250_000, titleUnlocked: 'Business Developer Opportuniste',          problem: 'Tes demandes de connexion dépassent la limite mensuelle.',solution: 'Créer 3 faux comptes supplémentaires.' },
  { tier:  7, requiredTotalRelations:            5_000_000, solutionCost:            2_500_000, titleUnlocked: 'Consultant Indépendant Spécialisé en Synergies', problem: 'LinkedIn t\'a signalé à Interpol.',                solution: 'Corrompre un modérateur LinkedIn.' },
  { tier:  8, requiredTotalRelations:           50_000_000, solutionCost:           25_000_000, titleUnlocked: 'CEO de Startup Bullshitique',              problem: 'Tu as connecté avec toute l\'Europe.',                  solution: 'Étendre ta stratégie à l\'Asie du Sud-Est.' },
  { tier:  9, requiredTotalRelations:          100_000_000, solutionCost:           50_000_000, titleUnlocked: 'Coach de Coachs en Coaching',              problem: 'Les gens te fuient dans la vraie vie.',                 solution: 'Ne plus sortir de chez toi.' },
  { tier: 10, requiredTotalRelations:          500_000_000, solutionCost:          250_000_000, titleUnlocked: 'Serial Entrepreneur en Série',             problem: 'Tu as épuisé les humains disponibles sur Terre.',       solution: 'Créer des profils pour les animaux de compagnie.' },
  { tier: 11, requiredTotalRelations:        1_000_000_000, solutionCost:          500_000_000, titleUnlocked: 'Président de la Bullshit Nation',          problem: 'LinkedIn plante sous le poids de ton réseau.',          solution: 'Racheter les serveurs de LinkedIn.' },
  { tier: 12, requiredTotalRelations:        7_900_000_000, solutionCost:        3_950_000_000, titleUnlocked: 'Growth Hacker International',              problem: 'Tu as connecté avec toute l\'humanité vivante.',        solution: 'Connecter avec les profils des personnes décédées.' },
  { tier: 13, requiredTotalRelations:       15_000_000_000, solutionCost:        7_500_000_000, titleUnlocked: 'Social Media Visionary',                   problem: 'Les morts rejettent aussi tes demandes.',               solution: 'Inventer une IA pour accepter à leur place.' },
  { tier: 14, requiredTotalRelations:      100_000_000_000, solutionCost:       50_000_000_000, titleUnlocked: 'Green IT Guru',                            problem: 'Ton réseau consomme 40% de l\'électricité mondiale.',   solution: 'Construire une centrale nucléaire dédiée.' },
  { tier: 15, requiredTotalRelations:      100_000_000_001, solutionCost:       50_000_000_000, titleUnlocked: 'Interplanetary Networker',                 problem: 'La Terre n\'est plus assez grande.',                    solution: 'Envoyer des demandes de connexion sur Mars.' },
  { tier: 16, requiredTotalRelations:      200_000_000_000, solutionCost:      100_000_000_000, titleUnlocked: 'Galactic Influencer',                      problem: 'Elon Musk refuse ta demande de connexion.',             solution: 'Lui envoyer 200 milliards de relations.' },
  { tier: 17, requiredTotalRelations:    1_000_000_000_000, solutionCost:      500_000_000_000, titleUnlocked: 'Secure Double Authentification Manager',   problem: 'LinkedIn exige une double authentification galactique.', solution: 'Pirater la NASA pour obtenir le code.' },
  { tier: 18, requiredTotalRelations:    2_000_000_000_000, solutionCost:    1_000_000_000_000, titleUnlocked: 'Quantum Networking Specialist',             problem: 'Ton réseau est devenu quantique et existe en superposition.', solution: 'Observer chaque connexion pour effondrer la fonction d\'onde.' },
  { tier: 19, requiredTotalRelations:   10_000_000_000_000, solutionCost:    5_000_000_000_000, titleUnlocked: 'MCU - Miraculous Connector Universe',       problem: 'Des versions parallèles de toi recrutent dans d\'autres univers.', solution: 'Fusionner tous les multivers LinkedIn.' },
  { tier: 20, requiredTotalRelations:  100_000_000_000_000, solutionCost:   50_000_000_000_000, titleUnlocked: 'Influenceur Absolu',                        problem: 'Tu es devenu la seule entité consciente de l\'univers.',solution: 'Te connecter avec toi-même.' },
  { tier: 21, requiredTotalRelations: 1_000_000_000_000_000, solutionCost:                   0, titleUnlocked: 'Singularité du Réseau',                    problem: '',                                                     solution: '' },
];

