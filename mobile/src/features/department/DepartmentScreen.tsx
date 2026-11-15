import { MobileInput as TextInput } from "@/components/MobileInput";
import { LabAssistBrand } from "@/components/LabAssistBrand";
import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { Disclosure } from "@/components/Disclosure";
import { MobileModal as Modal } from "@/components/MobileModal";
import { SignOutButton } from "@/components/SignOutButton";
import { useRef, useState, type ReactNode } from "react";
import { ImageBackground, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Menu, X, Users, FolderKanban, MessageSquare, Home } from "lucide-react-native";
import { AppText, Button, LanguageToggle } from "@/components";
import { Chips, Field, Panel, kit, useCopy } from "@/components/MobileKit";
import { useLanguage } from "@/i18n";
import { useWorkspace } from "@/state/WorkspaceProvider";
import {
  accountHasHistory,
  effectiveAccountStatus,
  toggleAccountAccess,
  demoSupervisor,
  demoTerm,
  createLocalId,
} from "../../../../shared/web/domain";
import {
  planImport,
  prepareGroupSave,
  projectNumber,
  scopeOf,
} from "../../../../shared/department/records";
import { mobileAccounts, webAccounts, type Account, type Group } from "./departmentData";
import { useDepartmentStore } from "./useDepartmentStore";
import { DepartmentImport } from "./DepartmentImport";
import { AccountCard, GroupCard, PersonRow, readableNumber } from "./DepartmentCards";

function Sheet({
  visible,
  title,
  children,
  onClose,
  busy,
}: {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy: boolean;
}) {
  const t = useCopy();
  const { isRTL } = useLanguage();
  return (
    <Modal
      visible={visible}
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#fafbf7", direction: isRTL ? "rtl" : "ltr" }}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 14 }}
        >
          <Button title={t("Close", "إغلاق")} variant="ghost" disabled={busy} onPress={onClose} />
          <AppText variant="title">{title}</AppText>
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
export default function DepartmentScreen() {
  const { state, retryLoading, storageRevision } = useWorkspace();
  const t = useCopy();
  const { isRTL } = useLanguage();
  const store = useDepartmentStore({
    accounts: state.users.map((u, i) => ({
      ...u,
      number:
        u.universityNumber ??
        (u.role === "student"
          ? String(12000000 + i)
          : u.role === "supervisor"
            ? u.id === "d1"
              ? demoSupervisor.number
              : String(1000 + i)
            : "10001"),
      active: true,
      status: "ACTIVE",
      linked: true,
    })),
    groups: state.projects.map((p) => ({ ...p, status: "DRAFT", termId: p.termId ?? demoTerm.id })),
    messages: [],
  });
  const { accounts, groups, messages, saving, ready, commit } = store;
  const [conversationOpen, setConversationOpen] = useState(false);
  const [page, setPage] = useState("Overview"),
    [menu, setMenu] = useState(false);
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [groupQuery, setGroupQuery] = useState("");
  const [accountDraft, setAccountDraft] = useState<Partial<Account> | null>(null),
    [groupDraft, setGroupDraft] = useState<Group | null>(null);
  const [peopleQuery, setPeopleQuery] = useState(""),
    [transferConsent, setTransferConsent] = useState<string | null>(null);
  const transferKey = JSON.stringify([storageRevision, groups]);
  const transfers = transferConsent === transferKey;
  const setTransfers = (confirmed: boolean) => setTransferConsent(confirmed ? transferKey : null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [change, setChange] = useState<{ id: string; action: "remove" | "access" } | null>(null);
  const [recipient, setRecipient] = useState(""),
    [body, setBody] = useState(""),
    [contactQuery, setContactQuery] = useState(""),
    [messageQuery, setMessageQuery] = useState(""),
    [starred, setStarred] = useState<string[]>([]),
    [contactFilter, setContactFilter] = useState("all"),
    [info, setInfo] = useState(false);
  const pending = useRef(false);
  const roleName = (role: Account["role"]) =>
    role === "student"
      ? t("Student", "طالب")
      : role === "supervisor"
        ? t("Supervisor", "مشرف")
        : t("Workshop Manager", "مدير الورشة");
  const matches = (account: Account, value: string) =>
    `${account.name} ${account.number} ${account.email}`
      .toLowerCase()
      .includes(value.trim().toLowerCase());
  const linked = (id: string) =>
    accounts.find((a) => a.id === id)?.linked ||
    accountHasHistory(id, groups) ||
    messages.some((m) => m.person === id) ||
    state.projects.some((p) => [...p.studentIds, ...p.supervisorIds].includes(id)) ||
    state.messages.some((m) => m.senderId === id) ||
    (state.users.some((u) => u.id === id && u.role === "workshop") && state.tools.length > 0);
  const openAccount = (a?: Account, role: Account["role"] = "supervisor") => {
    setAccountDraft(a ? { ...a } : { role });
    setError("");
  };
  const openGroup = (g?: Group) => {
    setGroupDraft(
      g
        ? { ...g, studentIds: [...g.studentIds], supervisorIds: [...g.supervisorIds] }
        : {
            id: createLocalId(),
            projectNumber: "",
            title: "",
            status: "DRAFT",
            termId: demoTerm.id,
            studentIds: [],
            supervisorIds: [],
          },
    );
    setPeopleQuery("");
    setTransfers(false);
    setError("");
  };
  async function saveAccount() {
    if (!accountDraft || pending.current || !ready || saving) return;
    setError("");
    const a = accountDraft,
      previous = accounts.find((person) => person.id === a.id),
      role = a.role ?? "supervisor";
    const number = a.number ?? "",
      name = a.name?.trim() ?? "",
      email =
        role === "student" ? `s${number}@stu.najah.edu` : (a.email ?? "").trim().toLowerCase();
    if (
      previous &&
      (previous.role !== role ||
        (role === "student" && previous.number !== number) ||
        previous.email !== a.email)
    )
      return setError(
        t(
          "Role, student number and email cannot be changed.",
          "لا يمكن تغيير الدور أو رقم الطالب أو البريد الإلكتروني.",
        ),
      );
    const length = role === "student" ? 8 : role === "supervisor" ? 4 : 5;
    if (!name || !new RegExp(`^\\d{${length}}$`).test(number) || !/^\S+@\S+\.\S+$/.test(email))
      return setError(
        t(
          `Enter a name, valid email and exactly ${length} digits.`,
          `أدخل اسمًا وبريدًا صحيحًا ورقمًا من ${length} خانات.`,
        ),
      );
    if (
      accounts.some(
        (person) =>
          person.id !== a.id && (person.number === number || person.email.toLowerCase() === email),
      )
    )
      return setError(t("This number or email already exists.", "الرقم أو البريد مستخدم بالفعل."));
    if (
      role === "workshop" &&
      (!previous || effectiveAccountStatus(previous) !== "DISABLED") &&
      accounts.some(
        (person) =>
          person.id !== a.id &&
          person.role === "workshop" &&
          effectiveAccountStatus(person) !== "DISABLED",
      )
    )
      return setError(t("Only one workshop manager is allowed.", "يسمح بمدير ورشة واحد فقط."));
    const next: Account = {
      ...previous,
      id: a.id || createLocalId(),
      name,
      number,
      email,
      role,
      active: previous?.active ?? false,
      status: previous ? effectiveAccountStatus(previous) : "PENDING_ACTIVATION",
      invited: previous?.invited ?? false,
      linked: previous?.linked ?? false,
    };
    pending.current = true;
    try {
      if (
        await commit({
          accounts: previous
            ? accounts.map((person) => (person.id === next.id ? next : person))
            : [...accounts, next],
        })
      ) {
        setAccountDraft(null);
        setNotice(t("Account saved.", "تم حفظ الحساب."));
      } else setError(t("Could not save. Your input is preserved.", "تعذر الحفظ. بياناتك محفوظة."));
    } finally {
      pending.current = false;
    }
  }
  async function saveGroup() {
    if (!groupDraft || pending.current || !ready || saving) return;
    setError("");
    pending.current = true;
    try {
      const previous = store.current.current.groups.find((g) => g.id === groupDraft.id);
      const next = {
        ...previous,
        ...groupDraft,
        projectNumber: groupDraft.projectNumber?.trim() || projectNumber(groupDraft),
        title: groupDraft.title?.trim(),
      };
      const nextGroups = prepareGroupSave(
        next,
        store.current.current.groups,
        webAccounts(store.current.current.accounts),
        transfers,
        "pending-drafts",
      );
      const referenced = new Set(nextGroups.flatMap((g) => [...g.studentIds, ...g.supervisorIds]));
      if (
        await commit({
          groups: nextGroups,
          accounts: accounts.map((a) => (referenced.has(a.id) ? { ...a, linked: true } : a)),
        })
      ) {
        setGroupDraft(null);
        setNotice(t("Group saved.", "تم حفظ المجموعة."));
      } else
        setError(
          t("Could not save. Your selections are preserved.", "تعذر الحفظ. اختياراتك محفوظة."),
        );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("Could not save group.", "تعذر حفظ المجموعة."),
      );
    } finally {
      pending.current = false;
    }
  }
  async function confirmChange() {
    if (!change || pending.current || saving || !ready) return;
    setError("");
    const account = accounts.find((a) => a.id === change.id);
    if (!account) return;
    pending.current = true;
    try {
      const protect = linked(account.id);
      const next =
        change.action === "access"
          ? accounts.map((a) => (a.id === account.id ? toggleAccountAccess(a) : a))
          : protect
            ? accounts.map((a) =>
                a.id === account.id
                  ? effectiveAccountStatus(a) === "DISABLED"
                    ? a
                    : toggleAccountAccess(a)
                  : a,
              )
            : accounts.filter((a) => a.id !== account.id);
      if (
        next.filter((a) => a.role === "workshop" && effectiveAccountStatus(a) !== "DISABLED")
          .length > 1
      ) {
        setError(t("Disable the current workshop manager first.", "عطّل مدير الورشة الحالي أولًا."));
        return;
      }
      if (await commit({ accounts: next })) {
        setChange(null);
        setNotice(t("Account updated.", "تم تحديث الحساب."));
      } else setError(t("Could not save. Please retry.", "تعذر الحفظ. أعد المحاولة."));
    } finally {
      pending.current = false;
    }
  }
  const sources = groupDraft
    ? groups.filter(
        (g) =>
          g.id !== groupDraft.id &&
          g.status !== "ARCHIVED" &&
          scopeOf(g) === scopeOf(groupDraft) &&
          g.studentIds.some((id) => groupDraft.studentIds.includes(id)),
      )
    : [];
  const contact = accounts.find((a) => a.id === recipient);
  const filteredAccounts = accounts.filter(
    (a) => (filter === "all" || filter === a.role) && matches(a, query),
  );
  const filteredGroups = groups.filter((g) =>
    [
      projectNumber(g),
      g.title,
      ...[...g.studentIds, ...g.supervisorIds].map((id) => {
        const a = accounts.find((person) => person.id === id);
        return a ? `${a.name} ${a.number} ${a.email}` : "";
      }),
    ]
      .join(" ")
      .toLowerCase()
      .includes(groupQuery.trim().toLowerCase()),
  );
  const pageName = (name: string) =>
    ({
      Overview: t("Overview", "نظرة عامة"),
      Accounts: t("Accounts", "الحسابات"),
      Teams: t("Groups", "المجموعات"),
      Messages: t("Communication", "التواصل"),
    })[name] ?? name;
  const retry = (
    <Button
      title={t("Retry loading", "إعادة التحميل")}
      variant="ghost"
      disabled={saving}
      onPress={retryLoading}
    />
  );
  return (
    <ImageBackground
      source={require("../../../assets/web/team-worktable-background.png")}
      style={{ flex: 1, overflow: "hidden" }}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#ffffffb8", direction: isRTL ? "rtl" : "ltr" }}
      >
        <View style={[kit.row, { padding: 12, flexWrap: "nowrap", gap: 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Open navigation", "فتح القائمة")}
            onPress={() => setMenu(true)}
            style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Menu color="#526443" />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <LabAssistBrand size={18} />
          </View>
          <LanguageToggle compact />
        </View>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 18, gap: 14 }}
        >
          <AppText variant="heading">{pageName(page)}</AppText>
          {!ready && !store.error && (
            <AppText>{t("Loading saved records…", "جارٍ تحميل السجلات…")}</AppText>
          )}
          {!!store.error && (
            <View>
              <AppText tone="danger" accessibilityRole="alert">
                {store.error}
              </AppText>
              {retry}
            </View>
          )}
          {!!notice && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Dismiss notice", "إخفاء الإشعار")}
              onPress={() => setNotice("")}
            >
              <AppText tone="primary">{notice}</AppText>
            </Pressable>
          )}
          {page === "Overview" && (
            <>
              <View style={kit.wrap}>
                {[
                  [t("Students", "الطلاب"), accounts.filter((a) => a.role === "student").length],
                  [
                    t("Supervisors", "المشرفون"),
                    accounts.filter((a) => a.role === "supervisor").length,
                  ],
                  [t("Groups", "المجموعات"), groups.length],
                ].map(([label, count]) => (
                  <View key={label} style={{ width: "46%" }}>
                    <Panel>
                      <AppText variant="title">{count}</AppText>
                      <AppText>{label}</AppText>
                    </Panel>
                  </View>
                ))}
              </View>
              <Panel title={t("Manage the department", "إدارة القسم")}>
                <Button
                  title={t("Manage accounts", "إدارة الحسابات")}
                  onPress={() => setPage("Accounts")}
                />
                <Button
                  title={t("Manage groups", "إدارة المجموعات")}
                  variant="soft"
                  onPress={() => setPage("Teams")}
                />
                <Button
                  title={t("Messages", "الرسائل")}
                  variant="ghost"
                  onPress={() => setPage("Messages")}
                />
              </Panel>
            </>
          )}
          {(page === "Accounts" || page === "Teams") && (
            <DepartmentImport
              accounts={accounts}
              groups={groups}
              ready={ready}
              saving={saving}
              storageError={store.error}
              onRetry={retryLoading}
              revision={storageRevision}
              onConfirm={async (book, mapping, keep, move) => {
                const latest = store.current.current;
                const review = planImport(
                  book,
                  mapping,
                  webAccounts(latest.accounts),
                  latest.groups,
                  keep,
                  move,
                  "pending-drafts",
                );
                if (review.errors.length || review.rows.some((r) => r.errors.length)) return review;
                if (
                  !(await commit({
                    accounts: mobileAccounts(review.accounts),
                    groups: review.groups,
                  }))
                )
                  return false;
                setGroupQuery("");
                setPage("Teams");
                setNotice(t("Groups added.", "تمت إضافة المجموعات."));
                return review;
              }}
            />
          )}
          {page === "Accounts" && (
            <>
              <Button
                title={t("Add account", "إضافة حساب")}
                disabled={!ready || saving}
                onPress={() =>
                  openAccount(
                    undefined,
                    filter === "student" || filter === "workshop" ? filter : "supervisor",
                  )
                }
              />
              <Field
                label={t("Search accounts", "بحث في الحسابات")}
                value={query}
                onChangeText={setQuery}
              />
              <Chips
                value={filter}
                onChange={setFilter}
                options={[
                  { id: "all", label: t("All", "الكل") },
                  ...(["supervisor", "student", "workshop"] as const).map((role) => ({
                    id: role,
                    label: `${roleName(role)} (${accounts.filter((a) => a.role === role).length})`,
                  })),
                ]}
              />
              {!filteredAccounts.length && (
                <AppText tone="muted">
                  {t("No matching accounts.", "لا توجد حسابات مطابقة.")}
                </AppText>
              )}
              {filteredAccounts.map((a) => (
                <AccountCard
                  key={a.id}
                  account={a}
                  accounts={accounts}
                  groups={groups}
                  actions={
                    <>
                      <Button
                        title={t("Edit", "تعديل")}
                        size="sm"
                        variant="soft"
                        disabled={!ready || saving}
                        onPress={() => openAccount(a)}
                      />
                      <Button
                        title={t("Message", "رسالة")}
                        size="sm"
                        variant="ghost"
                        onPress={() => {
                          setRecipient(a.id);
                          setConversationOpen(true);
                          setPage("Messages");
                        }}
                      />
                      <Button
                        title={
                          effectiveAccountStatus(a) === "DISABLED"
                            ? t("Reactivate", "إعادة تفعيل")
                            : t("Disable", "تعطيل")
                        }
                        size="sm"
                        variant="ghost"
                        disabled={!ready || saving}
                        onPress={() => {
                          setChange({ id: a.id, action: "access" });
                          setError("");
                        }}
                      />
                      {!linked(a.id) && (
                        <Button
                          title={t("Delete", "حذف")}
                          size="sm"
                          variant="danger"
                          disabled={!ready || saving}
                          onPress={() => {
                            setChange({ id: a.id, action: "remove" });
                            setError("");
                          }}
                        />
                      )}
                    </>
                  }
                />
              ))}
            </>
          )}
          {page === "Teams" && (
            <>
              <Button
                title={t("Add group", "إضافة مجموعة")}
                disabled={!ready || saving}
                onPress={() => openGroup()}
              />
              <Field
                label={t("Search groups", "بحث في المجموعات")}
                value={groupQuery}
                onChangeText={setGroupQuery}
              />
              {!filteredGroups.length && (
                <AppText tone="muted">
                  {t("No matching groups.", "لا توجد مجموعات مطابقة.")}
                </AppText>
              )}
              {filteredGroups.map((g) => (
                <GroupCard
                  key={g.id}
                  group={g}
                  accounts={accounts}
                  saving={saving || !ready}
                  onEdit={() => openGroup(g)}
                />
              ))}
            </>
          )}
          {page === "Messages" && (
            <>
              <Field
                label={t("Search conversations", "بحث في المحادثات")}
                value={contactQuery}
                onChangeText={setContactQuery}
              />
              <Chips
                value={contactFilter}
                onChange={setContactFilter}
                options={[
                  { id: "all", label: t("All", "الكل") },
                  { id: "starred", label: t("Starred", "المفضلة") },
                ]}
              />
              {accounts
                .filter(
                  (a) =>
                    matches(a, contactQuery) &&
                    (contactFilter !== "starred" || starred.includes(a.id)),
                )
                .map((a) => (
                  <Pressable
                    key={a.id}
                    accessibilityRole="button"
                    accessibilityLabel={a.name}
                    onPress={() => {
                      setRecipient(a.id);
                      setInfo(false);
                      setConversationOpen(true);
                    }}
                    style={{
                      minHeight: 76,
                      borderBottomWidth: 1,
                      borderColor: "#e5eadf",
                      paddingVertical: 12,
                      gap: 4,
                    }}
                  >
                    <PersonRow person={a} compact />
                    <AppText numberOfLines={1} variant="caption" tone="muted">
                      {messages.filter((m) => m.person === a.id).at(-1)?.body ??
                        t(
                          "Start a conversation",
                          "\u0627\u0628\u062f\u0623 \u0645\u062d\u0627\u062f\u062b\u0629",
                        )}
                    </AppText>
                  </Pressable>
                ))}
              {!accounts.some(
                (a) =>
                  matches(a, contactQuery) &&
                  (contactFilter !== "starred" || starred.includes(a.id)),
              ) && <AppText>{t("No conversations found.", "لا توجد محادثات.")}</AppText>}
              <Modal
                visible={conversationOpen && !!contact}
                animationType="slide"
                onRequestClose={() => setConversationOpen(false)}
              >
                <SafeAreaView
                  style={{ flex: 1, backgroundColor: "#fff", direction: isRTL ? "rtl" : "ltr" }}
                >
                  <View
                    style={[kit.row, { padding: 12, borderBottomWidth: 1, borderColor: "#e5eadf" }]}
                  >
                    <Button
                      title={t("Back", "\u0631\u062c\u0648\u0639")}
                      variant="ghost"
                      onPress={() => setConversationOpen(false)}
                    />
                    <AppText variant="heading" style={{ flex: 1 }}>
                      {contact?.name}
                    </AppText>
                  </View>
                  {contact && (
                    <>
                      <View style={{ paddingHorizontal: 16 }}>
                        <Disclosure
                          title={t(
                            "Conversation details",
                            "\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629",
                          )}
                        >
                          <View style={kit.wrap}>
                            <Button
                              title={
                                starred.includes(contact.id)
                                  ? t("Unstar", "إزالة من المفضلة")
                                  : t("Star", "إضافة للمفضلة")
                              }
                              variant="ghost"
                              size="sm"
                              onPress={() =>
                                setStarred(
                                  starred.includes(contact.id)
                                    ? starred.filter((id) => id !== contact.id)
                                    : [...starred, contact.id],
                                )
                              }
                            />
                            <Button
                              title={t("Contact information", "معلومات جهة الاتصال")}
                              variant="ghost"
                              size="sm"
                              onPress={() => setInfo(!info)}
                            />
                          </View>
                          {info && <PersonRow person={contact} />}
                          <Field
                            label={t("Search messages", "بحث في الرسائل")}
                            value={messageQuery}
                            onChangeText={setMessageQuery}
                          />
                        </Disclosure>
                      </View>
                      <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
                      >
                        {!messages.some(
                          (m) =>
                            m.person === recipient &&
                            m.body.toLowerCase().includes(messageQuery.toLowerCase()),
                        ) && (
                          <AppText tone="muted">
                            {t("No messages yet.", "لا توجد رسائل بعد.")}
                          </AppText>
                        )}
                        {messages
                          .filter(
                            (m) =>
                              m.person === recipient &&
                              m.body.toLowerCase().includes(messageQuery.toLowerCase()),
                          )
                          .map((m) => (
                            <View
                              key={m.id}
                              style={{
                                padding: 12,
                                backgroundColor: "#e3ecd9",
                                borderRadius: 14,
                                gap: 4,
                              }}
                            >
                              <AppText>{m.body}</AppText>
                              <AppText variant="caption">{m.time}</AppText>
                            </View>
                          ))}
                      </ScrollView>
                      <View
                        style={{ padding: 12, gap: 8, borderTopWidth: 1, borderColor: "#e5eadf" }}
                      >
                        {!!(error || store.error) && (
                          <AppText tone="danger" accessibilityRole="alert">
                            {error || store.error}
                          </AppText>
                        )}
                        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                          <TextInput
                            accessibilityLabel={t(
                              "Message",
                              "\u0627\u0644\u0631\u0633\u0627\u0644\u0629",
                            )}
                            placeholder={t(
                              "Write a message",
                              "\u0627\u0643\u062a\u0628 \u0631\u0633\u0627\u0644\u0629",
                            )}
                            value={body}
                            onChangeText={setBody}
                            multiline
                            maxLength={4000}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              minHeight: 48,
                              maxHeight: 104,
                              padding: 12,
                              backgroundColor: "#f4f7ef",
                              borderRadius: 18,
                            }}
                          />
                          <Button
                            title={t("Send", "إرسال")}
                            loading={saving}
                            disabled={!ready || !body.trim()}
                            onPress={async () => {
                              if (pending.current || !body.trim()) return;
                              setError("");
                              pending.current = true;
                              try {
                                if (
                                  await commit({
                                    messages: [
                                      ...store.current.current.messages,
                                      {
                                        id: createLocalId(),
                                        person: recipient,
                                        body: body.trim(),
                                        time: new Date().toLocaleString(),
                                        at: new Date().toISOString(),
                                      },
                                    ],
                                  })
                                )
                                  setBody("");
                                else
                                  setError(
                                    t(
                                      "Could not send. Your message is preserved.",
                                      "تعذر الإرسال. رسالتك محفوظة.",
                                    ),
                                  );
                              } finally {
                                pending.current = false;
                              }
                            }}
                          />
                        </View>
                      </View>
                    </>
                  )}
                </SafeAreaView>
              </Modal>
            </>
          )}
          {!!error && !accountDraft && !groupDraft && !change && (
            <AppText tone="danger" accessibilityRole="alert">
              {error}
            </AppText>
          )}
        </ScrollView>
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: "row",
            backgroundColor: "#fffffff5",
            borderTopWidth: 1,
            borderColor: "#e1e7d9",
            padding: 4,
          }}
        >
          {[
            { name: "Overview", icon: Home },
            { name: "Accounts", icon: Users },
            { name: "Teams", icon: FolderKanban },
            { name: "Messages", icon: MessageSquare },
          ].map(({ name, icon: Icon }) => (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityLabel={
                name === "Messages"
                  ? t("Messages", "\u0627\u0644\u0631\u0633\u0627\u0626\u0644")
                  : pageName(name)
              }
              accessibilityState={{ selected: page === name }}
              onPress={() => {
                setPage(name);
                setError("");
              }}
              style={{
                flex: 1,
                minHeight: 56,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 12,
                gap: 3,
                backgroundColor: page === name ? "#edf2e5" : "transparent",
              }}
            >
              <Icon color="#526443" size={21} />
              <AppText align="center" style={{ fontSize: 12 }}>
                {name === "Messages"
                  ? t("Messages", "\u0627\u0644\u0631\u0633\u0627\u0626\u0644")
                  : pageName(name)}
              </AppText>
            </Pressable>
          ))}
        </View>
        <Modal
          visible={menu}
          transparent
          animationType="fade"
          onRequestClose={() => setMenu(false)}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              backgroundColor: "#14261755",
              direction: isRTL ? "rtl" : "ltr",
            }}
          >
            <SafeAreaView
              style={{
                width: "85%",
                maxWidth: 330,
                backgroundColor: "#f6f7ee",
                padding: 22,
                gap: 20,
              }}
            >
              <View style={kit.row}>
                <AppText variant="title" style={{ flex: 1 }}>
                  LabAssist
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Close navigation", "إغلاق القائمة")}
                  onPress={() => setMenu(false)}
                >
                  <X color="#526443" />
                </Pressable>
              </View>
              <ScrollView
                automaticallyAdjustKeyboardInsets
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ gap: 12 }}
              >
                {["Overview", "Accounts", "Teams", "Messages"].map((name) => (
                  <Button
                    key={name}
                    title={pageName(name)}
                    variant={page === name ? "primary" : "ghost"}
                    onPress={() => {
                      setPage(name);
                      setMenu(false);
                      setError("");
                    }}
                  />
                ))}
                <SignOutButton />
              </ScrollView>
            </SafeAreaView>
            <Pressable
              accessibilityLabel={t("Close navigation", "إغلاق القائمة")}
              style={{ flex: 1 }}
              onPress={() => setMenu(false)}
            />
          </View>
        </Modal>
        <Sheet
          visible={!!accountDraft}
          title={t("Account details", "تفاصيل الحساب")}
          busy={saving}
          onClose={() => setAccountDraft(null)}
        >
          {!!accountDraft && (
            <>
              <Chips
                value={accountDraft.role ?? "supervisor"}
                onChange={(role) => {
                  if (!accountDraft.id)
                    setAccountDraft({ ...accountDraft, role: role as Account["role"] });
                }}
                options={(["student", "supervisor", "workshop"] as const).map((role) => ({
                  id: role,
                  label: roleName(role),
                }))}
              />
              <Field
                label={t("Full name", "الاسم الكامل")}
                value={accountDraft.name ?? ""}
                onChangeText={(name) => setAccountDraft({ ...accountDraft, name })}
              />
              <Field
                label={t("University / employee number", "الرقم الجامعي / الوظيفي")}
                value={accountDraft.number ?? ""}
                editable={!accountDraft.id || accountDraft.role !== "student"}
                keyboardType="number-pad"
                maxLength={
                  accountDraft.role === "student" ? 8 : accountDraft.role === "supervisor" ? 4 : 5
                }
                onChangeText={(number) => setAccountDraft({ ...accountDraft, number })}
              />
              {accountDraft.role === "student" ? (
                <AppText>
                  {accountDraft.number
                    ? `s${accountDraft.number}@stu.najah.edu`
                    : t(
                        "University email is generated from the student number.",
                        "يُنشأ البريد الجامعي من رقم الطالب.",
                      )}
                </AppText>
              ) : (
                <Field
                  label={t("Email", "البريد الإلكتروني")}
                  value={accountDraft.email ?? ""}
                  editable={!accountDraft.id}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={(email) => setAccountDraft({ ...accountDraft, email })}
                />
              )}
              {!!error && (
                <AppText tone="danger" accessibilityRole="alert">
                  {error}
                </AppText>
              )}
              {!!store.error && (
                <>
                  <AppText tone="danger">{store.error}</AppText>
                  {retry}
                </>
              )}
              <Button
                title={t("Save account", "حفظ الحساب")}
                disabled={!ready}
                loading={saving}
                onPress={saveAccount}
              />
            </>
          )}
        </Sheet>
        <Sheet
          visible={!!groupDraft && !accountDraft}
          title={t("Group details", "تفاصيل المجموعة")}
          busy={saving}
          onClose={() => setGroupDraft(null)}
        >
          {!!groupDraft && (
            <>
              <Field
                label={t("Project number", "رقم المشروع")}
                value={groupDraft.projectNumber ?? readableNumber(groupDraft)}
                onChangeText={(projectNumber) => setGroupDraft({ ...groupDraft, projectNumber })}
              />
              <Field
                label={t("Project name (optional)", "اسم المشروع (اختياري)")}
                value={groupDraft.title ?? ""}
                onChangeText={(title) => setGroupDraft({ ...groupDraft, title })}
              />
              <Field
                label={t("Find people", "البحث عن أشخاص")}
                value={peopleQuery}
                onChangeText={setPeopleQuery}
              />
              {(["student", "supervisor"] as const).map((role) => {
                const key = role === "student" ? "studentIds" : "supervisorIds";
                const eligible = accounts.filter(
                  (a) =>
                    a.role === role &&
                    matches(a, peopleQuery) &&
                    (groupDraft[key].includes(a.id) ||
                      effectiveAccountStatus(a) === "ACTIVE" ||
                      ((groupDraft.status ?? "DRAFT") === "DRAFT" &&
                        effectiveAccountStatus(a) === "PENDING_ACTIVATION")),
                );
                return (
                  <View key={role} style={{ gap: 8 }}>
                    <AppText weight="bold">
                      {roleName(role)} · {groupDraft[key].length}
                      {role === "student" ? "/3" : ""}
                    </AppText>
                    <Button
                      title={t("Create missing account", "إنشاء حساب جديد")}
                      variant="soft"
                      size="sm"
                      onPress={() => openAccount(undefined, role)}
                    />
                    {!eligible.length && (
                      <AppText>{t("No matching accounts.", "لا توجد حسابات مطابقة.")}</AppText>
                    )}
                    {eligible.map((a) => (
                      <Button
                        key={a.id}
                        title={`${groupDraft[key].includes(a.id) ? "✓ " : ""}${a.name} · ${a.number}`}
                        accessibilityState={{ selected: groupDraft[key].includes(a.id) }}
                        variant={groupDraft[key].includes(a.id) ? "soft" : "ghost"}
                        disabled={
                          role === "student" &&
                          groupDraft.studentIds.length >= 3 &&
                          !groupDraft.studentIds.includes(a.id)
                        }
                        onPress={() => {
                          setGroupDraft({
                            ...groupDraft,
                            [key]: groupDraft[key].includes(a.id)
                              ? groupDraft[key].filter((id) => id !== a.id)
                              : [...groupDraft[key], a.id],
                          });
                          setTransfers(false);
                        }}
                      />
                    ))}
                  </View>
                );
              })}
              {sources.length > 0 && (
                <Panel title={t("Confirm student transfers", "تأكيد نقل الطلاب")}>
                  {sources.map((source) => (
                    <AppText key={source.id}>
                      {readableNumber(source) ||
                        source.title ||
                        t("Untitled project", "مشروع بلا اسم")}
                      :{" "}
                      {source.studentIds
                        .filter((id) => groupDraft.studentIds.includes(id))
                        .map((id) => accounts.find((a) => a.id === id)?.name)
                        .join(", ")}
                    </AppText>
                  ))}
                  <Button
                    title={
                      transfers
                        ? t("Transfers confirmed", "تم تأكيد النقل")
                        : t("Confirm transfers", "تأكيد النقل")
                    }
                    variant="soft"
                    onPress={() => setTransfers(!transfers)}
                  />
                </Panel>
              )}
              {!!error && (
                <AppText tone="danger" accessibilityRole="alert">
                  {error}
                </AppText>
              )}
              {!!store.error && (
                <>
                  <AppText tone="danger">{store.error}</AppText>
                  {retry}
                </>
              )}
              <Button
                title={t("Save group", "حفظ المجموعة")}
                disabled={!ready}
                loading={saving}
                onPress={saveGroup}
              />
            </>
          )}
        </Sheet>
        <Sheet
          visible={!!change}
          title={
            change?.action === "remove"
              ? t("Delete account?", "حذف الحساب؟")
              : t("Change account availability?", "تغيير حالة الحساب؟")
          }
          busy={saving}
          onClose={() => setChange(null)}
        >
          <AppText>
            {t(
              "Existing group and message records will be preserved.",
              "ستبقى سجلات المجموعات والرسائل محفوظة.",
            )}
          </AppText>
          {!!error && (
            <AppText tone="danger" accessibilityRole="alert">
              {error}
            </AppText>
          )}
          {!!store.error && (
            <>
              <AppText tone="danger">{store.error}</AppText>
              {retry}
            </>
          )}
          <Button
            title={t("Confirm", "تأكيد")}
            disabled={!ready}
            loading={saving}
            onPress={confirmChange}
          />
        </Sheet>
      </SafeAreaView>
    </ImageBackground>
  );
}
