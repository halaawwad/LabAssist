import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionClient } from "../auth/session-client";
import type { ProjectWorkspace } from "../contracts/project-work";

export function useSupervisedProjects(client: SessionClient, accountId?: string) {
  const [result, setResult] = useState<{
    accountId: string;
    projects: ProjectWorkspace[];
    failed: boolean;
  }>();
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    if (!accountId) return;
    const version = ++sequence.current;
    try {
      const projects = await client.authorizedRequest<ProjectWorkspace[]>("/projects/supervised");
      if (version === sequence.current) setResult({ accountId, projects, failed: false });
    } catch {
      if (version === sequence.current) setResult({ accountId, projects: [], failed: true });
    }
  }, [client, accountId]);
  useEffect(() => {
    void reload();
    return () => {
      sequence.current++;
    };
  }, [reload]);
  const current = result?.accountId === accountId ? result : undefined;
  return { projects: current?.projects ?? [], loading: !current, failed: current?.failed, reload };
}
