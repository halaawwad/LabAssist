import { useMemo, useState } from "react";
import {
  Image,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CircuitBoard,
  ExternalLink,
  Search,
  X,
  Zap,
} from "lucide-react-native";
import { AppText, Button } from "@/components";
import { LabView } from "@/components/LabView";
import { useCopy } from "@/components/MobileKit";
import { useLanguage } from "@/i18n";
import { projectFor } from "@/domain/workspace";
import { router } from "@/native/router";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { colors, fontStyle } from "@/theme";
import hardware from "../../../assets/data/hardware.json";
import { catalogPreviews } from "./catalogPreviews";

type Component = (typeof hardware.parts)[number];
const categoryNames = [
  "Control Boards",
  "Sensors",
  "Motors & Actuators",
  "Displays",
  "Electronic Parts",
  "Power Drivers",
  "Wireless",
  "Modules",
];
const categoryTints = [
  colors.primaryWash,
  "#e9f0f3",
  "#f3ebdf",
  "#e8eee6",
  "#f2ece3",
  "#eae8ef",
  "#e5efed",
  "#eeeddf",
];
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[أإآ]/g, "ا")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .trim();

// The host already scrolls vertically. Keep one vertical scroll owner, with only
// lightweight images in this bounded 43-part grid (no nested virtualized list).
export function CatalogPanel() {
  const t = useCopy();
  const { language, dir, isRTL } = useLanguage();
  const { state, actorId, act, storageError } = useWorkspace();
  const project = projectFor(state, actorId);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [voltage, setVoltage] = useState("all");
  const [selected, setSelected] = useState<Component | null>(null);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const items = useMemo(
    () =>
      hardware.parts.filter(
        (part) =>
          (category === "all" || part.category === category) &&
          (voltage === "all" || part.voltage === Number(voltage)) &&
          normalize(
            `${part.name} ${part.arabic} ${part.key} ${part.model} ${part.category}`,
          ).includes(normalize(search)),
      ),
    [category, search, voltage],
  );
  const label = (value: string) =>
    language === "ar" ? value : (categoryNames[hardware.categories.indexOf(value)] ?? value);
  const supply = (part: Component) =>
    part.voltage ? `${part.voltage} V` : t("Circuit dependent", "حسب الدارة");
  const reset = () => {
    setSearch("");
    setCategory("all");
    setVoltage("all");
  };
  const close = () => setSelected(null);
  const add = () => {
    if (!project || !selected) return;
    const ok = act({
      type: "part.add",
      projectId: project.id,
      name: selected.name,
      quantity: 1,
      unitPrice: 0,
    });
    setFailed(!ok);
    setNotice(
      ok
        ? t(
            "Added to project parts. Set an estimated price in Parts.",
            "أُضيفت لقطع المشروع. يمكنك تحديد السعر التقديري من شاشة القطع.",
          )
        : t(
            "Could not add this component. Check project permissions and try again.",
            "تعذرت إضافة القطعة. تحقق من صلاحيات المشروع وحاول مجدداً.",
          ),
    );
  };
  const openLab = () => {
    close();
    router.push("/native/student/lab");
  };
  return (
    <View style={[s.stack, { direction: dir }]}>
      <View style={s.intro}>
        <View style={s.row}>
          <View style={s.libraryIcon}>
            <CircuitBoard size={23} color={colors.primary} />
          </View>
          <View style={s.grow}>
            <AppText variant="heading">
              {t("Find your next component", "اكتشف قطعتك التالية")}
            </AppText>
            <AppText variant="caption" tone="muted">
              {t("Explore. Connect. Build.", "استكشف. وصّل. ابتكر.")}
            </AppText>
          </View>
        </View>
        <AppText variant="caption" tone="muted">
          {t(
            "Your hardware library, from pinout to prototype.",
            "مكتبة مكوناتك، من توصيل الأطراف إلى النموذج الأولي.",
          )}
        </AppText>
      </View>

      <View style={s.search}>
        <Search size={21} color={colors.primary} />
        <TextInput
          accessibilityLabel={t(
            "Search components in English or Arabic",
            "ابحث عن المكونات بالعربية أو الإنجليزية",
          )}
          placeholder={t("Search components…", "ابحث عن قطعة…")}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
          style={[
            s.searchInput,
            fontStyle(language, "body"),
            { textAlign: isRTL ? "right" : "left", writingDirection: dir },
          ]}
        />
        {!!search && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Clear search", "مسح البحث")}
            onPress={() => setSearch("")}
            style={s.iconButton}
          >
            <X size={18} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        key={dir}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
      >
        {["all", ...hardware.categories].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: category === value }}
            onPress={() => setCategory(value)}
            style={({ pressed }) => [
              s.chip,
              category === value && s.activeChip,
              pressed && s.pressed,
            ]}
          >
            <AppText
              variant="caption"
              weight="semibold"
              tone={category === value ? "inverse" : "default"}
            >
              {value === "all" ? t("All components", "كل القطع") : label(value)}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.stackSmall}>
        <AppText variant="caption" tone="muted">
          {t("Typical supply", "جهد التغذية المعتاد")}
        </AppText>
        <View style={s.wrap}>
          {["all", "3.3", "5", "12"].map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: voltage === value }}
              onPress={() => setVoltage(value)}
              style={({ pressed }) => [
                s.voltageChip,
                voltage === value && s.voltageActive,
                pressed && s.pressed,
              ]}
            >
              <AppText
                variant="caption"
                tone="primary"
                weight={voltage === value ? "bold" : "regular"}
                language={value === "all" ? language : "en"}
              >
                {value === "all" ? t("Any voltage", "كل الجهود") : `${value} V`}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[s.row, s.results]}>
        <AppText variant="caption" tone="muted" style={s.grow} accessibilityLiveRegion="polite">
          {t(
            `${items.length} of ${hardware.parts.length} components`,
            `${items.length} من ${hardware.parts.length} قطعة`,
          )}
        </AppText>
        {(search || category !== "all" || voltage !== "all") && (
          <Pressable accessibilityRole="button" onPress={reset} style={s.clear}>
            <AppText variant="caption" tone="primary" weight="semibold">
              {t("Reset", "إعادة ضبط")}
            </AppText>
          </Pressable>
        )}
      </View>
      <View style={s.grid}>
        {items.map((part) => (
          <Pressable
            key={part.key}
            accessibilityRole="button"
            accessibilityLabel={`${language === "ar" ? part.arabic : part.name}, ${label(part.category)}, ${supply(part)}, ${part.def.pins.length} ${t("pins. View details", "طرفاً. عرض التفاصيل")}`}
            onPress={() => {
              Keyboard.dismiss();
              setNotice("");
              setFailed(false);
              setSelected(part);
            }}
            style={({ pressed }) => [s.card, pressed && s.pressed]}
          >
            <View
              style={[
                s.preview,
                { backgroundColor: categoryTints[hardware.categories.indexOf(part.category)] },
              ]}
            >
              {catalogPreviews[part.model] ? (
                <Image
                  source={catalogPreviews[part.model]}
                  style={s.thumbnail}
                  resizeMode="contain"
                  accessible={false}
                />
              ) : (
                <CircuitBoard size={42} color={colors.primary} />
              )}
            </View>
            <View style={s.cardBody}>
              <AppText variant="caption" tone="primary" style={s.category}>
                {label(part.category)}
              </AppText>
              <AppText weight="semibold" style={s.name}>
                {language === "ar" ? part.arabic : part.name}
              </AppText>
              <View style={s.cardSpecs}>
                <View style={s.meta}>
                  <Zap size={12} color={colors.primary} />
                  <AppText
                    variant="caption"
                    tone="muted"
                    style={s.metaText}
                    language={part.voltage ? "en" : language}
                  >
                    {supply(part)}
                  </AppText>
                </View>
                <View style={s.meta}>
                  <CircuitBoard size={12} color={colors.primary} />
                  <AppText variant="caption" tone="muted" style={s.metaText}>
                    {part.def.pins.length} {t("pins", "طرفاً")}
                  </AppText>
                </View>
              </View>
              <View style={[s.row, s.cardFooter]}>
                <AppText variant="caption" tone="primary" weight="semibold" style={s.grow}>
                  {t("Explore", "استكشف")}
                </AppText>
                {isRTL ? (
                  <ArrowLeft size={16} color={colors.primary} />
                ) : (
                  <ArrowRight size={16} color={colors.primary} />
                )}
              </View>
            </View>
          </Pressable>
        ))}
      </View>
      {!items.length && (
        <View style={s.empty}>
          <Search size={30} color={colors.primary} />
          <AppText variant="heading" align="center">
            {t("No matching components", "لا توجد قطع مطابقة")}
          </AppText>
          <AppText tone="muted" align="center">
            {t("Try another name or reset your filters.", "جرّب اسماً آخر أو أعد ضبط التصنيفات.")}
          </AppText>
          <Button
            title={t("Reset filters", "إعادة ضبط التصنيفات")}
            variant="soft"
            onPress={reset}
          />
        </View>
      )}

      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={close}
      >
        {selected && (
          <SafeAreaView style={[s.detailRoot, { direction: dir }]}>
            <View style={s.detailHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Back to components", "العودة إلى القطع")}
                onPress={close}
                style={s.iconButton}
              >
                {isRTL ? (
                  <ArrowRight color={colors.primary} />
                ) : (
                  <ArrowLeft color={colors.primary} />
                )}
              </Pressable>
              <View style={s.grow}>
                <AppText variant="caption" tone="muted">
                  {t("COMPONENT LIBRARY", "مكتبة المكونات")}
                </AppText>
                <AppText weight="semibold">{t("Component details", "تفاصيل القطعة")}</AppText>
              </View>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.detailContent}
            >
              <View style={s.stackSmall}>
                <AppText variant="caption" tone="primary" weight="semibold">
                  {label(selected.category)}
                </AppText>
                <AppText variant="title">
                  {language === "ar" ? selected.arabic : selected.name}
                </AppText>
                <AppText language={language === "ar" ? "en" : "ar"} tone="muted">
                  {language === "ar" ? selected.name : selected.arabic}
                </AppText>
              </View>
              <View style={s.stackSmall}>
                <LabView
                  key={selected.key}
                  nodes={[{ model: selected.model, x: 0, z: 0 }]}
                  height={260}
                />
                <AppText variant="caption" tone="muted">
                  {t(
                    "Drag to orbit · Pinch to zoom. Structural preview; no electrical simulation.",
                    "اسحب للدوران · كبّر بإصبعين. معاينة هيكلية دون محاكاة كهربائية.",
                  )}
                </AppText>
                <Button
                  title={t("Open 3D Lab", "فتح مختبر 3D")}
                  variant="soft"
                  onPress={openLab}
                  fullWidth
                />
              </View>
              <View style={s.section}>
                <AppText variant="heading">{t("Specifications", "المواصفات")}</AppText>
                <View style={s.specGrid}>
                  {[
                    [t("Typical supply", "جهد التغذية"), supply(selected)],
                    [t("Pin count", "عدد الأطراف"), String(selected.def.pins.length)],
                    [
                      t("Current estimate", "التيار التقديري"),
                      selected.def.draw
                        ? `${selected.def.draw} mA`
                        : t("Load dependent", "حسب الحمل"),
                    ],
                    [
                      t("Logic voltage", "جهد الإشارة"),
                      selected.def.logic
                        ? `${selected.def.logic} V`
                        : t("Circuit dependent", "حسب الدارة"),
                    ],
                  ].map(([name, value]) => (
                    <View key={name} style={s.spec}>
                      <AppText variant="caption" tone="muted">
                        {name}
                      </AppText>
                      <AppText
                        weight="semibold"
                        language={/^\d/.test(value) ? "en" : language}
                        style={{ textAlign: isRTL ? "right" : "left" }}
                      >
                        {value}
                      </AppText>
                    </View>
                  ))}
                </View>
                <AppText variant="caption" language="en" tone="muted">
                  {selected.key}
                </AppText>
                {language === "ar" && <AppText language="ar">{selected.description}</AppText>}
              </View>
              <View style={s.section}>
                <AppText variant="heading">{t("Pin connections", "الأطراف والتوصيلات")}</AppText>
                {selected.def.pins.map((pin, index) => (
                  <View key={`${pin.name}-${index}`} style={s.pinRow}>
                    <View style={s.pinBadge}>
                      <AppText language="en" variant="caption" weight="bold" tone="primary">
                        {pin.name}
                      </AppText>
                    </View>
                    <View style={s.grow}>
                      <AppText variant="caption" language="en">
                        {pin.kind} · {pin.dir}
                        {"voltage" in pin ? ` · ${pin.voltage} V` : ""}
                      </AppText>
                      {"functions" in pin && !!pin.functions && (
                        <AppText variant="caption" language="en" tone="muted">
                          {String(pin.functions)}
                        </AppText>
                      )}
                    </View>
                  </View>
                ))}
              </View>
              <View style={s.section}>
                <AppText variant="heading">{t("Usage guide", "دليل الاستخدام")}</AppText>
                {language === "ar" && (
                  <AppText variant="caption" tone="muted">
                    {t("", "دليل المصدر متاح بالإنجليزية.")}
                  </AppText>
                )}
                <AppText language="en">{selected.guide.intro}</AppText>
                {selected.guide.steps.map((step, index) => (
                  <View key={index} style={s.step}>
                    <View style={s.stepNumber}>
                      <AppText variant="caption" tone="primary" weight="bold">
                        {index + 1}
                      </AppText>
                    </View>
                    <AppText language="en" style={s.grow}>
                      {step}
                    </AppText>
                  </View>
                ))}
                <View style={s.note}>
                  <AppText language="en" variant="caption">
                    {selected.guide.check}
                  </AppText>
                </View>
              </View>
              <View style={s.section}>
                <AppText variant="heading">{t("Compatibility notes", "ملاحظات التوافق")}</AppText>
                <AppText variant="caption">
                  {t(
                    "Connect a common ground and match signal voltage to your controller. Motors and relays need suitable drivers. Supply and logic voltage can differ; check the board variant before wiring.",
                    "وصّل أرضياً مشتركاً وطابق جهد الإشارة مع المتحكم. تحتاج المحركات والمرحلات إلى دارات قيادة مناسبة. قد يختلف جهد التغذية عن جهد الإشارة؛ تحقق من نسخة اللوحة قبل التوصيل.",
                  )}
                </AppText>
                {["raspberry_pi_4", "water_pump_5v"].includes(selected.key) && (
                  <AppText variant="caption">
                    {t(
                      `The preview uses the ${selected.def.name} model as a visual reference. Its lab specifications differ from this entry.`,
                      `تستخدم المعاينة نموذج ${selected.def.name} كمرجع بصري. تختلف مواصفاته في المختبر عن هذه القطعة.`,
                    )}
                  </AppText>
                )}
              </View>
              <View style={s.section}>
                <AppText variant="heading">
                  {t("Official documentation", "المراجع الرسمية")}
                </AppText>
                {selected.documents.map((doc) => (
                  <Pressable
                    key={doc.url}
                    accessibilityRole="link"
                    accessibilityLabel={`${doc.publisher}: ${doc.title}`}
                    onPress={() =>
                      Linking.openURL(doc.url).catch(() => {
                        setFailed(true);
                        setNotice(t("Could not open the documentation.", "تعذر فتح المرجع."));
                      })
                    }
                    style={({ pressed }) => [s.document, pressed && s.pressed]}
                  >
                    <ExternalLink size={19} color={colors.primary} />
                    <View style={s.grow}>
                      <AppText language="en" weight="semibold">
                        {doc.publisher}
                      </AppText>
                      <AppText language="en" variant="caption" tone="muted">
                        {doc.title}
                      </AppText>
                    </View>
                    <ChevronRight
                      size={16}
                      color={colors.primary}
                      style={isRTL ? { transform: [{ rotate: "180deg" }] } : undefined}
                    />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={s.actionBar}>
              {!!notice && (
                <AppText
                  variant="caption"
                  tone={failed ? "danger" : "primary"}
                  accessibilityLiveRegion="polite"
                >
                  {notice}
                </AppText>
              )}
              {storageError && (
                <AppText variant="caption" tone="danger">
                  {t(
                    "Changes could not be saved to this device.",
                    "تعذر حفظ التغييرات على هذا الجهاز.",
                  )}
                </AppText>
              )}
              {project ? (
                <Button
                  title={t("Add to project BOM", "إضافة إلى قطع المشروع")}
                  onPress={add}
                  fullWidth
                />
              ) : (
                <AppText variant="caption" tone="muted">
                  {t(
                    "Join a project to add components to its BOM.",
                    "انضم إلى مشروع لإضافة مكونات إلى قائمة قطعه.",
                  )}
                </AppText>
              )}
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: 16, minWidth: 0, width: "100%" },
  stackSmall: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  intro: {
    gap: 12,
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  libraryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 54,
    paddingStart: 16,
    paddingEnd: 4,
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.softButtonBorder,
    backgroundColor: colors.panelStrong,
  },
  searchInput: { flex: 1, minWidth: 0, minHeight: 50, paddingVertical: 10, color: colors.text },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  filterScroll: { flexGrow: 0, width: "100%" },
  filterRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  chip: {
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.softButtonBorder,
    backgroundColor: colors.panelStrong,
  },
  activeChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  voltageChip: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  voltageActive: { backgroundColor: colors.primaryPale, borderColor: colors.primarySoft },
  results: { minHeight: 44 },
  clear: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  card: {
    width: "48%",
    minWidth: 0,
    borderRadius: 22,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.stroke,
    overflow: "hidden",
  },
  preview: {
    height: 116,
    margin: 8,
    marginBottom: 0,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: { width: "100%", height: "100%" },
  cardBody: { padding: 12, gap: 8, flex: 1 },
  category: { fontSize: 11, lineHeight: 19 },
  name: { fontSize: 14, lineHeight: 23 },
  cardSpecs: { gap: 5, marginTop: "auto", paddingTop: 4 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, lineHeight: 18, flexShrink: 1 },
  cardFooter: {
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingTop: 10,
    marginTop: 4,
    minHeight: 38,
  },
  pressed: { opacity: 0.7 },
  empty: {
    padding: 24,
    gap: 16,
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: colors.panelStrong,
  },
  detailRoot: { flex: 1, backgroundColor: colors.background },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: colors.panelStrong,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  detailContent: {
    padding: 18,
    gap: 22,
    paddingBottom: 28,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  section: {
    padding: 16,
    gap: 14,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: 22,
  },
  specGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 16 },
  spec: { width: "48%", minWidth: 0, gap: 4 },
  pinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  pinBadge: {
    maxWidth: "45%",
    minWidth: 56,
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.primaryWash,
  },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepNumber: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.primaryPale,
  },
  note: { padding: 12, borderRadius: 12, backgroundColor: colors.primaryWash },
  document: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
  },
  actionBar: {
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelStrong,
  },
});
