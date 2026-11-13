import { useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
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

function Tag({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <View style={[s.tag, danger && s.tagDanger]}>
      <AppText style={[s.tagText, danger && s.dangerText]}>{children}</AppText>
    </View>
  );
}
export function InventoryPanel() {
  const { actorId } = useWorkspace();
  return <InventoryContent key={actorId} actorId={actorId} />;
}
function InventoryContent({ actorId }: { actorId: string }) {
  const t = useCopy();
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
          setNotice("Saved requests could not be loaded.");
        }
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [storageKey]);
  useEffect(() => {
    if (loaded)
      AsyncStorage.setItem(storageKey, JSON.stringify(requests)).catch(() =>
        setNotice("Could not save requests on this device."),
      );
  }, [requests, loaded, storageKey]);
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
      return setError(`Choose a whole quantity between 1 and ${selectedPart.quantity}.`);
    if (!use.trim())
      return setError(
        t("Add a short description of what you need this part for.", "اكتب سبب حاجتك لهذه القطعة."),
      );
    const at = new Date().toISOString();
    const next: Request = {
      id: actual?.id ?? `request-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
                ? "Lowest listing · unavailable"
                : "Lowest listed · compare variant"
              : `+${money(offer.price - min)} vs lowest listing`}
          </AppText>
        )}
        <Tag danger={out}>{offer.availability}</Tag>
        <AppText weight="semibold" style={s.name}>
          {offer.name}
        </AppText>
        <AppText style={s.copy}>{offer.note}</AppText>
        <AppText style={s.meta}>Condition: ask store · Check included accessories</AppText>
        <AppText style={s.meta}>Checked {offer.checked} · Shipping excluded</AppText>
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
          <AppText style={s.eyebrow}>
            {t("YOUR WORKSPACE / FIND YOUR NEXT PART", "مساحتك / ابحث عن قطعتك التالية")}
          </AppText>
          <AppText style={s.title}>{t("Workshop Inventory", "قطع الورشة")}</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open My Requests"
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
      )}
      <View style={s.search}>
        <Search size={18} color="#819277" />
        <TextInput
          accessibilityLabel="Search inventory"
          placeholder={
            tab === "My Requests" ? "Search your requested parts…" : "Search a component or store…"
          }
          value={query}
          onChangeText={setQuery}
          placeholderTextColor="#8a9584"
          style={s.searchInput}
        />
        {!!query && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery("")}
          >
            <X size={18} color="#657459" />
          </Pressable>
        )}
      </View>
      {!!query && <AppText style={s.meta}>Searching for “{query}” · kept across tabs</AppText>}
      <View style={s.tabs}>
        {tabs.map((value) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            key={value}
            onPress={() => switchTab(value)}
            style={[s.tab, tab === value && s.activeTab]}
          >
            <AppText style={[s.tabLabel, tab === value && s.activeTabLabel]}>{value}</AppText>
          </Pressable>
        ))}
      </View>
      {notice !== "" && (
        <View accessibilityRole="alert" style={s.notice}>
          <AppText style={[s.copy, s.grow]}>{notice}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss notice"
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
                  ? "One part. Every available option."
                  : tab === "Workshop Stock"
                    ? "On the workshop shelf"
                    : "A little closer to your next component"}
              </AppText>
              <AppText style={s.copy}>
                {tab === "Find Parts"
                  ? "Workshop stock and published store offers together."
                  : tab === "Workshop Stock"
                    ? "New and used components · Student view only"
                    : "Palestinian stores · Published contact details"}
              </AppText>
            </View>
          </View>
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
                  <AppText style={s.filterLabel}>City</AppText>
                  <Chips
                    options={["All cities", ...new Set(stores.map((p) => p.city))].map((v) => ({
                      id: v,
                      label: v,
                    }))}
                    value={city}
                    onChange={setCity}
                  />
                </>
              ) : (
                <>
                  <AppText style={s.filterLabel}>Category</AppText>
                  <Chips
                    options={categories.map((v) => ({ id: v, label: v }))}
                    value={category}
                    onChange={setCategory}
                  />
                  <AppText style={s.filterLabel}>Stock status</AppText>
                  <Chips
                    options={["All statuses", "In Stock", "Low Stock", "Out of Stock"].map((v) => ({
                      id: v,
                      label: v,
                    }))}
                    value={status}
                    onChange={setStatus}
                  />
                  <AppText style={s.filterLabel}>Availability type</AppText>
                  <Chips
                    options={["All types", "For Sale", "For Use"].map((v) => ({ id: v, label: v }))}
                    value={purpose}
                    onChange={setPurpose}
                  />
                </>
              )}
            </View>
          )}
          {tab !== "Local Stores" ? (
            <>
              <Chips
                options={["All sources", "Workshop", "Student Resale"].map((v) => ({
                  id: v,
                  label: `${v}  ${workshopStock.filter((p) => v === "All sources" || (p.source || "Workshop") === v).length}`,
                }))}
                value={source}
                onChange={setSource}
              />
              <View style={s.resale}>
                <Package color="#8c719e" size={23} />
                <View style={s.grow}>
                  <AppText weight="bold" style={s.name}>
                    Give good parts another project.
                  </AppText>
                  <AppText style={s.copy}>
                    Components from previous students, listed through the workshop assistant. Check
                    condition and inspection notes before requesting.
                  </AppText>
                  <AppText style={s.meta}>Preview listings</AppText>
                </View>
              </View>
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
                    {item.source || "Workshop"} · {item.category}
                  </AppText>
                  <AppText style={s.partTitle}>{item.name}</AppText>
                  <AppText style={s.copy}>{item.detail}</AppText>
                  <View style={s.actions}>
                    <Tag>{item.condition}</Tag>
                    <Tag>{item.purpose}</Tag>
                    {item.source && <Tag>Student Resale</Tag>}
                  </View>
                  {item.source && (
                    <View
                      style={[s.inspection, item.inspection !== "Tested" && s.inspectionPending]}
                    >
                      <AppText weight="semibold" style={s.name}>
                        {item.inspection === "Tested"
                          ? "Tested · sample inspection"
                          : "Inspection pending · sample"}
                      </AppText>
                      <AppText style={s.copy}>{item.resaleNote}</AppText>
                    </View>
                  )}
                  <View style={s.stockMeta}>
                    <View>
                      <AppText style={s.quantity}>{item.quantity}</AppText>
                      <AppText style={s.meta}>Available quantity</AppText>
                    </View>
                    <View style={s.location}>
                      <MapPin size={14} color="#7a8c69" />
                      <AppText style={s.copy}>{item.location}</AppText>
                    </View>
                  </View>
                  <View style={s.stockFooter}>
                    <View style={s.grow}>
                      <AppText style={s.price}>
                        {item.price === undefined ? "Workshop use" : money(item.price)}
                      </AppText>
                      {item.price !== undefined && (
                        <AppText style={s.meta}>/ unit · sample</AppText>
                      )}
                    </View>
                    <Button
                      title={item.quantity ? "Request Part" : "Unavailable"}
                      accessibilityLabel={`Request ${item.id}`}
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
                      title="Compare this part"
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
                    <AppText weight="bold">No matching parts</AppText>
                    <Button title="Clear filters" variant="soft" onPress={reset} />
                  </View>
                )}
            </>
          ) : (
            <>
              <View style={s.compareIntro}>
                <AppText style={s.kicker}>COMPARE BEFORE YOU BUY</AppText>
                <AppText style={s.sectionTitle}>One component. Different stores.</AppText>
                <AppText style={s.copy}>
                  Prices, availability and location — together, where you can compare them.
                </AppText>
                <AppText style={s.meta}>
                  Sources checked · 15–16 Oct 2026 · Confirm current prices
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
                      {new Set(offers.map((o) => o.storeId)).size} stores · Compare exact variants
                      below
                    </AppText>
                    {min !== undefined && max !== undefined && (
                      <View style={s.range}>
                        <AppText weight="bold">
                          {min === max ? money(min) : `${money(min)} – ${money(max)}`}
                        </AppText>
                        <AppText style={s.copy}>
                          {max > min
                            ? `${money(max - min)} difference across listed variants`
                            : "One published price"}
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
                          ? "The cheaper listing is out of stock, and board versions may differ. This is not a like-for-like saving."
                          : "Prices cover different variants. Confirm the USB chip, accessories and condition."}
                      </AppText>
                    )}
                  </View>
                );
              })}
              {!groups.length && (
                <AppText style={s.copy}>No store listings for this search.</AppText>
              )}
              <AppText style={s.sectionTitle}>Store directory</AppText>
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
                  <AppText style={s.meta}>{store.city} · Palestine</AppText>
                  <AppText style={s.partTitle}>{store.name}</AppText>
                  <AppText style={s.copy}>{store.address}</AppText>
                  <AppText style={s.meta}>{store.note}</AppText>
                  <View style={s.actions}>
                    <Button
                      title="View map"
                      size="sm"
                      variant="soft"
                      onPress={() => showMap(store)}
                    />
                    <Button
                      title="Call store"
                      size="sm"
                      variant="ghost"
                      onPress={() => open(`tel:${store.phone}`)}
                    />
                    <Button
                      title="Website ↗"
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
                <Button title="No stores match · Clear filters" variant="soft" onPress={reset} />
              )}
            </>
          )}
        </>
      ) : (
        <>
          <View style={s.requestHero}>
            <AppText style={s.kicker}>FROM YOUR REQUEST TO YOUR WORKBENCH</AppText>
            <AppText style={s.sectionTitle}>My Requests</AppText>
            <AppText style={s.copy}>
              Workshop stock and student resale, followed in one place.
            </AppText>
            <View style={s.stats}>
              <Pressable
                style={s.stat}
                onPress={() => setRequestFilter("Draft")}
                accessibilityRole="button"
                accessibilityLabel="Your drafts"
              >
                <AppText style={s.statValue}>
                  {own.filter((r) => r.status === "Draft").length}
                </AppText>
                <AppText style={s.statLabel}>Your drafts</AppText>
              </Pressable>
              <Pressable
                style={s.stat}
                onPress={() => setRequestFilter("Active")}
                accessibilityRole="button"
                accessibilityLabel="Your active requests"
              >
                <AppText style={s.statValue}>
                  {
                    own.filter((r) =>
                      ["Pending", "Approved", "Ready for Pickup"].includes(r.status),
                    ).length
                  }
                </AppText>
                <AppText style={s.statLabel}>Active requests</AppText>
              </Pressable>
            </View>
            <AppText style={s.copy}>Follow the handover: Approval → Ready → Pickup</AppText>
            <Button
              title="Browse parts"
              variant="soft"
              size="sm"
              onPress={() => switchTab("Workshop Stock")}
            />
          </View>
          <Chips
            value={requestFilter}
            onChange={setRequestFilter}
            options={["All", "Active", ...statuses].map((v) => ({ id: v, label: v }))}
          />
          {visibleRequests.map((r) => {
            const part = workshopStock.find((p) => p.id === r.partId);
            if (!part) return null;
            return (
              <View style={s.stockCard} key={r.id}>
                <View style={s.actions}>
                  <Tag danger={r.status === "Rejected" || r.status === "Cancelled"}>{r.status}</Tag>
                  {r.sample && <Tag>Example</Tag>}
                  <Tag>{part.source || "Workshop"}</Tag>
                </View>
                <AppText style={s.partTitle}>{part.name}</AppText>
                <AppText style={s.copy}>{r.purpose}</AppText>
                <AppText style={s.meta}>
                  Qty {r.quantity} · {part.condition} · {r.submittedAt ? "Requested" : "Saved"}{" "}
                  {new Date(r.submittedAt || r.createdAt).toLocaleDateString()}
                </AppText>
                {r.note && <AppText style={s.note}>{r.note}</AppText>}
                <AppText style={s.price}>
                  {part.price === undefined ? "For workshop use" : money(part.price * r.quantity)}
                </AppText>
                <View style={s.actions}>
                  <Button
                    title="View details"
                    variant="soft"
                    size="sm"
                    onPress={() => {
                      setSelected(r.id);
                      setSheet("details");
                    }}
                  />
                  {editable(r) && (
                    <Button
                      title={r.status === "Draft" ? "Continue draft" : "Edit request"}
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
              <AppText weight="bold">No requests here yet</AppText>
              <AppText style={s.copy}>
                Choose a workshop part to start a request, or try another filter.
              </AppText>
              <Button
                title="Show all requests"
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
                  ? "Edit part request"
                  : "Request a part"
                : sheet === "compare"
                  ? "Compare prices"
                  : sheet === "map"
                    ? "Store location"
                    : sheet === "receipt"
                      ? "Request summary"
                      : sheet === "cancel"
                        ? "Cancel this request?"
                        : "Request details"}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close inventory dialog"
              onPress={() => setSheet(null)}
              style={s.close}
            >
              <X size={23} color="#526443" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
            {sheet === "request" && selectedPart && (
              <>
                <View style={s.inspection}>
                  <AppText style={s.partTitle}>{selectedPart.name}</AppText>
                  <AppText style={s.copy}>
                    {selectedPart.source || "Workshop"} · {selectedPart.condition}
                  </AppText>
                  <AppText style={s.copy}>
                    {selectedPart.location} · {selectedPart.quantity} available
                  </AppText>
                </View>
                <Field
                  label="Quantity"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                />
                <Field
                  label="What will you use it for?"
                  value={use}
                  onChangeText={setUse}
                  multiline
                  maxLength={1000}
                  placeholder="For example: testing obstacle detection on our prototype…"
                />
                {selectedPart.source && (
                  <AppText style={s.copy}>
                    Student resale · The assistant coordinates inspection, availability and
                    handover.
                  </AppText>
                )}
                {selectedPart.price !== undefined && (
                  <View style={s.range}>
                    <AppText style={s.copy}>Estimated total · Sample price</AppText>
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
                <View style={s.actions}>
                  <Button title="Cancel" variant="ghost" onPress={() => setSheet(null)} />
                  {actual?.status !== "Pending" && (
                    <Button title="Save draft" variant="soft" onPress={() => save("Draft")} />
                  )}
                  <Button
                    title={actual?.status === "Pending" ? "Update request" : "Send request"}
                    onPress={() => save("Pending")}
                  />
                </View>
              </>
            )}
            {(sheet === "details" || sheet === "receipt") && actual && activePart && (
              <>
                {sheet === "receipt" && <Check size={42} color="#6e8b53" />}
                <AppText style={s.partTitle}>{activePart.name}</AppText>
                <Tag>{actual.status}</Tag>
                <AppText style={s.copy}>
                  {activePart.source || "Workshop"} · {activePart.condition}
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
                          {i + 1} · {step}
                        </AppText>
                      </View>
                    ))}
                  </View>
                )}
                <View style={s.detailsBox}>
                  <AppText style={s.copy}>Quantity: {actual.quantity}</AppText>
                  <AppText style={s.copy}>
                    Unit price:{" "}
                    {activePart.price === undefined ? "Workshop use" : money(activePart.price)}
                  </AppText>
                  <AppText weight="bold">
                    Estimated total:{" "}
                    {activePart.price === undefined
                      ? "Workshop use"
                      : money(activePart.price * actual.quantity)}
                  </AppText>
                  <AppText style={s.copy}>Workshop location: {activePart.location}</AppText>
                  <AppText style={s.meta}>
                    Updated {new Date(actual.updatedAt).toLocaleString()}
                  </AppText>
                </View>
                <AppText weight="bold">Purpose</AppText>
                <AppText style={s.copy}>{actual.purpose}</AppText>
                {actual.note && (
                  <View style={s.inspection}>
                    <AppText weight="bold">Workshop assistant</AppText>
                    <AppText style={s.copy}>{actual.note}</AppText>
                  </View>
                )}
                {actual.status === "Draft" && (
                  <AppText style={s.meta}>This draft has not been sent.</AppText>
                )}
                {sheet === "receipt" ? (
                  <Button
                    title="Track request"
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
                        title="Cancel request"
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
                  The request will stay in your history as Cancelled.
                </AppText>
                <Button title="Keep request" variant="soft" onPress={() => setSheet("details")} />
                <Button
                  title="Confirm cancellation"
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
                    setNotice("Request cancelled.");
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
                  title="Open in maps ↗"
                  onPress={() =>
                    open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapStore.name + " " + mapStore.address)}`,
                    )
                  }
                />
                <Button
                  title={`Call ${mapStore.phone}`}
                  variant="soft"
                  onPress={() => open(`tel:${mapStore.phone}`)}
                />
                <Button title="Website ↗" variant="ghost" onPress={() => open(mapStore.website)} />
              </>
            )}
            {sheet === "compare" && (
              <>
                <AppText style={s.filterLabel}>Component</AppText>
                <Chips
                  value={comparePart}
                  onChange={setComparePart}
                  options={workshopStock
                    .filter((p) => storeOffers.some((o) => o.id === p.id))
                    .map((p) => ({ id: p.id, label: p.name }))}
                />
                <AppText style={s.filterLabel}>Your city</AppText>
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
                  ].map((v) => ({ id: v, label: v }))}
                />
                <AppText style={s.filterLabel}>Show first</AppText>
                <Chips
                  value={sort}
                  onChange={setSort}
                  options={["Lowest listed price", "Stores in my city"].map((v) => ({
                    id: v,
                    label: v,
                  }))}
                />
                {prices.length > 1 && (
                  <View style={s.range}>
                    <AppText weight="bold">
                      {money(Math.max(...prices) - Math.min(...prices))} price spread
                    </AppText>
                    <AppText style={s.copy}>Across listed variants · Shipping excluded</AppText>
                  </View>
                )}
                <AppText style={s.caveat}>
                  Compare the exact model, condition and included accessories. Out-of-stock prices
                  remain visible; they are not available offers. City matching does not measure
                  travel distance.
                </AppText>
                {comparisons.map((o) => (
                  <View key={o.offerId}>
                    {compareCity === storeForOffer(o).city && <Tag>In your city</Tag>}
                    <OfferCard offer={o} min={prices.length ? Math.min(...prices) : undefined} />
                  </View>
                ))}
                <AppText style={s.meta}>
                  Workshop prices are sample data and are excluded from real-store price rankings.
                </AppText>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  page: { gap: 16 },
  grow: { flex: 1, minWidth: 0 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  eyebrow: { fontSize: 9, lineHeight: 14, letterSpacing: 1.2, color: "#71826a", fontWeight: "600" },
  title: { fontSize: 26, lineHeight: 34, fontWeight: "800", color: "#162334", marginTop: 3 },
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
    minHeight: 43,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  activeTab: { backgroundColor: "#526443" },
  tabLabel: { fontSize: 12, lineHeight: 17, color: "#627357", fontWeight: "600" },
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
