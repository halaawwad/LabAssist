import { View } from "react-native";
import { Cpu } from "lucide-react-native";
import { AppText } from "./AppText";
import { directionProps } from "@/i18n";

export function LabAssistBrand({ size = 21 }: { size?: number }) {
  // The Latin wordmark keeps its icon-then-name order in Arabic layouts too.
  const { style: direction, ...webDirection } = directionProps("ltr");
  return (
    <View
      accessibilityLabel="LabAssist"
      {...webDirection}
      style={[{ flexDirection: "row", alignItems: "center", gap: size * 0.35 }, direction]}
    >
      <Cpu size={size * 1.45} strokeWidth={1.5} color="#35452b" />
      <AppText
        language="en"
        weight="bold"
        style={{ fontSize: size, color: "#35452b", letterSpacing: 0 }}
      >
        LabAssist
      </AppText>
    </View>
  );
}
