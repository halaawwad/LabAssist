import { expect, it } from "vitest";
import { CATALOG_MAP, pinLocal } from "../lib/lab/catalog";

it.each([
  ["l298n", 13], ["tb6600", 12], ["uln2003", 11],
  ["esp8266-module", 8], ["rfid-rc522", 8], ["hc05", 6], ["nrf24l01", 8],
] as const)("provides distinct connection targets for all %s pins", (id, count) => {
  const def = CATALOG_MAP[id]!;
  expect(def.pins).toHaveLength(count);
  expect(new Set(def.pins.map((_, i) => pinLocal(def, i).join(","))).size).toBe(count);
});

it("keeps ESP-01 saved wire indices and uses the reference 2×4 header", () => {
  const def = CATALOG_MAP["esp8266-module"]!;
  expect(def.pins.slice(0, 6).map(pin => pin.name)).toEqual(["VCC", "GND", "TX", "RX", "GPIO0", "GPIO2"]);
  const positions = def.pins.map((_, i) => pinLocal(def, i));
  expect(new Set(positions.map(p => p[0])).size).toBe(2);
  expect(new Set(positions.map(p => p[2])).size).toBe(4);
});
