import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { install } from "./install.mts";

const HOOK = { hooks: [{ type: "command", command: 'cd "$CLAUDE_PROJECT_DIR" && node ai/scripts/hook.mts' }] };
const SHELL_FILES: Record<string, string> = {
  "CLAUDE.md": "# AI workflow\n",
  ".claude/settings.json": JSON.stringify({ permissions: { allow: ["Bash(npm run check:ai*)"] }, hooks: { SessionStart: [HOOK], PreToolUse: [HOOK], Stop: [HOOK] } }),
  ".ignore": "!ai/\nai/bin/\n",
  "package.json": JSON.stringify({ name: "resonhance-wwai-shell", devDependencies: { vitest: "^5.0.5", typescript: "7.0.2" } }),
  "ai/scripts/check-ai.mts": "// check\n",
  "ai/onboarding.md": "# Onboarding\n",
  "ai/session.md": "# The shell's session\n",
  "ai/claude/usage.json": "{}\n",
  "ai/bin/2026-11-01-x/a.md": "copy\n",
};

let shell = "";
let project = "";
const write = (root: string, files: Record<string, string>) => {
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), text);
  }
};
const read = (file: string) => readFileSync(join(project, file), "utf8");
const json = (file: string) => JSON.parse(read(file));

beforeEach(() => {
  shell = mkdtempSync(join(tmpdir(), "shell-"));
  project = mkdtempSync(join(tmpdir(), "project-"));
  write(shell, SHELL_FILES);
});

afterEach(() => {
  rmSync(shell, { recursive: true, force: true });
  rmSync(project, { recursive: true, force: true });
});

describe("project with nothing from the shell", () => {
  test("copies the tooling, without what is born from the shell's use", () => {
    expect(install(project, shell).ok).toBe(true);
    expect(read("CLAUDE.md")).toBe("# AI workflow\n");
    expect(existsSync(join(project, "ai/onboarding.md"))).toBe(true);
    for (const local of ["ai/session.md", "ai/claude/usage.json", "ai/bin"]) expect(existsSync(join(project, local))).toBe(false);
    expect(read(".gitignore")).toBe("CLAUDE.md\n.claude/\nai/\ncontext/\n.ignore\n");
    expect(json("package.json").scripts["check:ai"]).toBe("node ai/scripts/check-ai.mts");
  });
});

describe("existing project: nothing overwritten, nothing removed", () => {
  const EXISTING = {
    "CLAUDE.md": "# Team rules\n",
    ".claude/settings.json": JSON.stringify({ permissions: { allow: ["Bash(make *)"], deny: ["Read(./secrets/**)"] }, hooks: { Stop: [{ hooks: [{ type: "command", command: "echo done" }] }] } }, null, 4),
    ".gitignore": "node_modules\n/dist",
    ".ignore": "vendor/\n",
    "package.json": JSON.stringify({ name: "app", scripts: { test: "jest", peek: "node tools/peek.js" }, devDependencies: { vitest: "^3.0.0" } }, null, 2),
    "docs/guide.md": "# Guide\n",
    "vitest.config.ts": "export default {};\n",
  };

  test("keeps every project file and only adds what is missing", () => {
    write(project, EXISTING);
    const { ok, report } = install(project, shell);
    expect(ok).toBe(true);
    expect(read("CLAUDE.md")).toBe("# Team rules\n");
    expect(readFileSync(join(project, "ai/merge/CLAUDE.md"), "utf8")).toBe("# AI workflow\n");
    expect(read("docs/guide.md")).toBe("# Guide\n");
    expect(read("vitest.config.ts")).toBe("export default {};\n");
    expect(readdirSync(project).filter((name) => name.startsWith("vitest"))).toEqual(["vitest.config.ts"]);

    const settings = json(".claude/settings.json");
    expect(settings.permissions.deny).toEqual(["Read(./secrets/**)"]);
    expect(settings.permissions.allow).toEqual(["Bash(make *)", "Bash(npm run check:ai*)"]);
    expect(settings.hooks.Stop).toEqual([{ hooks: [{ type: "command", command: "echo done" }] }, HOOK]);
    expect(read(".claude/settings.json").startsWith('{\n    "permissions"')).toBe(true);

    expect(read(".gitignore")).toBe("node_modules\n/dist\nai/\ncontext/\n");
    expect(read(".ignore")).toBe("vendor/\n!ai/\nai/bin/\n");

    const pkg = json("package.json");
    expect(pkg.scripts.test).toBe("jest");
    expect(pkg.scripts.peek).toBe("node tools/peek.js");
    expect(pkg.scripts["test:ai"]).toBe("vitest run --config ai/scripts/vitest.config.mts");
    expect(pkg.devDependencies).toEqual({ vitest: "^3.0.0", typescript: "7.0.2" });
    expect(report.join("\n")).toContain("Scripts already taken by the project, kept as is: peek");
  });

  test("run again, the installation does nothing", () => {
    write(project, EXISTING);
    install(project, shell);
    expect(install(project, shell)).toEqual({ ok: false, report: ["The shell is already installed here: nothing was changed."] });
  });
});

describe("stops without touching anything", () => {
  test.each([
    ["a project ai/ folder", { "ai/model.py": "x = 1\n" }, "already has an ai/ folder"],
    ["an unreadable package.json", { "package.json": "{ nope" }, "package.json unreadable"],
  ])("%s", (_, files, message) => {
    write(project, files);
    const before = readdirSync(project, { recursive: true });
    const { ok, report } = install(project, shell);
    expect(ok).toBe(false);
    expect(report[0]).toContain(message);
    expect(readdirSync(project, { recursive: true })).toEqual(before);
  });

  test("unreadable settings stay as they are, the shell's version waits aside", () => {
    write(project, { ".claude/settings.json": "{ // comment\n}" });
    install(project, shell);
    expect(read(".claude/settings.json")).toBe("{ // comment\n}");
    expect(existsSync(join(project, "ai/merge/claude-settings.json"))).toBe(true);
  });
});
