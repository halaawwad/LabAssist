import { useEffect, useState } from "react";
import { currentStorageFailure, storageEvent } from "./localStorage";

export function LocalStorageNotice() {
  const [error, setError] = useState("");
  useEffect(() => {
    const update = () => setError(currentStorageFailure());
    update();
    window.addEventListener(storageEvent, update);
    return () => window.removeEventListener(storageEvent, update);
  }, []);
  return error ? (
    <p role="alert">
      {error} / تعذر حفظ التغييرات. أعد المحاولة بعد السماح بالتخزين.{" "}
      <button onClick={() => window.location.reload()}>Retry loading / إعادة التحميل</button>
    </p>
  ) : null;
}
