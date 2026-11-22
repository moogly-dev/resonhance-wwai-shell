import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { type Ledger, projectPath, readLedger, readSession, recordCall, scriptsOf, writeLedger, writeSession } from "./usage.mts";

const DAY = "2026-11-18";
const empty = (): Ledger => ({ files: {}, runs: {} });
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const project = () => {
  const root = mkdtempSync(join(tmpdir(), "usage-"));
  roots.push(root);
  return root;
};

describe("chemins suivis", () => {
  test("ai/ et CLAUDE.md, relatifs ou absolus, sauf ai/bin et ai/tmp", () => {
    expect(projectPath("ai/01-decisions.md")).toBe("ai/01-decisions.md");
    expect(projectPath(resolve("ai", "features", "F-001-un.md"))).toBe("ai/features/F-001-un.md");
    expect(projectPath("CLAUDE.md")).toBe("CLAUDE.md");
    for (const path of ["ai/tmp/claude/x.mts", "ai/bin/2026-11-18/a.md", "lib/a.ts", "../autre/ai/a.md", "C:\\Users\\x\\ai\\a.md", undefined]) expect(projectPath(path)).toBeUndefined();
  });
});

describe("registre d'usage", () => {
  test("compte lectures et écritures, et date le dernier emploi", () => {
    const ledger = empty();
    recordCall({ tool_name: "Read", tool_input: { file_path: "ai/01-decisions.md" } }, ledger, "2026-11-17");
    recordCall({ tool_name: "Edit", tool_input: { file_path: "ai/01-decisions.md" } }, ledger, DAY);
    recordCall({ tool_name: "Grep", tool_input: { path: "ai/features" } }, ledger, DAY);
    expect(ledger.files).toEqual({ "ai/01-decisions.md": { read: 1, write: 1, last: DAY }, "ai/features": { read: 1, write: 0, last: DAY } });
  });

  test("d'une commande, seuls les noms de scripts : jamais son texte", () => {
    const ledger = recordCall({ tool_name: "Bash", tool_input: { command: "SECRET=abc npm run ai:bin -- essai && node ai/scripts/ai-tmp.mts --tout && npm test" } }, empty(), DAY);
    expect(Object.keys(ledger.runs)).toEqual(["npm:ai:bin", "npm:test", "script:ai-tmp"]);
    expect(JSON.stringify(ledger)).not.toContain("abc");
    expect(scriptsOf(undefined)).toEqual([]);
  });

  test("s'écrit et se relit ; un registre illisible repart à vide sans erreur", () => {
    const root = project();
    expect(readLedger(root)).toEqual(empty());
    writeLedger(recordCall({ tool_name: "Read", tool_input: { file_path: "ai/session.md" } }, empty(), DAY, root), root);
    expect(readLedger(root).files["ai/session.md"]?.read).toBe(1);
  });
});

describe("état de session", () => {
  test("par session, dans ai/tmp/claude/hooks, l'identifiant nettoyé de tout chemin", () => {
    const root = project();
    writeSession({ baseline: ["a"], dirty: true, told: [] }, root, "../../evil");
    expect(readSession(root, "evil")).toEqual({ baseline: ["a"], dirty: true, told: [] });
    expect(readSession(root, "autre")).toEqual({ baseline: [], dirty: false, told: [] });
  });
});
