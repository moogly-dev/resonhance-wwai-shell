# resonhance-wwai-shell

Un kit à poser dans un projet pour travailler avec Claude Code sans perdre le fil. Claude y tient la mémoire du projet (objectifs, décisions, fonctionnalités, sources), des contrôles automatiques la gardent cohérente, et ce qui ne sert plus est écarté.

## Il te faut

- [Claude Code](https://code.claude.com)
- Node 24.2 ou plus
- Sous Windows : Git Bash

## Nouveau projet

1. Connecté à GitHub, au-dessus de la liste des fichiers : **Use this template** → **Create a new repository**.
2. Clone ton nouveau dépôt comme n'importe quel autre.

Sans passer par GitHub, une seule ligne à coller, `mon-projet` remplacé par le nom de ton dossier :

```bash
git clone --depth 1 https://github.com/moogly-dev/resonhance-wwai-shell.git mon-projet && rm -rf mon-projet/.git
```

Puis ouvre le dossier dans ton éditeur, lance Claude Code, accepte la confiance du dossier, puis écris **on démarre** : Claude te guide pour tout le reste, une étape à la fois.

## Projet existant

Une seule ligne à coller, depuis le dossier de ton projet :

```bash
git clone --depth 1 https://github.com/moogly-dev/resonhance-wwai-shell.git ../wwai-shell && cp -rn ../wwai-shell/{CLAUDE.md,.claude,ai,.ignore,docs,gitignore.projet,vitest.config.mts} .
```

Lance Claude Code dans ton projet, accepte la confiance du dossier, puis écris **on démarre** : Claude fusionne ce que ton projet avait déjà et te guide pour le reste.

## Ce que ça change

- **Un départ cadré** : Claude te demande le problème, le but et la stack, puis s'y tient.
- **Une mémoire qui survit** : tout vit dans `ai/`, tu peux vider la conversation quand tu veux, Claude reprend le fil.
- **Des contrôles à chaque tour** : renvois cassés, éléments orphelins, contexte trop lourd.
- **Du tri** : ce que personne n'emploie depuis 14 jours est signalé pour être retiré.
- **Des garde-fous** : rien n'est écrit hors du projet, et les scripts de Claude n'ont accès ni au réseau, ni à tes secrets.

Optionnel : les réglages globaux de Claude Code recommandés sont dans [docs/claude-settings.md](docs/claude-settings.md).

## Faire évoluer le shell

`npm install`, puis `npm run lint:ai`, `npm test` et `npm run check:ai`. Les hooks de `.claude/settings.json` passent tous par `ai/scripts/hook.mts` ; tout script ou hook nouveau s'inscrit dans `ai/04-rituels.md`, sinon `check:ai` échoue.

## Licence

[MIT](LICENSE)
