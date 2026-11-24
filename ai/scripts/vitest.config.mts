import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

// Les tests des scripts de Claude, à part de ceux de l'application : leur config ne touche jamais celle du projet.
export default defineConfig({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  // `ai/bin/` garde des copies, `ai/tmp/` du jetable : leurs tests ne sont pas ceux du shell.
  test: { include: ["ai/scripts/**/*.test.mts"], exclude: [...configDefaults.exclude, "ai/bin/**", "ai/tmp/**"] },
});
