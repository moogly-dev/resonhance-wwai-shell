# 05 — Code guideline

Révision : 2026-11-18

Format d'une règle : titre `### P-n — titre` (principe), `### U-n — titre` (règle d'usage) ou `### C-n — titre` (convention), puis Énoncé, S'appuie sur, Sert, Porte sur, Statut (provisoire | actif), Origine (facultatif : la règle de l'utilisateur, datée, dans ses mots).

## 1. Principes

Exigences communes au code et à toute l'interface, quels que soient le langage et le cadre du Socle.

### P-1 — Code minimal et chirurgical

- **Énoncé :** Chaque ligne posée est indispensable à la demande : ni option ni cas non demandés, ni code mort, commenté ou inutilisé ; un fichier par rôle (C-3) ; conventions de ce fichier et style du code voisin. Une balise de gabarit et une classe de style comptent comme des lignes de code : chaque élément enveloppant porte une sémantique ou une mise en page que son parent ne porte pas déjà, chaque classe a un effet visible. Avant de présenter, chaque ligne, balise et classe passe la question : que perd-on si on la retire ?
- **S'appuie sur :** C-3
- **Sert :** —
- **Porte sur :** tout le code
- **Statut :** provisoire
### P-2 — Natif d'abord

- **Énoncé :** L'élément natif avant tout ajout : la bonne balise HTML avant un attribut ARIA, l'API du langage, du navigateur ou du système et les fonctions du cadre du Socle avant toute bibliothèque ; une API native récente avec un repli par détection de fonctionnalité plutôt qu'une dépendance ; aucune dépendance nouvelle sans décision.
- **S'appuie sur :** —
- **Sert :** —
- **Porte sur :** tout le code
- **Statut :** provisoire

### P-3 — Couches

- **Énoncé :** Une couche ne s'appuie que sur celles du dessous (données, logique, interface) ; aucune valeur de présentation (couleur, taille, espacement, durée) écrite en dur hors de la base commune qui la nomme (jetons, thème, configuration).
- **S'appuie sur :** —
- **Sert :** —
- **Porte sur :** tout le code
- **Statut :** provisoire

### P-4 — Accessibilité

- **Énoncé :** Toute interface est utilisable au clavier et au lecteur d'écran, avec des contrastes suffisants dans chaque thème ; mouvements réduits quand le système le demande ; WCAG 2.2 niveau AA au minimum ; clavier et ARIA des composants selon le guide WAI-ARIA Authoring Practices ; libellés, textes alternatifs, ordre des titres, langue déclarée.
- **S'appuie sur :** P-2
- **Sert :** —
- **Porte sur :** toute interface
- **Statut :** provisoire

### P-5 — Vérification avant de présenter, au moindre coût

- **Énoncé :** Avant de présenter, Claude passe les contrôles du Socle sur ce qui change : types, lint et tests des fichiers touchés ; build de production avant toute livraison d'interface et dès que la configuration change ; la suite complète avant une livraison. Contrôles groupés : une seule passe en fin de bloc, jamais après chaque modification. Ce qui se voit à l'écran, l'utilisateur le vérifie de ses yeux : Claude dit quoi regarder, sans script de mesure ni capture ; un script de navigateur seulement pour ce que l'œil ne voit pas (focus, navigation, valeur calculée) ou à la demande. Un échec se mesure avant d'être expliqué ; au deuxième échec sur un même point, Claude change de méthode pour la plus simple qui réponde à la demande.
- **S'appuie sur :** —
- **Sert :** —
- **Porte sur :** tout le code
- **Statut :** provisoire
### P-6 — Données personnelles et secrets

- **Énoncé :** Aucune donnée personnelle (adresse IP, identifiant, contenu saisi) écrite, journalisée ou envoyée à un tiers sans décision ; une erreur se journalise par son code, à défaut par son message, jamais avec la requête ni une valeur saisie ; une donnée périmée ou révoquée (lien à usage unique, session, compteur d'essais) est supprimée au plus tard à l'écriture suivante ; un secret se lit à l'exécution par le nom de sa variable, jamais écrit dans le code ni dans `ai/`.
- **S'appuie sur :** —
- **Sert :** —
- **Porte sur :** tout le code
- **Statut :** provisoire

### P-7 — Une règle de saisie, écrite une fois

- **Énoncé :** Une règle de saisie s'écrit une seule fois, dans un module partagé par le client et le serveur ; à l'envoi, le serveur refait tout et fait autorité, car deux copies finissent par diverger.
- **S'appuie sur :** —
- **Sert :** —
- **Porte sur :** saisies
- **Statut :** provisoire

### P-8 — Plan de fichiers validé, bases communes

- **Énoncé :** Avant de coder une demande d'interface ou d'architecture, Claude présente son plan d'organisation des fichiers et attend la validation de l'utilisateur. Le plan suit le DRY, du plus général au plus particulier (pour l'interface : mise en page, rubrique, carte, titre, texte, puis fonds, couleurs, espacements ; pour la logique : domaine, module, fonction) : à chaque étape, une base commune existe-t-elle ? oui, on l'emploie ; non, on la crée ; deux variantes possibles d'une même base, on interpelle l'utilisateur. Le DRY tient compte de tout le reste (lisibilité, accessibilité, convention), d'où un traitement élément par élément.
- **S'appuie sur :** P-3 · C-3
- **Sert :** —
- **Porte sur :** tout le code
- **Statut :** provisoire
### P-9 — Construire pièce par pièce

- **Énoncé :** 1. Décomposer : chaque besoin à part ; pour une interaction ou un processus, ses états et ce qui les possède sont écrits avant le code. 2. Analyser l'existant : ce qui porte déjà un besoin est repris, ce qui le porte au milieu d'autre chose en est extrait (C-3) ; un parcours de vérification est relevé sur l'existant avant d'y toucher. 3. Sourcer : chaque ligne s'appuie sur la documentation officielle de la version employée, lue avant d'écrire et non résumée (cadre du Socle, puis langage, puis normes W3C, WHATWG, IETF ou ISO, puis guides des éditeurs) ; l'exemple officiel le plus proche est appliqué à la lettre ; un point non documenté est signalé comme tel. 4. Créer une pièce à la fois, chacune dans son fichier, de la feuille vers la racine, au plus petit qui fonctionne, et la tester seule avant la suivante (test nommé `F-n A<m>`) ; aucun autre chantier tant qu'elle n'est pas vérifiée. 5. Assembler et vérifier sur tous les parcours (P-5) ; au deuxième échec, repartir de l'exemple officiel au lieu de rapiécer. 6. Le tout en un seul tour, une fois le plan validé (P-8) ; livrer les fichiers, puis un tableau court pièce, test, source.
- **S'appuie sur :** P-1 · P-2 · P-5 · P-8
- **Sert :** —
- **Porte sur :** tout le code
- **Statut :** provisoire
## 2. Règles d'usage

Quand employer quel composant ou quel jeton, propres au projet. S'ajoutent au fil des arbitrages.

## 3. Conventions

Rangement, nommage, langue du code, commentaires.

### C-1 — Rangement par module et par rôle

- **Énoncé :** Ce qui ne sert qu'à un module (route, écran, domaine) vit dans son dossier ; ce qui est partagé, dans un dossier commun rangé par rôle (composants, effets, logique, données), selon la structure que recommande le cadre du Socle. Un élément est extrait et rangé selon son rôle, jamais selon son nombre d'usages ; cette extraction n'est pas une abstraction au sens de P-1.
- **S'appuie sur :** —
- **Sert :** —
- **Porte sur :** arborescence
- **Statut :** provisoire

### C-2 — Nommage

- **Énoncé :** Casse et forme des noms selon la convention officielle du langage et du cadre (en JavaScript : composants en `PascalCase`, un par fichier ; autres modules en camelCase ; hooks React en `use…`) ; dossiers, scripts et migrations en minuscules avec `-` ; tests à côté du code. Un nom vient, dans l'ordre, de la documentation officielle, de l'élément natif (balise, attribut, API), puis de nos choix débattus en conversation ; un nom nouveau se justifie.
- **S'appuie sur :** P-2
- **Sert :** —
- **Porte sur :** tout le code
- **Statut :** provisoire

### C-3 — Un fichier, un rôle

- **Énoncé :** Chaque fonction (état, navigation, effet, mesure, accès aux données) et chaque composant a son fichier dès son premier emploi, nommé par ce qu'il fait ; un composant assemble ses fonctions et rend son interface, il ne calcule pas ; une fonction sans interface va dans la logique de son domaine (C-1).
- **S'appuie sur :** C-1
- **Sert :** —
- **Porte sur :** tout le code
- **Statut :** provisoire
### C-4 — Langue du code et des textes

- **Énoncé :** Tout le code en anglais (fichiers, dossiers, identifiants, clés de texte, commits) ; commentaires en français. Clés de texte en camelCase, l'espace de noms en premier segment ; les fichiers de traduction ne portent que les libellés de l'interface, jamais un contenu venu des données ou d'une source.
- **S'appuie sur :** —
- **Sert :** —
- **Porte sur :** tout le code · traductions
- **Statut :** provisoire

### C-5 — Commentaires

- **Énoncé :** Pas de code commenté laissé en place. Un commentaire, rare et court, dit pourquoi quand le code ne peut pas le dire (contrainte extérieure, piège mesuré), jamais ce que fait le code : s'il en a besoin, le code est mal nommé ou mal organisé, on le renomme ou on le réorganise. Dans un composant d'interface, seuls les titres qui séparent ses sections, les repères `// F-n R<m>`, le marqueur `// PROVISOIRE (F-n R<m>)` et les directives d'outils.
- **S'appuie sur :** P-1
- **Sert :** —
- **Porte sur :** tout le code
- **Statut :** provisoire
### C-6 — Réglages nommés, en un seul endroit

- **Énoncé :** Tout réglage d'une fonction ou d'un effet (durée, délai, seuil, limite, intensité) est nommé et posé à un seul endroit : en constante en capitales en tête du fichier qui seul le lit, dans la base commune (jetons, configuration) quand plusieurs fichiers le lisent. Une fonction se comprend par sa seule organisation : noms clairs, réglages en tête, type des paramètres nommé, fonction courte.
- **S'appuie sur :** P-3
- **Sert :** —
- **Porte sur :** tout le code
- **Statut :** provisoire
### C-7 — Données par une seule porte

- **Énoncé :** Les données s'obtiennent par une couche d'accès dédiée, côté serveur seulement. Tant que la base n'est pas branchée, elles viennent d'un fichier rangé comme des lignes de base et lu par un vrai appel asynchrone : un code qui traitera demain des données imite dès aujourd'hui le chemin réel au plus près.
- **S'appuie sur :** P-3
- **Sert :** —
- **Porte sur :** accès aux données
- **Statut :** provisoire
### C-8 — Le style se choisit chez l'appelant

- **Énoncé :** Une variante de disposition ou de style se choisit chez l'appelant, qui importe et assemble les styles exportés ; jamais un paramètre qui fait choisir son style au composant appelé (`variant`, `layout`, une classe passée en argument) : un composant commun ne porte que ce qui ne varie pas. Une propriété de style n'a qu'un auteur par élément.
- **S'appuie sur :** C-3
- **Sert :** —
- **Porte sur :** composants d'interface
- **Statut :** provisoire