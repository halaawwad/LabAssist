import { ShieldCheck } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components";
import { Panel, useCopy } from "@/components/MobileKit";
import { useLanguage } from "@/i18n";
import { colors } from "@/theme";

import { departmentHead } from "./departmentIdentity";

/** Department Head profile: the signed-in role and address only (read-only). */
export function DepartmentProfile() {
  const t = useCopy();
  const { ltr } = useLanguage();
  return (
    <Panel>
      <View style={styles.identity}>
        <View style={styles.badge}>
          <ShieldCheck size={26} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <AppText variant="heading">{t("Department Head", "رئيس القسم")}</AppText>
          <AppText tone="muted" selectable>
            {ltr(departmentHead.email)}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" tone="muted">
        {t(
          "Signed in with the department demo account. A display name and photo are not available for this account, so profile editing is not offered.",
          "تم تسجيل الدخول بحساب القسم التجريبي. لا يتوفر اسم أو صورة لهذا الحساب، لذا لا يتاح تعديل الملف الشخصي.",
        )}
      </AppText>
    </Panel>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
