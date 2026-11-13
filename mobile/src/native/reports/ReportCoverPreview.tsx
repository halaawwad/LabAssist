import { useState } from "react";
import { useFonts } from "expo-font";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Expand, Minus, Plus, Ruler, X } from "lucide-react-native";
import { AppText, Button } from "@/components";
import type { FinalDocument } from "@/domain/finalReport";

const PAGE_WIDTH = 595.28,
  PAGE_HEIGHT = 841.89;
const stationery = require("../../../assets/web/report-page-background.jpg");
type Meta = FinalDocument["meta"];

/** The paper always uses PDF points; only the entire finished page is scaled. */
function CoverPage({ meta, width, guides }: { meta: Meta; width: number; guides: boolean }) {
  const scale = width / PAGE_WIDTH;
  return (
    <View
      testID="report-cover-page"
      accessibilityLabel="A4 cover page preview"
      style={{
        width,
        height: (width * PAGE_HEIGHT) / PAGE_WIDTH,
        backgroundColor: "white",
        overflow: "hidden",
      }}
    >
      <View
        testID="report-cover-canvas"
        style={{
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          position: "absolute",
          left: 0,
          top: 0,
          transform: [
            { translateX: (width - PAGE_WIDTH) / 2 },
            { translateY: (PAGE_HEIGHT * scale - PAGE_HEIGHT) / 2 },
            { scale },
          ],
        }}
      >
        <Image source={stationery} resizeMode="contain" style={s.stationery} />
        {guides && <View pointerEvents="none" testID="report-cover-safe-area" style={s.safeArea} />}
        <View testID="report-cover-content" style={s.content}>
          <Text allowFontScaling={false} testID="report-cover-title" style={s.title}>
            {meta.title || "[Project title]"}
          </Text>
          <Text allowFontScaling={false} style={s.subtitle}>
            Graduation Project Report
          </Text>
          <Text allowFontScaling={false} style={s.department}>
            {meta.department || "[Department]"} Engineering Department
          </Text>
          <View style={s.group}>
            <Text allowFontScaling={false} style={s.label}>
              Prepared by:
            </Text>
            {meta.students.map((student, i) => (
              <Text allowFontScaling={false} style={s.body} key={i}>
                {student.name || "[Student name]"} {student.number}
              </Text>
            ))}
          </View>
          <View style={s.group}>
            <Text allowFontScaling={false} style={s.label}>
              Supervisor:
            </Text>
            <Text allowFontScaling={false} style={s.body}>
              {meta.supervisor || "[Supervisor name]"}
            </Text>
          </View>
          <Text allowFontScaling={false} style={s.body}>
            Presented in partial fulfilment of the requirements for Bachelor degree in{" "}
            {meta.specialization || "[Name of Specialization]"}.
          </Text>
          <Text allowFontScaling={false} style={s.date}>
            {meta.date || "[Date]"}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function ReportCoverPreview({ meta }: { meta: Meta }) {
  const screen = useWindowDimensions();
  const [width, setWidth] = useState(Math.max(200, screen.width - 36));
  const [guides, setGuides] = useState(true),
    [enlarged, setEnlarged] = useState(false),
    [zoom, setZoom] = useState(1);
  const [fontsReady, fontError] = useFonts({
    ReportAmiri: require("../../../assets/report-fonts/amiri-regular.ttf"),
    ReportAmiriBold: require("../../../assets/report-fonts/amiri-bold.ttf"),
  });
  const fullWidth = Math.max(200, screen.width - 36) * zoom;
  return (
    <View style={s.preview}>
      <View style={s.toolbar}>
        <View style={s.size}>
          <Ruler size={15} color="#789061" />
          <AppText style={s.sizeText}>A4 · 210 × 297 mm</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enlarge cover"
          onPress={() => {
            setZoom(1);
            setEnlarged(true);
          }}
          style={s.icon}
        >
          <Expand size={18} color="#627b4d" />
        </Pressable>
      </View>
      <AppText style={s.hint}>
        Edit the fields below. This page shows their size and position in the PDF.
      </AppText>
      <View
        style={s.paper}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.width - 2;
          if (next > 0 && Math.abs(next - width) > 0.5) setWidth(next);
        }}
      >
        {fontsReady ? (
          <CoverPage meta={meta} width={width} guides={guides} />
        ) : (
          <View
            style={{
              height: (width * PAGE_HEIGHT) / PAGE_WIDTH,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <AppText style={s.hint}>
              {fontError
                ? "Report fonts could not load. Try reopening the preview."
                : "Preparing cover…"}
            </AppText>
          </View>
        )}
      </View>
      <View style={s.toolbar}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: guides }}
          accessibilityLabel="Show page guides"
          onPress={() => setGuides(!guides)}
          style={s.guideToggle}
        >
          <View style={[s.checkbox, guides && s.checked]}>
            <AppText style={s.check}>{guides ? "✓" : ""}</AppText>
          </View>
          <AppText style={s.sizeText}>Show page guides</AppText>
        </Pressable>
        <AppText style={s.scale}>{Math.round((width / PAGE_WIDTH) * 100)}% preview</AppText>
      </View>
      {guides && (
        <AppText style={s.hint}>
          Reserved header: 47 mm · Side margins: 20 mm · Bottom: 20 mm. Guides are not printed.
        </AppText>
      )}
      <Modal
        visible={enlarged}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setEnlarged(false)}
      >
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <AppText weight="bold">Cover · A4</AppText>
            <View style={s.zoomTools}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zoom out cover"
                disabled={zoom <= 1}
                onPress={() => setZoom(Math.max(1, zoom - 0.25))}
                style={s.icon}
              >
                <Minus size={20} color="#627b4d" />
              </Pressable>
              <AppText style={s.sizeText}>{Math.round(zoom * 100)}%</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zoom in cover"
                disabled={zoom >= 3}
                onPress={() => setZoom(Math.min(3, zoom + 0.25))}
                style={s.icon}
              >
                <Plus size={20} color="#627b4d" />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close enlarged cover"
              onPress={() => setEnlarged(false)}
              style={s.icon}
            >
              <X color="#526443" size={23} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.fullContent}>
            <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: 18 }}>
              {fontsReady && <CoverPage meta={meta} width={fullWidth} guides={guides} />}
            </ScrollView>
          </ScrollView>
          <View style={s.bottom}>
            <Button
              title="Return to cover fields"
              variant="soft"
              onPress={() => setEnlarged(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  stationery: { position: "absolute", left: 0, top: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT },
  content: { paddingTop: 132, paddingHorizontal: 56, paddingBottom: 58 },
  title: {
    fontFamily: "ReportAmiriBold",
    fontSize: 27,
    lineHeight: 33.75,
    color: "#171717",
    textAlign: "center",
    marginTop: 25,
  },
  subtitle: {
    fontFamily: "ReportAmiriBold",
    fontSize: 17,
    lineHeight: 23,
    color: "#171717",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 35,
  },
  department: {
    fontFamily: "ReportAmiri",
    fontSize: 12,
    lineHeight: 18,
    color: "#171717",
    textAlign: "center",
    marginBottom: 22,
  },
  group: { marginBottom: 21 },
  label: {
    fontFamily: "ReportAmiriBold",
    fontSize: 12,
    lineHeight: 18,
    color: "#171717",
    marginBottom: 6,
  },
  body: {
    fontFamily: "ReportAmiri",
    fontSize: 12,
    lineHeight: 18,
    color: "#171717",
    writingDirection: "auto",
  },
  date: {
    fontFamily: "ReportAmiri",
    fontSize: 12,
    lineHeight: 18,
    color: "#171717",
    marginTop: 35,
    textAlign: "center",
  },
  safeArea: {
    position: "absolute",
    top: 132,
    left: 56,
    right: 56,
    bottom: 58,
    borderWidth: 0.8,
    borderColor: "#9eae89",
    borderStyle: "dashed",
  },
  preview: { gap: 10 },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  size: { flexDirection: "row", alignItems: "center", gap: 7 },
  sizeText: { fontSize: 11, lineHeight: 17, color: "#6b8059", fontWeight: "600" },
  icon: {
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    padding: 7,
    borderRadius: 10,
    backgroundColor: "#e9efdf",
  },
  hint: { fontSize: 11, lineHeight: 18, color: "#7b8971" },
  paper: {
    width: "100%",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#dce0d4",
    overflow: "hidden",
  },
  guideToggle: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 4 },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#a4b28d",
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: "#819469" },
  check: { color: "white", fontSize: 12, lineHeight: 15 },
  scale: { fontSize: 10, lineHeight: 16, color: "#8c9782" },
  modal: { flex: 1, backgroundColor: "#e9ece4" },
  modalHeader: {
    padding: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fbfcf7",
    borderBottomWidth: 1,
    borderBottomColor: "#d5deca",
  },
  zoomTools: { flexDirection: "row", gap: 8, alignItems: "center" },
  fullContent: { paddingVertical: 18 },
  bottom: { padding: 12, backgroundColor: "#fbfcf7", alignItems: "center" },
});
