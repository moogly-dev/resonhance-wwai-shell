import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { remind } from "./reminders.mts";

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "reminders-"));
  mkdirSync(join(root, "ai"));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

const ids = (call: Parameters<typeof remind>[0], told = new Set<string>()) => remind(call, told, root).ids;

describe("sourcer", () => {
  const decision = { tool_name: "Edit", tool_input: { file_path: "ai/01-decisions.md", old_string: "x", new_string: "### D-2\n" } };

  test("poser un objectif, une décision ou une fonctionnalité sans recherche dans la session : rappel", () => {
    expect(ids(decision)).toEqual(["sourcer"]);
    expect(ids({ tool_name: "Write", tool_input: { file_path: "ai/features/F-001-x.md", content: "---\n" } })).toEqual(["sourcer"]);
  });

  test("une fois par session", () => {
    expect(ids(decision, new Set(remind(decision, new Set(), root).keys))).toEqual([]);
  });

  test("après une recherche, ou hors de ce qui engage le projet : rien", () => {
    expect(ids(decision, new Set(["autorite:web"]))).toEqual([]);
    expect(ids({ tool_name: "Edit", tool_input: { file_path: "ai/session.md", old_string: "a", new_string: "b" } })).toEqual([]);
  });
});

describe("autorité et corbeille", () => {
  test("une recherche ou un lot de sources : l'autorité d'abord", () => {
    expect(ids({ tool_name: "WebSearch" })).toEqual(["autorite"]);
    expect(ids({ tool_name: "Write", tool_input: { file_path: "ai/tmp/lot.json", content: '{"sources": []}' } })).toEqual(["autorite"]);
  });

  test("supprimer ou déplacer dans ai/, sauf le jetable : ai:bin d'abord", () => {
    expect(ids({ tool_name: "PowerShell", tool_input: { command: "Remove-Item ai\\features\\F-001-un.md" } })).toEqual(["corbeille"]);
    expect(ids({ tool_name: "Bash", tool_input: { command: "rm -rf ai/tmp/claude/verif" } })).toEqual([]);
    expect(ids({ tool_name: "Bash", tool_input: { command: "npm run check:ai" } })).toEqual([]);
  });
});
