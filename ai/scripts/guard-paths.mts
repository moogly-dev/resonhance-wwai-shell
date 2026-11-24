// Guard, called by `ai/scripts/hook.mts` (PreToolUse); exit 2 refuses the call and gives Claude the reason.
// Nothing in AppData, which the user would have to empty by hand: Claude's working folder is `ai/tmp/claude/`.
// An `ai/` script run through `node` passes check-ai's fence before running, disposable ones included: `Bash(node *)` would run it without asking.

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { FENCE, FENCE_KEEPER } from "./check-ai.mts";

const FORBIDDEN = /appdata[\\/]/i;
const NODE_SCRIPT = /\bnode\s+(?:-[\w-]+(?:=\S+)?\s+)*["']?([^\s"';&|]+\.[cm]?[jt]s)\b/g;

type Call = { tool_input?: { file_path?: string; command?: string } };

export const GUARD_MESSAGE =
  "Nothing in AppData: the user does not want deep folders to empty. Work in ai/tmp/claude/ (out of git, purged after 24 h); a recurring task becomes a script in ai/scripts/, a batch of changes goes through npm run ai:apply.";

export const isForbidden = ({ tool_input: input }: Call) => FORBIDDEN.test(`${input?.file_path ?? ""}\n${input?.command ?? ""}`);

// The project's permissions are written for Bash: PowerShell and inline code raise a permission prompt at every call,
// and `node -e` escapes the fence, which only reads files.
const INLINE_CODE = /\bnode\s+(?:[^\n;&|]*\s)?(?:-e|--eval|-p|--print)\b/;
export function promptTrap(tool = "", command = "") {
  if (tool === "PowerShell") return "PowerShell refused: the project's permissions are written for Bash (Git Bash on Windows); run the command again with the Bash tool.";
  if (tool === "Bash" && INLINE_CODE.test(command))
    return "node -e refused: inline code asks for permission at every call and escapes the fence. Write it to ai/tmp/claude/<name>.mts, then node ai/tmp/claude/<name>.mts; to reduce a long content, npm run peek.";
  return undefined;
}

export function fenceBreach(command = "", root = ".") {
  for (const [, script] of command.matchAll(NODE_SCRIPT)) {
    const file = relative(resolve(root), resolve(root, script)).replaceAll("\\", "/");
    if (!file.startsWith("ai/") || file === FENCE_KEEPER || !existsSync(resolve(root, file))) continue;
    const text = readFileSync(resolve(root, file), "utf8");
    const [, what] = FENCE.find(([pattern]) => pattern.test(text)) ?? [];
    if (what) return `Safety fence: ${file} uses ${what}; only the user can allow it. Without network, process, home folder or secret, the script runs.`;
  }
  return undefined;
}
