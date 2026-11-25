const cp = require("node:child_process"),
  path = require("node:path");
const root = path.resolve(__dirname, "../..");
const cli = path.join(__dirname, "node_modules/vitest/vitest.mjs");
for (const role of ["student", "supervisor", "workshop"]) {
  const folder = path.join(root, "frontend", role);
  console.log("Coverage baseline: " + role);
  cp.execFileSync(
    process.execPath,
    [
      cli,
      "run",
      "--root",
      folder,
      "--config",
      path.join(folder, "vitest.config.ts"),
      "--maxWorkers=1",
      "--coverage",
      "--coverage.provider=v8",
      "--coverage.reporter=lcov",
      "--coverage.reporter=json-summary",
      "--coverage.reporter=text-summary",
      "--coverage.include=src/**/*.{ts,tsx}",
      "--coverage.exclude=**/*.{test,spec}.{ts,tsx}",
      "--coverage.exclude=**/test/**",
      "--coverage.exclude=**/routeTree.gen.ts",
    ],
    { cwd: __dirname, stdio: "inherit" },
  );
}
