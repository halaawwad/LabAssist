import { useCallback, useEffect, useRef, useState } from "react";

import { getSupervisorDashboard } from "@/services/supervisor";
import type { SupervisorDashboard } from "@/types/supervisor";

type DashboardState =
  | { status: "loading"; data: null }
  | { status: "error"; data: null }
  | { status: "ready"; data: SupervisorDashboard };

export function useSupervisorDashboard() {
  const [state, setState] = useState<DashboardState>({ status: "loading", data: null });
  const [refreshing, setRefreshing] = useState(false);
  // Only the latest request may update state, so a slow response never overwrites a newer one.
  const latestRequest = useRef(0);

  const load = useCallback(() => {
    const request = ++latestRequest.current;
    const isLatest = () => request === latestRequest.current;

    getSupervisorDashboard()
      .then((data) => {
        if (isLatest()) setState({ status: "ready", data });
      })
      .catch(() => {
        // A failed pull-to-refresh keeps the dashboard that is already on screen.
        if (isLatest()) {
          setState((current) => (current.data ? current : { status: "error", data: null }));
        }
      })
      .finally(() => {
        if (isLatest()) setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
    return () => {
      latestRequest.current += 1;
    };
  }, [load]);

  const retry = useCallback(() => {
    setState({ status: "loading", data: null });
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { ...state, refreshing, refresh, retry };
}
