import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { remind } from "./reminders.mts";

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "reminders-"));
  mkdirSync(join(root, "ai"));
  writeFileSync(join(root, "ai/mini-hub.md"), "# mini-hub\n\n## ENTRÉE\n\n- D-3 : validée\n");
  writeFileSync(join(root, "ai/01-decisions.md"), "# 01\n\n### D-1\n");
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

const ids = (call: Parameters<typeof remind>[0], told = new Set<string>()) => remind(call, told, root).ids;

describe("sas", () => {
  test("une décision nouvelle, absente du mini-hub : rappel", () => {
    expect(remind({ tool_name: "Edit", tool_input: { old_string: "x", new_string: "### D-2\n" } }, new Set(), root).text).toMatch(/^Sas : D-2, absent de ai\/mini-hub\.md\./);
  });

  test("une décision déjà au mini-hub, ou une réécriture sans titre nouveau : rien", () => {
    expect(ids({ tool_name: "Edit", tool_input: { old_string: "x", new_string: "### D-3\n" } })).toEqual([]);
    expect(ids({ tool_name: "Write", tool_input: { file_path: join(root, "ai/01-decisions.md"), content: "# 01\n\n### D-1\nretouche\n" } }, new Set(["autorite:web"]))).toEqual([]);
  });

  test("une fiche de feature créée, ou un lot de questions : rappel", () => {
    expect(ids({ tool_name: "Write", tool_input: { file_path: join(root, "ai/features/F-004-x.md"), content: "---\n" } })).toContain("sas");
    expect(ids({ tool_name: "Write", tool_input: { file_path: "ai/tmp/lot.json", content: '{"questions": []}' } })).toEqual(["sas"]);
  });

  test("une fois par session et par sujet", () => {
    const call = { tool_name: "Edit", tool_input: { old_string: "x", new_string: "### D-2\n" } };
    expect(ids(call, new Set(remind(call, new Set(), root).keys))).toEqual([]);
  });
});

describe("sourcer", () => {
  test("proposer au mini-hub sans recherche dans la session : rappel", () => {
    expect(ids({ tool_name: "Edit", tool_input: { file_path: "ai/mini-hub.md", old_string: "## ENTRÉE", new_string: "## ENTRÉE\n\n- O-1 : proposé" } })).toEqual(["sourcer"]);
    expect(ids({ tool_name: "Write", tool_input: { file_path: "ai/features/F-001-x.md", content: "---\n" } })).toContain("sourcer");
  });

  test("après une recherche, ou hors de ce qui engage le projet : rien", () => {
    expect(ids({ tool_name: "Edit", tool_input: { file_path: "ai/mini-hub.md", old_string: "a", new_string: "b" } }, new Set(["autorite:web"]))).toEqual([]);
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
