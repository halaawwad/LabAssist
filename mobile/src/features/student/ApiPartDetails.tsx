import { Linking, View } from "react-native";
import { AppText, Button } from "@/components";
import { useCopy } from "@/components/MobileKit";
import { useMarketClient } from "@/lib/market/session";
import { useMarketResource, usePagedResource } from "@/lib/market/useMarketData";
import { MarketState, More } from "./MarketState";
import { ExactShopPrices } from "./ShopPrices";
export function ApiPartDetails({ partKey }: { partKey: string }) {
  const t = useCopy(),
    client = useMarketClient();
  const detail = useMarketResource(`part:${partKey}`, (signal) => client.part(partKey, signal), client);
  const pins = usePagedResource(`pins:${partKey}`, (cursor, signal) =>
    client.pins(partKey, { limit: 30, cursor }, signal),
    client,
  );
  const docs = usePagedResource(`docs:${partKey}`, (cursor, signal) =>
    client.documents(partKey, { limit: 20, cursor }, signal),
    client,
  );
  return (
    <View style={{ gap: 12 }}>
      <MarketState status={detail.status} message={detail.message} retry={detail.retry} />
      {detail.data && (
        <>
          <AppText weight="semibold">
            {detail.data.nameEn} · {detail.data.nameAr}
          </AppText>
          <AppText>{detail.data.description}</AppText>
          <AppText>
            {t("Typical supply", "جهد التغذية")}:{" "}
            {detail.data.typicalSupplyVoltage == null
              ? t("Unknown", "غير معروف")
              : `${detail.data.typicalSupplyVoltage} V`}
          </AppText>
        </>
      )}
      <ExactShopPrices key={partKey} partKey={partKey} />
      <AppText variant="heading">{t("Catalog pins", "أطراف الكتالوج")}</AppText>
      <AppText variant="caption">
        {t(
          "Pin data is unknown or unverified; wiring safety has not been evaluated. Check the original pinout and datasheet.",
          "بيانات الأطراف غير معروفة أو غير متحقق منها؛ لم تُقيّم سلامة التوصيل. راجع مخطط الأطراف ونشرة البيانات الأصلية.",
        )}
      </AppText>
      <MarketState status={pins.status} message={pins.message} retry={pins.retry} />
      {pins.status === "ready" && !pins.items.length && (
        <AppText>{t("No pins", "لا توجد أطراف")}</AppText>
      )}
      {pins.items.map((p) => (
        <AppText key={p.id}>
          {p.name} ·{" "}
          {p.voltage.value == null
            ? t("voltage unknown", "الجهد غير معروف")
            : `${p.voltage.value} V (${t("unverified", "غير متحقق")})`}
        </AppText>
      ))}
      <More
        next={pins.nextCursor}
        loading={pins.loadingMore}
        error={pins.moreError}
        load={pins.loadMore}
      />
      <AppText variant="heading">{t("Catalog documents", "وثائق الكتالوج")}</AppText>
      <MarketState status={docs.status} message={docs.message} retry={docs.retry} />
      {docs.status === "ready" && !docs.items.length && (
        <AppText>{t("No documents", "لا توجد وثائق")}</AppText>
      )}
      {docs.items.map((d) => (
        <View key={d.url} style={{ gap: 4 }}>
          <AppText>
            {d.title} · {d.publisher} ·{" "}
            {d.sourceVerifiedAt ? d.sourceVerifiedAt : t("unverified", "غير متحقق")}
          </AppText>
          <AppText>{d.note}</AppText>
          <Button
            title={t("Open document", "فتح الوثيقة")}
            variant="ghost"
            onPress={() => {
              void Linking.openURL(d.url).catch(() => {});
            }}
          />
        </View>
      ))}
      <More
        next={docs.nextCursor}
        loading={docs.loadingMore}
        error={docs.moreError}
        load={docs.loadMore}
      />
    </View>
  );
}
