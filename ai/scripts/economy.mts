// Règle d'or, tenue par le hook : un contenu long ne se lit jamais en entier.
// Lire tout un gros fichier est refusé ; un outil qui ramène beaucoup de texte rappelle la méthode la plus légère.

import { existsSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";

// Au-delà, lire tout le fichier est refusé : un extrait (offset, limit) ou un script (npm run peek) suffit.
export const LARGE_READ_BYTES = 60_000;
// Au-delà, la lecture entière passe, mais la règle d'or est rappelée.
export const HEAVY_READ_BYTES = 20_000;
// Outils du projet qui ramènent une page entière dans le contexte (outils MCP de lecture web, par exemple), à compléter.
const HEAVY_TOOLS: string[] = [];
const IMAGE = /\.(png|jpe?g|gif|webp)$/i;

type Call = { tool_name?: string; tool_input?: Record<string, unknown> };

export const GOLDEN_RULE =
  "Règle d'or : un contenu long ne se lit jamais en entier. Le réduire d'abord par script à l'utile (npm run peek -- <fichier> : forme et tailles ; --around mot : extraits ; --diff autre : différences), rediriger une sortie volumineuse vers ai/tmp/claude/, et itérer.";

function sizeOf(path: unknown, root: string): number {
  if (typeof path !== "string") return 0;
  const file = isAbsolute(path) ? path : join(root, path);
  return existsSync(file) ? statSync(file).size : 0;
}

// Lecture entière d'un gros fichier : refusée, avec la méthode à suivre.
export function oversizedRead({ tool_name: tool, tool_input: input = {} }: Call, root = "."): string | undefined {
  if (tool !== "Read" || input.limit || input.offset || IMAGE.test(String(input.file_path ?? ""))) return undefined;
  const size = sizeOf(input.file_path, root);
  return size > LARGE_READ_BYTES ? `Lecture refusée : ${input.file_path} fait ${Math.round(size / 1000)} Ko. ${GOLDEN_RULE}` : undefined;
}

// Appel coûteux en contexte (page entière, image, fichier lourd) : le sujet du rappel, sinon rien.
export function heavyCall({ tool_name: tool = "", tool_input: input = {} }: Call, root = ".", heavyTools = HEAVY_TOOLS): string | undefined {
  if (heavyTools.includes(tool)) return tool;
  if (tool !== "Read" || input.limit) return undefined;
  if (IMAGE.test(String(input.file_path ?? ""))) return "image";
  return sizeOf(input.file_path, root) > HEAVY_READ_BYTES ? "gros fichier" : undefined;
}
