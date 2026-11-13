import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
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
import { Chips, Field, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { type Meeting } from "@/domain/workspace";
import { meetingDay, meetingInstant, meetingZone } from "@/domain/meetingTime";
import { router } from "@/native/router";
import { MeetingCalendar, MeetingClock } from "./MeetingCalendar";

function start(m: Meeting) {
  return meetingInstant(m.date, m.time);
}
function labelDate(m: Meeting) {
  return new Date(start(m)).toLocaleDateString("en-US", {
    timeZone: meetingZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function labelTime(m: Meeting) {
  return new Date(start(m)).toLocaleTimeString("en-US", {
    timeZone: meetingZone,
    hour: "numeric",
    minute: "2-digit",
  });
}
const getStatus = (m: Meeting) =>
  m.cancelled ? "Cancelled" : m.completed ? "Completed" : "Scheduled";
export function StudentMeetingsPanel() {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
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
    setPersonQuery("");
    setSheet("form");
  }
  async function save() {
    const missing = [
      !title.trim() ? "meeting title" : "",
      !date ? "date and time" : "",
      type === "individual" && !person ? "a person to meet" : "",
      !location.trim() ? "location or meeting link" : "",
    ].filter(Boolean);
    if (missing.length) return setError(`Please add: ${missing.join(", ")}.`);
    const at = meetingInstant(date, time),
      minutes = Number(duration);
    if (!Number.isFinite(at)) return setError("Choose a valid date and time.");
    if (at <= now) return setError("Choose a future meeting time.");
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 240)
      return setError("Choose a duration between 15 and 240 minutes.");
    const inviteeIds =
      type === "team" ? (project?.studentIds.filter((id) => id !== actorId) ?? []) : [person];
    if (!inviteeIds.length) return setError("Choose someone to meet.");
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
      setSheet(null);
      setNotice(editing ? "Meeting updated." : "Meeting scheduled.");
      setFilter("Upcoming");
      setSelectedDay("");
      setQuery("");
    } else setError("Could not save this meeting. Check the selected participants and time.");
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
      if (other && await act({ type: "thread.create", userId: other })) id = `person:${other}`;
    }
    if (!id) return setNotice("A conversation is not available for these participants.");
    setSheet(null);
    router.push(
      `/native/student/messages?chat=${encodeURIComponent(id)}` as import("expo-router").Href,
    );
  }
  function openLink(url: string) {
    Linking.openURL(url).catch(() => setNotice("Could not open the meeting link."));
  }
  const next = upcoming[0];
  return (
    <View style={s.page}>
      <View style={s.top}>
        <View style={s.flex}>
          <AppText style={s.eyebrow}>
            {t("YOUR WORKSPACE / MAKE TIME TOGETHER", "مساحتك / وقت نلتقي فيه")}
          </AppText>
          <AppText style={s.title}>{t("Meetings", "الاجتماعات")}</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Schedule Meeting"
          style={s.add}
          onPress={() => openForm()}
        >
          <Plus color="white" size={21} />
        </Pressable>
      </View>
      <View style={s.hero}>
        <View style={s.projectLabel}>
          <Users size={14} color="#667e54" />
          <AppText style={s.projectName}>{project?.title ?? "Your project"}</AppText>
        </View>
        <AppText style={s.heroTitle}>A shared moment.</AppText>
        <AppText style={[s.heroTitle, s.accent]}>A clearer next step.</AppText>
        <AppText style={s.copy}>
          Bring your questions, review the progress, and leave with a plan.
        </AppText>
        <View style={s.stats}>
          {[
            [upcoming.length, "Upcoming"],
            [meetings.filter((m) => m.completed).length, "Completed"],
            [project?.studentIds.length ?? 1, "Teammates"],
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
          <AppText style={s.eyebrow}>NEXT ON YOUR CALENDAR</AppText>
          <AppText style={s.nextTitle}>{next?.title ?? "A little space to plan."}</AppText>
          <AppText style={s.copy}>
            {next ? `${labelDate(next)} · ${labelTime(next)}` : "No upcoming meetings."}
          </AppText>
          {next && (
            <AppText style={s.small}>
              {next.duration ?? 30} min · {next.sample ? "Example meeting" : "Scheduled"}
            </AppText>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={next ? "View next meeting" : "Schedule your next meeting"}
            style={s.link}
            onPress={() => (next ? (setSelected(next.id), setSheet("detail")) : openForm())}
          >
            <AppText style={s.linkText}>
              {next ? "View meeting" : "Schedule your next meeting"}
            </AppText>
            <ChevronRight size={16} color="#7496b1" />
          </Pressable>
        </View>
      </View>
      {!!notice && (
        <View accessibilityRole="alert" style={s.notice}>
          <AppText style={[s.copy, s.flex]}>{notice}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss notice"
            onPress={() => setNotice("")}
          >
            <X size={17} color="#62784f" />
          </Pressable>
        </View>
      )}
      <View style={s.listPanel}>
        <View style={s.top}>
          <AppText style={s.sectionTitle}>Your meetings</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle calendar"
            accessibilityState={{ expanded: calendarOpen }}
            style={s.calendarButton}
            onPress={() => setCalendarOpen(!calendarOpen)}
          >
            <CalendarDays size={18} color="#8d7eac" />
            <AppText style={s.calendarText}>Calendar</AppText>
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
              title="Back to this month"
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
            accessibilityLabel="Search meetings"
            placeholder="Search meetings…"
            placeholderTextColor="#929c8b"
            value={query}
            onChangeText={setQuery}
            style={s.searchInput}
          />
          {!!query && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear meeting search"
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
              <AppText style={[s.filterText, filter === value && s.white]}>{value}</AppText>
            </Pressable>
          ))}
        </View>
        {!!selectedDay && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear date filter"
            onPress={() => setSelectedDay("")}
            style={s.dayFilter}
          >
            <AppText style={s.small}>{selectedDay} · Clear date</AppText>
            <X size={14} color="#8e7da7" />
          </Pressable>
        )}
        {visible.map((m) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${m.title}`}
            key={m.id}
            style={[s.meetingCard, m.cancelled && s.cancelled]}
            onPress={() => {
              setSelected(m.id);
              setSheet("detail");
            }}
          >
            <View style={s.dateTile}>
              <AppText style={s.dateMonth}>
                {new Date(start(m)).toLocaleDateString("en-US", {
                  timeZone: meetingZone,
                  month: "short",
                })}
              </AppText>
              <AppText style={s.dateDay}>{m.date.slice(-2)}</AppText>
            </View>
            <View style={s.flex}>
              <View style={s.badges}>
                <AppText style={[s.badge, meetingType(m) === "individual" && s.individual]}>
                  {meetingType(m) === "team" ? "Team meeting" : "One-to-one"}
                </AppText>
                <AppText style={[s.badge, m.cancelled && s.cancelBadge]}>{getStatus(m)}</AppText>
                {m.sample && <AppText style={s.example}>Example</AppText>}
              </View>
              <AppText style={s.meetingTitle}>{m.title}</AppText>
              <AppText style={s.small}>
                {labelTime(m)} · {m.duration ?? 30} min
              </AppText>
              <AppText style={s.small}>{m.location}</AppText>
              <AppText style={s.peopleMeta}>
                {members(m).length} participants ·{" "}
                {meetingType(m) === "team"
                  ? "Project Team"
                  : (members(m).find((u) => u.id !== actorId)?.name ?? "Participant")}
              </AppText>
            </View>
            <ChevronRight size={17} color="#97a186" />
          </Pressable>
        ))}
        {!visible.length && (
          <View style={s.empty}>
            <CalendarDays size={35} color="#8e9f80" />
            <AppText style={s.sectionTitle}>No meetings here yet.</AppText>
            <AppText style={s.copy}>Try another filter or schedule a time to get together.</AppText>
            <Button
              title="Show all meetings"
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
        <AppText style={s.sectionTitle}>Make the time count.</AppText>
        <AppText style={s.copy}>
          Add an agenda before you meet. Keep the decisions and next steps in your meeting notes.
        </AppText>
        <Button
          title="Open team conversation ↗"
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
                  ? "Edit Meeting"
                  : "Schedule Meeting"
                : sheet === "person"
                  ? "Choose a person"
                  : sheet === "date"
                    ? "Choose a date"
                    : sheet === "cancel"
                      ? "Cancel meeting?"
                      : "Meeting details"}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close meeting dialog"
              onPress={() => setSheet(sheet === "person" || sheet === "date" ? "form" : null)}
              style={s.close}
            >
              <X size={22} color="#61774e" />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.modalContent}>
            {sheet === "form" && (
              <>
                <View style={s.formIntro}>
                  <AppText style={s.copy}>
                    {project?.title} · Choose a time and give everyone a clear agenda.
                  </AppText>
                </View>
                <Field
                  label="Meeting title"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={120}
                />
                <AppText style={s.label}>Date & time · Palestine time</AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose meeting date"
                  onPress={() => {
                    setDateMonth((date || today).slice(0, 7));
                    setSheet("date");
                  }}
                  style={s.dateInput}
                >
                  <CalendarDays size={19} color="#728eab" />
                  <AppText style={s.copy}>{date || "Choose date"}</AppText>
                </Pressable>
                <Field
                  label="Time (HH:mm)"
                  value={time}
                  onChangeText={setTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <Chips
                  value={time}
                  onChange={setTime}
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
                <AppText style={s.label}>Duration</AppText>
                <Chips
                  value={duration}
                  onChange={setDuration}
                  options={[15, 30, 40, 45, 60, 90, 120].map((v) => ({
                    id: String(v),
                    label: `${v} min`,
                  }))}
                />
                <AppText style={s.label}>Who are you meeting?</AppText>
                <View style={s.typePicker}>
                  {(["team", "individual"] as const).map((v) => (
                    <Pressable
                      key={v}
                      accessibilityRole="button"
                      accessibilityLabel={v === "team" ? "With my team" : "One-to-one"}
                      accessibilityState={{ selected: type === v }}
                      onPress={() => {
                        setType(v);
                        setPerson("");
                      }}
                      style={[s.typeOption, type === v && s.typeChosen]}
                    >
                      {v === "team" ? (
                        <Users size={20} color="#7a8d65" />
                      ) : (
                        <MessageCircle size={20} color="#8c7ca7" />
                      )}
                      <AppText style={s.typeText}>
                        {v === "team" ? "With my team" : "One-to-one"}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                {type === "team" ? (
                  <View style={s.chosenPerson}>
                    <Users color="#829269" size={22} />
                    <View style={s.flex}>
                      <AppText style={s.label}>Project team</AppText>
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
                      title={selectedPerson ? "Change person" : "Choose a person"}
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
                <Field
                  label="Location or meeting link"
                  placeholder="Engineering lab or https://…"
                  value={location}
                  onChangeText={setLocation}
                  maxLength={300}
                />
                <Field
                  label="Agenda"
                  placeholder="What should everyone prepare?"
                  value={agenda}
                  onChangeText={setAgenda}
                  maxLength={3000}
                  multiline
                />
                {!!error && (
                  <AppText accessibilityRole="alert" style={s.error}>
                    {error}
                  </AppText>
                )}
                <View style={s.actions}>
                  <Button title="Cancel" variant="ghost" onPress={() => setSheet(null)} />
                  <Button
                    title={editing ? "Save Changes" : "Save Meeting"}
                    disabled={type === "individual" && !person}
                    onPress={save}
                  />
                </View>
              </>
            )}
            {sheet === "person" && (
              <>
                <AppText style={s.copy}>Select someone to meet, then save your choice.</AppText>
                <Field
                  label="Search meeting participants"
                  placeholder="Search name, role or university number…"
                  value={personQuery}
                  onChangeText={setPersonQuery}
                />
                {people.map((u) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${u.name}`}
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
                {!people.length && <AppText style={s.copy}>No matching people.</AppText>}
                <View style={s.actions}>
                  <Button title="Cancel" variant="ghost" onPress={() => setSheet("form")} />
                  <Button
                    title="Save Person"
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
                <AppText style={s.copy}>Choose the meeting day. Times use Palestine time.</AppText>
              </>
            )}
            {sheet === "detail" && active && (
              <>
                <AppText style={s.nextTitle}>{active.title}</AppText>
                <View style={s.badges}>
                  <AppText style={[s.badge, active.cancelled && s.cancelBadge]}>
                    {getStatus(active)}
                  </AppText>
                  {active.sample && <AppText style={s.example}>Example meeting</AppText>}
                </View>
                <View style={s.metaPanel}>
                  <View style={s.metaLine}>
                    <CalendarDays size={18} color="#8496af" />
                    <AppText style={s.copy}>{labelDate(active)}</AppText>
                  </View>
                  <View style={s.metaLine}>
                    <Clock3 size={18} color="#b2947a" />
                    <AppText style={s.copy}>
                      {labelTime(active)} · {active.duration ?? 30} minutes · Palestine time
                    </AppText>
                  </View>
                  <View style={s.metaLine}>
                    <MapPin size={18} color="#8f80a6" />
                    <AppText style={[s.copy, s.flex]}>{active.location}</AppText>
                  </View>
                </View>
                {/^https:\/\//i.test(active.location) && !active.cancelled && !active.completed && (
                  <Button
                    title="Open Meeting Link ↗"
                    variant="soft"
                    onPress={() => openLink(active.location)}
                  />
                )}
                <AppText style={s.sectionTitle}>Participants</AppText>
                <View style={s.participants}>
                  {members(active).map((u) => (
                    <View style={s.participant} key={u.id}>
                      <AppText style={s.label}>{u.name}</AppText>
                      <AppText style={s.small}>
                        {u.id === active.creatorId
                          ? "Organizer"
                          : (active.responses[u.id] ?? "Pending invitation")}
                      </AppText>
                    </View>
                  ))}
                </View>
                <AppText style={s.sectionTitle}>Agenda</AppText>
                <AppText style={s.copy}>{active.agenda || "No agenda added yet."}</AppText>
                <Field
                  label="Meeting notes & next steps"
                  placeholder="Capture decisions, action items, and what happens next…"
                  value={active.notes ?? ""}
                  onChangeText={async (notes) => await act({ type: "meeting.notes", id: active.id, notes })}
                  maxLength={5000}
                  multiline
                />
                <AppText style={s.small}>Notes are saved on this device.</AppText>
                <View style={s.actions}>
                  <Button
                    title="Open Chat"
                    variant="soft"
                    size="sm"
                    onPress={async () => await openChat(active)}
                  />
                  {!active.cancelled &&
                    !active.completed &&
                    (active.creatorId === actorId ? (
                      <>
                        <Button
                          title="Edit"
                          size="sm"
                          variant="soft"
                          onPress={() => openForm(active)}
                        />
                        <Button
                          title="Cancel Meeting"
                          variant="ghost"
                          size="sm"
                          onPress={() => setSheet("cancel")}
                        />
                        <Button
                          title="Mark Completed"
                          size="sm"
                          onPress={async () => {
                            if (await act({ type: "meeting.complete", id: active.id }))
                              setNotice("Meeting marked completed.");
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <Button
                          title="Accept"
                          size="sm"
                          onPress={async () => {
                            if (
                              await act({ type: "meeting.respond", id: active.id, response: "accepted" })
                            )
                              setNotice("Invitation accepted.");
                          }}
                        />
                        <Button
                          title="Decline"
                          size="sm"
                          variant="ghost"
                          onPress={async () => {
                            if (
                              await act({ type: "meeting.respond", id: active.id, response: "declined" })
                            )
                              setNotice("Invitation declined.");
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
                  {active.title} will remain visible under Cancelled.
                </AppText>
                <Button title="Keep meeting" variant="soft" onPress={() => setSheet("detail")} />
                <Button
                  title="Confirm cancellation"
                  variant="danger"
                  onPress={async () => {
                    if (await act({ type: "meeting.cancel", id: active.id })) {
                      setSheet(null);
                      setNotice("Meeting cancelled.");
                    }
                  }}
                />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  page: { gap: 18 },
  flex: { flex: 1, minWidth: 0 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 9 },
  eyebrow: { fontSize: 9, lineHeight: 15, letterSpacing: 1.2, color: "#8a967c", fontWeight: "600" },
  title: { fontSize: 28, lineHeight: 36, fontWeight: "800", color: "#182335" },
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
    fontSize: 31,
    lineHeight: 37,
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
