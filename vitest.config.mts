import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  // `ai/bin/` garde des copies, `ai/tmp/` du jetable : leurs tests ne sont pas ceux du projet.
  test: { exclude: [...configDefaults.exclude, "ai/bin/**", "ai/tmp/**"] },
});
