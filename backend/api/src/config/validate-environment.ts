type Environment = Record<string, string | undefined>;
export function validateEnvironment(env: Environment) {
  const errors: string[] = [];
  const required = (key: string) => {
    const value = env[key]?.trim();
    if (!value) errors.push(key);
    return value || "";
  };
  const integer = (key: string, fallback: number, maximum = Number.MAX_SAFE_INTEGER) => {
    const value = env[key] === undefined ? fallback : Number(env[key]);
    if (!Number.isSafeInteger(value) || value < 1 || value > maximum) errors.push(key);
    return value;
  };
  const httpUrl = (value: string, key: string, originOnly = false) => {
    try {
      const url = new URL(value);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        (originOnly && url.pathname !== "/") ||
        (env.NODE_ENV === "production" && url.protocol !== "https:")
      )
        errors.push(key);
    } catch {
      errors.push(key);
    }
  };
  const databaseUrl = required("DATABASE_URL");
  try {
    const url = new URL(databaseUrl);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    )
      errors.push("DATABASE_URL");
  } catch {
    errors.push("DATABASE_URL");
  }
  const publicAppUrl = required("PUBLIC_APP_URL");
  httpUrl(publicAppUrl, "PUBLIC_APP_URL");
  const key = required("MAIL_ENCRYPTION_KEY");
  if (!/^[a-f\d]{64}$/i.test(key)) errors.push("MAIL_ENCRYPTION_KEY");
  const corsOrigins = (env.CORS_ORIGINS ?? "http://localhost:8081").split(",").map((v) => v.trim());
  for (const origin of corsOrigins) httpUrl(origin, "CORS_ORIGINS", true);
  const port = integer("PORT", 3100, 65535);
  integer("SMTP_PORT", 1026, 65535);
  integer("ACCESS_MINUTES", 15);
  integer("REFRESH_DAYS", 14);
  integer("ACTIVATION_HOURS", 24);
  if (env.SMTP_SECURE !== undefined && !["true", "false"].includes(env.SMTP_SECURE))
    errors.push("SMTP_SECURE");
  if (env.NODE_ENV !== undefined && !["development", "test", "production"].includes(env.NODE_ENV))
    errors.push("NODE_ENV");
  if (env.SMTP_USER && !env.SMTP_PASSWORD) errors.push("SMTP_PASSWORD");
  if (env.NODE_ENV === "production" && (!env.SMTP_HOST || !env.SMTP_FROM))
    errors.push("SMTP_HOST/SMTP_FROM");
  if (errors.length) throw Error("Invalid configuration: " + [...new Set(errors)].join(", "));
  return { databaseUrl, publicAppUrl, corsOrigins, port };
}
