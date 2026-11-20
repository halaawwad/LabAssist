import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SessionClient, type TokenStore } from "./session-client";
export const demoMode = process.env.EXPO_PUBLIC_AUTH_MODE === "demo";
const key = "labassist.refresh.v1";
const store: TokenStore =
  Platform.OS === "web"
    ? {
        read: async () =>
          typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(key),
        write: async (value) => {
          sessionStorage.setItem(key, value);
        },
        clear: async () => {
          if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(key);
        },
      }
    : {
        read: () => SecureStore.getItemAsync(key),
        write: (value) =>
          SecureStore.setItemAsync(key, value, {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          }),
        clear: () => SecureStore.deleteItemAsync(key),
      };
const host = Constants.expoConfig?.hostUri?.split(":")[0];
export const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? `http://${Platform.OS === "web" ? "127.0.0.1" : host || "127.0.0.1"}:3100/v1` : "");
export const authClient = new SessionClient(apiUrl.replace(/\/$/, ""), store);
export const roleCodes = {
  student: "STUDENT",
  supervisor: "SUPERVISOR",
  workshop: "WORKSHOP_MANAGER",
  department: "DEPARTMENT_HEAD",
} as const;
export function authMessage(error: unknown, ar: boolean) {
  const status = (error as { status?: number })?.status;
  return status === 401
    ? ar
      ? "تأكد من بيانات الدخول والدور، وأن حسابك مفعّل."
      : "Check your credentials, selected role and account activation."
    : status === 400
      ? ar
        ? "تأكد من البيانات. رابط التفعيل أو الاستعادة قد يكون منتهيًا أو مستخدمًا."
        : "Check your details. The link may be expired or already used."
      : status === 429
        ? ar
          ? "محاولات كثيرة. انتظر قليلًا وأعد المحاولة."
          : "Too many attempts. Wait and try again."
        : status === 0
          ? ar
            ? "تعذر الاتصال بالخادم. تأكد من الإنترنت وأعد المحاولة."
            : "Cannot reach the server. Check your connection and retry."
          : ar
            ? "تعذر إكمال العملية. أعد المحاولة."
            : "Could not complete the request. Please retry.";
}
