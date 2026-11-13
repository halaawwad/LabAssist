import { useWorkspace } from "@/state/WorkspaceProvider";
import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
export function useLocalPreview<T>(key: string, initial: T) {
  const { storageRevision, reportStorageError } = useWorkspace();
  const [value, update] = useState(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const current = useRef(initial);
  const writable = useRef(false);
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let alive = true;
    writable.current = false;
    setReady(false);
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!alive) return;
        if (raw !== null) {
          const saved = JSON.parse(raw) as T;
          if (Array.isArray(initial) ? !Array.isArray(saved) : saved === null || typeof saved !== typeof initial) throw new Error("Unrecognized saved data");
          current.current = saved; update(saved);
        }
        writable.current = true;
        setError("");
      })
      .catch(() => { const message = "Could not load saved changes. Existing data is preserved; allow storage and retry loading."; setError(message); reportStorageError(message); })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [key, storageRevision, reportStorageError]);
  const setValue = useCallback(async (action: SetStateAction<T>): Promise<boolean> => {
    if (!writable.current || pending.current) return false;
    pending.current = true; setSaving(true);
    try {
      const next = typeof action === "function" ? (action as (v: T) => T)(current.current) : action;
      await AsyncStorage.setItem(key, JSON.stringify(next));
      current.current = next; update(next); setError(""); return true;
    } catch { const message = "Could not save changes on this device. Your input is preserved; try Save again."; setError(message); reportStorageError(message); return false; }
    finally { pending.current = false; setSaving(false); }
  }, [key, reportStorageError]);
  return { value, setValue, ready, error, saving };
}
