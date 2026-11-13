export type AllocationHistory = { projectId: string; assignedAt?: string; releasedAt?: string };
type Table = {
  code: string;
  shape: "rect" | "round";
  teamIds: string[];
  assignmentHistory?: AllocationHistory[];
};
export function removeWorkshopTeam<T extends Table>(
  tables: T[],
  teamId: string,
  code: string,
): T[] {
  const at = new Date().toISOString();
  return tables.map((table) => {
    if (table.code !== code || !table.teamIds.includes(teamId)) return table;
    const history = [...(table.assignmentHistory ?? [])];
    const active = history.findLastIndex((h) => h.projectId === teamId && !h.releasedAt);
    if (active >= 0) history[active] = { ...history[active]!, releasedAt: at };
    else history.push({ projectId: teamId, releasedAt: at }); // Legacy start date is unknown.
    return {
      ...table,
      teamIds: table.teamIds.filter((id) => id !== teamId),
      assignmentHistory: history,
    };
  });
}
export function assignWorkshopTeam<T extends Table>(
  tables: T[],
  teamId: string,
  code: string,
): T[] {
  const target = tables.find((table) => table.code === code);
  if (!target || !teamId) throw new Error("Choose an existing project and table.");
  if (target.teamIds.includes(teamId)) return tables;
  if (target.teamIds.length >= (target.shape === "round" ? 2 : 1))
    throw new Error("The table is full.");
  let next = tables;
  for (const table of tables.filter((t) => t.teamIds.includes(teamId)))
    next = removeWorkshopTeam(next, teamId, table.code);
  return next.map((table) =>
    table.code === code
      ? {
          ...table,
          teamIds: [...table.teamIds, teamId],
          assignmentHistory: [
            ...(table.assignmentHistory ?? []),
            { projectId: teamId, assignedAt: new Date().toISOString() },
          ],
        }
      : table,
  );
}
