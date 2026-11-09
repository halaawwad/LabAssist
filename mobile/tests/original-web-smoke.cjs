/* global __dirname */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const assert = require("node:assert/strict");
const {Buffer}=require('node:buffer');
const output = path.resolve(__dirname, "../.expo/original-web");
fs.mkdirSync(output, { recursive: true });
function sourceModule(name) {
  const exports = {};
  const js = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../src/web/" + name + ".ts"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  new Function("exports", js)(exports);
  return exports;
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--use-angle=swiftshader"],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    for (const [role, url, selector] of [
      ["student", "http://127.0.0.1:8080/", ".insight-shell"],
      ["supervisor", "http://127.0.0.1:5174/supervisor/dashboard", ".supervisor-shell"],
      ["workshop", "http://127.0.0.1:5175/dashboard", ".workshop-shell"],
    ]) {
      await page.goto(url);
      await page.locator(selector).first().waitFor();
      await page.screenshot({ path: path.join(output, role + ".png"), fullPage: true });
      console.log("PASS: original " + role + " web interface renders.");
    }
    for (const route of [
      "/project",
      "/team",
      "/messages",
      "/meetings",
      "/reports",
      "/catalog",
      "/profile",
      "/settings",
    ]) {
      await page.goto("http://127.0.0.1:8080" + route);
      await page.locator(".workspace-sidebar").first().waitFor({ state: "attached" });
      await page.locator("main").first().waitFor();
      assert.equal(await page.getByText("This page didn't load", { exact: true }).count(), 0);
      console.log("PASS: original student " + route);
    }
    const { websiteBridge } = sourceModule("bridge");
    await page.evaluate(() => {
      window.__nativeFiles = [];
      window.ReactNativeWebView = { postMessage: (s) => window.__nativeFiles.push(JSON.parse(s)) };
    });
    await page.evaluate(websiteBridge);
    await page.evaluate(() => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob(["%PDF-1.4\nLabAssist test"], { type: "application/pdf" }),
      );
      a.download = "report.pdf";
      a.click();
    });
    await page.waitForFunction(() => window.__nativeFiles.some((m) => m.type === "download"));
    const file = await page.evaluate(() => window.__nativeFiles.find((m) => m.type === "download"));
    assert.equal(file.name, "report.pdf");
    assert.equal(Buffer.from(file.data, "base64").toString(), "%PDF-1.4\nLabAssist test");
    console.log("PASS: detached PDF download reaches the native share bridge.");
    for (const [route, expected] of [
      ["/", "http://192.168.1.8:8080/"],
      ["/supervisor/dashboard", "http://192.168.1.8:5174/supervisor/dashboard"],
      ["/workshop/dashboard", "http://192.168.1.8:5175/dashboard"],
    ]) {
      await page.goto("http://127.0.0.1:8081" + route);
      const frame = page.locator("iframe");
      await frame.waitFor();
    const actualUrl=new URL(await frame.getAttribute('src'));const expectedUrl=new URL(expected);
    assert.equal(actualUrl.port,expectedUrl.port);assert.equal(actualUrl.pathname,expectedUrl.pathname);
    assert(['localhost','127.0.0.1','192.168.1.8'].includes(actualUrl.hostname));
      const selector = route.includes("supervisor")
        ? ".supervisor-shell"
        : route.includes("workshop")
          ? ".workshop-shell"
          : ".insight-shell";
      await page.frameLocator("iframe").locator(selector).first().waitFor();
      console.log("PASS: mobile container loads the original " + route);
    }
    assert.deepEqual(errors, []);
    console.log("PASS: no uncaught browser exceptions.");
  } catch (error) {
    await page
      .screenshot({ path: path.join(output, "failure.png"), fullPage: true })
      .catch(() => {});
    console.error((await page.locator("body").innerText()).slice(0, 1600));
    console.error(errors);
    throw error;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
