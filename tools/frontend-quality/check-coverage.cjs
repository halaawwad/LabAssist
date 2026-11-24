const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../..");
const summary = JSON.parse(fs.readFileSync(path.join(__dirname, "coverage/coverage-summary.json")));
const auth = Object.entries(summary).filter(([file]) => file.replaceAll("\\", "/").includes("/shared/auth/"));
assert.ok(auth.length >= 5, "Shared auth source coverage is missing");
for (const [metric, minimum] of [["lines", 85], ["branches", 70]]) {
  const totals = auth.reduce((sum, [, value]) => ({covered: sum.covered + value[metric].covered, total: sum.total + value[metric].total}), {covered:0,total:0});
  const percent = 100 * totals.covered / totals.total;
  assert.ok(percent >= minimum, `Shared account flow ${metric} coverage ${percent.toFixed(2)}% is below ${minimum}%`);
  console.log(`Shared account flow ${metric}: ${percent.toFixed(2)}% (minimum ${minimum}%)`);
}
for (const role of ["student", "supervisor", "workshop"]) {
  const report = JSON.parse(fs.readFileSync(path.join(root,"frontend",role,"coverage/coverage-summary.json")));
  assert.ok(report.total.lines.total > 0 && report.total.lines.covered > 0, role + " coverage report is empty");
  console.log(`${role} existing UI/source baseline: ${report.total.lines.pct}% lines; not a full-feature coverage claim`);
}
