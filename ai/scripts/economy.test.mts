import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { heavyCall, oversizedRead } from "./economy.mts";

const root = mkdtempSync(join(tmpdir(), "economy-"));
writeFileSync(join(root, "gros.json"), "x".repeat(70_000));
writeFileSync(join(root, "moyen.json"), "x".repeat(30_000));
writeFileSync(join(root, "petit.md"), "x");

test("lire tout un gros fichier est refusé ; un extrait, un petit fichier ou une image passent", () => {
  expect(oversizedRead({ tool_name: "Read", tool_input: { file_path: "gros.json" } }, root)).toContain("Lecture refusée : gros.json fait 70 Ko");
  expect(oversizedRead({ tool_name: "Read", tool_input: { file_path: "gros.json", limit: 40 } }, root)).toBeUndefined();
  expect(oversizedRead({ tool_name: "Read", tool_input: { file_path: "petit.md" } }, root)).toBeUndefined();
  expect(oversizedRead({ tool_name: "Read", tool_input: { file_path: "figure.png" } }, root)).toBeUndefined();
});

test("un outil déclaré lourd, une image ou un fichier lourd déclenchent le rappel ; le reste non", () => {
  expect(heavyCall({ tool_name: "mcp__web__read_page" }, root, ["mcp__web__read_page"])).toBe("mcp__web__read_page");
  expect(heavyCall({ tool_name: "Read", tool_input: { file_path: "figure.png" } }, root)).toBe("image");
  expect(heavyCall({ tool_name: "Read", tool_input: { file_path: "moyen.json" } }, root)).toBe("gros fichier");
  expect(heavyCall({ tool_name: "Read", tool_input: { file_path: "petit.md" } }, root)).toBeUndefined();
  expect(heavyCall({ tool_name: "Bash", tool_input: { command: "npm test" } }, root)).toBeUndefined();
});
