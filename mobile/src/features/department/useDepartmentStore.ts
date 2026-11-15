import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { persistDepartment, readDepartment } from "./departmentPersistence";
import type { DepartmentData } from "./departmentData";

export function useDepartmentStore(initial: DepartmentData) {
  const { storageRevision, reportStorageError } = useWorkspace();
  const [data, setData] = useState(initial);
  const [ready, setReady] = useState(false);
  const [loadedRevision, setLoadedRevision] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const current = useRef(data);
  const raw = useRef<(string | null)[]>([]);
  const pending = useRef(false);
  const writable = useRef(false);
  const seed = useRef(initial);
  useEffect(() => {
    let alive = true;
    writable.current = false;
    readDepartment(AsyncStorage, seed.current)
      .then((result) => {
        if (!alive) return;
        current.current = result.data;
        raw.current = result.raw;
        setData(result.data);
        setError("");
        writable.current = true;
        setReady(true);
        setLoadedRevision(storageRevision);
      })
      .catch(() => {
        if (alive)
          setError("Could not load saved records. Existing data is preserved. Retry loading.");
      });
    return () => {
      alive = false;
    };
  }, [storageRevision]);
  async function commit(change: Partial<DepartmentData>) {
    if (!writable.current || pending.current || loadedRevision !== storageRevision) return false;
    pending.current = true;
    setSaving(true);
    try {
      const next = { ...current.current, ...change };
      raw.current = await persistDepartment(AsyncStorage, next, raw.current);
      current.current = next;
      setData(next);
      setError("");
      return true;
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message.startsWith("Records changed")
          ? cause.message
          : "Could not save changes. Your input and existing records are preserved. Retry loading, then save again.";
      setError(message);
      reportStorageError(message);
      // Recovery/reload is required after a potentially partial native storage write.
      writable.current = false;
      setReady(false);
      return false;
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return {
    ...data,
    ready: ready && loadedRevision === storageRevision,
    saving,
    error,
    commit,
    current,
  };
}
