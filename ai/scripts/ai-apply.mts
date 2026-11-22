// Applique un lot de modifications à `ai/`, en remplacement des scripts jetables.
// Usage, dans Git Bash : npm run ai:apply -- ai/tmp/lot.json, puis npm run check:ai.
// Vérifie tout le lot, copie dans `ai/bin/` les fichiers touchés, puis écrit : un remplacement introuvable n'écrit rien du tout.
// Numérote seul les sources (S du projet, M de Claude) et les questions, et tient leurs index.

import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { copyToBin } from "./ai-bin.mts";

export type Lot = {
  subject: string;
  // `savoir` : un fait par ligne, pour qu'une recherche ramène le fait et non tout un paragraphe. `section` : un titre de l'index des sources visé.
  // `reliability` : l'échelle de `ai/sources/INDEX.md`. Les reprises d'une même dépêche comptent pour une source.
  // `for: "claude"` : une source qui ne sert que Claude, rangée à part dans `ai/claude/sources/` (M-n).
  sources?: { title: string; section: string; savoir: string[]; lines: string[]; note: string; reliability: string; verified?: string; for?: "claude" }[];
  questions?: { summary: string; touches: string[]; enonce: string; options: string[]; type?: string; conflicts?: string[] }[];
  // `from` doit figurer exactement une fois dans `file`.
  replace?: { file: string; from: string; to: string }[];
  write?: { file: string; content: string }[];
  append?: { file: string; text: string }[];
  // Fichiers retirés après leur copie dans `ai/bin/` : une source fusionnée dans une autre.
  delete?: string[];
};

const nextNumber = (root: string, dir: string, prefix: string) =>
  Math.max(
    0,
    ...(existsSync(join(root, "ai", dir)) ? readdirSync(join(root, "ai", dir)) : []).map((name) => Number(new RegExp(`^${prefix}-(\\d+)\\.md$`).exec(name)?.[1] ?? 0)),
  ) + 1;

const inAi = (file: string) => {
  if (!file.startsWith("ai/") || file.includes("..") || file.startsWith("ai/bin/")) throw new Error(`hors de ai : ${file}`);
  return file;
};

export function applyLot(lot: Lot, root = ".", date = new Date()) {
  const day = date.toLocaleDateString("sv");
  const files = new Map<string, string>();
  const read = (file: string) => {
    if (!files.has(file)) files.set(file, existsSync(join(root, file)) ? readFileSync(join(root, file), "utf8").replaceAll("\r\n", "\n") : "");
    return files.get(file) as string;
  };
  const append = (file: string, text: string) => files.set(file, `${read(file).trimEnd()}\n${text}\n`);

  const bases = { S: { dir: "sources", next: nextNumber(root, "sources", "S") }, M: { dir: "claude/sources", next: nextNumber(root, "claude/sources", "M") } };
  for (const { title, savoir, lines, note, reliability, section, verified = day, for: owner } of lot.sources ?? []) {
    if (!reliability) throw new Error(`source « ${title} » : fiabilité manquante`);
    const ranks = [...new Set(lines.map((line) => /^- \[([123])\]/.exec(line)?.[1]))].sort();
    if (ranks.includes(undefined)) throw new Error(`source « ${title} » : ligne sans rang`);
    const prefix = owner === "claude" ? "M" : "S";
    const base = bases[prefix];
    const number = base.next++;
    const name = `${prefix}-${String(number).padStart(3, "0")}.md`;
    files.set(`ai/${base.dir}/${name}`, `---\nid: ${prefix}-${number}\ntitle: "${title}"\nsection: "${section}"\nreliability: "${reliability}"\nverified: ${verified}\nranks: [${ranks.join(", ")}]\n---\n\n## Savoir\n\n${savoir.map((fact) => `- ${fact}`).join("\n")}\n\n## Sources\n\n${lines.join("\n")}\n\n## Fiabilité\n\n${note}\n`);
    const indexFile = `ai/${base.dir}/INDEX.md`;
    const index = read(indexFile);
    const heading = index.indexOf(`## ${section}\n`);
    if (heading < 0) throw new Error(`source « ${title} » : section inconnue « ${section} »`);
    const next = index.indexOf("\n## ", heading + 1);
    const end = next < 0 ? index.length : next;
    files.set(indexFile, `${index.slice(0, end).trimEnd()}\n- **${prefix}-${number} — ${title}** · ${reliability}\n${next < 0 ? "" : index.slice(end)}`);
  }

  let question = nextNumber(root, "issues", "Q");
  for (const { summary, touches, enonce, options, type = "lacune", conflicts = [] } of lot.questions ?? []) {
    const name = `Q-${String(question).padStart(3, "0")}.md`;
    files.set(`ai/issues/${name}`, `---\nid: Q-${question}\ntype: "${type}"\ntouches: [${touches.join(", ")}]\nconflicts: [${conflicts.join(", ")}]\noptions: ${options.length}\n---\n\n## Énoncé\n\n${enonce}\n\n## Options\n\n${options.map((option) => `- ${option}`).join("\n") || "—"}\n`);
    append("ai/issues/INDEX.md", `- **Q-${question} · ${type}** — ${summary}\n  - Touche : ${touches.join(", ") || "—"}\n  - Options : ${options.length || "—"}\n  - Fichier : \`${name}\``);
    question++;
  }

  for (const { file, content } of lot.write ?? []) files.set(inAi(file), content);
  for (const { file, from, to } of lot.replace ?? []) {
    const text = read(inAi(file));
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`${file} : « ${from.slice(0, 70)} » trouvé ${count} fois`);
    files.set(file, text.replace(from, () => to));
  }
  for (const { file, text } of lot.append ?? []) append(inAi(file), text);
  const removed = (lot.delete ?? []).map(inAi);
  for (const file of removed) if (!existsSync(join(root, file))) throw new Error(`${file} : introuvable`);

  // Seuls les fichiers touchés : une copie complète de `ai/` à chaque lot encombrerait `ai/bin/`.
  const touched = [...files.keys(), ...removed].filter((file) => existsSync(join(root, file)));
  const copy = touched.length ? copyToBin(lot.subject, touched, root, date) : "aucune";
  for (const [file, text] of files) writeFileSync(join(root, file), text);
  for (const file of removed) rmSync(join(root, file));
  return { copy, files: [...files.keys(), ...removed] };
}

if (import.meta.main) {
  const [path] = process.argv.slice(2);
  if (!path) throw new Error("usage : npm run ai:apply -- ai/tmp/lot.json");
  const { copy, files } = applyLot(JSON.parse(readFileSync(path, "utf8")) as Lot);
  // Un lot appliqué est porté par sa copie dans ai/bin : le garder dans ai/tmp ne ferait qu'encombrer.
  if (path.replaceAll("\\", "/").startsWith("ai/tmp/")) rmSync(path);
  console.log(`copie : ${copy}\n${files.join("\n")}`);
}
