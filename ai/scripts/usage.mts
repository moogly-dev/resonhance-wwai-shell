// Usage ledger: what Claude reads and writes in `ai/`, and the scripts it runs, so that check-ai's selection rests on measurement.
// Never the text of a command nor the content of a file: only a project path or a script name, a count and a date.
// Session state (errors already there, writing during the turn, reminders given): `ai/tmp/claude/hooks/`, disposable.

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

// Two hooks may write at once: the rename avoids a cut file; a lost update only skews a count.
const writeJson = (file: string, value: unknown) => {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(`${file}.${process.pid}`, `${JSON.stringify(value, null, 1)}\n`);
    renameSync(`${file}.${process.pid}`, file);
  } catch {
    // A missed ledger entry must never block Claude.
  }
};

export const readLedger = (root = "."): Ledger => readJson(join(root, LEDGER), { files: {}, runs: {} });
export const writeLedger = (ledger: Ledger, root = ".") => writeJson(join(root, LEDGER), ledger);

const sessionFile = (root: string, id = "") => join(root, SESSIONS, `${id.replace(/[^\w-]/g, "") || "no-id"}.json`);
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
