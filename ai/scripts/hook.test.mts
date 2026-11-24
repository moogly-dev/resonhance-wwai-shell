import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { MEMORY, finishStart, handle } from "./hook.mts";
import { readLedger, readSession } from "./usage.mts";

const NOW = new Date("2026-11-18T12:00:00");
const session_id = "trial";
let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "hook-"));
  mkdirSync(join(root, "ai"));
  writeFileSync(join(root, "ai/session.md"), "# Session\n");
  writeFileSync(join(root, "CLAUDE.md"), "@ai/session.md\n");
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

const run = (input: Parameters<typeof handle>[0]) => handle({ session_id, ...input }, { root, now: NOW });
const breakArtefacts = () => writeFileSync(join(root, "CLAUDE.md"), "@ai/session.md\nD-99\n");

describe("session start", () => {
  test("gives the report, and stays silent after a summary when all is well", async () => {
    expect((await run({ hook_event_name: "SessionStart", source: "startup" })).stdout).toBe("0 error(s), 0 warning(s)");
    expect((await run({ hook_event_name: "SessionStart", source: "compact" })).stdout).toBe("");
  });

  test("creates the missing working memory, without touching the existing one", async () => {
    await run({ hook_event_name: "SessionStart", source: "startup" });
    expect(readFileSync(join(root, "ai/session.md"), "utf8")).toBe("# Session\n");
    expect(readFileSync(join(root, "ai/improvements.md"), "utf8")).toBe(MEMORY["ai/improvements.md"]);
  });

  test("removes onboarding once finished, copy kept in ai/bin", async () => {
    writeFileSync(join(root, "ai/onboarding.md"), "# Onboarding\n");
    writeFileSync(join(root, "ai/00-objectives.md"), "# 00\n\n### O-1 — Launch\n");
    expect((await run({ hook_event_name: "SessionStart", source: "startup" })).stdout).toMatch(/^Onboarding finished: ai\/onboarding\.md removed \(copy in ai\/bin\/2026-11-18-onboarding\)\./);
    expect(existsSync(join(root, "ai/onboarding.md"))).toBe(false);
    expect(existsSync(join(root, "ai/bin/2026-11-18-onboarding/onboarding.md"))).toBe(true);
  });

  test("keeps onboarding while the Foundation, the objective, gitignore.project or ai/merge wait", () => {
    writeFileSync(join(root, "ai/onboarding.md"), "# Onboarding\n");
    expect(finishStart(root, NOW)).toBe("");
    writeFileSync(join(root, "ai/00-objectives.md"), "### O-1\n");
    writeFileSync(join(root, "gitignore.project"), "ai/\n");
    expect(finishStart(root, NOW)).toBe("");
    rmSync(join(root, "gitignore.project"));
    mkdirSync(join(root, "ai/merge"));
    expect(finishStart(root, NOW)).toBe("");
    rmSync(join(root, "ai/merge"), { recursive: true });
    writeFileSync(join(root, "CLAUDE.md"), "- Stack: <to fill>\n");
    expect(finishStart(root, NOW)).toBe("");
    expect(existsSync(join(root, "ai/onboarding.md"))).toBe(true);
  });

  test("records the errors already there", async () => {
    breakArtefacts();
    await run({ hook_event_name: "SessionStart", source: "startup" });
    expect(readSession(root, session_id).baseline).toEqual(["CLAUDE.md | orphan reference: D-99"]);
  });
});

describe("before each tool", () => {
  test("refuses AppData for a write, not for a read", async () => {
    expect((await run({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: "C:\\Users\\x\\AppData\\Local\\Temp\\a.mts" } })).exitCode).toBe(2);
    expect((await run({ hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: "C:\\Users\\x\\AppData\\Local\\Temp\\out.txt" } })).exitCode).toBeUndefined();
    expect(readLedger(root).runs["guard-paths:refused"]?.count).toBe(1);
  });

  test("keeps the usage ledger and notes the write for the end of the turn", async () => {
    await run({ hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: "ai/session.md" } });
    expect(readSession(root, session_id).dirty).toBe(false);
    await run({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "ai/session.md" } });
    expect(readLedger(root).files["ai/session.md"]).toEqual({ read: 1, write: 1, last: "2026-11-18" });
    expect(readSession(root, session_id).dirty).toBe(true);
  });

  test("gives a reminder in context, without blocking, only once", async () => {
    const search = { hook_event_name: "PreToolUse", tool_name: "WebSearch", tool_input: {} };
    const { stdout, exitCode } = await run(search);
    expect(exitCode).toBeUndefined();
    expect(JSON.parse(stdout ?? "{}").hookSpecificOutput).toMatchObject({ hookEventName: "PreToolUse", additionalContext: expect.stringMatching(/^Authority first/) });
    expect((await run(search)).stdout).toBeUndefined();
    expect(readLedger(root).runs["reminders:authority"]?.count).toBe(1);
  });
});

describe("end of turn", () => {
  test("a turn without writing checks nothing", async () => {
    breakArtefacts();
    expect(await run({ hook_event_name: "Stop" })).toEqual({});
  });

  test("only blocks on an error born during the session, only once", async () => {
    await run({ hook_event_name: "SessionStart", source: "startup" });
    await run({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "CLAUDE.md" } });
    breakArtefacts();
    const blocked = await run({ hook_event_name: "Stop" });
    expect(blocked.exitCode).toBe(2);
    expect(blocked.stderr).toContain("CLAUDE.md: orphan reference: D-99 (l. 2)");
    await run({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "CLAUDE.md" } });
    expect(await run({ hook_event_name: "Stop", stop_hook_active: true })).toEqual({});
  });

  test("an error already there at session start does not block", async () => {
    breakArtefacts();
    await run({ hook_event_name: "SessionStart", source: "startup" });
    await run({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "CLAUDE.md" } });
    expect(await run({ hook_event_name: "Stop" })).toEqual({});
  });
});
