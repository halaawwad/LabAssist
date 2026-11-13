type Record = {
  teamId: string;
  items: string[];
  dateGiven: string;
  checked: boolean;
  history?: Omit<Record, "history">[];
};
export function recordHandover<T extends Record>(
  records: T[],
  teamId: string,
  items: string[],
  dateGiven: string,
): T[] {
  if (
    !teamId ||
    !items.length ||
    items.some((item) => !item.trim()) ||
    new Set(items).size !== items.length
  )
    throw new Error("Choose a project and distinct nonempty item names.");
  const previous = records.find((record) => record.teamId === teamId);
  if (previous && !previous.checked)
    throw new Error("Record the outstanding return before another handover.");
  const record = {
    teamId,
    items,
    dateGiven,
    checked: false,
    history: previous ? [...(previous.history ?? []), { ...previous, history: undefined }] : [],
  } as T;
  return previous
    ? records.map((old) => (old.teamId === teamId ? record : old))
    : [...records, record];
}
