import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type Account, type SessionClient } from "../auth/session-client";
import type { ProjectGroupInput, ProjectGroupList } from "../contracts/project-work";
import type { DepartmentAccount, DepartmentGroup } from "../department/records";

const path = "/department/project-groups";

export function useDepartmentProjectGroups(client: SessionClient | null, active: boolean) {
  const [data, setData] = useState<ProjectGroupList>();
  const [accounts, setAccounts] = useState<DepartmentAccount[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const sequence = useRef(0);
  const busy = useRef(false);

  const reload = useCallback(async () => {
    if (!client || !active) return;
    const version = ++sequence.current;
    setLoadFailed(false);
    try {
      const [result, people] = await Promise.all([
        client.authorizedRequest<ProjectGroupList>(path),
        client.authorizedRequest<Account[]>("/accounts"),
      ]);
      if (version !== sequence.current) return;
      setData(result);
      setAccounts(
        people
          .filter((person) => person.role === "STUDENT" || person.role === "SUPERVISOR")
          .map<DepartmentAccount>((person) => ({
            id: person.id,
            name: person.fullName,
            email: person.email,
            number: person.universityNumber ?? person.employeeNumber ?? "",
            role: person.role === "STUDENT" ? "Student" : "Supervisor",
            active: person.status === "ACTIVE",
            status:
              person.status === "ACTIVE" ||
              person.status === "PENDING_ACTIVATION" ||
              person.status === "REFERENCE_ONLY"
                ? person.status
                : "DISABLED",
            linked: false,
            invited: false,
          })),
      );
    } catch {
      if (sequence.current === version) setLoadFailed(true);
    }
  }, [client, active]);

  useEffect(() => {
    if (!active) return;
    void reload();
    return () => {
      sequence.current++;
    };
  }, [active, reload]);

  async function save(group: DepartmentGroup, confirmedTransfer: boolean) {
    if (!client || busy.current || !group.termId) return false;
    const input: ProjectGroupInput = {
      title: group.title ?? "",
      projectNumber: group.projectNumber ?? "",
      termId: group.termId,
      studentIds: group.studentIds,
      supervisorIds: group.supervisorIds,
      confirmedTransfer,
      expectedUpdatedAt: group.updatedAt,
    };
    busy.current = true;
    setSaving(true);
    try {
      await client.authorizedRequest(
        group.updatedAt ? path + "/" + group.id : path,
        group.updatedAt ? "PATCH" : "POST",
        input,
      );
      await reload();
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        throw Error(
          "The group changed, the code is taken, or a transfer needs confirmation. Refresh groups and try again.",
        );
      }
      throw Error("Could not save. Check the term, team size, and supervisor capacity.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return {
    groups: data?.groups ?? [],
    openTerms: data?.openTerms ?? [],
    accounts,
    saving,
    loadFailed,
    reload,
    save,
  };
}
