# resonhance-wwai-shell

Squelette d'un projet vierge selon la méthode de travail avec Claude Code tirée de Resonhance. Les règles sont dans `CLAUDE.md`, la mémoire du projet dans `ai/`, et des contrôles automatiques sont branchés par les hooks de `.claude/settings.json`, qui passent tous par `ai/scripts/hook.mts`.

Ce que Claude crée (fiche, script, hook, rappel) entre à l'essai et ne reste que par l'usage mesuré : `ai/claude/usage.json` compte ce qui est lu, écrit et lancé, et `npm run check:ai` signale ce que rien n'atteint ni n'emploie depuis 14 jours, les essais échus et le dépassement du budget du contexte permanent.

## Prérequis

Node 24.2 ou plus, Git Bash, et les réglages globaux de Claude Code décrits dans [docs/claude-settings.md](docs/claude-settings.md), à poser une fois pour tous tes projets.

## Démarrer un projet

Dans Git Bash :

1. Récupérer le shell sans son historique ni ce qui naît à l'usage :
   ```bash
   git clone https://github.com/moogly-dev/resonhance-wwai-shell.git /d/dev/<projet>     # ou : cp -r /d/dev/resonhance-wwai-shell /d/dev/<projet>
   cd /d/dev/<projet> && rm -rf .git node_modules ai/bin ai/tmp ai/claude/usage.json ai/session.md ai/mini-hub.md ai/improvements.md
   ```
2. Ouvrir Claude Code dans le dossier et accepter la confiance du dossier (« trust ») à la première ouverture : sans elle, les autorisations de `.claude/settings.json` ne s'appliquent pas. Les hooks, eux, tournent dès l'ouverture, sans autre accord : lire `ai/scripts/hook.mts` avant pour savoir ce qu'ils font ; `/hooks` les affiche ensuite, en lecture seule. Au premier lancement, `ai/session.md`, `ai/mini-hub.md` et `ai/improvements.md` naissent vides, et `check:ai` renvoie Claude vers `ai/demarrage.md` : il te guide pas à pas, du `.gitignore` au premier commit, en passant par le Socle et le premier objectif.

À la main, ce parcours revient à :

- `mv gitignore.projet .gitignore` : `CLAUDE.md`, `ai/`, `.claude/`, `context/` et `.ignore` sortent de git et ne vivent plus que dans la sauvegarde indiquée au Socle ;
- si le projet a déjà été créé par son outil (create-next-app…), fusionner les `scripts` et `devDependencies` de `package.json`, ainsi que les exclusions de `vitest.config.mts` ;
- `npm install`, `npm run check:ai` (attendu : `0 erreur(s)`, et le signalement « à remplir » du Socle), puis `npm test` depuis `/D/…` : avec la lettre de lecteur en minuscule, Vitest échoue (`ai/04-rituels.md`, rituel des tests) ;
- remplir le Socle de `CLAUDE.md` (Claude propose chaque texte sous la forme avant -> après, tu l'appliques), puis poser le premier objectif en passant par `ai/mini-hub.md` ;
- remplacer ce README par celui de l'application.

## Contenu

| Chemin | Rôle |
| --- | --- |
| `CLAUDE.md` | Règles de travail ; charge en permanence `ai/session.md`, `ai/mini-hub.md` et `ai/improvements.md` ; `## Socle` à remplir |
| `.claude/settings.json` | Permissions, et trois hooks qui appellent tous `ai/scripts/hook.mts` : il ne change plus, Claude fait évoluer le reste |
| `ai/demarrage.md` | Parcours de Claude dans une copie neuve, retiré une fois achevé |
| `ai/00-…` à `ai/05-…` | Éléments O, D, G, T, R, P/U/C ; chaque fichier donne son format en tête ; `05` porte des règles de code génériques, tout langage |
| `ai/features/`, `ai/issues/`, `ai/sources/` | Fiches F, Q, S et leur `INDEX.md` ; l'échelle d'autorité des sources est dans `ai/sources/INDEX.md` |
| `ai/claude/` | Ce qui ne sert que Claude : ses sources (M-n), que rien du projet ne cite, et le registre d'usage `usage.json`, né à l'usage |
| `ai/modeles/` | Modèles de fiche F, Q et S (et M) |
| `ai/scripts/` | `hook` (aiguillage des hooks), `check-ai`, `usage`, `reminders`, `guard-paths`, `ai-bin`, `ai-apply`, `ai-tmp`, et leurs tests |
| `.ignore` | Rend `ai/` visible à Glob et Grep, même hors de git, sauf `ai/bin/` et `ai/tmp/` |
| `gitignore.projet` | Le `.gitignore` des projets créés |
| `context/` | Prémices non officielles, propres à chaque projet et hors de git |
| `docs/` | Guide des réglages globaux de Claude Code, convention des messages de commit |

## Faire évoluer le shell

Les scripts sont testés par `npm test`. Tout script ou hook nouveau s'inscrit dans `ai/04-rituels.md`, avec sa Sélection (essai jusqu'à une date, et sa mesure) : sinon `check:ai` échoue. Un traitement de hook nouveau s'ajoute dans `ai/scripts/hook.mts`, sans toucher à `.claude/settings.json`. Les scripts de Claude ne touchent ni au réseau, ni aux processus, ni au dossier personnel, ni aux `.env` : `check:ai` le refuse, seul l'utilisateur lève cette barrière. Les dossiers de code contrôlés se règlent par `CODE_DIRS`, les seuils de la sélection et le budget du contexte permanent par les constantes en tête de `ai/scripts/check-ai.mts`.

## Licence

[MIT](LICENSE)
