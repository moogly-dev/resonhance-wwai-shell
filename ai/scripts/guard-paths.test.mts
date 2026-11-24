import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fenceBreach, isForbidden, promptTrap } from "./guard-paths.mts";

describe("commandes qui font surgir un dialogue", () => {
  it("refuse PowerShell et le code node à la volée, laisse passer un script", () => {
    expect(promptTrap("PowerShell", "npx vitest run | Select-Object -Last 15")).toMatch(/^PowerShell refusé/);
    expect(promptTrap("Bash", `cd /D/dev/x && node -e "console.log(1)"`)).toMatch(/^node -e refusé/);
    expect(promptTrap("Bash", "node --eval 'x'")).toMatch(/^node -e refusé/);
    expect(promptTrap("Bash", "node ai/tmp/claude/lire.mts --head 40")).toBeUndefined();
    expect(promptTrap("Bash", "npm run peek -- logs/a.jsonl --around error")).toBeUndefined();
  });
});

describe("barrière avant de lancer un script de ai/", () => {
  it("refuse un script jetable qui emploie le réseau, laisse passer un script sain et le code de l'application", () => {
    const root = mkdtempSync(join(tmpdir(), "guard-"));
    try {
      mkdirSync(join(root, "ai/tmp/claude"), { recursive: true });
      mkdirSync(join(root, "scripts"));
      writeFileSync(join(root, "ai/tmp/claude/essai.mts"), 'await fetch("https://exemple.org");\n');
      writeFileSync(join(root, "ai/tmp/claude/sain.mts"), "console.log(1);\n");
      writeFileSync(join(root, "scripts/seed.mts"), 'await fetch("https://exemple.org");\n');
      expect(fenceBreach("cd /D/x && node --no-warnings ai/tmp/claude/essai.mts --tout", root)).toMatch(/^Barrière de sécurité : ai\/tmp\/claude\/essai\.mts emploie réseau ;/);
      expect(fenceBreach("node ai/tmp/claude/sain.mts", root)).toBeUndefined();
      expect(fenceBreach("node scripts/seed.mts", root)).toBeUndefined();
      expect(fenceBreach("npm run check:ai", root)).toBeUndefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("guard-paths", () => {
  it("refuse AppData, dans un fichier comme dans une commande", () => {
    expect(isForbidden({ tool_input: { file_path: "C:\\Users\\x\\AppData\\Local\\Temp\\a.mjs" } })).toBe(true);
    expect(isForbidden({ tool_input: { command: 'node "C:/Users/x/AppData/Local/Temp/a.mjs"' } })).toBe(true);
  });

  it("laisse passer le projet", () => {
    expect(isForbidden({ tool_input: { file_path: "D:\\dev\\projet\\ai\\tmp\\lot.json" } })).toBe(false);
    expect(isForbidden({ tool_input: { command: "npm run check:ai" } })).toBe(false);
    expect(isForbidden({})).toBe(false);
  });
});
