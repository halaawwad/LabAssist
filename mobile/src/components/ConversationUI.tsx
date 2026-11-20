import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type TextStyle } from "react-native";
import { Star } from "lucide-react-native";
import { AppText } from "./AppText";
import { TouchTarget as Pressable } from "./TouchTarget";

/** Message direction follows its contents, independently of the interface language. */
export function ConversationText({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <AppText
      {...(Platform.OS === "web" ? ({ dir: "auto" } as object) : {})}
      style={[style, { writingDirection: "auto", textAlign: "auto" }]}
    >
      {children}
    </AppText>
  );
}

/** Presentation only: role-specific adapters retain their own records and actions. */
export function ConversationInboxRow({
  name,
  avatar,
  preview,
  detail,
  time,
  unread = 0,
  starred = false,
  onPress,
}: {
  name: string;
  avatar: ReactNode;
  preview: string;
  detail?: string;
  time?: string;
  unread?: number;
  starred?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={s.row}>
      {avatar}
      <View style={s.grow}>
        <View style={s.name}>
          <AppText numberOfLines={1} weight="bold" style={s.grow}>
            {name}
          </AppText>
          {starred && <Star size={14} color="#526443" fill="#526443" />}
        </View>
        {!!detail && (
          <AppText numberOfLines={1} style={s.time}>
            {detail}
          </AppText>
        )}
        <AppText numberOfLines={1} style={s.preview}>
          {preview}
        </AppText>
      </View>
      <View style={s.meta}>
        {!!time && <AppText style={s.time}>{time}</AppText>}
        {unread > 0 && (
          <View style={s.badge}>
            <AppText style={s.badgeText}>{unread}</AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** Header and composer frame share positioning while each adapter supplies its own controls. */
export function ConversationHeader({ children }: { children: ReactNode }) {
  return <View style={s.header}>{children}</View>;
}
export function ConversationComposer({ children }: { children: ReactNode }) {
  return <View style={s.composer}>{children}</View>;
}
export function ConversationComposerRow({ children }: { children: ReactNode }) {
  return <View style={s.composerRow}>{children}</View>;
}
const s = StyleSheet.create({
  row: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 18,
  },
  grow: { flex: 1, minWidth: 0 },
  name: { flexDirection: "row", alignItems: "center", gap: 5 },
  preview: { fontSize: 13, lineHeight: 18, color: "#596652", marginTop: 5 },
  meta: { alignItems: "flex-end", gap: 8 },
  time: { fontSize: 12, color: "#58664f" },
  badge: {
    minWidth: 20,
    minHeight: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#526942",
  },
  badgeText: { fontSize: 12, color: "#fff", fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#e5ebdd",
    backgroundColor: "#fff",
  },
  composer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e6ebde",
  },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 7 },
});
