import { useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Ellipse, Rect, Text as SvgText } from "react-native-svg";
import { Maximize2, Minus, Plus } from "lucide-react-native";

import { AppText, Button } from "@/components";
import { SegmentedControl, kit, useCopy } from "@/components/MobileKit";
import { TouchTarget as Pressable } from "@/components/TouchTarget";
import {
  capacityOf,
  floorSize,
  tableStatus,
  type TableStatus,
  type WorkshopTable,
} from "@/domain/webWorkshop/workshopTables";
import { colors } from "@/theme";

import { MapGroup } from "./MapGroup";

/** Fill and text colour per table status; the legend and list repeat the status as text. */
export const statusColors: Record<TableStatus, { fill: string; stroke: string; text: string }> = {
  free: { fill: "#deebf8", stroke: "#6d94b8", text: "#2b557a" },
  assigned: { fill: "#dfe8d9", stroke: "#728a5d", text: "#3d5530" },
  shared: { fill: "#f5e2c2", stroke: "#b68a45", text: "#7c5212" },
};
const zoomSteps = [1, 1.5, 2, 3];

/**
 * Workshop floor: fits the available width first; zoom (up to 3×) keeps table labels
 * readable and pans horizontally. The List view shows every table at full text size.
 * Selection opens the existing table sheet, so allocation, release, capacity and history
 * rules are unchanged.
 */
export function WorkshopMap({
  tables,
  total,
  selected,
  onSelect,
  teamLabel,
}: {
  tables: WorkshopTable[];
  total: number;
  selected: string;
  onSelect: (code: string) => void;
  teamLabel: (teamId: string) => string;
}) {
  const t = useCopy();
  const { width: windowWidth } = useWindowDimensions();
  const [view, setView] = useState<"map" | "list">(windowWidth < 600 ? "list" : "map");
  const [step, setStep] = useState(0);
  const [fit, setFit] = useState(0);
  const zoom = zoomSteps[step];
  const width = Math.max(200, fit) * zoom;
  const height = (width * floorSize.height) / floorSize.width;
  const mapTargetsReady = tables.every(
    (table) => (Math.min(table.w, table.h) * width) / floorSize.width >= 44,
  );
  const statusName: Record<TableStatus, string> = {
    free: t("Free", "متاحة"),
    assigned: t("Assigned", "مخصصة"),
    shared: t("Shared", "مشتركة"),
  };
  const legend = (
    <View style={styles.legend} accessibilityRole="summary">
      {(["assigned", "free", "shared"] as const).map((status) => (
        <View key={status} style={styles.legendItem}>
          <View
            style={[
              styles.swatch,
              {
                backgroundColor: statusColors[status].fill,
                borderColor: statusColors[status].stroke,
              },
            ]}
          />
          <AppText variant="caption">
            {statusName[status]} ·{" "}
            {status === "shared"
              ? t("two teams, round table", "فريقان، طاولة دائرية")
              : status === "free"
                ? t("no team yet", "بلا فريق")
                : t("one team", "فريق واحد")}
          </AppText>
        </View>
      ))}
    </View>
  );
  return (
    <View style={styles.stack}>
      <SegmentedControl
        accessibilityLabel={t("Workshop view", "عرض الورشة")}
        value={view}
        onChange={setView}
        options={[
          { id: "map", label: t("Map", "الخريطة") },
          { id: "list", label: t("Table list", "قائمة الطاولات") },
        ]}
      />
      <AppText variant="caption" tone="muted">
        {t(
          `${tables.length} of ${total} tables · Rectangular: one team · Round: two teams`,
          `${tables.length} من ${total} طاولة · المستطيلة: فريق واحد · الدائرية: فريقان`,
        )}
      </AppText>
      {legend}
      {view === "map" ? (
        <View style={styles.stack}>
          <View style={styles.zoom}>
            <Button
              title={t("Zoom out", "تصغير")}
              accessibilityLabel={t("Zoom out", "تصغير")}
              variant="secondary"
              size="sm"
              icon={<Minus size={18} color={step ? colors.primary : colors.textFaint} />}
              disabled={!step}
              onPress={() => setStep(Math.max(0, step - 1))}
            />
            <AppText weight="semibold" accessibilityLiveRegion="polite" style={styles.zoomValue}>
              {Math.round(zoom * 100)}%
            </AppText>
            <Button
              title={t("Zoom in", "تكبير")}
              variant="secondary"
              size="sm"
              icon={
                <Plus
                  size={18}
                  color={step < zoomSteps.length - 1 ? colors.primary : colors.textFaint}
                />
              }
              disabled={step === zoomSteps.length - 1}
              onPress={() => setStep(Math.min(zoomSteps.length - 1, step + 1))}
            />
            <Button
              title={t("Fit", "ملاءمة")}
              accessibilityLabel={t("Fit map to width", "ملاءمة الخريطة للعرض")}
              variant="tertiary"
              size="sm"
              icon={<Maximize2 size={16} color={step ? colors.primary : colors.textFaint} />}
              disabled={!step}
              onPress={() => setStep(0)}
            />
          </View>
          {!mapTargetsReady && (
            <AppText variant="caption" tone="muted">
              {t(
                "Zoom in until tables are large enough to select, or use the table list.",
                "كبّر الخريطة حتى تصبح الطاولات كبيرة للاختيار، أو استخدم قائمة الطاولات.",
              )}
            </AppText>
          )}
          {/* Fit measures the space the map actually has (not the window). */}
          <View
            style={styles.frame}
            onLayout={(event) => setFit(Math.floor(event.nativeEvent.layout.width))}
          >
            <ScrollView
              horizontal
              scrollEnabled={zoom > 1}
              showsHorizontalScrollIndicator={zoom > 1}
              accessibilityLabel={t("Workshop floor map", "خريطة أرضية الورشة")}
            >
              {fit > 0 && (
                <Svg
                  width={width}
                  height={height}
                  viewBox={`0 0 ${floorSize.width} ${floorSize.height}`}
                >
                  <Rect
                    x={20}
                    y={20}
                    width={floorSize.width - 40}
                    height={floorSize.height - 40}
                    rx={30}
                    fill="#f8f6f0"
                    stroke="#aebaa4"
                    strokeWidth={5}
                  />
                  {tables.map((table) => {
                    const status = tableStatus(table);
                    const chosen = selected === table.code;
                    const tone = statusColors[status];
                    const fill = chosen ? colors.primary : tone.fill;
                    return (
                      <MapGroup
                        key={table.code}
                        label={`${t("Table", "طاولة")} ${table.code}, ${statusName[status]}`}
                        enabled={mapTargetsReady}
                        onPress={() => onSelect(table.code)}
                      >
                        {table.shape === "round" ? (
                          <Ellipse
                            cx={table.cx}
                            cy={table.cy}
                            rx={table.w / 2}
                            ry={table.h / 2}
                            fill={fill}
                            stroke={tone.stroke}
                            strokeWidth={3}
                          />
                        ) : (
                          <Rect
                            x={table.cx - table.w / 2}
                            y={table.cy - table.h / 2}
                            width={table.w}
                            height={table.h}
                            rx={8}
                            fill={fill}
                            stroke={tone.stroke}
                            strokeWidth={3}
                          />
                        )}
                        <SvgText
                          x={table.cx}
                          y={table.cy + 9}
                          textAnchor="middle"
                          fill={chosen ? "#fff" : tone.text}
                          fontWeight="bold"
                          fontSize={28}
                        >
                          {table.code}
                        </SvgText>
                      </MapGroup>
                    );
                  })}
                </Svg>
              )}
            </ScrollView>
          </View>
        </View>
      ) : (
        <View style={kit.list}>
          {!tables.length && (
            <AppText tone="muted" style={styles.empty}>
              {t("No matching tables.", "لا توجد طاولات مطابقة.")}
            </AppText>
          )}
          {tables.map((table, index) => {
            const status = tableStatus(table);
            const teamsText =
              table.teamIds.map(teamLabel).join(" · ") || t("Free table", "طاولة متاحة");
            return (
              <Pressable
                key={table.code}
                accessibilityRole="button"
                accessibilityLabel={`${t("Table", "طاولة")} ${table.code}, ${statusName[status]}, ${teamsText}`}
                onPress={() => onSelect(table.code)}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && styles.divider,
                  selected === table.code && styles.rowSelected,
                  pressed && styles.rowSelected,
                ]}
              >
                <View
                  style={[
                    styles.code,
                    {
                      backgroundColor: statusColors[status].fill,
                      borderColor: statusColors[status].stroke,
                      borderRadius: table.shape === "round" ? 22 : 8,
                    },
                  ]}
                >
                  <AppText weight="bold" style={{ color: statusColors[status].text }}>
                    {table.code}
                  </AppText>
                </View>
                <View style={kit.grow}>
                  <AppText weight="semibold" numberOfLines={2}>
                    {teamsText}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {table.shape === "round" ? t("Round", "دائرية") : t("Rectangular", "مستطيلة")} ·{" "}
                    {t("Capacity", "السعة")} {table.teamIds.length}/{capacityOf(table.shape)} ·{" "}
                    {statusName[status]}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  legend: { gap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  swatch: { width: 18, height: 18, borderRadius: 5, borderWidth: 2 },
  zoom: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  zoomValue: { minWidth: 48, textAlign: "center" },
  frame: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f8f6f0",
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  divider: { borderTopWidth: 1, borderColor: colors.line },
  rowSelected: { backgroundColor: colors.primaryWash },
  code: {
    width: 52,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  empty: { paddingVertical: 16 },
});
