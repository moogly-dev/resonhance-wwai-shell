import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fenceBreach, isForbidden, promptTrap } from "./guard-paths.mts";

describe("commands that raise a permission prompt", () => {
  it("refuses PowerShell and inline node code, lets a script through", () => {
    expect(promptTrap("PowerShell", "npx vitest run | Select-Object -Last 15")).toMatch(/^PowerShell refused/);
    expect(promptTrap("Bash", `cd /D/dev/x && node -e "console.log(1)"`)).toMatch(/^node -e refused/);
    expect(promptTrap("Bash", "node --eval 'x'")).toMatch(/^node -e refused/);
    expect(promptTrap("Bash", "node ai/tmp/claude/read.mts --head 40")).toBeUndefined();
    expect(promptTrap("Bash", "npm run peek -- logs/a.jsonl --around error")).toBeUndefined();
  });
});

describe("fence before running an ai/ script", () => {
  it("refuses a disposable script using the network, lets a sound script and the application's code through", () => {
    const root = mkdtempSync(join(tmpdir(), "guard-"));
    try {
      mkdirSync(join(root, "ai/tmp/claude"), { recursive: true });
      mkdirSync(join(root, "scripts"));
      writeFileSync(join(root, "ai/tmp/claude/trial.mts"), 'await fetch("https://example.org");\n');
      writeFileSync(join(root, "ai/tmp/claude/sound.mts"), "console.log(1);\n");
      writeFileSync(join(root, "scripts/seed.mts"), 'await fetch("https://example.org");\n');
      expect(fenceBreach("cd /D/x && node --no-warnings ai/tmp/claude/trial.mts --all", root)).toMatch(/^Safety fence: ai\/tmp\/claude\/trial\.mts uses network;/);
      expect(fenceBreach("node ai/tmp/claude/sound.mts", root)).toBeUndefined();
      expect(fenceBreach("node scripts/seed.mts", root)).toBeUndefined();
      expect(fenceBreach("npm run check:ai", root)).toBeUndefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("guard-paths", () => {
  it("refuses AppData, in a file as in a command", () => {
    expect(isForbidden({ tool_input: { file_path: "C:\\Users\\x\\AppData\\Local\\Temp\\a.mjs" } })).toBe(true);
    expect(isForbidden({ tool_input: { command: 'node "C:/Users/x/AppData/Local/Temp/a.mjs"' } })).toBe(true);
  });

  it("lets the project through", () => {
    expect(isForbidden({ tool_input: { file_path: "D:\\dev\\project\\ai\\tmp\\batch.json" } })).toBe(false);
    expect(isForbidden({ tool_input: { command: "npm run check:ai" } })).toBe(false);
    expect(isForbidden({})).toBe(false);
  });
});
