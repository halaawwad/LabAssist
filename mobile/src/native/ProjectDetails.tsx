import { MobileInput as TextInput } from "@/components/MobileInput";
import { Disclosure } from "@/components/Disclosure";
import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { ReportsPanel } from "@/features/shared/ReportsPanel";
import { router } from "./router";
import { useState } from "react";
import { View } from "react-native";
import { useLanguage } from "@/i18n";
import { AppText, Button } from "@/components";
import { Panel, Ring, SegmentedControl, kit, useCopy } from "@/components/MobileKit";
import { ProjectPhoto } from "@/components/ProjectPhoto";
import { project, projectBom, useProjectWorkspace } from "./StudentReference";

export function ReferenceProject({ initial = "Overview" }: { initial?: string }) {
  const copy = useCopy();
  const { formatLongDate, ltr } = useLanguage();
  const money = (value: number) => ltr(`$${value}`);
  const statusLabel = (status: string) =>
    status === "In Progress" ? copy("In Progress", "قيد التنفيذ") : status;
  const workspace = useProjectWorkspace();
  const [tab, setTab] = useState(initial),
    [edit, setEdit] = useState(false),
    [issue, setIssue] = useState("");
  const [titleDraft, setTitleDraft] = useState(workspace.details.title);
  const [abstractDraft, setAbstractDraft] = useState(workspace.abstract);
  return (
    <View style={kit.stack}>
      {!!workspace.error && (
        <Panel>
          <AppText accessibilityRole="alert">{workspace.error}</AppText>
          <Button title={copy("Retry loading", "إعادة التحميل")} onPress={workspace.retryLoading} />
        </Panel>
      )}
      <Panel>
        <AppText tone="primary">{statusLabel(project.status)}</AppText>
        <AppText variant="title">{workspace.details.title}</AppText>
        <AppText tone="muted">{project.subtitle}</AppText>
        <AppText variant="caption">
          {Number.isNaN(Date.parse(project.deadline))
            ? project.deadline
            : formatLongDate(new Date(project.deadline))}{" "}
          · 3 {copy("teammates", "زملاء")}
        </AppText>
        <AppText weight="bold">
          {ltr(`${workspace.progress}%`)} {copy("overall progress", "التقدم الكلي")}
        </AppText>
        <AppText variant="caption" tone="muted">
          {workspace.completedCount} {copy("of", "من")} {workspace.taskCount}{" "}
          {copy("tasks complete", "مهام مكتملة")}
        </AppText>
        <View style={{ height: 5, backgroundColor: "#e0e8d7", borderRadius: 4 }}>
          <View
            style={{
              height: 5,
              width: `${workspace.progress}%`,
              backgroundColor: "#8ba56d",
              borderRadius: 4,
            }}
          />
        </View>
        <View style={kit.row}>
          <Button
            title={copy("Weekly report", "التقرير الأسبوعي")}
            size="sm"
            onPress={() => setTab("Reports")}
          />
          <Button
            title={copy("Add issue", "إضافة مشكلة")}
            size="sm"
            variant="soft"
            onPress={() => {
              setTab("Overview");
              setEdit(true);
            }}
          />
        </View>
        <Disclosure title={copy("Project photo", "صورة المشروع")}>
          <ProjectPhoto projectId="reference-smart-car" />
        </Disclosure>
      </Panel>
      {/* Every project section stays visible (2 × 2 on narrow phones) instead of a clipped scroller. */}
      <SegmentedControl
        accessibilityLabel={copy("Project sections", "أقسام المشروع")}
        value={tab}
        onChange={setTab}
        minOptionWidth={110}
        options={[
          { id: "Overview", label: copy("Overview", "نظرة عامة") },
          { id: "Team & Tasks", label: copy("Team & Tasks", "الفريق والمهام") },
          { id: "Components", label: copy("Components", "المكونات") },
          { id: "Reports", label: copy("Reports", "التقارير") },
        ]}
      />
      {tab === "Overview" && (
        <>
          <Panel title={copy("Project abstract", "ملخص المشروع")}>
            <AppText>{workspace.abstract}</AppText>
            <Button
              title={
                edit ? copy("Close editor", "إغلاق المحرر") : copy("Edit abstract", "تعديل الملخص")
              }
              variant="ghost"
              onPress={() => {
                if (!edit) {
                  setTitleDraft(workspace.details.title);
                  setAbstractDraft(workspace.abstract);
                }
                setEdit(!edit);
              }}
            />
            {edit && (
              <View style={kit.stack}>
                <TextInput
                  accessibilityLabel={copy("Project title", "عنوان المشروع")}
                  value={titleDraft}
                  onChangeText={setTitleDraft}
                />
                <TextInput
                  accessibilityLabel={copy("Project abstract", "ملخص المشروع")}
                  multiline
                  value={abstractDraft}
                  onChangeText={setAbstractDraft}
                  style={{
                    minHeight: 150,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: "#cad6bf",
                    borderRadius: 14,
                    fontSize: 15,
                  }}
                />
                <Button
                  title={copy("Save project details", "حفظ تفاصيل المشروع")}
                  disabled={workspace.saving || !titleDraft.trim() || !abstractDraft.trim()}
                  onPress={async () => {
                    if (await workspace.saveDetails(titleDraft, abstractDraft)) setEdit(false);
                  }}
                />
              </View>
            )}
          </Panel>
          <Panel title={copy("Current milestone", "المرحلة الحالية")}>
            <AppText variant="heading">{copy("Prototype testing", "اختبار النموذج")}</AppText>
            <AppText tone="muted">
              {copy("Milestone", "المرحلة")} {project.milestone} {copy("of", "من")} {project.milestoneCount}
            </AppText>
          </Panel>
          <Panel title={copy("Open issues", "المشكلات المفتوحة")}>
            {workspace.openIssues.map((x) => (
              <AppText key={x.id}>{x.title}</AppText>
            ))}
            <TextInput
              accessibilityLabel={copy("Issue description", "وصف المشكلة")}
              placeholder={copy("Describe the issue", "صف المشكلة")}
              value={issue}
              onChangeText={setIssue}
              style={{
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#cad6bf",
                fontSize: 16,
              }}
            />
            <Button
              title={copy("Add issue", "إضافة مشكلة")}
              disabled={!issue.trim()}
              onPress={async () => {
                if (await workspace.addIssue(issue.trim())) setIssue("");
              }}
            />
          </Panel>
          <Panel title={copy("Budget health", "حالة الميزانية")}>
            <AppText variant="title">{money(project.budget - project.spent)}</AppText>
            <AppText>{copy("still available", "ما زال متاحًا")}</AppText>
            <Ring value={Math.round((project.spent / project.budget) * 100)} />
            <AppText>
              {copy("Spent", "المصروف")} {money(project.spent)} · {copy("Remaining", "المتبقي")}{" "}
              {money(project.budget - project.spent)}
            </AppText>
            <AppText variant="caption" tone="muted">
              {copy("Total project budget:", "إجمالي ميزانية المشروع:")} {money(project.budget)}.{" "}
              {copy("Recorded expenses across the project.", "المصروفات المسجلة في المشروع.")}
            </AppText>
          </Panel>
        </>
      )}
      {tab === "Team & Tasks" && (
        <Button
          title={copy("Add task", "إضافة مهمة")}
          variant="soft"
          onPress={() => router.push("/native/student/tasks")}
        />
      )}
      {tab === "Team & Tasks" &&
        workspace.members.map((member, index) => (
          <Panel key={member.name} title={member.name}>
            <AppText variant="caption" tone="muted">
              {copy("Computer Engineering", "هندسة الحاسوب")}
            </AppText>
            <Ring
              value={Math.round(
                (workspace.teamTasks.filter(
                  (task) => task.owner === index && workspace.completed.includes(task.id),
                ).length /
                  Math.max(1, workspace.teamTasks.filter((task) => task.owner === index).length)) *
                  100,
              )}
              color={["#839b68", "#709ab8", "#bc9368"][index]}
            />
            <AppText weight="semibold">{copy("Personal progress", "التقدم الشخصي")}</AppText>
            <AppText variant="caption">
              {
                workspace.teamTasks.filter(
                  (task) => task.owner === index && workspace.completed.includes(task.id),
                ).length
              }{" "}
              {copy("of", "من")} {workspace.teamTasks.filter((task) => task.owner === index).length}{" "}
              {copy("tasks complete", "مهام مكتملة")}
            </AppText>
            <AppText weight="semibold">{copy("Today’s Tasks", "مهام اليوم")}</AppText>
            {workspace.teamTasks
              .filter((x) => x.owner === index)
              .map((task) => {
                const done = workspace.completed.includes(task.id);
                return (
                  <Pressable
                    key={task.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: done,
                      disabled: member.id !== workspace.actorId,
                    }}
                    disabled={member.id !== workspace.actorId}
                    onPress={async () => {
                      if (!(await workspace.toggleTask(task.id))) return;
                      workspace.logTeamActivity(
                        index,
                        `${done ? "Reopened" : "Completed"} “${task.title}”`,
                      );
                    }}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderColor: "#e5e9df",
                      gap: 5,
                    }}
                  >
                    <AppText>
                      {done ? "✓" : "○"} {task.title}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {task.description}
                    </AppText>
                    <AppText variant="caption">
                      {task.due} ·{" "}
                      {done
                        ? copy("Completed", "مكتملة")
                        : task.inProgress
                          ? copy("In progress", "قيد التنفيذ")
                          : copy("Remaining", "متبقية")}
                    </AppText>
                  </Pressable>
                );
              })}
            <AppText variant="caption" tone="muted">
              {copy("Last activity:", "آخر نشاط:")}{" "}
              {workspace.teamActivity.find((x) => x.owner === index)?.text ??
                copy("No recent activity", "لا يوجد نشاط حديث")}
            </AppText>
          </Panel>
        ))}
      {tab === "Components" && (
        <>
          <Panel title={copy("Build readiness", "جاهزية البناء")}>
            <Ring value={40} />
            <AppText weight="semibold">{copy("2 / 5 units available", "2 / 5 قطع متوفرة")}</AppText>
            <AppText tone="muted">
              {copy(
                "3 units still needed for the listed build.",
                "ما زالت 3 قطع مطلوبة للبناء المدرج.",
              )}
            </AppText>
          </Panel>
          <Panel title={copy("Bill of Materials", "قائمة المواد")}>
            {projectBom.map((part) => (
              <View
                key={part.name}
                style={{
                  gap: 5,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderColor: "#e5e9df",
                }}
              >
                <AppText weight="semibold">{part.name}</AppText>
                <AppText variant="caption">
                  {copy("Quantity", "الكمية")} {part.quantity} · {money(part.cost)} ·{" "}
                  {part.available
                    ? copy("Available", "متوفرة")
                    : copy("Still needed", "ما زالت مطلوبة")}
                </AppText>
              </View>
            ))}
          </Panel>
          <Panel title={copy("Budget health", "حالة الميزانية")}>
            <AppText>
              {copy("Spent", "المصروف")} {money(project.spent)}
            </AppText>
            <AppText>
              {copy("Remaining", "المتبقي")} {money(project.budget - project.spent)}
            </AppText>
            <AppText>
              {copy("Total project budget:", "إجمالي ميزانية المشروع:")} {money(project.budget)}
            </AppText>
          </Panel>
        </>
      )}
      {tab === "Reports" && <ReportsPanel />}
    </View>
  );
}
