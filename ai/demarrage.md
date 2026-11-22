# Démarrage

Parcours de Claude au premier usage du shell dans un projet, signalé par `npm run check:ai` tant que le Socle de `CLAUDE.md` garde des « à remplir ». Dans le dépôt du shell lui-même, il ne s'applique pas.

Claude mène : l'utilisateur n'a rien à lire. Une étape à la fois, dite en une phrase, cochée une fois faite. Les commandes sont données pour bash (Git Bash sous Windows) ; git, suppression et installation, l'utilisateur les lance, sauf s'il demande à Claude de le faire. Une fois tout coché : `npm run ai:bin -- demarrage ai/demarrage.md`, puis supprimer ce fichier.

- [ ] **Cas** : projet neuf (cloné du shell) ou projet existant (son code, son `.git`, le shell cloné à côté en `../wwai-shell`). Un `.git` dont l'origine est le dépôt du shell se retire (`rm -rf .git`) ; le `.git` d'un projet existant ne se touche jamais.
- [ ] **Git du projet** : projet neuf, `mv gitignore.projet .gitignore` ; projet existant, ajouter les lignes « AI » de `gitignore.projet` à son `.gitignore`, puis retirer `gitignore.projet`. `CLAUDE.md`, `ai/`, `.claude/`, `context/` et `.ignore` sortent ainsi de git.
- [ ] **Fusion (projet existant)** : ce que la copie a sauté parce qu'il existait déjà (`CLAUDE.md`, `.claude/settings.json`, `vitest.config.mts`) se fusionne depuis `../wwai-shell` ; `package.json` reçoit les scripts `check:ai`, `ai:bin`, `ai:apply`, `ai:tmp` et les devDependencies `vitest` et `@types/node` aux versions du shell, et son script de test lance aussi `ai/scripts/`. Puis `rm -rf ../wwai-shell`.
- [ ] **Outillage** : nom du projet dans `package.json` (projet neuf) ; `npm install`, `npm run check:ai`, `npm test` ; sous Windows, `npm test` depuis `/D/…`, lettre de lecteur en majuscule, sinon Vitest échoue.
- [ ] **Réglages de Claude** : proposer, sans l'imposer, les réglages globaux de `docs/claude-settings.md` : ce qu'ils changent en trois lignes, et le bloc à coller.
- [ ] **Socle** : une question à la fois, dans l'ordre du Socle (problème, solution, but, problématiques, puis nature, stack, données, textes, git, ordre de développement, sauvegarde) ; chaque réponse revient sous la forme avant -> après, dans les mots de l'utilisateur, et il l'applique.
- [ ] **Stack** : `CODE_DIRS` de `ai/scripts/check-ai.mts` et la section build du `.gitignore` réglés selon le Socle.
- [ ] **Premier objectif** : inscrit en ENTRÉE de `ai/mini-hub.md`, validé, puis posé dans `ai/00-objectifs.md` avec sa mesure.
- [ ] **Fichiers du shell (projet neuf)** : le README de l'application remplace celui du shell ; `LICENSE` et `docs/claude-settings.md` gardés ou retirés selon l'utilisateur ; la convention de commits de `docs/` reste, `CLAUDE.md` la cite.
- [ ] **Premier commit** : `git init` pour un projet neuf, puis le commit, sans attribution ; le dépôt distant, si l'utilisateur en veut un.
- [ ] **Retours** : chaque friction de ce démarrage va dans `ai/improvements.md`.
