/** Strict local demo writes: callers may only show success after this returns. */
const unreadable = new Set<string>();
let failure = "";
export const storageEvent = "labassist-storage-result";
export function storageFailure(message: string) {
  failure = message;
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function")
    window.dispatchEvent(new Event(storageEvent));
}
export const currentStorageFailure = () => failure;
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = (typeof window === "undefined" ? localStorage : window.localStorage).getItem(key);
    const value = raw === null ? fallback : (JSON.parse(raw) as T);
    if (
      raw !== null &&
      (Array.isArray(fallback)
        ? !Array.isArray(value)
        : fallback !== null && (value === null || typeof value !== typeof fallback))
    )
      throw new Error("Unrecognized saved data");
    unreadable.delete(key);
    return value;
  } catch {
    unreadable.add(key);
    storageFailure(
      "Saved data could not be loaded. Existing records were preserved. Allow storage and reload to retry.",
    );
    return fallback;
  }
}
export function writeLocal(key: string, value: unknown) {
  try {
    if (unreadable.has(key))
      throw new Error("Saved records could not be read; reload before saving.");
    (typeof window === "undefined" ? localStorage : window.localStorage).setItem(key, JSON.stringify(value));
    storageFailure("");
  } catch (cause) {
    storageFailure(
      "Could not save on this device. Your form is preserved; allow storage and try Save again.",
    );
    throw cause;
  }
}
