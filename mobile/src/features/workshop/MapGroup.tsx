import type { ReactNode } from "react";
import { G } from "react-native-svg";

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
    <G accessibilityLabel={label} onPress={onPress}>
      {children}
    </G>
  );
}
