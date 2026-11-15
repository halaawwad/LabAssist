import { View } from "react-native";
import { Cpu } from "lucide-react-native";
import { AppText } from "./AppText";

export function LabAssistBrand({ size = 21 }: { size?: number }) {
  return (
    <View
      accessibilityLabel="LabAssist"
      style={{ direction: "ltr", flexDirection: "row", alignItems: "center", gap: size * 0.35 }}
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
