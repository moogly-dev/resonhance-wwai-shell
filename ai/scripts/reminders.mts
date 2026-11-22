// Rappels donnés au moment où ils servent (hook PreToolUse), une fois par session et par sujet, plutôt qu'en début de session où ils ne servent pas la tâche.
// Retirer un rappel : l'ôter de REMINDERS ; en ajouter un : son test, et sa mesure dans ai/04-rituels.md.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Input = { file_path?: string; content?: string; new_string?: string; old_string?: string; command?: string };
export type ToolCall = { tool_name?: string; tool_input?: Input };
type Reminder = { id: string; topic: (call: ToolCall, root: string) => string | undefined; say: (topic: string) => string };

const GATED_HEADING = /^### ([OD])-(\d+)\b/gm;
const GATED_FILE = /ai[\\/](?:features|issues)[\\/]([FQ])-0*(\d+)/;
const LOT = /ai[\\/]tmp[\\/][^\\/]+\.json$/;
const BIN_FIRST = /\b(?:rm|rmdir|del|mv|Remove-Item|Move-Item|Rename-Item)\b[^\n|;&]*\bai[\\/](?!tmp[\\/])/i;

const readIfAny = (file?: string) => (file && existsSync(file) ? readFileSync(file, "utf8") : "");
const headings = (text: string) => [...text.matchAll(GATED_HEADING)].map(([, family, number]) => `${family}-${Number(number)}`);

const REMINDERS: Reminder[] = [
  {
    id: "sas",
    topic: ({ tool_name: tool, tool_input: input = {} }, root) => {
      if (tool !== "Write" && tool !== "Edit") return;
      const before = new Set(headings(input.old_string ?? readIfAny(input.file_path)));
      const added = headings(input.content ?? input.new_string ?? "").filter((id) => !before.has(id));
      const file = tool === "Write" ? GATED_FILE.exec(input.file_path ?? "") : null;
      if (file && !existsSync(input.file_path ?? "")) added.push(`${file[1]}-${Number(file[2])}`);
      const hub = readIfAny(join(root, "ai/mini-hub.md"));
      const missing = added.filter((id) => !new RegExp(`\\b${id}\\b`).test(hub));
      if (tool === "Write" && LOT.test(input.file_path ?? "") && input.content?.includes('"questions"')) missing.push("une question du lot");
      return missing.join(", ") || undefined;
    },
    say: (topic) => `Sas : ${topic}, absent de ai/mini-hub.md. Créer, supprimer ou déclasser un O, D, F ou Q passe d'abord par une ENTRÉE ou une SORTIE du mini-hub, avec sa raison, appliquée une fois validée par l'utilisateur.`,
  },
  {
    id: "autorite",
    topic: ({ tool_name: tool, tool_input: input = {} }) =>
      tool === "WebSearch" || tool === "WebFetch" || (tool === "Write" && LOT.test(input.file_path ?? "") && input.content?.includes('"sources"')) ? "web" : undefined,
    say: () =>
      "Autorité d'abord : texte officiel, norme, documentation de la version employée, revue à comité de lecture (rang 1), puis autorité reconnue (rang 2) ; un site de praticiens, la presse ou une encyclopédie (rang 3) n'est qu'une piste à remonter jusqu'à sa source primaire. Ce qui fonde un élément se garde par npm run ai:apply : en S s'il sert le projet, en M (\"for\": \"claude\") s'il ne sert que Claude.",
  },
  {
    id: "corbeille",
    topic: ({ tool_name: tool, tool_input: input = {} }) => ((tool === "Bash" || tool === "PowerShell") && BIN_FIRST.test(input.command ?? "") ? "ai" : undefined),
    say: () => "Corbeille : avant de supprimer, déplacer ou modifier en nombre dans ai/, npm run ai:bin -- <sujet> [chemins] ; un lot passe par npm run ai:apply.",
  },
];

export function remind(call: ToolCall, told: Set<string>, root = ".") {
  const due = REMINDERS.flatMap(({ id, topic, say }) => {
    const subject = topic(call, root);
    const key = `${id}:${subject}`;
    return subject && !told.has(key) ? [{ key, id, text: say(subject) }] : [];
  });
  return { keys: due.map(({ key }) => key), ids: due.map(({ id }) => id), text: due.map(({ text }) => text).join("\n") };
}
