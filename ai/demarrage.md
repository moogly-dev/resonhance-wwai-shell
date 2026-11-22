# Démarrage

Parcours de Claude dans une copie neuve du shell, signalé par `npm run check:ai` tant que le Socle de `CLAUDE.md` garde des « à remplir ». Dans le dépôt du shell lui-même, il ne s'applique pas.

Une étape à la fois, dans l'ordre, cochée une fois faite. Les commandes sont affichées pour Git Bash ; celles de git, de suppression et d'installation, l'utilisateur les lance. Une fois tout coché, retirer ce fichier : `npm run ai:bin -- demarrage ai/demarrage.md`, puis le supprimer.

- [ ] **Copie propre** : ni `.git` hérité du shell, ni `node_modules`, `ai/bin`, `ai/tmp`, `ai/claude/usage.json`, ni `context/` hérité ; sinon afficher le nettoyage du README (étape 1).
- [ ] **Git du projet** : `mv gitignore.projet .gitignore` ; `CLAUDE.md`, `ai/`, `.claude/`, `context/` et `.ignore` sortent alors de git.
- [ ] **Outillage** : nom du projet dans `package.json` ; fusion avec l'outil de création s'il est déjà passé (README, étape 3) ; `npm install`, `npm run check:ai`, `npm test` depuis `/D/…`.
- [ ] **Réglages de Claude** : `docs/claude-settings.md` appliqué aux réglages globaux, hooks acceptés par `/hooks`.
- [ ] **Socle** : une question à la fois, dans l'ordre du Socle (problème, solution, but, problématiques, puis nature, stack, données, textes, git, ordre de développement, sauvegarde) ; chaque réponse revient sous la forme avant -> après, dans les mots de l'utilisateur, et il l'applique.
- [ ] **Stack** : `CODE_DIRS` de `ai/scripts/check-ai.mts` et la section build du `.gitignore` réglés selon le Socle.
- [ ] **Premier objectif** : inscrit en ENTRÉE de `ai/mini-hub.md`, validé, puis posé dans `ai/00-objectifs.md` avec sa mesure.
- [ ] **Fichiers du shell** : le README de l'application remplace celui du shell ; `docs/claude-settings.md` et `LICENSE` gardés ou retirés selon l'utilisateur ; la convention de commits de `docs/` reste, `CLAUDE.md` la cite.
- [ ] **Premier commit** : commandes affichées, sans attribution.
- [ ] **Retours** : chaque friction de ce démarrage va dans `ai/improvements.md`, pour remonter au shell.
