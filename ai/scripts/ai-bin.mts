// Copy before changing (CLAUDE.md): `ai/` is out of git, this copy stands in for history.
// Usage, in Git Bash: npm run ai:bin -- <subject> [paths]; without a path, all of `ai/` except `ai/bin/` and `ai/tmp/`.
// Never replaces an existing copy: the same subject, the same day, fails.
// Keeps the KEEP most recent copies and removes the others: a safety net to go back, not an archive
// (the backup of the whole project, stated in the Foundation of CLAUDE.md, keeps the rest).

import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export const KEEP = 10;

export function pruneBin(root = ".", keep = KEEP) {
  const bin = join(root, "ai", "bin");
  if (!existsSync(bin)) return [];
  const copies = readdirSync(bin)
    // A copy without a leading date counts as the oldest.
    .map((name) => ({ name, day: /^\d{4}-\d{2}-\d{2}/.exec(name)?.[0] ?? "", time: statSync(join(bin, name)).mtimeMs }))
    .sort((a, b) => b.day.localeCompare(a.day) || b.time - a.time);
  const removed = copies.slice(keep).map(({ name }) => name);
  for (const name of removed) rmSync(join(bin, name), { recursive: true, force: true });
  return removed;
}

export function copyToBin(subject: string | undefined, paths: string[] = [], root = ".", date = new Date()) {
  if (!subject) throw new Error("subject missing: npm run ai:bin -- <subject> [paths]");
  if (!/^[\w-]+$/.test(subject)) throw new Error(`invalid subject: ${subject}`);
  const target = join("ai", "bin", `${date.toLocaleDateString("sv")}-${subject}`);
  if (existsSync(join(root, target))) throw new Error(`copy already there: ${target}`);

  const sources = paths.length ? paths : readdirSync(join(root, "ai")).filter((name) => name !== "bin" && name !== "tmp").map((name) => `ai/${name}`);
  for (const source of sources) {
    if (!source.startsWith("ai/") || source.includes("..")) throw new Error(`outside ai: ${source}`);
    cpSync(join(root, source), join(root, target, source.slice("ai/".length)), { recursive: true });
  }
  pruneBin(root);
  return target;
}

if (import.meta.main) {
  const [subject, ...paths] = process.argv.slice(2);
  // `--prune` alone: removes the copies beyond the KEEP most recent, without copying anything.
  if (subject === "--prune") console.log(`removed: ${pruneBin().length}`);
  else console.log(copyToBin(subject, paths));
}
