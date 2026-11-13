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
  act: (action: Action) => boolean;
  error: string | null;
  clearError: () => void;
  storageError: boolean;
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
  useEffect(() => {
    let mounted = true;
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
              value = parsed;
          } catch {
            setStorageError(true);
          }
        }
        if (mounted) {
          const enriched = addMeetingPreviewData(addPreviewData(value));
          if (enriched !== value)
            queue.current = queue.current
              .then(() => AsyncStorage.setItem(key, JSON.stringify(enriched)))
              .catch(() => setStorageError(true));
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
          setStorageError(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);
  function persist(next: Workspace) {
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, JSON.stringify(next)))
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true));
  }
  function act(action: Action) {
    if (!current.current) return false;
    try {
      const next = applyAction(
        current.current,
        actorId,
        action,
        `${Date.now()}-${++sequence.current}`,
      );
      current.current = next;
      setState(next);
      setError(null);
      persist(next);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "invalid_input");
      return false;
    }
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
