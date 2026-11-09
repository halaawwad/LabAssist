import { BuildCard } from "./BuildCard";
import { DashboardDetails, DashboardSearch } from "./DashboardDetails";
import { router, type Href } from "@/native/router";
import { Pressable, View } from "react-native";
import { AppText, Button } from "@/components";
import { Page, Panel, MenuRow, kit, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { projectFor, projectProgress } from "@/domain/workspace";
import { colors } from "@/theme";
import { ReportsPanel } from "../shared/ReportsPanel";
import { MessagesPanel, MeetingsPanel } from "../shared/CommunicationPanels";
import {
  ProfilePanel,
  SettingsPanel,
  TeamPanels,
  NotificationsPanel,
  NoticesPanel,
} from "../shared/AccountPanels";
import { TasksPanel, ProjectDetails, IssuesPanel, FinancePanel } from "../shared/ProjectPanels";
import { CatalogPanel, CircuitLabPanel } from "./HardwarePanels";
import { LearningPanel, OffersPanel } from "./DiscoveryPanels";
import { TablesPanel } from "../workshop/WorkshopScreen";

export default function StudentScreen({ page }: { page: string }) {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const p = projectFor(state, actorId);

  const titles: Record<string, string> = {
    home: t("Your workspace", "مساحتك"),
    project: t("My project", "مشروعي"),
    tasks: t("Team tasks", "مهام الفريق"),
    reports: t("Reports & presentation", "التقارير والعرض"),
    more: t("Explore LabAssist", "استكشف LabAssist"),
    team: t("Team", "الفريق"),
    messages: t("Messages", "الرسائل"),
    meetings: t("Meetings", "الاجتماعات"),
    catalog: t("Component catalog", "كاتالوج القطع"),
    lab: t("3D Lab", "مختبر 3D"),
    learning: t("Learning Hub", "مركز التعلم"),
    offers: t("Find & compare parts", "البحث ومقارنة القطع"),
    profile: t("Profile", "الملف الشخصي"),
    settings: t("Settings", "الإعدادات"),
    notifications: t("Notifications", "الإشعارات"),
    issues: t("Project issues", "مشاكل المشروع"),
    budget: t("Budget & expenses", "الميزانية والمصاريف"),
    parts: t("Project parts", "قطع المشروع"),
    workshop: t("Workshop", "الورشة"),
  };
  const open = (id: string) => router.push(`/student/more/${id}` as Href);
  return (
    <Page
      title={titles[page] ?? page}
      back={!["home", "project", "tasks", "reports", "more"].includes(page)}
    >
      {page === "home" && p ? (
        <>
          <DashboardSearch />
          <Panel tint={colors.primaryWash}>
            <AppText variant="caption" tone="primary">
              {t("YOUR WORKSPACE, AT A GLANCE", "مساحة عملك، بنظرة واحدة")}
            </AppText>
            <AppText variant="title">
              {t("A little closer to making it work.", "خطوة أقرب لتحقيق فكرتك.")}
            </AppText>
            <AppText tone="muted">
              {t(
                "The big picture, your next steps, and what needs a little attention.",
                "الصورة الكاملة، خطواتك القادمة، وما يحتاج انتباهك.",
              )}
            </AppText>
          </Panel>
          <BuildCard
            value={projectProgress(state, p.id)}
            completed={state.tasks.filter((x) => x.projectId === p.id && x.done).length}
            total={state.tasks.filter((x) => x.projectId === p.id).length}
            onOpen={() => router.push("/student/project")}
          />
          <DashboardDetails section="metrics" />
          <DashboardDetails section="project" />
          <View style={kit.wrap}>
            {[
              {
                label: t("Open tasks", "مهام متبقية"),
                value: state.tasks.filter((task) => task.projectId === p.id && !task.done).length,
                action: () => router.push("/student/tasks"),
              },
              {
                label: t("Feedback", "ملاحظات"),
                value: state.reports
                  .filter((r) => r.projectId === p.id)
                  .reduce((sum, r) => sum + r.feedback.length, 0),
                action: () => router.push("/student/reports"),
              },
            ].map((stat) => (
              <Pressable key={stat.label} onPress={stat.action} style={{ flex: 1 }}>
                <Panel tint={colors.softBlue}>
                  <AppText variant="title">{stat.value}</AppText>
                  <AppText>{stat.label}</AppText>
                </Panel>
              </Pressable>
            ))}
          </View>
          <Panel title={t("Today’s focus", "تركيزك اليوم")}>
            {state.tasks
              .filter((task) => task.ownerId === actorId && !task.done)
              .slice(0, 3)
              .map((task) => (
                <Pressable
                  key={task.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: task.done }}
                  onPress={() => act({ type: "task.toggle", id: task.id })}
                  style={[kit.row, { paddingVertical: 10 }]}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AppText>{task.done ? "✓" : ""}</AppText>
                  </View>
                  <AppText style={kit.grow}>{task.title}</AppText>
                </Pressable>
              ))}
            <MenuRow
              title={t("All tasks", "كل المهام")}
              onPress={() => router.push("/student/tasks")}
            />
            <MenuRow
              title={t("Team conversation", "محادثة الفريق")}
              onPress={() => open("messages")}
            />
          </Panel>
          <NoticesPanel />
          <DashboardDetails section="upcoming" />
          <DashboardDetails section="activity" />
          <DashboardDetails section="actions" />
        </>
      ) : page === "project" && p ? (
        <ProjectDetails project={p} />
      ) : page === "tasks" ? (
        <TasksPanel />
      ) : page === "reports" ? (
        <ReportsPanel />
      ) : page === "team" ? (
        <TeamPanels />
      ) : page === "messages" ? (
        <MessagesPanel />
      ) : page === "meetings" ? (
        <MeetingsPanel />
      ) : page === "catalog" ? (
        <CatalogPanel />
      ) : page === "lab" ? (
        <CircuitLabPanel />
      ) : page === "learning" ? (
        <LearningPanel />
      ) : page === "offers" ? (
        <OffersPanel />
      ) : page === "profile" ? (
        <ProfilePanel key={actorId} />
      ) : page === "settings" ? (
        <SettingsPanel />
      ) : page === "notifications" ? (
        <NotificationsPanel />
      ) : page === "issues" ? (
        <IssuesPanel />
      ) : page === "parts" ? (
        <FinancePanel parts />
      ) : page === "budget" ? (
        <FinancePanel />
      ) : page === "workshop" ? (
        <>
          <NoticesPanel />
          <TablesPanel readonly />
        </>
      ) : (
        <>
          {[
            {
              title: t("Project & people", "المشروع والفريق"),
              ids: ["team", "messages", "meetings", "issues", "parts", "budget"],
            },
            {
              title: t("Tools & discovery", "الأدوات والاستكشاف"),
              ids: ["catalog", "lab", "learning", "offers", "workshop"],
            },
            { title: t("Your account", "حسابك"), ids: ["notifications", "profile", "settings"] },
          ].map((group) => (
            <Panel key={group.title} title={group.title}>
              {group.ids.map((id) => (
                <MenuRow key={id} title={titles[id]} onPress={() => open(id)} />
              ))}
            </Panel>
          ))}
          <Button
            title={t("Switch workspace", "تغيير الدور")}
            variant="ghost"
            onPress={() => router.replace("/")}
          />
        </>
      )}
    </Page>
  );
}
