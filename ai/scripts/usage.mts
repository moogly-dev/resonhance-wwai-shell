// Registre d'usage : ce que Claude lit et écrit dans `ai/`, et les scripts qu'il lance, pour que la sélection de check-ai se fonde sur la mesure.
// Jamais le texte d'une commande ni le contenu d'un fichier : seulement un chemin du projet ou un nom de script, un compte et une date.
// État d'une session (erreurs déjà présentes, écriture pendant le tour, rappels donnés) : `ai/tmp/claude/hooks/`, jetable.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

export const LEDGER = "ai/claude/usage.json";
const SESSIONS = "ai/tmp/claude/hooks";
const TRACKED = /^(?:CLAUDE\.md$|ai\/(?!bin\/|tmp\/))/;
export const WRITERS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit", "Bash", "PowerShell"]);

export type Ledger = { files: Record<string, { read: number; write: number; last: string }>; runs: Record<string, { count: number; last: string }> };
export type Session = { baseline: string[]; dirty: boolean; told: string[] };
export type Call = { tool_name?: string; tool_input?: { file_path?: string; notebook_path?: string; path?: string; command?: string } };

function readJson<T>(file: string, empty: T): T {
  try {
    return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : empty;
  } catch {
    return empty;
  }
}

// Deux hooks peuvent écrire en même temps : le renommage évite un fichier coupé ; une mise à jour perdue ne fausse qu'un compte.
const writeJson = (file: string, value: unknown) => {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(`${file}.${process.pid}`, `${JSON.stringify(value, null, 1)}\n`);
    renameSync(`${file}.${process.pid}`, file);
  } catch {
    // Un registre manqué ne doit jamais bloquer Claude.
  }
};

export const readLedger = (root = "."): Ledger => readJson(join(root, LEDGER), { files: {}, runs: {} });
export const writeLedger = (ledger: Ledger, root = ".") => writeJson(join(root, LEDGER), ledger);

const sessionFile = (root: string, id = "") => join(root, SESSIONS, `${id.replace(/[^\w-]/g, "") || "sans-id"}.json`);
export const readSession = (root = ".", id?: string): Session => ({ baseline: [], dirty: false, told: [], ...readJson(sessionFile(root, id), {}) });
export const writeSession = (session: Session, root = ".", id?: string) => writeJson(sessionFile(root, id), session);

export const projectPath = (path: string | undefined, root = ".") => {
  if (!path) return undefined;
  const inside = relative(resolve(root), resolve(root, path)).replaceAll("\\", "/");
  return inside && !inside.startsWith("..") && !isAbsolute(inside) && TRACKED.test(inside) ? inside : undefined;
};

export const scriptsOf = (command = "") => [
  ...[...command.matchAll(/\bnpm (?:run )?([\w:-]+)/g)].map(([, name]) => `npm:${name}`),
  ...[...command.matchAll(/\bai\/scripts\/([\w-]+)\.mts\b/g)].map(([, name]) => `script:${name}`),
];

export function count(ledger: Ledger, key: string, day: string) {
  const run = (ledger.runs[key] ??= { count: 0, last: day });
  run.count++;
  run.last = day;
}

export function recordCall({ tool_name: tool = "", tool_input: input = {} }: Call, ledger: Ledger, day: string, root = ".") {
  const file = projectPath(input.file_path ?? input.notebook_path ?? input.path, root);
  if (file) {
    const entry = (ledger.files[file] ??= { read: 0, write: 0, last: day });
    entry[WRITERS.has(tool) ? "write" : "read"]++;
    entry.last = day;
  }
  for (const key of scriptsOf(input.command)) count(ledger, key, day);
  return ledger;
}
