import { layoutDirection, directionProps } from "@/i18n/layoutDirection";
import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { AppText } from "./AppText";
import { useLanguage } from "@/i18n";

/** Progressive disclosure keeps dense editors focused without discarding input. */
export function Disclosure({
  title,
  children,
  initiallyOpen = false,
}: {
  title: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [visited, setVisited] = useState(initiallyOpen);
  const { isRTL } = useLanguage();
  const translated: Record<string, string> = {
    Overview: "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629",
    "Filters & comparison":
      "\u0627\u0644\u062a\u0635\u0641\u064a\u0629 \u0648\u0627\u0644\u0645\u0642\u0627\u0631\u0646\u0629",
    "Choose week & drafts": "اختر الأسبوع والمسودات",
    "Project photo": "صورة المشروع",
    "Student details": "تفاصيل الطلاب",
    "Import & export": "الاستيراد والتصدير",
  };
  const label = isRTL ? (translated[title] ?? title) : title;
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <View style={{ gap: open ? 12 : 0, minWidth: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          setVisited(true);
          setOpen(!open);
        }}
        style={{
          minHeight: 48,
          ...layoutDirection("ltr"),
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderColor: "#e7ece2",
          paddingVertical: 8,
        }}
        {...directionProps("ltr")}
      >
        <AppText weight="semibold" style={{ flex: 1, minWidth: 0 }}>
          {label}
        </AppText>
        <Icon size={20} color="#526443" />
      </Pressable>
      {visited && <View style={{ display: open ? "flex" : "none", gap: 12 }}>{children}</View>}
    </View>
  );
}
