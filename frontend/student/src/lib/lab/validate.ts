import { CATALOG_MAP, placedDefinition, type PinDef } from "./catalog";
import type { CircuitData } from "./types";

export type IssueType =
  | "Missing Power"
  | "Missing Ground"
  | "Wrong Pin Type"
  | "Voltage Over Limit"
  | "Current Over Limit"
  | "Short Circuit"
  | "Too Many Connections"
  | "Compatibility Warning";

export interface Issue {
  type: IssueType;
  severity: "error" | "warning";
  message: string;
  partIds: string[];
  wireIds: string[];
}

export interface ValidationResult {
  issues: Issue[];
  okWires: number;
  badWires: number;
}

const key = (partId: string, pin: number) => `${partId}:${pin}`;
const SIGNAL = new Set(["digital", "analog", "pwm", "sda", "scl", "tx", "rx", "spi"]);

export function validate(data: CircuitData): ValidationResult {
  const issues: Issue[] = [];
  const partById = new Map(data.parts.map((p) => [p.id, p]));
  const pinDef = (k: string): PinDef | undefined => {
    const [pid = "", i = "0"] = k.split(":");
    const part = partById.get(pid);
    return part ? placedDefinition(part).pins[+i] : undefined;
  };
  const partName = (pid: string) => CATALOG_MAP[partById.get(pid)?.type ?? ""]?.name ?? "Part";
  const label = (k: string) => `${partName(k.split(":")[0]!)} · ${pinDef(k)?.name}`;

  // union-find nets
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    if (!parent.has(k)) parent.set(k, k);
    const p = parent.get(k)!;
    if (p === k) return k;
    const r = find(p);
    parent.set(k, r);
    return r;
  };
  const degree = new Map<string, number>();
  const badWire = new Set<string>();
  const wires = data.wires.filter((w) => partById.has(w.from.partId) && partById.has(w.to.partId));
  // Breadboard strips and rails conduct without an explicit wire between holes.
  for (const part of data.parts) {
    const buses = new Map<string, string>();
    placedDefinition(part).pins.forEach((pin, i) => {
      if (!pin.internalNet) return;
      const k = key(part.id, i), first = buses.get(pin.internalNet);
      if (first) parent.set(find(k), find(first));
      else { buses.set(pin.internalNet, k); find(k); }
    });
  }

  for (const w of wires) {
    const a = key(w.from.partId, w.from.pin);
    const b = key(w.to.partId, w.to.pin);
    parent.set(find(a), find(b));
    degree.set(a, (degree.get(a) ?? 0) + 1);
    degree.set(b, (degree.get(b) ?? 0) + 1);
  }

  const nets = new Map<string, string[]>();
  for (const k of parent.keys()) {
    const r = find(k);
    if (!nets.has(r)) nets.set(r, []);
    nets.get(r)!.push(k);
  }
  const wiresOfNet = (r: string) =>
    wires.filter((w) => find(key(w.from.partId, w.from.pin)) === r).map((w) => w.id);

  // per-wire pin type checks
  for (const w of wires) {
    const a = key(w.from.partId, w.from.pin);
    const b = key(w.to.partId, w.to.pin);
    const pa = pinDef(a)!;
    const pb = pinDef(b)!;
    const ids = { partIds: [w.from.partId, w.to.partId], wireIds: [w.id] };
    const kinds = [pa.kind, pb.kind].sort().join("-");
    if (w.from.partId === w.to.partId && w.from.pin === w.to.pin) continue;
    if (pa.kind === "passive" || pb.kind === "passive") continue;

    if ((pa.kind === "power" && SIGNAL.has(pb.kind)) || (pb.kind === "power" && SIGNAL.has(pa.kind))) {
      issues.push({ type: "Wrong Pin Type", severity: "error", message: `Power pin wired to signal pin: ${label(a)} → ${label(b)}`, ...ids });
      badWire.add(w.id);
    } else if ((pa.kind === "ground" && SIGNAL.has(pb.kind)) || (pb.kind === "ground" && SIGNAL.has(pa.kind))) {
      issues.push({ type: "Wrong Pin Type", severity: "error", message: `Ground wired to signal pin: ${label(a)} → ${label(b)}`, ...ids });
      badWire.add(w.id);
    } else if (kinds === "scl-sda") {
      issues.push({ type: "Wrong Pin Type", severity: "error", message: `SDA wired to SCL: ${label(a)} → ${label(b)}`, ...ids });
      badWire.add(w.id);
    } else if ((pa.kind === "tx" && pb.kind === "tx") || (pa.kind === "rx" && pb.kind === "rx")) {
      issues.push({ type: "Wrong Pin Type", severity: "error", message: `UART needs TX → RX crossover: ${label(a)} → ${label(b)}`, ...ids });
      badWire.add(w.id);
    } else if ((pa.kind === "sda" || pa.kind === "scl") !== (pb.kind === "sda" || pb.kind === "scl") && SIGNAL.has(pa.kind) && SIGNAL.has(pb.kind)) {
      issues.push({ type: "Compatibility Warning", severity: "warning", message: `I2C pin wired to non-I2C pin: ${label(a)} → ${label(b)}`, ...ids });
    } else if ((pa.kind === "pwm" && pa.dir === "in" && pb.kind === "digital") || (pb.kind === "pwm" && pb.dir === "in" && pa.kind === "digital")) {
      issues.push({ type: "Compatibility Warning", severity: "warning", message: `PWM input on a non-PWM pin: ${label(a)} → ${label(b)}`, ...ids });
    } else if ((pa.kind === "analog" && pa.dir === "out" && pb.kind !== "analog" && SIGNAL.has(pb.kind)) || (pb.kind === "analog" && pb.dir === "out" && pa.kind !== "analog" && SIGNAL.has(pa.kind))) {
      issues.push({ type: "Compatibility Warning", severity: "warning", message: `Analog output read by a digital pin: ${label(a)} → ${label(b)}`, ...ids });
    } else if ((pa.kind === "motor") !== (pb.kind === "motor") && (SIGNAL.has(pa.kind) || SIGNAL.has(pb.kind))) {
      issues.push({ type: "Current Over Limit", severity: "error", message: `Motor driven directly from a GPIO pin (needs a driver): ${label(a)} → ${label(b)}`, ...ids });
      badWire.add(w.id);
    }
    // logic level mismatch
    if (SIGNAL.has(pa.kind) && SIGNAL.has(pb.kind) && pa.voltage && pb.voltage && Math.abs(pa.voltage - pb.voltage) > 1 && !(pa.voltage < 3.5 && pb.voltage < 3.5)) {
      const high = Math.max(pa.voltage, pb.voltage);
      const low = Math.min(pa.voltage, pb.voltage);
      if (low >= 3) {
        issues.push({ type: "Compatibility Warning", severity: "warning", message: `Logic level mismatch ${high}V ↔ ${low}V (use a level shifter): ${label(a)} → ${label(b)}`, ...ids });
      }
    }
  }

  // net-level checks
  for (const [r, members] of nets) {
    const defs = members.map((k) => ({ k, d: pinDef(k)! }));
    const sources = defs.filter((x) => x.d.kind === "power" && x.d.dir === "out");
    const grounds = defs.filter((x) => x.d.kind === "ground");
    const netWires = wiresOfNet(r);
    const partIds = [...new Set(members.map((m) => m.split(":")[0]!))];

    if (sources.length && grounds.length) {
      issues.push({ type: "Short Circuit", severity: "error", message: `Power source ${label(sources[0]!.k)} shorted directly to ground`, partIds, wireIds: netWires });
      netWires.forEach((id) => badWire.add(id));
    }
    const volts = [...new Set(sources.map((s) => s.d.voltage))];
    if (volts.length > 1) {
      issues.push({ type: "Short Circuit", severity: "error", message: `Different supply voltages tied together (${volts.join("V, ")}V)`, partIds, wireIds: netWires });
      netWires.forEach((id) => badWire.add(id));
    }
    if (sources.length) {
      const v = Math.max(...sources.map((s) => s.d.voltage ?? 0));
      const avail = sources.reduce((s, x) => s + (x.d.maxCurrent ?? 0), 0);
      let load = 0;
      for (const x of defs) {
        if (x.d.kind !== "power" || x.d.dir !== "in") continue;
        const pid = x.k.split(":")[0]!;
        const def = placedDefinition(partById.get(pid)!);
        load += def.draw;
        if (v > def.vMax + 0.1) {
          issues.push({ type: "Voltage Over Limit", severity: "error", message: `${def.name} gets ${v}V but tolerates max ${def.vMax}V`, partIds: [pid], wireIds: netWires });
          netWires.forEach((id) => badWire.add(id));
        }
      }
      if (avail && load > avail) {
        issues.push({ type: "Current Over Limit", severity: "error", message: `Load ${load}mA exceeds ${avail}mA available from ${label(sources[0]!.k)}`, partIds, wireIds: netWires });
      }
    }
    // signals driven at higher voltage than a part's limit (e.g. LED straight to 5V GPIO)
    for (const x of defs) {
      if (!SIGNAL.has(x.d.kind) || x.d.dir !== "in" || !x.d.voltage) continue;
      const drivers = defs.filter((y) => y !== x && SIGNAL.has(y.d.kind) && y.d.dir !== "in" && (y.d.voltage ?? 0) > x.d.voltage! + 0.5);
      if (drivers.length) {
        const pid = x.k.split(":")[0]!;
        issues.push({ type: "Voltage Over Limit", severity: "error", message: `${label(x.k)} rated ${x.d.voltage}V, driven at ${drivers[0]!.d.voltage}V — add a resistor`, partIds: [pid, drivers[0]!.k.split(":")[0]!], wireIds: netWires });
        netWires.forEach((id) => badWire.add(id));
      }
    }
  }

  // too many connections
  for (const [k, n] of degree) {
    const d = pinDef(k)!;
    const limit = d.kind === "power" || d.kind === "ground" ? 6 : d.kind === "sda" || d.kind === "scl" ? 4 : 2;
    if (n > limit) {
      issues.push({ type: "Too Many Connections", severity: "warning", message: `${label(k)} has ${n} wires (max ${limit})`, partIds: [k.split(":")[0]!], wireIds: [] });
    }
  }

  // missing power / ground per part
  for (const part of data.parts) {
    const def = placedDefinition(part);
    if (!def || def.category === "Passive & Input") continue;
    const pk = def.pins.map((p, i) => ({ p, k: key(part.id, i) }));
    const needsPower = pk.filter((x) => x.p.kind === "power" && x.p.dir === "in");
    const isSource = pk.some((x) => x.p.kind === "power" && x.p.dir === "out");
    const grounds = pk.filter((x) => x.p.kind === "ground");
    const powered = (x: { k: string }) => {
      if (!parent.has(x.k)) return false;
      const net = nets.get(find(x.k)) ?? [];
      return net.some((m) => {
        const d = pinDef(m)!;
        return d.kind === "power" && d.dir === "out";
      });
    };
    if (needsPower.length && !isSource && !needsPower.some(powered)) {
      issues.push({ type: "Missing Power", severity: "error", message: `${def.name} has no power connection (${needsPower.map((x) => x.p.name).join("/")})`, partIds: [part.id], wireIds: [] });
    }
    if (needsPower.length && isSource && def.category !== "Microcontrollers" && !needsPower.some(powered)) {
      issues.push({ type: "Missing Power", severity: "error", message: `${def.name} input is not powered`, partIds: [part.id], wireIds: [] });
    }
    if (grounds.length && !grounds.some((g) => parent.has(g.k) && (nets.get(find(g.k))?.length ?? 0) > 1)) {
      issues.push({ type: "Missing Ground", severity: "error", message: `${def.name} ground is not connected`, partIds: [part.id], wireIds: [] });
    }
  }

  return { issues, okWires: wires.length - badWire.size, badWires: badWire.size };
}
