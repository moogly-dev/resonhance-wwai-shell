// Point d'entrée unique des hooks de `.claude/settings.json` : l'événement reçu choisit le traitement (M-1).
// Les réglages ne changent plus ; Claude fait évoluer ses automatisations ici, derrière la barrière de sécurité de check-ai.
// Chaque traitement se tait quand il n'a rien d'utile à dire : une routine hors de propos coûte du contexte.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PURGED, purge } from "./ai-tmp.mts";
import { type Finding, checkAi, formatReport } from "./check-ai.mts";
import { GUARD_MESSAGE, fenceBreach, isForbidden } from "./guard-paths.mts";
import { remind } from "./reminders.mts";
import { WRITERS, count, readLedger, readSession, recordCall, writeLedger, writeSession } from "./usage.mts";

type Input = { hook_event_name?: string; session_id?: string; source?: string; stop_hook_active?: boolean; tool_name?: string; tool_input?: Record<string, string> };
export type Outcome = { stdout?: string; stderr?: string; exitCode?: number };

// Un numéro de ligne bouge à chaque insertion : une erreur se reconnaît sans lui.
const keyOf = ({ file, message }: Finding) => `${file} | ${message.replace(/ \(l\. \d+\)$/, "")}`;
const dayOf = (now: Date) => now.toLocaleDateString("sv");

// Mémoire de travail chargée par CLAUDE.md : hors de git, elle naît vide à la première session d'une copie.
export const MEMORY: Record<string, string> = {
  "ai/session.md": "# Session\n\nTâche :\nTon :\n\n## Validé\n\n## En cours\n\n## En attente\n\n## Doutes\n",
  "ai/mini-hub.md": "# mini-hub\n\n## ENTRÉE\n\n## SORTIE\n",
  "ai/improvements.md": "# improvements\n\n## NÉGATIF\n\n## POSITIF\n",
};

async function sessionStart(input: Input, root: string, now: Date): Promise<Outcome> {
  for (const [file, text] of Object.entries(MEMORY)) if (!existsSync(join(root, file))) writeFileSync(join(root, file), text);
  for (const { dir, maxAgeMs } of PURGED) await purge(join(root, dir), maxAgeMs, { nowMs: now.getTime() });
  const result = checkAi(root, { now });
  // Les erreurs déjà là ne sont pas celles du tour : la fin de tour ne bloque que sur les nouvelles.
  writeSession({ ...readSession(root, input.session_id), baseline: result.errors.map(keyOf), dirty: false }, root, input.session_id);
  // Après un résumé, CLAUDE.md est relu : seules les erreurs méritent d'y revenir.
  if (input.source === "compact") return { stdout: result.errors.length ? `check:ai : ${result.errors.length} erreur(s) ; npm run check:ai pour le détail.` : "" };
  return { stdout: formatReport(result) };
}

function preToolUse(input: Input, root: string, now: Date): Outcome {
  const tool = input.tool_name ?? "";
  const ledger = readLedger(root);
  if (WRITERS.has(tool) && isForbidden(input)) {
    count(ledger, "guard-paths:refus", dayOf(now));
    writeLedger(ledger, root);
    return { stderr: GUARD_MESSAGE, exitCode: 2 };
  }
  const breach = WRITERS.has(tool) ? fenceBreach(input.tool_input?.command, root) : undefined;
  if (breach) {
    count(ledger, "guard-paths:barriere", dayOf(now));
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
  // Un tour sans écriture n'a rien pu casser : aucun contrôle.
  if (!session.dirty) return {};
  writeSession({ ...session, dirty: false }, root, input.session_id);
  // Une seule relance par tour, pour éviter toute boucle.
  if (input.stop_hook_active) return {};
  const baseline = new Set(session.baseline);
  const fresh = checkAi(root, { now }).errors.filter((finding) => !baseline.has(keyOf(finding)));
  if (!fresh.length) return {};
  const ledger = readLedger(root);
  count(ledger, "check-ai:blocage", dayOf(now));
  writeLedger(ledger, root);
  return { stderr: [`check:ai : ${fresh.length} erreur(s) nées pendant la session, à corriger avant de présenter.`, ...fresh.map(({ file, message }) => `${file} : ${message}`)].join("\n"), exitCode: 2 };
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
