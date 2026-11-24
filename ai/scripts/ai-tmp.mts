// SessionStart hook: empties `ai/tmp/claude/`, Claude's disposable files (trial scripts, captures), of what is older than 24 h.
// The root of `ai/tmp/` belongs to the user and is never purged. `--all` empties the folder without waiting.

import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const HOUR_MS = 60 * 60 * 1000;

export const PURGED = [{ dir: path.join("ai", "tmp", "claude"), maxAgeMs: 24 * HOUR_MS }];

export const isStale = (modifiedMs: number, nowMs: number, maxAgeMs: number) => nowMs - modifiedMs > maxAgeMs;

export async function purge(dir: string, maxAgeMs: number, { all = false, nowMs = Date.now() } = {}) {
  const names = await readdir(dir).catch(() => [] as string[]);
  let removed = 0;
  for (const name of names) {
    const entry = path.join(dir, name);
    if (all || isStale((await stat(entry)).mtimeMs, nowMs, maxAgeMs)) {
      await rm(entry, { recursive: true, force: true });
      removed++;
    }
  }
  return { removed, kept: names.length - removed };
}

if (import.meta.main) {
  const all = process.argv.includes("--all");
  for (const { dir, maxAgeMs } of PURGED) {
    const { removed, kept } = await purge(dir, maxAgeMs, { all });
    if (removed) console.log(`${dir.replaceAll("\\", "/")}/: ${removed} stale entr${removed > 1 ? "ies" : "y"} removed, ${kept} kept.`);
  }
}
