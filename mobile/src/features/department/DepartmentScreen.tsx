import { MobileInput as TextInput } from "@/components/MobileInput";
import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { Disclosure } from "@/components/Disclosure";
import { MobileModal as Modal } from "@/components/MobileModal";
import { MessageBubble } from "@/components/MessageBubble";
import {
  ConversationInboxRow,
  ConversationHeader,
  ConversationComposer,
  ConversationComposerRow,
  ConversationText,
} from "@/components/ConversationUI";
import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText, Button } from "@/components";
import { AppHeader, MoreMenu, NotificationsButton, ShellFrame, TabBar } from "@/native/AppShell";
import { findNavItem, roleTabs } from "@/native/navigationItems";
import {
  Chips,
  Field,
  Panel,
  kit,
  useCopy,
  errorText,
  SearchField,
  ActionSheet,
  FormSheet,
  Greeting,
  StatGrid,
} from "@/components/MobileKit";
import { directionStyle, useLanguage } from "@/i18n";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { useLocalPreview } from "@/lib/useLocalPreview";
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
import { departmentHead } from "./departmentIdentity";
import { ProfilePanel } from "@/features/shared/AccountPanels";
import { StudentSettings } from "@/features/student/StudentSettings";
import { DepartmentImport } from "./DepartmentImport";
import {
  AccountAssignments,
  AccountRow,
  GroupRow,
  GroupPeople,
  PersonRow,
  PersonAvatar,
  readableNumber,
  statusLabel,
} from "./DepartmentCards";
import {
  Ban,
  GraduationCap,
  LayoutGrid,
  MessageSquare,
  Pencil,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react-native";

/** Department forms use the shared FormSheet: close X, one scrolling body, save footer. */
function Sheet({
  visible,
  title,
  children,
  onClose,
  busy,
  footer,
}: {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy: boolean;
  footer?: ReactNode;
}) {
  return (
    <FormSheet visible={visible} title={title} busy={busy} onClose={onClose} footer={footer}>
      {children}
    </FormSheet>
  );
}
export default function DepartmentScreen() {
  const { state, retryLoading, storageRevision } = useWorkspace();
  const t = useCopy();
  const { isRTL, language, ltr, formatDateTime } = useLanguage();
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
  const conversationScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const departmentHistory = useCallback(
    () =>
      conversationScroll.current ??
      (Platform.OS === "web"
        ? (document.querySelector('[data-testid="department-history"]') as unknown as ComponentRef<
            typeof ScrollView
          > | null)
        : null),
    [],
  );
  const conversationNearBottom = useRef(true);
  const conversationInitialScroll = useRef(true);
  const [newConversationMessages, setNewConversationMessages] = useState(false);
  const [page, setPage] = useState("Overview");
  const [notificationReturn, setNotificationReturn] = useState("Overview");
  const subPage = page === "profile" || page === "settings" || page === "notifications";
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
  const [accountMenu, setAccountMenu] = useState<string | null>(null),
    [assignmentsFor, setAssignmentsFor] = useState<string | null>(null);
  const [groupMenu, setGroupMenu] = useState<string | null>(null),
    [groupDetails, setGroupDetails] = useState<string | null>(null);
  const [change, setChange] = useState<{ id: string; action: "remove" | "access" } | null>(null);
  const [recipient, setRecipient] = useState(""),
    [body, setBody] = useState(""),
    [contactQuery, setContactQuery] = useState(""),
    [messageQuery, setMessageQuery] = useState(""),
    [contactFilter, setContactFilter] = useState("all"),
    [info, setInfo] = useState(false);
  const {
    value: starred,
    setValue: setStarred,
    ready: starsReady,
    error: starsError,
  } = useLocalPreview<string[]>("labassist.mobile.department.contact-stars.v1", []);
  const conversationMessageCount = messages.filter(
    (message) => message.person === recipient,
  ).length;
  const previousConversation = useRef({ recipient: "", count: 0 });
  useEffect(() => {
    const previous = previousConversation.current;
    if (
      previous.recipient === recipient &&
      conversationMessageCount > previous.count &&
      !conversationNearBottom.current
    )
      setNewConversationMessages(true);
    previousConversation.current = { recipient, count: conversationMessageCount };
  }, [recipient, conversationMessageCount]);
  useEffect(() => {
    if (!conversationOpen || !recipient) return;
    conversationInitialScroll.current = true;
    conversationNearBottom.current = true;
    const timer = setTimeout(() => {
      departmentHistory()?.scrollToEnd({ animated: false });
      conversationInitialScroll.current = false;
    }, 200);
    return () => clearTimeout(timer);
  }, [conversationOpen, recipient, departmentHistory]);
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
  const menuAccount = accounts.find((a) => a.id === accountMenu);
  const menuGroup = groups.find((g) => g.id === groupMenu);
  const detailsGroup = groups.find((g) => g.id === groupDetails);
  const assignmentsAccount = accounts.find((a) => a.id === assignmentsFor);
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
  const retry = (
    <Button
      title={t("Retry loading", "إعادة التحميل")}
      variant="ghost"
      disabled={saving}
      onPress={retryLoading}
    />
  );
  return (
    <ShellFrame
      backgroundColor="#f7f6ef"
      header={
        subPage ? (
          <AppHeader
            title={
              page === "notifications"
                ? t("Notifications", "الإشعارات")
                : (findNavItem("department", page)?.[language] ?? page)
            }
            onBack={() => setPage(page === "notifications" ? notificationReturn : "more")}
          />
        ) : (
          <AppHeader
            brand
            title={findNavItem("department", page)?.[language] ?? page}
            trailing={
              <NotificationsButton
                role="department"
                onPress={() => {
                  setNotificationReturn(page);
                  setPage("notifications");
                }}
              />
            }
          />
        )
      }
      tabBar={
        <TabBar
          items={roleTabs.department}
          active={page === "notifications" ? notificationReturn : subPage ? "more" : page}
          onSelect={(id) => {
            setPage(id);
            setError("");
          }}
        />
      }
    >
      {page === "more" ? (
        // Department sections are tabs; More holds the account rows and Log out.
        <MoreMenu role="department" onOpen={setPage} />
      ) : subPage ? (
        // Profile and Settings for the Department Head only (no workspace account data).
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
          {page === "notifications" ? (
            <Panel>
              <AppText>
                {t("No Department notifications are available.", "لا توجد إشعارات متاحة للقسم.")}
              </AppText>
            </Panel>
          ) : page === "profile" ? (
            <ProfilePanel identity={departmentHead} />
          ) : (
            <StudentSettings identity={false} />
          )}
        </ScrollView>
      ) : (
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 28 }}
        >
          {!ready && !store.error && (
            <AppText>{t("Loading saved records…", "جارٍ تحميل السجلات…")}</AppText>
          )}
          {!!store.error && (
            <View>
              <AppText tone="danger" accessibilityRole="alert">
                {errorText(t, store.error)}
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
              <Greeting
                name={departmentHead.name?.trim() || t("Department Head", "رئيس القسم")}
                subtitle={t("Accounts, groups and messages", "الحسابات والمجموعات والرسائل")}
              />
              <StatGrid
                items={[
                  {
                    id: "students",
                    icon: GraduationCap,
                    tone: "olive",
                    label: t("Students", "الطلاب"),
                    value: accounts.filter((a) => a.role === "student").length,
                    onPress: () => {
                      setFilter("student");
                      setPage("Accounts");
                    },
                  },
                  {
                    id: "supervisors",
                    icon: UserRound,
                    tone: "blue",
                    label: t("Supervisors", "المشرفون"),
                    value: accounts.filter((a) => a.role === "supervisor").length,
                    onPress: () => {
                      setFilter("supervisor");
                      setPage("Accounts");
                    },
                  },
                  {
                    id: "groups",
                    icon: LayoutGrid,
                    tone: "violet",
                    label: t("Groups", "المجموعات"),
                    value: groups.length,
                    onPress: () => setPage("Teams"),
                  },
                ]}
              />
            </>
          )}
          {(page === "Accounts" || page === "Teams") && (
            <DepartmentImport
              accounts={accounts}
              groups={groups}
              ready={ready}
              saving={saving}
              storageError={errorText(t, store.error)}
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
              <SearchField
                label={t("Search accounts", "بحث في الحسابات")}
                placeholder={t("Search name, number or email…", "ابحث بالاسم أو الرقم أو البريد…")}
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
              <View style={kit.list}>
                {filteredAccounts.map((a) => (
                  <AccountRow
                    key={a.id}
                    account={a}
                    groups={groups}
                    onOpen={() => {
                      setAccountMenu(a.id);
                      setError("");
                    }}
                  />
                ))}
              </View>
              <ActionSheet
                visible={!!menuAccount}
                title={menuAccount?.name ?? ""}
                subtitle={
                  menuAccount
                    ? `${roleName(menuAccount.role)} · ${statusLabel(menuAccount, t)}`
                    : undefined
                }
                onClose={() => setAccountMenu(null)}
                actions={
                  menuAccount
                    ? [
                        {
                          label: t("Edit", "تعديل"),
                          icon: Pencil,
                          disabled: !ready || saving,
                          onPress: () => openAccount(menuAccount),
                        },
                        {
                          label: t("Message", "رسالة"),
                          icon: MessageSquare,
                          onPress: () => {
                            setRecipient(menuAccount.id);
                            conversationInitialScroll.current = true;
                            conversationNearBottom.current = true;
                            setNewConversationMessages(false);
                            setConversationOpen(true);
                            setPage("Messages");
                          },
                        },
                        {
                          label: t("Assignments", "التعيينات"),
                          icon: LayoutGrid,
                          onPress: () => setAssignmentsFor(menuAccount.id),
                        },
                        effectiveAccountStatus(menuAccount) === "DISABLED"
                          ? {
                              label: t("Restore access", "استعادة الوصول"),
                              icon: RotateCcw,
                              disabled: !ready || saving,
                              onPress: () => setChange({ id: menuAccount.id, action: "access" }),
                            }
                          : {
                              label: t("Disable", "تعطيل"),
                              icon: Ban,
                              destructive: true,
                              disabled: !ready || saving,
                              onPress: () => setChange({ id: menuAccount.id, action: "access" }),
                            },
                        // Delete stays limited to accounts without links or history.
                        ...(!linked(menuAccount.id)
                          ? [
                              {
                                label: t("Delete", "حذف"),
                                icon: Trash2,
                                destructive: true,
                                disabled: !ready || saving,
                                onPress: () => setChange({ id: menuAccount.id, action: "remove" }),
                              },
                            ]
                          : []),
                      ]
                    : []
                }
              />
              <FormSheet
                visible={!!assignmentsAccount}
                title={t("Assignments", "التعيينات")}
                subtitle={assignmentsAccount?.name}
                onClose={() => setAssignmentsFor(null)}
              >
                {assignmentsAccount && (
                  <AccountAssignments
                    account={assignmentsAccount}
                    groups={groups}
                    accounts={accounts}
                  />
                )}
              </FormSheet>
            </>
          )}
          {page === "Teams" && (
            <>
              <Button
                title={t("Add group", "إضافة مجموعة")}
                disabled={!ready || saving}
                onPress={() => openGroup()}
              />
              <SearchField
                label={t("Search groups", "بحث في المجموعات")}
                placeholder={t(
                  "Search group, member or number…",
                  "ابحث بالمجموعة أو العضو أو الرقم…",
                )}
                value={groupQuery}
                onChangeText={setGroupQuery}
              />
              {!filteredGroups.length && (
                <AppText tone="muted">
                  {t("No matching groups.", "لا توجد مجموعات مطابقة.")}
                </AppText>
              )}
              <View style={kit.list}>
                {filteredGroups.map((g) => (
                  <GroupRow
                    key={g.id}
                    group={g}
                    accounts={accounts}
                    onOpen={() => setGroupMenu(g.id)}
                  />
                ))}
              </View>
              <ActionSheet
                visible={!!menuGroup}
                title={menuGroup?.title || t("Untitled project", "مشروع بلا اسم")}
                onClose={() => setGroupMenu(null)}
                actions={
                  menuGroup
                    ? [
                        {
                          label: t("Details", "التفاصيل"),
                          icon: LayoutGrid,
                          onPress: () => setGroupDetails(menuGroup.id),
                        },
                        {
                          label: t("Edit", "تعديل"),
                          icon: Pencil,
                          disabled:
                            !ready ||
                            saving ||
                            ["COMPLETED", "ARCHIVED"].includes(menuGroup.status ?? ""),
                          onPress: () => openGroup(menuGroup),
                        },
                      ]
                    : []
                }
              />
              <FormSheet
                visible={!!detailsGroup}
                title={t("Group details", "تفاصيل المجموعة")}
                subtitle={detailsGroup?.title}
                onClose={() => setGroupDetails(null)}
              >
                {detailsGroup && <GroupPeople group={detailsGroup} accounts={accounts} />}
              </FormSheet>
            </>
          )}
          {page === "Messages" && (
            <>
              {!!starsError && (
                <View>
                  <AppText tone="danger" accessibilityRole="alert">
                    {errorText(t, starsError)}
                  </AppText>
                  {retry}
                </View>
              )}
              <SearchField
                label={t("Search conversations", "بحث في المحادثات")}
                placeholder={t("Search people by name or number…", "ابحث عن شخص بالاسم أو الرقم…")}
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
                  <ConversationInboxRow
                    key={a.id}
                    name={a.name}
                    avatar={<PersonAvatar person={a} size={56} />}
                    detail={ltr(a.number)}
                    starred={starred.includes(a.id)}
                    preview={
                      messages.filter((m) => m.person === a.id).at(-1)?.body ??
                      t("Start a conversation", "ابدأ محادثة")
                    }
                    time={(() => {
                      const last = messages.filter((m) => m.person === a.id).at(-1);
                      return last?.at
                        ? new Date(last.at).toLocaleTimeString(
                            language === "ar" ? "ar-u-nu-latn" : "en-US",
                            { hour: "2-digit", minute: "2-digit" },
                          )
                        : last?.time;
                    })()}
                    onPress={() => {
                      setRecipient(a.id);
                      setInfo(false);
                      conversationInitialScroll.current = true;
                      conversationNearBottom.current = true;
                      setNewConversationMessages(false);
                      setConversationOpen(true);
                    }}
                  />
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
                  style={[
                    { flex: 1, backgroundColor: "#fff" },
                    directionStyle(isRTL ? "rtl" : "ltr"),
                  ]}
                >
                  <ConversationHeader>
                    <Button
                      title={t("Back", "\u0631\u062c\u0648\u0639")}
                      variant="ghost"
                      onPress={() => setConversationOpen(false)}
                    />
                    <AppText variant="heading" style={{ flex: 1 }}>
                      {contact?.name}
                    </AppText>
                  </ConversationHeader>
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
                              disabled={!starsReady || starsError.startsWith("Could not load")}
                              onPress={async () => {
                                await setStarred(
                                  starred.includes(contact.id)
                                    ? starred.filter((id) => id !== contact.id)
                                    : [...starred, contact.id],
                                );
                              }}
                            />
                            <Button
                              title={t("Contact information", "معلومات جهة الاتصال")}
                              variant="ghost"
                              size="sm"
                              onPress={() => setInfo(!info)}
                            />
                          </View>
                          {info && <PersonRow person={contact} />}
                          {!!starsError && (
                            <AppText tone="danger" accessibilityRole="alert">
                              {errorText(t, starsError)}
                            </AppText>
                          )}
                          <SearchField
                            label={t("Search messages", "بحث في الرسائل")}
                            placeholder={t("Search this conversation…", "ابحث في هذه المحادثة…")}
                            value={messageQuery}
                            onChangeText={setMessageQuery}
                          />
                        </Disclosure>
                      </View>
                      <ScrollView
                        ref={conversationScroll}
                        testID="department-history"
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
                        onScroll={(event) => {
                          if (conversationInitialScroll.current) return;
                          const { contentOffset, contentSize, layoutMeasurement } =
                            event.nativeEvent;
                          conversationNearBottom.current =
                            contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
                          if (conversationNearBottom.current) setNewConversationMessages(false);
                        }}
                        scrollEventThrottle={100}
                        onContentSizeChange={() => {
                          if (messageQuery) return;
                          if (
                            !conversationInitialScroll.current &&
                            conversationNearBottom.current
                          ) {
                            departmentHistory()?.scrollToEnd({ animated: false });
                          }
                        }}
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
                            <MessageBubble
                              key={m.id}
                              style={{
                                alignSelf: "flex-end",
                                backgroundColor: "#e3ecd9",
                              }}
                            >
                              <ConversationText>{m.body}</ConversationText>
                              <AppText variant="caption">
                                {m.at ? formatDateTime(m.at) : m.time}
                              </AppText>
                            </MessageBubble>
                          ))}
                      </ScrollView>
                      {newConversationMessages && (
                        <Button
                          title={t(
                            "New messages · Jump to latest",
                            "رسائل جديدة · الانتقال للأحدث",
                          )}
                          variant="soft"
                          onPress={() => {
                            conversationNearBottom.current = true;
                            setNewConversationMessages(false);
                            departmentHistory()?.scrollToEnd({ animated: true });
                          }}
                        />
                      )}
                      <ConversationComposer>
                        {!!(error || store.error) && (
                          <AppText tone="danger" accessibilityRole="alert">
                            {error || errorText(t, store.error)}
                          </AppText>
                        )}
                        {!!store.error && retry}
                        <ConversationComposerRow>
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
                                ) {
                                  setBody("");
                                  conversationNearBottom.current = true;
                                  setNewConversationMessages(false);
                                  requestAnimationFrame(() =>
                                    departmentHistory()?.scrollToEnd({ animated: true }),
                                  );
                                } else
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
                        </ConversationComposerRow>
                      </ConversationComposer>
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
      )}
      <Sheet
        visible={!!accountDraft}
        title={t("Account details", "تفاصيل الحساب")}
        busy={saving}
        onClose={() => setAccountDraft(null)}
        footer={
          accountDraft ? (
            <Button
              title={t("Save account", "حفظ الحساب")}
              disabled={!ready}
              loading={saving}
              onPress={saveAccount}
            />
          ) : undefined
        }
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
                <AppText tone="danger">{errorText(t, store.error)}</AppText>
                {retry}
              </>
            )}
          </>
        )}
      </Sheet>
      <Sheet
        visible={!!groupDraft && !accountDraft}
        title={t("Group details", "تفاصيل المجموعة")}
        busy={saving}
        onClose={() => setGroupDraft(null)}
        footer={
          groupDraft ? (
            <Button
              title={t("Save group", "حفظ المجموعة")}
              disabled={!ready}
              loading={saving}
              onPress={saveGroup}
            />
          ) : undefined
        }
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
                <AppText tone="danger">{errorText(t, store.error)}</AppText>
                {retry}
              </>
            )}
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
        footer={
          change ? (
            <Button
              title={t("Confirm", "تأكيد")}
              disabled={!ready}
              loading={saving}
              onPress={confirmChange}
            />
          ) : undefined
        }
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
            <AppText tone="danger">{errorText(t, store.error)}</AppText>
            {retry}
          </>
        )}
      </Sheet>
    </ShellFrame>
  );
}
