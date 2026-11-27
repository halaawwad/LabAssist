import { Client } from "pg";
export async function freshQuery(sql: string, values: unknown[] = []) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return (await c.query(sql, values)).rows;
  } finally {
    await c.end();
  }
}
// Hold both requests in PostgreSQL before releasing them, proving overlap on independent backends.
export async function overlap<T>(lock: string, values: unknown[], calls: () => Promise<T>[]) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  let running: Promise<T>[] = [];
  try {
    await c.query("BEGIN");
    await c.query(lock, values);
    running = calls();
    let observed = false;
    for (let i = 0; i < 120; i++) {
      const r = await c.query(
        "SELECT count(DISTINCT pid)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND cardinality(pg_blocking_pids(pid))>0",
      );
      if (r.rows[0].n >= 2) {
        observed = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    if (!observed) throw Error("Two overlapping database connections were not observed");
    await c.query("ROLLBACK");
    return await Promise.all(running);
  } finally {
    await c.query("ROLLBACK").catch(() => {});
    await Promise.allSettled(running);
    await c.end();
  }
}
