import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type SessionClient } from "../auth/session-client";
import type { ProjectFinance } from "../contracts/project-finance";
export function useProjectFinance(
  client: SessionClient | null,
  accountId: string | undefined,
  projectId: string | undefined,
) {
  const key = accountId && projectId ? accountId + ":" + projectId : "";
  const [state, setState] = useState<{
    key: string;
    data: ProjectFinance | null;
    error: "load" | "save" | "conflict" | null;
  }>();
  const [saving, setSaving] = useState(false);
  const request = useRef(0),
    busy = useRef(false);
  const current = state?.key === key ? state : undefined;
  const reload = useCallback(async () => {
    if (!client || !key || !projectId) return null;
    const version = ++request.current;
    try {
      const data = await client.authorizedRequest<ProjectFinance>(
        "/projects/" + projectId + "/finance",
      );
      if (request.current === version) setState({ key, data, error: null });
      return data;
    } catch {
      if (request.current === version)
        setState((old) => ({ key, data: old?.key === key ? old.data : null, error: "load" }));
      return null;
    }
  }, [client, key, projectId]);
  useEffect(() => {
    void reload();
    return () => {
      request.current++;
    };
  }, [reload]);
  async function save(path: string, method: "POST" | "PUT" | "PATCH", body: unknown) {
    if (!client || !key || !projectId || !current?.data || current.data.readOnly || busy.current)
      return false;
    busy.current = true;
    setSaving(true);
    const version = request.current;
    try {
      await client.authorizedRequest("/projects/" + projectId + "/" + path, method, body);
      if (request.current === version) await reload();
      return true;
    } catch (error) {
      if (request.current === version)
        setState((old) => ({
          key,
          data: old?.key === key ? old.data : null,
          error: error instanceof ApiError && error.status === 409 ? "conflict" : "save",
        }));
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: !!client && !!key && !current,
    saving,
    reload,
    save,
  };
}
export type FinanceClient = ReturnType<typeof useProjectFinance>;
// Purchase UUIDs are idempotency identifiers, not authentication secrets.
export function newExpenseKey() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}
export const validMoney = (v: string) => /^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(v);
