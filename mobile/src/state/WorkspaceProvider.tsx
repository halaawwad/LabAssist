import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import {
  applyAction,
  createWorkspace,
  migrateWorkspace,
  type Action,
  type Role,
  type Workspace,
} from "@/domain/workspace";
import { colors } from "@/theme";
import { addPreviewData } from "@/domain/previewData";
import { addMeetingPreviewData } from "@/domain/meetingPreview";

const key = "labassist.mobile.workspace.v1";
type ContextValue = {
  state: Workspace;
  actorId: string;
  setActor: (id: string) => void;
  selectRole: (role: Role) => void;
  act: (action: Action) => Promise<boolean>;
  error: string | null;
  clearError: () => void;
  storageError: boolean;
  saving: boolean;
  storageRevision: number;
  retryLoading: () => void;
  reportStorageError: (message: string) => void;
  reset: () => Promise<void>;
};
const Context = createContext<ContextValue | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Workspace | null>(null);
  const current = useRef<Workspace | null>(null);
  const [actorId, setActor] = useState("s1");
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const queue = useRef(Promise.resolve());
  const sequence = useRef(0);
  const inFlight = useRef(new Set<string>());
  const writable = useRef(false);
  const [saving, setSaving] = useState(false);
  const [storageRevision, setStorageRevision] = useState(0);
  const reportStorageError = useCallback((message: string) => { setError(message); setStorageError(true); }, []);
  useEffect(() => {
    let mounted = true;
    writable.current = false;
    AsyncStorage.getItem(key)
      .then((raw) => {
        let value = createWorkspace();
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (
              parsed.version === 1 &&
              Array.isArray(parsed.users) &&
              Array.isArray(parsed.projects) &&
              Array.isArray(parsed.circuits)
            )
              { value = parsed; writable.current = true; }
            else throw new Error("Unrecognized saved workspace. Existing records are preserved.");
          } catch {
            writable.current = false; setStorageError(true);
            setError("Saved records could not be loaded. Existing data is preserved; allow storage and retry loading.");
          }
        }
        if (raw === null) writable.current = true;
        if (mounted) {
          const enriched = migrateWorkspace(addMeetingPreviewData(addPreviewData(value)));
          if (writable.current) { setStorageError(false); setError(null); }
          if (enriched !== value && writable.current)
            queue.current = queue.current
              .then(() => AsyncStorage.setItem(key, JSON.stringify(enriched)))
              .catch(() => reportStorageError("Could not save prepared demo records. Existing stored data is preserved; retry loading."));
          value = enriched;
          current.current = value;
          setState(value);
        }
      })
      .catch(() => {
        if (mounted) {
          const value = addMeetingPreviewData(addPreviewData(createWorkspace()));
          current.current = value;
          setState(value);
          writable.current = false; setStorageError(true);
          setError("Saved records could not be loaded. Existing data is preserved; allow storage and retry loading.");
        }
      });
    return () => {
      mounted = false;
    };
  }, [storageRevision, reportStorageError]);
  function act(action: Action) {
    if (!current.current || !writable.current) { reportStorageError("Saved records could not be loaded. Allow storage and retry loading; no data was overwritten."); return Promise.resolve(false); }
    const request = JSON.stringify([actorId, action]);
    if (inFlight.current.has(request)) return Promise.resolve(false);
    inFlight.current.add(request);
    setSaving(true);
    const job = queue.current.then(async () => {
      let next: Workspace;
      try { next = applyAction(current.current!, actorId, action, `${Date.now()}-${++sequence.current}`); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid operation."); return false; }
      try { await AsyncStorage.setItem(key, JSON.stringify(next)); }
      catch { reportStorageError("Could not save on this device. Your input is preserved; try Save again."); return false; }
      current.current = next; setState(next); setError(null); setStorageError(false);
      return true;
    });
    queue.current = job.then(() => {});
    return job.finally(() => { inFlight.current.delete(request); if (!inFlight.current.size) setSaving(false); });
  }

  async function reset() {
    await queue.current;
    const next = addMeetingPreviewData(addPreviewData(createWorkspace()));
    await AsyncStorage.setItem(key, JSON.stringify(next));
    const role = current.current?.users.find((u) => u.id === actorId)?.role ?? "student";
    current.current = next;
    if (!next.users.some((u) => u.id === actorId))
      setActor(next.users.find((u) => u.role === role)!.id);
    setState(next);
    setError(null);
    setStorageError(false);
  }
  if (!state)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  return (
    <Context.Provider
      value={{
        state,
        actorId,
        setActor,
        selectRole: (role) => setActor(state.users.find((u) => u.role === role)!.id),
        act,
        error,
        clearError: () => setError(null),
        storageError,
        saving, storageRevision, retryLoading: () => setStorageRevision(value => value + 1), reportStorageError,
        reset,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("WorkspaceProvider missing");
  return ctx;
}
export function useRole(role: Role) {
  const { state, actorId, selectRole } = useWorkspace();
  const matches = state.users.find((u) => u.id === actorId)?.role === role;
  useFocusEffect(
    useCallback(() => {
      if (!matches) selectRole(role);
    }, [matches, role, selectRole]),
  );
  return matches;
}
