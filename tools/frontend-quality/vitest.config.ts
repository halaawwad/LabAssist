import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  root: path.resolve(import.meta.dirname, "../.."),
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tools/frontend-quality/tests/**/*.test.tsx"],
    maxWorkers: 1,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "tools/frontend-quality/coverage",
      include: ["shared/auth/**/*.{ts,tsx}", "frontend/department/src/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts"],
    },
  },
});
