// Single entry point of the hooks in `.claude/settings.json`: the received event picks the handler (M-1).
// The settings no longer change; Claude evolves its automations here, behind the safety fence of check-ai.
// Each handler stays silent when it has nothing useful to say: an off-topic routine costs context.

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { copyToBin } from "./ai-bin.mts";
import { PURGED, purge } from "./ai-tmp.mts";
import { BLANK, type Finding, SHELL_GITIGNORE, START, checkAi, formatReport } from "./check-ai.mts";
import { oversizedRead } from "./economy.mts";
import { GUARD_MESSAGE, fenceBreach, isForbidden, promptTrap } from "./guard-paths.mts";
import { MERGE } from "./install.mts";
import { remind } from "./reminders.mts";
import { WRITERS, count, readLedger, readSession, recordCall, writeLedger, writeSession } from "./usage.mts";

type Input = { hook_event_name?: string; session_id?: string; source?: string; stop_hook_active?: boolean; tool_name?: string; tool_input?: Record<string, string> };
export type Outcome = { stdout?: string; stderr?: string; exitCode?: number };

// A line number moves with every insertion: an error is recognised without it.
const keyOf = ({ file, message }: Finding) => `${file} | ${message.replace(/ \(l\. \d+\)$/, "")}`;
const dayOf = (now: Date) => now.toLocaleDateString("sv");

// Working memory loaded by CLAUDE.md: out of git, it is born empty at the first session of a copy.
export const MEMORY: Record<string, string> = {
  "ai/session.md": "# Session\n\nTask:\nTone:\n\n## Done\n\n## In progress\n\n## Pending\n\n## Doubts\n",
  "ai/improvements.md": "# Improvements\n\n## NEGATIVE\n\n## POSITIVE\n",
};

// A finished onboarding (Foundation filled, one objective set, gitignore.project handled, ai/merge/ emptied) no longer serves: copied to ai/bin, then removed.
export function finishStart(root: string, now: Date) {
  const read = (file: string) => (existsSync(join(root, file)) ? readFileSync(join(root, file), "utf8") : "");
  if (!existsSync(join(root, START)) || existsSync(join(root, SHELL_GITIGNORE)) || existsSync(join(root, MERGE))) return "";
  if (read("CLAUDE.md").includes(BLANK) || !/^### O-\d+/m.test(read("ai/00-objectives.md"))) return "";
  try {
    const copy = copyToBin("onboarding", [START], root, now);
    rmSync(join(root, START));
    return `Onboarding finished: ${START} removed (copy in ${copy.replaceAll("\\", "/")}).`;
  } catch {
    return "";
  }
}

async function sessionStart(input: Input, root: string, now: Date): Promise<Outcome> {
  for (const [file, text] of Object.entries(MEMORY)) if (!existsSync(join(root, file))) writeFileSync(join(root, file), text);
  for (const { dir, maxAgeMs } of PURGED) await purge(join(root, dir), maxAgeMs, { nowMs: now.getTime() });
  const finished = finishStart(root, now);
  const result = checkAi(root, { now });
  // Errors already there are not the turn's: the end of a turn only blocks on new ones.
  writeSession({ ...readSession(root, input.session_id), baseline: result.errors.map(keyOf), dirty: false }, root, input.session_id);
  // After a summary, CLAUDE.md is read again: only errors deserve to come back.
  const report = input.source === "compact" ? (result.errors.length ? `check:ai: ${result.errors.length} error(s); npm run check:ai for details.` : "") : formatReport(result);
  return { stdout: [finished, report].filter(Boolean).join("\n") };
}

function preToolUse(input: Input, root: string, now: Date): Outcome {
  const tool = input.tool_name ?? "";
  const ledger = readLedger(root);
  if (WRITERS.has(tool) && isForbidden(input)) {
    count(ledger, "guard-paths:refused", dayOf(now));
    writeLedger(ledger, root);
    return { stderr: GUARD_MESSAGE, exitCode: 2 };
  }
  const refused = [["economy:refused", oversizedRead(input, root)], ["guard-paths:prompt", promptTrap(tool, input.tool_input?.command)]].find(([, message]) => message);
  if (refused) {
    count(ledger, refused[0]!, dayOf(now));
    writeLedger(ledger, root);
    return { stderr: refused[1], exitCode: 2 };
  }
  const breach = WRITERS.has(tool) ? fenceBreach(input.tool_input?.command, root) : undefined;
  if (breach) {
    count(ledger, "guard-paths:fence", dayOf(now));
    writeLedger(ledger, root);
    return { stderr: breach, exitCode: 2 };
  }
  recordCall(input, ledger, dayOf(now), root);
  const session = readSession(root, input.session_id);
  const { keys, ids, text } = remind(input, new Set(session.told), root);
  for (const id of ids) count(ledger, `reminders:${id}`, dayOf(now));
  writeLedger(ledger, root);
  if (keys.length || (WRITERS.has(tool) && !session.dirty)) writeSession({ ...session, dirty: session.dirty || WRITERS.has(tool), told: [...session.told, ...keys] }, root, input.session_id);
  return text ? { stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: text } }) } : {};
}

function stop(input: Input, root: string, now: Date): Outcome {
  const session = readSession(root, input.session_id);
  // A turn without writing could not break anything: no check.
  if (!session.dirty) return {};
  writeSession({ ...session, dirty: false }, root, input.session_id);
  // A single relaunch per turn, to avoid any loop.
  if (input.stop_hook_active) return {};
  const baseline = new Set(session.baseline);
  const fresh = checkAi(root, { now }).errors.filter((finding) => !baseline.has(keyOf(finding)));
  if (!fresh.length) return {};
  const ledger = readLedger(root);
  count(ledger, "check-ai:block", dayOf(now));
  writeLedger(ledger, root);
  return { stderr: [`check:ai: ${fresh.length} error(s) born during the session, to fix before presenting.`, ...fresh.map(({ file, message }) => `${file}: ${message}`)].join("\n"), exitCode: 2 };
}

export async function handle(input: Input, { root = ".", now = new Date() } = {}): Promise<Outcome> {
  if (input.hook_event_name === "SessionStart") return sessionStart(input, root, now);
  if (input.hook_event_name === "PreToolUse") return preToolUse(input, root, now);
  if (input.hook_event_name === "Stop") return stop(input, root, now);
  return {};
}

if (import.meta.main) {
  const { stdout, stderr, exitCode } = await handle(JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, "") || "{}") as Input);
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  if (exitCode) process.exitCode = exitCode;
}
