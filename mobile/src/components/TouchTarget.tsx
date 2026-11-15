import { forwardRef, type ComponentRef } from "react";
import { Pressable, type PressableProps } from "react-native";

/** Shared minimum for links, icon actions, list rows and controls on a phone. */
export const TouchTarget = forwardRef<ComponentRef<typeof Pressable>, PressableProps>(
  function TouchTarget({ style, accessibilityRole = "button", ...props }, ref) {
    return (
      <Pressable
        {...props}
        ref={ref}
        accessibilityRole={accessibilityRole}
        style={(state) => [
          { minWidth: 44, minHeight: 44 },
          typeof style === "function" ? style(state) : style,
        ]}
      />
    );
  },
);
