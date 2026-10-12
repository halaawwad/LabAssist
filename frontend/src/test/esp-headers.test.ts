import { describe, expect, it } from "vitest";
import { CATALOG_MAP, pinLocal } from "@/lib/lab/catalog";

describe("ESP reference headers", () => {
  it.each([["esp8266", 15], ["esp32", 19]] as const)("provides two complete non-overlapping side headers for %s", (id, rows) => {
    const def = CATALOG_MAP[id]!;
    expect(def.pins).toHaveLength(rows * 2);
    expect(new Set(def.pins.map((_, index) => pinLocal(def, index).join(","))).size).toBe(rows * 2);
    for (const side of ["left", "right"]) {
      expect(def.pins.filter(pin => pin.headerSide === side).map(pin => pin.headerRow).sort((a, b) => a! - b!)).toEqual(Array.from({ length: rows }, (_, i) => i));
    }
  });

  it("uses the reference ESP8266 D-pin mapping and exposes USB power separately", () => {
    const pins = CATALOG_MAP["esp8266"]!.pins;
    expect(pins.find(pin => pin.name === "D1")?.functions).toContain("GPIO5");
    expect(pins.find(pin => pin.name === "D2")?.functions).toContain("GPIO4");
    expect(pins.find(pin => pin.name === "D8")?.functions).toContain("GPIO15");
    expect(pins.find(pin => pin.name === "VUSB")?.voltage).toBe(5);
    expect(pins.find(pin => pin.name === "A0")?.dir).toBe("in");
    expect(pins.slice(0, 10).map(pin => pin.name)).toEqual("3V3 VIN GND A0 D1 D2 D5 D6 D7 D0".split(" "));
  });

  it("keeps ESP32 input-only ADC pins and 3.3V signals separate from 5V power", () => {
    const pins = CATALOG_MAP["esp32"]!.pins;
    for (const name of ["GPIO34", "GPIO35", "GPIO36", "GPIO39"]) {
      expect(pins.find(pin => pin.name === name)?.dir).toBe("in");
      expect(pins.find(pin => pin.name === name)?.voltage).toBe(3.3);
    }
    expect(pins.find(pin => pin.name === "5V")?.voltage).toBe(5);
    expect(pins.slice(0, 19).map(pin => pin.name)).toEqual("3V3 5V GND GPIO21 GPIO22 GPIO34 GPIO35 GPIO18 GPIO19 GPIO23 GPIO25 GPIO26 GPIO27 GPIO32 GPIO33 GPIO5 GPIO16 GPIO17 GPIO4".split(" "));
  });
});
