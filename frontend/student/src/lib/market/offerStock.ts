import type { PublicOffer } from "./client";
import { formatDate } from "./format";

export function offerStock(offer: PublicOffer): string {
  if (offer.seller.kind === "STUDENT") return `${offer.quantity} available`;
  const state = offer.stockCheckedAt ? offer.stockAvailability : null;
  const label = state === "OUT_OF_STOCK" ? "Unavailable" : state === "COMING_SOON" ? "Coming soon" : state === "ON_DEMAND" ? "Available to order" : offer.stockCheckedAt && offer.quantity != null ? `${offer.quantity} available` : state === "IN_STOCK" ? "Available" : "Availability unknown";
  const checked = formatDate(offer.stockCheckedAt ?? null);
  return `${label} · stock last checked ${checked || "unknown"}`;
}
