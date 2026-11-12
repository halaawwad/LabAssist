import { PersonalNotebook } from "./PersonalNotebook";
import { useState } from "react";
import { Alert, Switch, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { persistPickedFile } from "@/lib/files";
import { router } from "@/native/router";
import { AppText, Button, LanguageToggle } from "@/components";
import { Chips, Field, Panel, Ring, Portrait, kit, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { canSeeProject, projectProgress } from "@/domain/workspace";
import { colors } from "@/theme";

export function ProfilePanel() {
  const { state, actorId, act } = useWorkspace();
  const user = state.users.find((u) => u.id === actorId)!;
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [saved, setSaved] = useState(false);
  const t = useCopy();
  return (
    <View style={kit.stack}>
      <Panel>
        <Portrait userId={actorId} size={76} />
        <Button
          title={t("Change profile photo", "تغيير الصورة الشخصية")}
          variant="ghost"
          onPress={async () => {
            try {
              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permission.granted) {
                Alert.alert(
                  t(
                    "Photo access is required to choose a photo.",
                    "يرجى السماح بالوصول للصور لاختيار صورة.",
                  ),
                );
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled)
                act({
                  type: "profile.edit",
                  name: user.name,
                  bio: user.bio,
                  photo: await persistPickedFile(result.assets[0].uri, "profile.jpg"),
                });
            } catch {
              Alert.alert(t("Could not save this photo.", "تعذر حفظ هذه الصورة."));
            }
          }}
        />
        <AppText variant="heading">{user.name}</AppText>
        <AppText selectable tone="muted">
          {user.email}
        </AppText>
        {user.universityNumber && <AppText>{user.universityNumber}</AppText>}
        <Field label={t("Display name", "الاسم الظاهر")} value={name} onChangeText={setName} />
        <Field
          label={t("About you / specialization", "نبذة / التخصص")}
          value={bio}
          onChangeText={setBio}
          multiline
        />
        <Button
          title={t("Save profile", "حفظ الملف الشخصي")}
          onPress={() => setSaved(act({ type: "profile.edit", name, bio }))}
        />
        {saved && <AppText tone="primary">{t("Profile saved", "تم الحفظ")}</AppText>}
      </Panel>
      <PersonalNotebook key={actorId} />
    </View>
  );
}
export function SettingsPanel() {
  const { state, actorId, setActor, act, reset } = useWorkspace();
  const user = state.users.find((u) => u.id === actorId)!;
  const [threshold, setThreshold] = useState(state.absenceThreshold?.toString() ?? "");
  const [accountQuery, setAccountQuery] = useState("");
  const t = useCopy();
  return (
    <View style={kit.stack}>
      <Panel title={t("Language", "اللغة")}>
        <LanguageToggle />
      </Panel>
      <Panel title={t("Preview account", "حساب المعاينة")}>
        <AppText tone="muted">
          {t(
            "Switch between sample accounts to test shared workflows.",
            "بدّل بين الحسابات التجريبية لفحص التفاعل بين الأدوار.",
          )}
        </AppText>
        <Field
          label={t("Find sample account", "ابحث عن حساب تجريبي")}
          value={accountQuery}
          onChangeText={setAccountQuery}
        />
        <Chips
          options={state.users
            .filter(
              (u) =>
                u.role === user.role &&
                `${u.name} ${u.email}`.toLowerCase().includes(accountQuery.toLowerCase()),
            )
            .slice(0, 12)
            .map((u) => ({ id: u.id, label: u.name }))}
          value={actorId}
          onChange={setActor}
        />
      </Panel>
      {user.role === "workshop" && (
        <Panel title={t("Workshop settings", "إعدادات الورشة")}>
          <View style={kit.row}>
            <AppText style={kit.grow}>
              {t("Workshop open for visits", "الورشة متاحة للزيارة")}
            </AppText>
            <Switch
              value={state.availability === "open"}
              onValueChange={(value) => {
                act({ type: "availability.set", value: value ? "open" : "closed" });
              }}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <Field
            label={t("Absence alert threshold % (optional)", "نسبة تنبيه الغياب % (اختياري)")}
            keyboardType="decimal-pad"
            value={threshold}
            onChangeText={setThreshold}
          />
          <Button
            title={t("Save threshold", "حفظ النسبة")}
            onPress={() =>
              act({ type: "threshold.set", value: threshold.trim() ? Number(threshold) : null })
            }
          />
          <AppText variant="caption" tone="muted">
            {t(
              "Only actual working days count. No default percentage is applied.",
              "تحسب أيام الدوام الفعلية فقط. لا توجد نسبة افتراضية.",
            )}
          </AppText>
        </Panel>
      )}
      <Button
        title={t("Switch role", "تبديل الدور")}
        variant="soft"
        onPress={() => router.replace("/")}
      />
      <Button
        title={t("Reset demo data", "إعادة ضبط بيانات المعاينة")}
        variant="danger"
        onPress={() =>
          Alert.alert(
            t("Reset preview?", "إعادة ضبط المعاينة؟"),
            t(
              "This clears edits on this device only.",
              "يمسح تعديلات المعاينة على هذا الجهاز فقط.",
            ),
            [
              { text: t("Cancel", "إلغاء"), style: "cancel" },
              {
                text: t("Reset", "إعادة ضبط"),
                style: "destructive",
                onPress: () =>
                  reset().catch(() => Alert.alert(t("Could not reset.", "تعذرت إعادة الضبط."))),
              },
            ],
          )
        }
      />
    </View>
  );
}
export function NotificationsPanel() {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const alerts = state.alerts.filter((a) => a.userId === actorId);
  return (
    <View style={kit.stack}>
      {!alerts.length && (
        <Panel>
          <AppText>
            {t(
              "You’re all caught up. New reviews and invitations will appear here.",
              "لا توجد إشعارات جديدة. ستظهر هنا المراجعات والدعوات.",
            )}
          </AppText>
        </Panel>
      )}
      {alerts.map((a) => (
        <Panel key={a.id} tint={a.read ? undefined : colors.softBlue}>
          <AppText>{a.body}</AppText>
          <Button
            title={a.read ? t("Read", "مقروء") : t("Mark as read", "تحديد كمقروء")}
            disabled={a.read}
            variant="ghost"
            onPress={() => act({ type: "alert.read", id: a.id })}
          />
        </Panel>
      ))}
    </View>
  );
}
export function TeamPanels() {
  const [now] = useState(() => Date.now());
  const { state, actorId } = useWorkspace();
  const t = useCopy();
  const p = state.projects.find((p) => p.studentIds.includes(actorId));
  if (!p) return null;
  return (
    <View style={kit.stack}>
      <Panel title={p.title}>
        <AppText>
          {p.studentIds.length} {t("teammates", "أعضاء الفريق")}
        </AppText>
        <Ring value={projectProgress(state, p.id)} />
        <AppText>
          {t("Open tasks", "المهام المفتوحة")}:{" "}
          {state.tasks.filter((x) => x.projectId === p.id && !x.done).length}
        </AppText>
        <AppText>
          {t("Overdue tasks", "المهام المتأخرة")}:{" "}
          {
            state.tasks.filter(
              (x) =>
                x.projectId === p.id &&
                !x.done &&
                x.dueDate &&
                new Date(x.dueDate).getTime() < now,
            ).length
          }
        </AppText>
      </Panel>
      {p.studentIds.map((id, i) => {
        const user = state.users.find((u) => u.id === id)!;
        const tasks = state.tasks.filter((task) => task.ownerId === id);
        const done = tasks.filter((task) => task.done).length;
        return (
          <Panel key={id}>
            <Portrait userId={id} />
            <AppText variant="heading">{user.name}</AppText>
            <AppText variant="caption" tone="muted">
              {user.universityNumber}
            </AppText>
            <View style={kit.row}>
              <Ring
                value={tasks.length ? Math.round((done / tasks.length) * 100) : 0}
                color={["#526443", "#557f9c", "#8f6a9f"][i]}
              />
              <View style={kit.grow}>
                <AppText>{user.bio}</AppText>
                <AppText tone="muted">
                  {done} / {tasks.length} {t("tasks complete", "مهام مكتملة")}
                </AppText>
              </View>
            </View>
            <AppText weight="semibold">{t("Today's tasks", "مهام اليوم")}</AppText>
            {tasks.map((task) => (
              <AppText key={task.id}>
                {task.done ? "✓" : "○"} {task.title}
              </AppText>
            ))}
          </Panel>
        );
      })}
      <Panel title={t("Team activity", "نشاط الفريق")}>
        {state.tasks
          .filter((x) => x.projectId === p.id)
          .slice(-6)
          .reverse()
          .map((x) => (
            <View key={x.id}>
              <AppText>{state.users.find((u) => u.id === x.ownerId)?.name}</AppText>
              <AppText variant="caption" tone="muted">
                {x.title} · {x.done ? t("Completed", "مكتملة") : t("Open", "مفتوحة")}
              </AppText>
            </View>
          ))}
      </Panel>
    </View>
  );
}
export function NoticesPanel() {
  const { state, actorId, act } = useWorkspace();
  const user = state.users.find((u) => u.id === actorId)!;
  const t = useCopy();
  const notices = state.notices.filter(
    (n) =>
      user.role === "workshop" ||
      (user.role === "student" &&
        n.kind === "notice" &&
        (!n.projectId || canSeeProject(state, actorId, n.projectId))) ||
      (user.role === "supervisor" &&
        (n.kind === "observation" || n.supervisors) &&
        (!n.projectId || canSeeProject(state, actorId, n.projectId))),
  );
  return (
    <View style={kit.stack}>
      <Panel tint={state.availability === "open" ? colors.primaryWash : colors.softRose}>
        <AppText variant="heading">
          {state.availability === "open"
            ? t("Workshop open", "الورشة متاحة")
            : t("Workshop closed", "الورشة مغلقة")}
        </AppText>
      </Panel>
      {!notices.length && (
        <AppText tone="muted">
          {t("No workshop notices yet.", "لا توجد إعلانات للورشة حاليًا.")}
        </AppText>
      )}
      {notices.map((n) => (
        <Panel key={n.id}>
          <AppText variant="caption" tone="muted">
            {n.projectId
              ? state.projects.find((p) => p.id === n.projectId)?.title
              : t("All teams", "كل الفرق")}
          </AppText>
          <AppText>{n.body}</AppText>
          <Button
            title={
              n.seenBy.includes(actorId)
                ? t("Seen", "تمت المشاهدة")
                : t("Mark as seen", "تمت المشاهدة")
            }
            variant="ghost"
            disabled={n.seenBy.includes(actorId)}
            onPress={() => act({ type: "notice.view", id: n.id })}
          />
        </Panel>
      ))}
    </View>
  );
}
