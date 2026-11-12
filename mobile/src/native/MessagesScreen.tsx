import { useRef, useState, type ReactNode, type ComponentRef } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileText,
  Forward,
  ImagePlus,
  Info,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { AppText, Button } from "@/components";
import { Portrait, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { persistPickedFile } from "@/lib/files";
import type { Message, Thread } from "@/domain/workspace";
import { router } from "./router";

type Tool = "actions" | "forward" | "starred" | "attach" | null;
export function NativeMessages() {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const me = state.users.find((x) => x.id === actorId)!;
  const [selected, setSelected] = useState<string | null>(null),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState("");
  const [newChat, setNewChat] = useState(false),
    [personKind, setPersonKind] = useState("all"),
    [personQuery, setPersonQuery] = useState("");
  const [text, setText] = useState(""),
    [reply, setReply] = useState<Message | null>(null),
    [attachment, setAttachment] = useState<Message["attachment"]>();
  const [info, setInfo] = useState(false),
    [editGroup, setEditGroup] = useState(false),
    [groupName, setGroupName] = useState("");
  const [tool, setTool] = useState<Tool>(null),
    [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false),
    [messageQuery, setMessageQuery] = useState(""),
    [error, setError] = useState("");
  const [mediaTab, setMediaTab] = useState("all"),
    [highlight, setHighlight] = useState("");
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null),
    input = useRef<ComponentRef<typeof TextInput>>(null),
    positions = useRef<Record<string, number>>({});
  const threads = state.threads.filter((x) => x.memberIds.includes(actorId));
  const thread =
    threads.find((x) => x.id === selected) ||
    (selected?.startsWith("person:")
      ? threads.find(
          (x) =>
            !x.projectId && x.memberIds.length === 2 && x.memberIds.includes(selected.slice(7)),
        )
      : undefined);
  const messages = state.messages.filter((x) => x.threadId === thread?.id);
  const self = thread?.memberIds.length === 1;
  const unread = (th: Thread) =>
    state.messages.filter(
      (x) => x.threadId === th.id && x.senderId !== actorId && !x.seenBy?.includes(actorId),
    ).length;
  const displayName = (th: Thread) =>
    th.memberIds.length === 1
      ? `${me.name} (${t("You", "أنت")})`
      : th.projectId
        ? th.name
        : (state.users.find((x) => x.id !== actorId && th.memberIds.includes(x.id))?.name ??
          th.name);
  const detail = (th: Thread) =>
    th.memberIds.length === 1
      ? t("Only you", "أنت فقط")
      : th.projectId
        ? `${th.memberIds.length} ${t("members", "أعضاء")}`
        : (state.users.find((x) => x.id !== actorId && th.memberIds.includes(x.id))?.bio ?? "");
  const time = (value: string) =>
    new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const name = (id: string) =>
    id === actorId ? t("You", "أنت") : (state.users.find((x) => x.id === id)?.name ?? "");
  const visibleMessages = messages.filter((x) =>
    `${x.body} ${x.attachment?.name ?? ""}`.toLowerCase().includes(messageQuery.toLowerCase()),
  );
  const starred = messages.filter((x) => x.starredBy.includes(actorId));
  const visibleThreads = threads
    .filter(
      (th) =>
        displayName(th).toLowerCase().includes(query.toLowerCase()) &&
        (filter !== "unread" || unread(th) > 0) &&
        (filter !== "starred" ||
          th.starredBy.includes(actorId) ||
          state.messages.some((m) => m.threadId === th.id && m.starredBy.includes(actorId))),
    )
    .sort((a, b) => Number(b.memberIds.length === 1) - Number(a.memberIds.length === 1));
  function open(th: Thread) {
    setSelected(th.id);
    setInfo(false);
    setText("");
    setReply(null);
    setAttachment(undefined);
    setMessageQuery("");
    setSearchOpen(false);
    setError("");
    act({ type: "message.read", threadId: th.id });
  }
  function start(userId: string) {
    const existing = threads.find(
      (x) => !x.projectId && x.memberIds.length === 2 && x.memberIds.includes(userId),
    );
    if (existing) open(existing);
    else if (act({ type: "thread.create", userId })) {
      setSelected("person:" + userId);
      setText("");
      setReply(null);
      setAttachment(undefined);
    }
    setNewChat(false);
    setPersonQuery("");
  }
  function send() {
    if (!thread || (!text.trim() && !attachment)) return;
    if (
      act({
        type: "message.send",
        threadId: thread.id,
        body: text.trim(),
        replyTo: reply?.id,
        attachment,
      })
    ) {
      setText("");
      setReply(null);
      setAttachment(undefined);
      setError("");
      requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
    }
  }
  async function attach(photo: boolean) {
    setTool(null);
    try {
      if (photo) {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError(
            t(
              "Allow access to your photos to attach an image.",
              "اسمح بالوصول إلى الصور لإرفاق صورة.",
            ),
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.85,
        });
        if (result.canceled) return;
        const a = result.assets[0];
        setAttachment({
          uri: await persistPickedFile(a.uri, a.fileName ?? "photo.jpg"),
          name: a.fileName ?? "photo.jpg",
          mime: a.mimeType ?? "image/jpeg",
        });
      } else {
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
        if (result.canceled) return;
        const a = result.assets[0];
        setAttachment({
          uri: await persistPickedFile(a.uri, a.name),
          name: a.name,
          mime: a.mimeType ?? "application/octet-stream",
        });
      }
    } catch {
      setError(
        t("Could not attach the file. Please try again.", "تعذر إرفاق الملف. أعد المحاولة."),
      );
    }
  }
  async function openFile(file: NonNullable<Message["attachment"]>) {
    try {
      if (Platform.OS === "web") {
        await Linking.openURL(file.uri);
        return;
      }
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, { mimeType: file.mime });
      else await Linking.openURL(file.uri);
    } catch {
      setError(t("Could not open this file.", "تعذر فتح الملف."));
    }
  }
  async function changeGroupPhoto() {
    if (!thread?.projectId) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) return;
      const photo = await persistPickedFile(result.assets[0].uri, "group.jpg");
      act({ type: "thread.edit", id: thread.id, name: thread.name, photo });
    } catch {
      Alert.alert(t("Could not save the photo.", "تعذر حفظ الصورة."));
    }
  }
  function jump(message: Message) {
    setTool(null);
    setMessageQuery("");
    setSearchOpen(false);
    setHighlight(message.id);
    requestAnimationFrame(() =>
      scroll.current?.scrollTo({
        y: Math.max(0, (positions.current[message.id] ?? 0) - 25),
        animated: true,
      }),
    );
  }
  const avatar = (th: Thread, size = 46) =>
    th.photo ? (
      <Image
        source={{ uri: th.photo }}
        style={{ width: size, height: size, borderRadius: size * 0.36 }}
      />
    ) : th.projectId ? (
      <View style={[s.groupAvatar, { width: size, height: size, borderRadius: size * 0.36 }]}>
        <Users size={size * 0.46} color="#6389a9" />
      </View>
    ) : (
      <Portrait
        userId={th.memberIds.length === 1 ? actorId : th.memberIds.find((x) => x !== actorId)!}
        size={size}
      />
    );
  const icon = (label: string, action: () => void, children: ReactNode, active = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={action}
      style={[s.icon, active && s.activeIcon]}
    >
      {children}
    </Pressable>
  );
  const chips = (
    items: { id: string; label: string; count?: number }[],
    value: string,
    onChange: (id: string) => void,
  ) => (
    <View style={s.filters}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: value === item.id }}
          onPress={() => onChange(item.id)}
          style={[s.filter, value === item.id && s.filterActive]}
        >
          <AppText style={[s.filterLabel, value === item.id && { color: "white" }]}>
            {item.label}
          </AppText>
          {item.count !== undefined && (
            <View style={s.count}>
              <AppText style={{ fontSize: 10, color: "white" }}>{item.count}</AppText>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ImageBackground
          source={require("../../assets/web/messages-desk-background.png")}
          style={s.fill}
          imageStyle={{ opacity: 0.12 }}
        >
          <View style={s.surface}>
            {!thread ? (
              <>
                <View style={s.listHeading}>
                  {icon(
                    t("Back to workspace", "الرجوع لمساحة العمل"),
                    () =>
                      router.replace(
                        (me.role === "student"
                          ? "/native"
                          : `/native/${me.role}/dashboard`) as import("expo-router").Href,
                      ),
                    <ArrowLeft size={20} color="#526443" />,
                  )}
                  <AppText style={s.title}>{t("Messages", "الرسائل")}</AppText>
                  <View style={s.total}>
                    <AppText style={{ fontSize: 12, color: "#788969" }}>{threads.length}</AppText>
                  </View>
                  {icon(
                    t("New Message", "رسالة جديدة"),
                    () => setNewChat(true),
                    <Plus size={22} color="#526443" />,
                  )}
                </View>
                <View style={s.listSearch}>
                  <Search size={17} color="#8b997e" />
                  <TextInput
                    accessibilityLabel={t("Search conversations", "البحث في المحادثات")}
                    placeholder={t("Search your conversations…", "ابحث في محادثاتك…")}
                    value={query}
                    onChangeText={setQuery}
                    style={s.searchInput}
                    placeholderTextColor="#9a9eaa"
                  />
                </View>
                {chips(
                  [
                    { id: "all", label: t("All", "الكل") },
                    {
                      id: "unread",
                      label: t("Unread", "غير المقروءة"),
                      count: threads.filter((x) => unread(x) > 0).length,
                    },
                    {
                      id: "starred",
                      label: t("Starred", "المميزة"),
                      count: threads.filter((x) => x.starredBy.includes(actorId)).length,
                    },
                  ],
                  filter,
                  setFilter,
                )}
                <ScrollView
                  contentContainerStyle={s.conversations}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {!visibleThreads.length && (
                    <AppText tone="muted" style={s.noResults}>
                      {t("No conversations match this filter.", "لا توجد محادثات تطابق هذا البحث.")}
                    </AppText>
                  )}
                  {visibleThreads.map((th) => {
                    const last = state.messages.filter((x) => x.threadId === th.id).at(-1);
                    const count = unread(th);
                    return (
                      <Pressable
                        key={th.id}
                        accessibilityRole="button"
                        accessibilityLabel={displayName(th)}
                        onPress={() => open(th)}
                        style={[s.conversation, th.projectId && s.projectConversation]}
                      >
                        {avatar(th)}
                        <View style={s.copy}>
                          <View style={s.inline}>
                            <AppText numberOfLines={1} weight="bold" style={s.conversationName}>
                              {displayName(th)}
                            </AppText>
                            {th.starredBy.includes(actorId) && (
                              <Star size={11} color="#6c8156" fill="#6c8156" />
                            )}
                          </View>
                          <AppText numberOfLines={1} style={s.preview}>
                            {last?.body ||
                              last?.attachment?.name ||
                              (th.memberIds.length === 1
                                ? t(
                                    "Notes, links & things to keep",
                                    "ملاحظات وروابط وأشياء للاحتفاظ بها",
                                  )
                                : t(
                                    "Say hello and start a conversation",
                                    "قل مرحبًا وابدأ محادثة",
                                  ))}
                          </AppText>
                        </View>
                        <View style={s.meta}>
                          <AppText style={s.time}>{last ? time(last.createdAt) : ""}</AppText>
                          {count > 0 && (
                            <View style={s.unread}>
                              <AppText style={{ fontSize: 10, color: "white", fontWeight: "700" }}>
                                {count}
                              </AppText>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={s.listFooter}>
                  <MessageCircle size={22} color="#8b9b7c" />
                  <View>
                    <AppText style={s.footerText}>
                      {t("A team, a question, an idea.", "فريق، سؤال، فكرة.")}
                    </AppText>
                    <AppText style={[s.footerText, { fontSize: 11, marginTop: 4 }]}>
                      {t("Keep the conversation going.", "خلّي الحديث مستمر.")}
                    </AppText>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={s.chatHeader}>
                  {icon(
                    t("Back to conversations", "العودة للمحادثات"),
                    () => {
                      setSelected(null);
                      setReply(null);
                      setText("");
                      setAttachment(undefined);
                    },
                    <ArrowLeft size={20} color="#526443" />,
                  )}
                  {avatar(thread, 40)}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("Conversation details", "تفاصيل المحادثة")}
                    onPress={() => setInfo(true)}
                    style={s.copy}
                  >
                    <AppText numberOfLines={1} weight="bold" style={{ fontSize: 14 }}>
                      {displayName(thread)}
                    </AppText>
                    <AppText numberOfLines={1} style={s.headerDetail}>
                      {detail(thread)}
                    </AppText>
                  </Pressable>
                </View>
                <View style={s.tools}>
                  <AppText style={s.chatLabel}>
                    {self ? t("Only you", "أنت فقط") : t("Conversation", "محادثة")}
                  </AppText>
                  {icon(
                    t("Search in conversation", "البحث داخل المحادثة"),
                    () => {
                      setSearchOpen(!searchOpen);
                      setMessageQuery("");
                    },
                    <Search size={18} color="#687957" />,
                    searchOpen,
                  )}
                  {icon(
                    t("Conversation info", "معلومات المحادثة"),
                    () => setInfo(!info),
                    <Info size={18} color="#687957" />,
                    info,
                  )}
                  {thread.projectId &&
                    icon(
                      t("Edit project group", "تعديل مجموعة المشروع"),
                      () => {
                        setGroupName(thread.name);
                        setEditGroup(true);
                      },
                      <Pencil size={17} color="#687957" />,
                    )}
                  {icon(
                    t("View starred messages", "عرض الرسائل المميزة"),
                    () => setTool("starred"),
                    <Star size={18} color="#687957" />,
                  )}
                </View>
                {searchOpen && (
                  <View style={s.inChatSearch}>
                    <Search size={16} color="#738368" />
                    <TextInput
                      autoFocus
                      accessibilityLabel={t(
                        "Search messages in this conversation",
                        "البحث في رسائل المحادثة",
                      )}
                      placeholder={t(
                        "Search messages or attachment names…",
                        "ابحث عن رسالة أو اسم ملف…",
                      )}
                      value={messageQuery}
                      onChangeText={setMessageQuery}
                      style={s.searchInput}
                    />
                    <AppText style={s.time}>{visibleMessages.length}</AppText>
                    {icon(
                      t("Close conversation search", "إغلاق البحث"),
                      () => {
                        setSearchOpen(false);
                        setMessageQuery("");
                      },
                      <X size={17} color="#738368" />,
                    )}
                  </View>
                )}
                <ScrollView
                  ref={scroll}
                  style={s.fill}
                  contentContainerStyle={[
                    s.thread,
                    !messages.length && { flexGrow: 1, justifyContent: "center" },
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  onContentSizeChange={() => {
                    if (!messageQuery && !highlight)
                      scroll.current?.scrollToEnd({ animated: false });
                  }}
                >
                  {!messages.length ? (
                    <View style={s.empty}>
                      <View style={s.emptyIcon}>
                        <MessageCircle size={36} color="#899d72" />
                      </View>
                      <AppText variant="heading" align="center">
                        {self
                          ? t("A little space to save it all.", "مساحتك للاحتفاظ بكل شيء.")
                          : t(
                              `Say hello to ${displayName(thread).split(" ")[0]}.`,
                              "ابدأ المحادثة بمرحبًا.",
                            )}
                      </AppText>
                      <AppText tone="muted" align="center">
                        {self
                          ? t(
                              "Keep notes, useful links and files here, ready when you need them.",
                              "احتفظ بملاحظاتك وروابطك وملفاتك هنا لتجدها وقت الحاجة.",
                            )
                          : t(
                              "Ask a question, share an idea, or start with a simple hello.",
                              "اسأل، شارك فكرة، أو ابدأ بمرحبًا.",
                            )}
                      </AppText>
                    </View>
                  ) : (
                    <AppText style={s.dateLabel}>
                      {t(
                        "Sample conversation · current session",
                        "محادثة تجريبية · الجلسة الحالية",
                      )}
                    </AppText>
                  )}
                  {!!messageQuery && !visibleMessages.length && (
                    <AppText style={s.noResults}>
                      {t(
                        "No matching messages. Try another word.",
                        "لا توجد رسائل مطابقة. جرّب كلمة أخرى.",
                      )}
                    </AppText>
                  )}
                  {visibleMessages.map((m) => {
                    const mine = m.senderId === actorId,
                      quoted = state.messages.find((x) => x.id === m.replyTo);
                    return (
                      <View
                        key={m.id}
                        onLayout={(event) => {
                          positions.current[m.id] = event.nativeEvent.layout.y;
                        }}
                        style={[s.messageRow, { justifyContent: mine ? "flex-end" : "flex-start" }]}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${name(m.senderId)}: ${m.body || m.attachment?.name}`}
                          onLongPress={() => {
                            setActionMessage(m);
                            setTool("actions");
                          }}
                          onPress={() => setHighlight("")}
                          style={[
                            s.bubble,
                            mine ? s.outgoing : s.incoming,
                            highlight === m.id && { borderColor: "#8ba965", borderWidth: 2 },
                          ]}
                        >
                          {m.forwarded && (
                            <View style={s.inline}>
                              <Forward size={11} color="#8b977e" />
                              <AppText style={s.forwarded}>
                                {t("Forwarded", "معاد توجيهها")}
                              </AppText>
                            </View>
                          )}
                          {quoted && (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={t("View original message", "عرض الرسالة الأصلية")}
                              onPress={() => jump(quoted)}
                              style={s.replyQuote}
                            >
                              <AppText style={s.replyName}>{name(quoted.senderId)}</AppText>
                              <AppText numberOfLines={2} style={s.replyText}>
                                {quoted.body || quoted.attachment?.name}
                              </AppText>
                            </Pressable>
                          )}
                          {thread.projectId && !mine && (
                            <AppText style={s.sender}>{name(m.senderId)}</AppText>
                          )}
                          {!!m.body && <AppText style={s.messageText}>{m.body}</AppText>}
                          {m.body.match(/https?:\/\/[^\s]+/g)?.map((url) => (
                            <Pressable
                              key={url}
                              accessibilityRole="link"
                              onPress={() =>
                                Linking.openURL(url).catch(() =>
                                  setError(t("Could not open the link.", "تعذر فتح الرابط.")),
                                )
                              }
                            >
                              <AppText numberOfLines={2} style={s.link}>
                                {url}
                              </AppText>
                            </Pressable>
                          ))}
                          {m.attachment && (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={m.attachment.name}
                              onPress={() => openFile(m.attachment!)}
                              style={s.file}
                            >
                              {m.attachment.mime.startsWith("image/") ? (
                                <Image
                                  source={{ uri: m.attachment.uri }}
                                  resizeMode="cover"
                                  style={s.messagePhoto}
                                />
                              ) : (
                                <FileText size={25} color="#7089a0" />
                              )}
                              <AppText numberOfLines={2} style={s.fileName}>
                                {m.attachment.name}
                              </AppText>
                            </Pressable>
                          )}
                          <View style={s.messageFooter}>
                            {m.starredBy.includes(actorId) && (
                              <Star size={10} fill="#8b9d73" color="#8b9d73" />
                            )}
                            <AppText style={s.time}>{time(m.createdAt)}</AppText>
                            {mine && <Check size={12} color="#899a75" />}
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={t("Message actions", "خيارات الرسالة")}
                              onPress={() => {
                                setActionMessage(m);
                                setTool("actions");
                              }}
                              hitSlop={9}
                            >
                              <MoreHorizontal size={15} color="#899a75" />
                            </Pressable>
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>
                <View style={s.composer}>
                  {reply && (
                    <View style={s.replyDraft}>
                      <Reply size={18} color="#708756" />
                      <View style={s.copy}>
                        <AppText style={s.replyName}>
                          {t("Replying to", "رد على")} {name(reply.senderId)}
                        </AppText>
                        <AppText numberOfLines={1} style={s.replyText}>
                          {reply.body || reply.attachment?.name}
                        </AppText>
                      </View>
                      {icon(
                        t("Cancel reply", "إلغاء الرد"),
                        () => setReply(null),
                        <X size={16} color="#718164" />,
                      )}
                    </View>
                  )}
                  {attachment && (
                    <View style={s.replyDraft}>
                      <Paperclip size={16} color="#708756" />
                      <AppText numberOfLines={1} style={s.copy}>
                        {attachment.name}
                      </AppText>
                      {icon(
                        t("Remove attachment", "إزالة المرفق"),
                        () => setAttachment(undefined),
                        <X size={16} color="#718164" />,
                      )}
                    </View>
                  )}
                  {!!error && (
                    <AppText accessibilityRole="alert" style={s.error}>
                      {error}
                    </AppText>
                  )}
                  <View style={s.composeRow}>
                    {icon(
                      t("Attach a file", "إرفاق ملف"),
                      () => setTool("attach"),
                      <Paperclip size={22} color="#839173" />,
                    )}
                    <TextInput
                      ref={input}
                      accessibilityLabel={t("Message text", "نص الرسالة")}
                      placeholder={
                        self
                          ? t("Save a thought, a link, a reminder…", "احفظ فكرة، رابطًا، تذكيرًا…")
                          : t("Write a message…", "اكتب رسالة…")
                      }
                      multiline
                      maxLength={4000}
                      value={text}
                      onChangeText={setText}
                      placeholderTextColor="#9bA18f"
                      style={s.messageInput}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        self ? t("Save message", "حفظ الرسالة") : t("Send message", "إرسال الرسالة")
                      }
                      disabled={!text.trim() && !attachment}
                      onPress={send}
                      style={[s.send, !text.trim() && !attachment && { opacity: 0.45 }]}
                    >
                      <Send size={20} color="white" />
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </View>
        </ImageBackground>
      </KeyboardAvoidingView>
      <Modal visible={newChat} animationType="slide" onRequestClose={() => setNewChat(false)}>
        <SafeAreaView style={s.modalRoot}>
          <View style={s.modalHeader}>
            <AppText variant="heading" style={s.copy}>
              {t("Start a conversation", "ابدأ محادثة")}
            </AppText>
            {icon(
              t("Close new message", "إغلاق رسالة جديدة"),
              () => setNewChat(false),
              <X color="#6d7c5e" size={21} />,
            )}
          </View>
          <View style={s.modalContent}>
            <AppText tone="muted">
              {t(
                "Find a student or supervisor, or save a message to yourself.",
                "ابحث عن طالب أو مشرف، أو احفظ رسالة لنفسك.",
              )}
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const th = threads.find((x) => x.memberIds.length === 1);
                if (th) open(th);
                setNewChat(false);
              }}
              style={s.selfChoice}
            >
              <Portrait userId={actorId} />
              <View style={s.copy}>
                <AppText weight="bold">
                  {me.name} ({t("You", "أنت")})
                </AppText>
                <AppText style={s.preview}>
                  {t("Only you · Your personal space", "أنت فقط · مساحتك الخاصة")}
                </AppText>
              </View>
            </Pressable>
            <View style={s.listSearch}>
              <Search size={17} color="#8b997e" />
              <TextInput
                accessibilityLabel={t("Search people", "البحث عن أشخاص")}
                placeholder={t("Name, student number or department…", "اسم أو رقم جامعي أو تخصص…")}
                value={personQuery}
                onChangeText={setPersonQuery}
                style={s.searchInput}
              />
            </View>
            {chips(
              [
                { id: "all", label: t("Everyone", "الجميع") },
                { id: "student", label: t("Students", "الطلاب") },
                { id: "supervisor", label: t("Supervisors", "المشرفون") },
              ],
              personKind,
              setPersonKind,
            )}
          </View>
          <ScrollView contentContainerStyle={s.conversations}>
            {state.users
              .filter(
                (u) =>
                  u.id !== actorId &&
                  (personKind === "all" || u.role === personKind) &&
                  `${u.name} ${u.email} ${u.universityNumber} ${u.bio}`
                    .toLowerCase()
                    .includes(personQuery.toLowerCase()),
              )
              .map((u) => (
                <Pressable
                  key={u.id}
                  accessibilityRole="button"
                  accessibilityLabel={t("Message ", "مراسلة ") + u.name}
                  onPress={() => start(u.id)}
                  style={s.conversation}
                >
                  <Portrait userId={u.id} />
                  <View style={s.copy}>
                    <AppText weight="bold">{u.name}</AppText>
                    <AppText numberOfLines={2} style={s.preview}>
                      {u.bio} · {u.universityNumber ?? u.role}
                    </AppText>
                  </View>
                  <ChevronRight size={17} color="#91a07e" />
                </Pressable>
              ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal visible={info && !!thread} animationType="slide" onRequestClose={() => setInfo(false)}>
        <SafeAreaView style={s.modalRoot}>
          <View style={s.modalHeader}>
            <AppText variant="heading" style={s.copy}>
              {t("Conversation details", "تفاصيل المحادثة")}
            </AppText>
            {icon(
              t("Close conversation details", "إغلاق تفاصيل المحادثة"),
              () => setInfo(false),
              <X size={22} color="#6d7c5e" />,
            )}
          </View>
          {thread && (
            <ScrollView contentContainerStyle={s.details}>
              <View style={s.detailProfile}>
                {avatar(thread, 86)}
                <AppText variant="title" align="center">
                  {displayName(thread)}
                </AppText>
                <AppText tone="muted">{detail(thread)}</AppText>
                {thread.projectId && (
                  <Button
                    title={t("Edit group photo & name", "تعديل اسم وصورة المجموعة")}
                    variant="ghost"
                    onPress={() => {
                      setInfo(false);
                      setGroupName(thread.name);
                      setEditGroup(true);
                    }}
                  />
                )}
              </View>
              {!self && (
                <>
                  <Button
                    title={t("Schedule Meeting", "جدولة اجتماع")}
                    onPress={() => {
                      setInfo(false);
                      router.push(`/native/${me.role}/meetings` as import("expo-router").Href);
                    }}
                  />
                  {thread.projectId && (
                    <Button
                      title={t("View Progress", "عرض التقدم")}
                      variant="soft"
                      onPress={() => {
                        setInfo(false);
                        router.push(
                          `/native/${me.role}/${me.role === "student" ? "project" : "progress"}` as import("expo-router").Href,
                        );
                      }}
                    />
                  )}
                </>
              )}
              {thread.projectId && (
                <View style={s.detailSection}>
                  <AppText style={s.sectionLabel}>{t("PROJECT", "المشروع")}</AppText>
                  <AppText weight="bold" tone="primary">
                    {state.projects.find((p) => p.id === thread.projectId)?.title}
                  </AppText>
                  <AppText>
                    {state.projects.find((p) => p.id === thread.projectId)?.description}
                  </AppText>
                </View>
              )}
              <View style={s.detailSection}>
                <AppText style={s.sectionLabel}>
                  {self
                    ? t("YOUR ACCOUNT", "حسابك")
                    : thread.projectId
                      ? t("MEMBERS", "الأعضاء")
                      : t("CONTACT", "جهة الاتصال")}
                </AppText>
                {thread.memberIds.map((id) => (
                  <View key={id} style={s.member}>
                    <Portrait userId={id} size={42} />
                    <View style={s.copy}>
                      <AppText weight="semibold">
                        {state.users.find((u) => u.id === id)?.name}
                      </AppText>
                      <AppText style={s.preview}>
                        {state.users.find((u) => u.id === id)?.bio}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
              <Button
                title={
                  thread.starredBy.includes(actorId)
                    ? t("Unstar conversation", "إلغاء تمييز المحادثة")
                    : t("Star conversation", "تمييز المحادثة")
                }
                variant="soft"
                onPress={() => act({ type: "thread.star", id: thread.id })}
              />
              <View style={s.detailSection}>
                <AppText variant="heading">
                  {t("Media, files & links", "الوسائط والملفات والروابط")}
                </AppText>
                <AppText style={s.preview}>
                  {self
                    ? t("Shared in your messages", "المحفوظة في محادثتك")
                    : t("Shared in this conversation", "المشتركة في هذه المحادثة")}
                </AppText>
                {chips(
                  [
                    { id: "all", label: t("All", "الكل") },
                    { id: "images", label: t("Media", "الوسائط") },
                    { id: "files", label: t("Files", "الملفات") },
                    { id: "links", label: t("Links", "الروابط") },
                  ],
                  mediaTab,
                  setMediaTab,
                )}
                {messages
                  .filter((m) =>
                    mediaTab === "images"
                      ? m.attachment?.mime.startsWith("image/")
                      : mediaTab === "files"
                        ? m.attachment && !m.attachment.mime.startsWith("image/")
                        : mediaTab === "links"
                          ? /https?:\/\//.test(m.body)
                          : m.attachment || /https?:\/\//.test(m.body),
                  )
                  .map((m) => (
                    <Pressable
                      key={m.id}
                      accessibilityRole="button"
                      onPress={() =>
                        m.attachment
                          ? openFile(m.attachment)
                          : Linking.openURL(m.body.match(/https?:\/\/[^\s]+/)?.[0] ?? "").catch(
                              () => {},
                            )
                      }
                      style={s.mediaItem}
                    >
                      {m.attachment?.mime.startsWith("image/") ? (
                        <Image
                          source={{ uri: m.attachment.uri }}
                          style={{ width: 65, height: 65, borderRadius: 12 }}
                        />
                      ) : (
                        <FileText size={25} color="#7b8e69" />
                      )}
                      <AppText style={s.copy} numberOfLines={3}>
                        {m.attachment?.name ?? m.body}
                      </AppText>
                    </Pressable>
                  ))}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
      <Modal
        visible={editGroup && !!thread?.projectId}
        animationType="slide"
        onRequestClose={() => setEditGroup(false)}
      >
        <SafeAreaView style={s.modalRoot}>
          <View style={s.modalHeader}>
            <AppText variant="heading" style={s.copy}>
              {t("Edit project group", "تعديل مجموعة المشروع")}
            </AppText>
            {icon(
              t("Close group editor", "إغلاق تعديل المجموعة"),
              () => setEditGroup(false),
              <X size={22} color="#6d7c5e" />,
            )}
          </View>
          {thread && (
            <View style={s.modalContent}>
              <View style={s.detailProfile}>
                {avatar(thread, 100)}
                <Button
                  title={t("Choose photo", "اختيار صورة")}
                  variant="soft"
                  onPress={changeGroupPhoto}
                />
              </View>
              <AppText weight="semibold">{t("Group name", "اسم المجموعة")}</AppText>
              <TextInput
                accessibilityLabel={t("Group name", "اسم المجموعة")}
                value={groupName}
                onChangeText={setGroupName}
                maxLength={80}
                style={s.groupInput}
              />
              <Button
                title={t("Save Group", "حفظ المجموعة")}
                disabled={!groupName.trim()}
                onPress={() => {
                  if (act({ type: "thread.edit", id: thread.id, name: groupName.trim() }))
                    setEditGroup(false);
                }}
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>
      <Modal visible={!!tool} transparent animationType="fade" onRequestClose={() => setTool(null)}>
        <View style={s.toolOverlay}>
          <Pressable
            accessibilityLabel={t("Close message tools", "إغلاق أدوات الرسالة")}
            style={StyleSheet.absoluteFill}
            onPress={() => setTool(null)}
          />
          <SafeAreaView style={s.toolSheet} edges={["bottom"]}>
            <View style={s.modalHeader}>
              <AppText variant="heading" style={s.copy}>
                {tool === "starred"
                  ? t("Starred messages", "الرسائل المميزة")
                  : tool === "forward"
                    ? t("Forward to", "إعادة التوجيه إلى")
                    : tool === "attach"
                      ? t("Attach", "إرفاق")
                      : t("Message actions", "خيارات الرسالة")}
              </AppText>
              {icon(
                t("Close tools", "إغلاق الأدوات"),
                () => setTool(null),
                <X size={21} color="#6d7c5e" />,
              )}
            </View>
            <ScrollView contentContainerStyle={s.toolContent}>
              {tool === "attach" ? (
                <>
                  <Action
                    icon={<ImagePlus color="#6389a9" size={22} />}
                    title={t("Photo", "صورة")}
                    onPress={() => attach(true)}
                  />
                  <Action
                    icon={<Paperclip color="#6f805c" size={22} />}
                    title={t("File", "ملف")}
                    onPress={() => attach(false)}
                  />
                </>
              ) : tool === "starred" ? (
                starred.length ? (
                  starred.map((m) => (
                    <Pressable
                      key={m.id}
                      accessibilityRole="button"
                      onPress={() => jump(m)}
                      style={s.mediaItem}
                    >
                      <Star size={18} fill="#81966a" color="#81966a" />
                      <View style={s.copy}>
                        <AppText>{m.body || m.attachment?.name}</AppText>
                        <AppText style={s.time}>
                          {name(m.senderId)} · {time(m.createdAt)}
                        </AppText>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <AppText tone="muted">
                    {t("No starred messages yet.", "لا توجد رسائل مميزة بعد.")}
                  </AppText>
                )
              ) : tool === "forward" ? (
                threads.map((th) => (
                  <Pressable
                    key={th.id}
                    accessibilityRole="button"
                    onPress={() => {
                      if (
                        actionMessage &&
                        act({
                          type: "message.send",
                          threadId: th.id,
                          body: actionMessage.body,
                          attachment: actionMessage.attachment,
                          forwarded: true,
                        })
                      ) {
                        setTool(null);
                        open(th);
                      }
                    }}
                    style={s.conversation}
                  >
                    {avatar(th, 40)}
                    <AppText style={s.copy}>{displayName(th)}</AppText>
                    <Forward size={18} color="#7b8d68" />
                  </Pressable>
                ))
              ) : (
                actionMessage && (
                  <>
                    <Action
                      icon={<Reply color="#6d8057" size={21} />}
                      title={t("Reply", "رد")}
                      onPress={() => {
                        setReply(actionMessage);
                        setTool(null);
                        input.current?.focus();
                      }}
                    />
                    <Action
                      icon={<Forward color="#6d8057" size={21} />}
                      title={t("Forward", "إعادة توجيه")}
                      onPress={() => setTool("forward")}
                    />
                    <Action
                      icon={
                        <Star
                          color="#6d8057"
                          size={21}
                          fill={actionMessage.starredBy.includes(actorId) ? "#6d8057" : "none"}
                        />
                      }
                      title={
                        actionMessage.starredBy.includes(actorId)
                          ? t("Unstar message", "إلغاء تمييز الرسالة")
                          : t("Star message", "تمييز الرسالة")
                      }
                      onPress={() => {
                        act({ type: "message.star", id: actionMessage.id });
                        setTool(null);
                      }}
                    />
                    {actionMessage.senderId === actorId && (
                      <Action
                        icon={<Trash2 color="#b15b4e" size={21} />}
                        title={t("Delete message", "حذف الرسالة")}
                        onPress={() => {
                          act({ type: "message.delete", id: actionMessage.id });
                          setTool(null);
                        }}
                      />
                    )}
                  </>
                )
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
function Action({ icon, title, onPress }: { icon: ReactNode; title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={s.action}
    >
      {icon}
      <AppText>{title}</AppText>
    </Pressable>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5ef", overflow: "hidden" },
  fill: { flex: 1, minWidth: 0 },
  surface: { flex: 1, backgroundColor: "#f8f9f4db" },
  listHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "700", flex: 1, color: "#101b2c" },
  total: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 16, backgroundColor: "#e8eddf" },
  icon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  activeIcon: { backgroundColor: "#e3ecd4" },
  listSearch: {
    marginHorizontal: 18,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dce4d6",
    backgroundColor: "#ffffffed",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 12, color: "#172033" },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  filter: {
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#dfd6c8",
    backgroundColor: "#fcfbf8",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  filterActive: { backgroundColor: "#425238", borderColor: "#425238" },
  filterLabel: { fontSize: 12, fontWeight: "600", color: "#172033" },
  count: { borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: "#536747" },
  conversations: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20, gap: 9 },
  conversation: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 22,
    gap: 12,
    minHeight: 89,
    borderWidth: 1,
    borderColor: "transparent",
  },
  projectConversation: { backgroundColor: "#e8efdf", borderColor: "#d2dfc6" },
  copy: { flex: 1, minWidth: 0 },
  conversationName: { fontSize: 14, color: "#111b2e", flexShrink: 1 },
  preview: { fontSize: 12, color: "#8d9685", marginTop: 5, lineHeight: 18 },
  inline: { flexDirection: "row", alignItems: "center", gap: 5 },
  groupAvatar: { backgroundColor: "#dfebf7", alignItems: "center", justifyContent: "center" },
  meta: { alignItems: "flex-end", gap: 8 },
  time: { fontSize: 10, color: "#97a08d" },
  unread: {
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7e9568",
  },
  listFooter: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 25,
    paddingVertical: 20,
    alignItems: "center",
  },
  footerText: { fontSize: 12, color: "#8b9b7c" },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 9,
    backgroundColor: "#ffffffed",
    borderBottomWidth: 1,
    borderColor: "#e5ebdd",
  },
  headerDetail: { fontSize: 11, color: "#89947e", marginTop: 4 },
  tools: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: "#ffffffcf",
    borderBottomWidth: 1,
    borderColor: "#e5ebdd",
  },
  chatLabel: { fontSize: 10, color: "#899a72", flex: 1 },
  inChatSearch: {
    margin: 10,
    paddingLeft: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dce4d4",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  thread: { paddingHorizontal: 14, paddingVertical: 18 },
  dateLabel: { textAlign: "center", fontSize: 10, color: "#9aa58e", marginBottom: 24 },
  messageRow: { flexDirection: "row", marginBottom: 16 },
  bubble: {
    maxWidth: "88%",
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 7,
    borderWidth: 1,
    gap: 6,
    boxShadow: "0 3px 9px #35432404",
  },
  incoming: {
    backgroundColor: "#fff",
    borderColor: "#e7ebdf",
    borderRadius: 17,
    borderBottomLeftRadius: 4,
  },
  outgoing: {
    backgroundColor: "#e6eddc",
    borderColor: "#dbe5cf",
    borderRadius: 17,
    borderBottomRightRadius: 4,
  },
  messageText: { fontSize: 14, lineHeight: 23, color: "#1e293b" },
  sender: { fontSize: 11, color: "#6d8ba8", fontWeight: "600" },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
    marginTop: 2,
  },
  forwarded: { fontSize: 10, color: "#91a080", fontStyle: "italic" },
  replyQuote: {
    padding: 9,
    paddingLeft: 11,
    borderLeftWidth: 3,
    borderColor: "#839c69",
    borderRadius: 8,
    backgroundColor: "#f5f8edb8",
  },
  replyName: { fontSize: 11, fontWeight: "600", color: "#677e51" },
  replyText: { fontSize: 12, color: "#839174", marginTop: 4 },
  file: { padding: 7, gap: 7, borderRadius: 11, backgroundColor: "#ffffff70", overflow: "hidden" },
  messagePhoto: { width: 215, maxWidth: "100%", height: 165, borderRadius: 10 },
  fileName: { fontSize: 12, color: "#64839d" },
  link: { fontSize: 12, color: "#6485a1", textDecorationLine: "underline" },
  composer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e6ebde",
  },
  composeRow: { flexDirection: "row", alignItems: "flex-end", gap: 7 },
  messageInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 47,
    maxHeight: 120,
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#e1e8d8",
    backgroundColor: "#f6f8f1",
    fontSize: 14,
    lineHeight: 21,
    color: "#243127",
  },
  send: {
    width: 47,
    height: 47,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#647954",
  },
  replyDraft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#eff4e7",
    marginBottom: 9,
  },
  error: { fontSize: 12, color: "#b85043", marginBottom: 9 },
  empty: { paddingHorizontal: 25, gap: 16, alignItems: "center" },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: "#e9efdf",
    justifyContent: "center",
    alignItems: "center",
  },
  noResults: { padding: 18, fontSize: 13, color: "#8a9680", textAlign: "center" },
  modalRoot: { flex: 1, backgroundColor: "#f7f6f0" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "#e0e4d7",
  },
  modalContent: { padding: 20, gap: 18 },
  selfChoice: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#e9efdf",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  details: { padding: 22, gap: 16 },
  detailProfile: { alignItems: "center", gap: 13, paddingVertical: 18 },
  detailSection: {
    borderTopWidth: 1,
    borderColor: "#ded6c7",
    paddingTop: 20,
    gap: 12,
    marginTop: 4,
  },
  sectionLabel: { fontSize: 12, color: "#727a87", fontWeight: "700", letterSpacing: 0.5 },
  member: { flexDirection: "row", alignItems: "center", gap: 12 },
  mediaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#e3e7da",
  },
  groupInput: {
    borderWidth: 1,
    borderColor: "#cbd7bf",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 14,
    fontSize: 16,
  },
  toolOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#14201655" },
  toolSheet: {
    maxHeight: "72%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#fafbf6",
    overflow: "hidden",
  },
  toolContent: { paddingHorizontal: 22, paddingBottom: 20 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderColor: "#e5e9de",
  },
});
