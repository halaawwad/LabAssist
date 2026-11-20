import { validateEnvironment } from "../../src/config/validate-environment";
const valid = () => ({
  DATABASE_URL: "postgresql://user:test-secret@127.0.0.1:5432/test_db",
  PUBLIC_APP_URL: "http://127.0.0.1:8080/native",
  MAIL_ENCRYPTION_KEY: "a".repeat(64),
});
describe("Startup configuration", () => {
  it("accepts development settings and applies explicit defaults", () => {
    const settings = validateEnvironment(valid());
    expect(settings.port).toBe(3100);
    expect(settings.corsOrigins).toEqual(["http://localhost:8081"]);
  });
  it.each(["DATABASE_URL", "PUBLIC_APP_URL", "MAIL_ENCRYPTION_KEY"])(
    "rejects missing %s before connecting",
    (key) => {
      expect(() => validateEnvironment({ ...valid(), [key]: "" })).toThrow(key);
    },
  );
  it.each([
    { PORT: "abc" },
    { PORT: "65536" },
    { SMTP_PORT: "0" },
    { ACCESS_MINUTES: "-1" },
    { REFRESH_DAYS: "1.5" },
    { ACTIVATION_HOURS: "Infinity" },
    { SMTP_SECURE: "yes" },
  ])("rejects invalid numeric/boolean settings %j", (extra) => {
    expect(() => validateEnvironment({ ...valid(), ...extra })).toThrow("Invalid configuration");
  });
  it("reports configuration keys without echoing credentials or invalid secrets", () => {
    const secret = "DO-NOT-LOG-THIS-SECRET";
    try {
      validateEnvironment({ ...valid(), DATABASE_URL: secret, MAIL_ENCRYPTION_KEY: secret });
      throw Error("Expected failure");
    } catch (e) {
      expect((e as Error).message).toContain("DATABASE_URL");
      expect((e as Error).message).not.toContain(secret);
    }
  });
  it.each([
    "*",
    "https://app.example/path",
    "https://user:secret@app.example",
    "javascript:alert(1)",
  ])("rejects unsafe CORS origin %s", (origin) => {
    expect(() => validateEnvironment({ ...valid(), CORS_ORIGINS: origin })).toThrow("CORS_ORIGINS");
  });
  it("requires HTTPS and mail settings in production", () => {
    expect(() => validateEnvironment({ ...valid(), NODE_ENV: "production" })).toThrow(
      "PUBLIC_APP_URL",
    );
    expect(() =>
      validateEnvironment({
        ...valid(),
        NODE_ENV: "production",
        PUBLIC_APP_URL: "https://app.example",
        CORS_ORIGINS: "https://app.example",
        SMTP_HOST: "smtp.example",
        SMTP_FROM: "LabAssist <noreply@example.edu>",
      }),
    ).not.toThrow();
  });
});
