import { useState } from "react";
import { Linking, View } from "react-native";
import { AppText, Button } from "@/components";
import { Chips, useCopy } from "@/components/MobileKit";
import { MobileInput } from "@/components/MobileInput";
import { useMarketClient } from "@/lib/market/session";
import { useLanguage } from "@/i18n";
import { useDebouncedValue, usePagedResource } from "@/lib/market/useMarketData";
import type { PublicOffer, Variant } from "@/lib/market/client";
import { MarketState, More } from "./MarketState";
import { ShopPriceCards } from "./ShopPrices";
import { offerStock } from "@/lib/market/offerStock";
const card = {
  padding: 14,
  borderWidth: 1,
  borderColor: "#d8e0d1",
  borderRadius: 14,
  backgroundColor: "#f8faf5",
  gap: 7,
} as const;
const variantLabel = (variant: Variant, language: "en" | "ar") => {
  const unknown = language === "ar" ? "غير معروف" : "Unknown";
  return [variant.manufacturer, variant.modelNumber, variant.packageOrRevision]
    .map((value) => value || unknown)
    .join(" · ");
};
function Offer({ offer }: { offer: PublicOffer }) {
  const t = useCopy();
  return (
    <View style={card}>
      <AppText weight="bold">{offer.partName}</AppText>
      <AppText>
        {offer.seller.name} · {offer.seller.city}
      </AppText>
      <AppText weight="bold">
        {offer.unitPrice} {offer.currency}
      </AppText>
      <AppText>
        {offer.condition} · {offerStock(offer, t)}
      </AppText>
      <AppText>
        {t("Observed", "تاريخ الرصد")}:{" "}
        {offer.priceObservedAt
          ? new Date(offer.priceObservedAt).toLocaleDateString()
          : t("Unknown (legacy price)", "غير معروف (سعر قديم)")}
      </AppText>
      <AppText>
        {t("Shipping", "الشحن")}:{" "}
        {offer.shippingCost == null
          ? t("Unknown", "غير معروف")
          : `${offer.shippingCost} ${offer.currency}`}
      </AppText>
      <AppText>
        {offer.identity.exact
          ? t("Exact identity", "هوية دقيقة")
          : t("Identity not exact", "الهوية غير دقيقة")}
      </AppText>
      {offer.source.url && (
        <Button
          title={t("Price evidence", "مصدر السعر")}
          variant="ghost"
          onPress={() => {
            void Linking.openURL(offer.source.url!).catch(() => {});
          }}
        />
      )}
    </View>
  );
}
export function LiveOffers({ kind, search }: { kind: "SHOP" | "STUDENT"; search: string }) {
  const t = useCopy(),
    client = useMarketClient(),
    query = useDebouncedValue(search.trim());
  const data = usePagedResource(
    `offers:${kind}:${query}`,
    (cursor, signal) =>
      client.offers({ sellerKind: kind, search: query || undefined, limit: 24, cursor }, signal),
    client,
  );
  return (
    <View style={{ gap: 10 }}>
      <AppText variant="heading">
        {kind === "SHOP"
          ? t("Store offers", "عروض المتاجر")
          : t("Student resale", "إعادة بيع الطلاب")}
      </AppText>
      <MarketState status={data.status} message={data.message} retry={data.retry} />
      {data.status === "ready" && !data.items.length && (
        <AppText>{t("No offers found", "لا توجد عروض")}</AppText>
      )}
      {data.items.map((o) => (
        <Offer key={o.id} offer={o} />
      ))}
      <More
        next={data.nextCursor}
        loading={data.loadingMore}
        error={data.moreError}
        load={data.loadMore}
      />
    </View>
  );
}
export function LiveStores({ search, city }: { search: string; city: string }) {
  const t = useCopy(),
    client = useMarketClient();
  const data = usePagedResource(
    "shops",
    (cursor, signal) => client.sellers({ kind: "SHOP", limit: 30, cursor }, signal),
    client,
  );
  const items = data.items.filter(
    (s) =>
      `${s.name} ${s.city}`.toLowerCase().includes(search.trim().toLowerCase()) &&
      s.city.toLowerCase().includes(city.trim().toLowerCase()),
  );
  return (
    <View style={{ gap: 10 }}>
      <AppText variant="heading">{t("Store directory", "دليل المتاجر")}</AppText>
      <AppText variant="caption">
        {t("Search applies to loaded stores.", "البحث في المتاجر المحملة فقط.")}
      </AppText>
      <MarketState status={data.status} message={data.message} retry={data.retry} />
      {data.status === "ready" && !items.length && (
        <AppText>{t("No matching stores", "لا توجد متاجر مطابقة")}</AppText>
      )}
      {items.map((s) => (
        <View key={s.id} style={card}>
          <AppText weight="bold">{s.name}</AppText>
          <AppText>{s.city || t("City unknown", "المدينة غير معروفة")}</AppText>
          <AppText>{t("Address not published", "العنوان غير منشور")}</AppText>
          {s.phone && (
            <Button
              title={t("Call store", "الاتصال بالمتجر")}
              variant="soft"
              onPress={() => {
                void Linking.openURL(`tel:${s.phone}`).catch(() => {});
              }}
            />
          )}
          {s.website && (
            <Button
              title={t("Website", "الموقع")}
              variant="ghost"
              onPress={() => {
                void Linking.openURL(s.website!).catch(() => {});
              }}
            />
          )}
          {s.latitude != null && s.longitude != null && (
            <Button
              title={t("View map", "عرض الخريطة")}
              variant="ghost"
              onPress={() => {
                void Linking.openURL(
                  `https://maps.google.com/?q=${s.latitude},${s.longitude}`,
                ).catch(() => {});
              }}
            />
          )}
        </View>
      ))}
      <More
        next={data.nextCursor}
        loading={data.loadingMore}
        error={data.moreError}
        load={data.loadMore}
      />
    </View>
  );
}
export function LiveComparison() {
  const t = useCopy(),
    client = useMarketClient();
  const { language } = useLanguage();
  const [search, setSearch] = useState(""),
    [key, setKey] = useState(""),
    [variantId, setVariantId] = useState(""),
    [currency, setCurrency] = useState("ILS");
  const q = useDebouncedValue(search.trim());
  const parts = usePagedResource(
    `compare-parts:${q}`,
    (cursor, signal) => client.parts({ search: q || undefined, limit: 24, cursor }, signal),
    client,
  );
  const variants = usePagedResource(
    `compare-variants:${key}`,
    key ? (cursor, signal) => client.variants(key, { limit: 24, cursor }, signal) : null,
    client,
  );
  const comparison = usePagedResource(
    `compare:${key}:${variantId}:${currency}`,
    key && currency.trim()
      ? (cursor, signal) =>
          variantId
            ? client.compareExact(
                { variantId, currency: currency.trim().toUpperCase(), limit: 24, cursor },
                signal,
              )
            : client.compare(
                { catalogKey: key, currency: currency.trim().toUpperCase(), limit: 24, cursor },
                signal,
              )
      : null,
    client,
  );
  const exactVariants = variants.items.filter((variant) => variant.exact);
  const choosePart = (partKey: string) => {
    setKey(partKey);
    setVariantId("");
  };
  return (
    <View style={{ gap: 10 }}>
      <AppText>{t("Search and select a component", "ابحث واختر قطعة")}</AppText>
      <MobileInput
        accessibilityLabel={t("Search components", "البحث عن القطع")}
        value={search}
        onChangeText={setSearch}
        placeholder={t("Search components", "البحث عن القطع")}
      />
      <MarketState status={parts.status} message={parts.message} retry={parts.retry} />
      <Chips
        value={key}
        onChange={choosePart}
        accessibilityLabel={t("Choose a catalog part", "اختر قطعة من الكتالوج")}
        options={parts.items.map((p) => ({
          id: p.key,
          label: language === "ar" ? p.nameAr : p.nameEn,
        }))}
      />
      <More
        next={parts.nextCursor}
        loading={parts.loadingMore}
        error={parts.moreError}
        load={parts.loadMore}
        label={t("catalog parts", "قطع الكتالوج")}
      />
      {!!key && (
        <>
          <AppText>{t("Exact identity", "الهوية الدقيقة")}</AppText>
          <MarketState status={variants.status} message={variants.message} retry={variants.retry} />
          {variants.status === "ready" && (
            <>
              <Chips
                value={variantId}
                onChange={setVariantId}
                accessibilityLabel={t("Choose an exact identity", "اختر هوية دقيقة")}
                options={[
                  {
                    id: "",
                    label: t("Any identity", "أي هوية"),
                  },
                  ...exactVariants.map((variant) => ({
                    id: variant.id,
                    label: variantLabel(variant, language),
                  })),
                ]}
              />
              {!exactVariants.length && !variants.nextCursor && (
                <AppText variant="caption">
                  {t(
                    "No exact identities are available for this part.",
                    "لا توجد هويات دقيقة متاحة لهذه القطعة.",
                  )}
                </AppText>
              )}
              {variants.items.some((variant) => !variant.exact) && (
                <AppText variant="caption" tone="muted">
                  {t(
                    "Incomplete identities are not offered for exact comparison.",
                    "لا تُعرض الهويات غير المكتملة للمقارنة الدقيقة.",
                  )}
                </AppText>
              )}
              <More
                next={variants.nextCursor}
                loading={variants.loadingMore}
                error={variants.moreError}
                load={variants.loadMore}
                label={t("exact identities", "الهويات الدقيقة")}
              />
            </>
          )}
          {!!variantId && <ShopPriceCards key={variantId} variantId={variantId} />}
        </>
      )}
      <AppText>{t("Currency code", "رمز العملة")}</AppText>
      <MobileInput
        accessibilityLabel={t("Currency", "العملة")}
        value={currency}
        onChangeText={setCurrency}
        autoCapitalize="characters"
      />
      <AppText variant="caption">
        {t(
          variantId
            ? "Only offers linked to the selected exact identity are compared."
            : "All published offers for this part are compared; no exact match is inferred.",
          variantId
            ? "تُقارن فقط العروض المرتبطة بالهوية الدقيقة المحددة."
            : "تُقارن كل العروض المنشورة لهذه القطعة؛ ولا يُستنتج أي تطابق دقيق.",
        )}
      </AppText>
      <MarketState
        status={comparison.status}
        message={comparison.message}
        retry={comparison.retry}
      />
      {comparison.status === "ready" && !comparison.items.length && (
        <AppText>{t("No comparable offers", "لا توجد عروض للمقارنة")}</AppText>
      )}
      {comparison.items.map((o) => (
        <Offer key={o.id} offer={o} />
      ))}
      <More
        next={comparison.nextCursor}
        loading={comparison.loadingMore}
        error={comparison.moreError}
        load={comparison.loadMore}
        label={t("comparison offers", "عروض المقارنة")}
      />
    </View>
  );
}
