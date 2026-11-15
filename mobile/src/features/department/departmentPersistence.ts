import { validDepartment, type DepartmentData } from "./departmentData";
export const departmentKeys = [
  "labassist.mobile.department.accounts",
  "labassist.mobile.department.groups",
  "labassist.mobile.department.messages",
] as const;
const journal = "labassist.mobile.department.transaction";
export type DepartmentStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiSet(values: [string, string][]): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
};
type Saved = { key: string; value: string | null }[];
async function restore(storage: DepartmentStorage, previous: Saved) {
  await storage.multiSet(previous.filter((p) => p.value !== null).map((p) => [p.key, p.value!]));
  await storage.multiRemove(previous.filter((p) => p.value === null).map((p) => p.key));
  await storage.removeItem(journal);
}
export async function recoverDepartment(storage: DepartmentStorage) {
  const raw = await storage.getItem(journal);
  if (raw === null) return;
  const previous = JSON.parse(raw) as Saved;
  if (
    !Array.isArray(previous) ||
    previous.length !== departmentKeys.length ||
    new Set(previous.map((p) => p.key)).size !== departmentKeys.length ||
    previous.some(
      (p) =>
        !departmentKeys.some((k) => k === p.key) ||
        (p.value !== null && typeof p.value !== "string"),
    )
  )
    throw new Error("Could not recover saved records. Retry loading.");
  await restore(storage, previous);
}
export async function readDepartment(storage: DepartmentStorage, initial: DepartmentData) {
  await recoverDepartment(storage);
  const raw = await Promise.all(departmentKeys.map((key) => storage.getItem(key)));
  const data: DepartmentData = {
    accounts: raw[0] === null ? initial.accounts : JSON.parse(raw[0]),
    groups: raw[1] === null ? initial.groups : JSON.parse(raw[1]),
    messages: raw[2] === null ? initial.messages : JSON.parse(raw[2]),
  };
  if (!validDepartment(data))
    throw new Error("Could not read saved department records. Existing data is preserved.");
  // Enrich old assignment-only previews with existing workspace display metadata,
  // never replacing an explicitly saved value or altering account status/identity.
  data.groups = data.groups.map((group) => {
    const seed = initial.groups.find((g) => g.id === group.id);
    const defaults = Object.fromEntries(
      ["title", "canonicalId", "termId"].flatMap((key) => {
        const field = key as "title" | "canonicalId" | "termId";
        return group[field] === undefined && seed?.[field] !== undefined
          ? [[field, seed[field]]]
          : [];
      }),
    );
    return { ...defaults, ...group };
  });
  data.accounts = data.accounts.map((account) => {
    const photo = initial.accounts.find((a) => a.id === account.id)?.photo;
    return !account.photo && photo ? { ...account, photo } : account;
  });
  return { data, raw };
}
/** Existing keys remain authoritative. A temporary undo journal protects multi-key saves. */
export async function persistDepartment(
  storage: DepartmentStorage,
  next: DepartmentData,
  expected: (string | null)[],
) {
  if (!validDepartment(next)) throw new Error("Invalid department records.");
  const current = await Promise.all(departmentKeys.map((key) => storage.getItem(key)));
  if (current.some((raw, i) => raw !== expected[i]))
    throw new Error("Records changed. Reload before saving; your input is preserved.");
  const previous = departmentKeys.map((key, i) => ({ key, value: current[i] }));
  const values = [next.accounts, next.groups, next.messages].map((value) => JSON.stringify(value));
  await storage.setItem(journal, JSON.stringify(previous));
  try {
    await storage.multiSet(departmentKeys.map((key, i) => [key, values[i]]));
    await storage.removeItem(journal);
  } catch (cause) {
    try {
      await restore(storage, previous);
    } catch {
      /* The undo journal is recovered before any subsequent read. */
    }
    throw cause;
  }
  return values;
}
