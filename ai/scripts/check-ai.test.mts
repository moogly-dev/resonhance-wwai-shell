import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { checkAi, formatReport } from "./check-ai.mts";

const NOW = new Date("2026-11-18T12:00:00");
const DAY_MS = 24 * 60 * 60 * 1000;

const featureOne = `---
id: F-1
title: "One"
status: "provisional"
scope: "project"
serves: [O-1]
depends_on: []
used_by: [F-2]
decisions: [D-1]
references: [D-1, O-1, Q-1]
rules: 1
acceptance: 1
sources: []
---

## Rules

### R1

- rule (D-1, Q-1)

## Acceptance

- [ ] A1 criterion
`;

const featureTwo = `---
id: F-2
title: "Two"
status: "active"
scope: "secondary"
serves: []
depends_on: [F-1]
used_by: []
decisions: []
references: [F-1]
rules: 1
acceptance: 1
sources: []
---

## Rules

### R1

- rule (F-1 R1)

## Acceptance

- [ ] A1 criterion
`;

const issue = `---
id: Q-1
type: "gap"
touches: [F-1]
conflicts: []
options: 2
---

## Options

- A: yes
- B: no
`;

const source = `---
id: S-1
title: "Source"
section: "Section"
reliability: "verified"
verified: 2026-11-04
ranks: [1]
---

## Sources

- [1] Official text
`;

const claudeSource = source.replace("id: S-1", "id: M-1");

const headed = (id: string) => `### ${id}\n\n- **Statement:** —\n- **Status:** active\n`;

// A minimal project without defect; each test case replaces one of its files.
const VALID: Record<string, string> = {
  "CLAUDE.md": "See `ai/features/F-001-one.md`, `ai/features/F-nnn-slug.md`, `@ai/session.md`, `ai/issues/Q-001.md`.\n",
  "ai/session.md": "# Session\n",
  "ai/00-objectives.md": `# 00 — Objectives\n\n${headed("O-1")}`,
  "ai/01-decisions.md": headed("D-1"),
  "ai/02-glossary.md": headed("G-1"),
  "ai/03-texts.md": headed("T-1"),
  "ai/04-rituals.md": headed("R-1"),
  "ai/05-code-guideline.md": `${headed("P-1")}${headed("U-1")}${headed("C-1")}`,
  "ai/features/F-001-one.md": featureOne,
  "ai/features/F-002-two.md": featureTwo,
  "ai/features/INDEX.md": `# Index

- **F-1 — One**
  - Status: provisional
  - Scope: project
  - Depends on: —
  - Used by: F-2
  - Rules: 1
  - File: \`features/F-001-one.md\`
- **F-2 — Two**
  - Status: active
  - Scope: secondary
  - Depends on: F-1
  - Used by: —
  - Rules: 1
  - File: \`features/F-002-two.md\`
`,
  "ai/issues/Q-001.md": issue,
  "ai/issues/INDEX.md": `# Index

- **Q-1 · gap** — Truncated statement…
  - Touches: F-1
  - Options: 2
  - File: \`Q-001.md\`
`,
  "ai/sources/S-001.md": source,
  "ai/sources/INDEX.md": "# Index\n\n## Section\n\n- **S-1 — Source** · verified\n",
  "ai/claude/sources/M-001.md": claudeSource,
  "ai/claude/sources/INDEX.md": "# Index\n\n## Section\n\n- **M-1 — Source** · verified\n",
  "src/main.ts": "// F-2 R1, D-1\n",
};

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

type Options = NonNullable<Parameters<typeof checkAi>[1]>;

const run = (files: Record<string, string>, options: Options = {}) => {
  const root = mkdtempSync(join(tmpdir(), "check-ai-"));
  roots.push(root);
  for (const dir of ["lib", "scripts"]) mkdirSync(join(root, dir));
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
  const { errors, warnings } = checkAi(root, { now: NOW, ledger: { files: {}, runs: {} }, ...options });
  return { errors: errors.map((finding) => `${finding.file} | ${finding.message}`), warnings: warnings.map((finding) => `${finding.file} | ${finding.message}`) };
};

const check = (changes: Record<string, string> = {}, options: Options = {}) => run({ ...VALID, ...changes }, options);

describe("project without defect", () => {
  test("no error and no warning, zero-padded numbers and path template included", () => {
    expect(check()).toEqual({ errors: [], warnings: [] });
  });

  test("a blank project, headers only and no item, reports nothing", () => {
    const blank = {
      "CLAUDE.md": "@ai/session.md\n",
      "ai/session.md": "# Session\n",
      "ai/00-objectives.md": "# 00 — Objectives\n\nFormat: heading `### O-n`.\n",
      "ai/04-rituals.md": "# 04 — Rituals\n",
      "ai/features/INDEX.md": "# Index\n",
    };
    expect(run(blank)).toEqual({ errors: [], warnings: [] });
  });

  test("copies in ai/bin are not checked", () => {
    expect(check({ "ai/bin/2026-11-04/old.md": "D-99, `ai/07-Interface.md`, in 05.\n" })).toEqual({ errors: [], warnings: [] });
  });

  test("ai/bin and ai/tmp, born from use, may be cited while absent", () => {
    expect(check({ "CLAUDE.md": "`ai/bin/` ; `ai/tmp/claude/` ; ai/tmp/batch.json\n" }).errors).toEqual([]);
  });

  test("tests of Claude's scripts are not checked", () => {
    expect(check({ "ai/scripts/tool.test.mts": "// D-99, ai/missing.md\n" }).errors).toEqual([]);
  });

  test("Windows line endings accepted", () => {
    expect(check({ "ai/issues/Q-001.md": issue.replaceAll("\n", "\r\n") }).errors).toEqual([]);
  });
});

describe("references", () => {
  test.each([
    ["unknown number in CLAUDE.md", { "CLAUDE.md": "D-99\n" }, "CLAUDE.md | orphan reference: D-99 (l. 1)"],
    ["source citing an item", { "ai/sources/S-001.md": `${source}\nSee D-1.\n` }, "ai/sources/S-001.md | S-1: cites D-1, against the direction of references"],
    ["decision citing a feature", { "ai/01-decisions.md": `${headed("D-1")}See F-1.\n` }, "ai/01-decisions.md | D-1: cites F-1, against the direction of references"],
    ["feature citing a ritual", { "ai/features/F-002-two.md": featureTwo.replace("references: [F-1]", "references: [F-1, R-1]").replace("- rule (F-1 R1)", "- rule (F-1 R1, R-1)") }, "ai/features/F-002-two.md | F-2: cites R-1, against the direction of references"],
    ["code citing a non-active item without marker", { "lib/a.ts": "// F-1\n" }, 'lib/a.ts | cites F-1, not active: add at the top "// PROVISIONAL (F-1)"'],
    ["rule of a non-active item without marker", { "lib/a.ts": "// F-1 R1\n" }, 'lib/a.ts | cites F-1, not active: add at the top "// PROVISIONAL (F-1)"'],
    ["marker on an item now active", { "lib/a.ts": "// PROVISIONAL (F-2 R1): trial.\n" }, "lib/a.ts | stale PROVISIONAL marker: F-2 is active, remove it"],
    ["unknown number in code", { "lib/a.ts": "// O-99\n" }, "lib/a.ts | orphan reference: O-99 (l. 1)"],
    ["unknown number in a root configuration", { "vite.config.ts": "// O-99\n" }, "vite.config.ts | orphan reference: O-99 (l. 1)"],
    ["deleted question still cited", { "ai/01-decisions.md": `${headed("D-1")}See Q-99.\n` }, "ai/01-decisions.md | orphan reference: Q-99 (l. 5)"],
    ["unknown rule of a feature", { "CLAUDE.md": "F-1 R9\n" }, "CLAUDE.md | unknown rule: F-1 R9 (l. 1)"],
    ["number defined twice", { "ai/02-glossary.md": `${headed("G-1")}${headed("G-1")}` }, "ai/02-glossary.md | number defined twice: G-1 (also in ai/02-glossary.md)"],
  ])("%s", (_, changes, expected) => {
    expect(check(changes).errors).toContain(expected);
  });

  test("in code, only a comment cites an item: a string of an existing project is not a reference", () => {
    expect(check({ "lib/report.ts": 'const quarter = "Q-1";\nconst code = "D-99";\n' }).errors).toEqual([]);
    expect(check({ "lib/report.ts": "const total = 1; // D-99\n" }).errors).toContain("lib/report.ts | orphan reference: D-99 (l. 1)");
  });

  test("a package name ending in -ai/ is not a path", () => {
    expect(check({ "CLAUDE.md": 'import Anthropic from "@anthropic-ai/sdk";\n' }).errors).toEqual([]);
  });
});

describe("provisional code", () => {
  test("a marker links the trial to its items and allows citing them", () => {
    expect(check({ "lib/a.ts": "// PROVISIONAL (F-1 R1): trial, nothing fixed.\n// See F-1 R1.\n" }).errors).toEqual([]);
  });
});

describe("automation registry", () => {
  const missing = "automation missing from ai/04-rituals.md: record its trigger, its command and how to remove it";

  test.each([
    ["Claude's script", "ai/scripts/tool.mts"],
    ["Claude's shell script", "ai/scripts/tool.sh"],
    ["hooks", ".claude/settings.json"],
  ])("%s missing from the registry: error", (_, file) => {
    expect(check({ [file]: "\n" }).errors).toContain(`${file} | ${missing}`);
  });

  test("recorded, test excluded, and application scripts free: no error", () => {
    const changes = {
      "ai/scripts/tool.mts": "\n",
      "ai/scripts/tool.test.mts": "\n",
      "scripts/seed.sh": "\n",
      ".claude/settings.json": "{}\n",
      "ai/04-rituals.md": `${VALID["ai/04-rituals.md"]}See \`ai/scripts/tool.mts\` and \`.claude/settings.json\`.\n`,
    };
    expect(check(changes).errors).toEqual([]);
  });
});

describe("paths", () => {
  test.each([
    ["missing file", "`ai/07-Interface.md`", "ai/07-Interface.md"],
    ["different case", "`/ai/01-Decisions.md`", "ai/01-Decisions.md"],
    ["number prefix without file", "ai/07 and", "ai/07"],
    ["final period removed", "`ai/issues/S-090.md`.", "ai/issues/S-090.md"],
    ["folder that starts like bin without being it", "`ai/binary.md`", "ai/binary.md"],
  ])("%s", (_, line, path) => {
    expect(check({ "CLAUDE.md": `${line}\n` }).errors).toContain(`CLAUDE.md | path not found: ${path} (l. 1)`);
  });

  test("existing number prefix and folder, final slash accepted", () => {
    expect(check({ "CLAUDE.md": "ai/01 ; `/ai/features` ; `/ai/notes.md/`\n", "ai/notes.md": "# notes\n" }).errors).toEqual([]);
  });
});

describe("card headers", () => {
  test.each([
    ["item status", { "ai/01-decisions.md": "### D-1\n\n- **Status:** proposed\n" }, 'ai/01-decisions.md | D-1: status "proposed" (provisional | active)'],
    ["id different from the file name", { "ai/features/F-001-one.md": featureOne.replace("id: F-1", "id: F-3") }, 'ai/features/F-001-one.md | header id "F-3" differs from the file name'],
    ["feature status", { "ai/features/F-002-two.md": featureTwo.replace('"active"', '"approved"') }, 'ai/features/F-002-two.md | F-2: status "approved" (provisional | active)'],
    ["rule count", { "ai/features/F-002-two.md": featureTwo.replace("rules: 1", "rules: 2") }, "ai/features/F-002-two.md | F-2: rules is 2, the card has 1"],
    ["criteria count", { "ai/features/F-002-two.md": featureTwo.replace("acceptance: 1", "acceptance: 2") }, "ai/features/F-002-two.md | F-2: acceptance is 2, the card has 1"],
    ["citation missing from references", { "ai/features/F-002-two.md": featureTwo.replace("- rule (F-1 R1)", "- rule (F-1 R1, D-1)") }, "ai/features/F-002-two.md | F-2: cites D-1, missing from references"],
    ["references never cited", { "ai/features/F-002-two.md": featureTwo.replace("references: [F-1]", "references: [F-1, D-1]") }, "ai/features/F-002-two.md | F-2: references holds D-1, never cited"],
    ["one-way dependency", { "ai/features/F-001-one.md": featureOne.replace("used_by: [F-2]", "used_by: []") }, "ai/features/F-002-two.md | F-2 depends on F-1, missing from its used_by"],
    ["one-way used_by", { "ai/features/F-002-two.md": featureTwo.replace("depends_on: [F-1]", "depends_on: []") }, "ai/features/F-001-one.md | F-1 has F-2 in used_by, missing from its depends_on"],
    ["depends_on outside features", { "ai/features/F-002-two.md": featureTwo.replace("depends_on: [F-1]", "depends_on: [F-1, Q-1]") }, "ai/features/F-002-two.md | F-2: depends_on holds Q-1, which is not a feature"],
    ["question type", { "ai/issues/Q-001.md": issue.replace('"gap"', '"doubt"') }, 'ai/issues/Q-001.md | Q-1: type "doubt" (gap | ambiguity | contradiction)'],
    ["option count", { "ai/issues/Q-001.md": issue.replace("options: 2", "options: 3") }, "ai/issues/Q-001.md | Q-1: options is 3, the question has 2"],
    ["source reliability", { "ai/sources/S-001.md": source.replace('"verified"', '"sure"') }, 'ai/sources/S-001.md | S-1: reliability "sure" (verified | observed | cross-checked | single source | disputed | unsourced)'],
    ["source date", { "ai/sources/S-001.md": source.replace("2026-11-04", "yesterday") }, 'ai/sources/S-001.md | S-1: verified "yesterday" is not a date'],
    ["source ranks", { "ai/sources/S-001.md": source.replace("ranks: [1]", "ranks: [2]") }, "ai/sources/S-001.md | S-1: ranks [2] differ from the ranks of its sources [1]"],
  ])("%s", (_, changes, expected) => {
    expect(check(changes).errors).toContain(expected);
  });

  test("an active feature has acceptance criteria, not a provisional one", () => {
    const withoutCriteria = (feature: string) => feature.replace("acceptance: 1", "acceptance: 0").replace("- [ ] A1 criterion\n", "");
    expect(check({ "ai/features/F-002-two.md": withoutCriteria(featureTwo) }).errors).toContain("ai/features/F-002-two.md | F-2: rules or acceptance criteria missing");
    expect(check({ "ai/features/F-001-one.md": withoutCriteria(featureOne) }).errors).toEqual([]);
  });

  test("an option preceded by its subject counts as an option", () => {
    const changes = { "ai/issues/Q-001.md": issue.replace("- A: yes", "- For the name: A: yes") };
    expect(check(changes).errors).toEqual([]);
  });

  test("used_by is not a citation", () => {
    expect(check().errors.join()).not.toContain("missing from references");
  });

  test("a note on a dependency does not count as a link", () => {
    const changes = {
      "ai/features/F-002-two.md": featureTwo.replace("depends_on: [F-1]", 'depends_on: ["F-1 (counter, Q-1)"]').replace("references: [F-1]", "references: [F-1, Q-1]"),
      "ai/features/INDEX.md": VALID["ai/features/INDEX.md"].replace("Depends on: F-1", "Depends on: F-1 (counter, Q-1)"),
    };
    expect(check(changes).errors).toEqual([]);
  });

  test("an item that does not cite the question touching it is an error", () => {
    const changes = { "ai/features/F-001-one.md": featureOne.replace("references: [D-1, O-1, Q-1]", "references: [D-1, O-1]").replace("(D-1, Q-1)", "(D-1)") };
    expect(check(changes).errors).toContain("ai/features/F-001-one.md | F-1 does not reference Q-1");
  });
});

describe("indexes", () => {
  test.each([
    ["missing feature", "ai/features/INDEX.md", "# Index\n", "F-1 missing from the index"],
    ["different feature", "ai/features/INDEX.md", VALID["ai/features/INDEX.md"].replace("Rules: 1", "Rules: 5"), "entry of F-1 differs from its header"],
    ["missing scope", "ai/features/F-001-one.md", featureOne.replace('scope: "project"\n', ""), 'F-1: scope "missing" (project | secondary)'],
    ["different scope", "ai/features/INDEX.md", VALID["ai/features/INDEX.md"].replace("Scope: project", "Scope: secondary"), "entry of F-1 differs from its header"],
    ["different question", "ai/issues/INDEX.md", VALID["ai/issues/INDEX.md"].replace("Options: 2", "Options: —"), "entry of Q-1 differs from its header"],
    ["different source", "ai/sources/INDEX.md", VALID["ai/sources/INDEX.md"].replace("verified", "observed"), "entry of S-1 differs from its header"],
  ])("%s", (_, file, text, expected) => {
    expect(check({ [file]: text }).errors).toContain(`${file} | ${expected}`);
  });

  test("an entry without a card comes out as an orphan reference", () => {
    const text = `${VALID["ai/issues/INDEX.md"]}- **Q-9 · gap** — Gone.\n`;
    expect(check({ "ai/issues/INDEX.md": text }).errors).toContain("ai/issues/INDEX.md | orphan reference: Q-9 (l. 7)");
  });

  test('zero rules and zero options are written "—" in the index', () => {
    const changes = {
      "ai/issues/Q-001.md": issue.replace("options: 2", "options: 0").replace("- A: yes\n- B: no\n", "—\n"),
      "ai/issues/INDEX.md": VALID["ai/issues/INDEX.md"].replace("Options: 2", "Options: —"),
    };
    expect(check(changes).errors).toEqual([]);
  });

  test("an escaped title in the header reads as is in the index", () => {
    const changes = {
      "ai/sources/S-001.md": source.replace('"Source"', '"Base and `\\\\password`"'),
      "ai/sources/INDEX.md": VALID["ai/sources/INDEX.md"].replace("S-1 — Source", "S-1 — Base and `\\password`"),
    };
    expect(check(changes).errors).toEqual([]);
  });
});

describe("warnings", () => {
  test.each([
    ["item citing a question that does not touch it", { "ai/issues/Q-001.md": issue.replace("[F-1]", "[F-2]") }, "ai/features/F-001-one.md | F-1 cites Q-1, whose touches does not hold it"],
    ["question touching something other than an item", { "ai/issues/Q-001.md": issue.replace("[F-1]", "[F-1, O-global]") }, 'ai/issues/Q-001.md | Q-1 touches "O-global", which is not an item'],
    ["bare file number", { "CLAUDE.md": "Record it in 05.\n" }, 'CLAUDE.md | bare file number: "05" (l. 1)'],
    ["feature source outside S-n", { "ai/features/F-002-two.md": featureTwo.replace("sources: []", 'sources: ["NIST"]') }, 'ai/features/F-002-two.md | F-2: sources: "NIST" is not an S-n'],
    ['"verified" without enough rank', { "ai/sources/S-001.md": source.replace("ranks: [1]", "ranks: [3]").replace("- [1]", "- [3]") }, 'ai/sources/S-001.md | S-1: "verified" needs one rank-1 source or two rank-2 sources'],
    ['"cross-checked" on a single site', { "ai/sources/S-001.md": source.replace('"verified"', '"cross-checked"') }, 'ai/sources/S-001.md | S-1: "cross-checked" needs at least two independent sites'],
    ["knowledge line too long", { "ai/sources/S-001.md": `${source}\n## Knowledge\n\n${"x".repeat(801)}\n` }, 'ai/sources/S-001.md | S-1: a "Knowledge" line exceeds 800 characters: one fact per line'],
    ["session line too long", { "ai/session.md": `# Session\n\n${"x".repeat(301)}\n` }, "ai/session.md | line too long (l. 3, 301 characters): replace it, in 300 at most"],
    ["Foundation still to fill", { "CLAUDE.md": "- **the problem:** <to fill: what>\n- Stack: <to fill>\n" }, 'CLAUDE.md | 2 "to fill": the Foundation waits for the user; propose each text as before -> after'],
  ])("%s", (_, changes, expected) => {
    expect(check(changes).warnings).toContain(expected);
  });

  test("permanent context beyond its budget", () => {
    const { warnings } = check({ "CLAUDE.md": `@ai/session.md\n${"x".repeat(14_000)}\n` });
    expect(warnings.some((warning) => warning.startsWith("CLAUDE.md | permanent context: 14026 characters (CLAUDE.md and its @ imports) for a budget of 14000"))).toBe(true);
  });

  test("a date, a time or a file name are not flagged", () => {
    const changes = { "CLAUDE.md": "On 2026-11-04 at 09:05, see 05.md.\n" };
    expect(check(changes).warnings).toEqual([]);
  });

  test("a file may cite its own number, not another's", () => {
    const changes = { "ai/01-decisions.md": `# 01 — Decisions\n\n# 00\n\n${headed("D-1")}` };
    expect(check(changes).warnings).toEqual(['ai/01-decisions.md | bare file number: "00" (l. 3)']);
  });
});

describe("Claude's sources, isolated from the project", () => {
  test.each([
    ["decision", { "ai/01-decisions.md": `${headed("D-1")}See M-1.\n` }, "ai/01-decisions.md | D-1: cites M-1, a source of Claude's: it only serves Claude's tooling"],
    ["code rule", { "ai/05-code-guideline.md": `${headed("P-1")}See M-1.\n${headed("U-1")}${headed("C-1")}` }, "ai/05-code-guideline.md | P-1: cites M-1, a source of Claude's: it only serves Claude's tooling"],
    ["application code", { "lib/a.ts": "// M-1\n" }, "lib/a.ts | cites M-1, a source of Claude's: application code does not cite it"],
    ["Claude source citing a project source", { "ai/claude/sources/M-001.md": `${claudeSource}\nSee S-1.\n` }, "ai/claude/sources/M-001.md | M-1: cites S-1, against the direction of references"],
  ])("%s: error", (_, changes, expected) => {
    expect(check(changes).errors).toContain(expected);
  });

  test("a ritual and a Claude script cite it freely", () => {
    const changes = { "ai/04-rituals.md": `${headed("R-1")}See M-1 and \`ai/scripts/tool.mts\`.\n`, "ai/scripts/tool.mts": "// M-1\n" };
    expect(check(changes).errors).toEqual([]);
  });

  test("a Claude source is verified again after 180 days", () => {
    expect(check({}, { now: new Date("2027-06-01T12:00:00") }).warnings).toContain("ai/claude/sources/M-001.md | M-1: verified on 2026-11-04; tooling changes fast: verify it again or remove it");
  });
});

describe("source authority", () => {
  const thirdRank = { "ai/sources/S-001.md": source.replace("ranks: [1]", "ranks: [3]").replace("- [1] Official text", "- [3] Blog post").replace('"verified"', '"single source"'), "ai/sources/INDEX.md": VALID["ai/sources/INDEX.md"].replace("verified", "single source") };

  test("a decision does not rest on a rank-3 source alone", () => {
    const changes = { ...thirdRank, "ai/01-decisions.md": `${headed("D-1")}Builds on S-1.\n` };
    expect(check(changes).errors).toContain("ai/01-decisions.md | D-1 rests on S-1, rank 3 only: trace it back to a rank 1 or 2 source");
  });

  test("a feature on a rank-3 source alone is flagged", () => {
    const changes = { ...thirdRank, "ai/features/F-002-two.md": featureTwo.replace("references: [F-1]", "references: [F-1, S-1]").replace("- rule (F-1 R1)", "- rule (F-1 R1, S-1)") };
    expect(check(changes).warnings).toContain("ai/features/F-002-two.md | F-2 rests on S-1, rank 3 only: trace it back to a rank 1 or 2 source");
  });

  test("a rank 1 on a practitioners' site is flagged", () => {
    const changes = { "ai/sources/S-001.md": source.replace("- [1] Official text", "- [1] [Answer](https://stackoverflow.com/q/1)") };
    expect(check(changes).warnings).toContain("ai/sources/S-001.md | S-1: rank 1 on stackoverflow.com, a practitioners' or second-hand site: rank 3, trace it back to its primary source");
  });
});

describe("safety fence of Claude's scripts", () => {
  test.each([
    ["process", 'import { exec } from "node:child_process";\n', "network or spawned process"],
    ["network", 'await fetch("https://example.org");\n', "network"],
    ["home folder", 'import { homedir } from "node:os";\nhomedir();\n', "home folder, outside the project"],
    ["secret", 'readFileSync(".env");\n', ".env file"],
  ])("%s: error", (_, text, what) => {
    expect(check({ "ai/scripts/tool.mts": text }).errors).toContain(`ai/scripts/tool.mts | safety fence: ${what}; only the user can allow it`);
  });

  test("an application script and tests are not subject to it", () => {
    const changes = {
      "scripts/tool.mts": 'await fetch("https://example.org");\n',
      "ai/scripts/tool.test.mts": 'import { exec } from "node:child_process";\n',
    };
    expect(check(changes).errors).toEqual([]);
  });
});

describe("selection", () => {
  // The test files were just written: a hundred days later, nothing has used them.
  const later = new Date(Date.now() + 100 * DAY_MS);
  const candidates = (warnings: string[]) => warnings.filter((warning) => warning.includes("candidate for extinction"));

  test("what no living item reaches and nobody uses comes out after the threshold", () => {
    const found = candidates(check({}, { now: later }).warnings);
    expect(found.map((warning) => warning.split(": ")[0])).toEqual(["ai/sources/S-001.md | S-1", "ai/claude/sources/M-001.md | M-1"]);
    expect(found[0]).toMatch(/unused for \d+ d: candidate for extinction \(for Claude to remove, after npm run ai:bin\)$/);
  });

  test("a decision nothing reaches is proposed for removal to the user", () => {
    const found = candidates(check({ "ai/01-decisions.md": `${headed("D-1")}${headed("D-2")}` }, { now: later }).warnings);
    expect(found.some((warning) => warning.startsWith("ai/01-decisions.md | D-2:") && warning.endsWith("(to propose for removal to the user)"))).toBe(true);
  });

  test("a recent use, measured by the usage ledger, keeps alive", () => {
    const ledger = { files: { "ai/sources/S-001.md": { read: 1, write: 0, last: later.toLocaleDateString("sv") } }, runs: {} };
    expect(candidates(check({}, { now: later, ledger }).warnings).join()).not.toContain("S-1");
  });

  test("a secondary feature lives if code cites it, and a question through the item citing it", () => {
    expect(candidates(check({}, { now: later }).warnings).join()).not.toMatch(/F-2|Q-1|D-1/);
  });
});

describe("trials of Claude's automations", () => {
  const registry = (selection: string) =>
    `# 04\n\n## Project\n\n${headed("R-1")}\n## Claude's automations\n\n### R-2\n\n- **Commands:** \`npm run ai:bin\`\n${selection}- **Status:** provisional\n`;

  test("without Selection: error", () => {
    expect(check({ "ai/04-rituals.md": registry("") }).errors).toContain('ai/04-rituals.md | R-2: Selection missing ("trial until YYYY-MM-DD; measure: …" or "kept on YYYY-MM-DD: evidence")');
  });

  test("an ended trial is flagged with its measured use", () => {
    const ledger = { files: {}, runs: { "npm:ai:bin": { count: 4, last: "2026-11-10" } } };
    const changes = { "ai/04-rituals.md": registry("- **Selection:** trial until 2026-11-01; measure: copies made\n") };
    expect(check(changes, { ledger }).warnings).toContain("ai/04-rituals.md | R-2: trial ended on 2026-11-01 (measured use: 4): keep it with its evidence, or remove it");
  });

  test("a running trial says nothing, a kept automation is reviewed after its delay", () => {
    expect(check({ "ai/04-rituals.md": registry("- **Selection:** trial until 2027-01-01; measure: copies\n") }).warnings).toEqual([]);
    expect(check({ "ai/04-rituals.md": registry("- **Selection:** kept on 2026-01-01: evidence\n") }).warnings).toContain("ai/04-rituals.md | R-2: kept on 2026-01-01, to review (measured use: 0)");
  });
});

describe("report", () => {
  test("empty, it fits on one line; long, it points to the details", () => {
    const many = { errors: Array.from({ length: 25 }, (_, number) => ({ file: "CLAUDE.md", message: `e${number}` })), warnings: [], provisional: [] };
    expect(formatReport({ errors: [], warnings: [], provisional: [] })).toBe("0 error(s), 0 warning(s)");
    expect(formatReport(many)).toContain("… 5 more: npm run check:ai -- --details");
    expect(formatReport(many, true)).not.toContain("more:");
  });
});

describe("onboarding and .gitignore", () => {
  const AI_LINES = "node_modules/\n/ai/\nCLAUDE.md\n.claude/\n";

  test("a project whose .gitignore lets Claude's tooling through: flagged", () => {
    expect(check({ ".gitignore": "node_modules/\nai/\n" }).warnings).toContain('.gitignore | does not exclude CLAUDE.md, .claude: Claude\'s tooling would go into git, unless the team chose to version it ("AI" lines of gitignore.project)');
    expect(check({ ".gitignore": AI_LINES }).warnings.filter((line) => line.startsWith(".gitignore"))).toEqual([]);
  });

  test("the shell itself, with gitignore.project and an empty Foundation: nothing left over", () => {
    const shell = check({ ".gitignore": "node_modules/\n", "gitignore.project": AI_LINES, "CLAUDE.md": "<to fill>\n" });
    expect(shell.errors).toEqual([]);
    expect(shell.warnings.filter((line) => line.startsWith("gitignore.project"))).toEqual([]);
  });

  test("Foundation filled and gitignore.project still there: flagged", () => {
    expect(check({ "gitignore.project": AI_LINES }).warnings).toContain('gitignore.project | left after onboarding: rename it to .gitignore (new project) or merge its "AI" lines into .gitignore, then remove it');
  });

  test("a typo in the name: flagged, not .ignore", () => {
    const { warnings } = check({ ".gitignore": AI_LINES, ".gitgnore": AI_LINES, ".ignore": "!ai/\n" });
    expect(warnings).toContain(".gitgnore | name close to .gitignore, no effect on git: rename or remove it");
    expect(warnings.filter((line) => line.startsWith(".ignore"))).toEqual([]);
  });

  test("onboarding is flagged as long as its file exists", () => {
    expect(check({ "ai/onboarding.md": "# Onboarding\n" }).warnings).toContain("ai/onboarding.md | onboarding in progress: follow it before any other task");
  });
});
