import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { MEMORY, finishStart, handle } from "./hook.mts";
import { readLedger, readSession } from "./usage.mts";

const NOW = new Date("2026-11-18T12:00:00");
const session_id = "essai";
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

describe("début de session", () => {
  test("donne le rapport, et se tait après un résumé quand tout va bien", async () => {
    expect((await run({ hook_event_name: "SessionStart", source: "startup" })).stdout).toBe("0 erreur(s), 0 signalement(s)");
    expect((await run({ hook_event_name: "SessionStart", source: "compact" })).stdout).toBe("");
  });

  test("crée la mémoire de travail absente, sans toucher à celle qui existe", async () => {
    await run({ hook_event_name: "SessionStart", source: "startup" });
    expect(readFileSync(join(root, "ai/session.md"), "utf8")).toBe("# Session\n");
    expect(readFileSync(join(root, "ai/improvements.md"), "utf8")).toBe(MEMORY["ai/improvements.md"]);
  });

  test("retire le démarrage une fois achevé, copie gardée dans ai/bin", async () => {
    writeFileSync(join(root, "ai/demarrage.md"), "# Démarrage\n");
    writeFileSync(join(root, "ai/00-objectifs.md"), "# 00\n\n### O-1 — Lancer\n");
    expect((await run({ hook_event_name: "SessionStart", source: "startup" })).stdout).toMatch(/^Démarrage achevé : ai\/demarrage\.md retiré \(copie dans ai\/bin\/2026-11-18-demarrage\)\./);
    expect(existsSync(join(root, "ai/demarrage.md"))).toBe(false);
    expect(existsSync(join(root, "ai/bin/2026-11-18-demarrage/demarrage.md"))).toBe(true);
  });

  test("garde le démarrage tant que le Socle, l'objectif ou gitignore.projet l'attendent", () => {
    writeFileSync(join(root, "ai/demarrage.md"), "# Démarrage\n");
    expect(finishStart(root, NOW)).toBe("");
    writeFileSync(join(root, "ai/00-objectifs.md"), "### O-1\n");
    writeFileSync(join(root, "gitignore.projet"), "ai/\n");
    expect(finishStart(root, NOW)).toBe("");
    rmSync(join(root, "gitignore.projet"));
    writeFileSync(join(root, "CLAUDE.md"), "- Stack : <à remplir>\n");
    expect(finishStart(root, NOW)).toBe("");
    expect(existsSync(join(root, "ai/demarrage.md"))).toBe(true);
  });

  test("relève les erreurs déjà présentes", async () => {
    breakArtefacts();
    await run({ hook_event_name: "SessionStart", source: "startup" });
    expect(readSession(root, session_id).baseline).toEqual(["CLAUDE.md | renvoi orphelin : D-99"]);
  });
});

describe("avant chaque outil", () => {
  test("refuse AppData pour une écriture, pas pour une lecture", async () => {
    expect((await run({ hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: "C:\\Users\\x\\AppData\\Local\\Temp\\a.mts" } })).exitCode).toBe(2);
    expect((await run({ hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: "C:\\Users\\x\\AppData\\Local\\Temp\\sortie.txt" } })).exitCode).toBeUndefined();
    expect(readLedger(root).runs["guard-paths:refus"]?.count).toBe(1);
  });

  test("tient le registre d'usage et note l'écriture pour la fin de tour", async () => {
    await run({ hook_event_name: "PreToolUse", tool_name: "Read", tool_input: { file_path: "ai/session.md" } });
    expect(readSession(root, session_id).dirty).toBe(false);
    await run({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "ai/session.md" } });
    expect(readLedger(root).files["ai/session.md"]).toEqual({ read: 1, write: 1, last: "2026-11-18" });
    expect(readSession(root, session_id).dirty).toBe(true);
  });

  test("donne un rappel en contexte, sans bloquer, une seule fois", async () => {
    const search = { hook_event_name: "PreToolUse", tool_name: "WebSearch", tool_input: {} };
    const { stdout, exitCode } = await run(search);
    expect(exitCode).toBeUndefined();
    expect(JSON.parse(stdout ?? "{}").hookSpecificOutput).toMatchObject({ hookEventName: "PreToolUse", additionalContext: expect.stringMatching(/^Autorité d'abord/) });
    expect((await run(search)).stdout).toBeUndefined();
    expect(readLedger(root).runs["reminders:autorite"]?.count).toBe(1);
  });
});

describe("fin de tour", () => {
  test("un tour sans écriture ne contrôle rien", async () => {
    breakArtefacts();
    expect(await run({ hook_event_name: "Stop" })).toEqual({});
  });

  test("ne bloque que sur une erreur née pendant la session, une seule fois", async () => {
    await run({ hook_event_name: "SessionStart", source: "startup" });
    await run({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "CLAUDE.md" } });
    breakArtefacts();
    const blocked = await run({ hook_event_name: "Stop" });
    expect(blocked.exitCode).toBe(2);
    expect(blocked.stderr).toContain("CLAUDE.md : renvoi orphelin : D-99 (l. 2)");
    await run({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "CLAUDE.md" } });
    expect(await run({ hook_event_name: "Stop", stop_hook_active: true })).toEqual({});
  });

  test("une erreur déjà là au début de la session ne bloque pas", async () => {
    breakArtefacts();
    await run({ hook_event_name: "SessionStart", source: "startup" });
    await run({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "CLAUDE.md" } });
    expect(await run({ hook_event_name: "Stop" })).toEqual({});
  });
});
