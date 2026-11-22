import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyLot } from "./ai-apply.mts";

const DATE = new Date("2026-11-05T12:00:00");
const line = "- [3] [Lien](https://exemple.fr)";
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ai-apply-"));
  for (const dir of ["sources", "issues", "bin", "tmp"]) mkdirSync(join(root, "ai", dir), { recursive: true });
  writeFileSync(join(root, "ai/sources/S-009.md"), "x");
  writeFileSync(join(root, "ai/sources/INDEX.md"), "# Sources\n\n## Un\n\n- **S-9 — Ancienne** · vérifié\n\n## Deux\n\n- **S-8 — Autre** · vérifié\n");
  writeFileSync(join(root, "ai/issues/Q-012.md"), "x");
  writeFileSync(join(root, "ai/issues/INDEX.md"), "# Questions\n");
  writeFileSync(join(root, "ai/fiche.md"), "un deux deux");
});
afterEach(() => rmSync(root, { recursive: true }));

describe("applyLot", () => {
  it("numérote, écrit les fiches et tient les index", () => {
    applyLot(
      {
        subject: "essai",
        sources: [{ title: "Titre", section: "Un", savoir: ["Fait un.", "Fait deux."], lines: [line], note: "Une origine.", reliability: "une source" }],
        questions: [{ summary: "Résumé", touches: ["F-1"], enonce: "Énoncé", options: ["A : un"] }],
      },
      root,
      DATE,
    );
    expect(readFileSync(join(root, "ai/sources/S-010.md"), "utf8")).toContain("id: S-10\n");
    expect(readFileSync(join(root, "ai/sources/S-010.md"), "utf8")).toContain("ranks: [3]\n");
    expect(readFileSync(join(root, "ai/sources/S-010.md"), "utf8")).toContain("- Fait un.\n- Fait deux.\n");
    expect(readFileSync(join(root, "ai/sources/INDEX.md"), "utf8")).toContain("- **S-9 — Ancienne** · vérifié\n- **S-10 — Titre** · une source\n\n## Deux");
    expect(readFileSync(join(root, "ai/issues/INDEX.md"), "utf8")).toContain("- **Q-13 · lacune** — Résumé\n  - Touche : F-1\n  - Options : 1\n  - Fichier : `Q-013.md`");
    expect(existsSync(join(root, "ai/bin/2026-11-05-essai/sources/INDEX.md"))).toBe(true);
    expect(existsSync(join(root, "ai/bin/2026-11-05-essai/fiche.md"))).toBe(false);
  });

  it("numérote à partir de un dans un projet vierge", () => {
    const blank = mkdtempSync(join(tmpdir(), "ai-apply-"));
    try {
      mkdirSync(join(blank, "ai", "issues"), { recursive: true });
      writeFileSync(join(blank, "ai/issues/INDEX.md"), "# Questions\n");
      applyLot({ subject: "premiere", questions: [{ summary: "Résumé", touches: [], enonce: "Énoncé", options: [] }] }, blank, DATE);
      expect(readFileSync(join(blank, "ai/issues/Q-001.md"), "utf8")).toContain("id: Q-1\n");
    } finally {
      rmSync(blank, { recursive: true });
    }
  });

  it("range une source de Claude à part, en M-n, avec son propre index", () => {
    mkdirSync(join(root, "ai/claude/sources"), { recursive: true });
    writeFileSync(join(root, "ai/claude/sources/INDEX.md"), "# Sources de Claude\n\n## 1. Outils\n");
    const claude = { title: "Hooks", section: "1. Outils", savoir: ["Fait."], lines: ["- [1] [Doc](https://exemple.org)"], note: "Lue.", reliability: "vérifié", for: "claude" as const };
    applyLot({ subject: "claude", sources: [claude, { ...claude, title: "Projet", section: "Un", for: undefined }] }, root, DATE);
    expect(readFileSync(join(root, "ai/claude/sources/M-001.md"), "utf8")).toContain("id: M-1\n");
    expect(readFileSync(join(root, "ai/claude/sources/INDEX.md"), "utf8")).toContain("## 1. Outils\n- **M-1 — Hooks** · vérifié\n");
    expect(readFileSync(join(root, "ai/sources/S-010.md"), "utf8")).toContain("id: S-10\n");
  });

  it("refuse une section inconnue", () => {
    expect(() => applyLot({ subject: "section", sources: [{ title: "T", section: "Absente", savoir: ["F."], lines: [line], note: "n", reliability: "une source" }] }, root, DATE)).toThrow("section inconnue");
  });

  it("n'écrit rien si un remplacement est introuvable ou ambigu", () => {
    for (const from of ["absent", "deux"]) {
      expect(() => applyLot({ subject: `essai-${from}`, write: [{ file: "ai/autre.md", content: "y" }], replace: [{ file: "ai/fiche.md", from, to: "z" }] }, root, DATE)).toThrow("trouvé");
    }
    expect(existsSync(join(root, "ai/autre.md"))).toBe(false);
    expect(readFileSync(join(root, "ai/fiche.md"), "utf8")).toBe("un deux deux");
    expect(existsSync(join(root, "ai/bin/2026-11-05-essai-absent"))).toBe(false);
  });

  it("garde un `$` du remplacement tel quel et refuse d'écrire hors de ai ou dans ai/bin", () => {
    applyLot({ subject: "dollar", replace: [{ file: "ai/fiche.md", from: "un", to: "$& 5 $" }] }, root, DATE);
    expect(readFileSync(join(root, "ai/fiche.md"), "utf8")).toBe("$& 5 $ deux deux");
    for (const file of ["package.json", "ai/../x.md", "ai/bin/x.md"]) {
      expect(() => applyLot({ subject: "hors", write: [{ file, content: "y" }] }, root, DATE)).toThrow("hors de ai");
    }
  });

  it("retire un fichier après sa copie et refuse un fichier absent", () => {
    applyLot({ subject: "retrait", delete: ["ai/fiche.md"] }, root, DATE);
    expect(existsSync(join(root, "ai/fiche.md"))).toBe(false);
    expect(readFileSync(join(root, "ai/bin/2026-11-05-retrait/fiche.md"), "utf8")).toBe("un deux deux");
    expect(() => applyLot({ subject: "absent", delete: ["ai/absent.md"] }, root, DATE)).toThrow("introuvable");
  });
});
