import { capacityOf, type WorkshopTable } from "./webWorkshop/workshopTables";

export function assignWorkshopTeam(tables: WorkshopTable[], teamId: string, targetCode: string) {
  const target = tables.find((t) => t.code === targetCode);
  if (!target || !teamId) throw new Error("Choose a team and table.");
  if (target.teamIds.includes(teamId)) return tables;
  if (target.teamIds.length >= capacityOf(target.shape))
    throw new Error("This table is full. Remove a team first or choose another table.");
  return tables.map((t) => ({
    ...t,
    teamIds:
      t.code === targetCode ? [...t.teamIds, teamId] : t.teamIds.filter((id) => id !== teamId),
  }));
}
export function removeWorkshopTeam(tables: WorkshopTable[], teamId: string, tableCode: string) {
  return tables.map((t) =>
    t.code === tableCode ? { ...t, teamIds: t.teamIds.filter((id) => id !== teamId) } : t,
  );
}
