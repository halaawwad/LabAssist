import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, View } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { Check, Zap } from "lucide-react-native";
import { AppText, Button } from "@/components";
import { Panel, Ring, kit, useCopy } from "@/components/MobileKit";
import { colors } from "@/theme";

export function BuildCard({
  value,
  completed,
  total,
  onOpen,
}: {
  value: number;
  completed: number;
  total: number;
  onOpen: () => void;
}) {
  const t = useCopy();
  const [light] = useState(() => new Animated.Value(0.4));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(light, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(light, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => {
      active = false;
      loop?.stop();
    };
  }, [light]);
  return (
    <Panel tint={colors.primaryWash}>
      <View style={kit.row}>
        <AppText variant="caption" tone="primary">
          {t("In Progress", "قيد التنفيذ")}
        </AppText>
        <AppText variant="caption" tone="muted">
          {t("THE BUILD, TAKING SHAPE", "الفكرة تأخذ شكلها")}
        </AppText>
      </View>
      <View style={kit.row}>
        <View style={{ width: 150, height: 164, alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={{ position: "absolute", inset: 0, opacity: light }}>
            <Svg width={150} height={164} viewBox="0 0 168 152">
              <Path
                d="M84 12V36M12 55H31L46 70M11 113H29L47 95M156 44H136L119 64M157 112H137L119 94M84 140V119"
                stroke="#91aa79"
                strokeWidth={1.4}
                fill="none"
              />
              {[
                [84, 12],
                [12, 55],
                [11, 113],
                [156, 44],
                [157, 112],
                [84, 140],
              ].map(([cx, cy]) => (
                <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill="#839f67" />
              ))}
            </Svg>
          </Animated.View>
          <View
            style={{
              padding: 7,
              borderRadius: 23,
              backgroundColor: "#ffffffeb",
              borderWidth: 1,
              borderColor: "#d5e0c8",
            }}
          >
            <Ring value={value} />
          </View>
          <View
            style={{
              position: "absolute",
              right: 0,
              top: 18,
              padding: 7,
              borderRadius: 11,
              backgroundColor: "#fff",
            }}
          >
            <Zap size={15} color={colors.primary} />
          </View>
          <View
            style={{
              position: "absolute",
              left: 0,
              bottom: 18,
              padding: 7,
              borderRadius: 11,
              backgroundColor: "#fff",
            }}
          >
            <Check size={15} color={colors.primary} />
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 105, gap: 10 }}>
          <AppText variant="heading">{t("Project progress.", "إنجاز المشروع.")}</AppText>
          <AppText variant="caption" tone="muted">
            {completed} / {total} {t("tasks complete", "مهام مكتملة")}
          </AppText>
          <Button
            size="sm"
            title={t("Explore project", "فتح المشروع")}
            variant="ghost"
            onPress={onOpen}
          />
        </View>
      </View>
    </Panel>
  );
}
