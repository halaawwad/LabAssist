export const demoLogin = { email: "noor@demo.com", password: "Noor123!" } as const;
export const LIGHT_DEMO_DURATION = 14;
export function matchesDemoLogin(email: string, password: string) {
  return email.trim().toLowerCase() === demoLogin.email && password === demoLogin.password;
}
export function smoothRange(time: number, start: number, end: number, reduced = false) {
  const x = Math.max(0, Math.min(1, (time - start) / (end - start)));
  return reduced ? (x === 1 ? 1 : 0) : x * x * (3 - 2 * x);
}
/** Approximate DC model: 9 V, 100k/LDR divider, 47k base resistor, NPN gain 150, 1k LED resistor. */
export function simulateSmartLight(lightPercent: number, connected: boolean) {
  const light = Math.max(0, Math.min(100, lightPercent));
  const ldrOhms = 500 * Math.pow(10, 3 * (1 - light / 100));
  const dividerVolts = (9 * ldrOhms) / (100000 + ldrOhms);
  const theveninOhms = (100000 * ldrOhms) / (100000 + ldrOhms);
  const baseAmps = connected ? Math.max(0, (dividerVolts - 0.7) / (47000 + theveninOhms)) : 0;
  const ledMilliAmps = Math.min(6.7, baseAmps * 150 * 1000);
  return {
    light: Math.round(light),
    ledOn: connected && ledMilliAmps > 0.5,
    ledMilliAmps,
    brightness: Math.min(1, ledMilliAmps / 6.7),
    connected,
  };
}
export function lightDemoStage(seconds: number) {
  return seconds < 1
    ? "expanding"
    : seconds < 2.4
      ? "approaching"
      : seconds < 3
        ? "grabbing"
        : seconds < 4.5
          ? "connecting"
          : seconds < 5.4
            ? "powering"
            : seconds < 7
              ? "covering"
              : seconds < 10
                ? "dark"
                : seconds < 11.8
                  ? "uncovering"
                  : seconds < 14
                    ? "bright"
                    : "complete";
}
