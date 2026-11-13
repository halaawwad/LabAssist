import { useState } from "react";
import { router } from "@/native/router";
import { Image, Linking, Pressable, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { persistPickedFile as saveFile } from "@/lib/files";
import { Info, Star, Reply, Forward, Trash2, Paperclip, Users } from "lucide-react-native";
import { AppText, Button } from "@/components";
import { Chips, Field, Panel, Portrait, kit, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { calendarDay, type Message } from "@/domain/workspace";
import { colors } from "@/theme";

export function MessagesPanel() {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState(false);
  const [filter, setFilter] = useState("all");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<string | undefined>();
  const [info, setInfo] = useState(false);
  const [name, setName] = useState("");
  const [forward, setForward] = useState<Message | null>(null);
  const [error, setError] = useState("");
  const [messageQuery, setMessageQuery] = useState("");
  const threads = state.threads.filter((th) => th.memberIds.includes(actorId));
  const thread = threads.find((th) => th.id === selected);
  const messages = state.messages.filter((m) => m.threadId === selected);
  const contacts = state.users.filter(
    (u) => u.id !== actorId && `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  async function open(id: string) {
    setSelected(id);
    setInfo(false);
    setBody("");
    setReply(undefined);
    await act({ type: "message.read", threadId: id });
  }
  async function attach(image = false) {
    if (!thread) return;
    setError("");
    try {
      let attachment: Message["attachment"];
      if (image) {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError(
            t(
              "Photo access was not granted. You can still send files.",
              "لم تمنح صلاحية الصور. ما زال بإمكانك إرسال الملفات.",
            ),
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
        });
        if (result.canceled) return;
        const a = result.assets[0];
        const name = a.fileName ?? "photo.jpg";
        attachment = { uri: await saveFile(a.uri, name), name, mime: a.mimeType ?? "image/jpeg" };
      } else {
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
        if (result.canceled) return;
        const a = result.assets[0];
        attachment = {
          uri: await saveFile(a.uri, a.name),
          name: a.name,
          mime: a.mimeType ?? "application/octet-stream",
        };
      }
      await act({ type: "message.send", threadId: thread.id, body: "", attachment });
    } catch {
      setError(
        t("Could not attach this file. Please retry.", "تعذر إرفاق هذا الملف. أعد المحاولة."),
      );
    }
  }
  const threadName = (th: (typeof threads)[number]) =>
    th.memberIds.length === 1
      ? t(`${state.users.find((u) => u.id === actorId)?.name} (You)`, "أنت")
      : th.projectId
        ? th.name
        : (state.users.find((u) => th.memberIds.includes(u.id) && u.id !== actorId)?.name ??
          th.name);
  return (
    <View style={kit.stack}>
      {!thread ? (
        <>
          <Field
            label={t("Search conversations or people", "ابحث عن محادثة أو شخص")}
            value={search}
            onChangeText={setSearch}
          />
          <Chips
            value={filter}
            onChange={setFilter}
            options={[
              { id: "all", label: t("All", "الكل") },
              { id: "unread", label: t("Unread", "غير مقروءة") },
              { id: "starred", label: t("Starred", "المميزة") },
            ]}
          />
          <Button
            title={
              people ? t("Conversations", "المحادثات") : t("Start a conversation", "بدء محادثة")
            }
            variant="soft"
            onPress={() => setPeople(!people)}
          />
          {people
            ? contacts.map((u) => (
                <Panel key={u.id}>
                  <AppText weight="semibold">{u.name}</AppText>
                  <AppText variant="caption" tone="muted">
                    {u.role} · {u.email}
                  </AppText>
                  <Button
                    title={t("Message", "مراسلة")}
                    variant="ghost"
                    onPress={async () => {
                      await act({ type: "thread.create", userId: u.id });
                      setPeople(false);
                      setSearch("");
                    }}
                  />
                </Panel>
              ))
            : threads
                .filter(
                  (th) =>
                    threadName(th).toLowerCase().includes(search.toLowerCase()) &&
                    (filter !== "unread" ||
                      state.messages.some(
                        (m) =>
                          m.threadId === th.id &&
                          m.senderId !== actorId &&
                          !m.seenBy?.includes(actorId),
                      )) &&
                    (filter !== "starred" ||
                      th.starredBy.includes(actorId) ||
                      state.messages.some(
                        (m) => m.threadId === th.id && m.starredBy.includes(actorId),
                      )),
                )
                .map((th) => (
                  <Pressable key={th.id} onPress={async () => await open(th.id)}>
                    <Panel tint={th.memberIds.length === 1 ? colors.primaryWash : undefined}>
                      <View style={[kit.row, { flexWrap: "nowrap" }]}>
                        {th.photo ? (
                          <Image
                            source={{ uri: th.photo }}
                            style={{ width: 48, height: 48, borderRadius: 18 }}
                          />
                        ) : !th.projectId && th.memberIds.length <= 2 ? (
                          <Portrait
                            userId={
                              th.memberIds.length === 1
                                ? actorId
                                : th.memberIds.find((id) => id !== actorId)!
                            }
                          />
                        ) : (
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 18,
                              backgroundColor: "#deebf8",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Users size={25} color="#678ba8" />
                          </View>
                        )}
                        <View style={kit.grow}>
                          <AppText weight="semibold" style={{ fontSize: 15 }}>
                            {threadName(th)}
                          </AppText>
                          <AppText numberOfLines={1} tone="muted" style={{ fontSize: 12 }}>
                            {state.messages.filter((m) => m.threadId === th.id).at(-1)?.body ||
                              t("Start a conversation", "ابدأ محادثة")}
                          </AppText>
                        </View>
                      </View>
                    </Panel>
                  </Pressable>
                ))}
        </>
      ) : (
        <>
          <View style={kit.row}>
            <Button title={t("Back", "رجوع")} variant="ghost" onPress={() => setSelected(null)} />
            <AppText variant="heading" style={kit.grow}>
              {threadName(thread)}
            </AppText>
            <Pressable
              accessibilityLabel={t("Conversation info", "معلومات المحادثة")}
              accessibilityRole="button"
              style={kit.iconButton}
              onPress={() => {
                setInfo(!info);
                setName(thread.name);
              }}
            >
              <Info color={colors.primary} />
            </Pressable>
          </View>
          {info && (
            <Panel tint={colors.primaryWash}>
              <AppText variant="heading">
                {t("Conversation information", "معلومات المحادثة")}
              </AppText>
              {thread.photo && (
                <Image
                  source={{ uri: thread.photo }}
                  style={{ width: 70, height: 70, borderRadius: 35 }}
                />
              )}
              {thread.memberIds.map((id) => (
                <AppText key={id}>{state.users.find((u) => u.id === id)?.name}</AppText>
              ))}
              <Button
                title={
                  thread.starredBy.includes(actorId)
                    ? t("Unstar conversation", "إلغاء تمييز المحادثة")
                    : t("Star conversation", "تمييز المحادثة")
                }
                variant="soft"
                onPress={async () => await act({ type: "thread.star", id: thread.id })}
              />
              {thread.projectId && (
                <>
                  <Button
                    title={t("Schedule Meeting", "جدولة اجتماع")}
                    onPress={() =>
                      router.push(
                        ("/native/" +
                          (state.users.find((u) => u.id === actorId)?.role ?? "student") +
                          "/meetings") as import("expo-router").Href,
                      )
                    }
                  />
                  <Button
                    title={t("View Progress", "عرض التقدم")}
                    variant="soft"
                    onPress={() =>
                      router.push(
                        (state.users.find((u) => u.id === actorId)?.role === "supervisor"
                          ? "/native/supervisor/progress"
                          : "/native/student/project") as import("expo-router").Href,
                      )
                    }
                  />
                  <Panel title={t("Project", "المشروع")}>
                    <AppText weight="bold">
                      {state.projects.find((project) => project.id === thread.projectId)?.title}
                    </AppText>
                    <AppText>
                      {
                        state.projects.find((project) => project.id === thread.projectId)
                          ?.description
                      }
                    </AppText>
                  </Panel>
                  <Field
                    label={t("Group name", "اسم المجموعة")}
                    value={name}
                    onChangeText={setName}
                  />
                  <Button
                    title={t("Save group name", "حفظ اسم المجموعة")}
                    onPress={async () => await act({ type: "thread.edit", id: thread.id, name })}
                  />
                  <Button
                    title={t("Change group photo", "تغيير صورة المجموعة")}
                    variant="soft"
                    onPress={async () => {
                      try {
                        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!permission.granted) return;
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ["images"],
                          quality: 0.7,
                        });
                        if (!result.canceled)
                          await act({
                            type: "thread.edit",
                            id: thread.id,
                            name: thread.name,
                            photo: await saveFile(result.assets[0].uri, "group.jpg"),
                          });
                      } catch {
                        setError(t("Could not save the photo.", "تعذر حفظ الصورة."));
                      }
                    }}
                  />
                </>
              )}
              <AppText weight="semibold">
                {t("Media, files & links", "الوسائط والملفات والروابط")}
              </AppText>
              {messages
                .filter((m) => m.attachment || /https?:\/\//.test(m.body))
                .map((m) => (
                  <AppText key={m.id} selectable>
                    {m.attachment?.name ?? m.body}
                  </AppText>
                ))}
            </Panel>
          )}
          <Field
            label={t("Search messages", "البحث في الرسائل")}
            value={messageQuery}
            onChangeText={setMessageQuery}
          />
          {messages
            .filter((m) =>
              `${m.body} ${m.attachment?.name ?? ""}`
                .toLowerCase()
                .includes(messageQuery.toLowerCase()),
            )
            .map((m) => (
              <Panel key={m.id} tint={m.senderId === actorId ? colors.primaryWash : undefined}>
                <AppText variant="caption" tone="muted">
                  {state.users.find((u) => u.id === m.senderId)?.name} ·{" "}
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {m.forwarded ? " · Forwarded" : ""}
                </AppText>
                {thread.memberIds.length === 1 && <Portrait userId={actorId} size={72} />}
                {m.replyTo && (
                  <AppText variant="caption" tone="muted">
                    ↳ {state.messages.find((x) => x.id === m.replyTo)?.body ?? "—"}
                  </AppText>
                )}
                <AppText selectable>{m.body}</AppText>
                {m.attachment && (
                  <>
                    <Button
                      title={m.attachment.name}
                      variant="ghost"
                      onPress={async () => {
                        try {
                          if (await Sharing.isAvailableAsync())
                            await Sharing.shareAsync(m.attachment!.uri);
                        } catch {
                          setError(t("Could not open this file.", "تعذر فتح الملف."));
                        }
                      }}
                    />
                    {m.attachment.mime.startsWith("image/") && (
                      <Image
                        source={{ uri: m.attachment.uri }}
                        style={{ width: "100%", height: 180, borderRadius: 16 }}
                      />
                    )}
                  </>
                )}
                {m.body.match(/https?:\/\/[^\s]+/g)?.map((link) => (
                  <Button
                    key={link}
                    title={t("Open link", "فتح الرابط")}
                    variant="ghost"
                    onPress={() =>
                      Linking.openURL(link).catch(() =>
                        setError(t("Could not open the link.", "تعذر فتح الرابط.")),
                      )
                    }
                  />
                ))}
                <View style={kit.wrap}>
                  {[
                    {
                      icon: Star,
                      label: t("Star", "تمييز"),
                      press: async () => await act({ type: "message.star", id: m.id }),
                    },
                    { icon: Reply, label: t("Reply", "رد"), press: () => setReply(m.id) },
                    {
                      icon: Forward,
                      label: t("Forward", "إعادة توجيه"),
                      press: () => setForward(m),
                    },
                    ...(m.senderId === actorId
                      ? [
                          {
                            icon: Trash2,
                            label: t("Delete", "حذف"),
                            press: async () => await act({ type: "message.delete", id: m.id }),
                          },
                        ]
                      : []),
                  ].map((a) => (
                    <Pressable
                      key={a.label}
                      accessibilityLabel={a.label}
                      accessibilityRole="button"
                      onPress={a.press}
                      style={kit.iconButton}
                    >
                      <a.icon
                        size={17}
                        color={
                          m.starredBy.includes(actorId) && a.icon === Star
                            ? "#a07635"
                            : colors.primary
                        }
                      />
                    </Pressable>
                  ))}
                </View>
              </Panel>
            ))}
          {reply && (
            <Button
              title={t("Cancel reply", "إلغاء الرد")}
              variant="ghost"
              onPress={() => setReply(undefined)}
            />
          )}
          <Field label={t("Message", "الرسالة")} value={body} onChangeText={setBody} multiline />
          <View style={kit.wrap}>
            <Button
              title={t("Send", "إرسال")}
              disabled={!body.trim()}
              onPress={async () => {
                if (await act({ type: "message.send", threadId: thread.id, body, replyTo: reply })) {
                  setBody("");
                  setReply(undefined);
                }
              }}
            />
            <Button title={t("Photo", "صورة")} variant="soft" onPress={async () => await attach(true)} />
            <Pressable
              accessibilityLabel={t("Attach file", "إرفاق ملف")}
              accessibilityRole="button"
              style={kit.iconButton}
              onPress={async () => await attach()}
            >
              <Paperclip color={colors.primary} />
            </Pressable>
          </View>
        </>
      )}
      {error && <AppText tone="danger">{error}</AppText>}
      {forward && (
        <Panel title={t("Forward to", "إعادة التوجيه إلى")}>
          <Button title={t("Cancel", "إلغاء")} variant="ghost" onPress={() => setForward(null)} />
          {threads.map((th) => (
            <Button
              key={th.id}
              title={threadName(th)}
              variant="soft"
              onPress={async () => {
                if (
                  await act({
                    type: "message.send",
                    threadId: th.id,
                    body: forward.body,
                    attachment: forward.attachment,
                    forwarded: true,
                  })
                )
                  setForward(null);
              }}
            />
          ))}
        </Panel>
      )}
    </View>
  );
}

export function MeetingsPanel() {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const [create, setCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(calendarDay());
  const [time, setTime] = useState("13:00");
  const [agenda, setAgenda] = useState("");
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState("");
  const [invitees, setInvitees] = useState<string[]>([]);
  const [filter, setFilter] = useState("upcoming");
  return (
    <View style={kit.stack}>
      <View style={kit.wrap}>
        <Button
          title={create ? t("Close", "إغلاق") : t("Schedule meeting", "جدولة اجتماع")}
          onPress={() => setCreate(!create)}
        />
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "upcoming", label: t("Upcoming", "القادمة") },
            { id: "all", label: t("All", "الكل") },
          ]}
        />
      </View>
      {create && (
        <Panel tint={colors.softBlue}>
          <Field
            label={t("Meeting title", "عنوان الاجتماع")}
            value={title}
            onChangeText={setTitle}
          />
          <Field
            label={t("Find people", "ابحث عن الأشخاص")}
            value={search}
            onChangeText={setSearch}
          />
          <Chips
            value=""
            onChange={(id) =>
              setInvitees((old) => (old.includes(id) ? old.filter((i) => i !== id) : [...old, id]))
            }
            options={state.users
              .filter(
                (u) => u.id !== actorId && u.name.toLowerCase().includes(search.toLowerCase()),
              )
              .slice(0, search ? 15 : 6)
              .map((u) => ({ id: u.id, label: `${invitees.includes(u.id) ? "✓ " : ""}${u.name}` }))}
          />
          <AppText variant="caption">
            {invitees.map((id) => state.users.find((u) => u.id === id)?.name).join(" · ")}
          </AppText>
          <Field
            label={t("Date (YYYY-MM-DD)", "التاريخ (YYYY-MM-DD)")}
            value={date}
            onChangeText={setDate}
            keyboardType="numbers-and-punctuation"
          />
          <Field
            label={t("Time (HH:mm)", "الوقت (HH:mm)")}
            value={time}
            onChangeText={setTime}
            keyboardType="numbers-and-punctuation"
          />
          <Field
            label={t("Agenda", "أجندة الاجتماع")}
            value={agenda}
            onChangeText={setAgenda}
            multiline
          />
          <Field
            label={t("Location or meeting link", "المكان أو رابط الاجتماع")}
            value={location}
            onChangeText={setLocation}
          />
          <Button
            title={t("Save invitations", "حفظ الدعوات")}
            disabled={!title.trim() || !invitees.length}
            onPress={async () => {
              if (
                await act({
                  type: "meeting.create",
                  title,
                  inviteeIds: invitees,
                  date,
                  time,
                  agenda,
                  location,
                })
              ) {
                setCreate(false);
                setTitle("");
                setInvitees([]);
              }
            }}
          />
        </Panel>
      )}
      {state.meetings
        .filter(
          (m) =>
            (m.creatorId === actorId || m.inviteeIds.includes(actorId)) &&
            (filter === "all" || (!m.cancelled && m.date >= calendarDay())),
        )
        .map((m) => (
          <Panel key={m.id}>
            <AppText variant="heading">{m.title}</AppText>
            <AppText tone="primary">
              {m.date} · {m.time}
            </AppText>
            <AppText>{m.agenda}</AppText>
            <AppText tone="muted">{m.location}</AppText>
            {m.inviteeIds.map((id) => (
              <AppText key={id} variant="caption">
                {state.users.find((u) => u.id === id)?.name} ·{" "}
                {m.responses[id] ?? t("Pending", "بانتظار الرد")}
              </AppText>
            ))}
            {m.cancelled ? (
              <AppText tone="danger">{t("Cancelled", "ملغي")}</AppText>
            ) : m.creatorId === actorId ? (
              <Button
                title={t("Cancel meeting", "إلغاء الاجتماع")}
                variant="danger"
                onPress={async () => await act({ type: "meeting.cancel", id: m.id })}
              />
            ) : (
              <View style={kit.wrap}>
                <Button
                  title={t("Accept", "قبول")}
                  onPress={async () => await act({ type: "meeting.respond", id: m.id, response: "accepted" })}
                />
                <Button
                  title={t("Decline", "رفض")}
                  variant="ghost"
                  onPress={async () => await act({ type: "meeting.respond", id: m.id, response: "declined" })}
                />
              </View>
            )}
          </Panel>
        ))}
    </View>
  );
}
