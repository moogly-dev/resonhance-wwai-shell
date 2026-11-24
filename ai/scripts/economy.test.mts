import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { heavyCall, oversizedRead } from "./economy.mts";

const root = mkdtempSync(join(tmpdir(), "economy-"));
writeFileSync(join(root, "large.json"), "x".repeat(70_000));
writeFileSync(join(root, "medium.json"), "x".repeat(30_000));
writeFileSync(join(root, "small.md"), "x");

test("reading a whole large file is refused; an excerpt, a small file or an image go through", () => {
  expect(oversizedRead({ tool_name: "Read", tool_input: { file_path: "large.json" } }, root)).toContain("Read refused: large.json is 70 KB");
  expect(oversizedRead({ tool_name: "Read", tool_input: { file_path: "large.json", limit: 40 } }, root)).toBeUndefined();
  expect(oversizedRead({ tool_name: "Read", tool_input: { file_path: "small.md" } }, root)).toBeUndefined();
  expect(oversizedRead({ tool_name: "Read", tool_input: { file_path: "figure.png" } }, root)).toBeUndefined();
});

test("a tool declared heavy, an image or a heavy file trigger the reminder; the rest does not", () => {
  expect(heavyCall({ tool_name: "mcp__web__read_page" }, root, ["mcp__web__read_page"])).toBe("mcp__web__read_page");
  expect(heavyCall({ tool_name: "Read", tool_input: { file_path: "figure.png" } }, root)).toBe("image");
  expect(heavyCall({ tool_name: "Read", tool_input: { file_path: "medium.json" } }, root)).toBe("heavy file");
  expect(heavyCall({ tool_name: "Read", tool_input: { file_path: "small.md" } }, root)).toBeUndefined();
  expect(heavyCall({ tool_name: "Bash", tool_input: { command: "npm test" } }, root)).toBeUndefined();
});
