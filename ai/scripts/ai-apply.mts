// Applies a batch of changes to `ai/`, instead of disposable scripts.
// Usage, in Git Bash: npm run ai:apply -- ai/tmp/batch.json, then npm run check:ai.
// Checks the whole batch, copies the touched files to `ai/bin/`, then writes: a replacement not found writes nothing at all.
// Numbers sources (project S, Claude's M) and questions by itself, and keeps their indexes.

import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { copyToBin } from "./ai-bin.mts";

export type Batch = {
  subject: string;
  // `knowledge`: one fact per line, so that a search brings back the fact and not a whole paragraph. `section`: a heading of the target sources index.
  // `reliability`: the scale of `ai/sources/INDEX.md`. Reprints of one wire story count as one source.
  // `for: "claude"`: a source that only serves Claude, filed apart in `ai/claude/sources/` (M-n).
  sources?: { title: string; section: string; knowledge: string[]; lines: string[]; note: string; reliability: string; verified?: string; for?: "claude" }[];
  questions?: { summary: string; touches: string[]; statement: string; options: string[]; type?: string; conflicts?: string[] }[];
  // `from` must appear exactly once in `file`.
  replace?: { file: string; from: string; to: string }[];
  write?: { file: string; content: string }[];
  append?: { file: string; text: string }[];
  // Files removed after their copy to `ai/bin/`: a source merged into another.
  delete?: string[];
};

const nextNumber = (root: string, dir: string, prefix: string) =>
  Math.max(
    0,
    ...(existsSync(join(root, "ai", dir)) ? readdirSync(join(root, "ai", dir)) : []).map((name) => Number(new RegExp(`^${prefix}-(\\d+)\\.md$`).exec(name)?.[1] ?? 0)),
  ) + 1;

const inAi = (file: string) => {
  if (!file.startsWith("ai/") || file.includes("..") || file.startsWith("ai/bin/")) throw new Error(`outside ai: ${file}`);
  return file;
};

export function applyBatch(batch: Batch, root = ".", date = new Date()) {
  const day = date.toLocaleDateString("sv");
  const files = new Map<string, string>();
  const read = (file: string) => {
    if (!files.has(file)) files.set(file, existsSync(join(root, file)) ? readFileSync(join(root, file), "utf8").replaceAll("\r\n", "\n") : "");
    return files.get(file) as string;
  };
  const append = (file: string, text: string) => files.set(file, `${read(file).trimEnd()}\n${text}\n`);

  const bases = { S: { dir: "sources", next: nextNumber(root, "sources", "S") }, M: { dir: "claude/sources", next: nextNumber(root, "claude/sources", "M") } };
  for (const { title, knowledge, lines, note, reliability, section, verified = day, for: owner } of batch.sources ?? []) {
    if (!reliability) throw new Error(`source "${title}": reliability missing`);
    const ranks = [...new Set(lines.map((line) => /^- \[([123])\]/.exec(line)?.[1]))].sort();
    if (ranks.includes(undefined)) throw new Error(`source "${title}": line without rank`);
    const prefix = owner === "claude" ? "M" : "S";
    const base = bases[prefix];
    const number = base.next++;
    const name = `${prefix}-${String(number).padStart(3, "0")}.md`;
    files.set(`ai/${base.dir}/${name}`, `---\nid: ${prefix}-${number}\ntitle: "${title}"\nsection: "${section}"\nreliability: "${reliability}"\nverified: ${verified}\nranks: [${ranks.join(", ")}]\n---\n\n## Knowledge\n\n${knowledge.map((fact) => `- ${fact}`).join("\n")}\n\n## Sources\n\n${lines.join("\n")}\n\n## Reliability\n\n${note}\n`);
    const indexFile = `ai/${base.dir}/INDEX.md`;
    const index = read(indexFile);
    const heading = index.indexOf(`## ${section}\n`);
    if (heading < 0) throw new Error(`source "${title}": unknown section "${section}"`);
    const next = index.indexOf("\n## ", heading + 1);
    const end = next < 0 ? index.length : next;
    files.set(indexFile, `${index.slice(0, end).trimEnd()}\n- **${prefix}-${number} — ${title}** · ${reliability}\n${next < 0 ? "" : index.slice(end)}`);
  }

  let question = nextNumber(root, "issues", "Q");
  for (const { summary, touches, statement, options, type = "gap", conflicts = [] } of batch.questions ?? []) {
    const name = `Q-${String(question).padStart(3, "0")}.md`;
    files.set(`ai/issues/${name}`, `---\nid: Q-${question}\ntype: "${type}"\ntouches: [${touches.join(", ")}]\nconflicts: [${conflicts.join(", ")}]\noptions: ${options.length}\n---\n\n## Statement\n\n${statement}\n\n## Options\n\n${options.map((option) => `- ${option}`).join("\n") || "—"}\n`);
    append("ai/issues/INDEX.md", `- **Q-${question} · ${type}** — ${summary}\n  - Touches: ${touches.join(", ") || "—"}\n  - Options: ${options.length || "—"}\n  - File: \`${name}\``);
    question++;
  }

  for (const { file, content } of batch.write ?? []) files.set(inAi(file), content);
  for (const { file, from, to } of batch.replace ?? []) {
    const text = read(inAi(file));
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`${file}: "${from.slice(0, 70)}" found ${count} times`);
    files.set(file, text.replace(from, () => to));
  }
  for (const { file, text } of batch.append ?? []) append(inAi(file), text);
  const removed = (batch.delete ?? []).map(inAi);
  for (const file of removed) if (!existsSync(join(root, file))) throw new Error(`${file}: not found`);

  // Only the touched files: a full copy of `ai/` at each batch would clutter `ai/bin/`.
  const touched = [...files.keys(), ...removed].filter((file) => existsSync(join(root, file)));
  const copy = touched.length ? copyToBin(batch.subject, touched, root, date) : "none";
  for (const [file, text] of files) writeFileSync(join(root, file), text);
  for (const file of removed) rmSync(join(root, file));
  return { copy, files: [...files.keys(), ...removed] };
}

if (import.meta.main) {
  const [path] = process.argv.slice(2);
  if (!path) throw new Error("usage: npm run ai:apply -- ai/tmp/batch.json");
  const { copy, files } = applyBatch(JSON.parse(readFileSync(path, "utf8")) as Batch);
  // An applied batch is carried by its copy in ai/bin: keeping it in ai/tmp would only clutter.
  if (path.replaceAll("\\", "/").startsWith("ai/tmp/")) rmSync(path);
  console.log(`copy: ${copy}\n${files.join("\n")}`);
}
