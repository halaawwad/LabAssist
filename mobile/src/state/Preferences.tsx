import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
export const defaultPreferences = {
  motion: true,
  background: true,
  largeText: false,
  messagePreviews: true,
  enterToSend: true,
  meetingReminders: true,
  reportReminders: true,
  teamUpdates: true,
};
export type Preferences = typeof defaultPreferences;
const Context = createContext({
  preferences: defaultPreferences,
  save: async (_value: Preferences) => {},
});
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem("labassist.mobile.preferences.v1")
      .then((raw) => {
        if (raw && alive) {
          const data = JSON.parse(raw);
          setPreferences(
            Object.fromEntries(
              Object.entries(defaultPreferences).map(([k, v]) => [
                k,
                typeof data[k] === "boolean" ? data[k] : v,
              ]),
            ) as Preferences,
          );
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  async function save(value: Preferences) {
    await AsyncStorage.setItem("labassist.mobile.preferences.v1", JSON.stringify(value));
    setPreferences(value);
  }
  return <Context.Provider value={{ preferences, save }}>{children}</Context.Provider>;
}
export const usePreferences = () => useContext(Context);
