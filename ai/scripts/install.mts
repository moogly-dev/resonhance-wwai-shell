// Installe le shell dans un projet existant, depuis un clone du shell : node <clone>/ai/scripts/install.mts, lancé à la racine du projet.
// Rien d'existant n'est écrasé ni retiré : ce qui manque est copié, un JSON existant ne reçoit que des clés absentes,
// une ligne n'est ajoutée qu'en fin de fichier, et la version du shell d'un fichier déjà présent attend dans ai/fusion/.

import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FUSION = "ai/fusion";
const HOOK_EVENTS = ["SessionStart", "PreToolUse", "Stop"];
// Ce qui naît à l'usage dans le shell n'a rien à faire dans un autre projet.
const LOCAL_ONLY = /^(?:bin|tmp|fusion)(?:[\\/]|$)|^claude[\\/]usage\.json$|^(?:session|improvements|mini-hub)\.md$/;
const SCRIPTS: Record<string, string> = {
  "check:ai": "node ai/scripts/check-ai.mts",
  "ai:bin": "node ai/scripts/ai-bin.mts",
  "ai:apply": "node ai/scripts/ai-apply.mts",
  "ai:tmp": "node ai/scripts/ai-tmp.mts",
  "lint:ai": "tsc --noEmit -p ai/scripts",
  "test:ai": "vitest run --config ai/scripts/vitest.config.mts",
  peek: "node ai/scripts/peek.mts",
};
// Hors de git : l'outillage de Claude, sauf ce que le projet avait déjà (l'équipe en décide).
const KEPT_OUT = ["CLAUDE.md", ".claude/", "ai/", "context/", ".ignore"];

type Json = Record<string, unknown>;
const record = (value: unknown): Json => (value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {});
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const commandsOf = (groups: unknown[]) => groups.flatMap((group) => list(record(group).hooks).map((hook) => record(hook).command));

function parse(file: string): Json | undefined {
  try {
    return record(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    return undefined;
  }
}

// L'indentation du fichier d'origine est gardée.
function writeJson(file: string, value: Json) {
  const before = existsSync(file) ? readFileSync(file, "utf8") : "";
  const indent = /^\{\r?\n([ \t]+)/.exec(before)?.[1] ?? "  ";
  writeFileSync(file, `${JSON.stringify(value, null, indent)}\n`);
}

function appendLines(file: string, lines: string[]) {
  const before = existsSync(file) ? readFileSync(file, "utf8") : "";
  const present = new Set(before.split(/\r?\n/).map((line) => line.trim()));
  const missing = lines.filter((line) => !present.has(line));
  if (missing.length) appendFileSync(file, `${before && !before.endsWith("\n") ? "\n" : ""}${missing.join("\n")}\n`);
  return missing;
}

export function install(target: string, shell: string): { ok: boolean; report: string[] } {
  const at = (path: string) => join(target, path);
  const from = (path: string) => join(shell, path);
  const stop = (message: string) => ({ ok: false, report: [message] });
  if (resolve(target) === resolve(shell)) return stop("Lancer depuis la racine de ton projet, pas depuis le shell.");
  if (existsSync(at("ai/scripts/check-ai.mts"))) return stop("Le shell est déjà installé ici : rien n'a été modifié.");
  if (existsSync(at("ai"))) return stop("Un dossier ai/ existe déjà dans ce projet : installation arrêtée, rien n'a été modifié.");
  const pkg = existsSync(at("package.json")) ? parse(at("package.json")) : {};
  if (!pkg) return stop("package.json illisible (JSON invalide) : installation arrêtée, rien n'a été modifié.");

  const existed = new Set(KEPT_OUT.filter((path) => existsSync(at(path))));
  const report: string[] = [];
  const park = (path: string, why = "gardé tel quel") => {
    mkdirSync(at(FUSION), { recursive: true });
    cpSync(from(path), join(at(FUSION), path.replace(/^\./, "").replaceAll("/", "-")));
    report.push(`${path} existait : ${why} ; la version du shell attend dans ${FUSION}/, Claude propose la fusion.`);
  };

  cpSync(from("ai"), at("ai"), { recursive: true, filter: (source) => !LOCAL_ONLY.test(relative(from("ai"), source)) });
  report.push("ai/ copié.");

  if (existsSync(at("CLAUDE.md"))) park("CLAUDE.md");
  else cpSync(from("CLAUDE.md"), at("CLAUDE.md"));

  const settingsFile = at(".claude/settings.json");
  const ours = parse(from(".claude/settings.json")) ?? {};
  const theirs = existsSync(settingsFile) ? parse(settingsFile) : undefined;
  if (!existsSync(settingsFile)) {
    mkdirSync(at(".claude"), { recursive: true });
    cpSync(from(".claude/settings.json"), settingsFile);
  } else if (!theirs) {
    park(".claude/settings.json", "illisible, gardé tel quel, hooks du shell inactifs en attendant");
  } else {
    const hooks = record(theirs.hooks);
    for (const event of HOOK_EVENTS) {
      const ourGroups = list(record(ours.hooks)[event]);
      const groups = list(hooks[event]);
      if (!commandsOf(ourGroups).every((command) => commandsOf(groups).includes(command))) hooks[event] = [...groups, ...ourGroups];
    }
    const permissions = record(theirs.permissions);
    const allow = list(permissions.allow);
    const added = list(record(ours.permissions).allow).filter((rule) => !allow.includes(rule));
    writeJson(settingsFile, { ...theirs, permissions: { ...permissions, allow: [...allow, ...added] }, hooks });
    report.push(".claude/settings.json existait : hooks et autorisations du shell ajoutés, rien retiré.");
  }

  if (existed.has(".ignore")) report.push(`.ignore existait : ajouté en fin de fichier ${appendLines(at(".ignore"), readFileSync(from(".ignore"), "utf8").split(/\r?\n/).filter(Boolean)).join(", ") || "rien"}.`);
  else cpSync(from(".ignore"), at(".ignore"));

  const added = appendLines(at(".gitignore"), KEPT_OUT.filter((path) => !existed.has(path)));
  report.push(`.gitignore : ${added.length ? `ajouté en fin de fichier ${added.join(", ")}` : "rien à ajouter"}.`);
  const kept = KEPT_OUT.filter((path) => existed.has(path));
  if (kept.length) report.push(`${kept.join(", ")} existai(en)t déjà : non ajouté(s) au .gitignore, à toi de décider s'ils restent dans git.`);

  const created = !existsSync(at("package.json"));
  const scripts = record(pkg.scripts);
  const clashes = Object.keys(SCRIPTS).filter((name) => name in scripts && scripts[name] !== SCRIPTS[name]);
  for (const [name, command] of Object.entries(SCRIPTS)) if (!(name in scripts)) scripts[name] = command;
  const dev = record(pkg.devDependencies);
  const deps = record(pkg.dependencies);
  for (const [name, version] of Object.entries(record(parse(from("package.json"))?.devDependencies))) if (!(name in dev) && !(name in deps)) dev[name] = version;
  const base = created ? { name: resolve(target).replace(/^.*[\\/]/, "").toLowerCase(), private: true } : pkg;
  writeJson(at("package.json"), { ...base, scripts, devDependencies: dev });
  report.push(`package.json ${created ? "créé" : "complété"} : scripts et devDependencies manquants ajoutés, aucun existant changé.`);
  if (clashes.length) report.push(`Scripts déjà pris par le projet, gardés tels quels : ${clashes.join(", ")} ; Claude propose un autre nom.`);

  report.push("Ensuite : npm install, puis ouvre le projet dans Claude Code et écris « on démarre ».");
  return { ok: true, report };
}

if (import.meta.main) {
  const { ok, report } = install(process.cwd(), resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
  console.log(report.join("\n"));
  if (!ok) process.exitCode = 1;
}
