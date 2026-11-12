import { router, type Href } from "@/native/router";
import { View } from "react-native";
import { AppText, Button } from "@/components";
import { Field, MenuRow, Panel, Portrait, Ring, kit, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { projectFor, projectProgress } from "@/domain/workspace";
import { colors } from "@/theme";
import { useState } from "react";
import { ProjectPhoto } from "@/components/ProjectPhoto";

export function DashboardDetails({
  section,
}: {
  section: "metrics" | "project" | "upcoming" | "activity" | "actions";
}) {
  const { state, actorId } = useWorkspace();
  const t = useCopy();
  const p = projectFor(state, actorId);
  if (!p) return null;
  const open = (id: string) => router.push(`/student/more/${id}` as Href);
  const tasks = state.tasks.filter((x) => x.projectId === p.id);
  const spent = state.expenses
    .filter((x) => x.projectId === p.id)
    .reduce((n, x) => n + x.amount, 0);
  if (section === "metrics")
    return (
      <View style={kit.wrap}>
        {[
          [
            t("Current milestone", "المرحلة الحالية"),
            t("Prototype testing", "اختبار النموذج"),
            "project",
          ],
          [
            t("Working together", "نعمل معًا"),
            `${p.studentIds.length} ${t("equal teammates", "أعضاء متساوين")}`,
            "team",
          ],
          [
            t("Open issues", "المشاكل المفتوحة"),
            String(state.issues.filter((x) => x.projectId === p.id && !x.resolved).length),
            "issues",
          ],
          [
            t("Budget remaining", "الميزانية المتبقية"),
            `₪${(p.budget - spent).toFixed(2)}`,
            "budget",
          ],
        ].map(([label, value, target], i) => (
          <View key={label} style={{ width: "48%", flexGrow: 1 }}>
            <Panel
              tint={[colors.primaryWash, colors.softBlue, colors.softAmber, colors.surfaceWarm][i]}
            >
              <AppText variant="caption">{label}</AppText>
              <AppText weight="bold">{value}</AppText>
              <Button
                title={t("View", "عرض")}
                variant="ghost"
                size="sm"
                onPress={() =>
                  target === "project" ? router.push("/student/project") : open(target)
                }
              />
            </Panel>
          </View>
        ))}
      </View>
    );
  if (section === "project")
    return (
      <Panel title={p.title}>
        <AppText tone="muted">{p.description}</AppText>
        <AppText tone="primary">{t("In progress", "قيد التنفيذ")}</AppText>
        <View style={kit.row}>
          {p.studentIds.map((id) => (
            <Portrait key={id} userId={id} size={38} />
          ))}
          <AppText variant="caption">{t("Built together", "نبنيه معًا")}</AppText>
        </View>
        <Ring value={projectProgress(state, p.id)} />
        <AppText>
          {tasks.filter((x) => x.done).length} / {tasks.length} {t("tasks complete", "مهام مكتملة")}
        </AppText>
        <Button
          title={t("Open My Project", "فتح مشروعي")}
          onPress={() => router.push("/student/project")}
        />
        <ProjectPhoto key={p.id} projectId={p.id} />
      </Panel>
    );
  if (section === "upcoming")
    return (
      <>
        <Panel title={t("Coming up", "القادم")}>
          {tasks
            .filter((x) => !x.done)
            .slice(0, 3)
            .map((x) => (
              <MenuRow
                key={x.id}
                title={x.title}
                subtitle={`${x.dueDate ?? t("No date set", "لم يحدد موعد")} · ${state.users.find((u) => u.id === x.ownerId)?.name}`}
                onPress={() => router.push("/student/tasks")}
              />
            ))}
          {state.meetings
            .filter(
              (x) => !x.cancelled && (x.creatorId === actorId || x.inviteeIds.includes(actorId)),
            )
            .slice(0, 2)
            .map((x) => (
              <MenuRow
                key={x.id}
                title={x.title}
                subtitle={`${x.date} · ${x.time}`}
                onPress={() => open("meetings")}
              />
            ))}
        </Panel>
        <Panel
          tint={colors.softBlue}
          title={t("Your week, ready to share?", "أسبوعك جاهز للتسليم؟")}
        >
          <AppText>
            {t(
              "Capture your progress, completed work and blockers.",
              "وثّق التقدم والعمل المنجز والمشاكل.",
            )}
          </AppText>
          <Button
            title={t("Prepare report", "تجهيز التقرير")}
            onPress={() => router.push("/student/reports")}
          />
        </Panel>
      </>
    );
  if (section === "activity")
    return (
      <Panel title={t("Latest activity", "آخر النشاطات")}>
        {tasks
          .slice(-4)
          .reverse()
          .map((x) => (
            <MenuRow
              key={x.id}
              title={x.title}
              subtitle={`${state.users.find((u) => u.id === x.ownerId)?.name} · ${x.done ? t("Completed", "مكتملة") : t("Added task", "أضاف مهمة")}`}
              onPress={() => router.push("/student/tasks")}
            />
          ))}
      </Panel>
    );
  return (
    <Panel title={t("Jump into your workspace", "انتقل لمساحة العمل")}>
      {[
        ["lab", "3D Lab"],
        ["issues", t("Add issue", "إضافة مشكلة")],
        ["parts", t("View BOM", "قائمة القطع")],
      ].map(([id, label]) => (
        <MenuRow key={id} title={label} onPress={() => open(id)} />
      ))}
      <MenuRow
        title={t("Weekly report", "التقرير الأسبوعي")}
        onPress={() => router.push("/student/reports")}
      />
    </Panel>
  );
}

export function DashboardSearch() {
  const [query, setQuery] = useState("");
  const t = useCopy();
  const routes = [
    ["project", "My Project", "مشروعي"],
    ["team", "Team", "الفريق"],
    ["catalog", "Component Catalog", "كاتالوج القطع"],
    ["messages", "Messages", "الرسائل"],
    ["meetings", "Meetings", "الاجتماعات"],
    ["reports", "Reports", "التقارير"],
    ["budget", "Budget", "الميزانية"],
  ];
  return (
    <View style={kit.stack}>
      <Field
        label={t("Search your workspace", "ابحث في مساحة العمل")}
        value={query}
        onChangeText={setQuery}
      />
      {query.trim() && (
        <Panel>
          {routes
            .filter((x) => x.join(" ").toLowerCase().includes(query.toLowerCase()))
            .map(([id, en, ar]) => (
              <MenuRow
                key={id}
                title={t(en, ar)}
                onPress={() => {
                  setQuery("");
                  router.push(
                    (id === "project"
                      ? "/student/project"
                      : id === "reports"
                        ? "/student/reports"
                        : `/student/more/${id}`) as Href,
                  );
                }}
              />
            ))}
        </Panel>
      )}
    </View>
  );
}
