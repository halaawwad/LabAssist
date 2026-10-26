import { expect, it } from "vitest";
import { CATALOG_MAP, pinLocal } from "../lib/lab/catalog";

it.each(["relay", "relay-2", "relay-8"])("keeps %s contacts separate from control pins", id => {
  const def = CATALOG_MAP[id]!;
  const count = id === "relay-8" ? 8 : id === "relay-2" ? 2 : 1;
  const contacts = def.pins.filter(pin => /^(NC|COM|NO)/.test(pin.name));
  expect(contacts).toHaveLength(count * 3);
  expect(contacts.every(pin => pin.kind === "passive")).toBe(true);
  const positions = def.pins.map((_, index) => pinLocal(def, index).join(","));
  expect(new Set(positions).size).toBe(def.pins.length);
});

it("preserves the four saved stepper coil indices and adds common supply", () => {
  expect(CATALOG_MAP["stepper"]!.pins.map(pin => pin.name)).toEqual(["COIL_A1", "COIL_A2", "COIL_B1", "COIL_B2", "VCC"]);
  expect(CATALOG_MAP["water-pump"]!.vMax).toBe(12);
});
