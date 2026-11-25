import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { Redirect, usePathname } from "expo-router";
import { authClient, authMessage, demoMode, roleCodes } from "@/features/auth/client";
import type { Account } from "@/features/auth/session-client";
import { AppText, Button } from "@/components";
import { useLanguage } from "@/i18n";
export type SessionRole = "student" | "supervisor" | "workshop" | "department";
const key = "labassist.mobile.demo-session.v1";
const Context = createContext<{
  account: Account | null;
  signIn: (role: SessionRole, identifier?: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
} | null>(null);
export const sessionHome = (role: SessionRole) =>
  role === "student"
    ? "/native"
    : role === "department"
      ? "/native/department"
      : `/native/${role}/dashboard`;
const accountRole = (account: Account): SessionRole =>
  account.role === "STUDENT"
    ? "student"
    : account.role === "SUPERVISOR"
      ? "supervisor"
      : account.role === "WORKSHOP_MANAGER"
        ? "workshop"
        : "department";
export function NativeSessionProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<SessionRole | null>(null),
    [account, setAccount] = useState<Account | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const { language } = useLanguage(),
    pathname = usePathname();
  const mounted = useRef(true);
  const restore = useCallback(async () => {
    setReady(false);
    setError("");
    try {
      if (demoMode) {
        const r = await AsyncStorage.getItem(key);
        if (mounted.current)
          setRole(
            ["student", "supervisor", "workshop", "department"].includes(r ?? "")
              ? (r as SessionRole)
              : null,
          );
      } else {
        const a = await authClient.restore();
        if (mounted.current) {
          setAccount(a);
          setRole(a ? accountRole(a) : null);
        }
      }
    } catch (e) {
      if (mounted.current) setError(authMessage(e, language === "ar"));
    } finally {
      if (mounted.current) setReady(true);
    }
  }, [language]);
  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(restore);
    return () => {
      mounted.current = false;
    };
  }, [restore]);
  useEffect(() => {
    if (demoMode) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && authClient.account)
        void authClient
          .me()
          .then((a) => {
            if (authClient.account?.id !== a.id) return;
            setAccount(a);
            setRole(accountRole(a));
          })
          .catch((e) => {
            if (e.status === 401) {
              setAccount(null);
              setRole(null);
            } else setError(authMessage(e, language === "ar"));
          });
    });
    return () => sub.remove();
  }, [language]);
  const publicRoute = [
    "/native/login",
    "/native/activate",
    "/native/reset-password",
    "/native/forgot-password",
  ].includes(pathname);
  const requested = pathname.split("/")[2];
  const routeRole =
    requested === "supervisor" || requested === "workshop" || requested === "department"
      ? requested
      : "student";
  return (
    <Context.Provider
      value={{
        account,
        signIn: async (next, identifier, password) => {
          if (demoMode) {
            await AsyncStorage.setItem(key, next);
            setRole(next);
          } else {
            const a = await authClient.login(roleCodes[next], identifier ?? "", password ?? "");
            setAccount(a);
            setRole(accountRole(a));
          }
          setError("");
        },
        signOut: async () => {
          if (demoMode) await AsyncStorage.removeItem(key);
          else await authClient.logout();
          setAccount(null);
          setRole(null);
          setError("");
        },
      }}
    >
      {!ready ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator color="#526443" />
        </View>
      ) : error && (!publicRoute || pathname === "/native/login") ? (
        <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
          <AppText accessibilityRole="alert">{error}</AppText>
          <Button
            title={language === "ar" ? "إعادة المحاولة" : "Retry"}
            onPress={() => void restore()}
          />
          <Button
            title={language === "ar" ? "تسجيل الخروج" : "Log out"}
            variant="ghost"
            onPress={async () => {
              await authClient.logout();
              setRole(null);
              setAccount(null);
              setError("");
            }}
          />
        </View>
      ) : !role && !publicRoute ? (
        <Redirect href="/native/login" />
      ) : role && pathname === "/native/login" ? (
        <Redirect href={sessionHome(role) as import("expo-router").Href} />
      ) : role && !publicRoute && role !== routeRole ? (
        <Redirect href={sessionHome(role) as import("expo-router").Href} />
      ) : (
        children
      )}
    </Context.Provider>
  );
}
export function useNativeSession() {
  const context = useContext(Context);
  if (!context) throw Error("NativeSessionProvider missing");
  return context;
}
