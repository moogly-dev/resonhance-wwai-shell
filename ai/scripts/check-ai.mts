// Checks the `ai/` artefacts (CLAUDE.md, "`ai/` artefacts"): references, paths, card headers and indexes;
// source isolation and authority, the safety fence of Claude's scripts, selection of what no longer serves.
// Usage, in Git Bash: npm run check:ai ; full lists: npm run check:ai -- --details
// Fails on an error; a warning is only to be examined. The report is grouped by file.
// `ai/scripts/hook.mts` runs it at session start (report read by Claude) and at the end of a turn when Claude has written.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { type Ledger, readLedger } from "./usage.mts";

export type Finding = { file: string; message: string };

// File that defines each numbered family, through a `### X-n` heading.
const HEADED: Record<string, string> = {
  "ai/00-objectives.md": "O",
  "ai/01-decisions.md": "D",
  "ai/02-glossary.md": "G",
  "ai/03-texts.md": "T",
  "ai/04-rituals.md": "R",
  "ai/05-code-guideline.md": "PUC",
};
// Folders that define each family, one file and its header per item, plus an index.
const FOLDERS: [string, string][] = [
  ["F", "ai/features"],
  ["Q", "ai/issues"],
  ["S", "ai/sources"],
  ["M", "ai/claude/sources"],
];
const INDEX = "INDEX.md";
const REGISTRY = "ai/04-rituals.md";

const REFERENCE = /\b([DFQRSOPUCGTM])-(\d+)\b/g;
const RULE_REFERENCE = /\b(F-\d+) R(\d+)\b/g;
// An ai/ path follows neither a letter nor a dash: "@anthropic-ai/sdk" is a package name, not a path.
const PATH = /(?<![\w-])ai\/([\w.-]+(?:\/[\w.-]+)*)/g;
// `ai/bin/`, `ai/tmp/`, `ai/merge/` and the usage ledger are born from use: a reference to them need not exist.
const DISPOSABLE = /^(?:bin|tmp|merge)(?:\/|$)|^claude\/usage\.json$/;
// A bare file number ("in 05") changes meaning when files change: cite the name.
const BARE_FILE_NUMBER = /(?<![\w:/.,-])0\d(?![\w:/-]|\.\w)/g;
const HOOKS = ".claude/settings.json";
const PROVISIONAL = /PROVISIONAL \(([^)]*\d[^)]*)\)/;
// Only Claude's scripts go in the registry; the application's scripts belong to its team.
const SCRIPT_DIRS = ["ai/scripts"];
const SCRIPT_FILE = /\.(?:mts|mjs|ts|js|sh)$/;
// Code folders whose references are checked, to adjust to the stack of the Foundation; a missing folder is skipped.
const CODE_DIRS = ["src", "lib", "app", "test", "tests", "scripts", ...SCRIPT_DIRS];
const CODE_FILE = /\.(?:[cm]?[jt]sx?|vue|svelte|astro|css|scss|html|sql|py|rb|php|go|rs|java|kt|cs|swift)$/;
// Tests of Claude's scripts cite made-up numbers and paths: their references are worthless.
const isToolTest = (file: string) => file.startsWith("ai/scripts/") && file.includes(".test.");
// Code cites its items in comments: a string or a project identifier (a quarter, a product code) is not a reference.
const COMMENT = /\/\/|\/\*|<!--|\{\/\*|(?:^|\s)#\s|^\s*\*|(?:^|\s)--\s/;
const commentOf = (line: string) => {
  const at = line.search(COMMENT);
  return at < 0 ? "" : line.slice(at);
};
// Families an item may cite (CLAUDE.md, "References"): what grounds it, and its question.
const MAY_CITE: Record<string, string> = { D: "DOSQ", F: "DFOSQ", S: "S", M: "M" };
// Claude's sources (M) only serve its tooling: no project item cites them.
const PROJECT_FAMILIES = "ODFQGTPUCS";
export const STATUSES = ["provisional", "active"];
const RELIABILITY = ["verified", "observed", "cross-checked", "single source", "disputed", "unsourced"];
// A rank 1 or 2 put on a practitioners' or second-hand site is a rank 3 in disguise.
const PRACTITIONERS = /(?:^|\.)(?:stackoverflow\.com|stackexchange\.com|reddit\.com|medium\.com|dev\.to|quora\.com|youtube\.com|x\.com|twitter\.com|facebook\.com|linkedin\.com|wikipedia\.org|substack\.com|hashnode\.dev)$/;
// "project": to build in the current line of work; "secondary": kept, built only on request.
const SCOPES = ["project", "secondary"];
const QUESTION_TYPES = ["gap", "ambiguity", "contradiction"];
const MAX_FACT = 800;
const MAX_SESSION_LINE = 300;
// The Foundation of CLAUDE.md waits for the user as long as it keeps this marker.
export const BLANK = "<to fill";
// The onboarding of a copy, removed once done.
export const START = "ai/onboarding.md";
// The projects' .gitignore, shipped by the shell; in a project, what must stay out of git.
export const SHELL_GITIGNORE = "gitignore.project";
const KEPT_OUT = ["ai", "CLAUDE.md", ".claude"];
// A typo (".gitgnore") creates a file git silently ignores: two letters apart at most.
const TYPO_DISTANCE = 2;
function distance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (const [i, letter] of [...a].entries()) {
    const current = [i + 1];
    for (const [j, other] of [...b].entries()) current.push(Math.min(previous[j + 1] + 1, current[j] + 1, previous[j] + (letter === other ? 0 : 1)));
    previous = current;
  }
  return previous[b.length];
}
const looksLikeGitignore = (name: string) => name !== ".gitignore" && distance(name.toLowerCase().replace(/^\./, ""), "gitignore") <= TYPO_DISTANCE;
// CLAUDE.md and its `@` imports enter every message: past this, reduce before adding. A filled Foundation and a running session fit.
const CONTEXT_BUDGET = 14_000;
// Selection: alive is what a root reaches; the rest, unused for EXTINCTION_DAYS, is a candidate for extinction.
const ROOT_FAMILIES = "ORPUCGT";
const MORTAL_FAMILIES = "DFQSM";
const NOT_PROPAGATED = /^(?:used_by|touches):.*$/gm;
const EXTINCTION_DAYS = 14;
const REVIEW_DAYS = 90;
const STALE_TOOLING_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;
// Fence of Claude's scripts, which hooks run without asking: no network, no process, no home folder, no secret.
export const FENCE: [RegExp, string][] = [
  [/\b(?:from\s+|import\(\s*)["'](?:node:)?(?:child_process|cluster|net|tls|dgram|https?|http2)["']/, "network or spawned process"],
  [/\bfetch\s*\(|\bnew\s+WebSocket\b/, "network"],
  [/\bhomedir\s*\(|process\.env\.(?:HOME|USERPROFILE|APPDATA|LOCALAPPDATA)\b/, "home folder, outside the project"],
  [/["'`][^"'`\n]*\.env\b/, ".env file"],
];
// This file writes the fence patterns: it cannot be subject to them.
export const FENCE_KEEPER = "ai/scripts/check-ai.mts";
const REPORT_LINES = 20;

const ids = (text: string) => [...text.matchAll(REFERENCE)].map(([, family, number]) => `${family}-${Number(number)}`);

const frontMatter = (text: string): Record<string, string> =>
  Object.fromEntries(
    (text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "").split("\n").map((line) => {
      const colon = line.indexOf(":");
      return [line.slice(0, colon), line.slice(colon + 1).trim().replace(/^"|"$/g, "").replace(/\\(["\\])/g, "$1")];
    }),
  );

const values = (list = "") => [...list.matchAll(/"[^"]*"|[^[\],\s][^,\]]*/g)].map(([value]) => value.replaceAll('"', "").trim());
const orDash = (list: string[]) => list.join(", ") || "—";
// A dependency may carry a note in parentheses: only its first identifier makes the link.
const linked = (list?: string) => values(list).flatMap((value) => ids(value).slice(0, 1));
const daysBetween = (fromMs: number, to: Date) => Math.floor((to.getTime() - fromMs) / DAY_MS);

export function checkAi(root = ".", { now = new Date(), ledger = readLedger(root) }: { now?: Date; ledger?: Ledger } = {}) {
  const errors: Finding[] = [];
  const warnings: Finding[] = [];
  const exists = (file: string) => existsSync(join(root, file));
  const read = (file: string) => readFileSync(join(root, file), "utf8").replaceAll("\r\n", "\n");
  const tree = (dir: string) => (readdirSync(join(root, dir), { recursive: true }) as string[]).map((name) => `${dir}/${name.replaceAll("\\", "/")}`);

  const items = new Map<string, { file: string; text: string; header: Record<string, string> }>();
  const define = (id: string, file: string, text: string, header: Record<string, string> = {}) => {
    if (items.has(id)) errors.push({ file, message: `number defined twice: ${id} (also in ${items.get(id)?.file})` });
    items.set(id, { file, text, header });
  };

  for (const [file, families] of Object.entries(HEADED)) {
    if (!exists(file)) continue;
    for (const block of read(file).split(/^(?=#{2,3} )/m)) {
      const [, family, number] = block.match(/^### ([A-Z])-(\d+)\b/) ?? [];
      if (!family) continue;
      if (!families.includes(family)) errors.push({ file, message: `family ${family} out of place` });
      define(`${family}-${Number(number)}`, file, block);
      const status = block.match(/\*\*Status:\*\* (.+)/)?.[1];
      if (!STATUSES.includes(status ?? "")) {
        errors.push({ file, message: `${family}-${Number(number)}: status "${status ?? "missing"}" (${STATUSES.join(" | ")})` });
      }
    }
  }

  const fileNames = new Map<string, string>();
  for (const [family, dir] of FOLDERS) {
    if (!exists(dir)) continue;
    for (const name of readdirSync(join(root, dir)).filter((entry) => entry.endsWith(".md") && entry.startsWith(`${family}-`))) {
      const file = `${dir}/${name}`;
      const text = read(file);
      const header = frontMatter(text);
      const [fromName] = ids(name);
      if (!fromName?.startsWith(`${family}-`) || header.id !== fromName) {
        errors.push({ file, message: `header id "${header.id}" differs from the file name` });
      }
      define(fromName, file, text, header);
      fileNames.set(fromName, name);
    }
  }

  const rulesOf = new Map<string, Set<string>>();
  for (const [id, { file, text, header }] of items) {
    const say = (message: string) => errors.push({ file, message: `${id}: ${message}` });
    const flag = (message: string) => warnings.push({ file, message: `${id}: ${message}` });

    const mayCite = MAY_CITE[id[0]];
    for (const other of new Set(ids(text))) {
      if (other.startsWith("M-") && PROJECT_FAMILIES.includes(id[0])) say(`cites ${other}, a source of Claude's: it only serves Claude's tooling`);
      else if (mayCite && !mayCite.includes(other[0])) say(`cites ${other}, against the direction of references`);
    }

    if (id.startsWith("F-")) {
      const rules = [...text.matchAll(/^### R(\d+)/gm)].map(([, number]) => number);
      const acceptance = [...text.matchAll(/^- \[[ x]\] A\d+/gm)].length;
      rulesOf.set(id, new Set(rules));
      if (!STATUSES.includes(header.status)) say(`status "${header.status}" (${STATUSES.join(" | ")})`);
      // The scope tells at a glance whether the card is built in the current line of work; a change of line shows here, not in a decision.
      if (!SCOPES.includes(header.scope)) say(`scope "${header.scope ?? "missing"}" (${SCOPES.join(" | ")})`);
      if (Number(header.rules) !== rules.length) say(`rules is ${header.rules}, the card has ${rules.length}`);
      if (Number(header.acceptance) !== acceptance) say(`acceptance is ${header.acceptance}, the card has ${acceptance}`);
      if (header.status === "active" && (!rules.length || !acceptance)) say("rules or acceptance criteria missing");
      for (const source of values(header.sources)) {
        if (!/^S-\d+$/.test(source)) flag(`sources: "${source}" is not an S-n`);
      }
      const declared = new Set(ids(header.references));
      // `used_by` only mirrors the other cards' `depends_on`: it is not a citation.
      const cited = new Set(ids(text.replace(/^(references|used_by):.*$/gm, "")).filter((other) => other !== id));
      for (const other of cited) if (!declared.has(other)) say(`cites ${other}, missing from references`);
      for (const other of declared) if (!cited.has(other)) say(`references holds ${other}, never cited`);
    }

    if (id.startsWith("Q-")) {
      const options = [...text.matchAll(/^- (?:.+: )?[A-Z]:/gm)].length;
      if (!QUESTION_TYPES.includes(header.type)) say(`type "${header.type}" (${QUESTION_TYPES.join(" | ")})`);
      if ((Number(header.options) || 0) !== options) say(`options is ${header.options}, the question has ${options}`);
    }

    if (/^[SM]-/.test(id)) {
      if (!RELIABILITY.includes(header.reliability)) say(`reliability "${header.reliability}" (${RELIABILITY.join(" | ")})`);
      const links = [...text.matchAll(/^- \[([123])\] (?:\{[a-z0-9]{1,4}\} )?\[[^\]]*\]\(https?:\/\/([^/)]+)/gm)];
      // Cross-checking takes at least two sites; the check cannot see reprints of one wire story: judge that when writing.
      const sites = new Set(links.map(([, , site]) => site));
      if (header.reliability === "cross-checked" && sites.size < 2) flag('"cross-checked" needs at least two independent sites');
      for (const [, rank, site] of links) {
        if (rank !== "3" && PRACTITIONERS.test(site.replace(/^www\./, ""))) flag(`rank ${rank} on ${site}, a practitioners' or second-hand site: rank 3, trace it back to its primary source`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(header.verified ?? "")) say(`verified "${header.verified}" is not a date`);
      else if (id.startsWith("M-") && daysBetween(Date.parse(header.verified), now) > STALE_TOOLING_DAYS) flag(`verified on ${header.verified}; tooling changes fast: verify it again or remove it`);
      const lines = [...text.matchAll(/^- \[([123])\]/gm)].map(([, rank]) => rank);
      const ranks = values(header.ranks);
      if ([...new Set(lines)].sort().join() !== [...ranks].sort().join()) say(`ranks [${ranks}] differ from the ranks of its sources [${[...new Set(lines)]}]`);
      if (header.reliability === "verified" && !lines.includes("1") && lines.filter((rank) => rank === "2").length < 2) {
        flag('"verified" needs one rank-1 source or two rank-2 sources');
      }
      // A search brings back a line: a whole paragraph is costly to reread, or gets truncated.
      const knowledge = text.match(/## Knowledge\n\n([\s\S]*?)(?:\n\n## |$)/)?.[1] ?? "";
      if (knowledge.split("\n").some((line) => line.length > MAX_FACT)) flag(`a "Knowledge" line exceeds ${MAX_FACT} characters: one fact per line`);
    }
  }

  // A decision does not rest on a rank-3 source alone; a feature is only flagged.
  const thirdRankOnly = (id: string) => {
    const ranks = /^[SM]-/.test(id) ? values(items.get(id)?.header.ranks) : [];
    return ranks.length > 0 && ranks.every((rank) => rank === "3");
  };
  for (const [id, { file, text }] of items) {
    if (!id.startsWith("D-") && !id.startsWith("F-")) continue;
    for (const source of new Set(ids(text).filter(thirdRankOnly))) {
      (id.startsWith("D-") ? errors : warnings).push({ file, message: `${id} rests on ${source}, rank 3 only: trace it back to a rank 1 or 2 source` });
    }
  }

  // Links between items: mutual dependencies, and the item's reference to its question.
  for (const [id, { file, header }] of items) {
    if (id.startsWith("F-")) {
      for (const other of linked(header.depends_on)) {
        if (!other.startsWith("F-")) errors.push({ file, message: `${id}: depends_on holds ${other}, which is not a feature` });
        else if (!linked(items.get(other)?.header.used_by).includes(id)) errors.push({ file, message: `${id} depends on ${other}, missing from its used_by` });
      }
      for (const other of linked(header.used_by)) {
        if (!linked(items.get(other)?.header.depends_on).includes(id)) errors.push({ file, message: `${id} has ${other} in used_by, missing from its depends_on` });
      }
    }
    if (id.startsWith("Q-")) {
      for (const touched of values(header.touches)) {
        const [target] = ids(touched);
        const item = items.get(target);
        if (!target) warnings.push({ file, message: `${id} touches "${touched}", which is not an item` });
        else if (item && !ids(item.text).includes(id)) errors.push({ file: item.file, message: `${target} does not reference ${id}` });
      }
    } else {
      for (const question of new Set(ids(items.get(id)?.text ?? "").filter((other) => other.startsWith("Q-")))) {
        const asked = items.get(question);
        if (asked && !ids(asked.header.touches ?? "").includes(id)) warnings.push({ file, message: `${id} cites ${question}, whose touches does not hold it` });
      }
    }
  }

  // An index mirrors the header of each card of its folder exactly; an entry without a card comes out as an orphan reference.
  for (const [family, dir] of FOLDERS) {
    const file = `${dir}/${INDEX}`;
    const mine = [...items].filter(([id, item]) => id.startsWith(`${family}-`) && item.file.startsWith(`${dir}/`));
    if (!mine.length) continue;
    if (!exists(file)) {
      errors.push({ file, message: "index missing" });
      continue;
    }
    const entries = new Map(read(file).split(/^- \*\*/m).slice(1).map((entry) => [ids(entry)[0], entry.split("\n\n")[0].trimEnd()]));
    for (const [id, { header }] of mine) {
      const entry = entries.get(id);
      const name = fileNames.get(id);
      const matches =
        family === "F"
          ? entry === `${id} — ${header.title}**\n  - Status: ${header.status}\n  - Scope: ${header.scope}\n  - Depends on: ${orDash(values(header.depends_on))}\n  - Used by: ${orDash(values(header.used_by))}\n  - Rules: ${Number(header.rules) || "—"}\n  - File: \`features/${name}\``
          : family === "Q"
            ? entry?.startsWith(`${id} · ${header.type}**`) && entry.endsWith(`\n  - Touches: ${orDash(values(header.touches))}\n  - Options: ${Number(header.options) || "—"}\n  - File: \`${name}\``)
            : entry === `${id} — ${header.title}** · ${header.reliability}`;
      if (!matches) errors.push({ file, message: entry ? `entry of ${id} differs from its header` : `${id} missing from the index` });
    }
  }

  const aiTree = exists("ai") ? tree("ai") : [];
  const pathExists = (path: string) => aiTree.includes(`ai/${path}`) || aiTree.some((known) => known.startsWith(`ai/${path}-`));
  // `ai/bin/` keeps stale copies, `ai/tmp/` disposable files: their references are worthless.
  const isArtefact = (name: string) => name.endsWith(".md") && !/^ai\/(bin|tmp)\//.test(name);
  const artefacts = [...(exists("CLAUDE.md") ? ["CLAUDE.md"] : []), ...aiTree.filter(isArtefact)];
  const code = [...readdirSync(root), ...CODE_DIRS.filter(exists).flatMap(tree)].filter((name) => CODE_FILE.test(name) && !isToolTest(name));
  const isActive = (id: string) => items.get(id)?.header.status === "active" || /\*\*Status:\*\* active/.test(items.get(id)?.text ?? "");

  for (const file of [...artefacts, ...code]) {
    const scan = code.includes(file) ? commentOf : (line: string) => line;
    read(file)
      .split("\n")
      .map(scan)
      .forEach((line, index) => {
        const at = `(l. ${index + 1})`;
        for (const id of ids(line)) {
          if (!items.has(id)) errors.push({ file, message: `orphan reference: ${id} ${at}` });
        }
        for (const [, feature, rule] of line.matchAll(RULE_REFERENCE)) {
          if (items.has(feature) && !rulesOf.get(feature)?.has(rule)) errors.push({ file, message: `unknown rule: ${feature} R${rule} ${at}` });
        }
        for (const [, raw] of line.matchAll(PATH)) {
          const path = raw.replace(/\.+$/, "");
          // A template (`F-nnn-slug.md`) is not a file.
          if (!path.includes("nnn") && !DISPOSABLE.test(path) && !pathExists(path)) errors.push({ file, message: `path not found: ai/${path} ${at}` });
        }
        if (artefacts.includes(file)) {
          for (const [number] of line.matchAll(BARE_FILE_NUMBER)) {
            // A file may cite its own number, in its title for instance.
            if (!file.startsWith(`ai/${number}-`)) warnings.push({ file, message: `bare file number: "${number}" ${at}` });
          }
        }
      });
  }

  // Code of a non-active item is a trial: it says so and links to its items, for the next session. A source has no status.
  const provisional: { file: string; items: string }[] = [];
  for (const file of code) {
    const text = read(file).split("\n").map(commentOf).join("\n");
    const marker = text.match(PROVISIONAL)?.[1];
    if (marker) {
      provisional.push({ file, items: marker });
      for (const id of ids(marker)) {
        if (isActive(id)) errors.push({ file, message: `stale PROVISIONAL marker: ${id} is active, remove it` });
      }
    }
    const inactive = [...new Set(ids(text))].filter((id) => items.has(id) && !/^[SM]-/.test(id) && !isActive(id));
    if (inactive.length && !marker) {
      errors.push({ file, message: `cites ${inactive.join(", ")}, not active: add at the top "// PROVISIONAL (${inactive.join(", ")})"` });
    }
    const claudeOnly = [...new Set(ids(text).filter((id) => id.startsWith("M-")))];
    if (claudeOnly.length && !file.startsWith("ai/scripts/")) errors.push({ file, message: `cites ${claudeOnly.join(", ")}, a source of Claude's: application code does not cite it` });
  }

  // An automation the registry ignores would be lost to the next session.
  const registry = exists(REGISTRY) ? read(REGISTRY) : "";
  const automations = [
    ...SCRIPT_DIRS.filter(exists)
      .flatMap(tree)
      .filter((name) => SCRIPT_FILE.test(name) && !name.includes(".test.")),
    ...(exists(HOOKS) ? [HOOKS] : []),
  ];
  for (const file of automations) {
    if (!registry.includes(file)) errors.push({ file, message: `automation missing from ${REGISTRY}: record its trigger, its command and how to remove it` });
    if (file.startsWith("ai/scripts/") && file !== FENCE_KEEPER) {
      const text = read(file);
      for (const [pattern, what] of FENCE) if (pattern.test(text)) errors.push({ file, message: `safety fence: ${what}; only the user can allow it` });
    }
  }

  // A Claude automation starts on trial and stays only through measured use; a kept one is reviewed.
  const claudeSection = registry.split(/^## /m).find((section) => section.startsWith("Claude's automations")) ?? "";
  for (const block of claudeSection.split(/^(?=### )/m).slice(1)) {
    const [id] = ids(block.split("\n")[0]);
    const [, kind, date] = block.match(/\*\*Selection:\*\* (trial until|kept on) (\d{4}-\d{2}-\d{2})/) ?? [];
    if (!kind) {
      errors.push({ file: REGISTRY, message: `${id}: Selection missing ("trial until YYYY-MM-DD; measure: …" or "kept on YYYY-MM-DD: evidence")` });
      continue;
    }
    const names = [...block.matchAll(/\bai\/scripts\/([\w-]+)\.mts\b/g), ...block.matchAll(/\bnpm (?:run )?([\w:-]+)/g)].map(([, name]) => name);
    const used = Object.entries(ledger.runs)
      .filter(([key]) => names.some((name) => key.includes(name)))
      .reduce((sum, [, run]) => sum + run.count, 0);
    const age = daysBetween(Date.parse(date), now);
    if (kind === "trial until" && age > 0) warnings.push({ file: REGISTRY, message: `${id}: trial ended on ${date} (measured use: ${used}): keep it with its evidence, or remove it` });
    if (kind === "kept on" && age > REVIEW_DAYS) warnings.push({ file: REGISTRY, message: `${id}: kept on ${date}, to review (measured use: ${used})` });
  }

  // Selection: alive is what a root reaches (vision, rituals, code rules, project features, what CLAUDE.md, the session and the code cite).
  const living = new Set<string>();
  const reached = [
    ...[...items].filter(([id, { header }]) => ROOT_FAMILIES.includes(id[0]) || (id.startsWith("F-") && header.scope === "project")).map(([id]) => id),
    ...["CLAUDE.md", "ai/session.md", "ai/improvements.md"].filter(exists).flatMap((file) => ids(read(file))),
    ...code.flatMap((file) => ids(read(file))),
  ];
  while (reached.length) {
    const id = reached.pop() as string;
    const item = items.get(id);
    if (!item || living.has(id)) continue;
    living.add(id);
    reached.push(...ids(item.text.replace(NOT_PROPAGATED, "")));
  }
  for (const [id, { file }] of items) {
    if (!MORTAL_FAMILIES.includes(id[0]) || living.has(id)) continue;
    const idle = daysBetween(Math.max(statSync(join(root, file)).mtimeMs, Date.parse(ledger.files[file]?.last ?? "") || 0), now);
    const exit = "SM".includes(id[0]) ? "for Claude to remove, after npm run ai:bin" : "to propose for removal to the user";
    if (idle > EXTINCTION_DAYS) warnings.push({ file, message: `${id}: no living item cites it, unused for ${idle} d: candidate for extinction (${exit})` });
  }

  // ai/session.md enters every message: a short line, replaced, never lengthened.
  if (exists("ai/session.md")) {
    read("ai/session.md")
      .split("\n")
      .forEach((line, index) => {
        if (line.length > MAX_SESSION_LINE) warnings.push({ file: "ai/session.md", message: `line too long (l. ${index + 1}, ${line.length} characters): replace it, in ${MAX_SESSION_LINE} at most` });
      });
  }

  let context = 0;
  if (exists("CLAUDE.md")) {
    const claude = read("CLAUDE.md");
    // The user fills the Foundation: while it keeps blanks, the project has no base.
    const blanks = claude.split(BLANK).length - 1;
    if (blanks) warnings.push({ file: "CLAUDE.md", message: `${blanks} "to fill": the Foundation waits for the user; propose each text as before -> after` });
    // The shell itself keeps gitignore.project and an empty Foundation; a started project has neither.
    if (!blanks && exists(SHELL_GITIGNORE)) warnings.push({ file: SHELL_GITIGNORE, message: 'left after onboarding: rename it to .gitignore (new project) or merge its "AI" lines into .gitignore, then remove it' });
    if (!exists(SHELL_GITIGNORE) && (exists(".gitignore") || exists(".git"))) {
      const ignored = new Set((exists(".gitignore") ? read(".gitignore") : "").split("\n").map((line) => line.trim().replace(/^\/|\/$/g, "")));
      const tracked = KEPT_OUT.filter((entry) => !ignored.has(entry));
      if (tracked.length) warnings.push({ file: ".gitignore", message: `does not exclude ${tracked.join(", ")}: Claude's tooling would go into git, unless the team chose to version it ("AI" lines of gitignore.project)` });
    }
    const loaded = [...claude.matchAll(/^@(\S+)\s*$/gm)].map(([, file]) => file).filter(exists);
    context = [claude, ...loaded.map(read)].reduce((sum, text) => sum + text.length, 0);
    if (context > CONTEXT_BUDGET) warnings.push({ file: "CLAUDE.md", message: `permanent context: ${context} characters (CLAUDE.md and its @ imports) for a budget of ${CONTEXT_BUDGET}: reduce before adding` });
  }
  // An existing project has no empty Foundation: onboarding is flagged as long as its file is there.
  if (exists(START)) warnings.push({ file: START, message: "onboarding in progress: follow it before any other task" });
  for (const name of readdirSync(root).filter(looksLikeGitignore)) {
    warnings.push({ file: name, message: "name close to .gitignore, no effect on git: rename or remove it" });
  }

  return { errors, warnings: warnings.filter(({ file, message }, index) => warnings.findIndex((other) => other.file === file && other.message === message) === index), provisional, context };
}

// The report enters Claude's context: short by default, full lists and the context measure with `details`.
export function formatReport({ errors, warnings, provisional, context = 0 }: Omit<ReturnType<typeof checkAi>, "context"> & { context?: number }, details = false) {
  const lines: string[] = [];
  if (details) lines.push(`Permanent context: ${context} characters (CLAUDE.md and its @ imports), for a budget of ${CONTEXT_BUDGET}.`);
  if (provisional.length) lines.push(`Provisional code: ${provisional.length} file(s), trials without proof of direction${details ? "" : "; list: npm run check:ai -- --details"}.`);
  if (details) for (const { file, items } of provisional) lines.push(`  ${file}: ${items}`);
  const findings = [...errors.map((finding) => ({ ...finding, label: "error" })), ...warnings.map((finding) => ({ ...finding, label: "warning" }))];
  const shown = details ? findings : findings.slice(0, REPORT_LINES);
  for (const file of [...new Set(shown.map((finding) => finding.file))].sort()) {
    lines.push(`\n${file}`);
    for (const { message, label } of shown.filter((finding) => finding.file === file)) lines.push(`  ${label}: ${message}`);
  }
  if (shown.length < findings.length) lines.push(`\n… ${findings.length - shown.length} more: npm run check:ai -- --details`);
  lines.push(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  return lines.join("\n").replace(/^\n/, "");
}

if (import.meta.main) {
  const result = checkAi();
  console.log(formatReport(result, process.argv.includes("--details")));
  if (result.errors.length) process.exitCode = 1;
}
