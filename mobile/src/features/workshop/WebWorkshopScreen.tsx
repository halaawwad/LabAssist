import { recordHandover } from "../../../../shared/web/handover";
import { assignWorkshopTeam, removeWorkshopTeam } from "@/domain/workshopAllocation";
import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, View, StyleSheet } from "react-native";
import Svg, { Rect, Ellipse, Text as SvgText, G } from "react-native-svg";
import { AppText, Button } from "@/components";
import { Chips, Field, Panel, kit } from "@/components/MobileKit";
import { useLocalPreview } from "@/lib/useLocalPreview";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { calendarDay } from "@/domain/workspace";
import { workshopTables, tableStatus, floorSize } from "@/domain/webWorkshop/workshopTables";
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
const noticeText = (n: Notice) =>
  n.message ??
  {
    returnItems: "Please return the issued tools and components to the workshop for checking.",
    general: "Please contact the workshop manager about your project workbench.",
    schedule: "Check the workshop schedule before your next visit.",
    closed: "The workshop is closed today.",
    fullDay: "The workshop manager is absent today.",
    unavailable: `The workshop manager is temporarily away ${n.params?.from ?? ""}–${n.params?.until ?? ""}.`,
  }[n.kind];
const route = (page: string) =>
  router.push(`/native/workshop/${page}` as import("expo-router").Href);
export function WebWorkshopScreen({ page }: { page: string }) {
  const { state, act, error: saveError } = useWorkspace();
  const {
    value: tables,
    setValue: setTables,
    ready: tablesReady,
    error: tableStorageError,
  } = useLocalPreview("labassist.mobile.workshop.table-allocations.v1", workshopTables);
  const [assignTeam, setAssignTeam] = useState(""),
    [teamQuery, setTeamQuery] = useState(""),
    [allocationError, setAllocationError] = useState(""),
    [zoom, setZoom] = useState(1);
  const tableOfTeam = (id: string) => tables.find((t) => t.teamIds.includes(id));
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState("");
  const [handoverForm, setHandoverForm] = useState(false);
  const [handoverTeam, setHandoverTeam] = useState(teams[0]!.id);
  const [handoverItems, setHandoverItems] = useState("");
  const { value: handover, setValue: setHandover, error: handoverError } = useLocalPreview(
    "labassist.mobile.workshop.handover.web",
    handoverSeed,
  );
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
    if ((await setNotices([
      {
        id: `notice-${Date.now()}`,
        kind,
        audience,
        message:
          message ||
          noticeText({
            id: "",
            kind,
            audience,
            sentAt: "",
            params: { from: duty.from, until: duty.until },
          }),
        sentAt: new Date().toISOString(),
      },
      ...notices,
    ])) === false) return false;
    setFeedback("Notice saved in the local preview.");
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
    <View style={kit.wrap}>
      {[
        [present, "Present today"],
        [absent, "Absent today"],
        [
          `${tables.filter((t) => tableStatus(t) !== "free").length}/${tables.length}`,
          "Occupied tables",
        ],
        [handover.length - checked, "Pending handovers"],
      ].map(([n, label], i) => (
        <View
          key={label}
          style={[s.stat, { backgroundColor: ["#e8f0df", "#f3e6e9", "#e6eef7", "#eee7f4"][i] }]}
        >
          <AppText variant="title">{n}</AppText>
          <AppText variant="caption" tone="muted">
            {label}
          </AppText>
        </View>
      ))}
    </View>
  );
  const map = (
    <Panel title="Workshop map">
      <AppText variant="caption">
        {tables.length} tables · Rectangular: one team · Round: two teams
      </AppText>
      <View style={kit.wrap}>
        <Button
          title="Zoom out"
          size="sm"
          variant="soft"
          onPress={() => setZoom(Math.max(0.7, zoom - 0.2))}
        />
        <AppText variant="caption">{Math.round(zoom * 100)}%</AppText>
        <Button
          title="Zoom in"
          size="sm"
          variant="soft"
          onPress={() => setZoom(Math.min(2, zoom + 0.2))}
        />
      </View>
      <ScrollView horizontal>
        <View
          style={{ width: 600 * zoom, height: (600 * zoom * floorSize.height) / floorSize.width }}
        >
          <Svg
            width={600 * zoom}
            height={(600 * zoom * floorSize.height) / floorSize.width}
            viewBox={`0 0 ${floorSize.width} ${floorSize.height}`}
          >
            <Rect
              x={20}
              y={20}
              width={floorSize.width - 40}
              height={floorSize.height - 40}
              rx={30}
              fill="#f8f6f0"
              stroke="#aebaa4"
              strokeWidth={5}
            />
            {matchingTables.map((table) => (
              <G
                key={table.code}
                onPress={() => {
                  setSelected(table.code);
                  setAssignTeam("");
                  setAllocationError("");
                  setSheet("table");
                }}
              >
                {table.shape === "round" ? (
                  <Ellipse
                    cx={table.cx}
                    cy={table.cy}
                    rx={table.w / 2}
                    ry={table.h / 2}
                    fill={selected === table.code ? "#526443" : "#dfe8d9"}
                    stroke="#728a5d"
                    strokeWidth={3}
                  />
                ) : (
                  <Rect
                    x={table.cx - table.w / 2}
                    y={table.cy - table.h / 2}
                    width={table.w}
                    height={table.h}
                    rx={8}
                    fill={
                      selected === table.code
                        ? "#526443"
                        : table.teamIds.length
                          ? "#dfe8d9"
                          : "#deebf8"
                    }
                    stroke="#728a5d"
                    strokeWidth={3}
                  />
                )}
                <SvgText
                  x={table.cx}
                  y={table.cy + 6}
                  textAnchor="middle"
                  fill={selected === table.code ? "#fff" : "#26352c"}
                  fontWeight="bold"
                  fontSize={27}
                >
                  {table.code}
                </SvgText>
              </G>
            ))}
          </Svg>
        </View>
      </ScrollView>
      <View style={kit.wrap}>
        {["assigned", "free", "shared"].map((value) => (
          <AppText variant="caption" key={value}>
            ● {value}
          </AppText>
        ))}
      </View>
    </Panel>
  );
  const availability = (
    <Panel title="Manager availability">
      <AppText weight="bold">
        {duty.status === "onDuty"
          ? "On duty"
          : duty.status === "away"
            ? "Temporarily away"
            : "Absent today"}
      </AppText>
      <AppText>
        Working hours {workingHours.start} – {workingHours.end}
      </AppText>
      {duty.status === "away" && (
        <AppText>
          {duty.from} – {duty.until} · {duty.reason}
        </AppText>
      )}
      <View style={kit.wrap}>
        <Button
          title="Notify temporary absence"
          size="sm"
          variant="soft"
          onPress={() => setSheet("away")}
        />
        <Button
          title="Notify full-day absence"
          size="sm"
          variant="ghost"
          onPress={() => setSheet("absence")}
        />
        {duty.status !== "onDuty" && (
          <Button
            title="Back on duty"
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
  return (
    <ScrollView
      contentContainerStyle={{ padding: 18, gap: 17, paddingBottom: 35 }}
      keyboardShouldPersistTaps="handled"
    >
      <AppText variant="title">
        {(
          {
            dashboard: "Workshop Dashboard",
            map: "Workshop Map",
            notices: "Notices",
            handover: "Team Handovers",
            notifications: "Notifications",
            observations: "Supervisor Notes",
            attendance: "Attendance",
          } as Record<string, string>
        )[page] ?? page}
      </AppText>
      {!!feedback && (
        <AppText accessibilityRole="alert" tone="primary">
          {feedback}
        </AppText>
      )}
      {page === "dashboard" && (
        <>
          <Image
            source={require("../../../assets/web/workshop-header-scene.webp")}
            style={{ width: "100%", height: 110, borderRadius: 22 }}
          />
          {summary}
          <Field label="Search table, team or project" value={query} onChangeText={setQuery} />
          {map}
          <Panel title="Attendance today">
            <AppText>
              {present} present · {absent} absent · Actual working days only
            </AppText>
            <Button title="Record attendance" variant="soft" onPress={() => route("attendance")} />
          </Panel>
          {availability}
          <Panel title="Team handovers">
            <AppText>
              {checked} checked · {handover.length - checked} pending
            </AppText>
            <Button title="Check returned items" variant="soft" onPress={() => route("handover")} />
          </Panel>
          <Panel title="Report to supervisors">
            <View style={kit.wrap}>
              {["repeatedAbsence", "readyMade", "general"].map((v) => (
                <Button
                  title={v.replace(/([A-Z])/g, " $1")}
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
          <Field label="Search table, team or project" value={query} onChangeText={setQuery} />
          <Chips
            value={filter}
            onChange={setFilter}
            options={["all", "assigned", "free", "shared"].map((id) => ({ id, label: id }))}
          />
          {map}
          {matchingTables.map((table) => (
            <Pressable
              accessibilityRole="button"
              key={table.code}
              onPress={() => {
                setSelected(table.code);
                setSheet("table");
              }}
            >
              <Panel title={table.code}>
                <AppText>
                  {table.teamIds.map((id) => teamById.get(id)?.project).join(" · ") || "Free table"}
                </AppText>
                <AppText variant="caption">
                  {table.shape} · Capacity {table.shape === "rect" ? 1 : 2} · {tableStatus(table)}
                </AppText>
              </Panel>
            </Pressable>
          ))}
        </>
      )}
      {page === "attendance" && <AttendancePanel />}
      {page === "handover" && (
        <>
          <Button title="Record handover" onPress={() => setHandoverForm(!handoverForm)} />
          {handoverForm && <Panel title="New handover">
            <Chips value={handoverTeam} onChange={setHandoverTeam} options={teams.map(team => ({ id: team.id, label: team.id }))} />
            <Field label="Item names (one of each, separated by commas)" value={handoverItems} onChangeText={setHandoverItems} />
            <Button title="Save handover" disabled={!handoverItems.trim()} onPress={async () => {
              try {
                const items = handoverItems.split(",").map(item => item.trim()).filter(Boolean);
                const next = recordHandover(handover, handoverTeam, items, calendarDay());
                if (await setHandover(next)) { setHandoverForm(false); setHandoverItems(""); setFeedback("Handover saved on this device."); }
              } catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Could not save handover."); }
            }} />
          </Panel>}
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
                  {tableOfTeam(h.teamId)?.code} · Given {h.dateGiven}
                </AppText>
                <View style={kit.wrap}>
                  {h.items.map((item) => (
                    <View style={s.chip} key={item}>
                      <AppText variant="caption">{item}</AppText>
                    </View>
                  ))}
                </View>
                <AppText tone="primary">
                  {h.checked ? `Return checked · ${h.checkedOn ?? ""}` : "Pending return check"}
                </AppText>
                {h.condition && <AppText>{h.condition}</AppText>}
                {h.note && <AppText variant="caption">{h.note}</AppText>}
                <View style={kit.wrap}>
                  {!h.checked && (
                    <Button
                      title="Remind team"
                      size="sm"
                      variant="ghost"
                      onPress={() => compose("returnItems", h.teamId)}
                    />
                  )}
                  <Button
                    title="Check return"
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
          <Button title="New notice" onPress={() => compose("general")} />
          <Panel title="Quick notices">
            <View style={kit.wrap}>
              <Button
                title="Temporary absence"
                size="sm"
                variant="soft"
                onPress={() => setSheet("away")}
              />
              <Button
                title="Full-day absence"
                size="sm"
                variant="soft"
                onPress={() => setSheet("absence")}
              />
              {["closed", "schedule", "returnItems", "general"].map((kind) => (
                <Button
                  key={kind}
                  title={kind.replace(/([A-Z])/g, " $1")}
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
                {n.kind} ·{" "}
                {n.audience === "all"
                  ? "All students"
                  : `${n.audience} · ${teamById.get(n.audience)?.project}`}
              </AppText>
              <AppText>{noticeText(n)}</AppText>
              <AppText variant="caption" tone="muted">
                {new Date(n.sentAt).toLocaleString()}
              </AppText>
              <View style={kit.wrap}>
                <Button
                  title="Edit notice"
                  size="sm"
                  variant="ghost"
                  onPress={() => {
                    setSelected(n.id);
                    setBody(noticeText(n));
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
            title="Add supervisor note"
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
                {supervisors.find((s) => s.id === o.supervisorId)?.name} · {o.type} · {o.date}
              </AppText>
              <AppText>{o.note}</AppText>
              <AppText tone="primary">{o.status}</AppText>
            </Panel>
          ))}
        </>
      )}
      {page === "notifications" && (
        <>
          <Button
            title="Mark all as read"
            disabled={notifications.every((n) => n.read)}
            variant="soft"
            onPress={async () => await setNotifications(notifications.map((n) => ({ ...n, read: true })))}
          />
          <Chips
            value={filter}
            onChange={setFilter}
            options={[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
            ]}
          />
          {notifications
            .filter((n) => filter !== "unread" || !n.read)
            .map((n) => (
              <Panel key={n.id} tint={n.read ? undefined : "#eaf1e0"}>
                <AppText weight="bold">
                  {
                    {
                      attendance: "Record today’s attendance",
                      supervisorReply: "New supervisor reply",
                      returnReminder: "Teams have pending tool returns",
                      managerAway: "Manager availability updated",
                      notice: "Workshop notice",
                    }[n.kind]
                  }
                </AppText>
                <AppText>
                  {Object.entries(n.params)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {new Date(n.at).toLocaleString()}
                </AppText>
                <View style={kit.wrap}>
                  <Button
                    title="Open notification"
                    size="sm"
                    variant="soft"
                    onPress={async () => {
                      if ((await setNotifications(
                        notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
                      )) === false) return false;
                      route(n.to.includes("supervisor") ? "observations" : n.to.replace("/", ""));
                    }}
                  />
                  <Button
                    title={n.read ? "Read" : "Mark as read"}
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
      <Modal visible={!!sheet} animationType="slide" onRequestClose={() => setSheet(null)}>
        {!!saveError && <AppText accessibilityRole="alert" tone="danger">{saveError}</AppText>}
        <ScrollView
          contentContainerStyle={{ padding: 22, paddingTop: 50, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <Button title="Close" variant="ghost" onPress={() => setSheet(null)} />
          {sheet === "table" && activeTable && (
            <>
              <AppText variant="title">Table {activeTable.code}</AppText>
              <AppText>
                {activeTable.shape === "rect"
                  ? "Rectangular table · 1 team maximum"
                  : "Round table · 2 teams maximum"}{" "}
                · {activeTable.teamIds.length} assigned
              </AppText>
              {!!tableStorageError && <AppText tone="danger">{tableStorageError}</AppText>}
              {!activeTable.teamIds.length && <AppText tone="muted">This table is empty.</AppText>}
              {activeTable.teamIds.map((id) => (
                <Panel key={id} title={`${id} · ${teamById.get(id)?.project}`}>
                  <Button
                    title={`Remove ${id} from table`}
                    size="sm"
                    variant="danger"
                    disabled={!tablesReady}
                    onPress={async () => {
                      if ((await setTables(removeWorkshopTeam(tables, id, activeTable.code))) === false) return false;
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
              <Panel title="Add or move a team">
                <Field label="Find team or project" value={teamQuery} onChangeText={setTeamQuery} />
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
                  title="Save table assignment"
                  disabled={!assignTeam || !tablesReady}
                  onPress={async () => {
                    try {
                      if ((await setTables(assignWorkshopTeam(tables, assignTeam, activeTable.code))) === false) return false;
                      setAssignTeam("");
                      setAllocationError("");
                      setFeedback("Table allocation saved.");
                    } catch (e) {
                      setAllocationError(
                        e instanceof Error ? e.message : "Could not update the table.",
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
              <AppText variant="title">Check return · {activeHandover.teamId}</AppText>
              {activeHandover.items.map((item) => (
                <AppText key={item}>• {item}</AppText>
              ))}
              <Chips
                value={condition ?? "good"}
                onChange={(v) => setCondition(v as HandoverRecord["condition"])}
                options={["good", "damaged", "missing"].map((id) => ({ id, label: id }))}
              />
              <Field label="Return / damage note" value={note} onChangeText={setNote} multiline />
              <Button
                title="Save return check"
                disabled={condition !== "good" && !note.trim()}
                onPress={async () => {
                  if ((await setHandover(
                    handover.map((h) =>
                      h.teamId === selected
                        ? { ...h, checked: true, checkedOn: calendarDay(), condition, note, history: [...(h.history ?? []), { ...h, history: undefined }] }
                        : h,
                    ),
                  )) === false) return false;
                  setSheet(null);
                  setFeedback("Return inspection recorded.");
                }}
              />
            </>
          )}
          {(sheet === "notice" || sheet === "observation") && (
            <>
              <AppText variant="title">
                {sheet === "notice" ? "Compose notice" : "Report to supervisor"}
              </AppText>
              <Chips
                value={audience}
                onChange={setAudience}
                options={[
                  ...(sheet === "notice" ? [{ id: "all", label: "All students" }] : []),
                  ...teams.map((team) => ({ id: team.id, label: team.id })),
                ]}
              />
              {sheet === "notice" ? (
                <Chips
                  value={kind}
                  onChange={(v) => setKind(v as Notice["kind"])}
                  options={["general", "closed", "schedule", "returnItems", "unavailable"].map(
                    (id) => ({ id, label: id }),
                  )}
                />
              ) : (
                <Chips
                  value={observationType}
                  onChange={(v) => setObservationType(v as Observation["type"])}
                  options={observationTypes.map((id) => ({
                    id,
                    label: id.replace(/([A-Z])/g, " $1"),
                  }))}
                />
              )}
              <Field label="Message" value={body} onChangeText={setBody} multiline />
              <Button
                title="Save notice"
                disabled={!body.trim()}
                onPress={async () => {
                  if (sheet === "observation") {
                    if ((await setObservations([
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
                    ])) === false) return false;
                    setSheet(null);
                  } else if (selected && notices.some((n) => n.id === selected)) {
                    if ((await setNotices(
                      notices.map((n) =>
                        n.id === selected ? { ...n, message: body, audience, kind } : n,
                      ),
                    )) === false) return false;
                    setSelected("");
                    setSheet(null);
                  } else if ((await notify(kind, audience, body)) === false) return false;
                }}
              />
            </>
          )}
          {(sheet === "away" || sheet === "absence") && (
            <>
              <AppText variant="title">
                {sheet === "away" ? "Temporary absence" : "Full-day absence"}
              </AppText>
              {sheet === "away" && (
                <>
                  <Field
                    label="From (HH:mm)"
                    value={duty.from}
                    onChangeText={async (from) => await setDuty({ ...duty, from })}
                  />
                  <Field
                    label="Until (HH:mm)"
                    value={duty.until}
                    onChangeText={async (until) => await setDuty({ ...duty, until })}
                  />
                </>
              )}
              <Field
                label="Reason / note"
                value={duty.reason}
                onChangeText={async (reason) => await setDuty({ ...duty, reason })}
                multiline
              />
              <Button
                title="Save availability & notice"
                onPress={async () => {
                  if (
                    sheet === "away" &&
                    (!/^([01]\d|2[0-3]):[0-5]\d$/.test(duty.from) ||
                      !/^([01]\d|2[0-3]):[0-5]\d$/.test(duty.until) ||
                      duty.until <= duty.from)
                  ) {
                    setFeedback("Choose a valid absence time range.");
                    return;
                  }
                  if ((await setDuty({ ...duty, status: sheet === "away" ? "away" : "absent" })) === false) return false;
                  await act({ type: "availability.set", value: "closed" });
                  if ((await notify(sheet === "away" ? "unavailable" : "fullDay")) === false) return false;
                }}
              />
            </>
          )}
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  stat: { width: "47%", flexGrow: 1, padding: 15, borderRadius: 19 },
  chip: { padding: 9, borderRadius: 12, backgroundColor: "#e7eddc" },
});
