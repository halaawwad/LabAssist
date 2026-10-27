import { expect, it } from "vitest";
import {
  demoLogin,
  matchesDemoLogin,
  simulateSmartLight,
  lightDemoStage,
  smoothRange,
} from "../lib/loginDemo";
it("requires both of the requested demo credentials", () => {
  expect(demoLogin.email).toBe("noor@demo.com");
  expect(matchesDemoLogin(demoLogin.email, "Noor123!")).toBe(true);
  expect(matchesDemoLogin(" NOOR@DEMO.COM ", demoLogin.password)).toBe(true);
  expect(matchesDemoLogin(demoLogin.email, "wrong")).toBe(false);
  expect(matchesDemoLogin("other@demo.com", demoLogin.password)).toBe(false);
});
it("drives the LED from the light-sensitive transistor circuit", () => {
  const dark = simulateSmartLight(15, true),
    bright = simulateSmartLight(85, true);
  expect(dark.ledOn).toBe(true);
  expect(dark.ledMilliAmps).toBeGreaterThan(1);
  expect(dark.ledMilliAmps).toBeLessThanOrEqual(6.7);
  expect(bright.ledOn).toBe(false);
  expect(bright.ledMilliAmps).toBe(0);
  expect(simulateSmartLight(15, false).ledOn).toBe(false);
  expect(simulateSmartLight(-20, true).light).toBe(0);
  expect(simulateSmartLight(120, true).light).toBe(100);
});
it("keeps insertion, pulse, shading and uncovering in order", () => {
  expect(lightDemoStage(3.8)).toBe("connecting");
  expect(lightDemoStage(4.8)).toBe("powering");
  expect(lightDemoStage(8)).toBe("dark");
  expect(lightDemoStage(11)).toBe("uncovering");
  expect(lightDemoStage(13)).toBe("bright");
  expect(lightDemoStage(14)).toBe("complete");
  expect(smoothRange(3, 3, 4.5)).toBe(0);
  expect(smoothRange(4.5, 3, 4.5)).toBe(1);
  expect(smoothRange(3.75, 3, 4.5)).toBe(0.5);
  expect(smoothRange(3.75, 3, 4.5, true)).toBe(0);
});
