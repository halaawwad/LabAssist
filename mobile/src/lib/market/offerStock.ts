import type { PublicOffer } from "./client";

export function offerStock(offer: PublicOffer, t: (en: string, ar: string) => string): string {
  if (offer.seller.kind === "STUDENT") return `${t("Quantity", "الكمية")}: ${offer.quantity}`;
  const state = offer.stockCheckedAt ? offer.stockAvailability : null;
  const label = state === "OUT_OF_STOCK" ? t("Unavailable", "غير متاح") : state === "COMING_SOON" ? t("Coming soon", "قريباً") : state === "ON_DEMAND" ? t("Available to order", "متاح للطلب") : offer.stockCheckedAt && offer.quantity != null ? `${offer.quantity} ${t("available", "متاح")}` : state === "IN_STOCK" ? t("Available", "متاح") : t("Availability unknown", "التوفر غير معروف");
  const date = offer.stockCheckedAt ? new Date(offer.stockCheckedAt) : null;
  return `${label} · ${t("Stock last checked", "آخر فحص للتوفر")}: ${date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : t("Unknown", "غير معروف")}`;
}
