/* global __dirname */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const base = process.env.EXPO_TEST_URL ?? "http://127.0.0.1:8081";
const output = path.resolve(__dirname, "../.expo/screenshots");
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(25000);
  page.setDefaultNavigationTimeout(120000);
  const root = async () => {
    await page.goto(base);
    await page.getByText("Explore your workspace", { exact: true }).waitFor();
  };
  const tab = async (name) => page.getByRole("tab", { name: new RegExp(name) }).click();
  try {
    await root();
    console.log("PASS: role picker loads");
    await page.getByText("Student", { exact: true }).click();
    await page.getByText("Hello, Noor", { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, "student-home.png"), fullPage: true });
    await tab("Tasks");
    await page.getByLabel("New task", { exact: true }).fill("Browser smoke task");
    await page.getByRole("button", { name: "Add task", exact: true }).click();
    await page.getByRole("checkbox", { name: /Browser smoke task/ }).waitFor();
    console.log("PASS: student adds task");
    await tab("Reports");
    await page.getByRole("button", { name: "Start next weekly report", exact: true }).click();
    await page.getByRole("button", { name: "Open", exact: true }).last().click();
    for (const label of ["Completed work", "Progress", "Tasks completed", "Next week plan"])
      await page.getByLabel(label, { exact: true }).fill("Smoke test evidence for " + label);
    await page.getByRole("button", { name: "Review before submitting", exact: true }).click();
    await page.getByRole("button", { name: "Confirm submission", exact: true }).click();
    await page.getByText("SUBMITTED", { exact: true }).waitFor();
    await page.waitForFunction(() =>
      JSON.parse(localStorage.getItem("labassist.mobile.workspace.v1") ?? "{}").reports?.some(
        (r) => r.week === 2 && r.status === "submitted",
      ),
    );
    console.log("PASS: shared weekly submission");
    await root();
    await page.getByText("Supervisor", { exact: true }).click();
    await tab("Reports");
    await page.getByRole("button", { name: "Open", exact: true }).last().click();
    await page.getByLabel("Your feedback", { exact: true }).fill("Add calibration results.");
    await page.getByRole("button", { name: "Reviewed", exact: true }).click();
    await page.getByText("Add calibration results.", { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, "supervisor-review.png"), fullPage: true });
    await page.waitForFunction(() =>
      JSON.parse(localStorage.getItem("labassist.mobile.workspace.v1") ?? "{}").reports?.some(
        (r) => r.week === 2 && r.status === "reviewed",
      ),
    );
    console.log("PASS: supervisor reviews the same submission");
    await root();
    await page.getByText("Student", { exact: true }).click();
    await tab("Reports");
    await page.getByRole("button", { name: "Open", exact: true }).last().click();
    await page.getByText("Add calibration results.", { exact: true }).waitFor();
    console.log("PASS: student receives shared feedback after reload");
    await tab("More");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Student 4", exact: true }).click();
    await tab("Tasks");
    await page.getByText("CropBot", { exact: true }).last().waitFor();
    assert.equal(await page.getByRole("checkbox", { name: /Browser smoke task/ }).count(), 0);
    console.log("PASS: changing sample student clears the previous team screen state");
    await root();
    await page.getByText("Workshop Manager", { exact: true }).click();
    await tab("Attendance");
    await page.getByRole("button", { name: "Absent", exact: true }).first().click();
    await page.waitForFunction(() =>
      Object.values(
        JSON.parse(localStorage.getItem("labassist.mobile.workspace.v1") ?? "{}").attendance ?? {},
      ).some((day) => day.s1 === false),
    );
    await tab("Tables");
    await page.getByText("Workshop map", { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, "workshop-map.png"), fullPage: true });
    console.log("PASS: workshop attendance and floor plan");
    await tab("Handovers");
    await page.getByRole("button", { name: "Check return", exact: true }).first().click();
    await page.getByLabel("Returned in good condition", { exact: true }).fill("1");
    await page.getByRole("button", { name: "Save inspection", exact: true }).click();
    await page.waitForFunction(() =>
      JSON.parse(localStorage.getItem("labassist.mobile.workspace.v1") ?? "{}").tools?.some(
        (t) => t.id === "p1-tool0" && t.returned === 1,
      ),
    );
    console.log("PASS: workshop return inspection");
    await root();
    await page.getByRole("radio", { name: "العربية", exact: true }).click();
    await page.getByText("استكشف التطبيق", { exact: true }).waitFor();
    await page.getByText("الطالب", { exact: true }).click();
    await page.getByText("مساحتك", { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, "student-arabic.png"), fullPage: true });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    console.log("PASS: Arabic navigation and mobile width");
    assert.deepEqual(errors, []);
    console.log("PASS: no uncaught browser exceptions");
  } catch (error) {
    await page
      .screenshot({ path: path.join(output, "failure.png"), fullPage: true })
      .catch(() => {});
    console.error((await page.locator("body").innerText()).slice(0, 2400));
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
