import { useState } from "react";
import { ImageBackground, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Menu, X } from "lucide-react-native";
import { AppText, Button, LanguageToggle } from "@/components";
import { Chips, Field, Panel, kit } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { useLocalPreview } from "@/lib/useLocalPreview";
import { router } from "@/native/router";
type Account = {
  id: string;
  name: string;
  number: string;
  email: string;
  role: "student" | "supervisor" | "workshop";
  active: boolean;
};
type Group = { id: string; studentIds: string[]; supervisorIds: string[] };
export default function DepartmentScreen() {
  const { state } = useWorkspace();
  const { value: accounts, setValue: setAccounts } = useLocalPreview<Account[]>(
    "labassist.mobile.department.accounts",
    state.users.map((u, i) => ({
      id: u.id,
      name: u.name,
      number:
        u.universityNumber ??
        (u.role === "student"
          ? String(12000000 + i)
          : u.role === "supervisor"
            ? String(1000 + i)
            : "10001"),
      email: u.email,
      role: u.role,
      active: true,
    })),
  );
  const { value: groups, setValue: setGroups } = useLocalPreview<Group[]>(
    "labassist.mobile.department.groups",
    state.projects.map((p) => ({
      id: p.id,
      studentIds: p.studentIds,
      supervisorIds: p.supervisorIds,
    })),
  );
  const { value: messages, setValue: setMessages } = useLocalPreview<
    { id: string; person: string; body: string; time: string }[]
  >("labassist.mobile.department.messages", []);
  const [page, setPage] = useState("Overview"),
    [menu, setMenu] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [sheet, setSheet] = useState<"account" | "group" | null>(null),
    [editing, setEditing] = useState(""),
    [name, setName] = useState(""),
    [number, setNumber] = useState(""),
    [email, setEmail] = useState(""),
    [role, setRole] = useState<Account["role"]>("student"),
    [students, setStudents] = useState<string[]>([]),
    [supervisors, setSupervisors] = useState<string[]>([]),
    [error, setError] = useState(""),
    [recipient, setRecipient] = useState(""),
    [body, setBody] = useState("");
  const [removeId, setRemoveId] = useState("");
  const person = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  function edit(a?: Account) {
    setEditing(a?.id ?? "");
    setName(a?.name ?? "");
    setNumber(a?.number ?? "");
    setEmail(a?.email ?? "");
    setRole(a?.role ?? "supervisor");
    setError("");
    setSheet("account");
  }
  function saveAccount() {
    const length = role === "student" ? 8 : role === "supervisor" ? 4 : 5;
    if (!name.trim() || !new RegExp(`^\\d{${length}}$`).test(number))
      return setError(`Enter a name and a ${length}-digit university number.`);
    const address = role === "student" ? `s${number}@stu.najah.edu` : email.trim().toLowerCase();
    if (!/^[^@\s]+@najah\.edu$/.test(address) && role !== "student")
      return setError("Use a university email ending @najah.edu.");
    if (accounts.some((a) => a.id !== editing && (a.number === number || a.email === address)))
      return setError("This university number or email already exists.");
    if (
      role === "workshop" &&
      accounts.some((a) => a.id !== editing && a.role === "workshop" && a.active)
    )
      return setError("Only one workshop manager can be active.");
    const value = {
      id: editing || `account-${Date.now()}`,
      name: name.trim(),
      number,
      email: address,
      role,
      active: true,
    };
    setAccounts(
      editing ? accounts.map((a) => (a.id === editing ? value : a)) : [...accounts, value],
    );
    setSheet(null);
  }
  function saveGroup() {
    if (
      supervisors.some(
        (id) => groups.filter((g) => g.id !== editing && g.supervisorIds.includes(id)).length >= 4,
      )
    )
      return setError("A supervisor can supervise at most four teams.");
    if (students.length < 2 || students.length > 3 || !supervisors.length)
      return setError("Choose 2–3 students and at least one supervisor.");
    if (groups.some((g) => g.id !== editing && g.studentIds.some((id) => students.includes(id))))
      return setError("A selected student already belongs to another team.");
    const value = {
      id: editing || `group-${Date.now()}`,
      studentIds: students,
      supervisorIds: supervisors,
    };
    setGroups(editing ? groups.map((g) => (g.id === editing ? value : g)) : [...groups, value]);
    setSheet(null);
  }
  const toggle = (id: string, items: string[], set: (v: string[]) => void) =>
    set(items.includes(id) ? items.filter((x) => x !== id) : [...items, id]);
  return (
    <ImageBackground
      source={require("../../../assets/web/team-worktable-background.png")}
      style={{ flex: 1, overflow: "hidden" }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f5edcc" }}>
        <View style={[kit.row, { padding: 18 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open navigation"
            onPress={() => setMenu(true)}
          >
            <Menu color="#526443" />
          </Pressable>
          <AppText variant="title" style={{ flex: 1 }}>
            LabAssist
          </AppText>
          <LanguageToggle compact />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
          <AppText variant="title">{page}</AppText>
          <AppText tone="muted">Department Head</AppText>
          {page === "Overview" && (
            <>
              <View style={kit.wrap}>
                {[
                  ["Students", accounts.filter((a) => a.role === "student").length],
                  ["Supervisors", accounts.filter((a) => a.role === "supervisor").length],
                  ["Teams", groups.length],
                ].map(([label, value]) => (
                  <View key={label} style={{ width: "46%" }}>
                    <Panel>
                      <AppText variant="title">{value}</AppText>
                      <AppText>{label}</AppText>
                    </Panel>
                  </View>
                ))}
              </View>
              <Panel title="Manage the department">
                <Button title="Manage accounts" onPress={() => setPage("Accounts")} />
                <Button
                  title="Assign students & supervisors"
                  variant="soft"
                  onPress={() => setPage("Teams")}
                />
                <Button title="Contact staff" variant="ghost" onPress={() => setPage("Messages")} />
              </Panel>
            </>
          )}
          {page === "Accounts" && (
            <>
              <Button title="Add account" onPress={() => edit()} />
              <Field label="Search accounts" value={query} onChangeText={setQuery} />
              <Chips
                value={filter}
                onChange={setFilter}
                options={[
                  { id: "all", label: "All" },
                  { id: "student", label: "Students" },
                  { id: "supervisor", label: "Supervisors" },
                  { id: "workshop", label: "Workshop Manager" },
                ]}
              />
              {accounts
                .filter(
                  (a) =>
                    (filter === "all" || a.role === filter) &&
                    `${a.name} ${a.number} ${a.email}`.toLowerCase().includes(query.toLowerCase()),
                )
                .map((a) => (
                  <Panel key={a.id} title={a.name}>
                    <AppText>
                      {a.role} · {a.number}
                    </AppText>
                    <AppText variant="caption">{a.email}</AppText>
                    <AppText tone={a.active ? "primary" : "muted"}>
                      {a.active ? "Active" : "Disabled"}
                    </AppText>
                    <View style={kit.wrap}>
                      <Button title="Edit" size="sm" variant="soft" onPress={() => edit(a)} />
                      <Button
                        title="Remove"
                        size="sm"
                        variant="danger"
                        onPress={() => setRemoveId(a.id)}
                      />
                      <Button
                        title={a.active ? "Disable" : "Enable"}
                        size="sm"
                        variant="ghost"
                        onPress={() => {
                          if (
                            !a.active &&
                            a.role === "workshop" &&
                            accounts.some((x) => x.active && x.role === "workshop")
                          )
                            return setError("Disable the current workshop manager first.");
                          setAccounts(
                            accounts.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x)),
                          );
                        }}
                      />
                    </View>
                  </Panel>
                ))}
            </>
          )}
          {page === "Teams" && (
            <>
              <Button
                title="Create team"
                onPress={() => {
                  setEditing("");
                  setStudents([]);
                  setSupervisors([]);
                  setError("");
                  setSheet("group");
                }}
              />
              {groups.map((g, i) => (
                <Panel key={g.id} title={`Team ${i + 1}`}>
                  <AppText weight="bold">Students</AppText>
                  {g.studentIds.map((id) => (
                    <AppText key={id}>{person(id)}</AppText>
                  ))}
                  <AppText weight="bold">Supervisors</AppText>
                  {g.supervisorIds.map((id) => (
                    <AppText key={id}>{person(id)}</AppText>
                  ))}
                  <Button
                    title="Edit assignments"
                    variant="soft"
                    size="sm"
                    onPress={() => {
                      setEditing(g.id);
                      setStudents(g.studentIds);
                      setSupervisors(g.supervisorIds);
                      setError("");
                      setSheet("group");
                    }}
                  />
                </Panel>
              ))}
            </>
          )}
          {page === "Messages" && (
            <>
              <Panel title="Staff conversations">
                <Chips
                  value={recipient}
                  onChange={setRecipient}
                  options={accounts
                    .filter((a) => a.active && a.role !== "student")
                    .map((a) => ({ id: a.id, label: a.name }))}
                />
                {recipient && (
                  <>
                    {messages
                      .filter((m) => m.person === recipient)
                      .map((m) => (
                        <View
                          key={m.id}
                          style={{
                            padding: 14,
                            borderRadius: 18,
                            backgroundColor: "#e3ecd9",
                            marginLeft: 25,
                            gap: 5,
                          }}
                        >
                          <AppText>{m.body}</AppText>
                          <AppText variant="caption">{m.time}</AppText>
                        </View>
                      ))}
                    <Field
                      label={`Message ${person(recipient)}`}
                      value={body}
                      onChangeText={setBody}
                      multiline
                    />
                    <Button
                      title="Send"
                      disabled={!body.trim()}
                      onPress={() => {
                        setMessages([
                          ...messages,
                          {
                            id: String(Date.now()),
                            person: recipient,
                            body: body.trim(),
                            time: new Date().toLocaleTimeString(),
                          },
                        ]);
                        setBody("");
                      }}
                    />
                  </>
                )}
              </Panel>
            </>
          )}
          {!!error && !sheet && <AppText tone="danger">{error}</AppText>}
        </ScrollView>
        <Modal
          visible={menu}
          transparent
          animationType="fade"
          onRequestClose={() => setMenu(false)}
        >
          <View style={{ flex: 1, flexDirection: "row", backgroundColor: "#14261755" }}>
            <View
              style={{
                width: 290,
                backgroundColor: "#f6f7ee",
                padding: 22,
                paddingTop: 55,
                gap: 20,
              }}
            >
              <View style={kit.row}>
                <AppText variant="title" style={{ flex: 1 }}>
                  LabAssist
                </AppText>
                <Pressable onPress={() => setMenu(false)} accessibilityLabel="Close navigation">
                  <X color="#526443" />
                </Pressable>
              </View>
              {["Overview", "Accounts", "Teams", "Messages"].map((v) => (
                <Button
                  key={v}
                  title={v}
                  variant={page === v ? "primary" : "ghost"}
                  onPress={() => {
                    setPage(v);
                    setMenu(false);
                    setError("");
                  }}
                />
              ))}
              <Button
                title="Sign out"
                variant="ghost"
                onPress={() => router.replace("/native/login" as import("expo-router").Href)}
              />
            </View>
            <Pressable style={{ flex: 1 }} onPress={() => setMenu(false)} />
          </View>
        </Modal>
        <Modal visible={!!removeId} transparent onRequestClose={() => setRemoveId("")}>
          <View
            style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#15251988" }}
          >
            <Panel title="Remove account?">
              <AppText>
                Linked accounts are disabled to preserve project records. Unused accounts are
                removed.
              </AppText>
              <Button title="Cancel" variant="ghost" onPress={() => setRemoveId("")} />
              <Button
                title="Confirm removal"
                variant="danger"
                onPress={() => {
                  const linked =
                    groups.some(
                      (g) => g.studentIds.includes(removeId) || g.supervisorIds.includes(removeId),
                    ) || messages.some((m) => m.person === removeId);
                  setAccounts(
                    linked
                      ? accounts.map((a) => (a.id === removeId ? { ...a, active: false } : a))
                      : accounts.filter((a) => a.id !== removeId),
                  );
                  setRemoveId("");
                }}
              />
            </Panel>
          </View>
        </Modal>
        <Modal visible={!!sheet} onRequestClose={() => setSheet(null)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f6ee" }}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, gap: 16 }}
            >
              <Button title="Close" variant="ghost" onPress={() => setSheet(null)} />
              <AppText variant="title">
                {sheet === "account" ? "Account details" : "Team assignments"}
              </AppText>
              {sheet === "account" ? (
                <>
                  <Chips
                    value={role}
                    onChange={(v) => setRole(v as Account["role"])}
                    options={["student", "supervisor", "workshop"].map((id) => ({ id, label: id }))}
                  />
                  <Field label="Full name" value={name} onChangeText={setName} />
                  <Field
                    label="University number"
                    value={number}
                    onChangeText={setNumber}
                    keyboardType="number-pad"
                  />
                  {role === "student" ? (
                    <AppText>{`s${number}@stu.najah.edu`}</AppText>
                  ) : (
                    <Field
                      label="University email"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  )}
                  <AppText variant="caption" tone="muted">
                    Account activation is completed by the account holder. Passwords are not
                    assigned here.
                  </AppText>
                  <Button title="Save account" onPress={saveAccount} />
                </>
              ) : (
                <>
                  <AppText weight="bold">Select 2–3 students ({students.length})</AppText>
                  {accounts
                    .filter((a) => a.active && a.role === "student")
                    .map((a) => (
                      <Button
                        key={a.id}
                        title={`${students.includes(a.id) ? "✓ " : ""}${a.name} · ${a.number}`}
                        variant={students.includes(a.id) ? "soft" : "ghost"}
                        onPress={() => toggle(a.id, students, setStudents)}
                      />
                    ))}
                  <AppText weight="bold">Select supervisors</AppText>
                  {accounts
                    .filter((a) => a.active && a.role === "supervisor")
                    .map((a) => (
                      <Button
                        key={a.id}
                        title={`${supervisors.includes(a.id) ? "✓ " : ""}${a.name}`}
                        variant={supervisors.includes(a.id) ? "soft" : "ghost"}
                        onPress={() => toggle(a.id, supervisors, setSupervisors)}
                      />
                    ))}
                  <Button title="Save team" onPress={saveGroup} />
                </>
              )}
              {!!error && (
                <AppText tone="danger" accessibilityRole="alert">
                  {error}
                </AppText>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}
