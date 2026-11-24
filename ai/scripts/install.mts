// Installs the shell into an existing project, from a clone of the shell: node <clone>/ai/scripts/install.mts, run at the project's root.
// Nothing existing is overwritten or removed: what is missing is copied, an existing JSON only gains missing keys,
// a line is only added at the end of a file, and the shell's version of a file already there waits in ai/merge/.

import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MERGE = "ai/merge";
const HOOK_EVENTS = ["SessionStart", "PreToolUse", "Stop"];
// What is born from use in the shell has nothing to do in another project.
const LOCAL_ONLY = /^(?:bin|tmp|merge)(?:[\\/]|$)|^claude[\\/]usage\.json$|^(?:session|improvements)\.md$/;
const SCRIPTS: Record<string, string> = {
  "check:ai": "node ai/scripts/check-ai.mts",
  "ai:bin": "node ai/scripts/ai-bin.mts",
  "ai:apply": "node ai/scripts/ai-apply.mts",
  "ai:tmp": "node ai/scripts/ai-tmp.mts",
  "lint:ai": "tsc --noEmit -p ai/scripts",
  "test:ai": "vitest run --config ai/scripts/vitest.config.mts",
  peek: "node ai/scripts/peek.mts",
};
// Out of git: Claude's tooling, except what the project already had (the team decides).
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

// The original file's indentation is kept.
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
  if (resolve(target) === resolve(shell)) return stop("Run it from your project's root, not from the shell.");
  if (existsSync(at("ai/scripts/check-ai.mts"))) return stop("The shell is already installed here: nothing was changed.");
  if (existsSync(at("ai"))) return stop("This project already has an ai/ folder: installation stopped, nothing was changed.");
  const pkg = existsSync(at("package.json")) ? parse(at("package.json")) : {};
  if (!pkg) return stop("package.json unreadable (invalid JSON): installation stopped, nothing was changed.");

  const existed = new Set(KEPT_OUT.filter((path) => existsSync(at(path))));
  const report: string[] = [];
  const park = (path: string, why = "kept as is") => {
    mkdirSync(at(MERGE), { recursive: true });
    cpSync(from(path), join(at(MERGE), path.replace(/^\./, "").replaceAll("/", "-")));
    report.push(`${path} existed: ${why}; the shell's version waits in ${MERGE}/, Claude proposes the merge.`);
  };

  cpSync(from("ai"), at("ai"), { recursive: true, filter: (source) => !LOCAL_ONLY.test(relative(from("ai"), source)) });
  report.push("ai/ copied.");

  if (existsSync(at("CLAUDE.md"))) park("CLAUDE.md");
  else cpSync(from("CLAUDE.md"), at("CLAUDE.md"));

  const settingsFile = at(".claude/settings.json");
  const ours = parse(from(".claude/settings.json")) ?? {};
  const theirs = existsSync(settingsFile) ? parse(settingsFile) : undefined;
  if (!existsSync(settingsFile)) {
    mkdirSync(at(".claude"), { recursive: true });
    cpSync(from(".claude/settings.json"), settingsFile);
  } else if (!theirs) {
    park(".claude/settings.json", "unreadable, kept as is, the shell's hooks inactive meanwhile");
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
    report.push(".claude/settings.json existed: the shell's hooks and permissions added, nothing removed.");
  }

  if (existed.has(".ignore")) report.push(`.ignore existed: added at the end ${appendLines(at(".ignore"), readFileSync(from(".ignore"), "utf8").split(/\r?\n/).filter(Boolean)).join(", ") || "nothing"}.`);
  else cpSync(from(".ignore"), at(".ignore"));

  const added = appendLines(at(".gitignore"), KEPT_OUT.filter((path) => !existed.has(path)));
  report.push(`.gitignore: ${added.length ? `added at the end ${added.join(", ")}` : "nothing to add"}.`);
  const kept = KEPT_OUT.filter((path) => existed.has(path));
  if (kept.length) report.push(`${kept.join(", ")} already existed: not added to .gitignore, your call whether they stay in git.`);

  const created = !existsSync(at("package.json"));
  const scripts = record(pkg.scripts);
  const clashes = Object.keys(SCRIPTS).filter((name) => name in scripts && scripts[name] !== SCRIPTS[name]);
  for (const [name, command] of Object.entries(SCRIPTS)) if (!(name in scripts)) scripts[name] = command;
  const dev = record(pkg.devDependencies);
  const deps = record(pkg.dependencies);
  for (const [name, version] of Object.entries(record(parse(from("package.json"))?.devDependencies))) if (!(name in dev) && !(name in deps)) dev[name] = version;
  const base = created ? { name: resolve(target).replace(/^.*[\\/]/, "").toLowerCase(), private: true } : pkg;
  writeJson(at("package.json"), { ...base, scripts, devDependencies: dev });
  report.push(`package.json ${created ? "created" : "completed"}: missing scripts and devDependencies added, none changed.`);
  if (clashes.length) report.push(`Scripts already taken by the project, kept as is: ${clashes.join(", ")}; Claude proposes another name.`);

  report.push("Next: npm install, then open the project in Claude Code and say hello.");
  return { ok: true, report };
}

if (import.meta.main) {
  const { ok, report } = install(process.cwd(), resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
  console.log(report.join("\n"));
  if (!ok) process.exitCode = 1;
}
