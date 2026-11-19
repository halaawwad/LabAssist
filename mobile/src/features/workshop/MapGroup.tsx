import type { ReactNode } from "react";
import { G } from "react-native-svg";

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
    <G accessibilityLabel={enabled ? label : undefined} onPress={enabled ? onPress : undefined}>
      {children}
    </G>
  );
}
