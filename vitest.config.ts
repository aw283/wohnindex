import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// @/* -> Projekt-Root (entspricht tsconfig paths)
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", ".cache"],
  },
});
