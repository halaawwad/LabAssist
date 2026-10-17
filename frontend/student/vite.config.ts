import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

export default defineConfig(({ command }) => ({
  plugins: [
    { name: "pdf-queue-browser-events", enforce: "pre", transform(code, id) { if (id.replace(/\\/g, "/").endsWith("/queue/index.js")) return code.replace(/require\(["']events["']\)/g, 'require("pdf-events")'); return null; } },
    tanstackStart({ server: { entry: "server" } }),
    react(),
    tailwindcss(),
    ...(command === "build" ? [nitro({ preset: "cloudflare-module" })] : []),
  ],
  resolve: {
    alias: { "pdf-buffer": require.resolve("buffer/"), "pdf-events": require.resolve("events/"), "@": fileURLToPath(new URL("./src", import.meta.url)), "node:events": require.resolve("events/"), events: require.resolve("events/"), "node:buffer": require.resolve("buffer/"), buffer: require.resolve("buffer/") },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  environments: { client: { resolve: { conditions: ["browser", "module", "development|production"] } } },
  optimizeDeps: { include: ["@react-pdf/renderer", "pdf-buffer"] },
  server: { host: "0.0.0.0", port: 8080 },
}));






