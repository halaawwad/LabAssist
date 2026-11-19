import { MobileInput as TextInput } from "@/components/MobileInput";
import { Disclosure } from "@/components/Disclosure";
import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { MobileModal as Modal } from "@/components/MobileModal";
import { useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Check,
  CircuitBoard,
  Cpu,
  MapPin,
  Package,
  Search,
  Store,
  Wrench,
  X,
} from "lucide-react-native";
import { AppText, Button } from "@/components";
import { Chips, Field, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { useLanguage } from "@/i18n";
import {
  stores,
  storeOffers,
  workshopStock,
  stockStatus,
  storeForOffer,
  type StockItem,
  type StoreOffer,
  type LocalStore,
} from "@/domain/inventoryData";

type RequestStatus =
  "Draft" | "Pending" | "Approved" | "Ready for Pickup" | "Completed" | "Rejected" | "Cancelled";
type Request = {
  id: string;
  partId: string;
  quantity: number;
  purpose: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  note?: string;
  sample?: boolean;
};
// Ids are created when a request is saved, never during render.
const newRequestId = () => `request-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const tabs = ["Find Parts", "Workshop Stock", "Local Stores", "My Requests"];
const categories = ["All categories", ...new Set(workshopStock.map((p) => p.category))];
const statuses: RequestStatus[] = [
  "Draft",
  "Pending",
  "Approved",
  "Ready for Pickup",
  "Completed",
  "Rejected",
  "Cancelled",
];
function examples(): Request[] {
  const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
  return [
    {
      id: "example-ready",
      partId: "ultrasonic",
      quantity: 1,
      purpose: "Obstacle detection tests for the prototype.",
      status: "Ready for Pickup",
      createdAt: ago(4),
      updatedAt: ago(1),
      submittedAt: ago(4),
      note: "Example assistant note: collect from sensor drawer B03 during workshop hours.",
      sample: true,
    },
    {
      id: "example-approved",
      partId: "resale-uno",
      quantity: 1,
      purpose: "Replace the prototype controller.",
      status: "Approved",
      createdAt: ago(2),
      updatedAt: ago(1),
      submittedAt: ago(2),
      note: "Example assistant note: student resale board approved. Inspection and handover will be coordinated at the workshop.",
      sample: true,
    },
    {
      id: "example-rejected",
      partId: "servo",
      quantity: 1,
      purpose: "Test the steering mechanism.",
      status: "Rejected",
      createdAt: ago(6),
      updatedAt: ago(5),
      submittedAt: ago(6),
      note: "Example assistant note: no units available. Check local stores or request an alternative.",
      sample: true,
    },
  ];
}
const editable = (r: Request) => !r.sample && (r.status === "Draft" || r.status === "Pending");
const toneFor = (category: string) =>
  category === "Sensors"
    ? "#e8f1f7"
    : category === "Power Drivers"
      ? "#eeebf7"
      : category === "Motors & Actuators"
        ? "#f5e9ed"
        : "#edf1e6";
const money = (n: number) => `₪${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** Display labels for inventory vocabularies (stored values keep their English ids). */
const terms: Record<string, string> = {
  "Find Parts": "ابحث عن قطع",
  "Workshop Stock": "مخزون الورشة",
  "Local Stores": "المتاجر المحلية",
  "My Requests": "طلباتي",
  "All sources": "كل المصادر",
  Workshop: "الورشة",
  "Student Resale": "إعادة بيع الطلاب",
  "All cities": "كل المدن",
  "All categories": "كل الفئات",
  "Control Boards": "لوحات التحكم",
  "Electronic Parts": "قطع إلكترونية",
  "Motors & Actuators": "المحركات والمشغلات",
  "Power Drivers": "مشغلات الطاقة",
  Sensors: "الحساسات",
  Tools: "الأدوات",
  "All statuses": "كل الحالات",
  "In Stock": "متوفر",
  "Low Stock": "مخزون منخفض",
  "Out of Stock": "غير متوفر",
  "All types": "كل الأنواع",
  "For Sale": "للبيع",
  "For Use": "للاستخدام",
  New: "جديدة",
  Used: "مستعملة",
  All: "الكل",
  Active: "النشطة",
  Draft: "مسودة",
  Pending: "معلق",
  Approved: "موافق عليه",
  "Ready for Pickup": "جاهز للاستلام",
  Completed: "مكتمل",
  Rejected: "مرفوض",
  Cancelled: "ملغى",
  Example: "مثال",
  "Listed in stock": "متوفر حسب الإعلان",
  "Ask store": "اسأل المتجر",
  "Lowest listed price": "أقل سعر معلن",
  "Stores in my city": "متاجر في مدينتي",
  "In your city": "في مدينتك",
};
function useTerm() {
  const t = useCopy();
  return (value: string) => t(value, terms[value] ?? value);
}
function Tag({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  const vocab = useTerm();
  return (
    <View style={[s.tag, danger && s.tagDanger]}>
      <AppText style={[s.tagText, danger && s.dangerText]}>
        {typeof children === "string" ? vocab(children) : children}
      </AppText>
    </View>
  );
}
export function InventoryPanel() {
  const { actorId } = useWorkspace();
  return <InventoryContent key={actorId} actorId={actorId} />;
}
function InventoryContent({ actorId }: { actorId: string }) {
  const t = useCopy();
  const vocab = useTerm();
  const { formatLongDate, formatDateTime } = useLanguage();
  const [tab, setTab] = useState("Find Parts"),
    [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories"),
    [status, setStatus] = useState("All statuses"),
    [purpose, setPurpose] = useState("All types"),
    [source, setSource] = useState("All sources"),
    [city, setCity] = useState("All cities");
  const [filters, setFilters] = useState(false),
    [notice, setNotice] = useState("");
  const [requests, setRequests] = useState<Request[]>(examples),
    [loaded, setLoaded] = useState(false);
  const [requestFilter, setRequestFilter] = useState("All");
  const [sheet, setSheet] = useState<
    "request" | "details" | "receipt" | "cancel" | "compare" | "map" | null
  >(null);
  const [selectedPart, setSelectedPart] = useState<StockItem | null>(null),
    [selected, setSelected] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1"),
    [use, setUse] = useState(""),
    [error, setError] = useState("");
  const [mapStore, setMapStore] = useState<LocalStore | null>(null);
  const [comparePart, setComparePart] = useState("esp32"),
    [compareCity, setCompareCity] = useState("All cities"),
    [sort, setSort] = useState("Lowest listed price");
  const storageKey = `labassist.native.inventory.requests.${actorId}`;
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (alive) {
          const parsed = raw ? JSON.parse(raw) : null;
          setRequests(Array.isArray(parsed) ? parsed : examples());
        }
      })
      .catch(() => {
        if (alive) {
          setRequests(examples());
          setNotice(t("Saved requests could not be loaded.", "تعذر تحميل الطلبات المحفوظة."));
        }
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [storageKey, t]);
  useEffect(() => {
    if (loaded)
      AsyncStorage.setItem(storageKey, JSON.stringify(requests)).catch(() =>
        setNotice(t("Could not save requests on this device.", "تعذر حفظ الطلبات على هذا الجهاز.")),
      );
  }, [requests, loaded, storageKey, t]);
  const term = query.trim().toLowerCase();
  const filtered = workshopStock.filter(
    (item) =>
      (source === "All sources" || (item.source || "Workshop") === source) &&
      `${item.name} ${item.arabic} ${item.detail}`.toLowerCase().includes(term) &&
      (category === "All categories" || item.category === category) &&
      (status === "All statuses" || stockStatus(item) === status) &&
      (purpose === "All types" || item.purpose === purpose),
  );
  const matchingOffers = storeOffers.filter((offer) => {
    const part = workshopStock.find((p) => p.id === offer.id)!;
    return (
      `${offer.name} ${offer.note} ${part.arabic} ${part.name}`.toLowerCase().includes(term) &&
      (category === "All categories" || part.category === category) &&
      (purpose === "All types" || purpose === "For Sale") &&
      status === "All statuses"
    );
  });
  const own = requests.filter((r) => !r.sample);
  const actual = requests.find((r) => r.id === selected);
  const activePart = workshopStock.find((p) => p.id === actual?.partId);
  const visibleRequests = requests.filter(
    (r) =>
      (requestFilter === "All" ||
        (requestFilter === "Active" &&
          ["Pending", "Approved", "Ready for Pickup"].includes(r.status)) ||
        r.status === requestFilter) &&
      `${workshopStock.find((p) => p.id === r.partId)?.name} ${r.purpose}`
        .toLowerCase()
        .includes(term),
  );
  const storeList = stores.filter(
    (store) =>
      (city === "All cities" || city === store.city) &&
      (`${store.name} ${store.city} ${store.address}`.toLowerCase().includes(term) ||
        matchingOffers.some((o) => o.storeId === store.id)),
  );
  const groups = workshopStock
    .map((part) => ({
      part,
      offers: storeOffers.filter(
        (o) => o.id === part.id && (city === "All cities" || storeForOffer(o).city === city),
      ),
    }))
    .filter(
      ({ part, offers }) =>
        offers.length &&
        `${part.name} ${part.arabic} ${offers.map((o) => `${o.name} ${storeForOffer(o).name} ${storeForOffer(o).city}`).join(" ")}`
          .toLowerCase()
          .includes(term),
    );
  function reset() {
    setQuery("");
    setCategory("All categories");
    setStatus("All statuses");
    setPurpose("All types");
    setSource("All sources");
    setCity("All cities");
  }
  function switchTab(value: string) {
    setTab(value);
    setCategory("All categories");
    setStatus("All statuses");
    setPurpose("All types");
  }
  function open(url: string) {
    Linking.openURL(url).catch(() => setNotice(t("Could not open this link.", "تعذر فتح الرابط.")));
  }
  function showMap(store: LocalStore) {
    setMapStore(store);
    setSheet("map");
  }
  function request(part: StockItem, original?: Request) {
    setSelectedPart(part);
    setSelected(original?.id ?? null);
    setQuantity(String(original?.quantity ?? 1));
    setUse(original?.purpose ?? "");
    setError("");
    setSheet("request");
  }
  function save(nextStatus: "Draft" | "Pending") {
    if (!loaded || !selectedPart || (actual && !editable(actual))) return;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > selectedPart.quantity)
      return setError(
        t(
          `Choose a whole quantity between 1 and ${selectedPart.quantity}.`,
          `اختر كمية صحيحة بين 1 و${selectedPart.quantity}.`,
        ),
      );
    if (!use.trim())
      return setError(
        t("Add a short description of what you need this part for.", "اكتب سبب حاجتك لهذه القطعة."),
      );
    const at = new Date().toISOString();
    const next: Request = {
      id: actual?.id ?? newRequestId(),
      partId: selectedPart.id,
      quantity: qty,
      purpose: use.trim(),
      status: nextStatus,
      createdAt: actual?.createdAt ?? at,
      updatedAt: at,
      ...(nextStatus === "Pending" ? { submittedAt: actual?.submittedAt ?? at } : {}),
    };
    setRequests((items) =>
      actual ? items.map((r) => (r.id === actual.id ? next : r)) : [next, ...items],
    );
    setSelected(next.id);
    setQuery("");
    setTab("My Requests");
    setRequestFilter(nextStatus);
    setNotice(
      nextStatus === "Draft"
        ? t("Request saved as a draft.", "تم حفظ مسودة الطلب.")
        : t(
            "Request saved as Pending in this preview.",
            "تم حفظ الطلب بانتظار المراجعة في المعاينة.",
          ),
    );
    setSheet(nextStatus === "Pending" ? "receipt" : null);
  }
  function OfferCard({ offer, min }: { offer: StoreOffer; min?: number }) {
    const store = storeForOffer(offer),
      out = offer.availability === "Out of Stock";
    return (
      <View style={[s.offer, out && s.out]}>
        <View style={s.between}>
          <View style={s.grow}>
            <AppText weight="bold" style={s.name}>
              {store.name}
            </AppText>
            <AppText style={s.meta}>{store.city}</AppText>
          </View>
          <AppText style={s.price}>
            {offer.price === null ? t("Ask for price", "اسأل عن السعر") : money(offer.price)}
          </AppText>
        </View>
        {min !== undefined && offer.price !== null && (
          <AppText style={s.difference}>
            {offer.price === min
              ? out
                ? t("Lowest listing · unavailable", "أقل سعر · غير متوفر")
                : t("Lowest listed · compare variant", "أقل سعر معلن · قارن الطراز")
              : `+${money(offer.price - min)} ${t("vs lowest listing", "عن أقل سعر")}`}
          </AppText>
        )}
        <Tag danger={out}>{offer.availability}</Tag>
        <AppText weight="semibold" style={s.name}>
          {offer.name}
        </AppText>
        <AppText style={s.copy}>{offer.note}</AppText>
        <AppText style={s.meta}>
          {t(
            "Condition: ask store · Check included accessories",
            "الحالة: اسأل المتجر · تحقق من الملحقات المرفقة",
          )}
        </AppText>
        <AppText style={s.meta}>
          {t("Checked", "تم التحقق")} {offer.checked} · {t("Shipping excluded", "غير شامل الشحن")}
        </AppText>
        <View style={s.actions}>
          <Button
            title={t("Map", "الخريطة")}
            variant="soft"
            size="sm"
            onPress={() => showMap(store)}
          />
          <Button
            title={t("Call store", "اتصل بالمحل")}
            variant="ghost"
            size="sm"
            onPress={() => open(`tel:${store.phone}`)}
          />
          <Button
            title={t("Source ↗", "المصدر ↗")}
            variant="ghost"
            size="sm"
            onPress={() => open(offer.url)}
          />
        </View>
      </View>
    );
  }
  const comparisons = storeOffers
    .filter((o) => o.id === comparePart)
    .sort((a, b) => {
      if (sort === "Stores in my city" && compareCity !== "All cities") {
        const diff =
          Number(storeForOffer(b).city === compareCity) -
          Number(storeForOffer(a).city === compareCity);
        if (diff) return diff;
      }
      return (a.price ?? Infinity) - (b.price ?? Infinity);
    });
  const prices = comparisons.flatMap((o) => (o.price === null ? [] : [o.price]));
  return (
    <View style={s.page}>
      <View style={s.between}>
        <View style={s.grow}>
          <AppText variant="caption" tone="muted">
            {t("Find your next part", "ابحث عن قطعتك التالية")}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Open My Requests", "فتح طلباتي")}
          onPress={() => setTab("My Requests")}
          style={s.requestBadge}
        >
          <Package color="#526443" size={16} />
          <AppText style={s.badgeNumber}>
            {own.filter((r) => r.status !== "Cancelled").length}
          </AppText>
        </Pressable>
      </View>
      {tab !== "My Requests" && (
        <Disclosure
          title={t(
            "Inventory overview",
            "\u0646\u0638\u0631\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u062e\u0632\u0648\u0646",
          )}
        >
          <View style={s.hero}>
            <AppText style={s.kicker}>
              {t("FROM THE SHELF TO YOUR NEXT BUILD", "من الرف إلى مشروعك القادم")}
            </AppText>
            <AppText style={s.heroTitle}>{t("Good parts.", "قطع جيدة.")}</AppText>
            <AppText style={[s.heroTitle, s.heroAccent]}>
              {t("More possibilities.", "إمكانيات أكثر.")}
            </AppText>
            <AppText style={s.heroCopy}>
              {t(
                "Explore the workshop, discover local stores, and find the right fit for your project.",
                "استكشف قطع الورشة والمحلات القريبة، واعثر على ما يناسب مشروعك.",
              )}
            </AppText>
            <View style={s.stats}>
              {[
                [
                  String(workshopStock.filter((p) => p.quantity > 0).length),
                  t("Available parts", "قطع متوفرة"),
                ],
                [String(stores.length), t("Local stores", "محلات محلية")],
                ["₪", t("Prices in ILS", "الأسعار بالشيكل")],
              ].map(([n, label]) => (
                <View style={s.stat} key={label}>
                  <AppText style={s.statValue}>{n}</AppText>
                  <AppText style={s.statLabel}>{label}</AppText>
                </View>
              ))}
            </View>
          </View>
        </Disclosure>
      )}
      <View style={s.search}>
        <Search size={18} color="#819277" />
        <TextInput
          accessibilityLabel={t("Search inventory", "البحث في المخزون")}
          placeholder={
            tab === "My Requests"
              ? t("Search your requested parts…", "ابحث في القطع التي طلبتها…")
              : t("Search a component or store…", "ابحث عن قطعة أو متجر…")
          }
          value={query}
          onChangeText={setQuery}
          placeholderTextColor="#8a9584"
          style={s.searchInput}
        />
        {!!query && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Clear search", "مسح البحث")}
            onPress={() => setQuery("")}
          >
            <X size={18} color="#657459" />
          </Pressable>
        )}
      </View>
      {!!query && (
        <AppText style={s.meta}>
          {t("Searching for", "البحث عن")} “{query}” ·{" "}
          {t("kept across tabs", "يبقى عند تبديل الأقسام")}
        </AppText>
      )}
      <View style={s.tabs}>
        {tabs.map((value) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            key={value}
            onPress={() => switchTab(value)}
            style={[s.tab, tab === value && s.activeTab]}
          >
            <AppText style={[s.tabLabel, tab === value && s.activeTabLabel]}>
              {vocab(value)}
            </AppText>
          </Pressable>
        ))}
      </View>
      {notice !== "" && (
        <View accessibilityRole="alert" style={s.notice}>
          <AppText style={[s.copy, s.grow]}>{notice}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Dismiss notice", "إخفاء الإشعار")}
            onPress={() => setNotice("")}
          >
            <X size={16} color="#526443" />
          </Pressable>
        </View>
      )}
      {tab !== "My Requests" ? (
        <>
          <View style={s.between}>
            <View style={s.grow}>
              <AppText style={s.sectionTitle}>
                {tab === "Find Parts"
                  ? t("One part. Every available option.", "قطعة واحدة. كل الخيارات المتاحة.")
                  : tab === "Workshop Stock"
                    ? t("On the workshop shelf", "على رف الورشة")
                    : t("A little closer to your next component", "أقرب قليلًا إلى قطعتك القادمة")}
              </AppText>
              <AppText style={s.copy}>
                {tab === "Find Parts"
                  ? t(
                      "Workshop stock and published store offers together.",
                      "مخزون الورشة وعروض المتاجر المنشورة معًا.",
                    )
                  : tab === "Workshop Stock"
                    ? t(
                        "New and used components · Student view only",
                        "قطع جديدة ومستعملة · عرض الطالب فقط",
                      )
                    : t(
                        "Palestinian stores · Published contact details",
                        "متاجر فلسطينية · بيانات تواصل منشورة",
                      )}
              </AppText>
            </View>
          </View>
          <Disclosure title={t("Filters & comparison", "التصفية والمقارنة")}>
            <View style={s.actions}>
              <Button
                title={t("Compare prices ↗", "قارن الأسعار ↗")}
                variant="soft"
                size="sm"
                onPress={() => setSheet("compare")}
              />
              <Button
                title={t("Filters", "الفلاتر")}
                variant="ghost"
                size="sm"
                onPress={() => setFilters(!filters)}
              />
              <Button title={t("Reset", "إعادة تعيين")} variant="ghost" size="sm" onPress={reset} />
            </View>
            {filters && (
              <View style={s.filterPanel}>
                {tab === "Local Stores" ? (
                  <>
                    <AppText style={s.filterLabel}>{t("City", "المدينة")}</AppText>
                    <Chips
                      options={["All cities", ...new Set(stores.map((p) => p.city))].map((v) => ({
                        id: v,
                        label: vocab(v),
                      }))}
                      value={city}
                      onChange={setCity}
                    />
                  </>
                ) : (
                  <>
                    <AppText style={s.filterLabel}>{t("Category", "الفئة")}</AppText>
                    <Chips
                      options={categories.map((v) => ({ id: v, label: vocab(v) }))}
                      value={category}
                      onChange={setCategory}
                    />
                    <AppText style={s.filterLabel}>{t("Stock status", "حالة المخزون")}</AppText>
                    <Chips
                      options={["All statuses", "In Stock", "Low Stock", "Out of Stock"].map(
                        (v) => ({
                          id: v,
                          label: vocab(v),
                        }),
                      )}
                      value={status}
                      onChange={setStatus}
                    />
                    <AppText style={s.filterLabel}>{t("Availability type", "نوع التوفر")}</AppText>
                    <Chips
                      options={["All types", "For Sale", "For Use"].map((v) => ({
                        id: v,
                        label: vocab(v),
                      }))}
                      value={purpose}
                      onChange={setPurpose}
                    />
                  </>
                )}
              </View>
            )}
          </Disclosure>
          {tab !== "Local Stores" ? (
            <>
              <Chips
                options={["All sources", "Workshop", "Student Resale"].map((v) => ({
                  id: v,
                  label: `${vocab(v)}  ${workshopStock.filter((p) => v === "All sources" || (p.source || "Workshop") === v).length}`,
                }))}
                value={source}
                onChange={setSource}
              />
              {source === "Student Resale" && (
                <View style={s.resale}>
                  <Package color="#8c719e" size={23} />
                  <View style={s.grow}>
                    <AppText weight="bold" style={s.name}>
                      {t("Give good parts another project.", "امنح القطع الجيدة مشروعًا آخر.")}
                    </AppText>
                    <AppText style={s.copy}>
                      {t(
                        "Components from previous students, listed through the workshop assistant. Check condition and inspection notes before requesting.",
                        "قطع من طلاب سابقين، معروضة عبر مساعد الورشة. تحقق من الحالة وملاحظات الفحص قبل الطلب.",
                      )}
                    </AppText>
                    <AppText style={s.meta}>{t("Preview listings", "معاينة العروض")}</AppText>
                  </View>
                </View>
              )}

              {filtered.map((item) => (
                <View
                  style={[
                    s.stockCard,
                    {
                      borderTopColor:
                        item.category === "Sensors"
                          ? "#aac8dc"
                          : item.category === "Power Drivers"
                            ? "#c7b8da"
                            : item.category === "Motors & Actuators"
                              ? "#d9b6c3"
                              : "#b9c9a8",
                    },
                  ]}
                  key={item.id}
                >
                  <View style={s.between}>
                    <View style={[s.partIcon, { backgroundColor: toneFor(item.category) }]}>
                      {item.category === "Control Boards" ? (
                        <Cpu color="#657c51" />
                      ) : item.category === "Tools" ? (
                        <Wrench color="#657c51" />
                      ) : (
                        <CircuitBoard color="#657c51" />
                      )}
                    </View>
                    <Tag danger={item.quantity === 0}>{stockStatus(item)}</Tag>
                  </View>
                  <AppText style={s.meta}>
                    {vocab(item.source || "Workshop")} · {vocab(item.category)}
                  </AppText>
                  <AppText style={s.partTitle}>{item.name}</AppText>
                  <AppText style={s.copy}>{item.detail}</AppText>
                  <View style={s.actions}>
                    <Tag>{item.condition}</Tag>
                    <Tag>{item.purpose}</Tag>
                    {item.source && <Tag>{t("Student Resale", "إعادة بيع الطلاب")}</Tag>}
                  </View>
                  {item.source && (
                    <View
                      style={[s.inspection, item.inspection !== "Tested" && s.inspectionPending]}
                    >
                      <AppText weight="semibold" style={s.name}>
                        {item.inspection === "Tested"
                          ? t("Tested · sample inspection", "تم الفحص · فحص تجريبي")
                          : t("Inspection pending · sample", "بانتظار الفحص · تجريبي")}
                      </AppText>
                      <AppText style={s.copy}>{item.resaleNote}</AppText>
                    </View>
                  )}
                  <View style={s.stockMeta}>
                    <View>
                      <AppText style={s.quantity}>{item.quantity}</AppText>
                      <AppText style={s.meta}>{t("Available quantity", "الكمية المتاحة")}</AppText>
                    </View>
                    <View style={s.location}>
                      <MapPin size={14} color="#7a8c69" />
                      <AppText style={s.copy}>{item.location}</AppText>
                    </View>
                  </View>
                  <View style={s.stockFooter}>
                    <View style={s.grow}>
                      <AppText style={s.price}>
                        {item.price === undefined
                          ? t("Workshop use", "للاستخدام في الورشة")
                          : money(item.price)}
                      </AppText>
                      {item.price !== undefined && (
                        <AppText style={s.meta}>
                          {t("/ unit · sample", "/ للقطعة · تجريبي")}
                        </AppText>
                      )}
                    </View>
                    <Button
                      title={
                        item.quantity
                          ? t("Request Part", "طلب القطعة")
                          : t("Unavailable", "غير متوفرة")
                      }
                      accessibilityLabel={`${t("Request", "طلب")} ${item.name}`}
                      disabled={!item.quantity || !loaded}
                      size="sm"
                      onPress={() => request(item)}
                    />
                  </View>
                </View>
              ))}
              {tab === "Find Parts" &&
                source === "All sources" &&
                matchingOffers.map((offer) => (
                  <View key={offer.offerId} style={s.storeOfferWrap}>
                    <OfferCard offer={offer} />
                    <Button
                      title={t("Compare this part", "قارن هذه القطعة")}
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setQuery(workshopStock.find((p) => p.id === offer.id)!.name);
                        setCategory("All categories");
                        setPurpose("All types");
                        setStatus("All statuses");
                      }}
                    />
                  </View>
                ))}
              {!filtered.length &&
                !(tab === "Find Parts" && source === "All sources" && matchingOffers.length) && (
                  <View style={s.empty}>
                    <Package color="#8c9b7a" size={32} />
                    <AppText weight="bold">{t("No matching parts", "لا توجد قطع مطابقة")}</AppText>
                    <Button
                      title={t("Clear filters", "مسح التصفية")}
                      variant="soft"
                      onPress={reset}
                    />
                  </View>
                )}
            </>
          ) : (
            <>
              <View style={s.compareIntro}>
                <AppText style={s.kicker}>{t("COMPARE BEFORE YOU BUY", "قارن قبل الشراء")}</AppText>
                <AppText style={s.sectionTitle}>
                  {t("One component. Different stores.", "قطعة واحدة. متاجر مختلفة.")}
                </AppText>
                <AppText style={s.copy}>
                  {t(
                    "Prices, availability and location — together, where you can compare them.",
                    "الأسعار والتوفر والموقع — معًا لتقارن بينها.",
                  )}
                </AppText>
                <AppText style={s.meta}>
                  {t(
                    "Sources checked · 15–16 Oct 2026 · Confirm current prices",
                    "تم التحقق من المصادر · 15–16 أكتوبر 2026 · تأكد من الأسعار الحالية",
                  )}
                </AppText>
                {!term && (
                  <Chips
                    options={["ESP32", "Arduino", "XL4015"].map((v) => ({ id: v, label: v }))}
                    value=""
                    onChange={setQuery}
                  />
                )}
              </View>
              {groups.map(({ part, offers }) => {
                const priced = offers.flatMap((o) => (o.price === null ? [] : [o.price])),
                  min = priced.length ? Math.min(...priced) : undefined,
                  max = priced.length ? Math.max(...priced) : undefined;
                return (
                  <View key={part.id} style={s.comparisonGroup}>
                    <AppText style={s.partTitle}>{part.name}</AppText>
                    <AppText style={s.meta}>
                      {new Set(offers.map((o) => o.storeId)).size}{" "}
                      {t(
                        "stores · Compare exact variants below",
                        "متاجر · قارن الطرازات المحددة أدناه",
                      )}
                    </AppText>
                    {min !== undefined && max !== undefined && (
                      <View style={s.range}>
                        <AppText weight="bold">
                          {min === max ? money(min) : `${money(min)} – ${money(max)}`}
                        </AppText>
                        <AppText style={s.copy}>
                          {max > min
                            ? `${money(max - min)} ${t("difference across listed variants", "فرق بين الطرازات المعلنة")}`
                            : t("One published price", "سعر منشور واحد")}
                        </AppText>
                      </View>
                    )}
                    {[...offers]
                      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
                      .map((o) => (
                        <OfferCard key={o.offerId} offer={o} min={min} />
                      ))}
                    {priced.length > 1 && (
                      <AppText style={s.caveat}>
                        {offers.some((o) => o.availability === "Out of Stock")
                          ? t(
                              "The cheaper listing is out of stock, and board versions may differ. This is not a like-for-like saving.",
                              "العرض الأرخص غير متوفر، وقد تختلف نسخ اللوحة. هذا ليس توفيرًا مكافئًا.",
                            )
                          : t(
                              "Prices cover different variants. Confirm the USB chip, accessories and condition.",
                              "الأسعار لطرازات مختلفة. تأكد من شريحة USB والملحقات والحالة.",
                            )}
                      </AppText>
                    )}
                  </View>
                );
              })}
              {!groups.length && (
                <AppText style={s.copy}>
                  {t("No store listings for this search.", "لا توجد عروض متاجر لهذا البحث.")}
                </AppText>
              )}
              <AppText style={s.sectionTitle}>{t("Store directory", "دليل المتاجر")}</AppText>
              {storeList.map((store) => (
                <View style={s.stockCard} key={store.id}>
                  <View style={s.between}>
                    <View
                      style={[
                        s.partIcon,
                        {
                          backgroundColor:
                            store.tone === "blue"
                              ? "#e2edf6"
                              : store.tone === "rose"
                                ? "#f2e5eb"
                                : "#ece7f4",
                        },
                      ]}
                    >
                      <AppText weight="bold">{store.initials}</AppText>
                    </View>
                    <Store size={23} color="#8b9a7b" />
                  </View>
                  <AppText style={s.meta}>
                    {store.city} · {t("Palestine", "فلسطين")}
                  </AppText>
                  <AppText style={s.partTitle}>{store.name}</AppText>
                  <AppText style={s.copy}>{store.address}</AppText>
                  <AppText style={s.meta}>{store.note}</AppText>
                  <View style={s.actions}>
                    <Button
                      title={t("View map", "عرض الخريطة")}
                      size="sm"
                      variant="soft"
                      onPress={() => showMap(store)}
                    />
                    <Button
                      title={t("Call store", "الاتصال بالمتجر")}
                      size="sm"
                      variant="ghost"
                      onPress={() => open(`tel:${store.phone}`)}
                    />
                    <Button
                      title={t("Website ↗", "الموقع ↗")}
                      size="sm"
                      variant="ghost"
                      onPress={() => open(store.website)}
                    />
                  </View>
                  <AppText style={s.phone} onPress={() => open(`tel:${store.phone}`)}>
                    {store.phone}
                  </AppText>
                </View>
              ))}
              {!storeList.length && (
                <Button
                  title={t("No stores match · Clear filters", "لا توجد متاجر مطابقة · مسح التصفية")}
                  variant="soft"
                  onPress={reset}
                />
              )}
            </>
          )}
        </>
      ) : (
        <>
          <View style={s.requestHero}>
            <AppText style={s.kicker}>
              {t("FROM YOUR REQUEST TO YOUR WORKBENCH", "من طلبك إلى طاولة عملك")}
            </AppText>
            <AppText style={s.sectionTitle}>{t("My Requests", "طلباتي")}</AppText>
            <AppText style={s.copy}>
              {t(
                "Workshop stock and student resale, followed in one place.",
                "مخزون الورشة وإعادة بيع الطلاب، تتابعها في مكان واحد.",
              )}
            </AppText>
            <View style={s.stats}>
              <Pressable
                style={s.stat}
                onPress={() => setRequestFilter("Draft")}
                accessibilityRole="button"
                accessibilityLabel={t("Your drafts", "مسوداتك")}
              >
                <AppText style={s.statValue}>
                  {own.filter((r) => r.status === "Draft").length}
                </AppText>
                <AppText style={s.statLabel}>{t("Your drafts", "مسوداتك")}</AppText>
              </Pressable>
              <Pressable
                style={s.stat}
                onPress={() => setRequestFilter("Active")}
                accessibilityRole="button"
                accessibilityLabel={t("Your active requests", "طلباتك النشطة")}
              >
                <AppText style={s.statValue}>
                  {
                    own.filter((r) =>
                      ["Pending", "Approved", "Ready for Pickup"].includes(r.status),
                    ).length
                  }
                </AppText>
                <AppText style={s.statLabel}>{t("Active requests", "الطلبات النشطة")}</AppText>
              </Pressable>
            </View>
            <AppText style={s.copy}>
              {t(
                "Follow the handover: Approval → Ready → Pickup",
                "تابع التسليم: الموافقة ← الجاهزية ← الاستلام",
              )}
            </AppText>
            <Button
              title={t("Browse parts", "تصفح القطع")}
              variant="soft"
              size="sm"
              onPress={() => switchTab("Workshop Stock")}
            />
          </View>
          <Chips
            value={requestFilter}
            onChange={setRequestFilter}
            options={["All", "Active", ...statuses].map((v) => ({ id: v, label: vocab(v) }))}
          />
          {visibleRequests.map((r) => {
            const part = workshopStock.find((p) => p.id === r.partId);
            if (!part) return null;
            return (
              <View style={s.stockCard} key={r.id}>
                <View style={s.actions}>
                  <Tag danger={r.status === "Rejected" || r.status === "Cancelled"}>{r.status}</Tag>
                  {r.sample && <Tag>{t("Example", "مثال")}</Tag>}
                  <Tag>{part.source || "Workshop"}</Tag>
                </View>
                <AppText style={s.partTitle}>{part.name}</AppText>
                <AppText style={s.copy}>{r.purpose}</AppText>
                <AppText style={s.meta}>
                  {t("Qty", "الكمية")} {r.quantity} · {vocab(part.condition)} ·{" "}
                  {r.submittedAt ? t("Requested", "طُلبت") : t("Saved", "حُفظت")}{" "}
                  {formatLongDate(r.submittedAt || r.createdAt)}
                </AppText>
                {r.note && <AppText style={s.note}>{r.note}</AppText>}
                <AppText style={s.price}>
                  {part.price === undefined
                    ? t("For workshop use", "للاستخدام في الورشة")
                    : money(part.price * r.quantity)}
                </AppText>
                <View style={s.actions}>
                  <Button
                    title={t("View details", "عرض التفاصيل")}
                    variant="soft"
                    size="sm"
                    onPress={() => {
                      setSelected(r.id);
                      setSheet("details");
                    }}
                  />
                  {editable(r) && (
                    <Button
                      title={
                        r.status === "Draft"
                          ? t("Continue draft", "متابعة المسودة")
                          : t("Edit request", "تعديل الطلب")
                      }
                      size="sm"
                      variant="ghost"
                      onPress={() => request(part, r)}
                    />
                  )}
                </View>
              </View>
            );
          })}
          {!visibleRequests.length && (
            <View style={s.empty}>
              <Package size={32} color="#82956e" />
              <AppText weight="bold">{t("No requests here yet", "لا توجد طلبات هنا بعد")}</AppText>
              <AppText style={s.copy}>
                {t(
                  "Choose a workshop part to start a request, or try another filter.",
                  "اختر قطعة من الورشة لبدء طلب، أو جرّب تصفية أخرى.",
                )}
              </AppText>
              <Button
                title={t("Show all requests", "عرض كل الطلبات")}
                variant="soft"
                onPress={() => {
                  setQuery("");
                  setRequestFilter("All");
                }}
              />
            </View>
          )}
        </>
      )}
      <Modal
        visible={sheet !== null}
        animationType="slide"
        onRequestClose={() => setSheet(null)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <AppText style={s.sectionTitle}>
              {sheet === "request"
                ? actual
                  ? t("Edit part request", "تعديل طلب القطعة")
                  : t("Request a part", "طلب قطعة")
                : sheet === "compare"
                  ? t("Compare prices", "مقارنة الأسعار")
                  : sheet === "map"
                    ? t("Store location", "موقع المتجر")
                    : sheet === "receipt"
                      ? t("Request summary", "ملخص الطلب")
                      : sheet === "cancel"
                        ? t("Cancel this request?", "إلغاء هذا الطلب؟")
                        : t("Request details", "تفاصيل الطلب")}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Close inventory dialog", "إغلاق")}
              onPress={() => setSheet(null)}
              style={s.close}
            >
              <X size={23} color="#526443" />
            </Pressable>
          </View>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode="on-drag"
            contentContainerStyle={s.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {sheet === "request" && selectedPart && (
              <>
                <View style={s.inspection}>
                  <AppText style={s.partTitle}>{selectedPart.name}</AppText>
                  <AppText style={s.copy}>
                    {selectedPart.source || "Workshop"} · {selectedPart.condition}
                  </AppText>
                  <AppText style={s.copy}>
                    {selectedPart.location} · {selectedPart.quantity} {t("available", "متاح")}
                  </AppText>
                </View>
                <Field
                  label={t("Quantity", "الكمية")}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                />
                <Field
                  label={t("What will you use it for?", "فيمَ ستستخدمها؟")}
                  value={use}
                  onChangeText={setUse}
                  multiline
                  maxLength={1000}
                  placeholder={t(
                    "For example: testing obstacle detection on our prototype…",
                    "مثال: اختبار كشف العوائق في نموذجنا…",
                  )}
                />
                {selectedPart.source && (
                  <AppText style={s.copy}>
                    {t(
                      "Student resale · The assistant coordinates inspection, availability and handover.",
                      "إعادة بيع الطلاب · ينسّق المساعد الفحص والتوفر والتسليم.",
                    )}
                  </AppText>
                )}
                {selectedPart.price !== undefined && (
                  <View style={s.range}>
                    <AppText style={s.copy}>
                      {t("Estimated total · Sample price", "الإجمالي التقديري · سعر تجريبي")}
                    </AppText>
                    <AppText style={s.price}>
                      {money(
                        selectedPart.price *
                          (Number.isFinite(Number(quantity)) ? Number(quantity) : 0),
                      )}
                    </AppText>
                  </View>
                )}
                {!!error && (
                  <AppText accessibilityRole="alert" style={s.dangerText}>
                    {error}
                  </AppText>
                )}
              </>
            )}
            {(sheet === "details" || sheet === "receipt") && actual && activePart && (
              <>
                {sheet === "receipt" && <Check size={42} color="#6e8b53" />}
                <AppText style={s.partTitle}>{activePart.name}</AppText>
                <Tag>{actual.status}</Tag>
                <AppText style={s.copy}>
                  {vocab(activePart.source || "Workshop")} · {vocab(activePart.condition)}
                </AppText>
                {sheet === "details" && (
                  <View style={s.steps}>
                    {["Pending", "Approved", "Ready for Pickup", "Completed"].map((step, i) => (
                      <View
                        key={step}
                        style={[
                          s.step,
                          i <=
                            ["Pending", "Approved", "Ready for Pickup", "Completed"].indexOf(
                              actual.status,
                            ) && s.stepDone,
                        ]}
                      >
                        <AppText style={s.meta}>
                          {i + 1} · {vocab(step)}
                        </AppText>
                      </View>
                    ))}
                  </View>
                )}
                <View style={s.detailsBox}>
                  <AppText style={s.copy}>
                    {t("Quantity:", "الكمية:")} {actual.quantity}
                  </AppText>
                  <AppText style={s.copy}>
                    {t("Unit price:", "سعر الوحدة:")}{" "}
                    {activePart.price === undefined
                      ? t("Workshop use", "للاستخدام في الورشة")
                      : money(activePart.price)}
                  </AppText>
                  <AppText weight="bold">
                    {t("Estimated total:", "الإجمالي التقديري:")}{" "}
                    {activePart.price === undefined
                      ? t("Workshop use", "للاستخدام في الورشة")
                      : money(activePart.price * actual.quantity)}
                  </AppText>
                  <AppText style={s.copy}>
                    {t("Workshop location:", "الموقع في الورشة:")} {activePart.location}
                  </AppText>
                  <AppText style={s.meta}>
                    {t("Updated", "آخر تحديث")} {formatDateTime(actual.updatedAt)}
                  </AppText>
                </View>
                <AppText weight="bold">{t("Purpose", "الغرض")}</AppText>
                <AppText style={s.copy}>{actual.purpose}</AppText>
                {actual.note && (
                  <View style={s.inspection}>
                    <AppText weight="bold">{t("Workshop assistant", "مساعد الورشة")}</AppText>
                    <AppText style={s.copy}>{actual.note}</AppText>
                  </View>
                )}
                {actual.status === "Draft" && (
                  <AppText style={s.meta}>
                    {t("This draft has not been sent.", "لم تُرسل هذه المسودة بعد.")}
                  </AppText>
                )}
                {sheet === "receipt" ? (
                  <Button
                    title={t("Track request", "متابعة الطلب")}
                    onPress={() => {
                      setRequestFilter("All");
                      setSheet("details");
                    }}
                  />
                ) : (
                  editable(actual) && (
                    <View style={s.actions}>
                      <Button
                        title={actual.status === "Draft" ? "Continue draft" : "Edit request"}
                        variant="soft"
                        onPress={() => request(activePart, actual)}
                      />
                      <Button
                        title={t("Cancel request", "إلغاء الطلب")}
                        variant="ghost"
                        onPress={() => setSheet("cancel")}
                      />
                    </View>
                  )
                )}
              </>
            )}
            {sheet === "cancel" && actual && (
              <>
                <AppText style={s.copy}>
                  {t(
                    "The request will stay in your history as Cancelled.",
                    "سيبقى الطلب في سجلك كملغى.",
                  )}
                </AppText>
                <Button
                  title={t("Keep request", "الإبقاء على الطلب")}
                  variant="soft"
                  onPress={() => setSheet("details")}
                />
                <Button
                  title={t("Confirm cancellation", "تأكيد الإلغاء")}
                  variant="danger"
                  onPress={() => {
                    setRequests((items) =>
                      items.map((r) =>
                        r.id === actual.id && editable(r)
                          ? { ...r, status: "Cancelled", updatedAt: new Date().toISOString() }
                          : r,
                      ),
                    );
                    setSheet(null);
                    setNotice(t("Request cancelled.", "تم إلغاء الطلب."));
                  }}
                />
              </>
            )}
            {sheet === "map" && mapStore && (
              <>
                <View style={s.mapArt}>
                  <MapPin color="#6e87a6" size={56} />
                  <AppText style={s.sectionTitle}>{mapStore.city}</AppText>
                </View>
                <AppText style={s.partTitle}>{mapStore.name}</AppText>
                <AppText style={s.copy}>{mapStore.address}</AppText>
                <AppText style={s.meta}>{mapStore.note}</AppText>
                <Button
                  title={t("Open in maps ↗", "فتح في الخرائط ↗")}
                  onPress={() =>
                    open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapStore.name + " " + mapStore.address)}`,
                    )
                  }
                />
                <Button
                  title={`${t("Call", "اتصال")} ${mapStore.phone}`}
                  variant="soft"
                  onPress={() => open(`tel:${mapStore.phone}`)}
                />
                <Button
                  title={t("Website ↗", "الموقع ↗")}
                  variant="ghost"
                  onPress={() => open(mapStore.website)}
                />
              </>
            )}
            {sheet === "compare" && (
              <>
                <AppText style={s.filterLabel}>{t("Component", "القطعة")}</AppText>
                <Chips
                  value={comparePart}
                  onChange={setComparePart}
                  options={workshopStock
                    .filter((p) => storeOffers.some((o) => o.id === p.id))
                    .map((p) => ({ id: p.id, label: p.name }))}
                />
                <AppText style={s.filterLabel}>{t("Your city", "مدينتك")}</AppText>
                <Chips
                  value={compareCity}
                  onChange={setCompareCity}
                  options={[
                    "All cities",
                    ...new Set(stores.map((p) => p.city)),
                    "Ramallah",
                    "Hebron",
                    "Tulkarm",
                    "Qalqilya",
                  ].map((v) => ({ id: v, label: v === "All cities" ? t("All cities", "كل المدن") : v }))}
                />
                <AppText style={s.filterLabel}>{t("Show first", "اعرض أولًا")}</AppText>
                <Chips
                  value={sort}
                  onChange={setSort}
                  options={["Lowest listed price", "Stores in my city"].map((v) => ({
                    id: v,
                    label:
                      v === "Lowest listed price"
                        ? t("Lowest listed price", "أقل سعر معلن")
                        : t("Stores in my city", "متاجر في مدينتي"),
                  }))}
                />
                {prices.length > 1 && (
                  <View style={s.range}>
                    <AppText weight="bold">
                      {money(Math.max(...prices) - Math.min(...prices))}{" "}
                      {t("price spread", "فرق الأسعار")}
                    </AppText>
                    <AppText style={s.copy}>
                      {t(
                        "Across listed variants · Shipping excluded",
                        "عبر الطرازات المعلنة · غير شامل الشحن",
                      )}
                    </AppText>
                  </View>
                )}
                <AppText style={s.caveat}>
                  {t(
                    "Compare the exact model, condition and included accessories. Out-of-stock prices remain visible; they are not available offers. City matching does not measure travel distance.",
                    "قارن الطراز والحالة والملحقات المرفقة. تبقى أسعار المنتجات غير المتوفرة ظاهرة لكنها ليست عروضًا متاحة. تطابق المدينة لا يقيس مسافة السفر.",
                  )}
                </AppText>
                {comparisons.map((o) => (
                  <View key={o.offerId}>
                    {compareCity === storeForOffer(o).city && (
                      <Tag>{t("In your city", "في مدينتك")}</Tag>
                    )}
                    <OfferCard offer={o} min={prices.length ? Math.min(...prices) : undefined} />
                  </View>
                ))}
                <AppText style={s.meta}>
                  {t(
                    "Workshop prices are sample data and are excluded from real-store price rankings.",
                    "أسعار الورشة بيانات تجريبية ولا تدخل في ترتيب أسعار المتاجر الفعلية.",
                  )}
                </AppText>
              </>
            )}
          </ScrollView>
          {/* Request actions stay pinned above the keyboard and the home indicator. */}
          {sheet === "request" && selectedPart && (
            <View style={s.footer}>
              <Button
                title={actual?.status === "Pending" ? "Update request" : "Send request"}
                onPress={() => save("Pending")}
              />
              {actual?.status !== "Pending" && (
                <Button
                  title={t("Save draft", "حفظ كمسودة")}
                  variant="secondary"
                  fullWidth
                  onPress={() => save("Draft")}
                />
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  footer: {
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: "#e2e7d8",
    backgroundColor: "#fafbf7",
  },
  page: { gap: 16 },
  grow: { flex: 1, minWidth: 0 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  eyebrow: { fontSize: 9, lineHeight: 14, letterSpacing: 1.2, color: "#71826a", fontWeight: "600" },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800", color: "#162334", marginTop: 3 },
  requestBadge: {
    flexDirection: "row",
    gap: 6,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#e4ecd9",
  },
  badgeNumber: { fontSize: 13, color: "#526443", fontWeight: "700" },
  hero: {
    borderRadius: 25,
    backgroundColor: "#f5f8f3ec",
    padding: 19,
    borderWidth: 1,
    borderColor: "#fff",
    gap: 13,
  },
  kicker: { fontSize: 9, lineHeight: 15, letterSpacing: 1.1, color: "#7a8c69", fontWeight: "700" },
  heroTitle: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#192d35",
  },
  heroAccent: { color: "#647e56", marginTop: -12 },
  heroCopy: { fontSize: 13, lineHeight: 21, color: "#66786c" },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, padding: 11, borderRadius: 15, backgroundColor: "#ffffffc9", gap: 2 },
  statValue: { fontSize: 25, lineHeight: 30, color: "#66869a", fontWeight: "700" },
  statLabel: { fontSize: 9, lineHeight: 14, color: "#6d7a6b" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 9,
    backgroundColor: "#ffffffed",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#dde5d4",
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: "#26382c",
    paddingVertical: 15,
    outlineWidth: 0,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    padding: 7,
    borderRadius: 20,
    backgroundColor: "#ffffffbc",
    borderWidth: 1,
    borderColor: "#e2e7d8",
  },
  tab: {
    width: "48%",
    flexGrow: 1,
    minHeight: 44,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  activeTab: { backgroundColor: "#526443" },
  tabLabel: { fontSize: 13, lineHeight: 18, color: "#4f5f45", fontWeight: "600" },
  activeTabLabel: { color: "white" },
  sectionTitle: { fontSize: 20, lineHeight: 28, fontWeight: "700", color: "#1b2d36" },
  copy: { fontSize: 12, lineHeight: 20, color: "#5e6e62" },
  meta: { fontSize: 10, lineHeight: 17, color: "#7e8d77" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7, alignItems: "center" },
  filterPanel: {
    padding: 15,
    borderRadius: 18,
    backgroundColor: "#f8faf4f0",
    gap: 9,
    borderWidth: 1,
    borderColor: "#dbe4d2",
  },
  filterLabel: { fontSize: 12, color: "#536849", fontWeight: "600" },
  resale: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#eeebf5e8",
    borderRadius: 18,
  },
  name: { fontSize: 13, lineHeight: 19, color: "#3c5041" },
  stockCard: {
    padding: 19,
    borderRadius: 23,
    backgroundColor: "#ffffffed",
    borderWidth: 1,
    borderColor: "#dde6d5",
    borderTopWidth: 3,
    gap: 10,
  },
  partIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "#e9eedf",
    alignSelf: "flex-start",
  },
  tagText: { fontSize: 10, lineHeight: 15, color: "#5e744d", fontWeight: "600" },
  tagDanger: { backgroundColor: "#f2e6e8" },
  dangerText: { color: "#9b505c", fontSize: 12, lineHeight: 19 },
  partTitle: { fontSize: 19, lineHeight: 26, fontWeight: "700", color: "#1d2d3d" },
  inspection: { padding: 13, borderRadius: 14, backgroundColor: "#eaf1e2", gap: 6 },
  inspectionPending: { backgroundColor: "#eeebf4" },
  stockMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#e3e9dc",
  },
  quantity: { fontSize: 26, lineHeight: 32, color: "#5a7350", fontWeight: "700" },
  location: { flexDirection: "row", gap: 5, alignItems: "center", flexShrink: 1 },
  stockFooter: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 5,
  },
  price: { fontSize: 22, lineHeight: 29, fontWeight: "700", color: "#3d5a46" },
  offer: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#f2f7faf2",
    borderWidth: 1,
    borderColor: "#d3e2ec",
    gap: 9,
  },
  out: { opacity: 0.72 },
  difference: { fontSize: 10, lineHeight: 16, color: "#6d7e58", fontWeight: "600" },
  storeOfferWrap: { gap: 4 },
  empty: {
    padding: 25,
    borderRadius: 20,
    backgroundColor: "#ffffffbd",
    gap: 14,
    alignItems: "center",
  },
  compareIntro: { padding: 16, gap: 10, borderRadius: 19, backgroundColor: "#eaf1f7e6" },
  comparisonGroup: {
    padding: 14,
    gap: 12,
    borderRadius: 21,
    backgroundColor: "#ffffffdc",
    borderWidth: 1,
    borderColor: "#dbe4d2",
  },
  range: { padding: 14, borderRadius: 14, backgroundColor: "#e7edde", gap: 5 },
  caveat: {
    fontSize: 11,
    lineHeight: 18,
    color: "#758169",
    padding: 10,
    backgroundColor: "#f4f3ec",
    borderRadius: 11,
  },
  phone: { fontSize: 12, color: "#6783a0", fontWeight: "600" },
  requestHero: { padding: 18, borderRadius: 22, backgroundColor: "#f5f7eef2", gap: 13 },
  note: {
    fontSize: 12,
    lineHeight: 20,
    color: "#526d64",
    backgroundColor: "#eaf1ee",
    borderRadius: 10,
    padding: 12,
  },
  notice: {
    backgroundColor: "#e7eedb",
    padding: 13,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modal: { flex: 1, backgroundColor: "#f7f8f1" },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#dbe3d2",
  },
  close: { minHeight: 42, minWidth: 42, alignItems: "center", justifyContent: "center" },
  modalContent: { padding: 20, gap: 17, paddingBottom: 42 },
  steps: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  step: { padding: 9, borderRadius: 10, backgroundColor: "#edede7", width: "47%" },
  stepDone: { backgroundColor: "#e0ead3" },
  detailsBox: { gap: 10, padding: 16, borderRadius: 15, backgroundColor: "#fff" },
  mapArt: {
    height: 180,
    backgroundColor: "#e2edf1",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
});
