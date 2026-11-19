import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { useState } from "react";
import { View, StyleSheet, Platform, Share } from "react-native";
import {
  Settings,
  MessageSquare,
  Bell,
  Image as ImageIcon,
  Sparkles,
  Type,
  Eye,
  Download,
  RotateCcw,
  Check,
} from "lucide-react-native";
import { AppText, Button } from "@/components";
import {
  FormSheet,
  Panel,
  Portrait,
  SegmentedControl,
  ToggleSwitch,
  kit,
  useCopy,
} from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { defaultPreferences, usePreferences, type Preferences } from "@/state/Preferences";
import { router } from "@/native/router";

type Section = "Appearance" | "Messages" | "Notifications";
type Row = {
  key: keyof Preferences;
  title: [string, string];
  description: [string, string];
  icon: typeof Settings;
};
const rows: Record<Section, Row[]> = {
  Appearance: [
    {
      key: "motion",
      title: ["Gentle motion", "حركة هادئة"],
      description: [
        "Animate progress rings, illustrations and small details.",
        "تحريك حلقات التقدم والرسومات والتفاصيل الصغيرة.",
      ],
      icon: Sparkles,
    },
    {
      key: "background",
      title: ["Workspace backgrounds", "خلفيات مساحة العمل"],
      description: [
        "Show the photographic backgrounds across your workspace.",
        "إظهار الخلفيات المصورة في مساحة العمل.",
      ],
      icon: ImageIcon,
    },
    {
      key: "largeText",
      title: ["Larger text", "نص أكبر"],
      description: [
        "Give labels, notes and reading areas a little more room.",
        "مساحة أكبر قليلاً للعناوين والملاحظات ومناطق القراءة.",
      ],
      icon: Type,
    },
  ],
  Messages: [
    {
      key: "messagePreviews",
      title: ["Conversation previews", "معاينة المحادثات"],
      description: [
        "Show the latest message under each conversation name.",
        "إظهار آخر رسالة تحت اسم كل محادثة.",
      ],
      icon: Eye,
    },
    {
      key: "enterToSend",
      title: ["Enter to send", "الإرسال بزر Enter"],
      description: [
        "Send with Enter. Use Shift + Enter to start a new line.",
        "الإرسال بزر Enter، واستخدم Shift + Enter لسطر جديد.",
      ],
      icon: MessageSquare,
    },
  ],
  Notifications: [
    {
      key: "meetingReminders",
      title: ["Meeting reminders", "تذكير الاجتماعات"],
      description: [
        "Your preference for upcoming meeting reminders.",
        "تفضيلك لتذكيرات الاجتماعات القادمة.",
      ],
      icon: Bell,
    },
    {
      key: "reportReminders",
      title: ["Report deadlines", "مواعيد التقارير"],
      description: [
        "Your preference for weekly report reminders.",
        "تفضيلك لتذكيرات التقرير الأسبوعي.",
      ],
      icon: Check,
    },
    {
      key: "teamUpdates",
      title: ["Team updates", "تحديثات الفريق"],
      description: [
        "Your preference for task and project activity updates.",
        "تفضيلك لتحديثات المهام ونشاط المشروع.",
      ],
      icon: Settings,
    },
  ],
};

/**
 * Device preferences (appearance, messages, reminders). Language and Log out live in More.
 * `identity={false}` (Department) hides the workspace profile link and name preview, so no
 * other account's details are shown.
 */
export function StudentSettings({ identity = true }: { identity?: boolean }) {
  const { preferences, save } = usePreferences();
  const { actorId, state } = useWorkspace();
  const t = useCopy();
  const [draft, setDraft] = useState({ ...preferences }),
    [section, setSection] = useState<Section>("Appearance"),
    [notice, setNotice] = useState(""),
    [reset, setReset] = useState(false);
  const changed = JSON.stringify(draft) !== JSON.stringify(preferences);
  const user = identity ? state.users.find((u) => u.id === actorId) : undefined;
  const pick = ([en, ar]: [string, string]) => t(en, ar);
  async function apply(value: Preferences) {
    try {
      await save(value);
      setDraft({ ...value });
      setNotice(t("Your preferences are saved and applied.", "تم حفظ تفضيلاتك وتطبيقها."));
    } catch {
      setNotice(
        t("Preferences could not be saved. Try again.", "تعذر حفظ التفضيلات. أعد المحاولة."),
      );
    }
  }
  async function download() {
    try {
      const text = JSON.stringify({ preferences }, null, 2);
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "labassist-preferences.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const { File, Paths } = await import("expo-file-system");
        const sharing = await import("expo-sharing");
        const file = new File(Paths.cache, "labassist-preferences.json");
        file.write(text);
        if (await sharing.isAvailableAsync())
          await sharing.shareAsync(file.uri, { mimeType: "application/json" });
        else await Share.share({ message: text });
      }
      setNotice(t("Preferences exported.", "تم تصدير التفضيلات."));
    } catch {
      setNotice(t("Could not export preferences.", "تعذر تصدير التفضيلات."));
    }
  }
  return (
    <View style={kit.stack}>
      {!!user && (
        <View style={s.heading}>
          <AppText variant="caption" tone="muted">
            {t("Your preferences on this device", "تفضيلاتك على هذا الجهاز")}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("My profile", "ملفي الشخصي")}
            onPress={() =>
              router.push(`/native/${user.role}/profile` as import("expo-router").Href)
            }
          >
            <Portrait userId={actorId} size={43} />
          </Pressable>
        </View>
      )}
      <SegmentedControl
        accessibilityLabel={t("Preference section", "قسم التفضيلات")}
        value={section}
        onChange={setSection}
        minOptionWidth={88}
        options={[
          { id: "Appearance", label: t("Appearance", "المظهر") },
          { id: "Messages", label: t("Messages", "الرسائل") },
          { id: "Notifications", label: t("Reminders", "التذكيرات") },
        ]}
      />
      <Panel>
        <AppText tone="muted" variant="caption">
          {section === "Appearance"
            ? t("Adjust motion, backgrounds and text size.", "اضبط الحركة والخلفيات وحجم النص.")
            : section === "Messages"
              ? t(
                  "Choose what appears in the conversation list and how you send.",
                  "اختر ما يظهر في قائمة المحادثات وطريقة الإرسال.",
                )
              : t("Save your reminder preferences.", "احفظ تفضيلات التذكير.")}
        </AppText>
        {rows[section].map((row) => (
          <View key={row.key} style={s.row}>
            <View style={s.icon}>
              <row.icon
                color={
                  section === "Messages"
                    ? "#7c94ad"
                    : section === "Notifications"
                      ? "#a68cae"
                      : "#7c9364"
                }
                size={21}
              />
            </View>
            <View style={kit.grow}>
              <AppText weight="semibold">{pick(row.title)}</AppText>
              <AppText variant="caption" tone="muted">
                {pick(row.description)}
              </AppText>
            </View>
            <ToggleSwitch
              accessibilityLabel={pick(row.title)}
              value={draft[row.key]}
              onValueChange={(v) => {
                setDraft({ ...draft, [row.key]: v });
                setNotice("");
              }}
            />
          </View>
        ))}
        {section === "Appearance" && (
          <View style={[s.preview, draft.background && s.previewBackground]}>
            <View style={s.orbit}>
              <Check size={22} color="#78905b" />
            </View>
            <View style={kit.grow}>
              <AppText weight="bold" style={draft.largeText ? { fontSize: 18 } : undefined}>
                {t("A little space to build.", "مساحة صغيرة للإنجاز.")}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t("Comfortable details. A clearer next step.", "تفاصيل مريحة. خطوة تالية أوضح.")}
              </AppText>
            </View>
          </View>
        )}
        {section === "Messages" && (
          <View style={s.preview}>
            {!!user && <Portrait userId={actorId} size={42} />}
            <View style={kit.grow}>
              <AppText weight="bold">
                {user ? `${user.name} (${t("You", "أنت")})` : t("You", "أنت")}
              </AppText>
              <AppText variant="caption" tone="muted">
                {draft.messagePreviews
                  ? t("An idea to come back to later…", "فكرة للرجوع إليها لاحقًا…")
                  : t("Message preview hidden", "معاينة الرسائل مخفية")}
              </AppText>
              <AppText variant="caption">
                {draft.enterToSend
                  ? t(
                      "Enter sends · Shift + Enter adds a line",
                      "Enter يرسل · Shift + Enter سطر جديد",
                    )
                  : t(
                      "Enter adds a line · Use the send button",
                      "Enter سطر جديد · استخدم زر الإرسال",
                    )}
              </AppText>
            </View>
          </View>
        )}
        <AppText accessibilityRole="alert" variant="caption" tone="primary">
          {notice ||
            (changed
              ? t("You have unsaved changes.", "لديك تغييرات غير محفوظة.")
              : t("Everything is up to date.", "كل شيء محدّث."))}
        </AppText>
        <Button
          title={t("Save changes", "حفظ التغييرات")}
          fullWidth
          disabled={!changed}
          onPress={() => apply(draft)}
        />
        <Button
          title={t("Discard", "تجاهل")}
          disabled={!changed}
          variant="tertiary"
          onPress={() => {
            setDraft({ ...preferences });
            setNotice("");
          }}
        />
      </Panel>
      <Panel title={t("Export preferences", "تصدير التفضيلات")}>
        <Download color="#879eb2" />
        <AppText tone="muted">
          {t("Download your saved preferences as a JSON file.", "نزّل تفضيلاتك المحفوظة كملف JSON.")}
        </AppText>
        <Button
          title={t("Download preferences", "تنزيل التفضيلات")}
          variant="secondary"
          onPress={download}
        />
      </Panel>
      <Panel title={t("Reset preferences", "إعادة ضبط التفضيلات")}>
        <RotateCcw color="#a18bb0" />
        <AppText tone="muted">
          {t(
            "Restore default preferences. Your projects, messages and profile are kept.",
            "استعادة التفضيلات الافتراضية. تبقى مشاريعك ورسائلك وملفك الشخصي كما هي.",
          )}
        </AppText>
        <Button
          title={t("Reset preferences", "إعادة ضبط التفضيلات")}
          variant="secondary"
          onPress={() => setReset(true)}
        />
      </Panel>
      <FormSheet
        visible={reset}
        presentation="sheet"
        title={t("Restore default preferences?", "استعادة التفضيلات الافتراضية؟")}
        onClose={() => setReset(false)}
        footer={
          <Button
            title={t("Restore defaults", "استعادة الافتراضي")}
            onPress={() => {
              apply({ ...defaultPreferences });
              setReset(false);
            }}
          />
        }
      >
        <AppText>
          {t(
            "This resets appearance, message and reminder preferences only.",
            "يعيد هذا ضبط تفضيلات المظهر والرسائل والتذكير فقط.",
          )}
        </AppText>
      </FormSheet>
    </View>
  );
}
const s = StyleSheet.create({
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e6d9",
  },
  icon: { padding: 10, borderRadius: 13, backgroundColor: "#edf1e7" },
  preview: {
    padding: 15,
    borderRadius: 18,
    backgroundColor: "#eff3e8",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  previewBackground: { backgroundColor: "#e3ebd5" },
  orbit: {
    width: 45,
    height: 45,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#bdcda7",
    alignItems: "center",
    justifyContent: "center",
  },
});
