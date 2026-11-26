import { useState } from "react";
import { Linking, View, type ViewStyle } from "react-native";
import { AppText, Button } from "@/components";
import { Chips, useCopy } from "@/components/MobileKit";
import { useLanguage } from "@/i18n";
import { colors } from "@/theme";
import type { Variant } from "@/lib/market/client";
import { useMarketClient } from "@/lib/market/session";
import { useMarketResource, usePagedResource } from "@/lib/market/useMarketData";
import {
  currencyMismatch,
  globalCard,
  isolate,
  shopCards,
  shopPriceCopy,
  type ShopCardModel,
  type Tone,
} from "@/lib/market/shopPrices";
import { MarketState, More } from "./MarketState";

const card: ViewStyle = {
  flexGrow: 1,
  flexBasis: 240,
  minWidth: 0,
  padding: 14,
  borderWidth: 1,
  borderColor: "#d8e0d1",
  borderRadius: 14,
  backgroundColor: "#f8faf5",
  gap: 6,
};
const badgeLook: Record<Tone, { backgroundColor: string; borderColor: string }> = {
  good: { backgroundColor: colors.successSoft, borderColor: colors.success },
  warn: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  muted: { backgroundColor: colors.primaryWash, borderColor: "#d8e0d1" },
  neutral: { backgroundColor: colors.surface, borderColor: "#d8e0d1" },
};
function Badge({ tone, text }: { tone: Tone; text: string }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
        ...badgeLook[tone],
      }}
    >
      <AppText variant="caption" weight="semibold">
        {text}
      </AppText>
    </View>
  );
}
const open = (url: string) => {
  void Linking.openURL(url).catch(() => {});
};
function ShopCard({ model }: { model: ShopCardModel }) {
  const { language } = useLanguage();
  const copy = shopPriceCopy(language);
  return (
    <View
      style={[card, model.lower ? { borderColor: colors.success } : null]}
      testID={`shop-card-${model.shop}`}
      accessible={false}
    >
      <AppText weight="bold">{isolate(model.name)}</AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {model.lower && <Badge tone="good" text={copy.lower} />}
        {model.badge && <Badge tone={model.badge.tone} text={model.badge.text} />}
      </View>
      <AppText
        variant="heading"
        weight="bold"
        accessibilityLabel={model.hasPrice ? model.priceText : copy.noPrice}
        testID={`shop-price-${model.shop}`}
      >
        {model.hasPrice ? isolate(model.priceText) : model.priceText}
      </AppText>
      {model.availability && <Badge tone="neutral" text={model.availability} />}
      {model.note && (
        <AppText variant="caption" tone="muted">
          {model.note}
        </AppText>
      )}
      {model.priceDate && (
        <AppText variant="caption" tone="muted">
          {copy.priceObserved(model.priceDate)}
        </AppText>
      )}
      {model.stockCheck && <AppText variant="caption" tone="muted">{model.stockCheck}</AppText>}
      <AppText variant="caption" tone="muted">
        {model.lastCheck}
      </AppText>
      {model.sourceUrl && (
        <Button
          title={copy.viewShop}
          accessibilityLabel={`${copy.viewShop}: ${model.name}`}
          variant="ghost"
          onPress={() => open(model.sourceUrl!)}
        />
      )}
    </View>
  );
}

/** Technolab and PIC Industrial prices for one exact variant, plus an eligible global reference. */
export function ShopPriceCards({ variantId, quantity = 1 }: { variantId: string; quantity?: number }) {
  const client = useMarketClient();
  const { language } = useLanguage();
  const copy = shopPriceCopy(language);
  const prices = useMarketResource(
    `shop-prices:${variantId}:${quantity}`,
    (signal) => client.shopPrices({ variantId, quantity }, signal),
    client,
  );
  const data = prices.status === "ready" ? prices.data : null;
  const global = data ? globalCard(data, language) : null;
  return (
    <View style={{ gap: 10 }} testID="shop-prices">
      <AppText variant="heading" accessibilityRole="header">
        {copy.heading}
      </AppText>
      <AppText variant="caption" tone="muted">
        {copy.forQuantity(quantity)}
      </AppText>
      {prices.status === "loading" ? (
        <AppText accessibilityLiveRegion="polite">{copy.loading}</AppText>
      ) : prices.status === "error" ? (
        <View style={{ gap: 6 }} accessibilityLiveRegion="polite">
          <AppText weight="semibold">{copy.failed}</AppText>
          {!!prices.message && (
            <AppText variant="caption" tone="muted">
              {prices.message}
            </AppText>
          )}
          <Button title={copy.retry} variant="soft" onPress={prices.retry} />
        </View>
      ) : (
        <MarketState status={prices.status} message={prices.message} retry={prices.retry} />
      )}
      {data && (
        <View style={{ gap: 10 }} accessibilityLiveRegion="polite">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {shopCards(data, language).map((model) => (
              <ShopCard key={model.shop} model={model} />
            ))}
          </View>
          {currencyMismatch(data.localShops) && (
            <AppText variant="caption" tone="muted">
              {copy.currencyMismatch}
            </AppText>
          )}
          {global && global.kind !== "hidden" && (
            <View
              testID="global-reference"
              style={{
                padding: 14,
                gap: 6,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: colors.primarySoft,
                borderRadius: 14,
              }}
            >
              <AppText weight="bold">{global.title}</AppText>
              {global.kind === "unavailable" ? (
                <AppText variant="caption" tone="muted">
                  {global.note}
                </AppText>
              ) : (
                <>
                  <AppText>{isolate(global.supplier)}</AppText>
                  <AppText variant="heading" weight="bold">
                    {isolate(global.priceText)}
                  </AppText>
                  {global.quantity && <AppText variant="caption">{global.quantity}</AppText>}
                  <AppText variant="caption" tone="muted">
                    {global.observed}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {global.shipping} · {global.tax}
                  </AppText>
                  <Button
                    title={copy.viewSupplier}
                    variant="ghost"
                    onPress={() => open(global.url)}
                  />
                </>
              )}
            </View>
          )}
          <AppText variant="caption" tone="muted">
            {copy.caution}
          </AppText>
        </View>
      )}
    </View>
  );
}

const identity = (variant: Variant) =>
  [variant.manufacturer, variant.modelNumber, variant.packageOrRevision]
    .map((value) => value || "—")
    .join(" · ");
/** Part details: explicit exact-identity choice (paged), then the shop price cards. */
export function ExactShopPrices({ partKey }: { partKey: string }) {
  const t = useCopy(),
    client = useMarketClient();
  const { language } = useLanguage();
  const copy = shopPriceCopy(language);
  const [variantId, setVariantId] = useState("");
  const variants = usePagedResource(
    `shop-variants:${partKey}`,
    (cursor, signal) => client.variants(partKey, { limit: 24, cursor }, signal),
    client,
  );
  const exact = variants.items.filter((variant) => variant.exact);
  return (
    <View style={{ gap: 10 }}>
      <AppText variant="heading">{t("Shop prices", "أسعار المتاجر")}</AppText>
      <MarketState status={variants.status} message={variants.message} retry={variants.retry} />
      {variants.status === "ready" && (
        <>
          {exact.length ? (
            <Chips
              value={variantId}
              onChange={setVariantId}
              accessibilityLabel={copy.chooseOption}
              options={exact.map((variant) => ({ id: variant.id, label: identity(variant) }))}
            />
          ) : (
            !variants.nextCursor && <AppText variant="caption">{copy.noExact}</AppText>
          )}
          {variants.items.some((variant) => !variant.exact) && (
            <AppText variant="caption" tone="muted">
              {copy.incomplete}
            </AppText>
          )}
          <More
            next={variants.nextCursor}
            loading={variants.loadingMore}
            error={variants.moreError}
            load={variants.loadMore}
            label={t("exact identities", "الهويات الدقيقة")}
          />
          {variantId ? (
            <ShopPriceCards key={variantId} variantId={variantId} />
          ) : (
            exact.length > 0 && (
              <AppText variant="caption" tone="muted">
                {copy.chooseIdentity}
              </AppText>
            )
          )}
        </>
      )}
    </View>
  );
}
