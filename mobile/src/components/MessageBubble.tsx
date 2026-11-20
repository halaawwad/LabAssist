import type { ReactNode } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { TouchTarget as Pressable } from "./TouchTarget";

/** Shared bubble surface; conversations with actions can make it interactive. */
export function MessageBubble({
  children,
  style,
  label,
  hint,
  onAction,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  label?: string;
  hint?: string;
  onAction?: () => void;
}) {
  const base: ViewStyle = { maxWidth: "78%", borderRadius: 14, padding: 12, gap: 4 };
  if (!onAction) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      {...(Platform.OS === "web"
        ? ({
            role: "group" as const,
            tabIndex: 0,
            onKeyDown: (event: { key: string; preventDefault: () => void }) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onAction();
              }
            },
          } as object)
        : {})}
      onPress={onAction}
      onLongPress={onAction}
      style={[base, style]}
    >
      {children}
    </Pressable>
  );
}
