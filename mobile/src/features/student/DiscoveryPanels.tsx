import { useState } from "react";
import { Linking, View } from "react-native";
import { AppText, Button } from "@/components";
import { Chips, Field, Panel, kit, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { colors } from "@/theme";
import hardware from "../../../assets/data/hardware.json";
import marketplace from "../../../assets/data/offers.json";
import { LabView } from "./HardwarePanels";

export function OffersPanel() {
  const t = useCopy();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [source, setSource] = useState("offers");
  const [error, setError] = useState("");
  const open = (url: string) =>
    Linking.openURL(url).catch(() => setError(t("Could not open this link.", "تعذر فتح الرابط.")));
  const offers = marketplace.offers
    .filter(
      (o) =>
        `${o.name} ${o.note}`.toLowerCase().includes(query.toLowerCase()) &&
        (city === "all" || marketplace.stores.find((s) => s.id === o.storeId)?.city === city),
    )
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  return (
    <View style={kit.stack}>
      <Panel tint={colors.softBlue}>
        <AppText variant="title">
          {t("Find it. Compare it. Build it.", "ابحث. قارن. ابنِ.")}
        </AppText>
        <AppText tone="muted">
          {t(
            "Compare listed prices, variants and shop locations.",
            "قارن الأسعار المنشورة والنسخ ومواقع المحلات.",
          )}
        </AppText>
      </Panel>
      <Field
        label={t("Find a component or shop", "ابحث عن قطعة أو محل")}
        value={query}
        onChangeText={setQuery}
      />
      <Chips
        value={source}
        onChange={setSource}
        options={[
          { id: "offers", label: t("Compare prices", "مقارنة الأسعار") },
          { id: "stores", label: t("Shops & maps", "المحلات والخرائط") },
          { id: "students", label: t("Student resale", "بيع الطلاب") },
        ]}
      />
      <Chips
        value={city}
        onChange={setCity}
        options={[
          { id: "all", label: t("All cities", "كل المدن") },
          ...[...new Set(marketplace.stores.map((s) => s.city))].map((c) => ({ id: c, label: c })),
        ]}
      />
      {source === "students" ? (
        <Panel>
          <AppText variant="heading">
            {t("Previous students’ offers", "عروض الطلاب السابقين")}
          </AppText>
          <AppText tone="muted">
            {t(
              "This feed needs reviewed Facebook or spreadsheet sources. No live resale offers are connected yet.",
              "هذا القسم يحتاج مصادر فيسبوك أو شيتات تمت مراجعتها. لا توجد عروض بيع حقيقية موصولة بعد.",
            )}
          </AppText>
        </Panel>
      ) : source === "stores" ? (
        marketplace.stores
          .filter(
            (s) =>
              (city === "all" || s.city === city) &&
              `${s.name} ${s.city}`.toLowerCase().includes(query.toLowerCase()),
          )
          .map((s) => (
            <Panel key={s.id}>
              <AppText variant="heading">{s.name}</AppText>
              <AppText>
                {s.city} · {s.address}
              </AppText>
              <AppText variant="caption" tone="muted">
                {s.note}
              </AppText>
              <View style={kit.wrap}>
                <Button
                  title={t("Map", "الخريطة")}
                  variant="soft"
                  onPress={() =>
                    open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + " " + s.address)}`,
                    )
                  }
                />
                <Button
                  title={t("Website", "الموقع")}
                  variant="ghost"
                  onPress={() => open(s.website)}
                />
                {s.phone && (
                  <Button
                    title={t("Call", "اتصال")}
                    variant="ghost"
                    onPress={() => open(`tel:${s.phone}`)}
                  />
                )}
              </View>
            </Panel>
          ))
      ) : (
        offers.map((o) => {
          const shop = marketplace.stores.find((s) => s.id === o.storeId)!;
          return (
            <Panel key={o.offerId}>
              <AppText variant="heading">{o.name}</AppText>
              <AppText variant="title">
                {o.price === null ? t("Ask for price", "اسأل عن السعر") : `₪${o.price}`}
              </AppText>
              <AppText weight="semibold">
                {shop.name} · {shop.city}
              </AppText>
              <AppText>{o.note}</AppText>
              <AppText variant="caption" tone="muted">
                {t("Saved listing", "قائمة محفوظة")}: {o.checked} · {o.availability}
              </AppText>
              <Button
                title={t("View original offer", "عرض المصدر الأصلي")}
                variant="soft"
                onPress={() => open(o.url)}
              />
            </Panel>
          );
        })
      )}
      {error && <AppText tone="danger">{error}</AppText>}
    </View>
  );
}
const lessons = [
  {
    id: "led",
    en: "LED + current-limiting resistor",
    ar: "LED مع مقاومة تحديد تيار",
    models: ["led-red", "resistor-220"],
    key: "led_red",
    result: [
      "A suitable resistor limits LED current. Confirm supply, LED polarity and resistor rating.",
      "تحد المقاومة المناسبة تيار LED. تحقق من التغذية والقطبية وقدرة المقاومة.",
    ],
  },
  {
    id: "light",
    en: "LDR + voltage divider",
    ar: "LDR مع مقسم جهد",
    models: ["ldr-bare", "resistor-10k"],
    key: "ldr",
    result: [
      "Light changes the LDR resistance. The divider produces a varying voltage for a compatible analog input.",
      "يغير الضوء مقاومة LDR، فينتج مقسم الجهد إشارة متغيرة لمدخل Analog مناسب.",
    ],
  },
  {
    id: "button",
    en: "Button + pull-up resistor",
    ar: "زر مع مقاومة Pull-up",
    models: ["push-button", "resistor-10k"],
    key: "push_button",
    result: [
      "The resistor sets a defined idle input state. Pressing the button changes the logic level.",
      "تحدد المقاومة حالة المدخل دون ضغط الزر، ويتغير المستوى المنطقي عند الضغط.",
    ],
  },
];
export function LearningPanel() {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const [tab, setTab] = useState("lessons");
  const [query, setQuery] = useState("");
  return (
    <View style={kit.stack}>
      <Panel tint={colors.primaryWash}>
        <AppText variant="title">{t("Understand the connection.", "افهم التوصيلة.")}</AppText>
        <AppText tone="muted">
          {t("Small circuits. Clear principles.", "دارات بسيطة، ومبادئ واضحة.")}
        </AppText>
      </Panel>
      <Chips
        value={tab}
        onChange={setTab}
        options={[
          { id: "lessons", label: t("Basics", "الأساسيات") },
          { id: "saved", label: t("Saved", "المحفوظة") },
          { id: "ai", label: t("AI assistant", "مساعد AI") },
        ]}
      />
      {tab === "ai" ? (
        <Panel>
          <AppText variant="heading">{t("Learning assistant", "مساعد التعلم")}</AppText>
          <AppText>
            {t(
              "The AI service is not connected in this local preview. Saved lessons and original documentation are available now.",
              "خدمة AI غير موصولة في المعاينة المحلية. الدروس المحفوظة والمراجع الأصلية متاحة الآن.",
            )}
          </AppText>
        </Panel>
      ) : (
        <>
          <Field
            label={t("Search lessons", "ابحث في الدروس")}
            value={query}
            onChangeText={setQuery}
          />
          {lessons
            .filter(
              (l) =>
                `${l.en} ${l.ar}`.toLowerCase().includes(query.toLowerCase()) &&
                (tab !== "saved" || state.bookmarks.includes(`${actorId}:${l.id}`)),
            )
            .map((l) => {
              const item = hardware.parts.find((p) => p.key === l.key)!;
              return (
                <Panel key={l.id}>
                  <AppText variant="heading">{t(l.en, l.ar)}</AppText>
                  <LabView
                    height={220}
                    nodes={l.models.map((model, i) => ({ model, x: i * 3 - 1.5, z: 0 }))}
                  />
                  <AppText>{t(l.result[0], l.result[1])}</AppText>
                  {item.guide.steps.map((step, i) => (
                    <AppText key={i}>
                      {i + 1}. {step}
                    </AppText>
                  ))}
                  <View style={kit.wrap}>
                    <Button
                      title={
                        state.bookmarks.includes(`${actorId}:${l.id}`)
                          ? t("Unsave", "إزالة الحفظ")
                          : t("Save lesson", "حفظ الدرس")
                      }
                      variant="soft"
                      onPress={() => act({ type: "bookmark.toggle", id: l.id })}
                    />
                    <Button
                      title={t("Original reference", "المرجع الأصلي")}
                      variant="ghost"
                      onPress={() =>
                        Linking.openURL(
                          item.guide.source ?? item.documents[0]?.url ?? "https://docs.arduino.cc/",
                        ).catch(() => {})
                      }
                    />
                  </View>
                </Panel>
              );
            })}
        </>
      )}
    </View>
  );
}
