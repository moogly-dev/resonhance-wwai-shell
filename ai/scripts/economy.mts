// Golden rule, held by the hook: a long content is never read whole.
// Reading a whole large file is refused; a tool that brings back a lot of text recalls the lightest method.

import { existsSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";

// Beyond this, reading the whole file is refused: an excerpt (offset, limit) or a script (npm run peek) is enough.
export const LARGE_READ_BYTES = 60_000;
// Beyond this, the whole read goes through, but the golden rule is recalled.
export const HEAVY_READ_BYTES = 20_000;
// Project tools that bring a whole page into the context (web-reading MCP tools, for instance), to complete.
const HEAVY_TOOLS: string[] = [];
const IMAGE = /\.(png|jpe?g|gif|webp)$/i;

type Call = { tool_name?: string; tool_input?: Record<string, unknown> };

export const GOLDEN_RULE =
  "Golden rule: a long content is never read whole. First reduce it by script to what is useful (npm run peek -- <file>: shape and sizes; --around word: excerpts; --diff other: differences), redirect a large output to ai/tmp/claude/, and iterate.";

function sizeOf(path: unknown, root: string): number {
  if (typeof path !== "string") return 0;
  const file = isAbsolute(path) ? path : join(root, path);
  return existsSync(file) ? statSync(file).size : 0;
}

// Whole read of a large file: refused, with the method to follow.
export function oversizedRead({ tool_name: tool, tool_input: input = {} }: Call, root = "."): string | undefined {
  if (tool !== "Read" || input.limit || input.offset || IMAGE.test(String(input.file_path ?? ""))) return undefined;
  const size = sizeOf(input.file_path, root);
  return size > LARGE_READ_BYTES ? `Read refused: ${input.file_path} is ${Math.round(size / 1000)} KB. ${GOLDEN_RULE}` : undefined;
}

// Call costly in context (whole page, image, heavy file): the subject of the reminder, otherwise nothing.
export function heavyCall({ tool_name: tool = "", tool_input: input = {} }: Call, root = ".", heavyTools = HEAVY_TOOLS): string | undefined {
  if (heavyTools.includes(tool)) return tool;
  if (tool !== "Read" || input.limit) return undefined;
  if (IMAGE.test(String(input.file_path ?? ""))) return "image";
  return sizeOf(input.file_path, root) > HEAVY_READ_BYTES ? "heavy file" : undefined;
}
