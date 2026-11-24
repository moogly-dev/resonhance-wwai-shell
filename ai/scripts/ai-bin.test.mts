import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { copyToBin, pruneBin } from "./ai-bin.mts";

const DATE = new Date("2026-11-05T12:00:00Z");
const BIN = join("ai", "bin", "2026-11-05-trial");

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

const project = () => {
  const root = mkdtempSync(join(tmpdir(), "ai-bin-"));
  roots.push(root);
  mkdirSync(join(root, "ai", "features"), { recursive: true });
  mkdirSync(join(root, "ai", "bin", "old"), { recursive: true });
  writeFileSync(join(root, "ai", "session.md"), "session\n");
  writeFileSync(join(root, "ai", "improvements.md"), "improvements\n");
  writeFileSync(join(root, "ai", "features", "card.md"), "card\n");
  return root;
};

describe("copy to ai/bin", () => {
  test("without a path: all of ai, except older copies", () => {
    const root = project();
    expect(copyToBin("trial", [], root, DATE)).toBe(BIN);
    expect(readFileSync(join(root, BIN, "features", "card.md"), "utf8")).toBe("card\n");
    expect(existsSync(join(root, BIN, "session.md"))).toBe(true);
    expect(existsSync(join(root, BIN, "bin"))).toBe(false);
  });

  test("with paths: those only, at their relative place", () => {
    const root = project();
    copyToBin("trial", ["ai/features"], root, DATE);
    expect(existsSync(join(root, BIN, "features", "card.md"))).toBe(true);
    expect(existsSync(join(root, BIN, "session.md"))).toBe(false);
  });

  test("an existing copy is never replaced", () => {
    const root = project();
    copyToBin("trial", [], root, DATE);
    expect(() => copyToBin("trial", [], root, DATE)).toThrow("copy already there");
  });

  test("only the most recent copies remain", () => {
    const root = project();
    for (const day of ["01", "02", "03", "04"]) mkdirSync(join(root, "ai", "bin", `2026-11-${day}-subject`));
    expect(pruneBin(root, 2).sort()).toEqual(["2026-11-01-subject", "2026-11-02-subject", "old"]);
    expect(existsSync(join(root, "ai", "bin", "2026-11-04-subject"))).toBe(true);
    expect(existsSync(join(root, "ai", "bin", "2026-11-03-subject"))).toBe(true);
  });

  test("missing subject or path outside ai: refused", () => {
    const root = project();
    expect(() => copyToBin(undefined, [], root, DATE)).toThrow("subject missing");
    expect(() => copyToBin("trial", ["CLAUDE.md"], root, DATE)).toThrow("outside ai");
    expect(() => copyToBin("trial", [["ai", "..", "..", "secret"].join("/")], root, DATE)).toThrow("outside ai");
    expect(() => copyToBin("../../trial", [], root, DATE)).toThrow("invalid subject");
  });
});
