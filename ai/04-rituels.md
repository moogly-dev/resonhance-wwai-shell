# 04 — Rituels

Révision : 2026-11-20

Format d'un rituel : titre `### R-n`, puis Déclencheur, Commandes (pour Git Bash, avec ce qu'on attend), Sert (rituel du projet) ou Sélection (automatisation de Claude : « essai jusqu'au AAAA-MM-JJ ; mesure : … », ou « retenu le AAAA-MM-JJ : preuve »), Statut (provisoire | actif). Toute commande que l'utilisateur exécute ou valide s'inscrit ici et revient à son déclencheur ; tout script et tout hook aussi, avec comment le retirer, sinon `npm run check:ai` échoue. Une automatisation de Claude entre à l'essai et ne reste que par l'usage mesuré (`ai/claude/usage.json`) : à l'échéance, ou 90 jours après avoir été retenue, `npm run check:ai` la signale, et Claude la retient avec sa preuve ou la retire.

## Projet

Commandes de l'application (base, migrations, mise en ligne…), selon le Socle.

## Automatisations de Claude

### R-1

- **Déclencheur :** Après toute modification de `ai/` ou d'un renvoi du code, par Claude
- **Commandes :** `npm run check:ai` (`ai/scripts/check-ai.mts`, testé par `ai/scripts/check-ai.test.mts`) — attendu : `0 erreur(s)` ; `--details` donne les listes complètes. Contrôle formats, renvois et index ; isole les sources de Claude (M), que rien du projet ne cite ; refuse une décision fondée sur une source de rang 3 seule ; tient la barrière des scripts de Claude (ni réseau, ni processus lancé, ni dossier personnel, ni `.env`) ; signale les candidats à l'extinction, les essais échus et le dépassement du budget du contexte permanent. Les dossiers de code contrôlés (`CODE_DIRS`, en tête du script) suivent la stack du Socle
- **Sélection :** retenu le 2026-11-18 : socle de la méthode, éprouvé sur Resonhance
- **Statut :** provisoire

### R-2

- **Déclencheur :** Automatique : chaque événement que déclare `.claude/settings.json` (début de session, avant chaque outil, fin de tour)
- **Commandes :** `.claude/settings.json` appelle `node ai/scripts/hook.mts` (testé par `ai/scripts/hook.test.mts`) pour chaque événement, et ne change plus ; l'événement reçu choisit le traitement (M-1). Début de session : mémoire de travail créée si absente, purge (R-6), retrait de `ai/demarrage.md` une fois le démarrage achevé (copie dans `ai/bin/`), rapport de `ai/scripts/check-ai.mts`, réduit aux erreurs après un résumé, et relevé des erreurs déjà présentes. Fin de tour : contrôle seulement si Claude a écrit, blocage une seule fois et sur les seules erreurs nées pendant la session. Modifier : éditer `ai/scripts/hook.mts`. Retirer un événement : par l'utilisateur, dans `.claude/settings.json`, puis `/hooks`
- **Sélection :** essai jusqu'au 2026-12-11 ; mesure : blocages de fin de tour (`check-ai:blocage`) tous dus au tour, aucun rapport hors de propos signalé par l'utilisateur
- **Statut :** provisoire

### R-3

- **Déclencheur :** Avant de supprimer un élément ou de modifier plusieurs fichiers de `ai/`, par Claude
- **Commandes :** `npm run ai:bin -- <sujet> [chemins]` (`ai/scripts/ai-bin.mts`, testé par `ai/scripts/ai-bin.test.mts`) — copie dans `ai/bin/<date>-<sujet>/`, sans chemin tout `ai/`, sans jamais remplacer une copie ; ne garde que les 10 copies les plus récentes ; `npm run ai:bin -- --ranger` range sans copier
- **Sélection :** retenu le 2026-11-18 : filet éprouvé sur Resonhance
- **Statut :** provisoire

### R-4

- **Déclencheur :** Lot de modifications de `ai/`, par Claude, à la place d'un script jetable
- **Commandes :** `npm run ai:apply -- ai/tmp/claude/lot.json` (`ai/scripts/ai-apply.mts`, testé par `ai/scripts/ai-apply.test.mts`), puis `npm run check:ai` — copie dans `ai/bin/`, numérote les sources (S, ou M avec `"for": "claude"`) et les questions, tient leurs index, n'écrit rien si un remplacement échoue, retire le lot une fois appliqué ; la section d'une source nouvelle existe déjà dans son index
- **Sélection :** retenu le 2026-11-18 : éprouvé sur Resonhance
- **Statut :** provisoire

### R-5

- **Déclencheur :** Automatique : avant chaque écriture ou commande de Claude
- **Commandes :** `ai/scripts/hook.mts`, événement `PreToolUse`, par `ai/scripts/guard-paths.mts` (testé par `ai/scripts/guard-paths.test.mts`) : refuse tout chemin dans AppData ; le dossier de travail de Claude est `ai/tmp/claude/`, hors de git. Refuse aussi de lancer par `node` un script de `ai/`, jetable compris, qui franchit la barrière de R-1. Refuse enfin ce qui fait surgir un dialogue d'autorisation à chaque appel : l'outil PowerShell (les autorisations sont écrites pour Bash) et le code `node -e` (qui échappe aussi à la barrière) ; le refus dit quoi faire à la place. Retirer : ôter l'appel de `hook.mts` et mettre ce rituel à jour
- **Sélection :** retenu le 2026-11-18 : règle de l'utilisateur ; mesure : refus (`guard-paths:refus`) ; dialogues évités (`guard-paths:dialogue`) à l'essai jusqu'au 2026-12-24, retour de l'utilisateur du 2026-11-24 sur les dialogues de resonhance-web-extension
- **Statut :** provisoire

### R-6

- **Déclencheur :** Automatique : début de session
- **Commandes :** `ai/scripts/hook.mts`, événement `SessionStart`, par `ai/scripts/ai-tmp.mts` (testé par `ai/scripts/ai-tmp.test.mts`) : supprime de `ai/tmp/claude/`, les fichiers jetables de Claude (scripts d'essai, captures, état des hooks), ce qui a plus de 24 h ; la racine de `ai/tmp/` est à l'utilisateur et n'est jamais purgée ; `npm run ai:tmp -- --tout` vide le dossier sans attendre. Retirer : ôter l'appel de `hook.mts` et mettre ce rituel à jour
- **Sélection :** retenu le 2026-11-18 : éprouvé sur Resonhance
- **Statut :** provisoire

### R-7

- **Déclencheur :** Après toute modification d'un script de `ai/scripts/`, par Claude
- **Commandes :** `npm run lint:ai` (types des scripts, par `ai/scripts/tsconfig.json`), puis `cd /D/<chemin du projet> && npm test` — aucune erreur de types ; les tests des scripts (`ai/scripts/*.test.mts`) passent tous ; un comportement nouveau arrive avec son test. Lettre de lecteur en majuscule : depuis `/d/…`, Vitest se charge deux fois et échoue (« Cannot read properties of undefined (reading 'config') »), vérifié le 2026-11-18
- **Sélection :** retenu le 2026-11-18 : éprouvé sur Resonhance
- **Statut :** provisoire

### R-8

- **Déclencheur :** Automatique : avant chaque appel d'outil de Claude
- **Commandes :** `ai/scripts/hook.mts`, événement `PreToolUse`, par `ai/scripts/usage.mts` (testé par `ai/scripts/usage.test.mts`) : tient le registre d'usage `ai/claude/usage.json`, fichiers de `ai/` lus et écrits, scripts lancés, rappels et blocages, avec un compte et une date ; jamais le texte d'une commande ni le contenu d'un fichier. Il nourrit la sélection de R-1. Retirer : ôter l'appel de `hook.mts`, puis supprimer le registre
- **Sélection :** essai jusqu'au 2026-12-11 ; mesure : candidats à l'extinction qu'il départage, sans faux vivant ni faux mort relevé par l'utilisateur
- **Statut :** provisoire

### R-9

- **Déclencheur :** Automatique : avant chaque appel d'outil de Claude, seulement quand l'appel touche une règle
- **Commandes :** `ai/scripts/hook.mts`, événement `PreToolUse`, par `ai/scripts/reminders.mts` (testé par `ai/scripts/reminders.test.mts`) : un rappel en contexte, sans bloquer, une fois par session et par sujet. Sas, quand naît un O, D, F ou Q absent du mini-hub ; autorité des sources, à la première recherche sur le web ou au premier lot de sources ; sourcer, quand Claude écrit un objectif, une décision, une fonctionnalité ou le mini-hub sans avoir cherché sur le web de la session ; économie, à la lecture d'une image, d'un fichier lourd ou d'un outil déclaré lourd (R-10) ; corbeille, avant de supprimer ou de déplacer dans `ai/`. Retirer un rappel : l'ôter de `reminders.mts`
- **Sélection :** essai jusqu'au 2026-12-11 ; mesure : rappels donnés (`reminders:*`) suivis d'effet, aucun jugé hors de propos par l'utilisateur
- **Statut :** provisoire

### R-10

- **Déclencheur :** Avant de lire un contenu long (page, réponse d'API, log, PDF) ou de comparer deux versions d'un document, par Claude ; automatique : avant chaque `Read`
- **Commandes :** `npm run peek -- <fichier> [--path a.0.b] [--around mot] [--diff autre] [--head n]` (`ai/scripts/peek.mts`, testé par `ai/scripts/peek.test.mts`) : forme et tailles, extraits autour d'un mot, lignes changées ; une sortie volumineuse se redirige d'abord vers `ai/tmp/claude/`. `ai/scripts/hook.mts`, événement `PreToolUse`, par `ai/scripts/economy.mts` (testé par `ai/scripts/economy.test.mts`) : refuse la lecture entière d'un fichier de plus de 60 Ko, hors image ; les outils du projet qui ramènent une page entière se déclarent dans `HEAVY_TOOLS`. Retirer : ôter l'appel de `oversizedRead` dans `hook.mts`, le script `peek` de `package.json`, et mettre ce rituel à jour
- **Sélection :** essai jusqu'au 2026-12-24 ; mesure : refus (`economy:refus`) et rappels (`reminders:economie`) suivis d'une lecture réduite, aucun jugé bloquant à tort ; éprouvé sur resonhance-web-extension, règle de l'utilisateur du 2026-11-24 : « avant chaque process tu trouve la méthodologie la plus maligne efficace et rentable »
- **Statut :** provisoire
