import { useState } from "react";
import { Switch, ScrollView, View, Platform } from "react-native";
import { router, type Href } from "@/native/router";
import Svg, { Rect, Ellipse, G, Text as SvgText } from "react-native-svg";
import { AppText, Button } from "@/components";
import { Chips, Field, Page, Panel, MenuRow, kit, useCopy } from "@/components/MobileKit";
import { calendarDay } from "@/domain/workspace";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { colors } from "@/theme";
import floor from "../../../assets/data/floor.json";
import { MessagesPanel } from "../shared/CommunicationPanels";
import {
  SettingsPanel,
  NotificationsPanel,
  ProfilePanel,
  NoticesPanel,
} from "../shared/AccountPanels";

export function WorkshopScreen({ page }: { page: string }) {
  const t = useCopy();
  const titles: Record<string, string> = {
    dashboard: t("Workshop", "الورشة"),
    attendance: t("Attendance", "الحضور"),
    map: t("Workshop map", "خريطة الورشة"),
    handover: t("Team handovers", "عُهد الفرق"),
    notices: t("Notices", "الإعلانات"),
    observations: t("Supervisor notes", "ملاحظات المشرفين"),
    messages: t("Messages", "الرسائل"),
    notifications: t("Notifications", "الإشعارات"),
    profile: t("Profile", "الملف الشخصي"),
    settings: t("Settings", "الإعدادات"),
    more: t("More", "المزيد"),
  };
  return (
    <Page
      title={titles[page] ?? page}
      back={!["dashboard", "attendance", "map", "handover", "more"].includes(page)}
    >
      {page === "dashboard" ? (
        <WorkshopDashboard />
      ) : page === "attendance" ? (
        <AttendancePanel />
      ) : page === "map" ? (
        <TablesPanel />
      ) : page === "handover" ? (
        <HandoversPanel />
      ) : page === "notices" || page === "observations" ? (
        <NoticeEditor observations={page === "observations"} />
      ) : page === "messages" ? (
        <MessagesPanel />
      ) : page === "notifications" ? (
        <NotificationsPanel />
      ) : page === "profile" ? (
        <ProfilePanel />
      ) : page === "settings" ? (
        <SettingsPanel />
      ) : (
        <Panel>
          {["notices", "observations", "messages", "notifications", "profile", "settings"].map(
            (id) => (
              <MenuRow
                key={id}
                title={titles[id]}
                onPress={() => router.push(`/workshop/more/${id}` as Href)}
              />
            ),
          )}
        </Panel>
      )}
    </Page>
  );
}
function WorkshopDashboard() {
  const { state } = useWorkspace();
  const t = useCopy();
  const records = Object.values(state.attendance[calendarDay()] ?? {});
  return (
    <>
      <Panel tint={colors.primaryWash}>
        <AppText variant="title">{t("A place to build.", "مساحة للإنجاز.")}</AppText>
        <AppText>
          {t(
            "Every team. Every workbench. One shared workshop.",
            "كل فريق، وكل طاولة، في ورشة تجمعهم.",
          )}
        </AppText>
      </Panel>
      <View style={kit.row}>
        <View style={{ flex: 1, minWidth: 125 }}>
          <Panel tint={colors.softBlue}>
            <AppText variant="title">{state.projects.length}/25</AppText>
            <AppText>{t("Teams", "الفرق")}</AppText>
          </Panel>
        </View>
        <View style={{ flex: 1, minWidth: 125 }}>
          <Panel>
            <AppText variant="title">{records.filter(Boolean).length}</AppText>
            <AppText>{t("Present today", "حاضر اليوم")}</AppText>
          </Panel>
        </View>
      </View>
      <Panel title={t("Today in the workshop", "اليوم في الورشة")}>
        <MenuRow
          title={t("Record attendance", "تسجيل الحضور")}
          onPress={() => router.push("/workshop/attendance" as Href)}
        />
        <MenuRow
          title={t("Manage tables", "إدارة الطاولات")}
          onPress={() => router.push("/workshop/map" as Href)}
        />
        <MenuRow
          title={t("Check team tools", "فحص عُهد الفرق")}
          onPress={() => router.push("/workshop/handover" as Href)}
        />
      </Panel>
      <NoticesPanel />
    </>
  );
}
export function AttendancePanel() {
  const { state, act } = useWorkspace();
  const t = useCopy();
  const [date, setDate] = useState(calendarDay());
  const [search, setSearch] = useState("");
  const open = state.days[date] === true;
  return (
    <>
      <Field
        label={t("Work day (YYYY-MM-DD)", "يوم الدوام (YYYY-MM-DD)")}
        value={date}
        onChangeText={setDate}
      />
      <Panel>
        <View style={kit.row}>
          <AppText style={kit.grow}>{t("Actual working day", "يوم دوام فعلي")}</AppText>
          <Switch
            value={open}
            onValueChange={(value) => {
              act({ type: "day.set", date, open: value });
            }}
          />
        </View>
        <AppText variant="caption" tone="muted">
          {t(
            "Closed days are excluded from absence calculations.",
            "الأيام المغلقة لا تدخل في حساب الغياب.",
          )}
        </AppText>
      </Panel>
      <Field
        label={t("Search student or number", "ابحث بالاسم أو الرقم الجامعي")}
        value={search}
        onChangeText={setSearch}
      />
      {state.users
        .filter(
          (u) =>
            u.role === "student" &&
            `${u.name} ${u.universityNumber}`.toLowerCase().includes(search.toLowerCase()),
        )
        .map((u) => {
          const value = state.attendance[date]?.[u.id];
          return (
            <Panel key={u.id}>
              <AppText weight="semibold">{u.name}</AppText>
              <AppText variant="caption" tone="muted">
                {u.universityNumber} ·{" "}
                {value === undefined
                  ? t("Not recorded", "لم يسجل")
                  : value
                    ? t("Present", "حاضر")
                    : t("Absent", "غائب")}
              </AppText>
              <View style={kit.wrap}>
                <Button
                  title={t("Present", "حاضر")}
                  disabled={!open}
                  variant={value === true ? "primary" : "ghost"}
                  onPress={() => act({ type: "attendance.set", userId: u.id, date, present: true })}
                />
                <Button
                  title={t("Absent", "غائب")}
                  disabled={!open}
                  variant={value === false ? "danger" : "ghost"}
                  onPress={() =>
                    act({ type: "attendance.set", userId: u.id, date, present: false })
                  }
                />
              </View>
            </Panel>
          );
        })}
    </>
  );
}
export function TablesPanel({ readonly = false }: { readonly?: boolean }) {
  const { state, act, actorId } = useWorkspace();
  const t = useCopy();
  const [selected, setSelected] = useState("");
  const [team, setTeam] = useState(state.projects[0].id);
  const [zoom, setZoom] = useState(1);
  const width = 600 * zoom;
  return (
    <>
      <AppText tone="muted">
        {t(
          "Tap a table to view its teams. Rectangular tables hold one team; round tables hold two.",
          "اضغط الطاولة لعرض الفرق. المستطيلة لفريق واحد والدائرية لفريقين.",
        )}
      </AppText>
      <View style={kit.wrap}>
        <Button title="−" variant="soft" onPress={() => setZoom((z) => Math.max(0.6, z - 0.2))} />
        <Button title="+" variant="soft" onPress={() => setZoom((z) => Math.min(2, z + 0.2))} />
      </View>
      <ScrollView horizontal>
        <Svg
          width={width}
          height={(width * floor.size.height) / floor.size.width}
          viewBox={`0 0 ${floor.size.width} ${floor.size.height}`}
        >
          <Rect
            x={20}
            y={20}
            width={floor.size.width - 40}
            height={floor.size.height - 40}
            rx={30}
            fill="#f8f6f0"
            stroke="#b5bba9"
            strokeWidth={5}
          />
          {floor.tables.map((tb) => {
            const assigned = state.projects.filter((p) => p.table === tb.code);
            const fill = selected === tb.code ? "#526443" : assigned.length ? "#dfe8d9" : "#deebf8";
            return (
              <G<{ onClick?: () => void }>
                key={tb.code}
                {...(Platform.OS === "web"
                  ? { onClick: () => setSelected(tb.code) }
                  : { onPress: () => setSelected(tb.code) })}
              >
                {tb.shape === "round" ? (
                  <Ellipse
                    cx={tb.cx}
                    cy={tb.cy}
                    rx={tb.w / 2}
                    ry={tb.h / 2}
                    fill={fill}
                    stroke="#839276"
                    strokeWidth={3}
                  />
                ) : (
                  <Rect
                    x={tb.cx - tb.w / 2}
                    y={tb.cy - tb.h / 2}
                    width={tb.w}
                    height={tb.h}
                    rx={8}
                    fill={fill}
                    stroke="#839276"
                    strokeWidth={3}
                  />
                )}
                <SvgText
                  x={tb.cx}
                  y={tb.cy + 8}
                  fontSize={24}
                  textAnchor="middle"
                  fill={selected === tb.code ? "white" : "#26352c"}
                >
                  {tb.code}
                </SvgText>
              </G>
            );
          })}
          <SvgText x={1240} y={475} fontSize={24} fill="#526443">
            Entrance
          </SvgText>
        </Svg>
      </ScrollView>
      {selected && (
        <Panel title={selected}>
          {state.projects
            .filter((p) => p.table === selected)
            .map((p) => (
              <View key={p.id} style={kit.stack}>
                <AppText weight="semibold">{p.title}</AppText>
                <AppText>
                  {p.studentIds.map((id) => state.users.find((u) => u.id === id)?.name).join(" · ")}
                </AppText>
                {!readonly && p.tableVerified === false && (
                  <Button
                    title={t("Verify table move", "تأكيد تغيير الطاولة")}
                    variant="soft"
                    onPress={() => act({ type: "table.verify", projectId: p.id })}
                  />
                )}
                <AppText tone="muted">
                  {p.supervisorIds
                    .map((id) => state.users.find((u) => u.id === id)?.name)
                    .join(" · ")}
                </AppText>
              </View>
            ))}
          {!state.projects.some((p) => p.table === selected) && (
            <AppText>{t("Available", "متاحة")}</AppText>
          )}
          {!readonly && (
            <>
              <Chips
                options={state.projects.map((p) => ({ id: p.id, label: p.title }))}
                value={team}
                onChange={setTeam}
              />
              <Button
                title={t("Assign selected team", "تعيين الفريق المختار")}
                onPress={() => act({ type: "table.assign", projectId: team, table: selected })}
              />
            </>
          )}
          {readonly && state.projects.some((p) => p.studentIds.includes(actorId)) && (
            <Button
              title={t("Move my team here", "نقل فريقي إلى هنا")}
              variant="soft"
              onPress={() => {
                const p = state.projects.find((p) => p.studentIds.includes(actorId))!;
                act({ type: "table.assign", projectId: p.id, table: selected });
              }}
            />
          )}
        </Panel>
      )}
    </>
  );
}
function HandoversPanel() {
  const { state, act } = useWorkspace();
  const t = useCopy();
  const [team, setTeam] = useState(state.projects[0].id);
  const [selected, setSelected] = useState("");
  const [good, setGood] = useState("0");
  const [damaged, setDamaged] = useState("0");
  const [missing, setMissing] = useState("0");
  const [toolName, setToolName] = useState("");
  const [toolQuantity, setToolQuantity] = useState("1");
  return (
    <>
      <Chips
        value={team}
        onChange={(id) => {
          setTeam(id);
          setSelected("");
        }}
        options={state.projects.map((p) => ({ id: p.id, label: p.title }))}
      />
      <Panel title={t("Issue team tools", "تسجيل عُهدة للفريق")}>
        <Field label={t("Tool name", "اسم الأداة")} value={toolName} onChangeText={setToolName} />
        <Field
          label={t("Quantity", "الكمية")}
          value={toolQuantity}
          onChangeText={setToolQuantity}
          keyboardType="number-pad"
        />
        <Button
          title={t("Record handover", "تسجيل التسليم")}
          disabled={!toolName.trim()}
          onPress={() => {
            if (
              act({
                type: "tool.issue",
                projectId: team,
                name: toolName,
                quantity: Number(toolQuantity),
              })
            )
              setToolName("");
          }}
        />
      </Panel>
      {state.tools
        .filter((tool) => tool.projectId === team)
        .map((tool) => (
          <Panel key={tool.id}>
            <AppText variant="heading">{tool.name}</AppText>
            <AppText>
              {t(
                `Issued: ${tool.quantity} · Returned: ${tool.returned} · Damaged: ${tool.damaged} · Missing: ${tool.missing}`,
                `المسلّم: ${tool.quantity} · المسترد: ${tool.returned} · التالف: ${tool.damaged} · المفقود: ${tool.missing}`,
              )}
            </AppText>
            <AppText tone={tool.quantity - tool.returned - tool.damaged ? "danger" : "primary"}>
              {t(
                `Outstanding: ${tool.quantity - tool.returned - tool.damaged}`,
                `المتبقي بعهدة الفريق: ${tool.quantity - tool.returned - tool.damaged}`,
              )}
            </AppText>
            <Button
              title={t("Check return", "فحص الإرجاع")}
              variant="soft"
              onPress={() => {
                setSelected(tool.id);
                setGood(String(tool.returned));
                setDamaged(String(tool.damaged));
                setMissing(String(tool.missing));
              }}
            />
            {selected === tool.id && (
              <>
                <Field
                  label={t("Returned in good condition", "مسترد بحالة جيدة")}
                  keyboardType="number-pad"
                  value={good}
                  onChangeText={setGood}
                />
                <Field
                  label={t("Returned damaged", "مسترد تالف")}
                  keyboardType="number-pad"
                  value={damaged}
                  onChangeText={setDamaged}
                />
                <Field
                  label={t("Missing", "مفقود")}
                  keyboardType="number-pad"
                  value={missing}
                  onChangeText={setMissing}
                />
                <Button
                  title={t("Save inspection", "حفظ الفحص")}
                  onPress={() => {
                    if (
                      act({
                        type: "tool.return",
                        id: tool.id,
                        returned: Number(good),
                        damaged: Number(damaged),
                        missing: Number(missing),
                      })
                    )
                      setSelected("");
                  }}
                />
              </>
            )}
          </Panel>
        ))}
    </>
  );
}
function NoticeEditor({ observations }: { observations: boolean }) {
  const { state, act } = useWorkspace();
  const t = useCopy();
  const [body, setBody] = useState("");
  const [team, setTeam] = useState("all");
  const [supervisors, setSupervisors] = useState(true);
  return (
    <>
      <Panel
        title={
          observations
            ? t("Send an observation to supervisors", "إرسال ملاحظة للمشرفين")
            : t("New workshop notice", "إعلان جديد للورشة")
        }
      >
        <Chips
          value={team}
          onChange={setTeam}
          options={[
            { id: "all", label: t("All teams", "كل الفرق") },
            ...state.projects.map((p) => ({ id: p.id, label: p.title })),
          ]}
        />
        <Field label={t("Message", "النص")} value={body} onChangeText={setBody} multiline />
        {!observations && (
          <View style={kit.row}>
            <AppText style={kit.grow}>{t("Include supervisors", "إشراك المشرفين")}</AppText>
            <Switch value={supervisors} onValueChange={setSupervisors} />
          </View>
        )}
        <Button
          title={t("Publish", "نشر")}
          disabled={!body.trim()}
          onPress={() => {
            if (
              act({
                type: "notice.add",
                body,
                projectId: team === "all" ? undefined : team,
                supervisors,
                kind: observations ? "observation" : "notice",
              })
            )
              setBody("");
          }}
        />
      </Panel>
      <NoticesPanel />
    </>
  );
}
