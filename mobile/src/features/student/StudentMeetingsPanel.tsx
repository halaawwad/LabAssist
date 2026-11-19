import { MobileInput as TextInput } from "@/components/MobileInput";
import { Disclosure } from "@/components/Disclosure";
import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { MobileModal as Modal } from "@/components/MobileModal";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  AccessibilityInfo,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  findNodeHandle,
  type LayoutChangeEvent,
} from "react-native";
import { useLanguage } from "@/i18n";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react-native";
import { AppText, Button } from "@/components";
import { Chips, Field, useCopy, SearchField } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { type Meeting } from "@/domain/workspace";
import { meetingDay, meetingInstant, meetingZone } from "@/domain/meetingTime";
import { router } from "@/native/router";
import { MeetingCalendar, MeetingClock } from "./MeetingCalendar";

function start(m: Meeting) {
  return meetingInstant(m.date, m.time);
}
const meetingLocale = (language: string) => (language === "ar" ? "ar-u-nu-latn" : "en-US");
function labelDate(m: Meeting, language: string) {
  return new Date(start(m)).toLocaleDateString(meetingLocale(language), {
    timeZone: meetingZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function labelTime(m: Meeting, language: string) {
  return new Date(start(m)).toLocaleTimeString(meetingLocale(language), {
    timeZone: meetingZone,
    hour: "numeric",
    minute: "2-digit",
  });
}
type FieldKey = "title" | "date" | "time" | "duration" | "person" | "location";
const fieldOrder: FieldKey[] = ["title", "date", "time", "duration", "person", "location"];
export function StudentMeetingsPanel() {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const { formatLongDate, language } = useLanguage();
  const statusText = (m: Meeting) =>
    m.cancelled
      ? t("Cancelled", "ملغى")
      : m.completed
        ? t("Completed", "مكتمل")
        : t("Scheduled", "مجدول");
  const filterText: Record<string, string> = {
    Upcoming: t("Upcoming", "القادمة"),
    Past: t("Past", "السابقة"),
    All: t("All", "الكل"),
    Cancelled: t("Cancelled", "الملغاة"),
  };
  const responseText = (value: string) =>
    ({
      accepted: t("Accepted", "مقبولة"),
      declined: t("Declined", "مرفوضة"),
      pending: t("Pending invitation", "دعوة معلقة"),
    })[value] ?? value;
  const me = state.users.find((u) => u.id === actorId)!;
  const project = state.projects.find((p) => p.studentIds.includes(actorId));
  const today = meetingDay(new Date());
  const [now, setNow] = useState(Date.now),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("Upcoming"),
    [selectedDay, setSelectedDay] = useState("");
  const [month, setMonth] = useState(today.slice(0, 7)),
    [calendarOpen, setCalendarOpen] = useState(false);
  const [sheet, setSheet] = useState<"form" | "person" | "date" | "detail" | "cancel" | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState(""),
    [date, setDate] = useState(""),
    [time, setTime] = useState("13:00"),
    [duration, setDuration] = useState("30"),
    [location, setLocation] = useState(""),
    [agenda, setAgenda] = useState("");
  const [type, setType] = useState<"team" | "individual">("team"),
    [person, setPerson] = useState(""),
    [personDraft, setPersonDraft] = useState(""),
    [personQuery, setPersonQuery] = useState(""),
    [dateMonth, setDateMonth] = useState(today.slice(0, 7));
  const [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  // Field validation is shown inline and summarised beside Save; a failed save (storage or
  // a refused change) is reported separately and never marks valid fields invalid.
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saveError, setSaveError] = useState("");
  const formScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const fieldY = useRef<Partial<Record<FieldKey, number>>>({});
  const titleRef = useRef<ComponentRef<typeof TextInput>>(null);
  const timeRef = useRef<ComponentRef<typeof TextInput>>(null);
  const locationRef = useRef<ComponentRef<typeof TextInput>>(null);
  const dateRef = useRef<ComponentRef<typeof Pressable>>(null);
  const personRef = useRef<ComponentRef<typeof Pressable>>(null);
  const recordY = (key: FieldKey, event: LayoutChangeEvent) => {
    fieldY.current[key] = event.nativeEvent.layout.y;
  };
  const clearField = (key: FieldKey) => {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setError("");
  };
  const focusField = (key: FieldKey) => {
    if (Platform.OS === "web") {
      const field = document.querySelector(`[data-testid="meeting-field-${key}"]`);
      const control = field?.querySelector<HTMLElement>("input, textarea, button, [tabindex='0']");
      (control ?? field)?.scrollIntoView({ block: "nearest" });
      control?.focus();
      return;
    }
    const refs = {
      title: titleRef,
      time: timeRef,
      location: locationRef,
      date: dateRef,
      person: personRef,
    };
    const target = (key === "duration" ? null : refs[key].current) as
      { focus?: () => void } | null | undefined;
    target?.focus?.();
    if (target) {
      const node = findNodeHandle(target as never);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }
  };
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const meetings = state.meetings.filter(
    (m) => m.creatorId === actorId || m.inviteeIds.includes(actorId),
  );
  const past = (m: Meeting) => !!m.completed || start(m) + (m.duration ?? 30) * 60000 < now;
  const upcoming = meetings
    .filter((m) => !m.cancelled && !past(m))
    .sort((a, b) => start(a) - start(b));
  const visible = meetings
    .filter(
      (m) =>
        (filter === "All" ||
          (filter === "Upcoming" && !m.cancelled && !past(m)) ||
          (filter === "Past" && past(m) && !m.cancelled) ||
          (filter === "Cancelled" && m.cancelled)) &&
        (!selectedDay || m.date === selectedDay) &&
        `${m.title} ${m.location} ${m.agenda}`.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => (filter === "Past" ? start(b) - start(a) : start(a) - start(b)));
  const active = meetings.find((m) => m.id === selected);
  const selectedPerson = state.users.find((u) => u.id === person);
  const people = state.users.filter(
    (u) =>
      u.id !== actorId &&
      `${u.name} ${u.role} ${u.email} ${u.universityNumber ?? ""}`
        .toLowerCase()
        .includes(personQuery.trim().toLowerCase()),
  );
  const members = (m: Meeting) =>
    [m.creatorId, ...m.inviteeIds]
      .map((id) => state.users.find((u) => u.id === id))
      .filter((u): u is NonNullable<typeof u> => !!u);
  const meetingType = (m: Meeting) =>
    m.meetingType ?? (m.inviteeIds.length > 1 ? "team" : "individual");
  function openForm(m?: Meeting) {
    setEditing(m?.id ?? null);
    setTitle(m?.title ?? "");
    setDate(m?.date ?? "");
    setDateMonth((m?.date || today).slice(0, 7));
    setTime(m?.time ?? "13:00");
    setDuration(String(m?.duration ?? 30));
    setLocation(m?.location ?? "");
    setAgenda(m?.agenda ?? "");
    setType(m ? meetingType(m) : "team");
    setPerson(
      m && meetingType(m) === "individual" ? (m.inviteeIds.find((id) => id !== actorId) ?? "") : "",
    );
    setError("");
    setFieldErrors({});
    setSaveError("");
    setPersonQuery("");
    setSheet("form");
  }
  // One save at a time; on a refused save the form keeps everything entered.
  const [savingMeeting, setSavingMeeting] = useState(false);
  const meetingSavePending = useRef(false);
  async function submit() {
    if (meetingSavePending.current) return;
    meetingSavePending.current = true;
    setSavingMeeting(true);
    try {
      await save();
    } finally {
      meetingSavePending.current = false;
      setSavingMeeting(false);
    }
  }
  async function save() {
    const errors: Partial<Record<FieldKey, string>> = {};
    if (!title.trim()) errors.title = t("Add a meeting title.", "أضف عنوانًا للاجتماع.");
    if (!date) errors.date = t("Choose a date.", "اختر تاريخًا.");
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    if (!validTime) errors.time = t("Use HH:mm, for example 13:30.", "استخدم HH:mm، مثل 13:30.");
    const minutes = Number(duration);
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 240)
      errors.duration = t("Choose between 15 and 240 minutes.", "اختر مدة بين 15 و240 دقيقة.");
    const inviteeIds =
      type === "team"
        ? (project?.studentIds.filter((id) => id !== actorId) ?? [])
        : person
          ? [person]
          : [];
    if (!inviteeIds.length)
      errors.person =
        type === "team"
          ? t("Your project has no teammates to invite.", "لا يوجد زملاء في مشروعك لدعوتهم.")
          : t("Choose someone to meet.", "اختر شخصًا للقاء.");
    if (!location.trim())
      errors.location = t("Add a location or meeting link.", "أضف مكانًا أو رابط اجتماع.");
    if (date && validTime) {
      const instant = meetingInstant(date, time);
      if (!Number.isFinite(instant))
        errors.date = t("Choose a valid date and time.", "اختر تاريخًا ووقتًا صحيحين.");
      else if (instant <= now)
        errors.date = t("Choose a future date and time.", "اختر تاريخًا ووقتًا في المستقبل.");
    }
    const invalid = fieldOrder.filter((key) => errors[key]);
    setFieldErrors(errors);
    setSaveError("");
    if (invalid.length) {
      setError(
        invalid.length === 1
          ? errors[invalid[0]]!
          : t(
              `${invalid.length} fields need attention.`,
              `${invalid.length} حقول تحتاج إلى مراجعة.`,
            ),
      );
      const first = invalid[0];
      if (Platform.OS === "web") {
        requestAnimationFrame(() => focusField(first));
      } else {
        formScroll.current?.scrollTo({
          y: Math.max(0, (fieldY.current[first] ?? 0) - 16),
          animated: true,
        });
        setTimeout(() => focusField(first), 300);
      }
      return;
    }
    setError("");
    const details = {
      title: title.trim(),
      inviteeIds,
      date,
      time,
      duration: minutes,
      location: location.trim(),
      agenda: agenda.trim(),
      meetingType: type,
      ...(type === "team" && project ? { projectId: project.id } : {}),
    };
    if (
      await act(
        editing
          ? { type: "meeting.update", id: editing, ...details }
          : { type: "meeting.create", ...details },
      )
    ) {
      // Keep the saving sheet in place through a rapid second tap, so that tap cannot
      // land on the navigation underneath after a fast local save.
      await new Promise((resolve) => setTimeout(resolve, 350));
      setSheet(null);
      setNotice(
        editing
          ? t("Meeting updated.", "تم تحديث الاجتماع.")
          : t("Meeting scheduled.", "تمت جدولة الاجتماع."),
      );
      setFilter("Upcoming");
      setSelectedDay("");
      setQuery("");
    } else
      // Everything entered stays in the form; no field is marked invalid for a failed save.
      setSaveError(
        t(
          "Could not save this meeting. Everything you entered is kept — check storage access, then try Save again.",
          "تعذر حفظ الاجتماع. كل ما أدخلته محفوظ — تحقق من إذن التخزين ثم أعد الحفظ.",
        ),
      );
  }
  async function openChat(m?: Meeting) {
    const ids = m ? [m.creatorId, ...m.inviteeIds] : (project?.studentIds ?? []);
    const team = !m || meetingType(m) === "team";
    const target = team
      ? state.threads.find(
          (th) => th.projectId === (m?.projectId || project?.id) && th.memberIds.includes(actorId),
        )
      : state.threads.find(
          (th) =>
            !th.projectId &&
            th.memberIds.length === 2 &&
            ids.every((id) => th.memberIds.includes(id)),
        );
    let id = target?.id;
    if (!id && !team) {
      const other = ids.find((id) => id !== actorId);
      if (other && (await act({ type: "thread.create", userId: other }))) id = `person:${other}`;
    }
    if (!id)
      return setNotice(
        t(
          "A conversation is not available for these participants.",
          "لا تتوفر محادثة لهؤلاء المشاركين.",
        ),
      );
    setSheet(null);
    router.push(
      `/native/student/messages?chat=${encodeURIComponent(id)}` as import("expo-router").Href,
    );
  }
  function openLink(url: string) {
    Linking.openURL(url).catch(() =>
      setNotice(t("Could not open the meeting link.", "تعذر فتح رابط الاجتماع.")),
    );
  }
  const next = upcoming[0];
  return (
    <View style={s.page}>
      <View style={s.top}>
        <View style={s.flex}>
          <AppText variant="caption" tone="muted">
            {t("Plan time with your team and supervisor.", "خطط لوقت مع فريقك ومشرفك.")}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Schedule Meeting", "جدولة اجتماع")}
          style={s.add}
          onPress={() => openForm()}
        >
          <Plus color="white" size={21} />
        </Pressable>
      </View>
      <Disclosure
        title={t(
          "Meeting overview",
          "\u0646\u0638\u0631\u0629 \u0639\u0644\u0649 \u0627\u0644\u0627\u062c\u062a\u0645\u0627\u0639\u0627\u062a",
        )}
      >
        <View style={s.hero}>
          <View style={s.projectLabel}>
            <Users size={14} color="#667e54" />
            <AppText style={s.projectName}>{project?.title ?? t("Your project", "مشروعك")}</AppText>
          </View>
          <AppText style={s.heroTitle}>{t("A shared moment.", "لحظة مشتركة.")}</AppText>
          <AppText style={[s.heroTitle, s.accent]}>
            {t("A clearer next step.", "خطوة تالية أوضح.")}
          </AppText>
          <AppText style={s.copy}>
            {t(
              "Bring your questions, review the progress, and leave with a plan.",
              "أحضر أسئلتك، راجع التقدم، واخرج بخطة.",
            )}
          </AppText>
          <View style={s.stats}>
            {[
              [upcoming.length, t("Upcoming", "القادمة")],
              [meetings.filter((m) => m.completed).length, t("Completed", "المكتملة")],
              [project?.studentIds.length ?? 1, t("Teammates", "الزملاء")],
            ].map(([n, label], i) => (
              <View style={s.stat} key={label}>
                <AppText style={[s.statValue, { color: ["#6b8ca6", "#7d9270", "#aa8a60"][i] }]}>
                  {n}
                </AppText>
                <AppText style={s.small}>{label}</AppText>
              </View>
            ))}
          </View>
          <View style={s.next}>
            <MeetingClock {...(next ? { next: start(next) } : {})} />
            <AppText style={s.eyebrow}>{t("NEXT ON YOUR CALENDAR", "التالي في تقويمك")}</AppText>
            <AppText style={s.nextTitle}>
              {next?.title ?? t("A little space to plan.", "مساحة صغيرة للتخطيط.")}
            </AppText>
            <AppText style={s.copy}>
              {next
                ? `${labelDate(next, language)} · ${labelTime(next, language)}`
                : t("No upcoming meetings.", "لا توجد اجتماعات قادمة.")}
            </AppText>
            {next && (
              <AppText style={s.small}>
                {next.duration ?? 30} {t("min", "دقيقة")} ·{" "}
                {next.sample ? t("Example meeting", "اجتماع تجريبي") : t("Scheduled", "مجدول")}
              </AppText>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                next
                  ? t("View next meeting", "عرض الاجتماع التالي")
                  : t("Schedule your next meeting", "جدولة اجتماعك القادم")
              }
              style={s.link}
              onPress={() => (next ? (setSelected(next.id), setSheet("detail")) : openForm())}
            >
              <AppText style={s.linkText}>
                {next
                  ? t("View meeting", "عرض الاجتماع")
                  : t("Schedule your next meeting", "جدولة اجتماعك القادم")}
              </AppText>
              <ChevronRight size={16} color="#7496b1" />
            </Pressable>
          </View>
        </View>
      </Disclosure>
      {!!notice && (
        <View accessibilityRole="alert" style={s.notice}>
          <AppText style={[s.copy, s.flex]}>{notice}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Dismiss notice", "إخفاء الإشعار")}
            onPress={() => setNotice("")}
          >
            <X size={17} color="#62784f" />
          </Pressable>
        </View>
      )}
      <View style={s.listPanel}>
        <View style={s.top}>
          <AppText style={s.sectionTitle}>{t("Your meetings", "اجتماعاتك")}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Toggle calendar", "إظهار التقويم أو إخفاؤه")}
            accessibilityState={{ expanded: calendarOpen }}
            style={s.calendarButton}
            onPress={() => setCalendarOpen(!calendarOpen)}
          >
            <CalendarDays size={18} color="#8d7eac" />
            <AppText style={s.calendarText}>{t("Calendar", "التقويم")}</AppText>
          </Pressable>
        </View>
        {calendarOpen && (
          <>
            <MeetingCalendar
              month={month}
              selected={selectedDay}
              onMonth={setMonth}
              onSelect={(day) => {
                setSelectedDay(day === selectedDay ? "" : day);
                setFilter("All");
              }}
              marked={meetings.filter((m) => !m.cancelled).map((m) => m.date)}
            />
            <Button
              title={t("Back to this month", "العودة إلى هذا الشهر")}
              variant="ghost"
              size="sm"
              onPress={() => {
                setMonth(today.slice(0, 7));
                setSelectedDay("");
              }}
            />
          </>
        )}
        <View style={s.search}>
          <Search size={17} color="#8a9979" />
          <TextInput
            accessibilityLabel={t("Search meetings", "البحث في الاجتماعات")}
            placeholder={t("Search meetings…", "ابحث في الاجتماعات…")}
            placeholderTextColor="#929c8b"
            value={query}
            onChangeText={setQuery}
            style={s.searchInput}
          />
          {!!query && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Clear meeting search", "مسح البحث")}
              onPress={() => setQuery("")}
            >
              <X size={16} color="#6f815d" />
            </Pressable>
          )}
        </View>
        <View style={s.filters}>
          {["Upcoming", "Past", "All", "Cancelled"].map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === value }}
              onPress={() => setFilter(value)}
              style={[s.filter, filter === value && s.selectedFilter]}
            >
              <AppText style={[s.filterText, filter === value && s.white]}>
                {filterText[value]}
              </AppText>
            </Pressable>
          ))}
        </View>
        {!!selectedDay && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Clear date filter", "مسح تصفية التاريخ")}
            onPress={() => setSelectedDay("")}
            style={s.dayFilter}
          >
            <AppText style={s.small}>
              {formatLongDate(selectedDay)} · {t("Clear date", "مسح التاريخ")}
            </AppText>
            <X size={14} color="#8e7da7" />
          </Pressable>
        )}
        {visible.map((m) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t("View", "عرض")} ${m.title}`}
            key={m.id}
            style={[s.meetingCard, m.cancelled && s.cancelled]}
            onPress={() => {
              setSelected(m.id);
              setSheet("detail");
            }}
          >
            <View style={s.dateTile}>
              <AppText style={s.dateMonth}>
                {new Date(start(m)).toLocaleDateString(meetingLocale(language), {
                  timeZone: meetingZone,
                  month: "short",
                })}
              </AppText>
              <AppText style={s.dateDay}>{m.date.slice(-2)}</AppText>
            </View>
            <View style={s.flex}>
              <View style={s.badges}>
                <AppText style={[s.badge, meetingType(m) === "individual" && s.individual]}>
                  {meetingType(m) === "team"
                    ? t("Team meeting", "اجتماع فريق")
                    : t("One-to-one", "لقاء فردي")}
                </AppText>
                <AppText style={[s.badge, m.cancelled && s.cancelBadge]}>{statusText(m)}</AppText>
                {m.sample && <AppText style={s.example}>{t("Example", "مثال")}</AppText>}
              </View>
              <AppText style={s.meetingTitle}>{m.title}</AppText>
              <AppText style={s.small}>
                {labelTime(m, language)} · {m.duration ?? 30} {t("min", "دقيقة")}
              </AppText>
              <AppText style={s.small}>{m.location}</AppText>
              <AppText style={s.peopleMeta}>
                {members(m).length} {t("participants", "مشاركين")} ·{" "}
                {meetingType(m) === "team"
                  ? t("Project Team", "فريق المشروع")
                  : (members(m).find((u) => u.id !== actorId)?.name ?? t("Participant", "مشارك"))}
              </AppText>
            </View>
            <ChevronRight size={17} color="#97a186" />
          </Pressable>
        ))}
        {!visible.length && (
          <View style={s.empty}>
            <CalendarDays size={35} color="#8e9f80" />
            <AppText style={s.sectionTitle}>
              {t("No meetings here yet.", "لا توجد اجتماعات هنا بعد.")}
            </AppText>
            <AppText style={s.copy}>
              {t(
                "Try another filter or schedule a time to get together.",
                "جرّب تصفية أخرى أو حدّد وقتًا للقاء.",
              )}
            </AppText>
            <Button
              title={t("Show all meetings", "عرض كل الاجتماعات")}
              variant="soft"
              size="sm"
              onPress={() => {
                setQuery("");
                setFilter("All");
                setSelectedDay("");
              }}
            />
          </View>
        )}
      </View>
      <View style={s.tip}>
        <MessageCircle color="#8e80a8" size={24} />
        <AppText style={s.sectionTitle}>{t("Make the time count.", "اجعل الوقت مثمرًا.")}</AppText>
        <AppText style={s.copy}>
          {t(
            "Add an agenda before you meet. Keep the decisions and next steps in your meeting notes.",
            "أضف جدول أعمال قبل اللقاء، واحفظ القرارات والخطوات التالية في ملاحظات الاجتماع.",
          )}
        </AppText>
        <Button
          title={t("Open team conversation ↗", "فتح محادثة الفريق ↗")}
          variant="ghost"
          size="sm"
          onPress={async () => await openChat()}
        />
      </View>
      <Modal
        visible={sheet !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSheet(sheet === "person" || sheet === "date" ? "form" : null)}
      >
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <AppText style={[s.sectionTitle, s.flex]}>
              {sheet === "form"
                ? editing
                  ? t("Edit Meeting", "تعديل الاجتماع")
                  : t("Schedule Meeting", "جدولة اجتماع")
                : sheet === "person"
                  ? t("Choose a person", "اختر شخصًا")
                  : sheet === "date"
                    ? t("Choose a date", "اختر تاريخًا")
                    : sheet === "cancel"
                      ? t("Cancel meeting?", "إلغاء الاجتماع؟")
                      : t("Meeting details", "تفاصيل الاجتماع")}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Close meeting dialog", "إغلاق")}
              onPress={() => setSheet(sheet === "person" || sheet === "date" ? "form" : null)}
              style={s.close}
            >
              <X size={22} color="#61774e" />
            </Pressable>
          </View>
          <ScrollView
            ref={formScroll}
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.modalContent}
          >
            {sheet === "form" && (
              <>
                <View style={s.formIntro}>
                  <AppText style={s.copy}>
                    {project?.title} ·{" "}
                    {t(
                      "Choose a time and give everyone a clear agenda.",
                      "اختر وقتًا وحدد جدول أعمال واضحًا للجميع.",
                    )}
                  </AppText>
                </View>
                <View testID="meeting-field-title" onLayout={(event) => recordY("title", event)}>
                  <Field
                    ref={titleRef}
                    label={t("Meeting title", "عنوان الاجتماع")}
                    value={title}
                    error={fieldErrors.title}
                    onChangeText={(value) => {
                      setTitle(value);
                      clearField("title");
                    }}
                    maxLength={120}
                  />
                </View>
                <View
                  testID="meeting-field-date"
                  onLayout={(event) => recordY("date", event)}
                  style={s.fieldGroup}
                >
                  <AppText style={s.label}>
                    {t("Date & time · Palestine time", "التاريخ والوقت · توقيت فلسطين")}
                  </AppText>
                  <Pressable
                    ref={dateRef}
                    accessibilityRole="button"
                    accessibilityLabel={t("Choose meeting date", "اختيار تاريخ الاجتماع")}
                    accessibilityHint={fieldErrors.date}
                    aria-invalid={!!fieldErrors.date}
                    onPress={() => {
                      setDateMonth((date || today).slice(0, 7));
                      setSheet("date");
                    }}
                    style={[s.dateInput, !!fieldErrors.date && s.invalid]}
                  >
                    <CalendarDays size={19} color="#728eab" />
                    <AppText style={s.copy}>
                      {date ? formatLongDate(date) : t("Choose date", "اختر التاريخ")}
                    </AppText>
                  </Pressable>
                  {!!fieldErrors.date && (
                    <AppText variant="caption" tone="danger">
                      {fieldErrors.date}
                    </AppText>
                  )}
                </View>
                <View testID="meeting-field-time" onLayout={(event) => recordY("time", event)}>
                  <Field
                    ref={timeRef}
                    label={t("Time (HH:mm)", "الوقت (HH:mm)")}
                    value={time}
                    error={fieldErrors.time}
                    onChangeText={(value) => {
                      setTime(value);
                      clearField("time");
                      clearField("date");
                    }}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
                <Chips
                  value={time}
                  onChange={(value) => {
                    setTime(value);
                    clearField("time");
                    clearField("date");
                  }}
                  options={[
                    "09:00",
                    "10:00",
                    "11:00",
                    "12:00",
                    "13:00",
                    "14:00",
                    "15:00",
                    "16:00",
                  ].map((v) => ({ id: v, label: v }))}
                />
                <View onLayout={(event) => recordY("duration", event)}>
                  <AppText style={s.label}>{t("Duration", "المدة")}</AppText>
                </View>
                <Chips
                  value={duration}
                  onChange={(value) => {
                    setDuration(value);
                    clearField("duration");
                  }}
                  options={[15, 30, 40, 45, 60, 90, 120].map((v) => ({
                    id: String(v),
                    label: `${v} ${t("min", "دقيقة")}`,
                  }))}
                />
                {!!fieldErrors.duration && (
                  <AppText variant="caption" tone="danger">
                    {fieldErrors.duration}
                  </AppText>
                )}
                <View onLayout={(event) => recordY("person", event)}>
                  <AppText style={s.label}>{t("Who are you meeting?", "مع من ستلتقي؟")}</AppText>
                </View>
                <View testID="meeting-field-person" style={s.typePicker}>
                  {(["team", "individual"] as const).map((v) => (
                    <Pressable
                      key={v}
                      ref={type === v ? personRef : undefined}
                      accessibilityRole="button"
                      accessibilityLabel={
                        v === "team" ? t("With my team", "مع فريقي") : t("One-to-one", "لقاء فردي")
                      }
                      accessibilityState={{ selected: type === v }}
                      onPress={() => {
                        setType(v);
                        setPerson("");
                        clearField("person");
                      }}
                      style={[s.typeOption, type === v && s.typeChosen]}
                    >
                      {v === "team" ? (
                        <Users size={20} color="#7a8d65" />
                      ) : (
                        <MessageCircle size={20} color="#8c7ca7" />
                      )}
                      <AppText style={s.typeText}>
                        {v === "team"
                          ? t("With my team", "مع فريقي")
                          : t("One-to-one", "لقاء فردي")}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                {type === "team" ? (
                  <View style={s.chosenPerson}>
                    <Users color="#829269" size={22} />
                    <View style={s.flex}>
                      <AppText style={s.label}>{t("Project team", "فريق المشروع")}</AppText>
                      <AppText style={s.copy}>
                        {project?.studentIds
                          .map((id) => state.users.find((u) => u.id === id)?.name)
                          .join(", ") ?? me.name}
                      </AppText>
                    </View>
                  </View>
                ) : (
                  <View style={s.chosenPerson}>
                    {selectedPerson && (
                      <>
                        <View style={s.avatar}>
                          <AppText style={s.avatarText}>
                            {selectedPerson.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </AppText>
                        </View>
                        <View style={s.flex}>
                          <AppText style={s.label}>{selectedPerson.name}</AppText>
                          <AppText style={s.small}>{selectedPerson.role}</AppText>
                        </View>
                      </>
                    )}
                    <Button
                      title={
                        selectedPerson
                          ? t("Change person", "تغيير الشخص")
                          : t("Choose a person", "اختر شخصًا")
                      }
                      variant="soft"
                      size="sm"
                      onPress={() => {
                        setPersonDraft(person);
                        setPersonQuery("");
                        setSheet("person");
                      }}
                    />
                  </View>
                )}
                {!!fieldErrors.person && (
                  <AppText variant="caption" tone="danger">
                    {fieldErrors.person}
                  </AppText>
                )}
                <View
                  testID="meeting-field-location"
                  onLayout={(event) => recordY("location", event)}
                >
                  <Field
                    ref={locationRef}
                    label={t("Location or meeting link", "المكان أو رابط الاجتماع")}
                    placeholder={t("Engineering lab or https://…", "مختبر الهندسة أو https://…")}
                    value={location}
                    error={fieldErrors.location}
                    onChangeText={(value) => {
                      setLocation(value);
                      clearField("location");
                    }}
                    maxLength={300}
                  />
                </View>
                <Field
                  label={t("Agenda", "جدول الأعمال")}
                  placeholder={t("What should everyone prepare?", "ما الذي يجب أن يحضّره الجميع؟")}
                  value={agenda}
                  onChangeText={setAgenda}
                  maxLength={3000}
                  multiline
                />
              </>
            )}
            {sheet === "person" && (
              <>
                <AppText style={s.copy}>
                  {t(
                    "Select someone to meet, then save your choice.",
                    "اختر شخصًا للقاء ثم احفظ اختيارك.",
                  )}
                </AppText>
                <SearchField
                  label={t("Search meeting participants", "البحث عن مشاركين")}
                  placeholder={t(
                    "Search name, role or university number…",
                    "ابحث بالاسم أو الدور أو الرقم الجامعي…",
                  )}
                  value={personQuery}
                  onChangeText={setPersonQuery}
                />
                {people.map((u) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t("Select", "اختيار")} ${u.name}`}
                    accessibilityState={{ selected: personDraft === u.id }}
                    key={u.id}
                    onPress={() => setPersonDraft(u.id)}
                    style={[s.personOption, personDraft === u.id && s.personSelected]}
                  >
                    <View style={[s.avatar, u.role === "supervisor" && s.individual]}>
                      <AppText style={s.avatarText}>
                        {u.name
                          .replace("Dr. ", "")
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </AppText>
                    </View>
                    <View style={s.flex}>
                      <AppText style={s.label}>{u.name}</AppText>
                      <AppText style={s.small}>
                        {u.role} · {u.universityNumber ?? u.email}
                      </AppText>
                    </View>
                    {personDraft === u.id && <Check size={18} color="#668252" />}
                  </Pressable>
                ))}
                {!people.length && (
                  <AppText style={s.copy}>
                    {t("No matching people.", "لا يوجد أشخاص مطابقون.")}
                  </AppText>
                )}
                <View style={s.actions}>
                  <Button
                    title={t("Cancel", "إلغاء")}
                    variant="ghost"
                    onPress={() => setSheet("form")}
                  />
                  <Button
                    title={t("Save Person", "حفظ الشخص")}
                    disabled={!personDraft}
                    onPress={() => {
                      setPerson(personDraft);
                      setError("");
                      setSheet("form");
                    }}
                  />
                </View>
              </>
            )}
            {sheet === "date" && (
              <>
                <MeetingCalendar
                  month={dateMonth}
                  selected={date}
                  onMonth={setDateMonth}
                  onSelect={(day) => {
                    setDate(day);
                    setSheet("form");
                  }}
                  minimumDay={today}
                />
                <AppText style={s.copy}>
                  {t(
                    "Choose the meeting day. Times use Palestine time.",
                    "اختر يوم الاجتماع. الأوقات بتوقيت فلسطين.",
                  )}
                </AppText>
              </>
            )}
            {sheet === "detail" && active && (
              <>
                <AppText style={s.nextTitle}>{active.title}</AppText>
                <View style={s.badges}>
                  <AppText style={[s.badge, active.cancelled && s.cancelBadge]}>
                    {statusText(active)}
                  </AppText>
                  {active.sample && (
                    <AppText style={s.example}>{t("Example meeting", "اجتماع تجريبي")}</AppText>
                  )}
                </View>
                <View style={s.metaPanel}>
                  <View style={s.metaLine}>
                    <CalendarDays size={18} color="#8496af" />
                    <AppText style={s.copy}>{labelDate(active, language)}</AppText>
                  </View>
                  <View style={s.metaLine}>
                    <Clock3 size={18} color="#b2947a" />
                    <AppText style={s.copy}>
                      {labelTime(active, language)} · {active.duration ?? 30}{" "}
                      {t("minutes", "دقيقة")} · {t("Palestine time", "توقيت فلسطين")}
                    </AppText>
                  </View>
                  <View style={s.metaLine}>
                    <MapPin size={18} color="#8f80a6" />
                    <AppText style={[s.copy, s.flex]}>{active.location}</AppText>
                  </View>
                </View>
                {/^https:\/\//i.test(active.location) && !active.cancelled && !active.completed && (
                  <Button
                    title={t("Open Meeting Link ↗", "فتح رابط الاجتماع ↗")}
                    variant="soft"
                    onPress={() => openLink(active.location)}
                  />
                )}
                <AppText style={s.sectionTitle}>{t("Participants", "المشاركون")}</AppText>
                <View style={s.participants}>
                  {members(active).map((u) => (
                    <View style={s.participant} key={u.id}>
                      <AppText style={s.label}>{u.name}</AppText>
                      <AppText style={s.small}>
                        {u.id === active.creatorId
                          ? t("Organizer", "المنظم")
                          : responseText(active.responses[u.id] ?? "pending")}
                      </AppText>
                    </View>
                  ))}
                </View>
                <AppText style={s.sectionTitle}>{t("Agenda", "جدول الأعمال")}</AppText>
                <AppText style={s.copy}>{active.agenda || "No agenda added yet."}</AppText>
                <Field
                  label={t("Meeting notes & next steps", "ملاحظات الاجتماع والخطوات التالية")}
                  placeholder={t(
                    "Capture decisions, action items, and what happens next…",
                    "سجّل القرارات والمهام وما سيحدث لاحقًا…",
                  )}
                  value={active.notes ?? ""}
                  onChangeText={async (notes) =>
                    await act({ type: "meeting.notes", id: active.id, notes })
                  }
                  maxLength={5000}
                  multiline
                />
                <AppText style={s.small}>
                  {t("Notes are saved on this device.", "تُحفظ الملاحظات على هذا الجهاز.")}
                </AppText>
                <View style={s.actions}>
                  <Button
                    title={t("Open Chat", "فتح المحادثة")}
                    variant="soft"
                    size="sm"
                    onPress={async () => await openChat(active)}
                  />
                  {!active.cancelled &&
                    !active.completed &&
                    (active.creatorId === actorId ? (
                      <>
                        <Button
                          title={t("Edit", "تعديل")}
                          size="sm"
                          variant="soft"
                          onPress={() => openForm(active)}
                        />
                        <Button
                          title={t("Cancel Meeting", "إلغاء الاجتماع")}
                          variant="ghost"
                          size="sm"
                          onPress={() => setSheet("cancel")}
                        />
                        <Button
                          title={t("Mark Completed", "تعليم كمكتمل")}
                          size="sm"
                          onPress={async () => {
                            if (await act({ type: "meeting.complete", id: active.id }))
                              setNotice(
                                t("Meeting marked completed.", "تم تعليم الاجتماع كمكتمل."),
                              );
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <Button
                          title={t("Accept", "قبول")}
                          size="sm"
                          onPress={async () => {
                            if (
                              await act({
                                type: "meeting.respond",
                                id: active.id,
                                response: "accepted",
                              })
                            )
                              setNotice(t("Invitation accepted.", "تم قبول الدعوة."));
                          }}
                        />
                        <Button
                          title={t("Decline", "رفض")}
                          size="sm"
                          variant="ghost"
                          onPress={async () => {
                            if (
                              await act({
                                type: "meeting.respond",
                                id: active.id,
                                response: "declined",
                              })
                            )
                              setNotice(t("Invitation declined.", "تم رفض الدعوة."));
                          }}
                        />
                      </>
                    ))}
                </View>
              </>
            )}
            {sheet === "cancel" && active && (
              <>
                <AppText style={s.copy}>
                  {active.title} ·{" "}
                  {t(
                    "This meeting will remain visible under Cancelled.",
                    "سيظل هذا الاجتماع ظاهرًا ضمن الاجتماعات الملغاة.",
                  )}
                </AppText>
                <Button
                  title={t("Keep meeting", "الإبقاء على الاجتماع")}
                  variant="soft"
                  onPress={() => setSheet("detail")}
                />
                <Button
                  title={t("Confirm cancellation", "تأكيد الإلغاء")}
                  variant="danger"
                  onPress={async () => {
                    if (await act({ type: "meeting.cancel", id: active.id })) {
                      setSheet(null);
                      setNotice(t("Meeting cancelled.", "تم إلغاء الاجتماع."));
                    }
                  }}
                />
              </>
            )}
          </ScrollView>
          {/* The save action stays pinned above the keyboard and the home indicator. */}
          {sheet === "form" && (
            <View style={s.footer}>
              {!!(saveError || error) && (
                <AppText
                  tone="danger"
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  style={s.footerMessage}
                >
                  {saveError || error}
                </AppText>
              )}
              <Button
                title={
                  editing ? t("Save Changes", "حفظ التغييرات") : t("Save Meeting", "حفظ الاجتماع")
                }
                loading={savingMeeting}
                onPress={submit}
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  fieldGroup: { gap: 8 },
  invalid: { borderColor: "#d4402f", borderWidth: 1.5 },
  footerMessage: { fontSize: 14 },
  footer: {
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: "#e2e7d8",
    backgroundColor: "#fafbf7",
  },
  page: { gap: 18 },
  flex: { flex: 1, minWidth: 0 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 9 },
  eyebrow: { fontSize: 9, lineHeight: 15, letterSpacing: 1.2, color: "#8a967c", fontWeight: "600" },
  title: { fontSize: 21, lineHeight: 30, fontWeight: "800", color: "#182335" },
  add: {
    backgroundColor: "#61784f",
    height: 44,
    width: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    padding: 20,
    borderRadius: 25,
    backgroundColor: "#f7f9f2eb",
    borderWidth: 1,
    borderColor: "#ffffffdf",
    gap: 12,
  },
  projectLabel: { flexDirection: "row", gap: 7, alignItems: "center", marginBottom: 4 },
  projectName: { fontSize: 12, color: "#637950" },
  heroTitle: {
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -1,
    fontWeight: "800",
    color: "#152031",
  },
  accent: { color: "#647752", marginTop: -12 },
  copy: { fontSize: 12, lineHeight: 20, color: "#73816a" },
  stats: { flexDirection: "row", gap: 10, marginVertical: 3 },
  stat: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: "#ffffffc9", gap: 3 },
  statValue: { fontSize: 25, lineHeight: 31, fontWeight: "700" },
  small: { fontSize: 10, lineHeight: 17, color: "#8b967f" },
  next: {
    padding: 17,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d5e2ef",
    backgroundColor: "#f2f7fbef",
    gap: 8,
    marginTop: 6,
  },
  nextTitle: { fontSize: 20, lineHeight: 28, fontWeight: "700", color: "#17243a" },
  link: { flexDirection: "row", gap: 7, alignItems: "center", paddingTop: 7 },
  linkText: { fontSize: 12, lineHeight: 18, fontWeight: "600", color: "#6f94b1" },
  listPanel: {
    padding: 16,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#ffffffdb",
    backgroundColor: "#ffffffd6",
    gap: 15,
  },
  sectionTitle: { fontSize: 19, lineHeight: 26, fontWeight: "700", color: "#243443" },
  calendarButton: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    borderRadius: 12,
    padding: 9,
    backgroundColor: "#eeeaf5",
  },
  calendarText: { fontSize: 10, color: "#8d7eac", fontWeight: "600" },
  search: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e6d8",
    borderRadius: 15,
    backgroundColor: "#ffffffdd",
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: "#3b4b3e",
    paddingVertical: 13,
    outlineWidth: 0,
  },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filter: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e3d5",
    backgroundColor: "#f8f9f2",
  },
  selectedFilter: { backgroundColor: "#647b52", borderColor: "#647b52" },
  filterText: { fontSize: 10, lineHeight: 16, color: "#748365", fontWeight: "600" },
  white: { color: "white" },
  dayFilter: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 7,
    padding: 9,
    borderRadius: 12,
    backgroundColor: "#eeeaf5",
  },
  meetingCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e8dd",
  },
  cancelled: { opacity: 0.6 },
  dateTile: {
    width: 48,
    minHeight: 65,
    padding: 7,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e9eddc",
  },
  dateMonth: { fontSize: 10, lineHeight: 16, color: "#899375", fontWeight: "600" },
  dateDay: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: "#60774c" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 4, alignItems: "center" },
  badge: {
    fontSize: 8,
    lineHeight: 15,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: "#e6efde",
    borderRadius: 12,
    color: "#768768",
    fontWeight: "600",
    overflow: "hidden",
  },
  individual: { backgroundColor: "#e9e5f1", color: "#8a79a5" },
  cancelBadge: { backgroundColor: "#f1e4e7", color: "#a16b78" },
  example: { fontSize: 8, lineHeight: 14, color: "#9c9d88" },
  meetingTitle: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    color: "#273d43",
    marginVertical: 4,
  },
  peopleMeta: { fontSize: 9, lineHeight: 16, color: "#8c9c80", marginTop: 4 },
  empty: { alignItems: "center", gap: 11, paddingVertical: 26 },
  tip: { padding: 19, borderRadius: 22, backgroundColor: "#f1edf6e8", gap: 11 },
  notice: {
    padding: 13,
    backgroundColor: "#e7efdf",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  modal: { flex: 1, backgroundColor: "#f8f8f1" },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e6d7",
  },
  close: { height: 42, width: 42, alignItems: "center", justifyContent: "center" },
  modalContent: { padding: 20, gap: 16, paddingBottom: 40 },
  formIntro: { padding: 13, backgroundColor: "#eaf1f6", borderRadius: 15 },
  label: { fontSize: 12, lineHeight: 18, fontWeight: "600", color: "#526b47" },
  dateInput: {
    padding: 14,
    borderRadius: 15,
    backgroundColor: "#edf3f8",
    borderWidth: 1,
    borderColor: "#d9e4eb",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  typePicker: { flexDirection: "row", gap: 10 },
  typeOption: {
    flex: 1,
    alignItems: "center",
    padding: 15,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dfe4d5",
    backgroundColor: "#ffffff9f",
  },
  typeChosen: { borderColor: "#9aac8a", backgroundColor: "#e9efdf" },
  typeText: { fontSize: 11, lineHeight: 17, color: "#6b8159", fontWeight: "600" },
  chosenPerson: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    padding: 13,
    backgroundColor: "#edf1e5",
    borderRadius: 16,
  },
  avatar: {
    width: 39,
    height: 39,
    borderRadius: 15,
    backgroundColor: "#e1ead6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, color: "#6d8557", fontWeight: "600" },
  personOption: {
    flexDirection: "row",
    gap: 11,
    alignItems: "center",
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e5d8",
    backgroundColor: "#fffdf7",
  },
  personSelected: { borderColor: "#92a67a", backgroundColor: "#e7efdc" },
  error: { fontSize: 12, lineHeight: 19, color: "#aa6270" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 9, paddingTop: 6 },
  metaPanel: { padding: 15, gap: 12, backgroundColor: "#edf2f4", borderRadius: 17 },
  metaLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  participants: { gap: 9 },
  participant: { padding: 12, borderRadius: 14, backgroundColor: "#edf1e5", gap: 3 },
});
