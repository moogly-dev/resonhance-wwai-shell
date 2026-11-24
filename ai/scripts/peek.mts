// Golden rule: a long content is never read whole; this script only shows what is useful, as lightly as possible.
// Usage: npm run peek -- <file> [--path pages.0.text] [--around word] [--diff other-file] [--head n]
//   no option: size, lines, and for JSON, the shape (keys, lengths); --around: excerpts around the word;
//   --diff: only the lines that differ, numbered; --head: the first n characters.

import { readFileSync } from "node:fs";

const AROUND_CHARS = 120;
const MAX_HITS = 8;
const MAX_DIFF_LINES = 40;
// Enough to see an API response (a list of pages and their fields), no more.
const MAX_DEPTH = 3;

// A value at the end of an "a.b.0.c" path; a JSON text is parsed first.
export function pick(raw: string, path?: string): unknown {
  let value: unknown = raw;
  try {
    value = JSON.parse(raw);
  } catch {
    return raw;
  }
  for (const key of path ? path.split(".") : []) value = (value as Record<string, unknown> | undefined)?.[key];
  return value;
}

// The shape of a value, without its content: keys, types, lengths of texts and lists.
export function shape(value: unknown, depth = 0): string {
  if (typeof value === "string") return `text (${value.length} chars)`;
  if (Array.isArray(value)) return `list (${value.length})${value.length && depth < MAX_DEPTH ? ` of ${shape(value[0], depth + 1)}` : ""}`;
  if (value && typeof value === "object") {
    if (depth >= MAX_DEPTH) return `object (${Object.keys(value).length} keys)`;
    return `{ ${Object.entries(value).map(([key, inner]) => `${key}: ${shape(inner, depth + 1)}`).join(", ")} }`;
  }
  return JSON.stringify(value);
}

export function around(text: string, word: string, width = AROUND_CHARS): string[] {
  const hits: string[] = [];
  const lower = text.toLowerCase();
  for (let at = lower.indexOf(word.toLowerCase()); at >= 0 && hits.length < MAX_HITS; at = lower.indexOf(word.toLowerCase(), at + word.length)) {
    hits.push(`@${at} …${text.slice(Math.max(0, at - width), at + word.length + width).replace(/\n/g, "⏎")}…`);
  }
  return hits;
}

// Lines that differ between two texts, numbered, MAX_DIFF_LINES at most: enough to iterate without rereading the document.
export function diff(a: string, b: string): string[] {
  const left = a.split("\n");
  const right = b.split("\n");
  const changes: string[] = [];
  for (let line = 0; line < Math.max(left.length, right.length) && changes.length < MAX_DIFF_LINES; line++) {
    if (left[line] !== right[line]) changes.push(`${line + 1}\n  - ${left[line] ?? "∅"}\n  + ${right[line] ?? "∅"}`);
  }
  return changes;
}

if (import.meta.main) {
  const [file, ...flags] = process.argv.slice(2);
  const option = (name: string) => flags[flags.indexOf(`--${name}`) + 1];
  const has = (name: string) => flags.includes(`--${name}`);
  const value = pick(readFileSync(file!, "utf8"), option("path"));
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 1);
  if (has("around")) console.log(around(text, option("around")!).join("\n") || "absent");
  else if (has("diff")) {
    const other = pick(readFileSync(option("diff")!, "utf8"), option("path"));
    const changes = diff(text, typeof other === "string" ? other : JSON.stringify(other, null, 1));
    console.log(changes.length ? changes.join("\n") : "identical");
  } else if (has("head")) console.log(text.slice(0, Number(option("head"))));
  else console.log(`${text.length} chars, ${text.split("\n").length} lines\n${shape(value)}`);
}
