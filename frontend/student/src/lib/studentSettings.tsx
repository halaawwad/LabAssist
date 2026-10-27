import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
export type StudentSettings = {
  motion: boolean;
  background: boolean;
  largeText: boolean;
  messagePreviews: boolean;
  enterToSend: boolean;
  meetingReminders: boolean;
  reportReminders: boolean;
  teamUpdates: boolean;
};
export const defaultStudentSettings: StudentSettings = {
  motion: true,
  background: true,
  largeText: false,
  messagePreviews: true,
  enterToSend: true,
  meetingReminders: true,
  reportReminders: true,
  teamUpdates: true,
};
const SettingsContext = createContext<{
  settings: StudentSettings;
  setSettings: (value: StudentSettings) => void;
} | null>(null);
export function StudentSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StudentSettings>({ ...defaultStudentSettings });
  useEffect(() => {
    const root = document.documentElement;
    root.dataset["workspaceMotion"] = settings.motion ? "on" : "off";
    root.dataset["workspaceBackground"] = settings.background ? "on" : "off";
    root.dataset["workspaceText"] = settings.largeText ? "large" : "standard";
  }, [settings]);
  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
export function useStudentSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("StudentSettingsProvider is required");
  return context;
}
