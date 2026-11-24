import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
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

describe("source first", () => {
  const decision = { tool_name: "Edit", tool_input: { file_path: "ai/01-decisions.md", old_string: "x", new_string: "### D-2\n" } };

  test("setting an objective, a decision or a feature without a search in the session: reminder", () => {
    expect(ids(decision)).toEqual(["source-first"]);
    expect(ids({ tool_name: "Write", tool_input: { file_path: "ai/features/F-001-x.md", content: "---\n" } })).toEqual(["source-first"]);
  });

  test("once per session", () => {
    expect(ids(decision, new Set(remind(decision, new Set(), root).keys))).toEqual([]);
  });

  test("after a search, or outside what commits the project: nothing", () => {
    expect(ids(decision, new Set(["authority:web"]))).toEqual([]);
    expect(ids({ tool_name: "Edit", tool_input: { file_path: "ai/session.md", old_string: "a", new_string: "b" } })).toEqual([]);
  });
});

describe("authority and bin", () => {
  test("a search or a batch of sources: authority first", () => {
    expect(ids({ tool_name: "WebSearch" })).toEqual(["authority"]);
    expect(ids({ tool_name: "Write", tool_input: { file_path: "ai/tmp/batch.json", content: '{"sources": []}' } })).toEqual(["authority"]);
  });

  test("deleting or moving in ai/, except disposable files: ai:bin first", () => {
    expect(ids({ tool_name: "PowerShell", tool_input: { command: "Remove-Item ai\\features\\F-001-one.md" } })).toEqual(["bin"]);
    expect(ids({ tool_name: "Bash", tool_input: { command: "rm -rf ai/tmp/claude/check" } })).toEqual([]);
    expect(ids({ tool_name: "Bash", tool_input: { command: "npm run check:ai" } })).toEqual([]);
  });
});
