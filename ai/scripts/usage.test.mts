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

describe("tracked paths", () => {
  test("ai/ and CLAUDE.md, relative or absolute, except ai/bin and ai/tmp", () => {
    expect(projectPath("ai/01-decisions.md")).toBe("ai/01-decisions.md");
    expect(projectPath(resolve("ai", "features", "F-001-one.md"))).toBe("ai/features/F-001-one.md");
    expect(projectPath("CLAUDE.md")).toBe("CLAUDE.md");
    for (const path of ["ai/tmp/claude/x.mts", "ai/bin/2026-11-18/a.md", "lib/a.ts", "../other/ai/a.md", "C:\\Users\\x\\ai\\a.md", undefined]) expect(projectPath(path)).toBeUndefined();
  });
});

describe("usage ledger", () => {
  test("counts reads and writes, and dates the last use", () => {
    const ledger = empty();
    recordCall({ tool_name: "Read", tool_input: { file_path: "ai/01-decisions.md" } }, ledger, "2026-11-17");
    recordCall({ tool_name: "Edit", tool_input: { file_path: "ai/01-decisions.md" } }, ledger, DAY);
    recordCall({ tool_name: "Grep", tool_input: { path: "ai/features" } }, ledger, DAY);
    expect(ledger.files).toEqual({ "ai/01-decisions.md": { read: 1, write: 1, last: DAY }, "ai/features": { read: 1, write: 0, last: DAY } });
  });

  test("from a command, only script names: never its text", () => {
    const ledger = recordCall({ tool_name: "Bash", tool_input: { command: "SECRET=abc npm run ai:bin -- trial && node ai/scripts/ai-tmp.mts --all && npm test" } }, empty(), DAY);
    expect(Object.keys(ledger.runs)).toEqual(["npm:ai:bin", "npm:test", "script:ai-tmp"]);
    expect(JSON.stringify(ledger)).not.toContain("abc");
    expect(scriptsOf(undefined)).toEqual([]);
  });

  test("writes and reads back; an unreadable ledger restarts empty without error", () => {
    const root = project();
    expect(readLedger(root)).toEqual(empty());
    writeLedger(recordCall({ tool_name: "Read", tool_input: { file_path: "ai/session.md" } }, empty(), DAY, root), root);
    expect(readLedger(root).files["ai/session.md"]?.read).toBe(1);
  });
});

describe("session state", () => {
  test("per session, in ai/tmp/claude/hooks, the id cleaned of any path", () => {
    const root = project();
    writeSession({ baseline: ["a"], dirty: true, told: [] }, root, "../../evil");
    expect(readSession(root, "evil")).toEqual({ baseline: ["a"], dirty: true, told: [] });
    expect(readSession(root, "other")).toEqual({ baseline: [], dirty: false, told: [] });
  });
});
