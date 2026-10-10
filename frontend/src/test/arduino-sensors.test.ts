import { describe, expect, it } from "vitest";
import { CATALOG_MAP, pinLocal } from "@/lib/lab/catalog";

describe("Arduino and sensor reference layouts", () => {
  it("exposes the Nano's 30 header pins including input-only A6 and A7", () => {
    const nano = CATALOG_MAP["arduino-nano"]!;
    expect(nano.pins).toHaveLength(30);
    expect(nano.pins.find(p => p.name === "A6")?.dir).toBe("in");
    expect(nano.pins.find(p => p.name === "A7")?.dir).toBe("in");
    expect(nano.pins.slice(0, 25).map(p => p.name)).toEqual("D0 D1 D2 D3 D4 D5 D6 D7 D8 D9 D10 D11 D12 D13 A0 A1 A2 A3 A4 A5 5V 3V3 GND1 GND2 VIN".split(" "));
  });
  it("provides all 54 Mega digital pins and 16 analog channels", () => {
    const mega = CATALOG_MAP["arduino-mega"]!;
    expect(mega.pins.filter(p => /^D\d+$/.test(p.name))).toHaveLength(54);
    expect(mega.pins.filter(p => /^A\d+$/.test(p.name))).toHaveLength(16);
    expect(mega.pins.find(p => p.name === "D50")?.functions).toBe("MISO");
    expect(mega.pins.find(p => p.name === "D20")?.kind).toBe("sda");
    expect(mega.pins.find(p => p.name === "D21")?.kind).toBe("scl");
  });
  it.each(["arduino-nano", "arduino-mega", "hc-sr04", "dht11", "dht22"])("keeps all %s wire targets separate", id => {
    const def = CATALOG_MAP[id]!;
    const positions = def.pins.map((_, i) => pinLocal(def, i));
    expect(new Set(positions.map(p => p.join(","))).size).toBe(def.pins.length);
  });
  it("retains the reference sensor connector order", () => {
    expect(CATALOG_MAP["hc-sr04"]!.pins.map(p => p.name)).toEqual(["VCC", "TRIG", "ECHO", "GND"]);
    for (const id of ["dht11", "dht22"]) expect(CATALOG_MAP[id]!.pins.map(p => p.name)).toEqual(["VCC", "DATA", "GND"]);
  });
});
