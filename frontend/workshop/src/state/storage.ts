import { readLocal, writeLocal } from "../../../../shared/web/localStorage";
const prefix = "labassist.workshop.";
export function readStored<T>(key: string, fallback: T): T { return readLocal(prefix + key, fallback); }
export function writeStoredOrThrow(key: string, value: unknown) { writeLocal(prefix + key, value); }
/** Preserve the existing best-effort API for preferences and legacy callers. */
export function writeStored(key: string, value: unknown): boolean {
  try { writeStoredOrThrow(key, value); return true; } catch { return false; }
}
