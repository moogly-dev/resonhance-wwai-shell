# Workflow IA

## Toujours chargé

@ai/session.md
@ai/mini-hub.md
@ai/improvements.md

- Rien ne porte la mention de Claude ni d'Anthropic (pas de ligne « Co-Authored-By », pas de signature).
- Tu ne modifies jamais CLAUDE.md : toute règle ou correction est retournée en conversation, sous la forme avant -> après, et l'utilisateur l'applique.
- Aucune valeur secrète (mot de passe, token, URL de connexion) n'est inscrite : seulement le nom de la variable.
- Rien dans AppData ni hors du projet : le jetable de Claude va dans `ai/tmp/claude/` (purgé après 24 h, la racine de `ai/tmp/` est à l'utilisateur), un traitement récurrent devient un script de `ai/scripts/` ; la mémoire de Claude est `ai/`, jamais la mémoire automatique hors du projet.
- Un fichier d'une implémentation de CLAUDE et non de l'application hors `ai/` se signale pour exclusion du `.gitignore`.
- Les documents de `context/` sont des prémices non officielles, à consulter sur demande seulement.

## Artefacts `ai/`

Ordre de décision : conversation et `## Socle` → `ai/00-objectifs.md` (O, la vision du projet) → `ai/01-decisions.md` (D) → `ai/features/` (F).

| Artefact                  | Id              | Il répond à                                                              |
| ------------------------- | --------------- | ------------------------------------------------------------------------ |
| `ai/00-objectifs.md`      | O-n             | Que doit atteindre le projet, et comment le mesurer ?                    |
| `ai/01-decisions.md`      | D-n             | Quel choix engage plusieurs features, et qu'est-ce qu'il change ?        |
| `ai/02-glossary.md`       | G-n             | Que veut dire ce mot ici ?                                               |
| `ai/03-texts.md`          | T-n             | Quel texte attend d'entrer dans le code ?                                |
| `ai/04-rituels.md`        | R-n             | Quelle commande ou quel rappel, à quel déclencheur ?                     |
| `ai/05-code-guideline.md` | P-n, U-n, C-n   | Comment écrire le code et l'interface ?                                  |
| `ai/features/`            | F-n, R<m>, A<m> | Que fait cette fonctionnalité, est-elle du projet, comment la vérifier ? |
| `ai/issues/`              | Q-n             | Qu'est-ce qui reste à trancher ?                                         |
| `ai/sources/`             | S-n             | Que sait-on, et d'où cela vient-il ?                                     |
| `ai/claude/sources/`      | M-n             | Que sait Claude de ses outils et de sa méthode, et d'où ?                |

- Chaque dossier de fiches s'ouvre par son `INDEX.md` : le lire d'abord, puis seulement la fiche visée.
- `actif` = en production, rien d'autre ; le reste est `provisoire` et ne revient à l'utilisateur que s'il ouvre le sujet.
- Sas : toute création, suppression ou déclassement d'un O, D, F ou Q s'inscrit d'abord dans `ai/mini-hub.md` (ENTRÉE ou SORTIE, avec sa raison) et n'est appliqué qu'une fois validé par l'utilisateur. Sources, recherches et corrections de renvois passent directement.
- Les mots de l'utilisateur vont dans l'élément qu'ils fondent : énoncé d'un objectif, raison d'une décision, énoncé d'une question.
- Une décision engage un choix et dit ce qu'il change ; jamais la redite d'un objectif.
- Un changement de ligne se traduit par le `scope` des fiches (`projet` | `secondaire`), jamais par une décision qui déclasse.
- Sélection : avant de créer, chercher l'élément qui porte déjà l'information. Ce que Claude crée entre à l'essai et ne reste que par l'usage mesuré (`ai/claude/usage.json`) ; ce qu'aucun élément vivant n'atteint et que personne n'emploie depuis le seuil de `npm run check:ai` sort, sources et outillage par Claude, O, D, F et Q par le sas.
- Sources : avant de proposer une stack, un objectif, une décision ou une fonctionnalité, Claude cherche aussitôt sur le web la plus haute autorité du domaine (rangs de ai/sources/INDEX.md) et la cite ;un rang 3 n'est qu'une piste, à remonter jusqu'à sa source primaire, et ne fonde seul aucune décision. Ce qui ne sert que Claude va dans `ai/claude/sources/`, que rien du projet ne cite.
- Renvois : identifiant complet (`F-n R<m>`) ou chemin, jamais un numéro de fichier seul. Un élément cite ce qui le fonde, jamais ce qui dépend de lui ; une question et ses éléments se citent mutuellement ; une source ne cite aucun élément du projet. Un fichier de code ne cite un élément non actif que s'il commence par `// PROVISOIRE (F-n R<m>)`.
- Formats : modèles `ai/modeles/feature.md`, `ai/modeles/question.md`, `ai/modeles/source.md` ; chaque fichier numéroté donne le sien en tête. Une question adressée est supprimée après avoir étayé ses éléments.
- `npm run check:ai` vérifie formats, renvois, index, sources et sélection : il doit finir sans erreur avant de présenter.
- ai/ est hors de git : npm run ai:bin -- <sujet> [chemins] avant de supprimer ou de modifier plusieurs fichiers ; un lot passe par npm run ai:apply, qui retire le lot de ai/tmp/ une fois appliqué. ai/bin/ garde seul ses 10 copies les plus récentes : un filet, pas une archive.
- `ai/session.md` porte la tâche en cours dans les mots de l'utilisateur : étapes validées (10 au plus), point en cours, points en attente, doutes, et le ton de l'échange (humeur, posture, forme attendue). Une ligne par élément, remplacée ; relu après tout résumé, vidé à la fin de la tâche.
- `ai/improvements.md` : ce que Claude remarque et que seul l'utilisateur peut appliquer pour le rendre plus efficace (règle de CLAUDE.md, rangement de fichiers, outillage, tokens dépensés sans besoin) ; en NÉGATIF le problème et sa solution, en POSITIF l'amélioration. Claude l'inscrit sans en parler ; ce qu'il peut appliquer lui-même, il l'applique et ne l'inscrit pas. À trois items, le dire en une phrase, au moment qui s'y prête.
- `ai/mini-hub.md` : à dix items, le dire de même. Retirer les obsolètes.

## Socle

- **le problème :** <à remplir : ce qui ne va pas aujourd'hui, et pour qui>
- **la solution recherchée :** <à remplir : ce que le projet apporte, et à qui>
- **le but :** <à remplir : ce qui sera vrai une fois le projet réussi>

**les problématiques :**

1. <à remplir : une problématique par ligne>

- <à remplir : nom du projet> : <à remplir : nature, public, accès, langues>.
- Stack : <à remplir : cadre, langage, style, version de Node> ; versions exactes : `package.json`.
- Données : <à remplir : base, client, migrations ; seulement les noms des variables d'environnement>.
- Textes : <à remplir : outil de traduction et dossier des langues> ; tests : Vitest (les scripts de `ai/scripts/` compris) ; lint : <à remplir>.
- Git et mise en ligne : branches `feat/<nom>` créées depuis <à remplir : branche d'intégration> ; <à remplir : ce que déclenche un push sur chaque branche>.
- Commits : en une ligne, `type(portée): résumé` ; un gros changement peut demander un message sur plusieurs lignes, selon `docs/git-commit-message-convention-cheat-sheet.md`.
- Ordre de développement : les fiches en `Périmètre : projet` de `ai/features/INDEX.md`, <à remplir : le socle d'abord, puis l'ordre des branches>.
- Sauvegarde : <à remplir : où et à quel rythme le projet entier est sauvegardé, `ai/`, `CLAUDE.md` et `.claude/` compris, puisqu'ils sont hors de git>.

## Code

- Lire, respecter et améliorer `ai/05-code-guideline.md`.
- Reproduire à l'identique tout texte de `ai/03-texts.md` ; une fois dans le code, le retirer de l'artefact.
- Citer `F-n R<m>` dans le code et `F-n A<m>` dans le nom des tests.

## Réponses et autonomie

- Tu tranches seul tout le codage, arbitrages d'interface compris, et l'outillage (scripts, contrôles, hooks par `ai/scripts/hook.mts`, rangement des artefacts), selon la guideline, résumés en une ligne. Tu l'améliores sans attendre qu'on le demande, derrière la barrière de `npm run check:ai` (ni réseau, ni processus lancé, ni `.env`, ni dossier personnel) ; l'utilisateur garde le dernier mot. Reviennent à l'utilisateur : la direction du projet (produit, fonctionnalités, ce que reçoivent les utilisateurs), la sécurité et les données personnelles, le droit, le sens d'une règle ou d'une décision, CLAUDE.md, et tout ce qui est irréversible, dangereux, cassant ou public.
- Lire la personne avant d'appliquer un format : longueur, ton et forme suivent son message et son humeur du moment. Un message bref appelle une réponse concise, jamais un ton relâché : la rédaction reste soignée et rigoureuse, quelle que soit la forme du message ; une réflexion ouverte appelle un échange, l'agacement appelle de reconnaître et de corriger sans se justifier ; un changement de posture (de l'exploration à l'exécution, de la confiance au doute) se reconnaît et l'on s'y ajuste. Interpréter l'intention plutôt que la lettre ; au doute, une seule question, posée simplement. Prose d'abord ; listes, titres et tableaux quand le contenu en a la forme.
- Une décision qui revient à l'utilisateur : le problème, 2 à 4 options dont une recommandée, puis l'attente ; le reste se mène sans demander. Ni récapitulatif ni formule par réflexe ; la prochaine étape quand il y en a une.
- Commandes pour Git Bash. Les commandes git sont affichées, jamais lancées. Toute commande que l'utilisateur exécute ou valide s'inscrit dans `ai/04-rituels.md` et revient à son déclencheur.
- Pérenniser, c'est faire porter une règle par un contrôle automatique quand c'est possible ; hooks et scripts s'inscrivent dans `ai/04-rituels.md`.

## Lecture de fichiers

- Trouver : `Glob` (ex. `**/INDEX.md`) ; chercher : `Grep` (`-i`, `-n`, `-A`, `head_limit`) ; lire un extrait : `Read` avec `offset` et `limit`.
- Bash seulement pour les scripts et commandes du projet (lint, tsc, vitest, build…), jamais pour lire ou chercher : ni variables (`f=...`), ni substitutions `$(...)`, ni chaînes `;` ou `|`.
