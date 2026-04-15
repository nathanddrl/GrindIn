# GrindIn - LinkedIn Clicker

> Un jeu incrémental satirique sur la culture LinkedIn.  
> Construis ton réseau, sacrifie ta vie, fusionne avec l'algorithme.

---

## Concept

GrindIn est un **idle/clicker game** qui parodie l'obsession LinkedIn et la culture du networking toxique. Le joueur envoie des demandes de connexion, publie du contenu inspirant creux, recrute des disciples dans une pyramide de leadership, et sacrifie progressivement tout ce qui lui reste d'humain pour grinder des relations.

---

## Partie Technique

### Stack

| Couche | Technologie |
|--------|-------------|
| Language | TypeScript ~6.0 (strict, zéro `any`) |
| UI | React 18 |
| State | Zustand 5 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Tests | Vitest |
| Grands nombres | big.js (paliers 14+, > 2^53) |

### Lancer le projet

```bash
npm install
npm run dev       # dev server (HMR)
npm run build     # build production (tsc + vite)
npm run test      # tests unitaires
npm run lint      # ESLint strict
```

### Architecture

Monolithe modulaire - **Feature-Sliced Design** simplifié. Chaque mécanique de jeu est un slice Zustand isolé.

```
src/
├── core/
│   ├── types.ts          # Tous les types globaux (contrat du jeu)
│   ├── constants.ts      # Toutes les valeurs numériques (zéro magic number ailleurs)
│   └── gameLoop.ts       # Moteur principal (deux boucles distinctes)
├── store/
│   ├── useGameStore.ts   # Store Zustand racine + middleware persist
│   └── slices/
│       ├── connectionsSlice.ts   # Relations, demandes, cycle [LIVE]
│       ├── mindsetSlice.ts       # Formations, clicksPerRequest [PLANNED]
│       ├── brandingSlice.ts      # Posts, CV, acceptanceRate [PLANNED]
│       ├── pyramidSlice.ts       # Disciples, recrutement auto [PLANNED]
│       ├── sacrificesSlice.ts    # Sacrifices, malus agrégés [PLANNED]
│       ├── aiGrowthSlice.ts      # IA autoclicker, ban [PLANNED]
│       └── prestigeSlice.ts      # Paliers, resets, titres [PLANNED]
├── hooks/
│   ├── useGameLoop.ts    # Lifecycle de la game loop (setInterval 100ms)
│   └── useAutoSave.ts    # Sauvegarde auto toutes les 30s
└── utils/
    └── saveLoad.ts       # Sérialisation / migrations / type guards
```

### Deux boucles de jeu

- **UI Tick (100ms)** - timers visuels, ban countdown, demandes entrantes, decay branding, recrutement auto, autosave
- **Cycle Métier (variable, base 30s)** - traitement des demandes, calcul des relations gagnées, vérification des seuils prestige

### Persistance

Sauvegarde complète du `GameState` dans `localStorage` (clé `grindin-save`). Format versionné avec registre de migrations. Les grands nombres (paliers 14+) sont sérialisés en `string` pour éviter la perte de précision flottante.

### Règles de typage

- Zéro `any`, zéro `unknown` hors frontières réelles (JSON.parse, localStorage)
- Aux frontières `unknown` : type guards explicites, jamais de cast direct
- `npm run build` et `npm run lint` doivent passer sans erreur avant tout commit
- Un fichier = une responsabilité ; viser ~200 lignes (léger dépassement acceptable si la lisibilité reste bonne)

---

## Partie Product - Vision & Design

### Positionnement

GrindIn est un **jeu de satire sociale** ciblant les professionnels qui reconnaissent (et subissent) la culture LinkedIn. Le ton est satirique mais jamais cynique - le joueur rit de lui-même autant que du système.

Le hook principal : **chaque upgrade est une absurdité qui fait écho à une vraie pratique LinkedIn.**  
"Become a Thought Leader" comme formation. "CEO @ MaStartup™" comme job fake sur le CV. "Burn-out Volontaire" comme sacrifice productif.

### Mécaniques clés & décisions design

**Ressource unique - Les Relations**  
Tout coûte des relations, tout en rapporte. Pas de monnaies multiples. La simplicité de la boucle principale permet au joueur de rester focalisé sur l'escalade absurde plutôt que sur la gestion de ressources.

**`totalRelationsEarned` jamais réinitialisé**  
Décision critique : le prestige reset `relations` mais jamais le compteur cumulatif. Cela garantit que le joueur progresse toujours vers la fin, même après un reset - et explique psychologiquement pourquoi il accepte de tout recommencer.

**Prestige en 21 paliers**  
Chaque palier présente un "problème bloquant absurde" avec une solution encore plus absurde. La progression des titres raconte une histoire : de Stagiaire Ambitieux à Singularité du Réseau. Le palier final est un vrai choix narratif (Liberté vs Fusion), pas juste un écran de victoire.

**Les Sacrifices comme mécanique de trade-off**  
Chaque sacrifice réduit le cycle de 5s (gain de vitesse) mais inflige un malus spécifique. Le joueur doit choisir ses sacrifices en fonction de sa stratégie (priorité pyramide vs posts vs formations). `linkedin_fusion` est le point de non-retour : tous les sacrifices actifs deviennent permanents.

**Decay du branding**  
Si le joueur ne poste pas pendant 120s, son taux d'acceptation décline. Cela force une attention régulière au module Branding et simule la nécessité de "rester visible" sur LinkedIn.

**IA Growth Hacking avec risque de ban**  
L'autoclicker est une récompense tardive (débloqué au palier 5) avec un vrai risque. Le ban suspend tout pendant 60s. Le joueur peut payer pour lever le ban immédiatement - une métaphore directe des publicités LinkedIn.

### Axes d'amélioration identifiés (backlog PM)

- **Onboarding progressif** : les modules s'ouvrent au fur et à mesure pour éviter l'overwhelm au démarrage
- **Notifications in-game** : feedback visuel riche à chaque cycle (toast "+X relations | Y ignorées")
- **Achievements / badges** : récompenses sociales ironiques (ex: "Premier Bad Buzz", "Burnout Volontaire")
- **Partage social** : screenshot de son titre prestige - le jeu devient sa propre meme machine
- **Leaderboard optionnel** : top des "Singularités du Réseau" avec timestamp

### Métriques de succès (si distribué)

| Métrique | Cible |
|----------|-------|
| Taux de rétention J1 | > 40% |
| Temps moyen avant premier prestige | 15-25 min |
| % joueurs ayant activé au moins 3 sacrifices | > 60% |
| % joueurs ayant atteint la fin du jeu | > 5% |
| Partages organiques (screenshot titre) | KPI qualitatif |

---

## État du projet

| Module | Statut |
|--------|--------|
| Game loop & cycle | Complet |
| Connections slice (relations, demandes) | Complet |
| Persistance & migrations | Complet |
| Types & constants (tous modules) | Complet |
| Tests unitaires (core) | Complet |
| UI React | Squelette LinkedIn V1 en place |
| Slices Mindset / Branding / Pyramid / Sacrifices / AI / Prestige | À implémenter |

---

*Stack : TypeScript + React 18 + Zustand 5 + Vite 8 + Tailwind CSS 4. Zéro backend. 100% offline-capable.*
