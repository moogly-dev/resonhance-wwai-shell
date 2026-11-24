// Contrôle des artefacts de `ai/` (CLAUDE.md, « Artefacts `ai/` ») : renvois, chemins, en-têtes des fiches et index ;
// isolement et autorité des sources, barrière de sécurité des scripts de Claude, sélection de ce qui ne sert plus.
// Usage, dans Git Bash : npm run check:ai ; listes complètes : npm run check:ai -- --details
// Échoue sur une erreur ; un signalement est seulement à examiner. Le rapport est groupé par fichier.
// `ai/scripts/hook.mts` le lance en début de session (rapport lu par Claude) et en fin de tour quand Claude a écrit.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { type Ledger, readLedger } from "./usage.mts";

export type Finding = { file: string; message: string };

// Fichier qui définit chaque famille de numéros, par un titre `### X-n`.
const HEADED: Record<string, string> = {
  "ai/00-objectifs.md": "O",
  "ai/01-decisions.md": "D",
  "ai/02-glossary.md": "G",
  "ai/03-texts.md": "T",
  "ai/04-rituels.md": "R",
  "ai/05-code-guideline.md": "PUC",
};
// Dossiers qui définissent chaque famille, par un fichier et son en-tête, plus un index.
const FOLDERS: [string, string][] = [
  ["F", "ai/features"],
  ["Q", "ai/issues"],
  ["S", "ai/sources"],
  ["M", "ai/claude/sources"],
];
const INDEX = "INDEX.md";
const REGISTRY = "ai/04-rituels.md";

const REFERENCE = /\b([DFQRSOPUCGTM])-(\d+)\b/g;
const RULE_REFERENCE = /\b(F-\d+) R(\d+)\b/g;
// Un chemin de ai/ ne suit ni lettre ni tiret : « @anthropic-ai/sdk » est un nom de paquet, pas un chemin.
const PATH = /(?<![\w-])ai\/([\w.-]+(?:\/[\w.-]+)*)/g;
// `ai/bin/`, `ai/tmp/` et le registre d'usage naissent à l'usage : un renvoi vers eux n'a pas à exister.
const DISPOSABLE = /^(?:bin|tmp)(?:\/|$)|^claude\/usage\.json$/;
// Un numéro de fichier seul (« en 05 ») change de sens quand les fichiers changent : on cite le nom.
const BARE_FILE_NUMBER = /(?<![\w:/.,-])0\d(?![\w:/-]|\.\w)/g;
const HOOKS = ".claude/settings.json";
const PROVISIONAL = /PROVISOIRE \(([^)]*\d[^)]*)\)/;
// Scripts de l'app (`scripts/`) et de Claude (`ai/scripts/`) : chacun s'inscrit au registre.
const SCRIPT_DIRS = ["scripts", "ai/scripts"];
const SCRIPT_FILE = /\.(?:mts|mjs|ts|js|sh)$/;
// Dossiers de code dont les renvois sont contrôlés, à ajuster à la stack du Socle ; un dossier absent est ignoré.
const CODE_DIRS = ["app", "components", "lib", "src", "migrations", "tests", ...SCRIPT_DIRS];
const CODE_FILE = /\.(?:[cm]?[jt]sx?|css|sql)$/;
// Les tests des scripts de Claude citent des numéros et des chemins inventés : leurs renvois ne valent rien.
const isToolTest = (file: string) => file.startsWith("ai/scripts/") && file.includes(".test.");
// Familles qu'un élément peut citer (CLAUDE.md, « Renvois ») : ce qui le fonde et sa question.
const MAY_CITE: Record<string, string> = { D: "DOSQ", F: "DFOSQ", S: "S", M: "M" };
// Les sources de Claude (M) ne servent que son outillage : aucun élément du projet ne les cite.
const PROJECT_FAMILIES = "ODFQGTPUCS";
const RELIABILITY = ["vérifié", "constaté", "recoupé", "une source", "contesté", "non sourcé"];
// Un rang 1 ou 2 posé sur un site de praticiens ou de seconde main est un rang 3 qui s'ignore.
const PRACTITIONERS = /(?:^|\.)(?:stackoverflow\.com|stackexchange\.com|reddit\.com|medium\.com|dev\.to|quora\.com|youtube\.com|x\.com|twitter\.com|facebook\.com|linkedin\.com|wikipedia\.org|substack\.com|hashnode\.dev)$/;
// « projet » : à coder dans la ligne en cours ; « secondaire » : gardée, construite seulement si on la demande.
const SCOPES = ["projet", "secondaire"];
const MAX_FACT = 800;
const MAX_SESSION_LINE = 300;
// Le Socle de CLAUDE.md attend l'utilisateur tant qu'il garde ce marqueur.
export const BLANK = "<à remplir";
// Le parcours de démarrage d'une copie, retiré une fois achevé.
export const START = "ai/demarrage.md";
// Le .gitignore des projets, livré par le shell ; dans un projet, ce qui doit rester hors de git.
export const SHELL_GITIGNORE = "gitignore.projet";
const KEPT_OUT = ["ai", "CLAUDE.md", ".claude"];
// Une faute de frappe (« .gitgnore ») crée un fichier que git ignore sans rien dire : deux lettres d'écart au plus.
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
// CLAUDE.md et ses `@` entrent dans chaque message : au-delà, on réduit avant d'ajouter. Socle rempli et session en cours y tiennent.
const CONTEXT_BUDGET = 14_000;
// Sélection : est vivant ce qu'atteint une racine ; le reste, inemployé depuis EXTINCTION_DAYS, est candidat à l'extinction.
const ROOT_FAMILIES = "ORPUCGT";
const MORTAL_FAMILIES = "DFQSM";
const NOT_PROPAGATED = /^(?:used_by|touches):.*$/gm;
const EXTINCTION_DAYS = 14;
const REVIEW_DAYS = 90;
const STALE_TOOLING_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;
// Barrière des scripts de Claude, que les hooks lancent sans demander : ni réseau, ni processus, ni dossier personnel, ni secret.
export const FENCE: [RegExp, string][] = [
  [/\b(?:from\s+|import\(\s*)["'](?:node:)?(?:child_process|cluster|net|tls|dgram|https?|http2)["']/, "réseau ou processus lancé"],
  [/\bfetch\s*\(|\bnew\s+WebSocket\b/, "réseau"],
  [/\bhomedir\s*\(|process\.env\.(?:HOME|USERPROFILE|APPDATA|LOCALAPPDATA)\b/, "dossier personnel, hors du projet"],
  [/["'`][^"'`\n]*\.env\b/, "fichier .env"],
];
// Ce fichier écrit les motifs de la barrière : il ne peut pas s'y soumettre.
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
// Une dépendance peut porter une note entre parenthèses : seul son premier identifiant fait le lien.
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
    if (items.has(id)) errors.push({ file, message: `numéro défini deux fois : ${id} (aussi dans ${items.get(id)?.file})` });
    items.set(id, { file, text, header });
  };

  for (const [file, families] of Object.entries(HEADED)) {
    if (!exists(file)) continue;
    for (const block of read(file).split(/^(?=#{2,3} )/m)) {
      const [, family, number] = block.match(/^### ([A-Z])-(\d+)\b/) ?? [];
      if (!family) continue;
      if (!families.includes(family)) errors.push({ file, message: `famille ${family} hors de sa place` });
      define(`${family}-${Number(number)}`, file, block);
      const status = block.match(/\*\*Statut :\*\* (.+)/)?.[1];
      if (status !== "provisoire" && status !== "actif") {
        errors.push({ file, message: `${family}-${Number(number)} : statut « ${status ?? "absent"} » (provisoire | actif)` });
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
        errors.push({ file, message: `en-tête id « ${header.id} » différent du nom du fichier` });
      }
      define(fromName, file, text, header);
      fileNames.set(fromName, name);
    }
  }

  const rulesOf = new Map<string, Set<string>>();
  for (const [id, { file, text, header }] of items) {
    const say = (message: string) => errors.push({ file, message: `${id} : ${message}` });
    const flag = (message: string) => warnings.push({ file, message: `${id} : ${message}` });

    const mayCite = MAY_CITE[id[0]];
    for (const other of new Set(ids(text))) {
      if (other.startsWith("M-") && PROJECT_FAMILIES.includes(id[0])) say(`cite ${other}, source de Claude : elle ne sert que son outillage`);
      else if (mayCite && !mayCite.includes(other[0])) say(`cite ${other}, contre le sens des renvois`);
    }

    if (id.startsWith("F-")) {
      const rules = [...text.matchAll(/^### R(\d+)/gm)].map(([, number]) => number);
      const acceptance = [...text.matchAll(/^- \[[ x]\] A\d+/gm)].length;
      rulesOf.set(id, new Set(rules));
      if (!["provisoire", "actif"].includes(header.status)) say(`status « ${header.status} » (provisoire | actif)`);
      // Le périmètre dit d'un coup d'œil si la fiche est à coder dans la ligne en cours ; un changement de ligne se traduit ici, pas par une décision.
      if (!SCOPES.includes(header.scope)) say(`scope « ${header.scope ?? "absent"} » (${SCOPES.join(" | ")})`);
      if (Number(header.rules) !== rules.length) say(`rules vaut ${header.rules}, la fiche en compte ${rules.length}`);
      if (Number(header.acceptance) !== acceptance) say(`acceptance vaut ${header.acceptance}, la fiche en compte ${acceptance}`);
      if (header.status === "actif" && (!rules.length || !acceptance)) say("règles ou critères d'acceptation absents");
      for (const source of values(header.sources)) {
        if (!/^S-\d+$/.test(source)) flag(`sources : « ${source} » n'est pas un S-n`);
      }
      const declared = new Set(ids(header.references));
      // `used_by` n'est que le reflet du `depends_on` des autres fiches : il ne vaut pas citation.
      const cited = new Set(ids(text.replace(/^(references|used_by):.*$/gm, "")).filter((other) => other !== id));
      for (const other of cited) if (!declared.has(other)) say(`cite ${other}, absent de references`);
      for (const other of declared) if (!cited.has(other)) say(`references contient ${other}, jamais cité`);
    }

    if (id.startsWith("Q-")) {
      const options = [...text.matchAll(/^- (?:.+ : )?[A-Z] :/gm)].length;
      if (!["lacune", "ambiguïté", "contradiction"].includes(header.type)) say(`type « ${header.type} » (lacune | ambiguïté | contradiction)`);
      if ((Number(header.options) || 0) !== options) say(`options vaut ${header.options}, la question en compte ${options}`);
    }

    if (/^[SM]-/.test(id)) {
      if (!RELIABILITY.includes(header.reliability)) say(`reliability « ${header.reliability} » (${RELIABILITY.join(" | ")})`);
      const links = [...text.matchAll(/^- \[([123])\] (?:\{[a-z0-9]{1,4}\} )?\[[^\]]*\]\(https?:\/\/([^/)]+)/gm)];
      // Un recoupement demande au moins deux sites ; le contrôle ne voit pas les reprises d'une même dépêche : c'est à juger à l'écriture.
      const sites = new Set(links.map(([, , site]) => site));
      if (header.reliability === "recoupé" && sites.size < 2) flag("« recoupé » demande au moins deux sites indépendants");
      for (const [, rank, site] of links) {
        if (rank !== "3" && PRACTITIONERS.test(site.replace(/^www\./, ""))) flag(`rang ${rank} sur ${site}, site de praticiens ou de seconde main : rang 3, à remonter jusqu'à sa source primaire`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(header.verified ?? "")) say(`verified « ${header.verified} » n'est pas une date`);
      else if (id.startsWith("M-") && daysBetween(Date.parse(header.verified), now) > STALE_TOOLING_DAYS) flag(`vérifiée le ${header.verified} ; l'outillage change vite : la revérifier ou la retirer`);
      const lines = [...text.matchAll(/^- \[([123])\]/gm)].map(([, rank]) => rank);
      const ranks = values(header.ranks);
      if ([...new Set(lines)].sort().join() !== [...ranks].sort().join()) say(`ranks [${ranks}] différent des rangs de ses sources [${[...new Set(lines)]}]`);
      if (header.reliability === "vérifié" && !lines.includes("1") && lines.filter((rank) => rank === "2").length < 2) {
        flag("« vérifié » demande une source de rang 1 ou deux de rang 2");
      }
      // Une recherche ramène une ligne : un paragraphe entier coûte cher à relire, ou se fait tronquer.
      const savoir = text.match(/## Savoir\n\n([\s\S]*?)(?:\n\n## |$)/)?.[1] ?? "";
      if (savoir.split("\n").some((line) => line.length > MAX_FACT)) flag(`une ligne de « Savoir » dépasse ${MAX_FACT} caractères : un fait par ligne`);
    }
  }

  // Une décision ne se fonde pas sur une source de rang 3 seule ; une feature est seulement signalée.
  const thirdRankOnly = (id: string) => {
    const ranks = /^[SM]-/.test(id) ? values(items.get(id)?.header.ranks) : [];
    return ranks.length > 0 && ranks.every((rank) => rank === "3");
  };
  for (const [id, { file, text }] of items) {
    if (!id.startsWith("D-") && !id.startsWith("F-")) continue;
    for (const source of new Set(ids(text).filter(thirdRankOnly))) {
      (id.startsWith("D-") ? errors : warnings).push({ file, message: `${id} s'appuie sur ${source}, de rang 3 seul : remonter à une source de rang 1 ou 2` });
    }
  }

  // Les liens entre éléments : dépendances réciproques, et renvoi de l'élément vers sa question.
  for (const [id, { file, header }] of items) {
    if (id.startsWith("F-")) {
      for (const other of linked(header.depends_on)) {
        if (!other.startsWith("F-")) errors.push({ file, message: `${id} : depends_on contient ${other}, qui n'est pas une feature` });
        else if (!linked(items.get(other)?.header.used_by).includes(id)) errors.push({ file, message: `${id} dépend de ${other}, absent de son used_by` });
      }
      for (const other of linked(header.used_by)) {
        if (!linked(items.get(other)?.header.depends_on).includes(id)) errors.push({ file, message: `${id} a ${other} en used_by, absent de son depends_on` });
      }
    }
    if (id.startsWith("Q-")) {
      for (const touched of values(header.touches)) {
        const [target] = ids(touched);
        const item = items.get(target);
        if (!target) warnings.push({ file, message: `${id} touche « ${touched} », qui n'est pas un élément` });
        else if (item && !ids(item.text).includes(id)) errors.push({ file: item.file, message: `${target} ne porte pas le renvoi vers ${id}` });
      }
    } else {
      for (const question of new Set(ids(items.get(id)?.text ?? "").filter((other) => other.startsWith("Q-")))) {
        const asked = items.get(question);
        if (asked && !ids(asked.header.touches ?? "").includes(id)) warnings.push({ file, message: `${id} cite ${question}, dont le touches ne le contient pas` });
      }
    }
  }

  // Un index reprend exactement l'en-tête de chaque fiche de son dossier ; une entrée sans fiche sort comme renvoi orphelin.
  for (const [family, dir] of FOLDERS) {
    const file = `${dir}/${INDEX}`;
    const mine = [...items].filter(([id, item]) => id.startsWith(`${family}-`) && item.file.startsWith(`${dir}/`));
    if (!mine.length) continue;
    if (!exists(file)) {
      errors.push({ file, message: "index absent" });
      continue;
    }
    const entries = new Map(read(file).split(/^- \*\*/m).slice(1).map((entry) => [ids(entry)[0], entry.split("\n\n")[0].trimEnd()]));
    for (const [id, { header }] of mine) {
      const entry = entries.get(id);
      const name = fileNames.get(id);
      const matches =
        family === "F"
          ? entry === `${id} — ${header.title}**\n  - État : ${header.status}\n  - Périmètre : ${header.scope}\n  - Dépend de : ${orDash(values(header.depends_on))}\n  - Utilisée par : ${orDash(values(header.used_by))}\n  - Règles : ${Number(header.rules) || "—"}\n  - Fiche : \`features/${name}\``
          : family === "Q"
            ? entry?.startsWith(`${id} · ${header.type}**`) && entry.endsWith(`\n  - Touche : ${orDash(values(header.touches))}\n  - Options : ${Number(header.options) || "—"}\n  - Fichier : \`${name}\``)
            : entry === `${id} — ${header.title}** · ${header.reliability}`;
      if (!matches) errors.push({ file, message: entry ? `entrée de ${id} différente de son en-tête` : `${id} absent de l'index` });
    }
  }

  const aiTree = exists("ai") ? tree("ai") : [];
  const pathExists = (path: string) => aiTree.includes(`ai/${path}`) || aiTree.some((known) => known.startsWith(`ai/${path}-`));
  // `ai/bin/` garde des copies périmées, `ai/tmp/` du jetable : leurs renvois ne valent rien.
  const isArtefact = (name: string) => name.endsWith(".md") && !/^ai\/(bin|tmp)\//.test(name);
  const artefacts = [...(exists("CLAUDE.md") ? ["CLAUDE.md"] : []), ...aiTree.filter(isArtefact)];
  const code = [...readdirSync(root), ...CODE_DIRS.filter(exists).flatMap(tree)].filter((name) => CODE_FILE.test(name) && !isToolTest(name));
  const isActive = (id: string) => items.get(id)?.header.status === "actif" || /\*\*Statut :\*\* actif/.test(items.get(id)?.text ?? "");

  for (const file of [...artefacts, ...code]) {
    read(file)
      .split("\n")
      .forEach((line, index) => {
        const at = `(l. ${index + 1})`;
        for (const id of ids(line)) {
          if (!items.has(id)) errors.push({ file, message: `renvoi orphelin : ${id} ${at}` });
        }
        for (const [, feature, rule] of line.matchAll(RULE_REFERENCE)) {
          if (items.has(feature) && !rulesOf.get(feature)?.has(rule)) errors.push({ file, message: `règle inconnue : ${feature} R${rule} ${at}` });
        }
        for (const [, raw] of line.matchAll(PATH)) {
          const path = raw.replace(/\.+$/, "");
          // Un gabarit (`F-nnn-slug.md`) n'est pas un fichier.
          if (!path.includes("nnn") && !DISPOSABLE.test(path) && !pathExists(path)) errors.push({ file, message: `chemin introuvable : ai/${path} ${at}` });
        }
        if (artefacts.includes(file)) {
          for (const [number] of line.matchAll(BARE_FILE_NUMBER)) {
            // Un fichier peut citer son propre numéro, dans son titre par exemple.
            if (!file.startsWith(`ai/${number}-`)) warnings.push({ file, message: `numéro de fichier seul : « ${number} » ${at}` });
          }
        }
      });
  }

  // Le code d'un élément non actif est un essai : il le dit et se relie à ses éléments, pour la session suivante. Une source n'a pas de statut.
  const provisional: { file: string; items: string }[] = [];
  for (const file of code) {
    const text = read(file);
    const marker = text.match(PROVISIONAL)?.[1];
    if (marker) {
      provisional.push({ file, items: marker });
      for (const id of ids(marker)) {
        if (isActive(id)) errors.push({ file, message: `marqueur PROVISOIRE périmé : ${id} est actif, retire-le` });
      }
    }
    const inactive = [...new Set(ids(text))].filter((id) => items.has(id) && !/^[SM]-/.test(id) && !isActive(id));
    if (inactive.length && !marker) {
      errors.push({ file, message: `cite ${inactive.join(", ")}, non actif : ajoute en tête « // PROVISOIRE (${inactive.join(", ")}) »` });
    }
    const claudeOnly = [...new Set(ids(text).filter((id) => id.startsWith("M-")))];
    if (claudeOnly.length && !file.startsWith("ai/scripts/")) errors.push({ file, message: `cite ${claudeOnly.join(", ")}, source de Claude : le code de l'application ne la cite pas` });
  }

  // Une automatisation que le registre ignore serait perdue pour la session suivante.
  const registry = exists(REGISTRY) ? read(REGISTRY) : "";
  const automations = [
    ...SCRIPT_DIRS.filter(exists)
      .flatMap(tree)
      .filter((name) => SCRIPT_FILE.test(name) && !name.includes(".test.")),
    ...(exists(HOOKS) ? [HOOKS] : []),
  ];
  for (const file of automations) {
    if (!registry.includes(file)) errors.push({ file, message: `automatisation absente de ${REGISTRY} : inscris son déclencheur, sa commande et comment la retirer` });
    if (file.startsWith("ai/scripts/") && file !== FENCE_KEEPER) {
      const text = read(file);
      for (const [pattern, what] of FENCE) if (pattern.test(text)) errors.push({ file, message: `barrière de sécurité : ${what} ; seul l'utilisateur peut l'autoriser` });
    }
  }

  // Une automatisation de Claude entre à l'essai et ne reste que par l'usage mesuré ; une retenue se réévalue.
  const claudeSection = registry.split(/^## /m).find((section) => section.startsWith("Automatisations de Claude")) ?? "";
  for (const block of claudeSection.split(/^(?=### )/m).slice(1)) {
    const [id] = ids(block.split("\n")[0]);
    const [, kind, date] = block.match(/\*\*Sélection :\*\* (essai jusqu'au|retenu le) (\d{4}-\d{2}-\d{2})/) ?? [];
    if (!kind) {
      errors.push({ file: REGISTRY, message: `${id} : Sélection absente (« essai jusqu'au AAAA-MM-JJ ; mesure : … » ou « retenu le AAAA-MM-JJ : preuve »)` });
      continue;
    }
    const names = [...block.matchAll(/\bai\/scripts\/([\w-]+)\.mts\b/g), ...block.matchAll(/\bnpm (?:run )?([\w:-]+)/g)].map(([, name]) => name);
    const used = Object.entries(ledger.runs)
      .filter(([key]) => names.some((name) => key.includes(name)))
      .reduce((sum, [, run]) => sum + run.count, 0);
    const age = daysBetween(Date.parse(date), now);
    if (kind === "essai jusqu'au" && age > 0) warnings.push({ file: REGISTRY, message: `${id} : essai échu le ${date} (usage mesuré : ${used}) : le retenir avec sa preuve, ou le retirer` });
    if (kind === "retenu le" && age > REVIEW_DAYS) warnings.push({ file: REGISTRY, message: `${id} : retenu le ${date}, à réévaluer (usage mesuré : ${used})` });
  }

  // Sélection : vivant, ce qu'atteint une racine (vision, rituels, règles de code, features du projet, ce que citent CLAUDE.md, la session et le code).
  const living = new Set<string>();
  const reached = [
    ...[...items].filter(([id, { header }]) => ROOT_FAMILIES.includes(id[0]) || (id.startsWith("F-") && header.scope === "projet")).map(([id]) => id),
    ...["CLAUDE.md", "ai/session.md", "ai/mini-hub.md", "ai/improvements.md"].filter(exists).flatMap((file) => ids(read(file))),
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
    const exit = "SM".includes(id[0]) ? "à retirer par Claude, après npm run ai:bin" : "SORTIE dans ai/mini-hub.md";
    if (idle > EXTINCTION_DAYS) warnings.push({ file, message: `${id} : aucun élément vivant ne le cite, inemployé depuis ${idle} j : candidat à l'extinction (${exit})` });
  }

  // ai/session.md entre dans chaque message : une ligne courte, remplacée, jamais allongée.
  if (exists("ai/session.md")) {
    read("ai/session.md")
      .split("\n")
      .forEach((line, index) => {
        if (line.length > MAX_SESSION_LINE) warnings.push({ file: "ai/session.md", message: `ligne trop longue (l. ${index + 1}, ${line.length} caractères) : la remplacer, en ${MAX_SESSION_LINE} au plus` });
      });
  }

  let context = 0;
  if (exists("CLAUDE.md")) {
    const claude = read("CLAUDE.md");
    // Le Socle se remplit par l'utilisateur : tant qu'il garde des blancs, le projet n'a pas sa base.
    const blanks = claude.split(BLANK).length - 1;
    const start = exists(START) ? ` ; projet qui démarre : suivre ${START}` : "";
    if (blanks) warnings.push({ file: "CLAUDE.md", message: `${blanks} « à remplir » : le Socle attend l'utilisateur ; proposer chaque texte sous la forme avant -> après${start}` });
    // Le shell lui-même garde gitignore.projet et un Socle vide ; un projet démarré n'a plus ni l'un ni l'autre.
    if (!blanks && exists(SHELL_GITIGNORE)) warnings.push({ file: SHELL_GITIGNORE, message: "reste après le démarrage : le renommer en .gitignore (projet neuf) ou fusionner ses lignes « AI » dans .gitignore, puis le retirer" });
    if (!exists(SHELL_GITIGNORE) && (exists(".gitignore") || exists(".git"))) {
      const ignored = new Set((exists(".gitignore") ? read(".gitignore") : "").split("\n").map((line) => line.trim().replace(/^\/|\/$/g, "")));
      const tracked = KEPT_OUT.filter((entry) => !ignored.has(entry));
      if (tracked.length) errors.push({ file: ".gitignore", message: `n'exclut pas ${tracked.join(", ")} : l'outillage de Claude partirait dans git (lignes « AI » de gitignore.projet)` });
    }
    const loaded = [...claude.matchAll(/^@(\S+)\s*$/gm)].map(([, file]) => file).filter(exists);
    context = [claude, ...loaded.map(read)].reduce((sum, text) => sum + text.length, 0);
    if (context > CONTEXT_BUDGET) warnings.push({ file: "CLAUDE.md", message: `contexte permanent : ${context} caractères (CLAUDE.md et ses @) pour un budget de ${CONTEXT_BUDGET} : réduire avant d'ajouter` });
  }
  for (const name of readdirSync(root).filter(looksLikeGitignore)) {
    warnings.push({ file: name, message: "nom voisin de .gitignore, sans effet sur git : le renommer ou le retirer" });
  }

  return { errors, warnings: warnings.filter(({ file, message }, index) => warnings.findIndex((other) => other.file === file && other.message === message) === index), provisional, context };
}

// Le rapport entre dans le contexte de Claude : court par défaut, listes complètes et mesure du contexte avec `details`.
export function formatReport({ errors, warnings, provisional, context = 0 }: Omit<ReturnType<typeof checkAi>, "context"> & { context?: number }, details = false) {
  const lines: string[] = [];
  if (details) lines.push(`Contexte permanent : ${context} caractères (CLAUDE.md et ses @), pour un budget de ${CONTEXT_BUDGET}.`);
  if (provisional.length) lines.push(`Code provisoire : ${provisional.length} fichier(s), essais sans preuve de direction${details ? "" : " ; liste : npm run check:ai -- --details"}.`);
  if (details) for (const { file, items } of provisional) lines.push(`  ${file} : ${items}`);
  const findings = [...errors.map((finding) => ({ ...finding, label: "erreur" })), ...warnings.map((finding) => ({ ...finding, label: "signalement" }))];
  const shown = details ? findings : findings.slice(0, REPORT_LINES);
  for (const file of [...new Set(shown.map((finding) => finding.file))].sort()) {
    lines.push(`\n${file}`);
    for (const { message, label } of shown.filter((finding) => finding.file === file)) lines.push(`  ${label} : ${message}`);
  }
  if (shown.length < findings.length) lines.push(`\n… ${findings.length - shown.length} de plus : npm run check:ai -- --details`);
  lines.push(`\n${errors.length} erreur(s), ${warnings.length} signalement(s)`);
  return lines.join("\n").replace(/^\n/, "");
}

if (import.meta.main) {
  const result = checkAi();
  console.log(formatReport(result, process.argv.includes("--details")));
  if (result.errors.length) process.exitCode = 1;
}
