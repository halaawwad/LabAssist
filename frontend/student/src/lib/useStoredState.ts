import { storageFailure, writeLocal } from "../../../../shared/web/localStorage";
import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";

/** Existing keys remain readable. Never overwrite unreadable data with a seed. */
export function useStoredState<T>(key: string, initial: T | (() => T)) {
  const [value, update] = useState<T>(initial);
  const current = useRef(value);
  const ready = useRef(false);
  const blocked = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const saved = JSON.parse(raw) as T;
        const base = current.current;
        if (
          Array.isArray(base)
            ? !Array.isArray(saved)
            : base !== null && (saved === null || typeof saved !== typeof base)
        )
          throw new Error("Unrecognized saved data");
        if (
          base &&
          !Array.isArray(base) &&
          typeof base === "object" &&
          Object.entries(base).some(([field, expected]) => {
            const actual = (saved as Record<string, unknown>)[field];
            return Array.isArray(expected)
              ? !Array.isArray(actual)
              : expected !== null && (actual === null || typeof actual !== typeof expected);
          })
        )
          throw new Error("Incomplete saved data");
        current.current = saved;
        update(saved);
      }
      ready.current = true;
    } catch {
      blocked.current = true;
      storageFailure(
        "Saved data could not be loaded. Existing records are preserved; allow storage and reload.",
      );
    }
  }, [key]);
  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      if (!ready.current || blocked.current)
        throw new Error(
          "Saved data could not be loaded. Reload and allow device storage; existing data has been preserved.",
        );
      const next = typeof action === "function" ? (action as (v: T) => T)(current.current) : action;
      writeLocal(key, next);
      current.current = next;
      update(next);
    },
    [key],
  );
  return [value, setValue] as const;
}
