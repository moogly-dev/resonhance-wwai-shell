// Copie avant modification (CLAUDE.md) : `ai/` est hors de git, cette copie tient lieu d'historique.
// Usage, dans Git Bash : npm run ai:bin -- <sujet> [chemins] ; sans chemin, tout `ai/` sauf `ai/bin/` et `ai/tmp/`.
// Ne remplace jamais une copie existante : un même sujet, le même jour, échoue.
// Garde les KEEP copies les plus récentes et retire les autres : un filet pour revenir en arrière, pas une archive
// (la sauvegarde du projet entier, dite au Socle de CLAUDE.md, garde le reste).

import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export const KEEP = 10;

export function pruneBin(root = ".", keep = KEEP) {
  const bin = join(root, "ai", "bin");
  if (!existsSync(bin)) return [];
  const copies = readdirSync(bin)
    // Une copie sans date en tête passe pour la plus ancienne.
    .map((name) => ({ name, day: /^\d{4}-\d{2}-\d{2}/.exec(name)?.[0] ?? "", time: statSync(join(bin, name)).mtimeMs }))
    .sort((a, b) => b.day.localeCompare(a.day) || b.time - a.time);
  const removed = copies.slice(keep).map(({ name }) => name);
  for (const name of removed) rmSync(join(bin, name), { recursive: true, force: true });
  return removed;
}

export function copyToBin(subject: string | undefined, paths: string[] = [], root = ".", date = new Date()) {
  if (!subject) throw new Error("sujet manquant : npm run ai:bin -- <sujet> [chemins]");
  if (!/^[\w-]+$/.test(subject)) throw new Error(`sujet invalide : ${subject}`);
  const target = join("ai", "bin", `${date.toLocaleDateString("sv")}-${subject}`);
  if (existsSync(join(root, target))) throw new Error(`copie déjà présente : ${target}`);

  const sources = paths.length ? paths : readdirSync(join(root, "ai")).filter((name) => name !== "bin" && name !== "tmp").map((name) => `ai/${name}`);
  for (const source of sources) {
    if (!source.startsWith("ai/") || source.includes("..")) throw new Error(`hors de ai : ${source}`);
    cpSync(join(root, source), join(root, target, source.slice("ai/".length)), { recursive: true });
  }
  pruneBin(root);
  return target;
}

if (import.meta.main) {
  const [subject, ...paths] = process.argv.slice(2);
  // `--ranger` seul : retire les copies au-delà des KEEP plus récentes, sans rien copier.
  if (subject === "--ranger") console.log(`retirées : ${pruneBin().length}`);
  else console.log(copyToBin(subject, paths));
}
