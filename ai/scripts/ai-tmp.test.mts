import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { PURGED, isStale, purge } from "./ai-tmp.mts";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("purge des fichiers jetables", () => {
  let dir = "";

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  test("ne purge que ai/tmp/claude/ (24 h), jamais la racine de ai/tmp/", () => {
    expect(PURGED.map(({ dir, maxAgeMs }) => [dir.replaceAll("\\", "/"), maxAgeMs / DAY_MS])).toEqual([["ai/tmp/claude", 1]]);
  });

  test("une entrée au-delà de son âge est périmée, une plus récente non", () => {
    const now = Date.now();
    expect(isStale(now - DAY_MS - 1, now, DAY_MS)).toBe(true);
    expect(isStale(now - 1000, now, DAY_MS)).toBe(false);
  });

  test("ne supprime que les entrées périmées, dossiers compris", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "ai-tmp-"));
    const old = new Date(Date.now() - DAY_MS - 60_000);
    await writeFile(path.join(dir, "recent.png"), "");
    await writeFile(path.join(dir, "old.mts"), "");
    await mkdir(path.join(dir, "old-folder"));
    await utimes(path.join(dir, "old.mts"), old, old);
    await utimes(path.join(dir, "old-folder"), old, old);
    expect(await purge(dir, DAY_MS)).toEqual({ removed: 2, kept: 1 });
  });

  test("--tout vide le dossier sans attendre", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "ai-tmp-"));
    await writeFile(path.join(dir, "recent.png"), "");
    expect(await purge(dir, DAY_MS, { all: true })).toEqual({ removed: 1, kept: 0 });
  });

  test("un dossier absent ne fait rien", async () => {
    expect(await purge(path.join(tmpdir(), "absent-ai-tmp"), DAY_MS)).toEqual({ removed: 0, kept: 0 });
  });
});
