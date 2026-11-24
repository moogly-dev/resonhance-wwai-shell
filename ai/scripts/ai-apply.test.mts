import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyBatch } from "./ai-apply.mts";

const DATE = new Date("2026-11-05T12:00:00");
const line = "- [3] [Link](https://example.org)";
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ai-apply-"));
  for (const dir of ["sources", "issues", "bin", "tmp"]) mkdirSync(join(root, "ai", dir), { recursive: true });
  writeFileSync(join(root, "ai/sources/S-009.md"), "x");
  writeFileSync(join(root, "ai/sources/INDEX.md"), "# Sources\n\n## One\n\n- **S-9 — Old** · verified\n\n## Two\n\n- **S-8 — Other** · verified\n");
  writeFileSync(join(root, "ai/issues/Q-012.md"), "x");
  writeFileSync(join(root, "ai/issues/INDEX.md"), "# Questions\n");
  writeFileSync(join(root, "ai/card.md"), "one two two");
});
afterEach(() => rmSync(root, { recursive: true }));

describe("applyBatch", () => {
  it("numbers, writes the cards and keeps the indexes", () => {
    applyBatch(
      {
        subject: "trial",
        sources: [{ title: "Title", section: "One", knowledge: ["Fact one.", "Fact two."], lines: [line], note: "One origin.", reliability: "single source" }],
        questions: [{ summary: "Summary", touches: ["F-1"], statement: "Statement", options: ["A: one"] }],
      },
      root,
      DATE,
    );
    expect(readFileSync(join(root, "ai/sources/S-010.md"), "utf8")).toContain("id: S-10\n");
    expect(readFileSync(join(root, "ai/sources/S-010.md"), "utf8")).toContain("ranks: [3]\n");
    expect(readFileSync(join(root, "ai/sources/S-010.md"), "utf8")).toContain("- Fact one.\n- Fact two.\n");
    expect(readFileSync(join(root, "ai/sources/INDEX.md"), "utf8")).toContain("- **S-9 — Old** · verified\n- **S-10 — Title** · single source\n\n## Two");
    expect(readFileSync(join(root, "ai/issues/INDEX.md"), "utf8")).toContain("- **Q-13 · gap** — Summary\n  - Touches: F-1\n  - Options: 1\n  - File: `Q-013.md`");
    expect(existsSync(join(root, "ai/bin/2026-11-05-trial/sources/INDEX.md"))).toBe(true);
    expect(existsSync(join(root, "ai/bin/2026-11-05-trial/card.md"))).toBe(false);
  });

  it("numbers from one in a blank project", () => {
    const blank = mkdtempSync(join(tmpdir(), "ai-apply-"));
    try {
      mkdirSync(join(blank, "ai", "issues"), { recursive: true });
      writeFileSync(join(blank, "ai/issues/INDEX.md"), "# Questions\n");
      applyBatch({ subject: "first", questions: [{ summary: "Summary", touches: [], statement: "Statement", options: [] }] }, blank, DATE);
      expect(readFileSync(join(blank, "ai/issues/Q-001.md"), "utf8")).toContain("id: Q-1\n");
    } finally {
      rmSync(blank, { recursive: true });
    }
  });

  it("files a Claude source apart, as M-n, with its own index", () => {
    mkdirSync(join(root, "ai/claude/sources"), { recursive: true });
    writeFileSync(join(root, "ai/claude/sources/INDEX.md"), "# Claude's sources\n\n## 1. Tools\n");
    const claude = { title: "Hooks", section: "1. Tools", knowledge: ["Fact."], lines: ["- [1] [Doc](https://example.org)"], note: "Read.", reliability: "verified", for: "claude" as const };
    applyBatch({ subject: "claude", sources: [claude, { ...claude, title: "Project", section: "One", for: undefined }] }, root, DATE);
    expect(readFileSync(join(root, "ai/claude/sources/M-001.md"), "utf8")).toContain("id: M-1\n");
    expect(readFileSync(join(root, "ai/claude/sources/INDEX.md"), "utf8")).toContain("## 1. Tools\n- **M-1 — Hooks** · verified\n");
    expect(readFileSync(join(root, "ai/sources/S-010.md"), "utf8")).toContain("id: S-10\n");
  });

  it("refuses an unknown section", () => {
    expect(() => applyBatch({ subject: "section", sources: [{ title: "T", section: "Missing", knowledge: ["F."], lines: [line], note: "n", reliability: "single source" }] }, root, DATE)).toThrow("unknown section");
  });

  it("writes nothing if a replacement is not found or ambiguous", () => {
    for (const from of ["missing", "two"]) {
      expect(() => applyBatch({ subject: `trial-${from}`, write: [{ file: "ai/other.md", content: "y" }], replace: [{ file: "ai/card.md", from, to: "z" }] }, root, DATE)).toThrow("found");
    }
    expect(existsSync(join(root, "ai/other.md"))).toBe(false);
    expect(readFileSync(join(root, "ai/card.md"), "utf8")).toBe("one two two");
    expect(existsSync(join(root, "ai/bin/2026-11-05-trial-missing"))).toBe(false);
  });

  it("keeps a `$` of the replacement as is and refuses to write outside ai or in ai/bin", () => {
    applyBatch({ subject: "dollar", replace: [{ file: "ai/card.md", from: "one", to: "$& 5 $" }] }, root, DATE);
    expect(readFileSync(join(root, "ai/card.md"), "utf8")).toBe("$& 5 $ two two");
    for (const file of ["package.json", "ai/../x.md", "ai/bin/x.md"]) {
      expect(() => applyBatch({ subject: "outside", write: [{ file, content: "y" }] }, root, DATE)).toThrow("outside ai");
    }
  });

  it("removes a file after its copy and refuses a missing file", () => {
    applyBatch({ subject: "removal", delete: ["ai/card.md"] }, root, DATE);
    expect(existsSync(join(root, "ai/card.md"))).toBe(false);
    expect(readFileSync(join(root, "ai/bin/2026-11-05-removal/card.md"), "utf8")).toBe("one two two");
    expect(() => applyBatch({ subject: "missing", delete: ["ai/missing.md"] }, root, DATE)).toThrow("not found");
  });
});
