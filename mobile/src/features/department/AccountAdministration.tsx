import { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText, Button, TextField } from "@/components";
import { Chips, FormSheet, Panel, SearchField, kit, useCopy } from "@/components/MobileKit";
import { useLanguage } from "@/i18n";
import { authClient } from "@/features/auth/client";
import { useAccountAdmin, type ProvisionInput } from "../../../../shared/auth/useAccountAdmin";
import type { Account } from "../../../../shared/auth/session-client";

export function AccountAdministration({ onAccounts }: { onAccounts: (rows: Account[]) => void }) {
  const t = useCopy();
  const { language } = useLanguage();
  const admin = useAccountAdmin(authClient, language === "ar");
  useEffect(() => {
    onAccounts(admin.accounts);
  }, [admin.accounts, onAccounts]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<ProvisionInput | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [confirm, setConfirm] = useState<Account | null>(null);
  const [formError, setFormError] = useState("");
  const roles = [
    { id: "STUDENT", label: t("Student", "طالب") },
    { id: "SUPERVISOR", label: t("Supervisor", "مشرف") },
    { id: "WORKSHOP_MANAGER", label: t("Workshop Manager", "مسؤول الورشة") },
  ];
  const label = (role: string) => roles.find((r) => r.id === role)?.label ?? role;
  const status = (value: string) =>
    value === "ACTIVE"
      ? t("Active", "نشط")
      : value === "PENDING_ACTIVATION"
        ? t("Pending activation", "بانتظار التفعيل")
        : t("Disabled", "معطّل");
  async function save() {
    if (!draft) return;
    if (!draft.fullName.trim()) return setFormError(t("Enter a full name.", "أدخل الاسم الكامل."));
    const ok = editing
      ? await admin.rename(editing.id, draft.fullName.trim())
      : await admin.create(draft);
    if (ok) {
      setDraft(null);
      setEditing(null);
    }
  }
  const filtered = admin.accounts.filter(
    (a) =>
      (filter === "all" || a.role === filter) &&
      `${a.fullName} ${a.email} ${a.universityNumber ?? a.employeeNumber}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <View style={kit.list}>
      <View style={kit.row}>
        <Button
          title={t("Add account", "إضافة حساب")}
          disabled={!admin.ready || admin.busy}
          onPress={() => {
            setEditing(null);
            setFormError("");
            setDraft({ role: "STUDENT", fullName: "" });
          }}
        />
        <Button
          title={t("Refresh", "تحديث")}
          variant="secondary"
          disabled={admin.busy}
          onPress={() => void admin.reload()}
        />
      </View>
      {!!admin.error && (
        <AppText accessibilityRole="alert" tone="danger">
          {admin.error}
        </AppText>
      )}
      {!!admin.notice && <AppText accessibilityLiveRegion="polite">{admin.notice}</AppText>}
      {!admin.ready && !admin.error && (
        <AppText>{t("Loading accounts…", "جارٍ تحميل الحسابات…")}</AppText>
      )}
      <SearchField
        label={t("Search accounts", "بحث في الحسابات")}
        placeholder={t("Name, number or email", "اسم أو رقم أو بريد")}
        value={query}
        onChangeText={setQuery}
      />
      <Chips
        value={filter}
        onChange={setFilter}
        options={[{ id: "all", label: t("All", "الكل") }, ...roles]}
      />
      {admin.ready && !filtered.length && (
        <AppText>{t("No matching accounts.", "لا توجد حسابات مطابقة.")}</AppText>
      )}
      {filtered.map((a) => (
        <Panel key={a.id}>
          <AppText weight="bold">{a.fullName}</AppText>
          <AppText>
            {label(a.role)} · {a.universityNumber ?? a.employeeNumber}
          </AppText>
          <AppText>{a.email}</AppText>
          <AppText tone="primary">{status(a.status)}</AppText>
          <View style={[kit.row, { flexWrap: "wrap" }]}>
            <Button
              title={t("Edit name", "تعديل الاسم")}
              size="sm"
              variant="secondary"
              disabled={!admin.ready || admin.busy}
              onPress={() => {
                setEditing(a);
                setFormError("");
                setDraft({ role: a.role as ProvisionInput["role"], fullName: a.fullName });
              }}
            />
            {a.status === "PENDING_ACTIVATION" ? (
              <Button
                title={t("Resend invitation", "إعادة إرسال التفعيل")}
                size="sm"
                disabled={!admin.ready || admin.busy}
                onPress={() => void admin.invite(a.id)}
              />
            ) : (
              <Button
                title={a.status === "ACTIVE" ? t("Disable", "تعطيل") : t("Enable", "تفعيل الدخول")}
                size="sm"
                variant={a.status === "ACTIVE" ? "danger" : "secondary"}
                disabled={!admin.ready || admin.busy}
                onPress={() => setConfirm(a)}
              />
            )}
          </View>
        </Panel>
      ))}
      <FormSheet
        visible={!!draft}
        title={editing ? t("Edit name", "تعديل الاسم") : t("Add account", "إضافة حساب")}
        busy={admin.busy}
        onClose={() => setDraft(null)}
        footer={
          <Button
            title={t("Save", "حفظ")}
            loading={admin.busy}
            disabled={!admin.ready}
            onPress={() => void save()}
          />
        }
      >
        {draft && (
          <View style={kit.list}>
            {!editing && (
              <Chips
                value={draft.role}
                options={roles}
                onChange={(role) =>
                  setDraft({ role: role as ProvisionInput["role"], fullName: draft.fullName })
                }
              />
            )}
            <TextField
              label={t("Full name", "الاسم الكامل")}
              value={draft.fullName}
              maxLength={160}
              editable={!admin.busy}
              onChangeText={(fullName) => setDraft({ ...draft, fullName })}
            />
            {!editing && (
              <>
                <TextField
                  label={t("University number", "الرقم الجامعي")}
                  value={
                    (draft.role === "STUDENT" ? draft.universityNumber : draft.employeeNumber) ?? ""
                  }
                  keyboardType="number-pad"
                  maxLength={draft.role === "STUDENT" ? 8 : draft.role === "SUPERVISOR" ? 4 : 5}
                  editable={!admin.busy}
                  onChangeText={(number) =>
                    setDraft({
                      ...draft,
                      ...(draft.role === "STUDENT"
                        ? { universityNumber: number }
                        : { employeeNumber: number }),
                    })
                  }
                />
                {draft.role === "STUDENT" ? (
                  <AppText>{`s${draft.universityNumber ?? ""}@stu.najah.edu`}</AppText>
                ) : (
                  <TextField
                    label={t("University email", "البريد الجامعي")}
                    value={draft.email ?? ""}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!admin.busy}
                    onChangeText={(email) =>
                      setDraft({ ...draft, email: email.trim().toLowerCase() })
                    }
                  />
                )}
                <AppText variant="caption">
                  {t(
                    "The owner chooses a password through the activation email.",
                    "صاحب الحساب يختار كلمة مروره عبر رابط التفعيل بالبريد.",
                  )}
                </AppText>
              </>
            )}
            {!!(formError || admin.error) && (
              <AppText accessibilityRole="alert" tone="danger">
                {formError || admin.error}
              </AppText>
            )}
            {!admin.ready && (
              <Button
                title={t("Reload accounts", "تحديث الحسابات")}
                onPress={() => void admin.reload()}
                disabled={admin.busy}
              />
            )}
          </View>
        )}
      </FormSheet>
      <FormSheet
        visible={!!confirm}
        title={t("Change account access?", "تغيير صلاحية الدخول؟")}
        busy={admin.busy}
        onClose={() => setConfirm(null)}
        footer={
          <Button
            title={t("Confirm", "تأكيد")}
            loading={admin.busy}
            disabled={!admin.ready}
            onPress={async () => {
              if (
                confirm &&
                (await admin.status(
                  confirm.id,
                  confirm.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                ))
              )
                setConfirm(null);
            }}
          />
        }
      >
        <AppText>{confirm?.fullName}</AppText>
        <AppText>
          {t(
            "Disabling signs the account out without deleting its project history.",
            "التعطيل ينهي جلسات الحساب ويحافظ على سجلات مشاريعه.",
          )}
        </AppText>
        {!!admin.error && <AppText tone="danger">{admin.error}</AppText>}
        {!admin.ready && (
          <Button
            title={t("Reload accounts", "تحديث الحسابات")}
            onPress={() => void admin.reload()}
            disabled={admin.busy}
          />
        )}
      </FormSheet>
    </View>
  );
}
