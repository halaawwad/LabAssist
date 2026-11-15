import { useState } from "react";
import { Image, View } from "react-native";
import { AppText, Button } from "@/components";
import { Panel, kit, useCopy } from "@/components/MobileKit";
import { effectiveAccountStatus } from "../../../../shared/web/domain";
import { currentGroup, projectNumber } from "../../../../shared/department/records";
import type { Account, Group } from "./departmentData";
export const readableNumber = (g: Group) =>
  /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(projectNumber(g)) ? "" : projectNumber(g);
export function PersonRow({ person, compact = false }: { person: Account; compact?: boolean }) {
  const t = useCopy();
  const [failed, setFailed] = useState(false);
  const photo = person.photo || person.photoUrl || person.avatarUrl;
  const status = effectiveAccountStatus(person);
  return (
    <View style={[kit.row, { alignItems: "flex-start", paddingVertical: 6 }]}>
      {photo && !failed ? (
        <Image
          source={{ uri: photo }}
          onError={() => setFailed(true)}
          style={{ width: 36, height: 36, borderRadius: 18 }}
        />
      ) : (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#e6eddc",
          }}
        >
          <AppText weight="bold">
            {person.name
              .split(" ")
              .filter((v) => !/^Dr\.?$/i.test(v))
              .map((v) => v[0])
              .slice(0, 2)
              .join("")}
          </AppText>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <AppText weight="bold">{person.name}</AppText>
        <AppText variant="caption">{person.number}</AppText>
        {!compact && <AppText variant="caption">{person.email}</AppText>}
        {!compact && (
          <AppText variant="caption" tone={status === "ACTIVE" ? "primary" : "muted"}>
            {status === "ACTIVE"
              ? t("Active", "نشط")
              : status === "PENDING_ACTIVATION"
                ? t("Pending activation", "بانتظار التفعيل")
                : status === "DISABLED"
                  ? t("Disabled", "معطل")
                  : t("Reference only", "مرجعي")}
          </AppText>
        )}
      </View>
    </View>
  );
}
export function GroupPeople({ group, accounts }: { group: Group; accounts: Account[] }) {
  const t = useCopy();
  return (
    <>
      {[
        [t("Supervisors", "المشرفون"), group.supervisorIds],
        [t("Students", "الطلاب"), group.studentIds],
      ].map(([label, ids]) => (
        <View key={label as string} style={{ gap: 3 }}>
          <AppText weight="bold">{label as string}</AppText>
          {(ids as string[]).map((id) => {
            const person = accounts.find((a) => a.id === id);
            return person ? (
              <PersonRow key={id} person={person} />
            ) : (
              <AppText key={id}>{t("Unavailable account", "حساب غير متاح")}</AppText>
            );
          })}
        </View>
      ))}
    </>
  );
}
export function GroupCard({
  group,
  accounts,
  onEdit,
  saving,
}: {
  group: Group;
  accounts: Account[];
  onEdit: () => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const t = useCopy();
  const statuses: Record<string, string> = {
    DRAFT: t("Draft", "مسودة"),
    IN_PROGRESS: t("In progress", "قيد التنفيذ"),
    ON_HOLD: t("On hold", "متوقف مؤقتًا"),
    COMPLETED: t("Completed", "مكتمل"),
    ARCHIVED: t("Archived", "مؤرشف"),
  };
  return (
    <Panel title={group.title || t("Untitled project", "مشروع بلا اسم")}>
      <AppText variant="caption">
        {readableNumber(group)} · {statuses[group.status ?? "DRAFT"] ?? group.status}
      </AppText>
      {group.supervisorIds.map((id) => (
        <AppText key={id}>
          {accounts.find((a) => a.id === id)?.name ?? t("Unavailable account", "حساب غير متاح")}
        </AppText>
      ))}
      <AppText tone="muted">
        {group.studentIds.length} {t("students", "طلاب")}
      </AppText>
      <View style={kit.wrap}>
        <Button
          title={expanded ? t("Less", "أقل") : t("Details", "التفاصيل")}
          size="sm"
          variant="ghost"
          accessibilityLabel={`${t("Group details", "تفاصيل المجموعة")}: ${group.title || readableNumber(group)}`}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(!expanded)}
        />
        <Button
          title={t("Edit", "تعديل")}
          size="sm"
          variant="soft"
          disabled={saving || ["COMPLETED", "ARCHIVED"].includes(group.status ?? "")}
          onPress={onEdit}
        />
      </View>
      {expanded && <GroupPeople group={group} accounts={accounts} />}
    </Panel>
  );
}
export function AccountCard({
  account,
  groups,
  accounts,
  actions,
}: {
  account: Account;
  groups: Group[];
  accounts: Account[];
  actions: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const t = useCopy();
  const assigned = groups.filter(
    (g) =>
      currentGroup(g) &&
      (account.role === "student" ? g.studentIds : g.supervisorIds).includes(account.id),
  );
  const students = new Set(assigned.flatMap((g) => g.studentIds)).size;
  return (
    <Panel>
      <PersonRow person={account} />
      <AppText variant="caption">
        {account.role === "student"
          ? t("Student", "طالب")
          : account.role === "supervisor"
            ? t("Supervisor", "مشرف")
            : t("Workshop Manager", "مدير الورشة")}
      </AppText>
      <AppText tone="muted">
        {assigned.length
          ? `${assigned.length} ${t("groups", "مجموعات")} · ${students} ${t("students", "طلاب")}`
          : account.role === "workshop"
            ? t("Workshop Manager", "مدير الورشة")
            : t("Unassigned", "غير معيّن")}
      </AppText>
      <Button
        title={expanded ? t("Less", "أقل") : t("Assignments", "التعيينات")}
        variant="ghost"
        size="sm"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
      />
      {expanded &&
        assigned.map((g) => (
          <View key={g.id} style={{ gap: 6 }}>
            <AppText weight="bold">
              {g.title || t("Untitled project", "مشروع بلا اسم")} · {readableNumber(g)}
            </AppText>
            <GroupPeople group={g} accounts={accounts} />
          </View>
        ))}
      <View style={kit.wrap}>{actions}</View>
    </Panel>
  );
}
