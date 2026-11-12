import { useState, type ReactNode } from "react";
import {
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CircleAlert,
  CircuitBoard,
  FileText,
  FolderKanban,
  Menu,
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
import { BuildCard } from "@/features/student/BuildCard";
import { ProjectPhoto } from "@/components/ProjectPhoto";
import { project, teammates, deadlines, useProjectWorkspace } from "./StudentReference";
import { ReferenceProject } from "./ProjectDetails";
import { studentDestinations } from "./Destinations";
import { router } from "./router";
import { useRole } from "@/state/WorkspaceProvider";

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
  const workspace = useProjectWorkspace();
  const [menu, setMenu] = useState(false),
    [query, setQuery] = useState(""),
    [destination, setDestination] = useState("");
  const [purchase, setPurchase] = useState<(typeof stock)[number] | null>(null),
    [quantity, setQuantity] = useState("1"),
    [requests, setRequests] = useState<Record<string, number>>({});
  const [issue, setIssue] = useState("");
  const open = (name: string) => {
    setMenu(false);
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
      label: "Current milestone",
      value: "3 / 5",
      note: "Prototype testing",
      color: "#526443",
      wash: "#e5ebdb",
      target: "My Project",
    },
    {
      icon: Users,
      label: "Working together",
      value: "3",
      note: "Equal teammates",
      color: "#527c9d",
      wash: "#e2edf6",
      target: "Team",
    },
    {
      icon: CircleAlert,
      label: "Open issues",
      value: String(3 + workspace.issues.length),
      note: "1 needs attention",
      color: "#b57b4a",
      wash: "#f8eadd",
      target: "Add issue",
    },
    {
      icon: Wallet,
      label: "Budget remaining",
      value: "$66",
      note: "$184 of $250 used",
      color: "#81699e",
      wash: "#eee7f6",
      target: "Components",
    },
  ];
  const completedToday = teammates[0].tasks.filter((_, i) =>
    workspace.completed.includes(`0-${i}`),
  ).length;
  if (!ready) return null;
  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <ImageBackground
        source={require("../../assets/web/project-white-background.png")}
        style={s.fill}
        resizeMode="cover"
      >
        <View style={s.wash} />
        <View style={s.topbar}>
          <Pressable accessibilityLabel="Open menu" onPress={() => setMenu(true)} style={s.icon}>
            <Menu color="#526443" size={22} />
          </Pressable>
          <AppText weight="bold" style={{ flex: 1 }}>
            LabAssist
          </AppText>
          <Pressable
            accessibilityLabel="Notifications, 8 unread"
            onPress={() => open("Notifications")}
            style={s.icon}
          >
            <Bell size={21} color="#526443" />
            <View style={s.badge}>
              <AppText style={{ fontSize: 9, color: "white" }}>8</AppText>
            </View>
          </Pressable>
          <Pressable
            accessibilityLabel="NOOR OWASSI Student workspace"
            onPress={() => open("My Profile")}
          >
            <Image source={require("../../assets/web/student-avatar.jpg")} style={s.avatar} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.search}>
            <Search size={19} color="#7b886e" />
            <TextInput
              accessibilityLabel="Search your workspace"
              placeholder="Search your workspace"
              value={query}
              onChangeText={setQuery}
              style={s.searchInput}
            />
          </View>
          {!!query.trim() && (
            <Paper>
              {navigation
                .filter((x) => x.toLowerCase().includes(query.toLowerCase()))
                .map((name) => (
                  <Pressable
                    key={name}
                    onPress={() => {
                      setQuery("");
                      open(name);
                    }}
                    style={s.link}
                  >
                    <AppText>{name}</AppText>
                    <ArrowUpRight size={15} />
                  </Pressable>
                ))}
            </Paper>
          )}
          <View style={s.welcome}>
            <AppText style={s.eyebrow}>YOUR WORKSPACE, AT A GLANCE</AppText>
            <AppText style={s.headline}>
              A little closer{"\n"}
              <AppText style={[s.headline, { color: "#697e54" }]}>to making it work.</AppText>
            </AppText>
            <AppText tone="muted" style={{ lineHeight: 23 }}>
              The big picture, your next steps, and what needs a little attention.
            </AppText>
          </View>
          <BuildCard
            value={workspace.progress}
            completed={workspace.completedCount}
            total={workspace.taskCount}
            onOpen={() => open("My Project")}
          />
          <View style={s.metrics}>
            {metrics.map((item) => (
              <Pressable key={item.label} onPress={() => open(item.target)} style={s.metric}>
                <View style={[s.metricIcon, { backgroundColor: item.wash }]}>
                  <item.icon size={20} color={item.color} />
                </View>
                <AppText style={{ fontSize: 11, color: "#737f69" }}>{item.label}</AppText>
                <AppText weight="bold" style={{ fontSize: 26, color: item.color }}>
                  {item.value}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ fontSize: 11 }}>
                  {item.note}
                </AppText>
              </Pressable>
            ))}
          </View>
          <Paper>
            <AppText style={s.eyebrow}>ONE PROJECT. A LOT OF POSSIBILITIES.</AppText>
            <AppText style={s.projectTitle}>{project.name}</AppText>
            <AppText tone="muted" style={{ fontSize: 19 }}>
              {project.subtitle}
            </AppText>
            <AppText style={s.pill}>● In Progress</AppText>
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
                Built together
              </AppText>
            </View>
            <Button title="Open My Project" onPress={() => open("My Project")} />
            <ProjectPhoto projectId="reference-smart-car" />
          </Paper>
          <Paper>
            <View style={s.between}>
              <View>
                <AppText style={s.eyebrow}>MAKE TODAY COUNT</AppText>
                <AppText variant="heading">Your focus today</AppText>
              </View>
              <AppText style={s.pill}>{completedToday} / 2</AppText>
            </View>
            {teammates[0].tasks.map((title, i) => {
              const done = workspace.completed.includes(`0-${i}`);
              return (
                <Pressable
                  key={title}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  onPress={() => {
                    workspace.toggleTask(`0-${i}`);
                    workspace.logTeamActivity(0, `${done ? "Reopened" : "Completed"} “${title}”`);
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
                      {title}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {i === 0 ? "Design" : "Documentation"} · My assigned task
                    </AppText>
                  </View>
                  <ArrowUpRight size={15} color="#839276" />
                </Pressable>
              );
            })}
            <Pressable onPress={() => open("Team")} style={s.link}>
              <AppText tone="primary">See the whole team’s tasks</AppText>
              <ArrowRight size={15} color="#526443" />
            </Pressable>
          </Paper>
          <Paper title="Available in the Workshop" icon={Package}>
            <AppText tone="muted" variant="caption">
              Parts you can request for your next build.
            </AppText>
            <AppText style={s.pill}>Sample inventory</AppText>
            <AppText style={s.note}>
              Sample availability · confirm stock with the workshop assistant.
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
                    <AppText style={s.stock}>In stock</AppText>
                  </View>
                  <AppText weight="bold" style={{ fontSize: 12, minHeight: 36 }}>
                    {item.name}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ fontSize: 10 }}>
                    {item.location}
                  </AppText>
                  <View style={s.between}>
                    <AppText weight="bold" tone="primary">
                      ${item.price}
                      <AppText style={{ fontSize: 10 }}> / unit</AppText>
                    </AppText>
                    <AppText style={{ fontSize: 10 }}>{item.stock} available</AppText>
                  </View>
                  <Button
                    size="sm"
                    title={
                      requests[item.id] ? `Draft request · ${requests[item.id]}` : "Request to Buy"
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
                {Object.keys(requests).length} purchase drafts · $
                {stock.reduce((n, x) => n + (requests[x.id] ?? 0) * x.price, 0).toFixed(2)}{" "}
                estimated
              </AppText>
            )}
          </Paper>
          <Paper title="Coming up" icon={CalendarDays}>
            {deadlines.map((item) => (
              <Pressable
                key={item.name}
                onPress={() => open(item.type === "Report" ? "Reports" : "Team")}
                style={s.task}
              >
                <View style={s.date}>
                  <AppText style={{ fontSize: 10, color: "#849271" }}>{item.month}</AppText>
                  <AppText weight="bold" style={{ fontSize: 23, color: "#526443" }}>
                    {item.day}
                  </AppText>
                </View>
                <View style={s.fill}>
                  <AppText weight="semibold">{item.name}</AppText>
                  <AppText variant="caption" tone="muted">
                    {item.type} · {item.owner}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </Paper>
          <View style={[s.paper, { backgroundColor: "#e7eef5eb" }]}>
            <FileText color="#678cab" size={24} />
            <AppText style={s.eyebrow}>NEEDS YOUR ATTENTION</AppText>
            <AppText variant="heading">
              {workspace.submitted ? "Report submitted." : "Your week, ready to share?"}
            </AppText>
            <AppText tone="muted">
              {workspace.submitted
                ? "Your report is marked as submitted for this session."
                : "The weekly report is due Oct 09. Capture your progress and blockers."}
            </AppText>
            <Button
              title={workspace.submitted ? "View report" : "Prepare report"}
              onPress={() => open("Reports")}
            />
          </View>
          <Paper title="Latest activity" icon={MessageSquare}>
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
          <Paper title="Jump into your workspace">
            {[
              { name: "3D Lab", icon: FolderKanban },
              { name: "Add issue", icon: Plus },
              { name: "View BOM", icon: Wallet },
              { name: "Weekly report", icon: FileText },
            ].map((x) => (
              <Pressable key={x.name} onPress={() => open(x.name)} style={s.link}>
                <x.icon size={18} color="#526443" />
                <AppText style={s.fill}>{x.name}</AppText>
                <ArrowUpRight size={14} color="#839276" />
              </Pressable>
            ))}
          </Paper>
        </ScrollView>
        <View style={s.bottom}>
          {[
            { name: "Dashboard", icon: FolderKanban },
            { name: "My Project", icon: CircuitBoard },
            { name: "Messages", icon: MessageSquare },
            { name: "Reports", icon: FileText },
            { name: "More", icon: Menu },
          ].map((item) => (
            <Pressable
              key={item.name}
              onPress={() =>
                item.name === "More" ? setMenu(true) : item.name !== "Dashboard" && open(item.name)
              }
              style={s.bottomItem}
            >
              <item.icon size={20} color={item.name === "Dashboard" ? "#526443" : "#7b8176"} />
              <AppText style={{ fontSize: 9, color: "#647357" }}>
                {item.name === "My Project"
                  ? "Project"
                  : item.name === "Dashboard"
                    ? "Home"
                    : item.name}
              </AppText>
            </Pressable>
          ))}
        </View>
      </ImageBackground>
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <View style={s.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Close navigation overlay"
            onPress={() => setMenu(false)}
          />
          <SafeAreaView style={s.drawer}>
            <View style={s.between}>
              <AppText variant="heading">LabAssist</AppText>
              <Pressable onPress={() => setMenu(false)} accessibilityLabel="Close menu">
                <X color="#526443" />
              </Pressable>
            </View>
            <AppText variant="caption" tone="muted">
              Build · Simulate · Learn
            </AppText>
            <ScrollView>
              {navigation.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => (name === "Dashboard" ? setMenu(false) : open(name))}
                  style={s.link}
                >
                  <AppText>{name}</AppText>
                  <ArrowUpRight size={14} />
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
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
              {purchase ? "Workshop Purchase Request" : destination}
            </AppText>
            <Pressable
              accessibilityLabel="Close details"
              onPress={() => {
                setPurchase(null);
                setDestination("");
              }}
            >
              <X color="#526443" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.content}>
            {purchase ? (
              <Paper>
                <AppText weight="bold">{purchase.name}</AppText>
                <AppText>
                  ${purchase.price} per unit · {purchase.stock} available
                </AppText>
                <AppText>Quantity</AppText>
                <TextInput
                  accessibilityLabel="Quantity"
                  keyboardType="number-pad"
                  value={quantity}
                  onChangeText={setQuantity}
                  style={s.input}
                />
                <AppText>
                  Estimated total ${(Number(quantity) * purchase.price || 0).toFixed(2)}
                </AppText>
                <AppText tone="muted">
                  Prepare a local draft. No purchase or stock reservation is made.
                </AppText>
                <Button
                  title="Save Purchase Draft"
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
                  accessibilityLabel="Issue description"
                  placeholder="Describe the issue"
                  value={issue}
                  onChangeText={setIssue}
                  style={s.input}
                />
                <Button
                  title="Add issue"
                  disabled={!issue.trim()}
                  onPress={() => {
                    workspace.addIssue(issue.trim());
                    setIssue("");
                    setDestination("");
                  }}
                />
              </Paper>
            ) : (
              <Paper>
                <AppText>
                  This destination is still being matched to the original screen in Native.
                </AppText>
                <AppText tone="muted">
                  The original website remains available for comparison. This is not a completed
                  screen yet.
                </AppText>
              </Paper>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eee8dc", overflow: 'hidden' },
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
  icon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
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
