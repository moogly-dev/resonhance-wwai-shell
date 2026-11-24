# Démarrage

Parcours de Claude au premier usage du shell dans un projet, signalé par `npm run check:ai` tant que ce fichier existe. Dans le dépôt du shell lui-même, il ne s'applique pas.

Claude mène : ni questionnaire, ni lecture imposée à l'utilisateur. Ce fichier se retire seul, au début de session qui suit le démarrage achevé (Socle sans « à remplir », un objectif posé, `gitignore.projet` traité, `ai/fusion/` vidé), copie gardée dans `ai/bin/`.

1. **Une seule question** : « Quel est ton projet ? » Dans un projet existant, lire d'abord son README, son `package.json` et son arborescence, et ne demander que ce qu'ils ne disent pas.
2. **Sourcer aussitôt, dans le même tour** : chercher sur le web la plus haute autorité de chaque point en jeu (documentation officielle des cadres, API et plateformes visées dans leur version actuelle, normes, textes de loi dès qu'il y a des données personnelles), les solutions existantes du domaine, et comparer les stacks possibles sur ces sources. Ce qui fonde une proposition se garde en S-n par `npm run ai:apply`. Aucune stack ni aucun objectif proposé sans ces sources.
3. **Proposer d'un bloc** : le Socle rempli sous la forme avant -> après (les mots de l'utilisateur pour ce qu'il a dit ; le reste marqué comme proposition de Claude, avec sa source ; « on verra » là où rien n'est tranché), une stack recommandée et une ou deux alternatives (projet existant : sa stack, telle qu'elle est), le premier objectif avec sa mesure. Ensuite, itérer naturellement sur ses réponses ; une question seulement quand un choix lui revient.
4. **Rien d'écrit sans accord** : objectif, décision, fonctionnalité ou question se proposent dans la conversation et ne s'écrivent qu'une fois acceptés ; le premier objectif va dans `ai/00-objectifs.md` avec sa mesure.
5. **Installer en coulisse** ; ce que l'utilisateur doit lancer (git, suppression, installation, sauf s'il confie git à Claude) lui est donné en un seul bloc :
   - **projet neuf** (« Use this template », ou clone sans `.git`) : un `.git` dont l'origine est le dépôt du shell se retire ; `mv gitignore.projet .gitignore`, puis, si `CLAUDE.md`, `ai/` ou `.claude/` sont déjà suivis, `git rm -r --cached CLAUDE.md ai .claude .ignore` (fichiers gardés sur le disque) ; nom du projet dans `package.json` ; outil de création de la stack ; README de l'application à la place de celui du shell ; `LICENSE` et `docs/` gardés ou retirés selon l'utilisateur ;
   - **projet existant** (installé par `ai/scripts/install.mts`, qui n'a rien écrasé) : chaque fichier de `ai/fusion/` est la version du shell d'un fichier que le projet avait déjà ; Claude propose la fusion sous la forme avant -> après, l'utilisateur accepte, puis le fichier de `ai/fusion/` se retire. Pour `CLAUDE.md`, ajouter les règles du shell sans retirer celles de l'équipe. Jamais `git rm`, jamais de réécriture d'un fichier existant sans accord ;
   - `npm install`, `npm run check:ai`, `npm run test:ai` (sous Windows, depuis `/D/…`, lettre de lecteur en majuscule, sinon Vitest échoue) ;
   - `CODE_DIRS` de `ai/scripts/check-ai.mts` selon la stack ;
   - `git init` s'il n'y a pas de `.git`, puis un commit en anglais, sans attribution ; le dépôt distant si l'utilisateur en veut un et n'en a pas ;
   - en une ligne, les réglages globaux recommandés (`docs/claude-settings.md` du dépôt du shell), à prendre ou non.
6. **Retours** : chaque friction de ce démarrage va dans `ai/improvements.md`.
