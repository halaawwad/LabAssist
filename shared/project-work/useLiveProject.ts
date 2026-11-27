import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type SessionClient } from "../auth/session-client";
import type { ProjectWorkspace } from "../contracts/project-work";

export function useLiveProject(client: SessionClient | null, accountId: string | undefined) {
  const [state, setState] = useState<{
    accountId: string;
    project: ProjectWorkspace | null;
    error: "missing" | "load" | "save" | "conflict" | null;
  }>();
  const [saving, setSaving] = useState(false);
  const request = useRef(0);
  const busy = useRef(false);
  const current = state?.accountId === accountId ? state : undefined;

  const reload = useCallback(async () => {
    if (!client || !accountId) return;
    const version = ++request.current;
    try {
      const project = await client.authorizedRequest<ProjectWorkspace>("/projects/mine");
      if (request.current === version) setState({ accountId, project, error: null });
    } catch (error) {
      if (request.current === version) {
        setState({
          accountId,
          project: null,
          error: error instanceof ApiError && error.status === 404 ? "missing" : "load",
        });
      }
    }
  }, [client, accountId]);

  useEffect(() => {
    void reload();
    return () => {
      request.current++;
    };
  }, [reload]);

  async function save(path: string, method: "POST" | "PATCH", body: unknown) {
    if (!client || !accountId || !current?.project || busy.current) return false;
    busy.current = true;
    setSaving(true);
    const version = request.current;
    try {
      await client.authorizedRequest("/projects/" + current.project.id + path, method, body);
      if (request.current === version) await reload();
      return true;
    } catch (error) {
      if (request.current === version) {
        setState({
          accountId,
          project: current.project,
          error: error instanceof ApiError && error.status === 409 ? "conflict" : "save",
        });
      }
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return { ...current, saving, reload, save, loading: !!client && !current };
}
