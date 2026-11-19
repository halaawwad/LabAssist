import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ellipsis } from "lucide-react-native";
import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { colors } from "@/theme";
import { useLanguage } from "@/i18n";
import { AppText, Button } from "@/components";
import { Panel, kit, useCopy } from "@/components/MobileKit";
import { effectiveAccountStatus } from "../../../../shared/web/domain";
import { currentGroup, projectNumber } from "../../../../shared/department/records";
import type { Account, Group } from "./departmentData";
export const readableNumber = (g: Group) =>
  /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(projectNumber(g)) ? "" : projectNumber(g);
export function PersonAvatar({ person, size = 36 }: { person: Account; size?: number }) {
  const [failed, setFailed] = useState(false);
  const photo = person.photo || person.photoUrl || person.avatarUrl;
  return photo && !failed ? (
    <Image
      source={{ uri: photo }}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
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
  );
}
export function PersonRow({
  person,
  compact = false,
  avatarSize = 36,
}: {
  person: Account;
  compact?: boolean;
  avatarSize?: number;
}) {
  const t = useCopy();
  const status = effectiveAccountStatus(person);
  return (
    <View style={[kit.row, { alignItems: "flex-start", paddingVertical: 6 }]}>
      <PersonAvatar person={person} size={avatarSize} />
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
export function GroupRow({
  group,
  accounts,
  onOpen,
}: {
  group: Group;
  accounts: Account[];
  onOpen: () => void;
}) {
  const t = useCopy();
  const { isolate, ltr } = useLanguage();
  const statuses: Record<string, string> = {
    DRAFT: t("Draft", "مسودة"),
    IN_PROGRESS: t("In progress", "قيد التنفيذ"),
    ON_HOLD: t("On hold", "متوقف مؤقتًا"),
    COMPLETED: t("Completed", "مكتمل"),
    ARCHIVED: t("Archived", "مؤرشف"),
  };
  return (
    <View style={rows.row}>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [rows.main, pressed && rows.pressed]}
      >
        <View style={rows.copy}>
          <AppText weight="semibold">
            {group.title || t("Untitled project", "مشروع بلا اسم")}
          </AppText>
          <AppText variant="caption" tone="muted">
            {[
              readableNumber(group) && ltr(readableNumber(group)),
              statuses[group.status ?? "DRAFT"] ?? group.status,
            ]
              .filter(Boolean)
              .join(" · ")}
          </AppText>
          <AppText variant="caption" tone="muted">
            {group.supervisorIds
              .map((id) =>
                isolate(
                  accounts.find((a) => a.id === id)?.name ??
                    t("Unavailable account", "حساب غير متاح"),
                ),
              )
              .join(", ")}
            {group.supervisorIds.length ? " · " : ""}
            {isolate(`${group.studentIds.length} ${t("students", "طلاب")}`)}
          </AppText>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("Actions for", "خيارات")} ${group.title || readableNumber(group)}`}
        onPress={onOpen}
        style={rows.more}
      >
        <Ellipsis size={22} color={colors.primary} />
      </Pressable>
    </View>
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

const roleLabel = (role: Account["role"], t: ReturnType<typeof useCopy>) =>
  role === "student"
    ? t("Student", "طالب")
    : role === "supervisor"
      ? t("Supervisor", "مشرف")
      : t("Workshop Manager", "مدير الورشة");

export function statusLabel(account: Account, t: ReturnType<typeof useCopy>) {
  const status = effectiveAccountStatus(account);
  return status === "ACTIVE"
    ? t("Active", "نشط")
    : status === "PENDING_ACTIVATION"
      ? t("Pending activation", "بانتظار التفعيل")
      : status === "DISABLED"
        ? t("Disabled", "معطل")
        : t("Reference only", "مرجعي");
}

const assignedGroups = (account: Account, groups: Group[]) =>
  groups.filter(
    (g) =>
      currentGroup(g) &&
      (account.role === "student" ? g.studentIds : g.supervisorIds).includes(account.id),
  );

/** Compact account row: avatar, name, role and status. Row tap or ⋯ opens the actions. */
export function AccountRow({
  account,
  groups,
  onOpen,
}: {
  account: Account;
  groups: Group[];
  onOpen: () => void;
}) {
  const t = useCopy();
  const status = effectiveAccountStatus(account);
  const assigned = assignedGroups(account, groups).length;
  const role = roleLabel(account.role, t);
  const detail =
    account.role === "workshop"
      ? role
      : `${role} · ${assigned ? `${assigned} ${t("groups", "مجموعات")}` : t("Unassigned", "غير معيّن")}`;
  const badge =
    status === "ACTIVE"
      ? { bg: colors.primaryWash, fg: colors.primary }
      : status === "PENDING_ACTIVATION"
        ? { bg: colors.warningSoft, fg: colors.warningText }
        : status === "DISABLED"
          ? { bg: colors.dangerSoft, fg: colors.dangerText }
          : { bg: colors.segmentTrack, fg: colors.textMuted };
  // The row and the ⋯ button are siblings: a web <button> cannot contain another button.
  return (
    <View style={rows.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${account.name}, ${detail}, ${statusLabel(account, t)}`}
        accessibilityHint={t("Opens account actions", "يفتح خيارات الحساب")}
        onPress={onOpen}
        style={({ pressed }) => [rows.main, pressed && rows.pressed]}
      >
        <Initials person={account} />
        <View style={rows.copy}>
          <AppText weight="semibold" numberOfLines={2}>
            {account.name}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {account.number} · {detail}
          </AppText>
        </View>
        <View style={[rows.badge, { backgroundColor: badge.bg }]}>
          <AppText weight="semibold" style={[rows.badgeText, { color: badge.fg }]}>
            {statusLabel(account, t)}
          </AppText>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(`Actions for ${account.name}`, `خيارات ${account.name}`)}
        onPress={onOpen}
        style={rows.more}
      >
        <Ellipsis size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}

function Initials({ person }: { person: Account }) {
  const [failed, setFailed] = useState(false);
  const photo = person.photo || person.photoUrl || person.avatarUrl;
  return photo && !failed ? (
    <Image source={{ uri: photo }} onError={() => setFailed(true)} style={rows.avatar} />
  ) : (
    <View style={[rows.avatar, rows.initials]}>
      <AppText weight="bold" style={{ fontSize: 14 }}>
        {person.name
          .split(" ")
          .filter((v) => !/^Dr\.?$/i.test(v))
          .map((v) => v[0])
          .slice(0, 2)
          .join("")}
      </AppText>
    </View>
  );
}

/** Groups currently assigned to an account, with their members (read-only). */
export function AccountAssignments({
  account,
  groups,
  accounts,
}: {
  account: Account;
  groups: Group[];
  accounts: Account[];
}) {
  const t = useCopy();
  const assigned = assignedGroups(account, groups);
  const students = new Set(assigned.flatMap((g) => g.studentIds)).size;
  return (
    <View style={{ gap: 14 }}>
      <PersonRow person={account} />
      <AppText tone="muted">
        {assigned.length
          ? `${assigned.length} ${t("groups", "مجموعات")} · ${students} ${t("students", "طلاب")}`
          : account.role === "workshop"
            ? t("Workshop Manager", "مدير الورشة")
            : t("Unassigned", "غير معيّن")}
      </AppText>
      {assigned.map((g) => (
        <Panel key={g.id} title={`${g.title || t("Untitled project", "مشروع بلا اسم")}`}>
          {!!readableNumber(g) && <AppText variant="caption">{readableNumber(g)}</AppText>}
          <GroupPeople group={g} accounts={accounts} />
        </Panel>
      ))}
    </View>
  );
}

const rows = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingStart: 4,
  },
  pressed: { backgroundColor: colors.primaryWash },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  initials: { alignItems: "center", justifyContent: "center", backgroundColor: "#e6eddc" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, maxWidth: 110 },
  badgeText: { fontSize: 12, lineHeight: 17 },
  more: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
