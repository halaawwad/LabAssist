import { describe, expect, it } from "vitest";
import { CATALOG_MAP, pinLocal } from "@/lib/lab/catalog";

const pi = CATALOG_MAP["raspberry-pi-4"]!;
const physical = (number: number) => pi.pins.find(pin => pin.physicalNumber === number)!;

describe("Raspberry Pi J8 header", () => {
  it("provides all forty physical pins with the standard power and ground layout", () => {
    expect(pi.pins).toHaveLength(40);
    expect(new Set(pi.pins.map(pin => pin.physicalNumber)).size).toBe(40);
    for (const number of [2, 4]) expect(physical(number).voltage).toBe(5);
    for (const number of [1, 17]) expect(physical(number).voltage).toBe(3.3);
    for (const number of [6, 9, 14, 20, 25, 30, 34, 39]) expect(physical(number).kind).toBe("ground");
    expect(physical(3).kind).toBe("sda");
    expect(physical(5).kind).toBe("scl");
    expect(physical(40).name).toBe("GPIO21");
  });

  it("preserves the signal identities of existing saved wire indices", () => {
    expect(pi.pins.slice(0, 11).map(pin => pin.name)).toEqual([
      "3V3", "5V", "GND", "GPIO2_SDA", "GPIO3_SCL", "GPIO17", "GPIO27", "GPIO22", "GPIO10_MOSI", "GPIO9_MISO", "GPIO11_SCLK",
    ]);
  });

  it("places odd and even pins in two aligned columns without overlapping targets", () => {
    const positions = pi.pins.map((_, index) => pinLocal(pi, index));
    expect(new Set(positions.map(position => position.join(","))).size).toBe(40);
    const first = pinLocal(pi, pi.pins.indexOf(physical(1)));
    const second = pinLocal(pi, pi.pins.indexOf(physical(2)));
    const third = pinLocal(pi, pi.pins.indexOf(physical(3)));
    expect(first[2]).toBe(second[2]);
    expect(first[0]).toBe(third[0]);
    expect(first[0]).toBeLessThan(second[0]);
    expect(first[2]).toBeLessThan(third[2]);
  });
});
