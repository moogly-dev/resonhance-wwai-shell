import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { copyToBin, pruneBin } from "./ai-bin.mts";

const DATE = new Date("2026-11-05T12:00:00Z");
const BIN = join("ai", "bin", "2026-11-05-essai");

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

const project = () => {
  const root = mkdtempSync(join(tmpdir(), "ai-bin-"));
  roots.push(root);
  mkdirSync(join(root, "ai", "features"), { recursive: true });
  mkdirSync(join(root, "ai", "bin", "ancienne"), { recursive: true });
  writeFileSync(join(root, "ai", "session.md"), "session\n");
  writeFileSync(join(root, "ai", "mini-hub.md"), "hub\n");
  writeFileSync(join(root, "ai", "features", "fiche.md"), "fiche\n");
  return root;
};

describe("copie dans ai/bin", () => {
  test("sans chemin : tout ai, sauf les anciennes copies", () => {
    const root = project();
    expect(copyToBin("essai", [], root, DATE)).toBe(BIN);
    expect(readFileSync(join(root, BIN, "features", "fiche.md"), "utf8")).toBe("fiche\n");
    expect(existsSync(join(root, BIN, "session.md"))).toBe(true);
    expect(existsSync(join(root, BIN, "bin"))).toBe(false);
  });

  test("avec des chemins : eux seuls, à leur place relative", () => {
    const root = project();
    copyToBin("essai", ["ai/features"], root, DATE);
    expect(existsSync(join(root, BIN, "features", "fiche.md"))).toBe(true);
    expect(existsSync(join(root, BIN, "session.md"))).toBe(false);
  });

  test("une copie existante n'est jamais remplacée", () => {
    const root = project();
    copyToBin("essai", [], root, DATE);
    expect(() => copyToBin("essai", [], root, DATE)).toThrow("copie déjà présente");
  });

  test("seules les copies les plus récentes restent", () => {
    const root = project();
    for (const day of ["01", "02", "03", "04"]) mkdirSync(join(root, "ai", "bin", `2026-11-${day}-sujet`));
    expect(pruneBin(root, 2).sort()).toEqual(["2026-11-01-sujet", "2026-11-02-sujet", "ancienne"]);
    expect(existsSync(join(root, "ai", "bin", "2026-11-04-sujet"))).toBe(true);
    expect(existsSync(join(root, "ai", "bin", "2026-11-03-sujet"))).toBe(true);
  });

  test("sujet manquant ou chemin hors de ai : refus", () => {
    const root = project();
    expect(() => copyToBin(undefined, [], root, DATE)).toThrow("sujet manquant");
    expect(() => copyToBin("essai", ["CLAUDE.md"], root, DATE)).toThrow("hors de ai");
    expect(() => copyToBin("essai", [["ai", "..", "..", "secret"].join("/")], root, DATE)).toThrow("hors de ai");
    expect(() => copyToBin("../../essai", [], root, DATE)).toThrow("sujet invalide");
  });
});
