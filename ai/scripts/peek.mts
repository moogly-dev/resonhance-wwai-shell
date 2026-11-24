// Règle d'or : un contenu long ne se lit jamais en entier ; ce script n'en montre que l'utile, au plus léger.
// Usage : npm run peek -- <fichier> [--path pages.0.text] [--around mot] [--diff autre-fichier] [--head n]
//   sans option : taille, lignes, et pour du JSON, la forme (clés, longueurs) ; --around : extraits autour du mot ;
//   --diff : seules les lignes qui diffèrent, numérotées ; --head : les n premiers caractères.

import { readFileSync } from "node:fs";

const AROUND_CHARS = 120;
const MAX_HITS = 8;
const MAX_DIFF_LINES = 40;
// Assez pour voir une réponse de l'API (liste de pages et leurs champs), pas plus.
const MAX_DEPTH = 3;

// Une valeur au bout d'un chemin « a.b.0.c » ; un texte JSON est d'abord parsé.
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

// La forme d'une valeur, sans son contenu : clés, types, longueurs des textes et des listes.
export function shape(value: unknown, depth = 0): string {
  if (typeof value === "string") return `texte (${value.length} car.)`;
  if (Array.isArray(value)) return `liste (${value.length})${value.length && depth < MAX_DEPTH ? ` de ${shape(value[0], depth + 1)}` : ""}`;
  if (value && typeof value === "object") {
    if (depth >= MAX_DEPTH) return `objet (${Object.keys(value).length} clés)`;
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

// Lignes qui diffèrent entre deux textes, numérotées, au plus MAX_DIFF_LINES : de quoi itérer sans relire le document.
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
    console.log(changes.length ? changes.join("\n") : "identiques");
  } else if (has("head")) console.log(text.slice(0, Number(option("head"))));
  else console.log(`${text.length} car., ${text.split("\n").length} lignes\n${shape(value)}`);
}
