import { Disclosure } from "@/components/Disclosure";
import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { useState } from "react";
import { demoSupervisor } from "../../../../../shared/web/domain";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { Image, View, StyleSheet } from "react-native";
import Svg, { Line, Polyline, Circle, Text as SvgText } from "react-native-svg";
import { AppText, Button } from "@/components";
import {
  Chips,
  Field,
  Panel,
  Ring,
  kit,
  SearchField,
  FormSheet,
  useCopy,
} from "@/components/MobileKit";
import { useLanguage } from "@/i18n";
import { router } from "@/native/router";
import { useLocalPreview } from "@/lib/useLocalPreview";
import { supervisedProjects, upcomingReviews } from "@/domain/webSupervisor/projectsMockData";
import { supervisedStudents } from "@/domain/webSupervisor/studentsMockData";
import { progressProjects, projectMilestones } from "@/domain/webSupervisor/progressMockData";
import {
  supervisorTasks,
  tasksMockToday,
  type SupervisorTask,
} from "@/domain/webSupervisor/tasksMockData";

const tones = ["#e9f0e2", "#e5eef7", "#eee7f4", "#f3e8eb"];
const terms: Record<string, string> = {
  All: "الكل",
  "On Track": "في المسار",
  "At Risk": "معرّض للخطر",
  Delayed: "متأخر",
  Completed: "مكتملة",
  Complete: "مكتملة",
  Current: "الحالية",
  Upcoming: "القادمة",
  Pending: "معلقة",
  Urgent: "عاجلة",
  High: "عالية",
  Medium: "متوسطة",
  Low: "منخفضة",
  Present: "حاضر",
  Absent: "غائب",
  present: "الحضور",
  absence: "الغياب",
  "Repeated absence": "غياب متكرر",
  Today: "اليوم",
  Overdue: "متأخرة",
  "Due date": "تاريخ الاستحقاق",
  Priority: "الأولوية",
  proposal: "المقترح",
  circuit: "الدائرة",
  prototype: "النموذج الأولي",
  testing: "الاختبار",
  final: "النهائي",
  design: "التصميم",
  demo: "العرض التوضيحي",
  testingDelay: "تأخر الاختبار",
  missingComponents: "قطع ناقصة",
  reportPending: "تقرير معلق",
  slowProgress: "تقدم بطيء",
};
function Badge({ text }: { text: string }) {
  const tx = useCopy();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
        backgroundColor:
          text.includes("Risk") || text === "Urgent"
            ? "#f2e1e6"
            : text === "Delayed"
              ? "#eee4f1"
              : "#e6eedc",
      }}
    >
      <AppText variant="caption" tone="primary">
        {tx(text, terms[text] ?? text)}
      </AppText>
    </View>
  );
}
export function WebSupervisorPanels({
  page,
}: {
  page: "projects" | "students" | "progress" | "tasks";
}) {
  const { state, actorId } = useWorkspace();
  const tx = useCopy();
  const { ltr, formatLongDate } = useLanguage();
  const term = (value: string) => tx(value, terms[value] ?? value);
  const day = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatLongDate(value) : value;
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [chosen, setChosen] = useState(0),
    [details, setDetails] = useState(false),
    [notice, setNotice] = useState(""),
    [note, setNote] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const {
    value: notes,
    setValue: setNotes,
    error: notesError,
  } = useLocalPreview<Record<string, string>>("labassist.mobile.supervisor.progress.notes", {});
  const { value: tasks, setValue: setTasks } = useLocalPreview(
    "labassist.mobile.supervisor.own-tasks",
    supervisorTasks,
  );
  const [editing, setEditing] = useState<Partial<SupervisorTask> | null>(null),
    [sort, setSort] = useState("Due date");
  const p = supervisedProjects[chosen % supervisedProjects.length],
    progress = progressProjects[chosen % progressProjects.length],
    overall = progress.weeklyProgress.at(-1) ?? 0,
    change = overall - (progress.weeklyProgress.at(-2) ?? 0);
  const filteredStudents = supervisedStudents.filter(
    (u) =>
      `${u.name} ${u.universityId} ${u.project}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All" || u.status === filter || u.attendance === filter),
  );
  const visibleTasks = tasks
    .filter(
      (task) =>
        (filter === "All" ||
          (filter === "Today" && task.dueDate === tasksMockToday) ||
          (filter === "Overdue" && task.dueDate < tasksMockToday && task.status !== "Completed") ||
          task.status === filter ||
          task.priority === filter) &&
        `${task.title} ${task.projectName}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Priority"
        ? ["Urgent", "High", "Medium", "Low"].indexOf(a.priority) -
          ["Urgent", "High", "Medium", "Low"].indexOf(b.priority)
        : a.dueDate.localeCompare(b.dueDate),
    );
  // These legacy preview collections are explicitly assigned to SUP01.
  const actor = state.users.find((user) => user.id === actorId);
  if (
    actor?.role !== "supervisor" ||
    (actor.canonicalId ?? (actor.id === "d1" ? demoSupervisor.id : actor.id)) !== demoSupervisor.id
  )
    return (
      <Panel title={tx("Linked projects", "المشاريع المرتبطة")}>
        <AppText>
          {tx(
            "No linked projects in this local preview.",
            "لا توجد مشاريع مرتبطة في هذه المعاينة المحلية.",
          )}
        </AppText>
      </Panel>
    );
  return (
    <View style={kit.stack}>
      {!!notice && (
        <AppText accessibilityRole="alert" tone="primary">
          {notice}
        </AppText>
      )}
      {page === "projects" && (
        <>
          <AppText tone="muted">
            {tx(
              "Your supervised projects, milestones and upcoming reviews.",
              "مشاريعك المشرف عليها ومراحلها ومراجعاتها القادمة.",
            )}
          </AppText>
          <Panel>
            <Image source={p.image as unknown as number} style={s.heroImage} />
            <Badge text={p.status} />
            <AppText tone="muted">
              {p.code} · {p.team} · {p.students} {tx("students", "طلاب")}
            </AppText>
            <Ring value={p.progress} />
            <View style={kit.wrap}>
              <Badge
                text={`${ltr(`${p.weeklyChange >= 0 ? "+" : ""}${p.weeklyChange}%`)} ${tx("this week", "هذا الأسبوع")}`}
              />
              <Badge text={`${p.openIssues} ${tx("open issues", "مشكلات مفتوحة")}`} />
            </View>
            <AppText weight="bold">{tx("Next milestone", "المرحلة التالية")}</AppText>
            <AppText>{p.nextMilestone}</AppText>
            <AppText variant="caption" tone="muted">
              {day(p.milestoneDate)}
            </AppText>
            <Button
              title={tx("View project details", "عرض تفاصيل المشروع")}
              variant="soft"
              onPress={() => setDetails(true)}
            />
          </Panel>
          <Panel title={tx("Other projects", "مشاريع أخرى")}>
            {supervisedProjects.map(
              (item, i) =>
                i !== chosen && (
                  <Pressable key={item.code} onPress={() => setChosen(i)} style={s.listRow}>
                    <Image source={item.image as unknown as number} style={s.thumb} />
                    <View style={kit.grow}>
                      <AppText weight="bold">{item.name}</AppText>
                      <AppText variant="caption" tone="muted">
                        {item.code} · {item.team}
                      </AppText>
                      <Badge text={item.status} />
                    </View>
                    <AppText weight="bold">{item.progress}%</AppText>
                  </Pressable>
                ),
            )}
          </Panel>
          <Panel title={tx("Project overview", "نظرة عامة على المشاريع")}>
            <View style={kit.wrap}>
              {[
                [supervisedProjects.length, tx("Projects", "المشاريع")],
                [
                  supervisedProjects.filter((p) => p.status === "On Track").length,
                  term("On Track"),
                ],
                [
                  supervisedProjects.reduce((n, p) => n + p.openIssues, 0),
                  tx("Open issues", "المشكلات المفتوحة"),
                ],
              ].map(([n, l]) => (
                <View style={s.stat} key={l}>
                  <AppText variant="heading">{n}</AppText>
                  <AppText variant="caption">{l}</AppText>
                </View>
              ))}
            </View>
          </Panel>
          <Panel title={tx("Upcoming reviews", "المراجعات القادمة")}>
            {upcomingReviews.map((r) => (
              <View key={r.id} style={s.rowBlock}>
                <AppText weight="bold">{r.project}</AppText>
                <AppText variant="caption">
                  {day(r.date)} · {ltr(r.time)} · {r.location}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {r.team} · {term(r.kind)}
                </AppText>
                <Button
                  title={tx("View reports", "عرض التقارير")}
                  size="sm"
                  variant="ghost"
                  onPress={() => router.push("/native/supervisor/reports")}
                />
              </View>
            ))}
          </Panel>
        </>
      )}
      {page === "students" && (
        <>
          <Disclosure title={tx("Overview", "نظرة عامة")}>
            <Panel tint="#eef2e4">
              <AppText variant="heading">
                {tx("A closer look at every student.", "نظرة أقرب على كل طالب.")}
              </AppText>
              <AppText tone="muted">
                {tx(
                  "Follow project progress, attendance, open issues and update requests.",
                  "تابع تقدم المشاريع والحضور والمشكلات المفتوحة وطلبات التحديث.",
                )}
              </AppText>
              <View style={kit.wrap}>
                {[
                  [supervisedStudents.length, tx("Students", "الطلاب")],
                  [
                    supervisedStudents.filter((u) => u.repeatedAbsence).length,
                    term("Repeated absence"),
                  ],
                  [
                    supervisedStudents.filter((u) => u.status === "At Risk").length,
                    term("At Risk"),
                  ],
                ].map(([n, l]) => (
                  <View key={l} style={s.stat}>
                    <AppText variant="heading">{n}</AppText>
                    <AppText variant="caption">{l}</AppText>
                  </View>
                ))}
              </View>
            </Panel>
          </Disclosure>
          <SearchField
            label={tx("Search student, number or project", "ابحث بالطالب أو الرقم أو المشروع")}
            placeholder={tx(
              "Search student, number or project…",
              "ابحث بالطالب أو الرقم أو المشروع…",
            )}
            value={query}
            onChangeText={setQuery}
          />
          <Chips
            value={filter}
            onChange={setFilter}
            options={["All", "On Track", "At Risk", "Delayed", "present", "absence"].map((id) => ({
              id,
              label: term(id),
            }))}
          />
          {filteredStudents.map((u, i) => (
            <Panel key={u.universityId} tint={tones[i % 4]}>
              <View style={s.listRow}>
                <View style={s.avatar}>
                  <AppText weight="bold">{u.initials}</AppText>
                </View>
                <View style={kit.grow}>
                  <AppText variant="heading">{u.name}</AppText>
                  <AppText variant="caption">{u.universityId}</AppText>
                </View>
                <Badge text={u.status} />
              </View>
              <AppText weight="semibold">{u.project}</AppText>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${u.progress}%` }]} />
              </View>
              <AppText>
                {ltr(`${u.progress}%`)} {tx("progress", "تقدم")}
              </AppText>
              <View style={kit.wrap}>
                <Badge text={u.attendance === "present" ? "Present" : "Absent"} />
                {u.repeatedAbsence && <Badge text="Repeated absence" />}
              </View>
              <AppText variant="caption" tone="muted">
                {u.issue === "none" ? tx("No open issues", "لا توجد مشكلات مفتوحة") : term(u.issue)}
              </AppText>
              {u.updateRequests?.map((text) => (
                <AppText key={text} variant="caption">
                  {text}
                </AppText>
              ))}
              <Button
                title={tx("Request an update", "طلب تحديث")}
                variant="soft"
                size="sm"
                onPress={() => {
                  setChosen(i);
                  setDetails(true);
                  setNote("");
                }}
              />
            </Panel>
          ))}
        </>
      )}
      {page === "progress" && (
        <>
          <Chips
            value={String(chosen)}
            onChange={(v) => setChosen(Number(v))}
            options={progressProjects.map((p, i) => ({ id: String(i), label: p.code }))}
          />
          <Panel>
            <Image source={progress.photo as unknown as number} style={s.heroImage} />
            <Badge text={progress.status} />
            <AppText variant="heading">{progress.name}</AppText>
            <AppText variant="caption">
              {progress.code} · {tx("Final deadline", "الموعد النهائي")}{" "}
              {day(progress.finalDeadline)}
            </AppText>
            <Ring value={overall} />
            <AppText tone="primary">
              {ltr(`${change >= 0 ? "+" : ""}${change}%`)} {tx("this week", "هذا الأسبوع")}
            </AppText>
          </Panel>
          <Panel title={tx("Progress overview", "نظرة عامة على التقدم")}>
            <Svg width="100%" height={190} viewBox="0 0 320 190">
              {[0, 25, 50, 75, 100].map((v) => (
                <Line
                  key={v}
                  x1={27}
                  x2={310}
                  y1={160 - v * 1.4}
                  y2={160 - v * 1.4}
                  stroke="#dce4d1"
                />
              ))}
              <Polyline
                points={progress.weeklyProgress
                  .map((v, i) => `${30 + i * 28},${160 - v * 1.4}`)
                  .join(" ")}
                fill="none"
                stroke="#839a69"
                strokeWidth={3}
              />
              {progress.weeklyProgress.map((v, i) => (
                <Circle key={i} cx={30 + i * 28} cy={160 - v * 1.4} r={4} fill="#839a69" />
              ))}
              {progress.weeklyProgress.map((_, i) => (
                <SvgText
                  key={i}
                  x={30 + i * 28}
                  y={183}
                  fontSize={9}
                  textAnchor="middle"
                  fill="#819073"
                >
                  W{i + 1}
                </SvgText>
              ))}
            </Svg>
            <AppText variant="caption">
              {tx("Actual weekly project progress", "التقدم الأسبوعي الفعلي للمشروع")} ·{" "}
              {progress.weeklyProgress.length} {tx("completed weeks", "أسابيع مكتملة")}
            </AppText>
          </Panel>
          <Panel title={tx("Milestone tracker", "متابعة المراحل")}>
            {projectMilestones.map((m, i) => (
              <View style={s.listRow} key={m}>
                <Badge
                  text={
                    i < progress.milestoneStage
                      ? "Complete"
                      : i === progress.milestoneStage
                        ? "Current"
                        : "Upcoming"
                  }
                />
                <AppText>{term(m)}</AppText>
              </View>
            ))}
          </Panel>
          <Panel title={tx("Project students", "طلاب المشروع")}>
            {progress.students.map((u) => (
              <View key={u.universityId} style={s.listRow}>
                <View style={s.avatar}>
                  <AppText>{u.initials}</AppText>
                </View>
                <View>
                  <AppText weight="bold">{u.name}</AppText>
                  <AppText variant="caption" tone="muted">
                    {u.universityId}
                  </AppText>
                </View>
              </View>
            ))}
          </Panel>
          <Panel title={tx("Evidence & updates", "الأدلة والتحديثات")}>
            {progress.evidence.map((e) => (
              <View style={s.rowBlock} key={e.title}>
                <Image source={e.photo as unknown as number} style={s.heroImage} />
                <AppText weight="bold">{e.title}</AppText>
                <AppText variant="caption" tone="muted">
                  {day(e.date)}
                </AppText>
              </View>
            ))}
          </Panel>
          <Panel title={tx("Issues & blockers", "المشكلات والعوائق")}>
            {progress.issues.length ? (
              progress.issues.map((issue) => (
                <View key={issue.title} style={s.rowBlock}>
                  <AppText weight="bold">{issue.title}</AppText>
                  <AppText>{issue.detail}</AppText>
                </View>
              ))
            ) : (
              <AppText>{tx("No open issues.", "لا توجد مشكلات مفتوحة.")}</AppText>
            )}
          </Panel>
          <Panel title={tx("Supervisor note", "ملاحظة المشرف")}>
            {!!notesError && <AppText accessibilityRole="alert">{notesError}</AppText>}
            <Field
              label={tx("Note for this project", "ملاحظة لهذا المشروع")}
              multiline
              value={noteDrafts[progress.code] ?? notes[progress.code] ?? progress.note}
              onChangeText={(value) =>
                setNoteDrafts((drafts) => ({ ...drafts, [progress.code]: value }))
              }
            />
            <Button
              title={tx("Save note", "حفظ الملاحظة")}
              size="sm"
              onPress={async () => {
                if (
                  await setNotes({
                    ...notes,
                    [progress.code]:
                      noteDrafts[progress.code] ?? notes[progress.code] ?? progress.note,
                  })
                )
                  setNotice(
                    tx(
                      "Project note saved on this device.",
                      "تم حفظ ملاحظة المشروع على هذا الجهاز.",
                    ),
                  );
              }}
            />
          </Panel>
        </>
      )}
      {page === "tasks" && (
        <>
          <Disclosure title={tx("Overview", "نظرة عامة")}>
            <Panel tint="#ecf0e4">
              <AppText variant="heading">
                {tx("Small follow-ups. Clearer progress.", "متابعات صغيرة. تقدم أوضح.")}
              </AppText>
              <AppText tone="muted">
                {tx(
                  "Your supervision work, reviews and meetings — separate from student implementation tasks.",
                  "أعمالك الإشرافية ومراجعاتك واجتماعاتك — منفصلة عن مهام تنفيذ الطلاب.",
                )}
              </AppText>
              <View style={kit.wrap}>
                {[
                  [tasks.length, tx("All tasks", "كل المهام")],
                  [tasks.filter((t) => t.status === "Completed").length, term("Completed")],
                  [tasks.filter((t) => t.status === "Pending").length, term("Pending")],
                ].map(([n, l]) => (
                  <View key={l} style={s.stat}>
                    <AppText variant="heading">{n}</AppText>
                    <AppText variant="caption">{l}</AppText>
                  </View>
                ))}
              </View>
            </Panel>
          </Disclosure>
          <Panel title={tx("Quick actions", "إجراءات سريعة")}>
            <View style={kit.wrap}>
              <Button
                title={tx("Create task", "إنشاء مهمة")}
                size="sm"
                onPress={() =>
                  setEditing({
                    priority: "Medium",
                    projectCode: progressProjects[0].code,
                    projectName: progressProjects[0].name,
                    dueDate: tasksMockToday,
                  })
                }
              />
              <Button
                title={tx("View reports", "عرض التقارير")}
                size="sm"
                variant="soft"
                onPress={() => router.push("/native/supervisor/reports")}
              />
              <Button
                title={tx("Schedule meeting", "جدولة اجتماع")}
                size="sm"
                variant="soft"
                onPress={() => router.push("/native/supervisor/meetings")}
              />
              <Button
                title={tx("Send feedback", "إرسال ملاحظات")}
                size="sm"
                variant="ghost"
                onPress={() => {
                  setDetails(true);
                  setNote("");
                }}
              />
            </View>
          </Panel>
          <SearchField
            label={tx("Search tasks", "البحث في المهام")}
            placeholder={tx(
              "Search tasks by title, student or project…",
              "ابحث في المهام بالعنوان أو الطالب أو المشروع…",
            )}
            value={query}
            onChangeText={setQuery}
          />
          <Chips
            value={filter}
            onChange={setFilter}
            options={["All", "Today", "Overdue", "Pending", "Completed", "Urgent", "High"].map(
              (id) => ({ id, label: term(id) }),
            )}
          />
          <Chips
            value={sort}
            onChange={setSort}
            options={["Due date", "Priority"].map((id) => ({ id, label: term(id) }))}
          />
          {visibleTasks.map((task) => (
            <Panel key={task.id}>
              <View style={kit.wrap}>
                <Badge text={task.priority} />
                <Badge text={task.status} />
              </View>
              <AppText variant="heading">{task.title}</AppText>
              <AppText variant="caption" tone="muted">
                {task.projectCode} · {task.projectName}
              </AppText>
              <AppText variant="caption">
                {tx("Due", "الاستحقاق")} {day(task.dueDate)}
              </AppText>
              <View style={kit.wrap}>
                <Button
                  title={
                    task.status === "Completed"
                      ? tx("Mark pending", "تعليم كمعلقة")
                      : tx("Mark complete", "تعليم كمكتملة")
                  }
                  variant="soft"
                  size="sm"
                  onPress={async () =>
                    await setTasks(
                      tasks.map((t) =>
                        t.id === task.id
                          ? { ...t, status: t.status === "Completed" ? "Pending" : "Completed" }
                          : t,
                      ),
                    )
                  }
                />
                <Button
                  title={tx("Edit task", "تعديل المهمة")}
                  variant="ghost"
                  size="sm"
                  onPress={() => setEditing({ ...task })}
                />
              </View>
            </Panel>
          ))}
        </>
      )}
      <FormSheet
        visible={details || !!editing}
        title={
          editing
            ? editing.id
              ? tx("Edit task", "تعديل المهمة")
              : tx("Create task", "إنشاء مهمة")
            : page === "projects"
              ? p.name
              : page === "students"
                ? tx("Request student update", "طلب تحديث من الطالب")
                : tx("Send project feedback", "إرسال ملاحظات على المشروع")
        }
        onClose={() => {
          setDetails(false);
          setEditing(null);
        }}
      >
        {editing ? (
          <>
            <Field
              label={tx("Task title", "عنوان المهمة")}
              value={editing.title ?? ""}
              onChangeText={(title) => setEditing({ ...editing, title })}
            />
            <Chips
              value={editing.projectCode ?? ""}
              onChange={(code) =>
                setEditing({
                  ...editing,
                  projectCode: code,
                  projectName: progressProjects.find((p) => p.code === code)!.name,
                })
              }
              options={progressProjects.map((p) => ({ id: p.code, label: p.name }))}
            />
            <Chips
              value={editing.priority ?? "Medium"}
              onChange={(priority) =>
                setEditing({ ...editing, priority: priority as SupervisorTask["priority"] })
              }
              options={["Urgent", "High", "Medium", "Low"].map((id) => ({ id, label: term(id) }))}
            />
            <Field
              label={tx("Due date (YYYY-MM-DD)", "تاريخ الاستحقاق (YYYY-MM-DD)")}
              value={editing.dueDate ?? ""}
              onChangeText={(dueDate) => setEditing({ ...editing, dueDate })}
            />
            <Button
              title={tx("Save task", "حفظ المهمة")}
              disabled={
                !editing.title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(editing.dueDate ?? "")
              }
              onPress={async () => {
                const task = {
                  ...editing,
                  id: editing.id ?? `task-${Date.now()}`,
                  status: editing.status ?? "Pending",
                } as SupervisorTask;
                if (
                  (await setTasks(
                    editing.id ? tasks.map((t) => (t.id === task.id ? task : t)) : [...tasks, task],
                  )) === false
                )
                  return false;
                setEditing(null);
              }}
            />
          </>
        ) : page === "projects" ? (
          <>
            <Image source={p.image as unknown as number} style={s.heroImage} />
            <AppText variant="heading">{p.name}</AppText>
            <Badge text={p.status} />
            <AppText>
              {ltr(p.code)} · {p.team} · {p.students} {tx("students", "طلاب")}
            </AppText>
            <Ring value={p.progress} />
            <AppText>
              {tx("Next milestone:", "المرحلة القادمة:")} {p.nextMilestone}
            </AppText>
            <AppText>
              {tx("Due:", "الاستحقاق:")} {day(p.milestoneDate)}
            </AppText>
            <AppText>
              {tx("Open issues:", "المشكلات المفتوحة:")} {p.openIssues}
            </AppText>
            <Button
              title={tx("Review final reports", "مراجعة التقارير النهائية")}
              onPress={() => {
                setDetails(false);
                router.push("/native/supervisor/finalReports");
              }}
            />
          </>
        ) : (
          <>
            <Field label={tx("Message", "الرسالة")} value={note} onChangeText={setNote} multiline />
            <Button
              title={tx("Save feedback", "حفظ الملاحظات")}
              disabled={!note.trim()}
              onPress={async () => {
                if (
                  (await setNotes({
                    ...notes,
                    [page === "students" ? supervisedStudents[chosen].universityId : progress.code]:
                      note,
                  })) === false
                )
                  return false;
                setDetails(false);
                setNotice(
                  tx(
                    "Feedback saved in this local preview.",
                    "تم حفظ الملاحظات في المعاينة المحلية.",
                  ),
                );
              }}
            />
          </>
        )}
      </FormSheet>
    </View>
  );
}
const s = StyleSheet.create({
  heroImage: { width: "100%", height: 112, borderRadius: 16, resizeMode: "cover" },
  thumb: { width: 62, height: 62, borderRadius: 14, resizeMode: "cover" },
  listRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e5d8",
  },
  stat: { backgroundColor: "#ffffffb9", padding: 14, borderRadius: 16, minWidth: 85, flexGrow: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#dce6d0",
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: { height: 7, backgroundColor: "#dfe7d7", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 7, backgroundColor: "#81996a", borderRadius: 4 },
  rowBlock: { gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e2e6db" },
});
