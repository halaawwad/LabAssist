import { Platform, type ViewStyle } from "react-native";
type Direction = "ltr" | "rtl";
export function layoutDirection(direction: Direction): ViewStyle {
  return Platform.OS === "web" ? {} : { direction };
}
export function directionProps(direction: Direction): { dir?: Direction } {
  return Platform.OS === "web" ? { dir: direction } : {};
}
