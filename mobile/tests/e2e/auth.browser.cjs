const fs = require("node:fs");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

async function main() {
  const file = process.env.AUTH_E2E_FIXTURES;
  if (!file) throw Error("Set AUTH_E2E_FIXTURES to a private disposable-account fixture file.");
  const fixtures = JSON.parse(fs.readFileSync(file, "utf8"));
  const base = process.env.MOBILE_E2E_URL || "http://127.0.0.1:8095";
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  });
  try {
    for (const account of fixtures.accounts) {
      const labels = {
        STUDENT: "Student",
        SUPERVISOR: "Supervisor",
        WORKSHOP_MANAGER: "Workshop Manager",
        DEPARTMENT_HEAD: "Department Head",
      };
      assert.ok(labels[account.role], "Expected a supported Sprint 1 role");
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(45000);
        const warnings = [];
        page.on("console", (message) => {
          if (/Invalid style property|Invalid hook call/.test(message.text()))
            warnings.push(message.text());
        });
        await page.goto(base + "/native/login", { waitUntil: "domcontentloaded", timeout: 150000 });
        await page.getByRole("button", { name: "Choose your role", exact: true }).click();
        await page.getByRole("radio").filter({ hasText: labels[account.role] }).click();
        await page
          .getByLabel("Account", { exact: true })
          .fill(account.role === "STUDENT" ? account.email : account.employeeNumber);
        await page
          .getByLabel("Password", { exact: true })
          .fill(account.password || fixtures.password);
        await page.getByRole("button", { name: "Log in", exact: true }).click();
        await page.waitForURL((url) => !url.pathname.endsWith("/login"));
        await page.getByRole("tab", { name: "More", exact: true }).waitFor();
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.getByRole("tab", { name: "More", exact: true }).waitFor();
        // A cold Expo launch opens the entry/login route, not the last dashboard URL.
        await page.goto(base + "/", { waitUntil: "domcontentloaded" });
        await page.getByRole("tab", { name: "More", exact: true }).waitFor();
        assert.ok(!page.url().endsWith("/login"), "Restored session must leave the login screen");
        const wrong =
          account.role === "STUDENT" ? "/native/supervisor/dashboard" : "/native/student/tasks";
        await page.goto(base + wrong, { waitUntil: "domcontentloaded" });
        await page.waitForURL((url) => url.pathname !== wrong);
        await page.getByRole("tab", { name: "More", exact: true }).click();
        await page.getByRole("button", { name: "Log out", exact: true }).click();
        await page.waitForURL((url) => url.pathname.endsWith("/login"));
        await page.goto(base + "/native/student/tasks", { waitUntil: "domcontentloaded" });
        await page.waitForURL((url) => url.pathname.endsWith("/login"));
        assert.equal(warnings.length, 0, "Unexpected direction or React hook warnings");
        console.log(
          "PASS " + account.role + ": login, restore, role guard, logout, signed-out guard",
        );
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
