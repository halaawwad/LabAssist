import { useState } from "react";
import { Modal, Pressable, Switch, View, StyleSheet, Platform, Share } from "react-native";
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
import { Chips, Panel, Portrait, kit } from "@/components/MobileKit";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { defaultPreferences, usePreferences, type Preferences } from "@/state/Preferences";
import { router } from "@/native/router";
const rows = {
  Appearance: [
    {
      key: "motion",
      title: "Gentle motion",
      description: "Animate progress rings, illustrations and small details.",
      icon: Sparkles,
    },
    {
      key: "background",
      title: "Workspace backgrounds",
      description: "Show the photographic backgrounds across your workspace.",
      icon: ImageIcon,
    },
    {
      key: "largeText",
      title: "Larger text",
      description: "Give labels, notes and reading areas a little more room.",
      icon: Type,
    },
  ],
  Messages: [
    {
      key: "messagePreviews",
      title: "Conversation previews",
      description: "Show the latest message under each conversation name.",
      icon: Eye,
    },
    {
      key: "enterToSend",
      title: "Enter to send",
      description: "Send with Enter. Use Shift + Enter to start a new line.",
      icon: MessageSquare,
    },
  ],
  Notifications: [
    {
      key: "meetingReminders",
      title: "Meeting reminders",
      description: "Your preference for upcoming meeting reminders.",
      icon: Bell,
    },
    {
      key: "reportReminders",
      title: "Report deadlines",
      description: "Your preference for weekly report reminders.",
      icon: Check,
    },
    {
      key: "teamUpdates",
      title: "Team updates",
      description: "Your preference for task and project activity updates.",
      icon: Settings,
    },
  ],
} as const;
export function StudentSettings() {
  const { preferences, save } = usePreferences();
  const { actorId, state } = useWorkspace();
  const [draft, setDraft] = useState({ ...preferences }),
    [section, setSection] = useState<keyof typeof rows>("Appearance"),
    [notice, setNotice] = useState(""),
    [reset, setReset] = useState(false);
  const changed = JSON.stringify(draft) !== JSON.stringify(preferences);
  const user = state.users.find((u) => u.id === actorId)!;
  async function apply(value: Preferences) {
    try {
      await save(value);
      setDraft({ ...value });
      setNotice("Your preferences are saved and applied.");
    } catch {
      setNotice("Preferences could not be saved. Try again.");
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
      setNotice("Preferences exported.");
    } catch {
      setNotice("Could not export preferences.");
    }
  }
  return (
    <View style={kit.stack}>
      <View style={s.heading}>
        <View>
          <AppText style={s.eyebrow}>YOUR WORKSPACE / YOUR WAY</AppText>
          <AppText variant="title">Settings</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="My profile"
          onPress={() => router.push("/native/student/profile")}
        >
          <Portrait userId={actorId} size={43} />
        </Pressable>
      </View>
      <Panel title="Language">
        <LanguageToggle />
      </Panel>
      <Chips
        options={Object.keys(rows).map((id) => ({ id, label: id }))}
        value={section}
        onChange={(v) => setSection(v as keyof typeof rows)}
      />
      <Panel title={section}>
        <AppText tone="muted" variant="caption">
          {section === "Appearance"
            ? "Adjust motion, backgrounds and text size."
            : section === "Messages"
              ? "Choose what appears in the conversation list and how you send."
              : "Save your reminder preferences."}
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
              <AppText weight="semibold">{row.title}</AppText>
              <AppText variant="caption" tone="muted">
                {row.description}
              </AppText>
            </View>
            <Switch
              accessibilityLabel={row.title}
              value={draft[row.key]}
              onValueChange={(v) => {
                setDraft({ ...draft, [row.key]: v });
                setNotice("");
              }}
              trackColor={{ true: "#82966c" }}
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
                A little space to build.
              </AppText>
              <AppText variant="caption" tone="muted">
                Comfortable details. A clearer next step.
              </AppText>
            </View>
          </View>
        )}
        {section === "Messages" && (
          <View style={s.preview}>
            <Portrait userId={actorId} size={42} />
            <View style={kit.grow}>
              <AppText weight="bold">{user.name} (You)</AppText>
              <AppText variant="caption" tone="muted">
                {draft.messagePreviews
                  ? "An idea to come back to later…"
                  : "Message preview hidden"}
              </AppText>
              <AppText variant="caption">
                {draft.enterToSend
                  ? "Enter sends · Shift + Enter adds a line"
                  : "Enter adds a line · Use the send button"}
              </AppText>
            </View>
          </View>
        )}
        <AppText accessibilityRole="alert" variant="caption" tone="primary">
          {notice || (changed ? "You have unsaved changes." : "Everything is up to date.")}
        </AppText>
        <View style={kit.wrap}>
          <Button
            title="Discard"
            disabled={!changed}
            variant="ghost"
            onPress={() => {
              setDraft({ ...preferences });
              setNotice("");
            }}
          />
          <Button title="Save changes" disabled={!changed} onPress={() => apply(draft)} />
        </View>
      </Panel>
      <Panel title="Export preferences">
        <Download color="#879eb2" />
        <AppText tone="muted">Download your saved preferences as a JSON file.</AppText>
        <Button title="Download preferences" variant="soft" onPress={download} />
      </Panel>
      <Panel title="Reset preferences">
        <RotateCcw color="#a18bb0" />
        <AppText tone="muted">
          Restore default preferences. Your projects, messages and profile are kept.
        </AppText>
        <Button title="Reset preferences" variant="ghost" onPress={() => setReset(true)} />
      </Panel>
      <Modal visible={reset} transparent onRequestClose={() => setReset(false)}>
        <View style={s.overlay}>
          <Panel title="Restore default preferences?">
            <AppText>This resets appearance, message and reminder preferences only.</AppText>
            <Button title="Cancel" variant="ghost" onPress={() => setReset(false)} />
            <Button
              title="Restore defaults"
              onPress={() => {
                apply({ ...defaultPreferences });
                setReset(false);
              }}
            />
          </Panel>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontSize: 9, letterSpacing: 1, color: "#839472" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 15,
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
  overlay: { flex: 1, justifyContent: "center", padding: 25, backgroundColor: "#22332270" },
});
