import { describe, expect, it } from "vitest";
import { CATALOG, pinLocal } from "../lib/lab/catalog";

describe("reference sensor connectors", () => {
  it.each([
    ["mq2", ["AO", "DO", "GND", "VCC"], 2],
    ["ldr", ["VCC", "DO", "GND", "AO"], 2],
    ["soil", ["AO", "DO", "GND", "VCC"], 0],
    ["water-level", ["SIG", "VCC", "GND"], 0],
  ] as const)("places %s pins in reference order while preserving saved wire indices", (id, order, axis) => {
    const def = CATALOG.find(part => part.id === id)!;
    expect(def.pins.map(pin => pin.name)).toEqual(id === "water-level" ? ["VCC", "GND", "SIG"] : ["VCC", "GND", "AO", "DO"]);
    const positions = order.map(name => pinLocal(def, def.pins.findIndex(pin => pin.name === name)));
    for (let i = 1; i < positions.length; i++) expect(positions[i]![axis]).toBeGreaterThan(positions[i - 1]![axis]);
    expect(new Set(positions.map(position => position.join(","))).size).toBe(order.length);
  });
});
