# Démarrage

Parcours de Claude au premier usage du shell dans un projet, signalé par `npm run check:ai` tant que le Socle de `CLAUDE.md` garde des « à remplir ». Dans le dépôt du shell lui-même, il ne s'applique pas.

Claude mène : ni questionnaire, ni lecture imposée à l'utilisateur. Ce fichier se retire seul, au début de session qui suit le démarrage achevé (Socle sans « à remplir », un objectif posé, `gitignore.projet` traité), copie gardée dans `ai/bin/`.

1. **Une seule question** : « Quel est ton projet ? » Rien d'autre avant sa réponse.
2. **Sourcer aussitôt, dans le même tour** : à partir de la réponse, chercher sur le web la plus haute autorité de chaque point en jeu (documentation officielle des cadres, API et plateformes visées dans leur version actuelle, normes, textes de loi dès qu'il y a des données personnelles), les solutions existantes du domaine, et comparer les stacks possibles sur ces sources. Ce qui fonde une proposition se garde en S-n par `npm run ai:apply`. Aucune stack ni aucun objectif proposé sans ces sources.
3. **Proposer d'un bloc** : le Socle rempli sous la forme avant -> après (les mots de l'utilisateur pour ce qu'il a dit ; le reste marqué comme proposition de Claude, avec sa source ; « on verra » là où rien n'est tranché), une stack recommandée et une ou deux alternatives, le premier objectif avec sa mesure. Ensuite, itérer naturellement sur ses réponses ; une question seulement quand un choix lui revient.
4. **Le mini-hub, dit au premier passage**, en une phrase : « `ai/mini-hub.md` est la salle d'attente : j'y inscris ce que je propose de créer ou de retirer (objectif, décision, fonctionnalité, question), et rien n'est appliqué sans ton accord. » Le premier objectif y entre, puis va dans `ai/00-objectifs.md` une fois validé.
5. **Installer en coulisse**, une fois la stack validée ; ce que l'utilisateur doit lancer (git, suppression, installation, sauf s'il confie git à Claude) lui est donné en un seul bloc :
   - projet neuf (« Use this template », ou clone sans `.git`) ou existant (son code, son `.git`, le shell cloné en `../wwai-shell`) ; un `.git` dont l'origine est le dépôt du shell se retire, celui d'un projet existant ne se touche jamais ;
   - neuf : `mv gitignore.projet .gitignore` ; existant : ses lignes « AI » ajoutées au `.gitignore`, puis `gitignore.projet` retiré ; déjà suivis (template), `git rm -r --cached CLAUDE.md ai .claude .ignore` ;
   - existant : `CLAUDE.md`, `.claude/settings.json` et `vitest.config.mts` fusionnés depuis `../wwai-shell` ; `package.json` reçoit les scripts `check:ai`, `ai:bin`, `ai:apply`, `ai:tmp`, `lint:ai`, `peek`, les devDependencies `vitest`, `typescript` et `@types/node`, et son test lance aussi `ai/scripts/` ; puis `rm -rf ../wwai-shell` ;
   - nom du projet dans `package.json`, outil de création de la stack, `npm install`, `npm run check:ai`, `npm test` (sous Windows, depuis `/D/…`, lettre de lecteur en majuscule) ;
   - `CODE_DIRS` de `ai/scripts/check-ai.mts` et la section build du `.gitignore` selon la stack ;
   - projet neuf : README de l'application à la place de celui du shell ; `LICENSE` et `docs/claude-settings.md` gardés ou retirés selon l'utilisateur, la convention de commits de `docs/` reste ;
   - `git init` s'il n'y a pas de `.git`, premier commit sans attribution, dépôt distant si l'utilisateur en veut un ;
   - en une ligne, les réglages globaux recommandés de `docs/claude-settings.md`, à prendre ou non.
6. **Retours** : chaque friction de ce démarrage va dans `ai/improvements.md`.
