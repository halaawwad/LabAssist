import { describe, expect, it } from "vitest";
import type { PublicOffer } from "@/lib/market/client";
import { offerStock } from "@/lib/market/offerStock";

describe("shop offer stock", () => {
  const offer = {
    seller: { kind: "SHOP" },
    quantity: 7,
    stockAvailability: "IN_STOCK",
    stockCheckedAt: "2026-11-25T12:00:00Z",
  } as PublicOffer;
  it("shows verified counts and boolean availability with a check date", () => {
    expect(offerStock(offer)).toMatch(/^7 available · stock last checked /);
    expect(offerStock({ ...offer, quantity: null })).toMatch(/^Available · stock last checked /);
    expect(offerStock({ ...offer, quantity: null, stockAvailability: "OUT_OF_STOCK" })).toMatch(
      /^Unavailable · stock last checked /,
    );
  });
  it("does not trust legacy quantities or invent unknown stock", () => {
    expect(offerStock({ ...offer, stockCheckedAt: null })).toBe(
      "Availability unknown · stock last checked unknown",
    );
    expect(offerStock({ ...offer, quantity: null, stockAvailability: "UNKNOWN" })).toMatch(
      /^Availability unknown/,
    );
    expect(offerStock({ ...offer, seller: { ...offer.seller, kind: "STUDENT" } })).toBe(
      "7 available",
    );
  });
});
