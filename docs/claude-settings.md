# configuration settings.json recommandée (base Windows, npm, TypeScript, Vitest)

> Localisé en `~/.claude/settings.json` soit `C:\Users\<toi>\.claude\settings.json` ;  
> Ce fichier setup les permissions globales de Claude pour l'ensemble de tes projets.

Chaque projet possède aussi ces propres permissions (managées automatiquement par Claude via _dialog_ en conversation) :

- `.claude/settings.json` pour les hooks et leur commande de run, et les permissions partagées du projet (versionné) ;
- `.claude/settings.local.json` pour tes permissions _deny_, _ask_ et _allow_ personnelles sur le projet (non versionné : Claude y note tes « toujours autoriser ») ;

> src : [code.claude.com/docs/en/settings](https://code.claude.com/docs/en/settings) ;  
> conseil : si leur site bug, **désactive le javascript** pour [https://code.claude.com](https://code.claude.com) dans les **paramètres** de ton **navigateur**.  
> les blocs ci-dessous sont des extraits à fusionner dans ton fichier, pas à copier tels quels : les `// ...` ne sont pas du JSON valide.

---

Claude est, de base, autorisé à exécuter ces commandes de lecture seule : `ls`, `cat`, `echo`, `pwd`, `head`, `tail`, `grep`, `find`, `wc`, `which`, `diff`, `stat`, `du`, `cd` et les formes en lecture seule de `git`

> src : [code.claude.com/docs/fr/permissions#read-only-commands](https://code.claude.com/docs/fr/permissions#read-only-commands)

## Permission mode

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "defaultMode": "acceptEdits",
    "disableBypassPermissionsMode": "disable",
    "disableAutoMode": "disable"

    // ...
  }
}
```

- `acceptEdits` : Claude modifie et crée des fichiers, et fait `mkdir`, `touch`, `mv`, `cp`, sans te demander à chaque fois. Hors de ton projet, il demande toujours ;
- `disableBypassPermissionsMode` : interdit le mode « bypass », celui qui coupe toutes les confirmations (même --dangerously-skip-permissions) ;
- `disableAutoMode` : interdit le « mode auto », où un second modèle (un classifieur) vérifie chaque action à ta place et laisse passer ce qui lui semble correct, sans te demander ;

> src : [code.claude.com/docs/en/permission-modes](https://code.claude.com/docs/en/permission-modes)

## _deny_ - _interdit à Claude_

```json
{
  // ...
  "permissions": {
    // ...

    "deny": [
      "Read(//**/.env*)",
      "Edit(//**/.env*)",
      "Read(~/.ssh/**)",
      "Read(~/.aws/**)",
      "Read(//**/.npmrc)",
      "Read(~/.npmrc)",
      "Read(~/.git-credentials)",
      "Bash(npm publish *)",
      "Bash(npx * publish*)",
      "Bash(sed *-i*)",
      "Bash(sed *--in-place*)",
      "Bash(find * -delete*)",
      "Bash(find * -exec*)",
      "Bash(git reset *)",
      "Bash(git clean *)"
    ]

    // ...
  }
  // ...
}
```

- `Read/Edit(//**/.env*)` : bloque la lecture et l'écriture des .env partout sur le disque ;
- `Read(~/.ssh/**), .aws` : interdit le dossier .ssh de ton dossier utilisateur, où sont tes clés privées SSH (celles qui donnent accès à tes serveurs et à GitHub ou à Amazon) ;
- `Read(//**/.npmrc), ~/.npmrc` : interdit le fichier de configuration de npm dans ton dossier utilisateur ;
- `Read(~/.git-credentials)` : interdit le fichier où Git peut garder tes identifiants GitHub ou GitLab en clair. ;
- `Bash(npm publish *), npx * publish*`: interdit npm publish, qui met ton projet en ligne publiquement sur npm ;
- `Bash(sed *-i*), sed *--in-place*` : Claude pourrait modifier des fichiers par ce chemin, en contournant l'outil d'édition normal et ses contrôles ;
- `Bash(find * -delete*), find * -exec*,` : interdit find quand il supprime les fichiers trouvés (-delete) ou lance une commande sur chacun (-exec, -execdir). Une seule ligne peut agir sur des centaines de fichiers ;
- `Bash(git reset *), git clean *` : interdit reset pouvant effacer du travail et clean pouvant supprimer les fichiers non suivis ;

## _ask_ - _Claude demandera_

```json
{
  // ...
  "permissions": {
    // ...

    "deny": [
      //...
    ],
    "ask": [
      "Bash(node *)",
      "Edit(CLAUDE.local.md)",
      "Edit(package.json)",
      "Edit(CLAUDE.md)",
      "Edit(.github/**)",
      "Bash(npm install *)",
      "Bash(npm i *)",
      "Bash(npm ci *)",
      "Bash(npm uninstall *)",
      "Bash(npm update *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git push *)",
      "Bash(rm *)",
      "Bash(rmdir *)",
      "PowerShell(Remove-Item *)",
      "Bash(curl *)",
      "Bash(wget *)"
    ]

    // ...
  }
  // ...
}
```

- `Bash(node *)` : commande node, y compris node -e "\<code>", qui exécute du code JavaScript écrit à la volée ;
- `Edit(CLAUDE.md), CLAUDE.local.md` : modifier ses propres instructions (ce deuxième fichier étant optionnel) ;
- `Edit(package.json)` : surveiller tout nouveau script ;
- `Edit(.github/**)` : modifier tes GitHub Actions ;
- `Bash(npm install *), npm i *, npm ci *, npm uninstall *, npm update *` : installer, supprimer ou mettre à jour des paquets npm. ;
- `Bash(git add *), git commit * git push *` : envoyer ton code vers GitHub ;
- `Bash(rm *)` : supprimer définitivement un fichier ;
- `Bash(rmdir *)` : supprimer définitivement les dossiers vides ;
- `PowerShell(Remove-Item *)` : supprimer un fichier ou un dossier avec PowerShell. Les alias `rm`, `del` et `ri` sont reconnus automatiquement par cette règle ;
- `Bash(curl *), wget *` : télécharger ou envoyer des données sur internet ;

## _allow_ - _Claude agira librement_

```json
{
  // ...
  "permissions": {
    // ...

    "deny": [
      // ...
    ],
    "ask": [
      // ...
    ],
    "allow": [
      "WebSearch",
      "WebFetch",
      "Read(//d/dev/**)",
      "Bash(npx vitest *)",
      "Bash(npx tsc *)",
      "Bash(npm run *)",
      "Bash(node ai/*)",
      "Bash(npm ls *)",
      "Bash(npm view *)",
      "Bash(npm audit)",
      "Bash(npm audit --*)",
      "Bash(npm test *)",
      "Bash(sed -n *)",
      "Bash(cut *)",
      "Bash(sort *)"
    ]
  }
  // ...
}
```

- `WebSearch` : Claude peut faire une recherche web (comme Google) sans te demander à chaque fois. ;
- `WebFetch` : Claude peut ouvrir n'importe quelle adresse web et lire la page, sans te demander ; alternative disponible avec "WebFetch(domain:github.com)" ou autres ;
- `Read(//d/dev/\*\*)` : Claude peut lire tout ce qui est dans D:\dev, sans demander. '//d/dev' est la façon d'écrire D:\dev dans ces règles, à adapter au dossier de tes projets ;
- `Bash(npx vitest*)` : autorise npx vitest, qui lance tes tests Vitest ;
- `Bash(npx tsc*)` : autorise le compilateur TypeScript. Il vérifie tes types et peut générer des fichiers. ;
- `Bash(npm run *)` : autorise les scripts définis dans ton package.json (build, test, dev...) ;
- `Bash(node ai/*)` : autorise les scripts de Claude rangés dans `ai/`, jetables compris ; sûr avec `resonhance-wwai-shell`, dont le hook refuse avant exécution tout script de `ai/` qui touche au réseau, à un processus, à ton dossier personnel ou à un `.env` ; tout autre `node` reste en _ask_ ;
- `Bash(npm ls *)` : autorise npm ls, qui affiche la liste des paquets installés dans ton projet ;
- `Bash(npm view *)` : suivi du nom-du-paquet, qui affiche les infos publiques d'un paquet sur npm : versions, description, dépendances ;
- `Bash(npm audit*)` : autorise npm audit, qui cherche des failles de sécurité connues dans tes dépendances ;
- `Bash(npm test*)` : lance le script de test défini dans ton package.json ;
- `Bash(sed -n *)` : affiche un extrait d'un fichier, par exemple les lignes 10 à 50 : sed -n '10,50p' fichier ;
- `Bash(cut *)` : extrait des colonnes d'un texte, par exemple le premier champ de chaque ligne. ;
- `Bash(sort *)` : trie des lignes de texte.

note : Claude enchaîne souvent grep ou cut avec |, puis sort et chaque morceau d'une commande enchaînée doit être autorisé. | `resonhance-wwai-shell` focus le travaille de Claude sur la construction de scripts testés et des routines de run pour fiabiliser n'importe quel process. Rien de bien nouveau, mais : + de math = - d'AI slop.

## _env_ - _accès annexes_

```JSON
{
  // ...
  "permissions": {
    // ...

    "deny": [
      // ...
    ],
    "ask": [
      // ...
    ],
    "allow": [
      // ...
    ]
  },
  "env": {
    "ENABLE_CLAUDEAI_MCP_SERVERS": "false"
  },
  // ...
}
```

- `ENABLE_CLAUDEAI_MCP_SERVERS false` : la variable empêche Claude de charger les outils venant des connecteurs reliés à ton compte claude.ai (mail, Drive, agenda...). Il ne les voit même plus ;
