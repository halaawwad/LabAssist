import type { ReactNode } from "react";

/** SVG onPress is native-only; use a DOM group with keyboard support on web. */
export function MapGroup({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <g
      role="button"
      aria-label={label}
      tabIndex={0}
      style={{ cursor: "pointer" }}
      onClick={onPress}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPress();
        }
      }}
    >
      {children}
    </g>
  );
}
