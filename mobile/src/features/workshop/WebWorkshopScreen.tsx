import { recordHandover } from "../../../../shared/web/handover";
import { assignWorkshopTeam, removeWorkshopTeam } from "@/domain/workshopAllocation";
import { useState } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { ArrowLeftRight, LayoutGrid, UserCheck, UserX } from "lucide-react-native";
import { useLanguage } from "@/i18n";
import { AppText, Button } from "@/components";
import {
  Chips,
  Field,
  FormError,
  FormSheet,
  Panel,
  kit,
  SearchField,
  useCopy,
  Greeting,
  StatGrid,
  MenuRow,
} from "@/components/MobileKit";
import { WorkshopMap } from "./WorkshopMap";
import { useLocalPreview } from "@/lib/useLocalPreview";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { calendarDay } from "@/domain/workspace";
import { workshopTables, tableStatus } from "@/domain/webWorkshop/workshopTables";
import { teams, students, supervisors, teamById } from "@/domain/webWorkshop/teams";
import { handoverSeed, type HandoverRecord } from "@/domain/webWorkshop/handover";
import {
  noticesSeed,
  notificationsSeed,
  observationsSeed,
  workingHours,
  observationTypes,
  type Notice,
  type Observation,
} from "@/domain/webWorkshop/activity";
import { AttendancePanel } from "./WorkshopScreen";
import { router } from "@/native/router";
type Duty = { status: "onDuty" | "away" | "absent"; from: string; until: string; reason: string };
type Copy = (en: string, ar: string) => string;
const noticeText = (n: Notice, tr: Copy) =>
  n.message ??
  {
    returnItems: tr(
      "Please return the issued tools and components to the workshop for checking.",
      "يرجى إرجاع الأدوات والقطع المستلمة إلى الورشة لفحصها.",
    ),
    general: tr(
      "Please contact the workshop manager about your project workbench.",
      "يرجى التواصل مع مسؤول الورشة بخصوص طاولة مشروعك.",
    ),
    schedule: tr(
      "Check the workshop schedule before your next visit.",
      "راجع جدول الورشة قبل زيارتك القادمة.",
    ),
    closed: tr("The workshop is closed today.", "الورشة مغلقة اليوم."),
    fullDay: tr("The workshop manager is absent today.", "مسؤول الورشة غائب اليوم."),
    unavailable: tr(
      `The workshop manager is temporarily away ${n.params?.from ?? ""}–${n.params?.until ?? ""}.`,
      `مسؤول الورشة غائب مؤقتًا ${n.params?.from ?? ""}–${n.params?.until ?? ""}.`,
    ),
  }[n.kind];
/** Display labels for stored enum values (the stored values themselves never change). */
const observationTypeLabels: Record<string, [string, string]> = {
  repeatedAbsence: ["Repeated absence", "غياب متكرر"],
  notWorking: ["Not working on the project", "لا يعمل على المشروع"],
  readyMade: ["Ready-made project", "مشروع جاهز"],
  misuse: ["Equipment misuse", "سوء استخدام المعدات"],
  unsafe: ["Unsafe practice", "ممارسة غير آمنة"],
  general: ["General note", "ملاحظة عامة"],
  positive: ["Positive note", "ملاحظة إيجابية"],
};
const observationStatusLabels: Record<string, [string, string]> = {
  sent: ["Sent", "مُرسلة"],
  seen: ["Seen", "تمت المشاهدة"],
  followUp: ["Follow-up", "متابعة"],
};
const noticeKindLabels: Record<string, [string, string]> = {
  general: ["General", "عام"],
  closed: ["Workshop closed", "الورشة مغلقة"],
  schedule: ["Schedule", "الجدول"],
  returnItems: ["Return items", "إرجاع القطع"],
  unavailable: ["Temporarily away", "غياب مؤقت"],
  fullDay: ["Full-day absence", "غياب يوم كامل"],
};
const conditionLabels: Record<string, [string, string]> = {
  good: ["Good", "سليمة"],
  damaged: ["Damaged", "تالفة"],
  missing: ["Missing", "مفقودة"],
};
const paramLabels: Record<string, [string, string]> = {
  time: ["Time", "الوقت"],
  supervisor: ["Supervisor", "المشرف"],
  team: ["Team", "الفريق"],
  count: ["Count", "العدد"],
  from: ["From", "من"],
  until: ["Until", "حتى"],
  date: ["Date", "التاريخ"],
};
const route = (page: string) =>
  router.push(`/native/workshop/${page}` as import("expo-router").Href);
export function WebWorkshopScreen({ page }: { page: string }) {
  const tr = useCopy();
  const { formatDateTime, formatLongDate, isolate, ltr } = useLanguage();
  const label = (map: Record<string, [string, string]>, value: string) =>
    map[value] ? tr(map[value][0], map[value][1]) : value;
  const { state: workspaceState, actorId } = useWorkspace();
  const userName = workspaceState.users.find((user) => user.id === actorId)?.name ?? "";
  const { state, act, error: saveError } = useWorkspace();
  const {
    value: tables,
    setValue: setTables,
    ready: tablesReady,
    error: tableStorageError,
  } = useLocalPreview("labassist.mobile.workshop.table-allocations.v1", workshopTables);
  const [assignTeam, setAssignTeam] = useState(""),
    [teamQuery, setTeamQuery] = useState(""),
    [allocationError, setAllocationError] = useState("");
  const tableOfTeam = (id: string) => tables.find((t) => t.teamIds.includes(id));
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState("");
  const [handoverForm, setHandoverForm] = useState(false);
  const [handoverTeam, setHandoverTeam] = useState(teams[0]!.id);
  const [handoverItems, setHandoverItems] = useState("");
  const {
    value: handover,
    setValue: setHandover,
    error: handoverError,
  } = useLocalPreview("labassist.mobile.workshop.handover.web", handoverSeed);
  const { value: notices, setValue: setNotices } = useLocalPreview(
    "labassist.mobile.workshop.notices.web",
    noticesSeed,
  );
  const { value: notifications, setValue: setNotifications } = useLocalPreview(
    "labassist.mobile.workshop.notifications.web",
    notificationsSeed,
  );
  const { value: observations, setValue: setObservations } = useLocalPreview(
    "labassist.mobile.workshop.observations.web",
    observationsSeed,
  );
  const { value: duty, setValue: setDuty } = useLocalPreview<Duty>(
    "labassist.mobile.workshop.duty.web",
    { status: "onDuty", from: "11:00", until: "12:00", reason: "" },
  );
  // One submission at a time from the form sheet.
  const [submitting, setSubmitting] = useState(false);
  const once = async (save: () => Promise<unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await save();
    } finally {
      setSubmitting(false);
    }
  };
  const [sheet, setSheet] = useState<
      "table" | "return" | "notice" | "away" | "absence" | "observation" | null
    >(null),
    [body, setBody] = useState(""),
    [audience, setAudience] = useState("all"),
    [kind, setKind] = useState<Notice["kind"]>("general"),
    [condition, setCondition] = useState<HandoverRecord["condition"]>("good"),
    [note, setNote] = useState(""),
    [observationType, setObservationType] = useState<Observation["type"]>("general"),
    [feedback, setFeedback] = useState("");
  const activeTable = tables.find((t) => t.code === selected),
    activeHandover = handover.find((h) => h.teamId === selected),
    present = Object.values(state.attendance[calendarDay()] ?? {}).filter(Boolean).length,
    absent = Object.values(state.attendance[calendarDay()] ?? {}).filter((v) => !v).length;
  const checked = handover.filter((h) => h.checked).length;
  const matchingTables = tables.filter(
    (t) =>
      (filter === "all" || tableStatus(t) === filter) &&
      `${t.code} ${t.teamIds.join(" ")} ${t.teamIds.map((id) => teamById.get(id)?.project).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function notify(kind: Notice["kind"], audience = "all", message = "") {
    if (
      (await setNotices([
        {
          id: `notice-${Date.now()}`,
          kind,
          audience,
          message:
            message ||
            noticeText(
              {
                id: "",
                kind,
                audience,
                sentAt: "",
                params: { from: duty.from, until: duty.until },
              },
              tr,
            ),
          sentAt: new Date().toISOString(),
        },
        ...notices,
      ])) === false
    )
      return false;
    setFeedback(tr("Notice saved in the local preview.", "تم حفظ الإعلان في المعاينة المحلية."));
    setSheet(null);
  }
  function compose(k: Notice["kind"], target = "all") {
    setSelected("");
    setKind(k);
    setAudience(target);
    setBody("");
    setSheet("notice");
  }
  const summary = (
    <StatGrid
      items={[
        {
          id: "present",
          icon: UserCheck,
          tone: "olive",
          value: present,
          label: tr("Present today", "الحاضرون اليوم"),
          onPress: () => route("attendance"),
        },
        {
          id: "absent",
          icon: UserX,
          tone: "red",
          value: absent,
          label: tr("Absent today", "الغائبون اليوم"),
          onPress: () => route("attendance"),
        },
        {
          id: "tables",
          icon: LayoutGrid,
          tone: "blue",
          value: ltr(`${tables.filter((t) => tableStatus(t) !== "free").length}/${tables.length}`),
          label: tr("Occupied tables", "الطاولات المشغولة"),
          onPress: () => route("map"),
        },
        {
          id: "handovers",
          icon: ArrowLeftRight,
          tone: "violet",
          value: handover.length - checked,
          label: tr("Pending handovers", "تسليمات معلقة"),
          onPress: () => route("handover"),
        },
      ]}
    />
  );
  const selectTable = (code: string) => {
    setSelected(code);
    setAssignTeam("");
    setAllocationError("");
    setSheet("table");
  };
  const mapView = (
    <WorkshopMap
      tables={matchingTables}
      total={tables.length}
      selected={selected}
      onSelect={selectTable}
      teamLabel={(id) => teamById.get(id)?.project ?? id}
    />
  );
  const availability = (
    <Panel title={tr("Manager availability", "توفر مسؤول الورشة")}>
      <AppText weight="bold">
        {duty.status === "onDuty"
          ? tr("On duty", "على رأس العمل")
          : duty.status === "away"
            ? tr("Temporarily away", "غائب مؤقتًا")
            : tr("Absent today", "غائب اليوم")}
      </AppText>
      <AppText>
        {tr("Working hours", "ساعات العمل")} {ltr(`${workingHours.start} – ${workingHours.end}`)}
      </AppText>
      {duty.status === "away" && (
        <AppText>
          {duty.from} – {duty.until} · {duty.reason}
        </AppText>
      )}
      <View style={kit.wrap}>
        <Button
          title={tr("Notify temporary absence", "الإبلاغ عن غياب مؤقت")}
          size="sm"
          variant="soft"
          onPress={() => setSheet("away")}
        />
        <Button
          title={tr("Notify full-day absence", "الإبلاغ عن غياب يوم كامل")}
          size="sm"
          variant="ghost"
          onPress={() => setSheet("absence")}
        />
        {duty.status !== "onDuty" && (
          <Button
            title={tr("Back on duty", "العودة إلى العمل")}
            size="sm"
            onPress={async () => {
              if ((await setDuty({ ...duty, status: "onDuty" })) === false) return false;
              await act({ type: "availability.set", value: "open" });
            }}
          />
        )}
      </View>
    </Panel>
  );
  const sheetTitle =
    sheet === "table"
      ? `${tr("Table", "طاولة")} ${activeTable?.code ?? ""}`
      : sheet === "return"
        ? `${tr("Check return", "فحص الإرجاع")} · ${activeHandover?.teamId ?? ""}`
        : sheet === "notice"
          ? tr("Compose notice", "كتابة إعلان")
          : sheet === "observation"
            ? tr("Report to supervisor", "إبلاغ المشرف")
            : sheet === "away"
              ? tr("Temporary absence", "غياب مؤقت")
              : tr("Full-day absence", "غياب يوم كامل");
  const sheetFooter =
    sheet === "return" && activeHandover ? (
      <Button
        title={tr("Save return check", "حفظ فحص الإرجاع")}
        disabled={condition !== "good" && !note.trim()}
        loading={submitting}
        onPress={() =>
          once(async () => {
            if (
              (await setHandover(
                handover.map((h) =>
                  h.teamId === selected
                    ? {
                        ...h,
                        checked: true,
                        checkedOn: calendarDay(),
                        condition,
                        note,
                        history: [...(h.history ?? []), { ...h, history: undefined }],
                      }
                    : h,
                ),
              )) === false
            )
              return false;
            setSheet(null);
            setFeedback(tr("Return inspection recorded.", "تم تسجيل فحص الإرجاع."));
          })
        }
      />
    ) : sheet === "notice" || sheet === "observation" ? (
      <Button
        title={tr("Save notice", "حفظ الإعلان")}
        disabled={!body.trim()}
        loading={submitting}
        onPress={() =>
          once(async () => {
            if (sheet === "observation") {
              if (
                (await setObservations([
                  {
                    id: `ob-${Date.now()}`,
                    teamId: audience,
                    supervisorId: teamById.get(audience)?.supervisorId ?? "",
                    type: observationType,
                    note: body,
                    date: calendarDay(),
                    status: "sent",
                  },
                  ...observations,
                ])) === false
              )
                return false;
              setSheet(null);
            } else if (selected && notices.some((n) => n.id === selected)) {
              if (
                (await setNotices(
                  notices.map((n) =>
                    n.id === selected ? { ...n, message: body, audience, kind } : n,
                  ),
                )) === false
              )
                return false;
              setSelected("");
              setSheet(null);
            } else if ((await notify(kind, audience, body)) === false) return false;
          })
        }
      />
    ) : sheet === "away" || sheet === "absence" ? (
      <Button
        title={tr("Save availability & notice", "حفظ التوفر والإعلان")}
        loading={submitting}
        onPress={() =>
          once(async () => {
            if (
              sheet === "away" &&
              (!/^([01]\d|2[0-3]):[0-5]\d$/.test(duty.from) ||
                !/^([01]\d|2[0-3]):[0-5]\d$/.test(duty.until) ||
                duty.until <= duty.from)
            ) {
              setFeedback(tr("Choose a valid absence time range.", "اختر فترة غياب صحيحة."));
              return;
            }
            if (
              (await setDuty({ ...duty, status: sheet === "away" ? "away" : "absent" })) === false
            )
              return false;
            await act({ type: "availability.set", value: "closed" });
            if ((await notify(sheet === "away" ? "unavailable" : "fullDay")) === false)
              return false;
          })
        }
      />
    ) : undefined;
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ padding: 18, gap: 17, paddingBottom: 35 }}
      keyboardShouldPersistTaps="handled"
    >
      {!!feedback && (
        <AppText accessibilityRole="alert" tone="primary">
          {feedback}
        </AppText>
      )}
      {page === "dashboard" && (
        <>
          <Greeting name={userName} />
          {summary}
          <Panel title={tr("Workshop map", "خريطة الورشة")}>
            {tables.slice(0, 3).map((table) => (
              <MenuRow
                key={table.code}
                title={
                  table.teamIds.length
                    ? table.teamIds.map((id) => isolate(teamById.get(id)?.project ?? id)).join(" · ")
                    : `${tr("Table", "طاولة")} ${ltr(table.code)}`
                }
                subtitle={
                  tableStatus(table) === "free"
                    ? tr("Free", "متاحة")
                    : `${tr("Table", "طاولة")} ${ltr(table.code)} · ${
                        tableStatus(table) === "shared"
                          ? tr("Shared", "مشتركة")
                          : tr("Assigned", "مخصصة")
                      }`
                }
                onPress={() => selectTable(table.code)}
              />
            ))}
            <MenuRow title={tr("View all", "عرض الكل")} onPress={() => route("map")} />
          </Panel>
          <Panel title={tr("Attendance today", "حضور اليوم")}>
            <AppText>
              {present} {tr("present", "حاضر")} · {absent} {tr("absent", "غائب")} ·{" "}
              {tr("Actual working days only", "أيام الدوام الفعلية فقط")}
            </AppText>
            <Button
              title={tr("Record attendance", "تسجيل الحضور")}
              variant="soft"
              onPress={() => route("attendance")}
            />
          </Panel>
          {availability}
          <Panel title={tr("Team handovers", "تسليمات الفرق")}>
            <AppText>
              {checked} {tr("checked", "تم فحصها")} · {handover.length - checked}{" "}
              {tr("pending", "معلقة")}
            </AppText>
            <Button
              title={tr("Check returned items", "فحص القطع المرجعة")}
              variant="soft"
              onPress={() => route("handover")}
            />
          </Panel>
          <Panel title={tr("Report to supervisors", "إبلاغ المشرفين")}>
            <View style={kit.wrap}>
              {["repeatedAbsence", "readyMade", "general"].map((v) => (
                <Button
                  title={label(observationTypeLabels, v)}
                  key={v}
                  size="sm"
                  variant="soft"
                  onPress={() => {
                    setObservationType(v as Observation["type"]);
                    setAudience(teams[0].id);
                    setBody("");
                    setSheet("observation");
                  }}
                />
              ))}
            </View>
          </Panel>
        </>
      )}
      {page === "map" && (
        <>
          <SearchField
            label={tr("Search table, team or project", "ابحث بالطاولة أو الفريق أو المشروع")}
            placeholder={tr(
              "Search table, team or project…",
              "ابحث بالطاولة أو الفريق أو المشروع…",
            )}
            value={query}
            onChangeText={setQuery}
          />
          <Chips
            value={filter}
            onChange={setFilter}
            accessibilityLabel={tr("Filter tables", "تصفية الطاولات")}
            options={[
              { id: "all", label: tr("All", "الكل") },
              { id: "assigned", label: tr("Assigned", "مخصصة") },
              { id: "free", label: tr("Free", "متاحة") },
              { id: "shared", label: tr("Shared", "مشتركة") },
            ]}
          />
          {mapView}
        </>
      )}
      {page === "attendance" && <AttendancePanel />}
      {page === "handover" && (
        <>
          <Button
            title={tr("Record handover", "تسجيل تسليم")}
            onPress={() => setHandoverForm(!handoverForm)}
          />
          {handoverForm && (
            <Panel title={tr("New handover", "تسليم جديد")}>
              <Chips
                value={handoverTeam}
                onChange={setHandoverTeam}
                options={teams.map((team) => ({ id: team.id, label: team.id }))}
              />
              <Field
                label={tr(
                  "Item names (one of each, separated by commas)",
                  "أسماء القطع (واحدة من كل نوع، مفصولة بفواصل)",
                )}
                value={handoverItems}
                onChangeText={setHandoverItems}
              />
              <Button
                title={tr("Save handover", "حفظ التسليم")}
                disabled={!handoverItems.trim()}
                onPress={async () => {
                  try {
                    const items = handoverItems
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean);
                    const next = recordHandover(handover, handoverTeam, items, calendarDay());
                    if (await setHandover(next)) {
                      setHandoverForm(false);
                      setHandoverItems("");
                      setFeedback(
                        tr("Handover saved on this device.", "تم حفظ التسليم على هذا الجهاز."),
                      );
                    }
                  } catch (cause) {
                    setFeedback(
                      cause instanceof Error
                        ? cause.message
                        : tr("Could not save handover.", "تعذر حفظ التسليم."),
                    );
                  }
                }}
              />
            </Panel>
          )}
          {!!handoverError && <AppText accessibilityRole="alert">{handoverError}</AppText>}
          <Chips
            value={filter}
            onChange={setFilter}
            options={[
              { id: "all", label: `All ${handover.length}` },
              { id: "pending", label: `Pending ${handover.length - checked}` },
              { id: "checked", label: `Checked ${checked}` },
            ]}
          />
          {handover
            .filter(
              (h) =>
                filter === "all" ||
                (filter === "pending" && !h.checked) ||
                (filter === "checked" && h.checked),
            )
            .map((h) => (
              <Panel key={h.teamId} title={`${h.teamId} · ${teamById.get(h.teamId)?.project}`}>
                <AppText variant="caption" tone="muted">
                  {tableOfTeam(h.teamId)?.code} · {tr("Given", "سُلّمت")}{" "}
                  {formatLongDate(h.dateGiven)}
                </AppText>
                <View style={kit.wrap}>
                  {h.items.map((item) => (
                    <View style={s.chip} key={item}>
                      <AppText variant="caption">{item}</AppText>
                    </View>
                  ))}
                </View>
                <AppText tone="primary">
                  {h.checked
                    ? `${tr("Return checked", "تم فحص الإرجاع")} · ${h.checkedOn ? formatLongDate(h.checkedOn) : ""}`
                    : tr("Pending return check", "بانتظار فحص الإرجاع")}
                </AppText>
                {h.condition && <AppText>{label(conditionLabels, h.condition)}</AppText>}
                {h.note && <AppText variant="caption">{h.note}</AppText>}
                <View style={kit.wrap}>
                  {!h.checked && (
                    <Button
                      title={tr("Remind team", "تذكير الفريق")}
                      size="sm"
                      variant="ghost"
                      onPress={() => compose("returnItems", h.teamId)}
                    />
                  )}
                  <Button
                    title={tr("Check return", "فحص الإرجاع")}
                    size="sm"
                    variant="soft"
                    onPress={() => {
                      setSelected(h.teamId);
                      setCondition(h.condition ?? "good");
                      setNote(h.note ?? "");
                      setSheet("return");
                    }}
                  />
                </View>
              </Panel>
            ))}
        </>
      )}
      {page === "notices" && (
        <>
          <Button title={tr("New notice", "إعلان جديد")} onPress={() => compose("general")} />
          <Panel title={tr("Quick notices", "إعلانات سريعة")}>
            <View style={kit.wrap}>
              <Button
                title={tr("Temporary absence", "غياب مؤقت")}
                size="sm"
                variant="soft"
                onPress={() => setSheet("away")}
              />
              <Button
                title={tr("Full-day absence", "غياب يوم كامل")}
                size="sm"
                variant="soft"
                onPress={() => setSheet("absence")}
              />
              {["closed", "schedule", "returnItems", "general"].map((kind) => (
                <Button
                  key={kind}
                  title={label(noticeKindLabels, kind)}
                  size="sm"
                  variant="ghost"
                  onPress={() => compose(kind as Notice["kind"])}
                />
              ))}
            </View>
          </Panel>
          {notices.map((n) => (
            <Panel key={n.id}>
              <AppText weight="bold">
                {label(noticeKindLabels, n.kind)} ·{" "}
                {n.audience === "all"
                  ? tr("All students", "جميع الطلاب")
                  : `${n.audience} · ${teamById.get(n.audience)?.project}`}
              </AppText>
              <AppText>{noticeText(n, tr)}</AppText>
              <AppText variant="caption" tone="muted">
                {formatDateTime(n.sentAt)}
              </AppText>
              <View style={kit.wrap}>
                <Button
                  title={tr("Edit notice", "تعديل الإعلان")}
                  size="sm"
                  variant="ghost"
                  onPress={() => {
                    setSelected(n.id);
                    setBody(noticeText(n, tr));
                    setAudience(n.audience);
                    setKind(n.kind);
                    setSheet("notice");
                  }}
                />
              </View>
            </Panel>
          ))}
        </>
      )}
      {page === "observations" && (
        <>
          <Button
            title={tr("Add supervisor note", "إضافة ملاحظة للمشرف")}
            onPress={() => {
              setAudience(teams[0].id);
              setBody("");
              setObservationType("general");
              setSheet("observation");
            }}
          />
          {observations.map((o) => (
            <Panel key={o.id} title={`${o.teamId} · ${teamById.get(o.teamId)?.project}`}>
              <AppText variant="caption">
                {supervisors.find((s) => s.id === o.supervisorId)?.name} ·{" "}
                {label(observationTypeLabels, o.type)} · {formatLongDate(o.date)}
              </AppText>
              <AppText>{o.note}</AppText>
              <AppText tone="primary">{label(observationStatusLabels, o.status)}</AppText>
            </Panel>
          ))}
        </>
      )}
      {page === "notifications" && (
        <>
          <Button
            title={tr("Mark all as read", "تعليم الكل كمقروء")}
            disabled={notifications.every((n) => n.read)}
            variant="soft"
            onPress={async () =>
              await setNotifications(notifications.map((n) => ({ ...n, read: true })))
            }
          />
          <Chips
            value={filter}
            onChange={setFilter}
            options={[
              { id: "all", label: tr("All", "الكل") },
              { id: "unread", label: tr("Unread", "غير المقروءة") },
            ]}
          />
          {notifications
            .filter((n) => filter !== "unread" || !n.read)
            .map((n) => (
              <Panel key={n.id} tint={n.read ? undefined : "#eaf1e0"}>
                <AppText weight="bold">
                  {
                    {
                      attendance: tr("Record today’s attendance", "سجّل حضور اليوم"),
                      supervisorReply: tr("New supervisor reply", "رد جديد من المشرف"),
                      returnReminder: tr(
                        "Teams have pending tool returns",
                        "فرق لديها أدوات لم تُرجع",
                      ),
                      managerAway: tr("Manager availability updated", "تم تحديث توفر المسؤول"),
                      notice: tr("Workshop notice", "إعلان الورشة"),
                    }[n.kind]
                  }
                </AppText>
                <AppText>
                  {Object.entries(n.params)
                    .map(([k, v]) => `${label(paramLabels, k)}: ${ltr(String(v))}`)
                    .join(" · ")}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {formatDateTime(n.at)}
                </AppText>
                <View style={kit.wrap}>
                  <Button
                    title={tr("Open notification", "فتح الإشعار")}
                    size="sm"
                    variant="soft"
                    onPress={async () => {
                      if (
                        (await setNotifications(
                          notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
                        )) === false
                      )
                        return false;
                      route(n.to.includes("supervisor") ? "observations" : n.to.replace("/", ""));
                    }}
                  />
                  <Button
                    title={n.read ? tr("Read", "مقروء") : tr("Mark as read", "تعليم كمقروء")}
                    size="sm"
                    disabled={n.read}
                    variant="ghost"
                    onPress={async () =>
                      await setNotifications(
                        notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
                      )
                    }
                  />
                </View>
              </Panel>
            ))}
        </>
      )}
      <FormSheet
        visible={!!sheet}
        title={sheetTitle}
        busy={submitting}
        onClose={() => setSheet(null)}
        footer={sheetFooter}
      >
        <FormError message={saveError} />
        {sheet === "table" && activeTable && (
          <>
            <AppText>
              {activeTable.shape === "rect"
                ? tr("Rectangular table · 1 team maximum", "طاولة مستطيلة · فريق واحد كحد أقصى")
                : tr("Round table · 2 teams maximum", "طاولة دائرية · فريقان كحد أقصى")}{" "}
              · {activeTable.teamIds.length} {tr("assigned", "مخصصة")}
            </AppText>
            {!!tableStorageError && <AppText tone="danger">{tableStorageError}</AppText>}
            {!activeTable.teamIds.length && (
              <AppText tone="muted">{tr("This table is empty.", "هذه الطاولة فارغة.")}</AppText>
            )}
            {activeTable.teamIds.map((id) => (
              <Panel key={id} title={`${id} · ${teamById.get(id)?.project}`}>
                <Button
                  title={tr(`Remove ${id} from table`, `إزالة ${id} من الطاولة`)}
                  size="sm"
                  variant="danger"
                  disabled={!tablesReady}
                  onPress={async () => {
                    if (
                      (await setTables(removeWorkshopTeam(tables, id, activeTable.code))) === false
                    )
                      return false;
                    setAllocationError("");
                  }}
                />
                <AppText>
                  {supervisors.find((s) => s.id === teamById.get(id)?.supervisorId)?.name}
                </AppText>
                {students
                  .filter((s) => s.teamId === id)
                  .map((s) => (
                    <AppText key={s.id}>
                      {s.name} · {s.id}
                    </AppText>
                  ))}
              </Panel>
            ))}
            <Panel title={tr("Add or move a team", "إضافة فريق أو نقله")}>
              <Field
                label={tr("Find team or project", "ابحث عن فريق أو مشروع")}
                value={teamQuery}
                onChangeText={setTeamQuery}
              />
              <Chips
                value={assignTeam}
                onChange={(v) => {
                  setAssignTeam(v);
                  setAllocationError("");
                }}
                options={teams
                  .filter(
                    (t) =>
                      !activeTable.teamIds.includes(t.id) &&
                      `${t.id} ${t.project}`.toLowerCase().includes(teamQuery.toLowerCase()),
                  )
                  .map((t) => ({ id: t.id, label: `${t.id} · ${t.project}` }))}
              />
              {!!assignTeam && (
                <AppText>
                  {teamById.get(assignTeam)?.project} ·{" "}
                  {tableOfTeam(assignTeam)
                    ? `Move from ${tableOfTeam(assignTeam)!.code} to ${activeTable.code}`
                    : `Assign to ${activeTable.code}`}
                </AppText>
              )}
              <Button
                title={tr("Save table assignment", "حفظ تخصيص الطاولة")}
                disabled={!assignTeam || !tablesReady}
                onPress={async () => {
                  try {
                    if (
                      (await setTables(
                        assignWorkshopTeam(tables, assignTeam, activeTable.code),
                      )) === false
                    )
                      return false;
                    setAssignTeam("");
                    setAllocationError("");
                    setFeedback(tr("Table allocation saved.", "تم حفظ تخصيص الطاولة."));
                  } catch (e) {
                    setAllocationError(
                      e instanceof Error
                        ? e.message
                        : tr("Could not update the table.", "تعذر تحديث الطاولة."),
                    );
                  }
                }}
              />
              {!!allocationError && (
                <AppText tone="danger" accessibilityRole="alert">
                  {allocationError}
                </AppText>
              )}
            </Panel>
          </>
        )}
        {sheet === "return" && activeHandover && (
          <>
            {activeHandover.items.map((item) => (
              <AppText key={item}>• {item}</AppText>
            ))}
            <Chips
              value={condition ?? "good"}
              onChange={(v) => setCondition(v as HandoverRecord["condition"])}
              options={["good", "damaged", "missing"].map((id) => ({
                id,
                label: label(conditionLabels, id),
              }))}
            />
            <Field
              label={tr("Return / damage note", "ملاحظة الإرجاع / التلف")}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </>
        )}
        {(sheet === "notice" || sheet === "observation") && (
          <>
            <Chips
              value={audience}
              onChange={setAudience}
              options={[
                ...(sheet === "notice"
                  ? [{ id: "all", label: tr("All students", "جميع الطلاب") }]
                  : []),
                ...teams.map((team) => ({ id: team.id, label: team.id })),
              ]}
            />
            {sheet === "notice" ? (
              <Chips
                value={kind}
                onChange={(v) => setKind(v as Notice["kind"])}
                options={["general", "closed", "schedule", "returnItems", "unavailable"].map(
                  (id) => ({ id, label: label(noticeKindLabels, id) }),
                )}
              />
            ) : (
              <Chips
                value={observationType}
                onChange={(v) => setObservationType(v as Observation["type"])}
                options={observationTypes.map((id) => ({
                  id,
                  label: label(observationTypeLabels, id),
                }))}
              />
            )}
            <Field label={tr("Message", "الرسالة")} value={body} onChangeText={setBody} multiline />
          </>
        )}
        {(sheet === "away" || sheet === "absence") && (
          <>
            {sheet === "away" && (
              <>
                <Field
                  label={tr("From (HH:mm)", "من (HH:mm)")}
                  value={duty.from}
                  onChangeText={async (from) => await setDuty({ ...duty, from })}
                />
                <Field
                  label={tr("Until (HH:mm)", "حتى (HH:mm)")}
                  value={duty.until}
                  onChangeText={async (until) => await setDuty({ ...duty, until })}
                />
              </>
            )}
            <Field
              label={tr("Reason / note", "السبب / ملاحظة")}
              value={duty.reason}
              onChangeText={async (reason) => await setDuty({ ...duty, reason })}
              multiline
            />
          </>
        )}
      </FormSheet>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  stat: { width: "47%", flexGrow: 1, padding: 15, borderRadius: 19 },
  chip: { padding: 9, borderRadius: 12, backgroundColor: "#e7eddc" },
});
