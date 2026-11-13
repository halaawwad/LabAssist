import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
export function useLocalPreview<T>(key: string, initial: T) {
  const [value, setValue] = useState(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw && alive) setValue(JSON.parse(raw));
      })
      .catch(() => setError("Could not load saved changes."))
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [key]);
  useEffect(() => {
    if (ready)
      AsyncStorage.setItem(key, JSON.stringify(value)).catch(() =>
        setError("Could not save changes on this device."),
      );
  }, [value, ready, key]);
  return { value, setValue, ready, error };
}
