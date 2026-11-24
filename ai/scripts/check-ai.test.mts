import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { checkAi, formatReport } from "./check-ai.mts";

const NOW = new Date("2026-11-18T12:00:00");
const DAY_MS = 24 * 60 * 60 * 1000;

const featureOne = `---
id: F-1
title: "Un"
status: "provisoire"
scope: "projet"
serves: [O-1]
depends_on: []
used_by: [F-2]
decisions: [D-1]
references: [D-1, O-1, Q-1]
rules: 1
acceptance: 1
sources: []
---

## Règles

### R1

- règle (D-1, Q-1)

## Acceptation

- [ ] A1 critère
`;

const featureTwo = `---
id: F-2
title: "Deux"
status: "actif"
scope: "secondaire"
serves: []
depends_on: [F-1]
used_by: []
decisions: []
references: [F-1]
rules: 1
acceptance: 1
sources: []
---

## Règles

### R1

- règle (F-1 R1)

## Acceptation

- [ ] A1 critère
`;

const issue = `---
id: Q-1
type: "lacune"
touches: [F-1]
conflicts: []
options: 2
---

## Options

- A : oui
- B : non
`;

const source = `---
id: S-1
title: "Source"
section: "Section"
reliability: "vérifié"
verified: 2026-11-04
ranks: [1]
---

## Sources

- [1] Texte officiel
`;

const claudeSource = source.replace("id: S-1", "id: M-1");

const headed = (id: string) => `### ${id}\n\n- **Énoncé :** —\n- **Statut :** actif\n`;

// Un projet minimal et sans défaut ; chaque cas d'essai en remplace un fichier.
const VALID: Record<string, string> = {
  "CLAUDE.md": "Voir `ai/features/F-001-un.md`, `ai/features/F-nnn-slug.md`, `@ai/session.md`, `ai/issues/Q-001.md`.\n",
  "ai/session.md": "# Session\n",
  "ai/00-objectifs.md": `# 00 — Objectifs\n\n${headed("O-1")}`,
  "ai/01-decisions.md": headed("D-1"),
  "ai/02-glossary.md": headed("G-1"),
  "ai/03-texts.md": headed("T-1"),
  "ai/04-rituels.md": headed("R-1"),
  "ai/05-code-guideline.md": `${headed("P-1")}${headed("U-1")}${headed("C-1")}`,
  "ai/features/F-001-un.md": featureOne,
  "ai/features/F-002-deux.md": featureTwo,
  "ai/features/INDEX.md": `# Index

- **F-1 — Un**
  - État : provisoire
  - Périmètre : projet
  - Dépend de : —
  - Utilisée par : F-2
  - Règles : 1
  - Fiche : \`features/F-001-un.md\`
- **F-2 — Deux**
  - État : actif
  - Périmètre : secondaire
  - Dépend de : F-1
  - Utilisée par : —
  - Règles : 1
  - Fiche : \`features/F-002-deux.md\`
`,
  "ai/issues/Q-001.md": issue,
  "ai/issues/INDEX.md": `# Index

- **Q-1 · lacune** — Énoncé tronqué…
  - Touche : F-1
  - Options : 2
  - Fichier : \`Q-001.md\`
`,
  "ai/sources/S-001.md": source,
  "ai/sources/INDEX.md": "# Index\n\n## Section\n\n- **S-1 — Source** · vérifié\n",
  "ai/claude/sources/M-001.md": claudeSource,
  "ai/claude/sources/INDEX.md": "# Index\n\n## Section\n\n- **M-1 — Source** · vérifié\n",
  "app/page.tsx": "// F-2 R1, D-1\n",
};

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

type Options = NonNullable<Parameters<typeof checkAi>[1]>;

const run = (files: Record<string, string>, options: Options = {}) => {
  const root = mkdtempSync(join(tmpdir(), "check-ai-"));
  roots.push(root);
  for (const dir of ["components", "lib", "scripts"]) mkdirSync(join(root, dir));
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  const { errors, warnings } = checkAi(root, { now: NOW, ledger: { files: {}, runs: {} }, ...options });
  return { errors: errors.map((finding) => `${finding.file} | ${finding.message}`), warnings: warnings.map((finding) => `${finding.file} | ${finding.message}`) };
};

const check = (changes: Record<string, string> = {}, options: Options = {}) => run({ ...VALID, ...changes }, options);

describe("projet sans défaut", () => {
  test("ni erreur ni signalement, numéros à zéros et gabarit de chemin compris", () => {
    expect(check()).toEqual({ errors: [], warnings: [] });
  });

  test("un projet vierge, en-têtes seuls et sans aucun élément, ne signale rien", () => {
    const blank = {
      "CLAUDE.md": "@ai/session.md\n",
      "ai/session.md": "# Session\n",
      "ai/00-objectifs.md": "# 00 — Objectifs\n\nFormat : titre `### O-n`.\n",
      "ai/04-rituels.md": "# 04 — Rituels\n",
      "ai/features/INDEX.md": "# Index\n",
    };
    expect(run(blank)).toEqual({ errors: [], warnings: [] });
  });

  test("les copies de ai/bin ne sont pas contrôlées", () => {
    expect(check({ "ai/bin/2026-11-04/vieux.md": "D-99, `ai/07-Interface.md`, en 05.\n" })).toEqual({ errors: [], warnings: [] });
  });

  test("ai/bin et ai/tmp, qui naissent à l'usage, peuvent être cités absents", () => {
    expect(check({ "CLAUDE.md": "`ai/bin/` ; `ai/tmp/claude/` ; ai/tmp/lot.json\n" }).errors).toEqual([]);
  });

  test("les tests des scripts de Claude ne sont pas contrôlés", () => {
    expect(check({ "ai/scripts/outil.test.mts": "// D-99, ai/absent.md\n" }).errors).toEqual([]);
  });

  test("fins de ligne Windows acceptées", () => {
    expect(check({ "ai/issues/Q-001.md": issue.replaceAll("\n", "\r\n") }).errors).toEqual([]);
  });
});

describe("renvois", () => {
  test.each([
    ["numéro inexistant dans CLAUDE.md", { "CLAUDE.md": "D-99\n" }, "CLAUDE.md | renvoi orphelin : D-99 (l. 1)"],
    ["source citant un élément", { "ai/sources/S-001.md": `${source}\nVoir D-1.\n` }, "ai/sources/S-001.md | S-1 : cite D-1, contre le sens des renvois"],
    ["décision citant une feature", { "ai/01-decisions.md": `${headed("D-1")}Voir F-1.\n` }, "ai/01-decisions.md | D-1 : cite F-1, contre le sens des renvois"],
    ["feature citant un rituel", { "ai/features/F-002-deux.md": featureTwo.replace("references: [F-1]", "references: [F-1, R-1]").replace("- règle (F-1 R1)", "- règle (F-1 R1, R-1)") }, "ai/features/F-002-deux.md | F-2 : cite R-1, contre le sens des renvois"],
    ["code citant un élément non actif sans marqueur", { "lib/a.ts": "// F-1\n" }, "lib/a.ts | cite F-1, non actif : ajoute en tête « // PROVISOIRE (F-1) »"],
    ["règle d'un élément non actif sans marqueur", { "lib/a.ts": "// F-1 R1\n" }, "lib/a.ts | cite F-1, non actif : ajoute en tête « // PROVISOIRE (F-1) »"],
    ["marqueur sur un élément devenu actif", { "lib/a.ts": "// PROVISOIRE (F-2 R1) : essai.\n" }, "lib/a.ts | marqueur PROVISOIRE périmé : F-2 est actif, retire-le"],
    ["numéro inexistant dans le code", { "lib/a.ts": "// O-99\n" }, "lib/a.ts | renvoi orphelin : O-99 (l. 1)"],
    ["numéro inexistant dans une configuration à la racine", { "vite.config.ts": "// O-99\n" }, "vite.config.ts | renvoi orphelin : O-99 (l. 1)"],
    ["question supprimée mais encore citée", { "ai/01-decisions.md": `${headed("D-1")}Voir Q-99.\n` }, "ai/01-decisions.md | renvoi orphelin : Q-99 (l. 5)"],
    ["règle inexistante d'une feature", { "CLAUDE.md": "F-1 R9\n" }, "CLAUDE.md | règle inconnue : F-1 R9 (l. 1)"],
    ["numéro défini deux fois", { "ai/02-glossary.md": `${headed("G-1")}${headed("G-1")}` }, "ai/02-glossary.md | numéro défini deux fois : G-1 (aussi dans ai/02-glossary.md)"],
  ])("%s", (_, changes, expected) => {
    expect(check(changes).errors).toContain(expected);
  });
});

describe("code provisoire", () => {
  test("un marqueur relie l'essai à ses éléments et autorise leur citation", () => {
    expect(check({ "lib/a.ts": "// PROVISOIRE (F-1 R1) : essai, rien de fixe.\n// Voir F-1 R1.\n" }).errors).toEqual([]);
  });
});

describe("registre des automatisations", () => {
  const missing = "automatisation absente de ai/04-rituels.md : inscris son déclencheur, sa commande et comment la retirer";

  test.each([
    ["script de Claude", "ai/scripts/outil.mts"],
    ["script shell de Claude", "ai/scripts/outil.sh"],
    ["hooks", ".claude/settings.json"],
  ])("%s absent du registre : erreur", (_, file) => {
    expect(check({ [file]: "\n" }).errors).toContain(`${file} | ${missing}`);
  });

  test("inscrits au registre, test exclu, et scripts de l'application libres : aucune erreur", () => {
    const changes = {
      "ai/scripts/outil.mts": "\n",
      "ai/scripts/outil.test.mts": "\n",
      "scripts/seed.sh": "\n",
      ".claude/settings.json": "{}\n",
      "ai/04-rituels.md": `${VALID["ai/04-rituels.md"]}Voir \`ai/scripts/outil.mts\` et \`.claude/settings.json\`.\n`,
    };
    expect(check(changes).errors).toEqual([]);
  });
});

describe("chemins", () => {
  test.each([
    ["fichier absent", "`ai/07-Interface.md`", "ai/07-Interface.md"],
    ["casse différente", "`/ai/01-Decisions.md`", "ai/01-Decisions.md"],
    ["préfixe de numéro sans fichier", "ai/07 et", "ai/07"],
    ["point final retiré", "`ai/issues/S-090.md`.", "ai/issues/S-090.md"],
    ["dossier qui commence comme bin sans l'être", "`ai/binaire.md`", "ai/binaire.md"],
  ])("%s", (_, line, path) => {
    expect(check({ "CLAUDE.md": `${line}\n` }).errors).toContain(`CLAUDE.md | chemin introuvable : ${path} (l. 1)`);
  });

  test("préfixe de numéro et dossier existants, slash final accepté", () => {
    expect(check({ "CLAUDE.md": "ai/01 ; `/ai/features` ; `/ai/mini-hub.md/`\n", "ai/mini-hub.md": "# mini-hub\n" }).errors).toEqual([]);
  });
});

describe("en-têtes des fiches", () => {
  test.each([
    ["statut d'élément", { "ai/01-decisions.md": "### D-1\n\n- **Statut :** proposé\n" }, "ai/01-decisions.md | D-1 : statut « proposé » (provisoire | actif)"],
    ["id différent du nom du fichier", { "ai/features/F-001-un.md": featureOne.replace("id: F-1", "id: F-3") }, "ai/features/F-001-un.md | en-tête id « F-3 » différent du nom du fichier"],
    ["statut de feature", { "ai/features/F-002-deux.md": featureTwo.replace('"actif"', '"validée"') }, "ai/features/F-002-deux.md | F-2 : status « validée » (provisoire | actif)"],
    ["compte de règles", { "ai/features/F-002-deux.md": featureTwo.replace("rules: 1", "rules: 2") }, "ai/features/F-002-deux.md | F-2 : rules vaut 2, la fiche en compte 1"],
    ["compte de critères", { "ai/features/F-002-deux.md": featureTwo.replace("acceptance: 1", "acceptance: 2") }, "ai/features/F-002-deux.md | F-2 : acceptance vaut 2, la fiche en compte 1"],
    ["citation absente de references", { "ai/features/F-002-deux.md": featureTwo.replace("- règle (F-1 R1)", "- règle (F-1 R1, D-1)") }, "ai/features/F-002-deux.md | F-2 : cite D-1, absent de references"],
    ["references jamais cité", { "ai/features/F-002-deux.md": featureTwo.replace("references: [F-1]", "references: [F-1, D-1]") }, "ai/features/F-002-deux.md | F-2 : references contient D-1, jamais cité"],
    ["dépendance non réciproque", { "ai/features/F-001-un.md": featureOne.replace("used_by: [F-2]", "used_by: []") }, "ai/features/F-002-deux.md | F-2 dépend de F-1, absent de son used_by"],
    ["used_by non réciproque", { "ai/features/F-002-deux.md": featureTwo.replace("depends_on: [F-1]", "depends_on: []") }, "ai/features/F-001-un.md | F-1 a F-2 en used_by, absent de son depends_on"],
    ["depends_on hors feature", { "ai/features/F-002-deux.md": featureTwo.replace("depends_on: [F-1]", "depends_on: [F-1, Q-1]") }, "ai/features/F-002-deux.md | F-2 : depends_on contient Q-1, qui n'est pas une feature"],
    ["type de question", { "ai/issues/Q-001.md": issue.replace('"lacune"', '"doute"') }, "ai/issues/Q-001.md | Q-1 : type « doute » (lacune | ambiguïté | contradiction)"],
    ["compte d'options", { "ai/issues/Q-001.md": issue.replace("options: 2", "options: 3") }, "ai/issues/Q-001.md | Q-1 : options vaut 3, la question en compte 2"],
    ["fiabilité d'une source", { "ai/sources/S-001.md": source.replace('"vérifié"', '"sûr"') }, "ai/sources/S-001.md | S-1 : reliability « sûr » (vérifié | constaté | recoupé | une source | contesté | non sourcé)"],
    ["date d'une source", { "ai/sources/S-001.md": source.replace("2026-11-04", "hier") }, "ai/sources/S-001.md | S-1 : verified « hier » n'est pas une date"],
    ["rangs d'une source", { "ai/sources/S-001.md": source.replace("ranks: [1]", "ranks: [2]") }, "ai/sources/S-001.md | S-1 : ranks [2] différent des rangs de ses sources [1]"],
  ])("%s", (_, changes, expected) => {
    expect(check(changes).errors).toContain(expected);
  });

  test("une feature actif a des critères d'acceptation, pas une feature provisoire", () => {
    const withoutCriteria = (feature: string) => feature.replace("acceptance: 1", "acceptance: 0").replace("- [ ] A1 critère\n", "");
    expect(check({ "ai/features/F-002-deux.md": withoutCriteria(featureTwo) }).errors).toContain("ai/features/F-002-deux.md | F-2 : règles ou critères d'acceptation absents");
    expect(check({ "ai/features/F-001-un.md": withoutCriteria(featureOne) }).errors).toEqual([]);
  });

  test("une option précédée de son sujet compte comme une option", () => {
    const changes = { "ai/issues/Q-001.md": issue.replace("- A : oui", "- Pour le nom : A : oui") };
    expect(check(changes).errors).toEqual([]);
  });

  test("le used_by ne vaut pas citation", () => {
    expect(check().errors.join()).not.toContain("absent de references");
  });

  test("une note sur une dépendance ne compte pas comme un lien", () => {
    const changes = {
      "ai/features/F-002-deux.md": featureTwo.replace("depends_on: [F-1]", 'depends_on: ["F-1 (compteur, Q-1)"]').replace("references: [F-1]", "references: [F-1, Q-1]"),
      "ai/features/INDEX.md": VALID["ai/features/INDEX.md"].replace("Dépend de : F-1", "Dépend de : F-1 (compteur, Q-1)"),
    };
    expect(check(changes).errors).toEqual([]);
  });

  test("un élément qui ne cite pas la question qui le touche est une erreur", () => {
    const changes = { "ai/features/F-001-un.md": featureOne.replace("references: [D-1, O-1, Q-1]", "references: [D-1, O-1]").replace("(D-1, Q-1)", "(D-1)") };
    expect(check(changes).errors).toContain("ai/features/F-001-un.md | F-1 ne porte pas le renvoi vers Q-1");
  });
});

describe("index", () => {
  test.each([
    ["feature absente", "ai/features/INDEX.md", "# Index\n", "F-1 absent de l'index"],
    ["feature différente", "ai/features/INDEX.md", VALID["ai/features/INDEX.md"].replace("Règles : 1", "Règles : 5"), "entrée de F-1 différente de son en-tête"],
    ["périmètre absent", "ai/features/F-001-un.md", featureOne.replace('scope: "projet"\n', ""), "F-1 : scope « absent » (projet | secondaire)"],
    ["périmètre différent", "ai/features/INDEX.md", VALID["ai/features/INDEX.md"].replace("Périmètre : projet", "Périmètre : secondaire"), "entrée de F-1 différente de son en-tête"],
    ["question différente", "ai/issues/INDEX.md", VALID["ai/issues/INDEX.md"].replace("Options : 2", "Options : —"), "entrée de Q-1 différente de son en-tête"],
    ["source différente", "ai/sources/INDEX.md", VALID["ai/sources/INDEX.md"].replace("vérifié", "constaté"), "entrée de S-1 différente de son en-tête"],
  ])("%s", (_, file, text, expected) => {
    expect(check({ [file]: text }).errors).toContain(`${file} | ${expected}`);
  });

  test("une entrée sans fiche sort comme renvoi orphelin", () => {
    const text = `${VALID["ai/issues/INDEX.md"]}- **Q-9 · lacune** — Disparue.\n`;
    expect(check({ "ai/issues/INDEX.md": text }).errors).toContain("ai/issues/INDEX.md | renvoi orphelin : Q-9 (l. 7)");
  });

  test("zéro règle et zéro option s'écrivent « — » dans l'index", () => {
    const changes = {
      "ai/issues/Q-001.md": issue.replace("options: 2", "options: 0").replace("- A : oui\n- B : non\n", "—\n"),
      "ai/issues/INDEX.md": VALID["ai/issues/INDEX.md"].replace("Options : 2", "Options : —"),
    };
    expect(check(changes).errors).toEqual([]);
  });

  test("un titre échappé dans l'en-tête se lit tel quel dans l'index", () => {
    const changes = {
      "ai/sources/S-001.md": source.replace('"Source"', '"Base et `\\\\password`"'),
      "ai/sources/INDEX.md": VALID["ai/sources/INDEX.md"].replace("S-1 — Source", "S-1 — Base et `\\password`"),
    };
    expect(check(changes).errors).toEqual([]);
  });
});

describe("signalements", () => {
  test.each([
    ["élément citant une question qui ne le touche pas", { "ai/issues/Q-001.md": issue.replace("[F-1]", "[F-2]") }, "ai/features/F-001-un.md | F-1 cite Q-1, dont le touches ne le contient pas"],
    ["question touchant autre chose qu'un élément", { "ai/issues/Q-001.md": issue.replace("[F-1]", "[F-1, O-global]") }, "ai/issues/Q-001.md | Q-1 touche « O-global », qui n'est pas un élément"],
    ["numéro de fichier seul", { "CLAUDE.md": "Inscris en 05.\n" }, "CLAUDE.md | numéro de fichier seul : « 05 » (l. 1)"],
    ["source de feature hors S-n", { "ai/features/F-002-deux.md": featureTwo.replace("sources: []", 'sources: ["NIST"]') }, "ai/features/F-002-deux.md | F-2 : sources : « NIST » n'est pas un S-n"],
    ["« vérifié » sans rang suffisant", { "ai/sources/S-001.md": source.replace("ranks: [1]", "ranks: [3]").replace("- [1]", "- [3]") }, "ai/sources/S-001.md | S-1 : « vérifié » demande une source de rang 1 ou deux de rang 2"],
    ["« recoupé » sur un seul site", { "ai/sources/S-001.md": source.replace('"vérifié"', '"recoupé"') }, "ai/sources/S-001.md | S-1 : « recoupé » demande au moins deux sites indépendants"],
    ["ligne de savoir trop longue", { "ai/sources/S-001.md": `${source}\n## Savoir\n\n${"x".repeat(801)}\n` }, "ai/sources/S-001.md | S-1 : une ligne de « Savoir » dépasse 800 caractères : un fait par ligne"],
    ["ligne de session trop longue", { "ai/session.md": `# Session\n\n${"x".repeat(301)}\n` }, "ai/session.md | ligne trop longue (l. 3, 301 caractères) : la remplacer, en 300 au plus"],
    ["Socle encore à remplir", { "CLAUDE.md": "- **le problème :** <à remplir : quoi>\n- Stack : <à remplir>\n" }, "CLAUDE.md | 2 « à remplir » : le Socle attend l'utilisateur ; proposer chaque texte sous la forme avant -> après"],
  ])("%s", (_, changes, expected) => {
    expect(check(changes).warnings).toContain(expected);
  });

  test("contexte permanent au-delà de son budget", () => {
    const { warnings } = check({ "CLAUDE.md": `@ai/session.md\n${"x".repeat(14_000)}\n` });
    expect(warnings.some((warning) => warning.startsWith("CLAUDE.md | contexte permanent : 14026 caractères (CLAUDE.md et ses @) pour un budget de 14000"))).toBe(true);
  });

  test("une date, une heure ou un nom de fichier ne sont pas signalés", () => {
    const changes = { "CLAUDE.md": "Le 2026-11-04 à 09:05, voir 05.md.\n" };
    expect(check(changes).warnings).toEqual([]);
  });

  test("un fichier peut citer son propre numéro, pas celui d'un autre", () => {
    const changes = { "ai/01-decisions.md": `# 01 — Décisions\n\n# 00\n\n${headed("D-1")}` };
    expect(check(changes).warnings).toEqual(["ai/01-decisions.md | numéro de fichier seul : « 00 » (l. 3)"]);
  });
});

describe("sources de Claude, isolées du projet", () => {
  test.each([
    ["décision", { "ai/01-decisions.md": `${headed("D-1")}Voir M-1.\n` }, "ai/01-decisions.md | D-1 : cite M-1, source de Claude : elle ne sert que son outillage"],
    ["règle de code", { "ai/05-code-guideline.md": `${headed("P-1")}Voir M-1.\n${headed("U-1")}${headed("C-1")}` }, "ai/05-code-guideline.md | P-1 : cite M-1, source de Claude : elle ne sert que son outillage"],
    ["code de l'application", { "lib/a.ts": "// M-1\n" }, "lib/a.ts | cite M-1, source de Claude : le code de l'application ne la cite pas"],
    ["source de Claude citant une source du projet", { "ai/claude/sources/M-001.md": `${claudeSource}\nVoir S-1.\n` }, "ai/claude/sources/M-001.md | M-1 : cite S-1, contre le sens des renvois"],
  ])("%s : erreur", (_, changes, expected) => {
    expect(check(changes).errors).toContain(expected);
  });

  test("un rituel et un script de Claude la citent librement", () => {
    const changes = { "ai/04-rituels.md": `${headed("R-1")}Voir M-1 et \`ai/scripts/outil.mts\`.\n`, "ai/scripts/outil.mts": "// M-1\n" };
    expect(check(changes).errors).toEqual([]);
  });

  test("une source de Claude se revérifie après 180 jours", () => {
    expect(check({}, { now: new Date("2027-06-01T12:00:00") }).warnings).toContain("ai/claude/sources/M-001.md | M-1 : vérifiée le 2026-11-04 ; l'outillage change vite : la revérifier ou la retirer");
  });
});

describe("autorité des sources", () => {
  const thirdRank = { "ai/sources/S-001.md": source.replace("ranks: [1]", "ranks: [3]").replace("- [1] Texte officiel", "- [3] Billet").replace('"vérifié"', '"une source"'), "ai/sources/INDEX.md": VALID["ai/sources/INDEX.md"].replace("vérifié", "une source") };

  test("une décision ne s'appuie pas sur une source de rang 3 seule", () => {
    const changes = { ...thirdRank, "ai/01-decisions.md": `${headed("D-1")}S'appuie sur S-1.\n` };
    expect(check(changes).errors).toContain("ai/01-decisions.md | D-1 s'appuie sur S-1, de rang 3 seul : remonter à une source de rang 1 ou 2");
  });

  test("une feature sur une source de rang 3 seule est signalée", () => {
    const changes = { ...thirdRank, "ai/features/F-002-deux.md": featureTwo.replace("references: [F-1]", "references: [F-1, S-1]").replace("- règle (F-1 R1)", "- règle (F-1 R1, S-1)") };
    expect(check(changes).warnings).toContain("ai/features/F-002-deux.md | F-2 s'appuie sur S-1, de rang 3 seul : remonter à une source de rang 1 ou 2");
  });

  test("un rang 1 sur un site de praticiens est signalé", () => {
    const changes = { "ai/sources/S-001.md": source.replace("- [1] Texte officiel", "- [1] [Réponse](https://fr.stackoverflow.com/q/1)") };
    expect(check(changes).warnings).toContain("ai/sources/S-001.md | S-1 : rang 1 sur fr.stackoverflow.com, site de praticiens ou de seconde main : rang 3, à remonter jusqu'à sa source primaire");
  });
});

describe("barrière de sécurité des scripts de Claude", () => {
  test.each([
    ["processus", 'import { exec } from "node:child_process";\n', "réseau ou processus lancé"],
    ["réseau", 'await fetch("https://exemple.org");\n', "réseau"],
    ["dossier personnel", 'import { homedir } from "node:os";\nhomedir();\n', "dossier personnel, hors du projet"],
    ["secret", 'readFileSync(".env");\n', "fichier .env"],
  ])("%s : erreur", (_, text, what) => {
    expect(check({ "ai/scripts/outil.mts": text }).errors).toContain(`ai/scripts/outil.mts | barrière de sécurité : ${what} ; seul l'utilisateur peut l'autoriser`);
  });

  test("un script de l'application et les tests n'y sont pas soumis", () => {
    const changes = {
      "scripts/outil.mts": 'await fetch("https://exemple.org");\n',
      "ai/scripts/outil.test.mts": 'import { exec } from "node:child_process";\n',
    };
    expect(check(changes).errors).toEqual([]);
  });
});

describe("sélection", () => {
  // Les fichiers d'essai viennent d'être écrits : cent jours plus tard, rien ne les a employés.
  const later = new Date(Date.now() + 100 * DAY_MS);
  const candidates = (warnings: string[]) => warnings.filter((warning) => warning.includes("candidat à l'extinction"));

  test("ce qu'aucun élément vivant n'atteint et que personne n'emploie sort après 60 jours", () => {
    const found = candidates(check({}, { now: later }).warnings);
    expect(found.map((warning) => warning.split(" : ")[0])).toEqual(["ai/sources/S-001.md | S-1", "ai/claude/sources/M-001.md | M-1"]);
    expect(found[0]).toMatch(/inemployé depuis \d+ j : candidat à l'extinction \(à retirer par Claude, après npm run ai:bin\)$/);
  });

  test("une décision que rien n'atteint est proposée au retrait à l'utilisateur", () => {
    const found = candidates(check({ "ai/01-decisions.md": `${headed("D-1")}${headed("D-2")}` }, { now: later }).warnings);
    expect(found.some((warning) => warning.startsWith("ai/01-decisions.md | D-2 :") && warning.endsWith("(à proposer au retrait à l'utilisateur)"))).toBe(true);
  });

  test("un emploi récent, mesuré par le registre d'usage, garde en vie", () => {
    const ledger = { files: { "ai/sources/S-001.md": { read: 1, write: 0, last: later.toLocaleDateString("sv") } }, runs: {} };
    expect(candidates(check({}, { now: later, ledger }).warnings).join()).not.toContain("S-1");
  });

  test("une feature secondaire vit si le code la cite, et une question par l'élément qui la cite", () => {
    expect(candidates(check({}, { now: later }).warnings).join()).not.toMatch(/F-2|Q-1|D-1/);
  });
});

describe("essais des automatisations de Claude", () => {
  const registry = (selection: string) =>
    `# 04\n\n## Projet\n\n${headed("R-1")}\n## Automatisations de Claude\n\n### R-2\n\n- **Commandes :** \`npm run ai:bin\`\n${selection}- **Statut :** provisoire\n`;

  test("sans Sélection : erreur", () => {
    expect(check({ "ai/04-rituels.md": registry("") }).errors).toContain("ai/04-rituels.md | R-2 : Sélection absente (« essai jusqu'au AAAA-MM-JJ ; mesure : … » ou « retenu le AAAA-MM-JJ : preuve »)");
  });

  test("un essai échu est signalé avec son usage mesuré", () => {
    const ledger = { files: {}, runs: { "npm:ai:bin": { count: 4, last: "2026-11-10" } } };
    const changes = { "ai/04-rituels.md": registry("- **Sélection :** essai jusqu'au 2026-11-01 ; mesure : copies faites\n") };
    expect(check(changes, { ledger }).warnings).toContain("ai/04-rituels.md | R-2 : essai échu le 2026-11-01 (usage mesuré : 4) : le retenir avec sa preuve, ou le retirer");
  });

  test("un essai en cours ne dit rien, une automatisation retenue se réévalue après 180 jours", () => {
    expect(check({ "ai/04-rituels.md": registry("- **Sélection :** essai jusqu'au 2027-01-01 ; mesure : copies\n") }).warnings).toEqual([]);
    expect(check({ "ai/04-rituels.md": registry("- **Sélection :** retenu le 2026-01-01 : preuve\n") }).warnings).toContain("ai/04-rituels.md | R-2 : retenu le 2026-01-01, à réévaluer (usage mesuré : 0)");
  });
});

describe("rapport", () => {
  test("vide, il tient en une ligne ; long, il renvoie aux détails", () => {
    const many = { errors: Array.from({ length: 25 }, (_, number) => ({ file: "CLAUDE.md", message: `e${number}` })), warnings: [], provisional: [] };
    expect(formatReport({ errors: [], warnings: [], provisional: [] })).toBe("0 erreur(s), 0 signalement(s)");
    expect(formatReport(many)).toContain("… 5 de plus : npm run check:ai -- --details");
    expect(formatReport(many, true)).not.toContain("de plus");
  });
});

test("dans le code, seul un commentaire cite un élément : une chaîne d'un projet existant n'est pas un renvoi", () => {
  expect(check({ "lib/report.ts": 'const quarter = "Q-1";\nconst code = "D-99";\n' }).errors).toEqual([]);
  expect(check({ "lib/report.ts": "const total = 1; // D-99\n" }).errors).toContain("lib/report.ts | renvoi orphelin : D-99 (l. 1)");
});

test("un nom de paquet qui finit par -ai/ n'est pas un chemin", () => {
  expect(check({ "CLAUDE.md": 'import Anthropic from "@anthropic-ai/sdk";\n' }).errors).toEqual([]);
});

describe("démarrage et .gitignore", () => {
  const AI_LINES = "node_modules/\n/ai/\nCLAUDE.md\n.claude/\n";

  test("un projet dont le .gitignore laisse passer l'outillage de Claude : signalé", () => {
    expect(check({ ".gitignore": "node_modules/\nai/\n" }).warnings).toContain(".gitignore | n'exclut pas CLAUDE.md, .claude : l'outillage de Claude partirait dans git, sauf choix de l'équipe de le versionner (lignes « AI » de gitignore.projet)");
    expect(check({ ".gitignore": AI_LINES }).warnings.filter((line) => line.startsWith(".gitignore"))).toEqual([]);
  });

  test("le shell lui-même, avec gitignore.projet et un Socle vide : ni erreur ni reste", () => {
    const shell = check({ ".gitignore": "node_modules/\n", "gitignore.projet": AI_LINES, "CLAUDE.md": "<à remplir>\n" });
    expect(shell.errors).toEqual([]);
    expect(shell.warnings.filter((line) => line.startsWith("gitignore.projet"))).toEqual([]);
  });

  test("Socle rempli et gitignore.projet encore là : signalé", () => {
    expect(check({ "gitignore.projet": AI_LINES }).warnings).toContain("gitignore.projet | reste après le démarrage : le renommer en .gitignore (projet neuf) ou fusionner ses lignes « AI » dans .gitignore, puis le retirer");
  });

  test("une faute de frappe dans le nom : signalée, pas .ignore", () => {
    const { warnings } = check({ ".gitignore": AI_LINES, ".gitgnore": AI_LINES, ".ignore": "!ai/\n" });
    expect(warnings).toContain(".gitgnore | nom voisin de .gitignore, sans effet sur git : le renommer ou le retirer");
    expect(warnings.filter((line) => line.startsWith(".ignore"))).toEqual([]);
  });
});
