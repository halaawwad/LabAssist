import type { CircuitData } from "@/lib/lab/types";

export const previewKit = [
  "power-source",
  "resistor-variable",
  "led-red",
  "led-green",
  "ldr-bare",
  "power-switch",
];
export function starterCircuit(sensor = false): CircuitData {
  const parts: CircuitData["parts"] = [
    { id: "supply", type: "power-source", x: -3, z: -1.5, rot: 0, voltage: 5 },
    { id: "resistor", type: "resistor-variable", x: 0, z: -1.5, rot: 0, resistance: 470 },
    { id: "led", type: "led-red", x: 2.6, z: 1, rot: 0 },
  ];
  if (sensor) parts.push({ id: "sensor", type: "ldr-bare", x: -1, z: 2, rot: 0 });
  const pairs: [string, number, string, number, string][] = [
    ["supply", 0, "resistor", 0, "#bc6c64"],
    ["resistor", 1, "led", 0, "#ab8ab7"],
    ["led", 1, sensor ? "sensor" : "supply", sensor ? 0 : 1, "#557f9c"],
  ];
  if (sensor) pairs.push(["sensor", 1, "supply", 1, "#4c6868"]);
  return {
    parts,
    wires: pairs.map(([a, ap, b, bp, color], i) => ({
      id: `wire-${i}`,
      from: { partId: a, pin: ap },
      to: { partId: b, pin: bp },
      type: "power",
      color,
    })),
  };
}
/** Deliberately bounded DC model: one source and one series loop, no firmware or parallel networks. */
export function simulatePreview(data: CircuitData, light: number) {
  const off = (message: string) => ({
    ok: false,
    message,
    current: 0,
    brightness: 0,
    ledId: undefined as string | undefined,
    voltage: 0,
    resistance: 0,
  });
  if (data.parts.some((p) => !previewKit.includes(p.type)))
    return off("This experiment supports the parts in the kit only.");
  const sources = data.parts.filter((p) => p.type === "power-source");
  if (sources.length !== 1) return off("Use one power source for this series experiment.");
  const parent = new Map<string, string>();
  const key = (id: string, pin: number) => `${id}:${pin}`;
  const root = (v: string): string => {
    const next = parent.get(v);
    if (!next) {
      parent.set(v, v);
      return v;
    }
    if (next === v) return v;
    const r = root(next);
    parent.set(v, r);
    return r;
  };
  for (const w of data.wires) {
    if (
      !data.parts.some((p) => p.id === w.from.partId) ||
      !data.parts.some((p) => p.id === w.to.partId)
    )
      return off("A wire has a missing endpoint.");
    parent.set(root(key(w.from.partId, w.from.pin)), root(key(w.to.partId, w.to.pin)));
  }
  const source = sources[0]!,
    start = root(key(source.id, 0)),
    end = root(key(source.id, 1));
  if (start === end) return off("Short circuit: disconnect the direct path between + and −.");
  const edges = data.parts
    .filter((p) => p.id !== source.id)
    .map((part) => ({ part, a: root(key(part.id, 0)), b: root(key(part.id, 1)) }));
  if (edges.some((e) => e.a === e.b))
    return off("A component is bypassed by a wire. Check its two terminals.");
  const degree = new Map<string, number>();
  for (const e of edges) for (const n of [e.a, e.b]) degree.set(n, (degree.get(n) ?? 0) + 1);
  if ([...degree].some(([n, d]) => d > (n === start || n === end ? 1 : 2)))
    return off("Keep one series loop here; parallel branches are not supported in this preview.");
  const used = new Set<string>();
  let node = start,
    resistance = 0,
    ledId: string | undefined,
    drop = 0;
  while (node !== end) {
    const edge = edges.find((e) => !used.has(e.part.id) && (e.a === node || e.b === node));
    if (!edge) return off("Open circuit: connect a complete path back to the battery − terminal.");
    used.add(edge.part.id);
    const p = edge.part;
    if (p.type === "power-switch" && p.enabled === false)
      return off("Switch is open. Stop the experiment and close it to complete the loop.");
    if (p.type.startsWith("led-")) {
      if (edge.a !== node) return off("The LED is reversed. Connect its anode toward battery +.");
      if (ledId) return off("Use one LED in this experiment.");
      ledId = p.id;
      drop = p.type === "led-green" ? 2.4 : 2.2;
    }
    if (p.type === "resistor-variable") resistance += p.resistance ?? 470;
    if (p.type === "ldr-bare")
      resistance += 500 * Math.pow(10, 3 * (1 - Math.max(0, Math.min(100, light)) / 100));
    node = edge.a === node ? edge.b : edge.a;
  }
  if (used.size !== edges.length)
    return off("Connect all kit parts into the same series loop, or remove unused parts.");
  if (!ledId) return off("Add an LED to observe this experiment.");
  if (!data.parts.some((p) => p.type === "resistor-variable" && used.has(p.id)))
    return off("Add a current-limiting resistor before running the LED.");
  const voltage = source.voltage ?? 5;
  if (!Number.isFinite(voltage) || voltage <= 0 || !Number.isFinite(resistance) || resistance <= 0)
    return off("Set a positive voltage and resistance.");
  const current = Math.max(0, ((voltage - drop) / resistance) * 1000);
  if (current > 20)
    return off("LED current exceeds 20 mA. Increase resistance or reduce the supply voltage.");
  return {
    ok: true,
    message:
      current > 0.1
        ? "Complete loop. Your LED is responding to the circuit."
        : "Complete loop. Current is too low for a visible LED glow.",
    current,
    brightness: Math.min(1, current / 6),
    ledId,
    voltage,
    resistance,
  };
}
