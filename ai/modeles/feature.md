---
id: F-n
title: "Nom de la fonctionnalité"
status: "provisoire"
scope: "projet"
serves: [O-n]
depends_on: [F-n]
used_by: [F-n]
decisions: [D-n]
references: [D-n, F-n, O-n, Q-n, S-n]
rules: 2
acceptance: 2
sources: [S-n]
---

## Périmètre

**Inclus :**

- ce que la fonctionnalité couvre, un point par ligne

**Exclu :**

- ce qu'elle laisse à une autre fiche (F-n)

## Règles

### R1

- une règle par puce : courte, vérifiable, dans les mots de l'utilisateur quand il l'a posée
- une règle qui découle d'une décision la cite (D-n)

### R2

- une règle qu'on ne comprend pas seule porte sa raison
- **Raison :** pourquoi, en une phrase

## Acceptation

- [ ] A1 un critère observable, vérifié par un test nommé `F-n A<m>` ou à l'œil par l'utilisateur
- [ ] A2 un critère par comportement attendu

## Questions

- Q-n

## Sources

- S-n
