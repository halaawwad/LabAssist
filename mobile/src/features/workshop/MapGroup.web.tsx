import type { ReactNode } from "react";

/** SVG onPress is native-only; use a DOM group with keyboard support on web. */
export function MapGroup({
  label,
  onPress,
  enabled = true,
  children,
}: {
  label: string;
  onPress: () => void;
  enabled?: boolean;
  children: ReactNode;
}) {
  return (
    <g
      role={enabled ? "button" : undefined}
      aria-label={enabled ? label : undefined}
      tabIndex={enabled ? 0 : undefined}
      style={{ cursor: enabled ? "pointer" : "default" }}
      onClick={enabled ? onPress : undefined}
      onKeyDown={(event) => {
        if (enabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onPress();
        }
      }}
    >
      {children}
    </g>
  );
}
