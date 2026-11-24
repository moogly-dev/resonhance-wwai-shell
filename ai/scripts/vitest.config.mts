import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

// Tests of Claude's scripts, apart from the application's: this config never touches the project's.
export default defineConfig({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  // `ai/bin/` keeps copies, `ai/tmp/` disposable files: their tests are not the shell's.
  test: { include: ["ai/scripts/**/*.test.mts"], exclude: [...configDefaults.exclude, "ai/bin/**", "ai/tmp/**"] },
});
