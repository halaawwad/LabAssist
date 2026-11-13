import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, View, StyleSheet } from "react-native";
import Svg, { Line, Polyline, Circle, Text as SvgText } from "react-native-svg";
import { AppText, Button } from "@/components";
import { Chips, Field, Panel, Ring, kit } from "@/components/MobileKit";
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
function Badge({ text }: { text: string }) {
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
        {text}
      </AppText>
    </View>
  );
}
export function WebSupervisorPanels({
  page,
}: {
  page: "projects" | "students" | "progress" | "tasks";
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [chosen, setChosen] = useState(0),
    [details, setDetails] = useState(false),
    [notice, setNotice] = useState(""),
    [note, setNote] = useState("");
  const { value: notes, setValue: setNotes } = useLocalPreview<Record<string, string>>(
    "labassist.mobile.supervisor.progress.notes",
    {},
  );
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
  return (
    <View style={kit.stack}>
      <AppText variant="title">
        {page === "projects"
          ? "My Projects"
          : page === "students"
            ? "Students"
            : page === "progress"
              ? "Project Progress"
              : "Tasks & follow-up"}
      </AppText>
      {!!notice && (
        <AppText accessibilityRole="alert" tone="primary">
          {notice}
        </AppText>
      )}
      {page === "projects" && (
        <>
          <AppText tone="muted">Your supervised projects, milestones and upcoming reviews.</AppText>
          <Panel>
            <Image source={p.image as unknown as number} style={s.heroImage} />
            <Badge text={p.status} />
            <AppText variant="title">{p.name}</AppText>
            <AppText tone="muted">
              {p.code} · {p.team} · {p.students} students
            </AppText>
            <Ring value={p.progress} />
            <View style={kit.wrap}>
              <Badge text={`${p.weeklyChange >= 0 ? "+" : ""}${p.weeklyChange}% this week`} />
              <Badge text={`${p.openIssues} open issues`} />
            </View>
            <AppText weight="bold">Next milestone</AppText>
            <AppText>{p.nextMilestone}</AppText>
            <AppText variant="caption" tone="muted">
              {p.milestoneDate}
            </AppText>
            <Button title="View project details" variant="soft" onPress={() => setDetails(true)} />
          </Panel>
          <Panel title="Other projects">
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
          <Panel title="Project overview">
            <View style={kit.wrap}>
              {[
                [supervisedProjects.length, "Projects"],
                [supervisedProjects.filter((p) => p.status === "On Track").length, "On Track"],
                [supervisedProjects.reduce((n, p) => n + p.openIssues, 0), "Open issues"],
              ].map(([n, l]) => (
                <View style={s.stat} key={l}>
                  <AppText variant="title">{n}</AppText>
                  <AppText variant="caption">{l}</AppText>
                </View>
              ))}
            </View>
          </Panel>
          <Panel title="Upcoming reviews">
            {upcomingReviews.map((r) => (
              <View key={r.id} style={s.rowBlock}>
                <AppText weight="bold">{r.project}</AppText>
                <AppText variant="caption">
                  {r.date} · {r.time} · {r.location}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {r.team} · {r.kind}
                </AppText>
                <Button
                  title="View reports"
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
          <Panel tint="#eef2e4">
            <AppText variant="title">A closer look at every student.</AppText>
            <AppText tone="muted">
              Follow project progress, attendance, open issues and update requests.
            </AppText>
            <View style={kit.wrap}>
              {[
                [supervisedStudents.length, "Students"],
                [supervisedStudents.filter((u) => u.repeatedAbsence).length, "Repeated absence"],
                [supervisedStudents.filter((u) => u.status === "At Risk").length, "At risk"],
              ].map(([n, l]) => (
                <View key={l} style={s.stat}>
                  <AppText variant="title">{n}</AppText>
                  <AppText variant="caption">{l}</AppText>
                </View>
              ))}
            </View>
          </Panel>
          <Field label="Search student, number or project" value={query} onChangeText={setQuery} />
          <Chips
            value={filter}
            onChange={setFilter}
            options={["All", "On Track", "At Risk", "Delayed", "present", "absence"].map((id) => ({
              id,
              label: id,
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
              <AppText>{u.progress}% progress</AppText>
              <View style={kit.wrap}>
                <Badge text={u.attendance === "present" ? "Present" : "Absent"} />
                {u.repeatedAbsence && <Badge text="Repeated absence" />}
              </View>
              <AppText variant="caption" tone="muted">
                {u.issue === "none" ? "No open issues" : u.issue.replace(/([A-Z])/g, " $1")}
              </AppText>
              {u.updateRequests?.map((text) => (
                <AppText key={text} variant="caption">
                  {text}
                </AppText>
              ))}
              <Button
                title="Request an update"
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
            <AppText variant="title">{progress.name}</AppText>
            <AppText variant="caption">
              {progress.code} · Final deadline {progress.finalDeadline}
            </AppText>
            <Ring value={overall} />
            <AppText tone="primary">
              {change >= 0 ? "+" : ""}
              {change}% this week
            </AppText>
          </Panel>
          <Panel title="Progress overview">
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
              Actual weekly project progress · {progress.weeklyProgress.length} completed weeks
            </AppText>
          </Panel>
          <Panel title="Milestone tracker">
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
                <AppText>{m}</AppText>
              </View>
            ))}
          </Panel>
          <Panel title="Project students">
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
          <Panel title="Evidence & updates">
            {progress.evidence.map((e) => (
              <View style={s.rowBlock} key={e.title}>
                <Image source={e.photo as unknown as number} style={s.heroImage} />
                <AppText weight="bold">{e.title}</AppText>
                <AppText variant="caption" tone="muted">
                  {e.date}
                </AppText>
              </View>
            ))}
          </Panel>
          <Panel title="Issues & blockers">
            {progress.issues.length ? (
              progress.issues.map((issue) => (
                <View key={issue.title} style={s.rowBlock}>
                  <AppText weight="bold">{issue.title}</AppText>
                  <AppText>{issue.detail}</AppText>
                </View>
              ))
            ) : (
              <AppText>No open issues.</AppText>
            )}
          </Panel>
          <Panel title="Supervisor note">
            <Field
              label="Note for this project"
              multiline
              value={notes[progress.code] ?? progress.note}
              onChangeText={(value) => setNotes({ ...notes, [progress.code]: value })}
            />
            <Button
              title="Save note"
              size="sm"
              onPress={() => setNotice("Project note saved on this device.")}
            />
          </Panel>
        </>
      )}
      {page === "tasks" && (
        <>
          <Panel tint="#ecf0e4">
            <AppText variant="heading">Small follow-ups. Clearer progress.</AppText>
            <AppText tone="muted">
              Your supervision work, reviews and meetings — separate from student implementation
              tasks.
            </AppText>
            <View style={kit.wrap}>
              {[
                [tasks.length, "All tasks"],
                [tasks.filter((t) => t.status === "Completed").length, "Completed"],
                [tasks.filter((t) => t.status === "Pending").length, "Pending"],
              ].map(([n, l]) => (
                <View key={l} style={s.stat}>
                  <AppText variant="title">{n}</AppText>
                  <AppText variant="caption">{l}</AppText>
                </View>
              ))}
            </View>
          </Panel>
          <Panel title="Quick actions">
            <View style={kit.wrap}>
              <Button
                title="Create task"
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
                title="View reports"
                size="sm"
                variant="soft"
                onPress={() => router.push("/native/supervisor/reports")}
              />
              <Button
                title="Schedule meeting"
                size="sm"
                variant="soft"
                onPress={() => router.push("/native/supervisor/meetings")}
              />
              <Button
                title="Send feedback"
                size="sm"
                variant="ghost"
                onPress={() => {
                  setDetails(true);
                  setNote("");
                }}
              />
            </View>
          </Panel>
          <Field label="Search tasks" value={query} onChangeText={setQuery} />
          <Chips
            value={filter}
            onChange={setFilter}
            options={["All", "Today", "Overdue", "Pending", "Completed", "Urgent", "High"].map(
              (id) => ({ id, label: id }),
            )}
          />
          <Chips
            value={sort}
            onChange={setSort}
            options={["Due date", "Priority"].map((id) => ({ id, label: id }))}
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
              <AppText variant="caption">Due {task.dueDate}</AppText>
              <View style={kit.wrap}>
                <Button
                  title={task.status === "Completed" ? "Mark pending" : "Mark complete"}
                  variant="soft"
                  size="sm"
                  onPress={() =>
                    setTasks(
                      tasks.map((t) =>
                        t.id === task.id
                          ? { ...t, status: t.status === "Completed" ? "Pending" : "Completed" }
                          : t,
                      ),
                    )
                  }
                />
                <Button
                  title="Edit task"
                  variant="ghost"
                  size="sm"
                  onPress={() => setEditing({ ...task })}
                />
              </View>
            </Panel>
          ))}
        </>
      )}
      <Modal
        visible={details || !!editing}
        animationType="slide"
        onRequestClose={() => {
          setDetails(false);
          setEditing(null);
        }}
      >
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 50, gap: 15 }}>
          <Button
            title="Close details"
            variant="ghost"
            onPress={() => {
              setDetails(false);
              setEditing(null);
            }}
          />
          {editing ? (
            <>
              <AppText variant="title">{editing.id ? "Edit task" : "Create task"}</AppText>
              <Field
                label="Task title"
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
                options={["Urgent", "High", "Medium", "Low"].map((id) => ({ id, label: id }))}
              />
              <Field
                label="Due date (YYYY-MM-DD)"
                value={editing.dueDate ?? ""}
                onChangeText={(dueDate) => setEditing({ ...editing, dueDate })}
              />
              <Button
                title="Save task"
                disabled={
                  !editing.title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(editing.dueDate ?? "")
                }
                onPress={() => {
                  const task = {
                    ...editing,
                    id: editing.id ?? `task-${Date.now()}`,
                    status: editing.status ?? "Pending",
                  } as SupervisorTask;
                  setTasks(
                    editing.id ? tasks.map((t) => (t.id === task.id ? task : t)) : [...tasks, task],
                  );
                  setEditing(null);
                }}
              />
            </>
          ) : page === "projects" ? (
            <>
              <Image source={p.image as unknown as number} style={s.heroImage} />
              <AppText variant="title">{p.name}</AppText>
              <Badge text={p.status} />
              <AppText>
                {p.code} · {p.team} · {p.students} students
              </AppText>
              <Ring value={p.progress} />
              <AppText>Next milestone: {p.nextMilestone}</AppText>
              <AppText>Due: {p.milestoneDate}</AppText>
              <AppText>Open issues: {p.openIssues}</AppText>
              <Button
                title="Review final reports"
                onPress={() => {
                  setDetails(false);
                  router.push("/native/supervisor/finalReports");
                }}
              />
            </>
          ) : (
            <>
              <AppText variant="title">
                {page === "students" ? "Request student update" : "Send project feedback"}
              </AppText>
              <Field label="Message" value={note} onChangeText={setNote} multiline />
              <Button
                title="Save feedback"
                disabled={!note.trim()}
                onPress={() => {
                  setNotes({
                    ...notes,
                    [page === "students" ? supervisedStudents[chosen].universityId : progress.code]:
                      note,
                  });
                  setDetails(false);
                  setNotice("Feedback saved in this local preview.");
                }}
              />
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  heroImage: { width: "100%", height: 180, borderRadius: 19, resizeMode: "cover" },
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
