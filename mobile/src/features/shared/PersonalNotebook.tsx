import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { AppText, Button } from "@/components";
import { Field, Panel, Ring, kit, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
type Personal = {
  details?: Record<string, string>;
  note: string;
  tasks: { id: string; title: string; done: boolean }[];
  reminders: { id: string; title: string; when: string }[];
};
const empty: Personal = { note: "", tasks: [], reminders: [] };
export function PersonalNotebook() {
  const { actorId } = useWorkspace();
  const t = useCopy();
  const [data, setData] = useState<Personal>(empty);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [task, setTask] = useState("");
  const [reminder, setReminder] = useState("");
  const [when, setWhen] = useState("");
  const [editing, setEditing] = useState(false);
  const details = data.details ?? {};
  const profileFields = [
    ["birthYear", "Birth year", "سنة الميلاد"],
    ["major", "Major", "التخصص"],
    ["year", "Academic year", "السنة الأكاديمية"],
    ["phone", "Phone number", "رقم الهاتف"],
    ["github", "GitHub", "GitHub"],
  ] as const;
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem("labassist.personal." + actorId)
      .then((value) => {
        if (active) {
          setData(value ? JSON.parse(value) : empty);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setError("Could not load personal notes / تعذر تحميل الملاحظات الشخصية");
      });
    return () => {
      active = false;
    };
  }, [actorId]);
  const update = async (next: Personal) => {
    setData(next);
    try {
      await AsyncStorage.setItem("labassist.personal." + actorId, JSON.stringify(next));
      setError("");
    } catch {
      setError(t("Could not save changes.", "تعذر حفظ التعديلات."));
    }
  };
  if (!ready) return <AppText>{error || t("Loading your notebook…", "جارٍ تحميل دفترك…")}</AppText>;
  return (
    <View style={kit.stack}>
      {error && <AppText tone="danger">{error}</AppText>}
      <Panel title={t("My information", "معلوماتي")}>
        {profileFields.map(([key, en, ar]) =>
          editing ? (
            <Field
              key={key}
              label={t(en, ar)}
              value={details[key] ?? ""}
              keyboardType={
                key === "phone" ? "phone-pad" : key === "birthYear" ? "number-pad" : "default"
              }
              autoCapitalize={key === "github" ? "none" : "sentences"}
              onChangeText={(value) =>
                void update({ ...data, details: { ...details, [key]: value } })
              }
            />
          ) : (
            <View key={key}>
              <AppText variant="caption" tone="muted">
                {t(en, ar)}
              </AppText>
              <AppText>{details[key] || "—"}</AppText>
            </View>
          ),
        )}
        <Button
          title={
            editing ? t("Done", "تم") : t("Edit personal information", "تعديل المعلومات الشخصية")
          }
          variant="soft"
          onPress={() => setEditing(!editing)}
        />
      </Panel>
      <Panel title={t("Profile completeness", "اكتمال الملف الشخصي")}>
        <Ring
          value={Math.round(
            (profileFields.filter(([key]) => details[key]?.trim()).length / profileFields.length) *
              100,
          )}
        />
        <AppText>
          {profileFields.filter(([key]) => !details[key]?.trim()).length}{" "}
          {t("details left to add", "تفاصيل متبقية")}
        </AppText>
      </Panel>
      <Panel title={t("My notebook", "دفتري الشخصي")}>
        <Field
          label={t("Personal notes", "ملاحظات شخصية")}
          multiline
          maxLength={6000}
          value={data.note}
          onChangeText={(note) => void update({ ...data, note })}
        />
        <AppText variant="caption" tone="muted">
          {data.note.length}/6000
        </AppText>
      </Panel>
      <Panel title={t("For today", "لليوم")}>
        <AppText>
          {data.tasks.filter((x) => x.done).length}/{data.tasks.length}
        </AppText>
        {data.tasks.map((x) => (
          <View key={x.id} style={kit.row}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: x.done }}
              onPress={() =>
                void update({
                  ...data,
                  tasks: data.tasks.map((y) => (y.id === x.id ? { ...y, done: !y.done } : y)),
                })
              }
              style={kit.grow}
            >
              <AppText>
                {x.done ? "✓" : "○"} {x.title}
              </AppText>
            </Pressable>
            <Button
              title={t("Delete", "حذف")}
              variant="ghost"
              onPress={() =>
                void update({ ...data, tasks: data.tasks.filter((y) => y.id !== x.id) })
              }
            />
          </View>
        ))}
        <Field label={t("Personal task", "مهمة شخصية")} value={task} onChangeText={setTask} />
        <Button
          title={t("Add personal task", "إضافة مهمة شخصية")}
          disabled={!task.trim()}
          onPress={() => {
            void update({
              ...data,
              tasks: [...data.tasks, { id: String(Date.now()), title: task.trim(), done: false }],
            });
            setTask("");
          }}
        />
      </Panel>
      <Panel title={t("A reminder to myself", "تذكير لنفسي")}>
        {data.reminders.map((x) => (
          <View key={x.id} style={kit.row}>
            <View style={kit.grow}>
              <AppText>{x.title}</AppText>
              <AppText variant="caption">{x.when}</AppText>
            </View>
            <Button
              title={t("Delete", "حذف")}
              variant="ghost"
              onPress={() =>
                void update({ ...data, reminders: data.reminders.filter((y) => y.id !== x.id) })
              }
            />
          </View>
        ))}
        <Field
          label={t("Reminder text", "نص التذكير")}
          value={reminder}
          onChangeText={setReminder}
        />
        <Field
          label={t("Reminder date and time", "موعد التذكير")}
          placeholder="2026-11-12 10:00"
          value={when}
          onChangeText={setWhen}
        />
        <Button
          title={t("Add reminder", "إضافة تذكير")}
          disabled={!reminder.trim() || !when.trim()}
          onPress={() => {
            void update({
              ...data,
              reminders: [
                ...data.reminders,
                { id: String(Date.now()), title: reminder.trim(), when },
              ],
            });
            setReminder("");
            setWhen("");
          }}
        />
        <AppText variant="caption" tone="muted">
          {t(
            "Saved on this device; notification scheduling is not connected.",
            "محفوظ على هذا الجهاز؛ جدولة الإشعارات غير موصولة.",
          )}
        </AppText>
      </Panel>
    </View>
  );
}
