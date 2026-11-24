// Garde, appelée par `ai/scripts/hook.mts` (PreToolUse) ; exit 2 refuse l'appel et donne la raison à Claude.
// Rien dans AppData, que l'utilisateur devrait vider à la main : le dossier de travail de Claude est `ai/tmp/claude/`.
// Un script de `ai/` lancé par `node` passe la barrière de check-ai avant de tourner, jetable compris : `Bash(node *)` le lancerait sans demander.

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { FENCE, FENCE_KEEPER } from "./check-ai.mts";

const FORBIDDEN = /appdata[\\/]/i;
const NODE_SCRIPT = /\bnode\s+(?:-[\w-]+(?:=\S+)?\s+)*["']?([^\s"';&|]+\.[cm]?[jt]s)\b/g;

type Call = { tool_input?: { file_path?: string; command?: string } };

export const GUARD_MESSAGE =
  "Rien dans AppData : l'utilisateur ne veut pas de dossier profond à vider. Travaille dans ai/tmp/claude/ (hors de git, purgé après 24 h) ; un traitement récurrent devient un script de ai/scripts/, un lot de modifications passe par npm run ai:apply.";

export const isForbidden = ({ tool_input: input }: Call) => FORBIDDEN.test(`${input?.file_path ?? ""}\n${input?.command ?? ""}`);

// Les autorisations du projet sont écrites pour Bash : PowerShell et le code à la volée font surgir un dialogue à chaque appel,
// et `node -e` échappe à la barrière, qui ne lit que les fichiers.
const INLINE_CODE = /\bnode\s+(?:[^\n;&|]*\s)?(?:-e|--eval|-p|--print)\b/;
export function promptTrap(tool = "", command = "") {
  if (tool === "PowerShell") return "PowerShell refusé : les autorisations du projet sont écrites pour Bash (Git Bash) ; relancer la commande par l'outil Bash.";
  if (tool === "Bash" && INLINE_CODE.test(command))
    return "node -e refusé : un code à la volée demande une autorisation à chaque appel et échappe à la barrière. L'écrire dans ai/tmp/claude/<nom>.mts, puis node ai/tmp/claude/<nom>.mts ; pour réduire un contenu long, npm run peek.";
  return undefined;
}

export function fenceBreach(command = "", root = ".") {
  for (const [, script] of command.matchAll(NODE_SCRIPT)) {
    const file = relative(resolve(root), resolve(root, script)).replaceAll("\\", "/");
    if (!file.startsWith("ai/") || file === FENCE_KEEPER || !existsSync(resolve(root, file))) continue;
    const text = readFileSync(resolve(root, file), "utf8");
    const [, what] = FENCE.find(([pattern]) => pattern.test(text)) ?? [];
    if (what) return `Barrière de sécurité : ${file} emploie ${what} ; seul l'utilisateur peut l'autoriser. Sans réseau, processus, dossier personnel ni secret, le script tourne.`;
  }
  return undefined;
}
