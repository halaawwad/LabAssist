import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, usePathname } from "expo-router";

type SessionRole = "student" | "supervisor" | "workshop" | "department";
const key = "labassist.mobile.demo-session.v1";
const Context = createContext<{
  signIn: (role: SessionRole) => Promise<void>;
  signOut: () => Promise<void>;
} | null>(null);
export const sessionHome = (role: SessionRole) =>
  role === "student"
    ? "/native"
    : role === "department"
      ? "/native/department"
      : `/native/${role}/dashboard`;

/** Local demo navigation state only; this does not authenticate a backend user. */
export function NativeSessionProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<SessionRole | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(key)
      .then((value) => {
        if (mounted && ["student", "supervisor", "workshop", "department"].includes(value ?? ""))
          setRole(value as SessionRole);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const login = pathname === "/native/login";
  const requested = pathname.split("/")[2];
  const routeRole =
    requested === "supervisor" || requested === "workshop" || requested === "department"
      ? requested
      : "student";
  return (
    <Context.Provider
      value={{
        signIn: async (next) => {
          await AsyncStorage.setItem(key, next);
          setRole(next);
        },
        signOut: async () => {
          // Clear only the demo session, never workspace records or preferences.
          await AsyncStorage.removeItem(key);
          setRole(null);
        },
      }}
    >
      {!ready ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator color="#526443" />
        </View>
      ) : !role && !login ? (
        <Redirect href="/native/login" />
      ) : role && !login && role !== routeRole ? (
        <Redirect href={sessionHome(role) as import("expo-router").Href} />
      ) : (
        children
      )}
    </Context.Provider>
  );
}
export function useNativeSession() {
  const context = useContext(Context);
  if (!context) throw new Error("NativeSessionProvider missing");
  return context;
}
