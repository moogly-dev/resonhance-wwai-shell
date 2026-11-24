// Rappels donnés au moment où ils servent (hook PreToolUse), une fois par session et par sujet, plutôt qu'en début de session où ils ne servent pas la tâche.
// Retirer un rappel : l'ôter de REMINDERS ; en ajouter un : son test, et sa mesure dans ai/04-rituels.md.

import { GOLDEN_RULE, heavyCall } from "./economy.mts";

type Input = { file_path?: string; content?: string; new_string?: string; old_string?: string; command?: string };
export type ToolCall = { tool_name?: string; tool_input?: Input };
type Reminder = { id: string; topic: (call: ToolCall, root: string, told: Set<string>) => string | undefined; say: (topic: string) => string };

const LOT = /ai[\\/]tmp[\\/][^\\/]+\.json$/;
// Ce qui engage le projet : un objectif, une décision, une fonctionnalité.
const COMMITTING = /ai[\\/](?:00-objectifs\.md|01-decisions\.md|features[\\/])/;
const SEARCHED = "autorite:web";
const BIN_FIRST = /\b(?:rm|rmdir|del|mv|Remove-Item|Move-Item|Rename-Item)\b[^\n|;&]*\bai[\\/](?!tmp[\\/])/i;

const REMINDERS: Reminder[] = [
  {
    id: "autorite",
    topic: ({ tool_name: tool, tool_input: input = {} }) =>
      tool === "WebSearch" || tool === "WebFetch" || (tool === "Write" && LOT.test(input.file_path ?? "") && input.content?.includes('"sources"')) ? "web" : undefined,
    say: () =>
      "Autorité d'abord : texte officiel, norme, documentation de la version employée, revue à comité de lecture (rang 1), puis autorité reconnue (rang 2) ; un site de praticiens, la presse ou une encyclopédie (rang 3) n'est qu'une piste à remonter jusqu'à sa source primaire. Ce qui fonde un élément se garde par npm run ai:apply : en S s'il sert le projet, en M (\"for\": \"claude\") s'il ne sert que Claude.",
  },
  {
    id: "sourcer",
    topic: ({ tool_name: tool, tool_input: input = {} }, _root, told) =>
      (tool === "Write" || tool === "Edit") && COMMITTING.test(input.file_path ?? "") && !told.has(SEARCHED) ? "sans recherche" : undefined,
    say: () =>
      "Sourcer d'abord : aucune recherche sur le web dans cette session. Avant de poser un objectif, une décision, une fonctionnalité ou une stack, chercher maintenant la plus haute autorité du domaine (documentation officielle de la version actuelle, norme, texte de loi), la citer dans la proposition et la garder en S-n par npm run ai:apply.",
  },
  {
    id: "economie",
    topic: (call, root) => heavyCall(call, root),
    say: (topic) => `Appel coûteux en contexte (${topic}). ${GOLDEN_RULE}`,
  },
  {
    id: "corbeille",
    topic: ({ tool_name: tool, tool_input: input = {} }) => ((tool === "Bash" || tool === "PowerShell") && BIN_FIRST.test(input.command ?? "") ? "ai" : undefined),
    say: () => "Corbeille : avant de supprimer, déplacer ou modifier en nombre dans ai/, npm run ai:bin -- <sujet> [chemins] ; un lot passe par npm run ai:apply.",
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
