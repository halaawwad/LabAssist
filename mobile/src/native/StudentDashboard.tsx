import { useLanguage } from "@/i18n";
import { MobileInput as TextInput } from "@/components/MobileInput";
import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { MobileModal as Modal } from "@/components/MobileModal";
import { AppHeader, NotificationsButton, RoleTabBar, ShellFrame } from "./AppShell";
import { useState, type ReactNode } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleAlert,
  CircuitBoard,
  FileText,
  FolderKanban,
  MessageSquare,
  Package,
  Plus,
  Search,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react-native";
import { AppText, Button } from "@/components";
import { Greeting, StatGrid, useCopy } from "@/components/MobileKit";
import { BuildCard } from "@/features/student/BuildCard";
import { ProjectPhoto } from "@/components/ProjectPhoto";
import { project, teammates, deadlines, useProjectWorkspace } from "./StudentReference";
import { ReferenceProject } from "./ProjectDetails";
import { studentDestinations } from "./Destinations";
import { router } from "./router";
import { useRole, useWorkspace } from "@/state/WorkspaceProvider";

const stock = [
  {
    id: "hc-sr04",
    name: "HC-SR04 Ultrasonic Sensor",
    stock: 12,
    price: 4,
    location: "Sensors · A2",
    need: 2,
  },
  {
    id: "l298n",
    name: "L298N Motor Driver",
    stock: 8,
    price: 8,
    location: "Drivers · B1",
    need: 1,
  },
  {
    id: "breadboard-400",
    name: "400-point Breadboard",
    stock: 18,
    price: 5,
    location: "Prototyping · C3",
    need: 1,
  },
  {
    id: "resistor-variable",
    name: "Resistor Assortment",
    stock: 24,
    price: 2,
    location: "Passives · C1",
    need: 1,
  },
];
const navigation = [
  "Dashboard",
  "My Project",
  "3D Lab",
  "Component Catalog",
  "My Circuits",
  "Inventory",
  "Team",
  "Learning Hub",
  "Messages",
  "Meetings",
  "Reports",
  "My Profile",
  "Settings",
];
/** Display names for the workspace destinations used by search and quick links. */
const navigationLabels: Record<string, [string, string]> = {
  Dashboard: ["Home", "الرئيسية"],
  "My Project": ["My Project", "مشروعي"],
  "3D Lab": ["3D Lab", "المختبر ثلاثي الأبعاد"],
  "Component Catalog": ["Component Catalog", "دليل المكونات"],
  "My Circuits": ["My Circuits", "دوائري"],
  Inventory: ["Workshop Inventory", "مخزون الورشة"],
  Team: ["Team", "الفريق"],
  "Learning Hub": ["Learning Hub", "مركز التعلم"],
  Messages: ["Messages", "الرسائل"],
  Meetings: ["Meetings", "الاجتماعات"],
  Reports: ["Reports", "التقارير"],
  "My Profile": ["My Profile", "ملفي الشخصي"],
  Settings: ["Settings", "الإعدادات"],
  Notifications: ["Notifications", "الإشعارات"],
  "Add issue": ["Add issue", "إضافة مشكلة"],
  "View BOM": ["View BOM", "عرض قائمة المواد"],
  "Weekly report": ["Weekly report", "التقرير الأسبوعي"],
  Components: ["Components", "المكونات"],
};
const months: Record<string, string> = {
  JAN: "يناير",
  FEB: "فبراير",
  MAR: "مارس",
  APR: "أبريل",
  MAY: "مايو",
  JUN: "يونيو",
  JUL: "يوليو",
  AUG: "أغسطس",
  SEP: "سبتمبر",
  OCT: "أكتوبر",
  NOV: "نوفمبر",
  DEC: "ديسمبر",
};
const monthLabel = (month: string, t: (en: string, ar: string) => string) =>
  t(month, months[month.toUpperCase()] ?? month);
const typeLabels: Record<string, string> = {
  Design: "تصميم",
  Report: "تقرير",
  Testing: "اختبار",
  Meeting: "اجتماع",
};
const typeLabel = (type: string, t: (en: string, ar: string) => string) =>
  t(type, typeLabels[type] ?? type);
type Icon = typeof Users;
function Paper({
  children,
  title,
  icon: Icon,
}: {
  children: ReactNode;
  title?: string;
  icon?: Icon;
}) {
  return (
    <View style={s.paper}>
      {title && (
        <View style={s.between}>
          <AppText variant="heading">{title}</AppText>
          {Icon && <Icon size={19} color="#7a876e" />}
        </View>
      )}
      {children}
    </View>
  );
}
export default function StudentDashboard() {
  const ready = useRole("student");
  const { ltr } = useLanguage();
  const t = useCopy();
  const workspace = useProjectWorkspace();
  const { state, actorId } = useWorkspace();
  const userName = state.users.find((user) => user.id === actorId)?.name ?? "";
  const navLabel = (name: string) => {
    const [en, ar] = navigationLabels[name] ?? [name, name];
    return t(en, ar);
  };
  const [query, setQuery] = useState(""),
    [destination, setDestination] = useState("");
  const [purchase, setPurchase] = useState<(typeof stock)[number] | null>(null),
    [quantity, setQuantity] = useState("1"),
    [requests, setRequests] = useState<Record<string, number>>({});
  const [issue, setIssue] = useState("");
  const open = (name: string) => {
    const page = studentDestinations[name];
    if (page) {
      router.push(`/native/student/${page}` as import("expo-router").Href);
      return;
    }
    setDestination(name);
  };
  const metrics = [
    {
      icon: Zap,
      label: t("Current milestone", "المرحلة الحالية"),
      value: ltr("3 / 5"),
      note: t("Prototype testing", "اختبار النموذج"),
      tone: "olive" as const,
      target: "My Project",
    },
    {
      icon: Users,
      label: t("Working together", "نعمل معًا"),
      value: "3",
      note: t("Equal teammates", "زملاء متساوون"),
      tone: "blue" as const,
      target: "Team",
    },
    {
      icon: CircleAlert,
      label: t("Open issues", "مشكلات مفتوحة"),
      value: String(workspace.openIssues.length),
      note: t("1 needs attention", "1 بحاجة إلى اهتمام"),
      tone: "orange" as const,
      target: "Add issue",
    },
    {
      icon: Wallet,
      label: t("Budget remaining", "الميزانية المتبقية"),
      value: workspace.liveMode ? (workspace.finance.data?.budget ? `${workspace.finance.data.budget.currency} ${workspace.finance.data.budget.remaining}` : "—") : "$66",
      note: workspace.liveMode ? (workspace.finance.data?.budget ? `${workspace.finance.data.budget.spent} / ${workspace.finance.data.budget.amount}` : t("Set project budget", "حدّد ميزانية المشروع")) : t("$184 of $250 used", "استُخدم $184 من $250"),
      tone: "violet" as const,
      target: "Components",
    },
  ];
  const ownTasks = workspace.teamTasks.filter(
    (task) => workspace.members[task.owner]?.id === workspace.actorId,
  );
  const completedToday = ownTasks.filter((task) => workspace.completed.includes(task.id)).length;
  if (!ready) return null;
  return (
    <ShellFrame
      background={require("../../assets/web/project-white-background.png")}
      header={
        <AppHeader brand title="LabAssist" trailing={<NotificationsButton role="student" />} />
      }
      tabBar={<RoleTabBar role="student" page="dashboard" />}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Greeting name={userName} subtitle={workspace.details.title} />
        <StatGrid
          items={metrics.map((item) => ({
            id: item.target,
            icon: item.icon,
            tone: item.tone,
            label: item.label,
            value: item.value,
            note: item.note,
            onPress: () => open(item.target),
          }))}
        />
        <View style={s.search}>
          <Search size={19} color="#7b886e" />
          <TextInput
            accessibilityLabel={t("Search your workspace", "ابحث في مساحة عملك")}
            placeholder={t("Search pages and tools…", "ابحث في الصفحات والأدوات…")}
            value={query}
            onChangeText={setQuery}
            style={s.searchInput}
          />
        </View>
        {!!query.trim() && (
          <Paper>
            {navigation
              .filter((x) =>
                `${x} ${navLabel(x)}`.toLowerCase().includes(query.trim().toLowerCase()),
              )
              .map((name) => (
                <Pressable
                  key={name}
                  onPress={() => {
                    setQuery("");
                    open(name);
                  }}
                  style={s.link}
                >
                  <AppText>{navLabel(name)}</AppText>
                  <ArrowUpRight size={15} />
                </Pressable>
              ))}
          </Paper>
        )}
        <BuildCard
          value={workspace.progress}
          completed={workspace.completedCount}
          total={workspace.taskCount}
          onOpen={() => open("My Project")}
        />
        <Paper>
          <AppText style={s.eyebrow}>
            {t("ONE PROJECT. A LOT OF POSSIBILITIES.", "مشروع واحد. إمكانيات كثيرة.")}
          </AppText>
          <AppText style={s.projectTitle}>{workspace.details.title}</AppText>
          <AppText tone="muted" style={{ fontSize: 19 }}>
            {project.subtitle}
          </AppText>
          <AppText style={s.pill}>● {t("In Progress", "قيد التنفيذ")}</AppText>
          <View style={s.row}>
            {teammates.map((person, i) =>
              i === 0 ? (
                <Image
                  key={person.name}
                  source={require("../../assets/web/student-avatar.jpg")}
                  style={s.avatar}
                />
              ) : (
                <View
                  key={person.name}
                  style={[s.initials, { backgroundColor: i === 1 ? "#deebf8" : "#f0e5ed" }]}
                >
                  <AppText variant="caption" weight="bold">
                    {person.initials}
                  </AppText>
                </View>
              ),
            )}
            <AppText variant="caption" tone="muted">
              {t("Built together", "نبنيه معًا")}
            </AppText>
          </View>
          <Button title={t("Open My Project", "فتح مشروعي")} onPress={() => open("My Project")} />
          <ProjectPhoto projectId="reference-smart-car" />
        </Paper>
        <Paper>
          <View style={s.between}>
            <View>
              {!!workspace.error && (
                <View>
                  <AppText accessibilityRole="alert">{workspace.error}</AppText>
                  <Button
                    title={t("Retry loading", "إعادة التحميل")}
                    onPress={workspace.retryLoading}
                  />
                </View>
              )}
              <AppText style={s.eyebrow}>{t("MAKE TODAY COUNT", "اجعل يومك مثمرًا")}</AppText>
              <AppText variant="heading">{t("Your focus today", "تركيزك اليوم")}</AppText>
            </View>
            <AppText style={s.pill}>
              {completedToday} / {ownTasks.length}
            </AppText>
          </View>
          {ownTasks.map((task, i) => {
            const done = workspace.completed.includes(task.id);
            return (
              <Pressable
                key={task.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                onPress={async () => {
                  if (!(await workspace.toggleTask(task.id))) return;
                  workspace.logTeamActivity(
                    0,
                    `${done ? "Reopened" : "Completed"} “${task.title}”`,
                  );
                }}
                style={s.task}
              >
                <View style={[s.check, done && { backgroundColor: "#526443" }]}>
                  {done && <Check size={15} color="white" />}
                </View>
                <View style={s.fill}>
                  <AppText
                    style={
                      done ? { textDecorationLine: "line-through", color: "#8a927f" } : undefined
                    }
                  >
                    {task.title}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {i === 0 ? t("Design", "التصميم") : t("Documentation", "التوثيق")} ·{" "}
                    {t("My assigned task", "مهمتي المسندة")}
                  </AppText>
                </View>
                <ArrowUpRight size={15} color="#839276" />
              </Pressable>
            );
          })}
          <Pressable onPress={() => open("Team")} style={s.link}>
            <AppText tone="primary">
              {t("See the whole team’s tasks", "عرض مهام الفريق كاملة")}
            </AppText>
            <ArrowRight size={15} color="#526443" />
          </Pressable>
        </Paper>
        <Paper title={t("Available in the Workshop", "متوفر في الورشة")} icon={Package}>
          <AppText tone="muted" variant="caption">
            {t("Parts you can request for your next build.", "قطع يمكنك طلبها لمشروعك القادم.")}
          </AppText>
          <AppText style={s.pill}>{t("Sample inventory", "مخزون تجريبي")}</AppText>
          <AppText style={s.note}>
            {t(
              "Sample availability · confirm stock with the workshop assistant.",
              "توفر تجريبي · تأكد من المخزون مع مسؤول الورشة.",
            )}
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {stock.map((item) => (
              <View key={item.id} style={s.product}>
                <View style={s.productArt}>
                  <CircuitBoard size={42} color="#758961" />
                  <AppText style={s.stock}>{t("In stock", "متوفر")}</AppText>
                </View>
                <AppText weight="bold" style={{ fontSize: 12, minHeight: 36 }}>
                  {item.name}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ fontSize: 10 }}>
                  {item.location}
                </AppText>
                <View style={s.between}>
                  <AppText weight="bold" tone="primary">
                    {ltr(`$${item.price}`)}
                    <AppText style={{ fontSize: 12 }}> {t("/ unit", "/ للقطعة")}</AppText>
                  </AppText>
                  <AppText style={{ fontSize: 12 }}>
                    {item.stock} {t("available", "متاحة")}
                  </AppText>
                </View>
                <Button
                  size="sm"
                  title={
                    requests[item.id]
                      ? `${t("Draft request", "مسودة طلب")} · ${requests[item.id]}`
                      : t("Request to Buy", "طلب شراء")
                  }
                  onPress={() => {
                    setPurchase(item);
                    setQuantity(String(requests[item.id] ?? item.need));
                  }}
                />
              </View>
            ))}
          </ScrollView>
          {Object.keys(requests).length > 0 && (
            <AppText style={s.note}>
              {Object.keys(requests).length} {t("purchase drafts", "مسودات شراء")} ·{" "}
              {ltr(`$${stock.reduce((n, x) => n + (requests[x.id] ?? 0) * x.price, 0).toFixed(2)}`)}{" "}
              {t("estimated", "تقديريًا")}
            </AppText>
          )}
        </Paper>
        <Paper title={t("Coming up", "القادم")} icon={CalendarDays}>
          {deadlines.map((item) => (
            <Pressable
              key={item.name}
              onPress={() => open(item.type === "Report" ? "Reports" : "Team")}
              style={s.task}
            >
              <View style={s.date}>
                <AppText style={{ fontSize: 12, color: "#849271" }}>
                  {monthLabel(item.month, t)}
                </AppText>
                <AppText weight="bold" style={{ fontSize: 23, color: "#526443" }}>
                  {item.day}
                </AppText>
              </View>
              <View style={s.fill}>
                <AppText weight="semibold">{item.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {typeLabel(item.type, t)} · {item.owner}
                </AppText>
              </View>
            </Pressable>
          ))}
        </Paper>
        <View style={[s.paper, { backgroundColor: "#e7eef5eb" }]}>
          <FileText color="#678cab" size={24} />
          <AppText style={s.eyebrow}>{t("NEEDS YOUR ATTENTION", "يحتاج إلى اهتمامك")}</AppText>
          <AppText variant="heading">
            {workspace.submitted
              ? t("Report submitted.", "تم تسليم التقرير.")
              : t("Your week, ready to share?", "أسبوعك جاهز للمشاركة؟")}
          </AppText>
          <AppText tone="muted">
            {workspace.submitted
              ? t(
                  "Your report is marked as submitted for this session.",
                  "تقريرك مُعلّم كمسلَّم في هذه الجلسة.",
                )
              : t(
                  "The weekly report is due Oct 09. Capture your progress and blockers.",
                  "موعد التقرير الأسبوعي 9 أكتوبر. سجّل تقدمك والعوائق.",
                )}
          </AppText>
          <Button
            title={
              workspace.submitted
                ? t("View report", "عرض التقرير")
                : t("Prepare report", "تحضير التقرير")
            }
            onPress={() => open("Reports")}
          />
        </View>
        <Paper title={t("Latest activity", "آخر النشاطات")} icon={MessageSquare}>
          {workspace.teamActivity.map((item) => (
            <View key={item.id} style={s.task}>
              <View style={s.metricIcon}>
                <CircuitBoard size={18} color="#526443" />
              </View>
              <View style={s.fill}>
                <AppText weight="semibold">{item.text}</AppText>
                <AppText variant="caption" tone="muted">
                  {teammates[item.owner].name} · {item.time}
                </AppText>
              </View>
            </View>
          ))}
        </Paper>
        <Paper title={t("Jump into your workspace", "انتقل إلى مساحة عملك")}>
          {[
            { name: "3D Lab", icon: FolderKanban },
            { name: "Add issue", icon: Plus },
            { name: "View BOM", icon: Wallet },
            { name: "Weekly report", icon: FileText },
          ].map((x) => (
            <Pressable key={x.name} onPress={() => open(x.name)} style={s.link}>
              <x.icon size={18} color="#526443" />
              <AppText style={s.fill}>{navLabel(x.name)}</AppText>
              <ArrowUpRight size={14} color="#839276" />
            </Pressable>
          ))}
        </Paper>
      </ScrollView>
      <Modal
        visible={!!purchase || !!destination}
        animationType="slide"
        onRequestClose={() => {
          setPurchase(null);
          setDestination("");
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f8f1" }}>
          <View style={[s.between, { padding: 20 }]}>
            <AppText variant="heading">
              {purchase
                ? t("Workshop Purchase Request", "طلب شراء من الورشة")
                : navLabel(destination)}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Close", "إغلاق")}
              onPress={() => {
                setPurchase(null);
                setDestination("");
              }}
            >
              <X color="#526443" />
            </Pressable>
          </View>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="on-drag"
            contentContainerStyle={s.content}
          >
            {purchase ? (
              <Paper>
                <AppText weight="bold">{purchase.name}</AppText>
                <AppText>
                  {ltr(`$${purchase.price}`)} {t("per unit", "للقطعة")} · {purchase.stock}{" "}
                  {t("available", "متاحة")}
                </AppText>
                <AppText variant="label">{t("Quantity", "الكمية")}</AppText>
                <TextInput
                  accessibilityLabel={t("Quantity", "الكمية")}
                  keyboardType="number-pad"
                  value={quantity}
                  onChangeText={setQuantity}
                  style={s.input}
                />
                <AppText>
                  {t("Estimated total", "الإجمالي التقديري")}{" "}
                  {ltr(`$${(Number(quantity) * purchase.price || 0).toFixed(2)}`)}
                </AppText>
                <AppText tone="muted">
                  {t(
                    "Prepare a local draft. No purchase or stock reservation is made.",
                    "جهّز مسودة محلية. لا يتم شراء أو حجز أي مخزون.",
                  )}
                </AppText>
                <Button
                  title={t("Save Purchase Draft", "حفظ مسودة الشراء")}
                  disabled={
                    !Number.isInteger(Number(quantity)) ||
                    Number(quantity) < 1 ||
                    Number(quantity) > purchase.stock
                  }
                  onPress={() => {
                    setRequests((x) => ({ ...x, [purchase.id]: Number(quantity) }));
                    setPurchase(null);
                  }}
                />
              </Paper>
            ) : [
                "My Project",
                "Team",
                "Components",
                "View BOM",
                "Reports",
                "Weekly report",
              ].includes(destination) ? (
              <ReferenceProject
                key={destination}
                initial={
                  destination === "Team"
                    ? "Team & Tasks"
                    : ["Components", "View BOM"].includes(destination)
                      ? "Components"
                      : ["Reports", "Weekly report"].includes(destination)
                        ? "Reports"
                        : "Overview"
                }
              />
            ) : destination === "Add issue" ? (
              <Paper>
                <TextInput
                  accessibilityLabel={t("Issue description", "وصف المشكلة")}
                  placeholder={t("Describe the issue", "صف المشكلة")}
                  value={issue}
                  onChangeText={setIssue}
                  style={s.input}
                />
                <Button
                  title={t("Add issue", "إضافة مشكلة")}
                  disabled={!issue.trim()}
                  onPress={async () => {
                    if (!(await workspace.addIssue(issue.trim()))) return;
                    setIssue("");
                    setDestination("");
                  }}
                />
              </Paper>
            ) : (
              <Paper>
                <AppText>
                  {t(
                    "This destination is still being matched to the original screen in Native.",
                    "ما زالت هذه الوجهة قيد المطابقة مع الشاشة الأصلية.",
                  )}
                </AppText>
                <AppText tone="muted">
                  {t(
                    "The original website remains available for comparison. This is not a completed screen yet.",
                    "يبقى الموقع الأصلي متاحًا للمقارنة. هذه الشاشة غير مكتملة بعد.",
                  )}
                </AppText>
              </Paper>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ShellFrame>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff", overflow: "hidden" },
  fill: { flex: 1, minWidth: 0 },
  wash: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f7f8f15c",
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#fffffff0",
    borderBottomWidth: 1,
    borderColor: "#e4e8dc",
  },
  avatar: { width: 38, height: 38, borderRadius: 14 },
  icon: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#526443",
    borderRadius: 8,
    minWidth: 15,
    alignItems: "center",
  },
  content: {
    padding: 18,
    gap: 18,
    paddingBottom: 28,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 15,
    backgroundColor: "#ffffffed",
    borderWidth: 1,
    borderColor: "#dce4d5",
    borderRadius: 18,
    minHeight: 48,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#263320", paddingVertical: 12 },
  welcome: { paddingVertical: 10, gap: 12 },
  eyebrow: { fontSize: 9, letterSpacing: 1.5, color: "#7b8c6c", fontWeight: "600" },
  headline: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -1,
    color: "#0d1528",
  },
  paper: {
    padding: 20,
    borderRadius: 25,
    gap: 14,
    backgroundColor: "#fffffff0",
    borderWidth: 1,
    borderColor: "#ffffff",
    boxShadow: "0 5px 20px #35422d0a",
  },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    backgroundColor: "#ffffffed",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#e8edde",
    alignItems: "center",
    justifyContent: "center",
  },
  projectTitle: { fontSize: 29, lineHeight: 35, fontWeight: "700" },
  pill: {
    fontSize: 10,
    color: "#61744f",
    backgroundColor: "#e5eddb",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  initials: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  task: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#e7ebdf",
  },
  check: {
    height: 25,
    width: 25,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#aab99a",
    alignItems: "center",
    justifyContent: "center",
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "space-between",
    paddingVertical: 14,
    minHeight: 46,
  },
  note: {
    fontSize: 10,
    lineHeight: 17,
    color: "#64755b",
    backgroundColor: "#edf2e6",
    padding: 10,
    borderRadius: 10,
  },
  product: {
    width: 180,
    padding: 13,
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5eadd",
    backgroundColor: "#fbfcf8",
  },
  productArt: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#edf1e7",
    borderRadius: 13,
  },
  stock: { position: "absolute", top: 6, left: 6, fontSize: 9, color: "#61794e" },
  date: {
    width: 47,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#e9eff5",
    alignItems: "center",
  },
  bottom: {
    flexDirection: "row",
    paddingVertical: 10,
    backgroundColor: "#fffffff5",
    borderTopWidth: 1,
    borderColor: "#e2e7d9",
  },
  bottomItem: { flex: 1, alignItems: "center", gap: 5, paddingVertical: 2 },
  overlay: { flex: 1, backgroundColor: "#16211866" },
  drawer: {
    width: "85%",
    maxWidth: 330,
    height: "100%",
    backgroundColor: "#f9faf5",
    paddingHorizontal: 22,
    gap: 16,
  },
  input: {
    padding: 14,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#c8d5bb",
    borderRadius: 14,
    fontSize: 16,
    backgroundColor: "#fff",
  },
});
