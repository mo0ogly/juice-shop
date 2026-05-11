# juicelab-overlay - Plugin Angular pour Juice Shop

Surcouche pédagogique runtime qui ajoute à OWASP Juice Shop :
- Hints gradués 5 niveaux Vygotsky avec scoring déductif
- Journal de bord obligatoire (before / after solve)
- Quiz de compréhension 3 questions post-validation
- Badges et achievements pédagogiques
- Synchronisation événementielle vers un dashboard cloud enseignant

## Stack

- Angular 20 (standalone components, signals, RxJS)
- Angular Material (réutilise celui de Juice Shop)
- @ngx-translate/core (réutilise l'i18n de Juice Shop, namespace JUICELAB.*)
- HttpClient (pour charger les packs JSON et POST les events)

Aucune dépendance npm additionnelle nécessaire (tout est déjà dans Juice Shop).

## Architecture

```
juicelab-overlay/
- juicelab-overlay.routes.ts       (route lazy /juicelab)
- models/juicelab.types.ts         (Pack, Hint, Quiz, Journal, Badge, ScoreState)
- services/
  - juicelab-pack.service.ts       (charge JSON packs depuis assets/juicelab/)
  - juicelab-state.service.ts      (state local LocalStorage v1, signals)
  - juicelab-scoring.service.ts    (déductif, plancher 50)
  - juicelab-sync.service.ts       (POST events vers dashboard cloud, queue offline)
  - juicelab-badge-engine.service.ts (règles d attribution badges)
- juicelab-panel/                  (composant container, sélection challenge, tabs)
- hints-panel/                     (5 hints révélables, score live, progression forcée)
- journal-form/                    (textarea before/after avec word count)
- quiz-form/                       (3 questions, validation par expected_keywords)
- badges-display/                  (grid des badges gagnés/à débloquer, palette métaux : bronze / argent / or / platine, sans disque médaille)
```

## Installation dans un fork Juice Shop

### Étape 1 - Copier le plugin source

Depuis la racine du repo `juicelab-pedagogy` :

```powershell
$JS = "C:\Users\pizzif\Documents\GitHub\juice\juice-shop"
Copy-Item -Recurse -Force "plugin-source\juicelab-overlay" "$JS\frontend\src\app\juicelab-overlay"
```

### Étape 2 - Convertir les YAML packs en JSON assets

```powershell
$env:JUICE_SHOP_PATH = "C:\Users\pizzif\Documents\GitHub\juice\juice-shop"
python scripts\yaml_to_json_assets.py
```

Cela crée `frontend/src/assets/juicelab/{hints,quiz,journal}/{key}.json` plus
`selected_challenges.json`.

### Étape 3 - Appliquer les patches Juice Shop

Trois fichiers à modifier (cf. `plugin-design/patches/`) :

1. `frontend/src/main.ts` : aucune modification nécessaire (cf. patch 01)
2. `frontend/src/app/app.routing.ts` : ajouter la route `/juicelab` (cf. patch 02)
3. `frontend/src/app/navbar/navbar.component.html` : ajouter le bouton coach (cf. patch 03)

Les patches sont stockés dans `plugin-design/patches/` pour pouvoir être
réappliqués après chaque rebase upstream Juice Shop.

### Étape 4 - Configurer le dashboard cloud (optionnel pour le MVP)

Créer `frontend/src/assets/juicelab/config.json` :

```json
{
  "dashboard_url": "https://juicelab-dashboard.exemple.fr",
  "cohort_id": "M2-IA-2026"
}
```

Si absent, le plugin tourne en mode local-only (pas de POST cloud, pas de
dashboard enseignant temps réel). Les events restent en queue LocalStorage.

### Étape 5 - Build et lancer

```powershell
cd $JS
npm install
npm start
```

Ouvrir http://localhost:3000/#/juicelab dans le navigateur.

## Modèle de données local (LocalStorage)

Clé : `juicelab_state_v1`

```typescript
{
  schema_version: 1,
  student: { token, cohort, language: "fr" | "en" },
  challenges: {
    [challenge_key]: {
      hints_consumed: ["N1", "N2", ...],
      score_net: number,
      journal: { before_solve, after_solve },
      quiz: { Q1, Q2, Q3, score },
      time_spent_s, solved_at, started_at
    }
  },
  badges_earned: [...]
}
```

Reset manuel : `localStorage.removeItem('juicelab_state_v1')` dans la console
DevTools, ou ajouter un bouton dans le panel pour les sessions de test.

## Synchronisation cloud

Chaque action significative POST un event vers le dashboard cloud :

```typescript
{
  student_token: string,
  cohort_id: string,
  event_type: "hint_revealed" | "challenge_solved" | "journal_filled"
            | "quiz_completed" | "badge_earned" | "session_start" | "session_end",
  challenge_key?: string,
  data: object,
  client_timestamp: string
}
```

Si le réseau est down, les events sont queued en LocalStorage
(`juicelab_sync_queue_v1`, max 500 events) et flushed au prochain succès.

## Roadmap

| Phase | Status |
|-------|--------|
| D - Scaffold complet | DONE |
| E - HintsPanel testable bout-en-bout | À valider |
| F - JournalForm finalisé (warning si < 50 mots) | DONE (basique) |
| G - QuizForm avec rubric automatique | DONE (basique) |
| H - BadgeEngine avec 6 règles | DONE (4 règles, à étendre) |
| I - SyncService + dashboard cloud Flask | scaffold OK, dashboard cloud à faire |
| J - Polish UI Material, i18n complet, tests Karma | TODO |

## Limitations connues

1. La synchronisation requiert `dashboard_url` configuré, sinon mode local-only
2. Le plugin attend que les JSON assets soient présents, sinon erreurs 404
3. L i18n n est pas encore wired sur les labels du panel (statiques en FR
   pour le moment, à externaliser vers @ngx-translate)
4. Le composant `HintsPanel` force la progression N1 -> N5, on ne peut pas
   sauter à N5 directement. À débattre pédagogiquement
5. Les tests Karma ne sont pas encore écrits

## Badges - palette tier

| Tier | Label | --tier-color | --tier-color-2 |
|------|-------|--------------|----------------|
| recon | BRONZE | `#cd7f32` | `#8b4513` |
| grit  | SILVER | `#c0c0c0` | `#808080` |
| meta  | GOLD   | `#fbbf24` | `#b8860b` |
| apex  | PLATINUM | `#e5e4e2` | `#71717a` |

Le bloc visuel `.medal` (ring + progress conique + core + lock/tick) a été
retiré du template. La carte badge garde tier-pill + label + description +
barre de progression + chip "earned".

## Build prod - patch flag-icons

`ng build --configuration production` plantait avec
`Two output files share the same path but have different contents: media/<flag>.svg`
parce que `flag-icons.min.css` référence à la fois `flags/4x3/<x>.svg` et
`flags/1x1/<x>.svg`, qu'esbuild aplatit tous les deux vers `media/<x>.svg`.

Fix livré dans le repo : `frontend/src/assets/flag-icons-patched.min.css`
(rules `.fis` 1x1 strippées, `url()` réécrites vers
`../../node_modules/flag-icons/flags/4x3/...`). Le `styles[]` d'`angular.json`
pointe sur ce fichier au lieu du CSS upstream. Aucun impact runtime visible
(la classe `.fis` carrée n'est pas utilisée par Juice Shop).

Si tu veux régénérer le patch après un bump `flag-icons` :

```bash
sed 's|\.fi-[a-z0-9-]*\.fis{background-image:url(\.\./flags/1x1/[a-z0-9-]*\.svg)}||g' \
  node_modules/flag-icons/css/flag-icons.min.css \
  | sed 's|url(\.\./flags/|url(../../node_modules/flag-icons/flags/|g' \
  > src/assets/flag-icons-patched.min.css
```

## License

MIT, cohérent avec OWASP Juice Shop.
