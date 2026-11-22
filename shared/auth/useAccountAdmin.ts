import { useCallback, useEffect, useRef, useState } from "react";
import { SessionClient, type Account, type ApiRole } from "./session-client";

export type ProvisionInput = {
  role: Exclude<ApiRole, "DEPARTMENT_HEAD">;
  fullName: string;
  email?: string;
  universityNumber?: string;
  employeeNumber?: string;
};
export function accountAdminMessage(cause: unknown, ar = false) {
  const status = (cause as { status?: number })?.status;
  const messages = {
    0: [
      "Connection lost. Reload accounts before retrying a save.",
      "انقطع الاتصال. حدّث الحسابات قبل إعادة الحفظ.",
    ],
    400: [
      "Check the details and current account status.",
      "تحقق من البيانات وحالة الحساب الحالية.",
    ],
    401: ["Your session expired. Sign in again.", "انتهت الجلسة. سجّل الدخول مجددًا."],
    403: ["Only the department head can manage accounts.", "إدارة الحسابات متاحة لرئيس القسم فقط."],
    409: [
      "This number, email or workshop manager already exists. Reload accounts.",
      "الرقم أو البريد أو مسؤول الورشة موجود بالفعل. حدّث الحسابات.",
    ],
    429: ["Too many requests. Wait and retry.", "طلبات كثيرة. انتظر وأعد المحاولة."],
  };
  const message = messages[status as keyof typeof messages] ?? [
    "Could not save. Your input is preserved.",
    "تعذر الحفظ. تم الاحتفاظ بمدخلاتك.",
  ];
  return message[ar ? 1 : 0];
}
/** Server state stays in memory, never in the local demo store. */
export function useAccountAdmin(client: SessionClient, ar = false) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const alive = useRef(false);
  const lock = useRef(false);
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const revision = ++sequence.current;
    setReady(false);
    try {
      const rows = await client.authorizedRequest<Account[]>("/accounts");
      if (alive.current && revision === sequence.current) {
        setAccounts(rows.filter((a) => a.role !== "DEPARTMENT_HEAD"));
        setReady(true);
        setError("");
      }
    } catch (cause) {
      if (alive.current && revision === sequence.current) setError(accountAdminMessage(cause, ar));
    }
  }, [client, ar]);
  useEffect(() => {
    alive.current = true;
    void reload();
    return () => {
      alive.current = false;
      ++sequence.current;
    };
  }, [reload]);
  async function mutate(work: () => Promise<unknown>, message: string) {
    if (lock.current || !ready) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      if (alive.current) setNotice(message);
      await reload();
      return true;
    } catch (cause) {
      if (alive.current) {
        setError(accountAdminMessage(cause, ar));
        // An ambiguous write must be reconciled with the server before retry.
        setReady(false);
      }
      return false;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return {
    accounts,
    ready,
    busy,
    error,
    notice,
    reload,
    create: (input: ProvisionInput) =>
      mutate(
        () => client.authorizedRequest("/accounts", "POST", input),
        ar
          ? "تم إنشاء الحساب وإضافة دعوة التفعيل إلى طابور البريد."
          : "Account created; activation invitation queued.",
      ),
    rename: (id: string, fullName: string) =>
      mutate(
        () => client.authorizedRequest(`/accounts/${id}`, "PATCH", { fullName }),
        ar ? "تم تحديث الاسم." : "Name updated.",
      ),
    invite: (id: string) =>
      mutate(
        () => client.authorizedRequest(`/accounts/${id}/invitation`, "POST", {}),
        ar
          ? "تمت إضافة دعوة جديدة إلى طابور البريد. الرابط السابق لم يعد صالحًا."
          : "New invitation queued. The previous link is no longer valid.",
      ),
    status: (id: string, status: "ACTIVE" | "DISABLED") =>
      mutate(
        () => client.authorizedRequest(`/accounts/${id}/status`, "PATCH", { status }),
        ar ? "تم تحديث حالة الحساب." : "Account status updated.",
      ),
  };
}
