// Reminders given when they serve (PreToolUse hook), once per session and per subject, rather than at session start where they do not serve the task.
// Remove a reminder: take it out of REMINDERS; add one: its test, and its measure in ai/04-rituals.md.

import { GOLDEN_RULE, heavyCall } from "./economy.mts";

type Input = { file_path?: string; content?: string; new_string?: string; old_string?: string; command?: string };
export type ToolCall = { tool_name?: string; tool_input?: Input };
type Reminder = { id: string; topic: (call: ToolCall, root: string, told: Set<string>) => string | undefined; say: (topic: string) => string };

const BATCH = /ai[\\/]tmp[\\/][^\\/]+\.json$/;
// What commits the project: an objective, a decision, a feature.
const COMMITTING = /ai[\\/](?:00-objectives\.md|01-decisions\.md|features[\\/])/;
const SEARCHED = "authority:web";
const BIN_FIRST = /\b(?:rm|rmdir|del|mv|Remove-Item|Move-Item|Rename-Item)\b[^\n|;&]*\bai[\\/](?!tmp[\\/])/i;

const REMINDERS: Reminder[] = [
  {
    id: "authority",
    topic: ({ tool_name: tool, tool_input: input = {} }) =>
      tool === "WebSearch" || tool === "WebFetch" || (tool === "Write" && BATCH.test(input.file_path ?? "") && input.content?.includes('"sources"')) ? "web" : undefined,
    say: () =>
      'Authority first: official text, standard, documentation of the version in use, peer-reviewed journal (rank 1), then recognised authority (rank 2); a practitioners\' site, the press or an encyclopedia (rank 3) is only a lead, to trace back to its primary source. What grounds an item is kept through npm run ai:apply: as S if it serves the project, as M ("for": "claude") if it only serves Claude.',
  },
  {
    id: "source-first",
    topic: ({ tool_name: tool, tool_input: input = {} }, _root, told) =>
      (tool === "Write" || tool === "Edit") && COMMITTING.test(input.file_path ?? "") && !told.has(SEARCHED) ? "no search" : undefined,
    say: () =>
      "Source first: no web search in this session. Before setting an objective, a decision, a feature or a stack, search now for the highest authority of the field (official documentation of the current version, standard, law), cite it in the proposal and keep it as S-n through npm run ai:apply.",
  },
  {
    id: "economy",
    topic: (call, root) => heavyCall(call, root),
    say: (topic) => `Call costly in context (${topic}). ${GOLDEN_RULE}`,
  },
  {
    id: "bin",
    topic: ({ tool_name: tool, tool_input: input = {} }) => ((tool === "Bash" || tool === "PowerShell") && BIN_FIRST.test(input.command ?? "") ? "ai" : undefined),
    say: () => "Bin first: before deleting, moving or editing many files in ai/, npm run ai:bin -- <subject> [paths]; a batch goes through npm run ai:apply.",
  },
];

export function remind(call: ToolCall, told: Set<string>, root = ".") {
  const due = REMINDERS.flatMap(({ id, topic, say }) => {
    const subject = topic(call, root, told);
    const key = `${id}:${subject}`;
    return subject && !told.has(key) ? [{ key, id, text: say(subject) }] : [];
  });
  return { keys: due.map(({ key }) => key), ids: due.map(({ id }) => id), text: due.map(({ text }) => text).join("\n") };
}
