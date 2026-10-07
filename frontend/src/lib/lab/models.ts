// Procedural, realistic-looking 3D models for each catalog part (vanilla Three.js).
// Origin = part center on the ground (y = 0). Pins are added separately by the engine
// at pinLocal() positions, so models keep their pin rows near the top edges.
import * as THREE from "three";
import { pinLocal, type PartDef } from "./catalog";

const std = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...o });
const metal = (color = "#c8ccd0") => std(color, { metalness: 0.9, roughness: 0.28 });
const plastic = (color: string) => std(color, { roughness: 0.42 });
const glass = (color: string, opacity = 0.7) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, transmission: 0.4, transparent: true, opacity, emissive: color, emissiveIntensity: 0.25 });

type V3 = [number, number, number];

class B {
  g = new THREE.Group();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, pos: V3, rot: V3 = [0, 0, 0]) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.castShadow = m.receiveShadow = true;
    m.raycast = () => {};
    this.g.add(m);
    return m;
  }
  box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, rot?: V3) {
    return this.add(new THREE.BoxGeometry(w, h, d), mat, [x, y + h / 2, z], rot);
  }
  cyl(r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 24, rTop = r) {
    return this.add(new THREE.CylinderGeometry(rTop, r, h, seg), mat, [x, y + h / 2, z]);
  }
  /** cylinder lying along X */
  cylX(r: number, len: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 24) {
    return this.add(new THREE.CylinderGeometry(r, r, len, seg), mat, [x, y, z], [0, 0, Math.PI / 2]);
  }
  /** cylinder lying along Z */
  cylZ(r: number, len: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 24) {
    return this.add(new THREE.CylinderGeometry(r, r, len, seg), mat, [x, y, z], [Math.PI / 2, 0, 0]);
  }
}

const PCB_T = 0.06;

/** Printed details use local canvas textures, so models need no external assets. */
function printSurface(b: B, width: number, depth: number, x: number, y: number, z: number, draw: (ctx: CanvasRenderingContext2D) => void, resolution: [number, number] = [512, 256]) {
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = resolution[0];
  canvas.height = resolution[1];
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  draw(ctx);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  b.add(new THREE.PlaneGeometry(width, depth), material, [x, y, z], [-Math.PI / 2, 0, 0]);
}

function marking(b: B, text: string, width: number, depth: number, x: number, y: number, z: number, color = "#ecf2ef", fontSize = 56) {
  printSurface(b, width, depth, x, y, z, (ctx) => {
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 128, 490);
  });
}

function meshCap(b: B, radius: number, x: number, y: number, z: number) {
  b.cyl(radius, 0.008, std("#38414a", { roughness: 0.85 }), x, y, z, 40);
  printSurface(b, radius * 1.85, radius * 1.85, x, y + 0.009, z, (ctx) => {
    ctx.strokeStyle = "#bfc8ce";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 18) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    }
    for (let i = 0; i <= 256; i += 12) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
  });
  b.add(new THREE.TorusGeometry(radius * 0.99, 0.02, 8, 40), metal("#c1c9ce"), [x, y + 0.015, z], [Math.PI / 2, 0, 0]);
}

function pcb(b: B, w: number, d: number, color: string, holes = true, mountingPositions?: readonly (readonly [number, number])[]) {
  const mounts = mountingPositions ?? [[-w / 2 + 0.12, -d / 2 + 0.12], [w / 2 - 0.12, -d / 2 + 0.12], [-w / 2 + 0.12, d / 2 - 0.12], [w / 2 - 0.12, d / 2 - 0.12]] as const;
  const shape = new THREE.Shape();
  const r = Math.min(w, d) * 0.045;
  shape.moveTo(-w / 2 + r, -d / 2);
  shape.lineTo(w / 2 - r, -d / 2);
  shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  shape.lineTo(w / 2, d / 2 - r);
  shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  shape.lineTo(-w / 2 + r, d / 2);
  shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  shape.lineTo(-w / 2, -d / 2 + r);
  shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  if (holes && w > 0.9 && d > 0.7) {
    for (const [x, z] of mounts) {
      const hole = new THREE.Path();
      hole.absarc(x, -z, mountingPositions ? 0.065 : 0.045, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
  }
  b.add(new THREE.ExtrudeGeometry(shape, { depth: PCB_T, bevelEnabled: false, curveSegments: 10 }), std(color, { roughness: 0.65 }), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  if (holes && w > 0.9 && d > 0.7) {
    const ring = metal("#d4b45a");
    for (const [x, z] of mounts) {
      b.add(new THREE.TorusGeometry(mountingPositions ? 0.085 : 0.06, 0.02, 6, 24), ring, [x, PCB_T + 0.005, z], [Math.PI / 2, 0, 0]);
    }
  }
}

/** Black female/male header strips under every pin row. */
function headers(b: B, def: PartDef, _top?: number) {
  const top = 0.2;
  const rows = new Map<number, number[]>();
  def.pins.forEach((_, i) => {
    const [x, , z] = pinLocal(def, i);
    rows.set(z, [...(rows.get(z) ?? []), x]);
  });
  const mat = plastic("#1b1d1f");
  for (const [z, xs] of rows) {
    const min = Math.min(...xs) - 0.1;
    const max = Math.max(...xs) + 0.1;
    const h = Math.max(0.05, top - PCB_T);
    b.box(max - min, h, 0.16, mat, (min + max) / 2, PCB_T, z);
    for (const x of xs) {
      b.box(0.065, 0.006, 0.065, plastic("#080a0b"), x, top, z);
      b.box(0.035, 0.09, 0.035, metal("#c7ae66"), x, top + 0.005, z);
    }
  }
}

function chip(b: B, w: number, d: number, x = 0, z = 0, legs = true, color = "#18191b") {
  b.box(w, 0.07, d, plastic(color), x, PCB_T, z);
  b.cyl(0.025, 0.004, std("#444"), x - w / 2 + 0.07, PCB_T + 0.07, z - d / 2 + 0.07, 10);
  if (!legs) return;
  const n = Math.max(2, Math.round(w / 0.1));
  const lm = metal();
  for (let i = 0; i < n; i++) {
    const lx = x - w / 2 + (w / (n - 1)) * i * 0.9 + w * 0.05;
    b.box(0.03, 0.02, 0.08, lm, lx, PCB_T, z + d / 2 + 0.02);
    b.box(0.03, 0.02, 0.08, lm, lx, PCB_T, z - d / 2 - 0.02);
  }
}

function usbPort(b: B, x: number, z: number, w = 0.45, d = 0.5, h = 0.32, rotY = 0) {
  const m = b.box(w, h, d, metal("#b8bec4"), x, PCB_T, z);
  m.rotation.y = rotY;
}
function smd(b: B, x: number, z: number, color = "#7a5a3a") {
  b.box(0.08, 0.03, 0.05, std(color), x, PCB_T, z);
}
function terminal(b: B, n: number, x: number, z: number, color = "#2f6fd6") {
  const w = n * 0.2;
  b.box(w, 0.28, 0.32, plastic(color), x, PCB_T, z);
  for (let i = 0; i < n; i++) {
    const sx = x - w / 2 + 0.1 + i * 0.2;
    b.cyl(0.055, 0.012, metal(), sx, PCB_T + 0.28, z, 16);
    b.box(0.08, 0.003, 0.012, plastic("#28323a"), sx, PCB_T + 0.292, z);
    b.box(0.115, 0.11, 0.009, plastic("#162a2e"), sx, PCB_T + 0.05, z + 0.165);
  }
}
function legsDown(b: B, def: PartDef, from: number) {
  // metal leads from the body's front-bottom out to each pin
  const lm = metal("#d0d4d8");
  def.pins.forEach((_, i) => {
    const [x, y, z] = pinLocal(def, i);
    const a = new THREE.Vector3(x * 0.6, Math.max(from, 0.05), Math.min(z - 0.2, def.d / 2 - 0.05));
    const c = new THREE.Vector3(x, y, z);
    const len = a.distanceTo(c);
    const m = b.add(new THREE.CylinderGeometry(0.02, 0.02, len, 6), lm, [(a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize());
  });
}

// ---------------------------------------------------------------- builders
function microcontroller(b: B, def: PartDef) {
  const { w, d, id } = def;
  if (id === "arduino-nano" || id === "arduino-mega") {
    arduinoReferenceBoard(b, def);
    return;
  }
  if (id === "arduino-uno") {
    arduinoUno(b, def);
    return;
  }
  if (id === "raspberry-pi-4") {
    raspberryPi(b, def);
    return;
  }
  if (id === "esp32" || id === "esp8266") {
    espDevelopmentBoard(b, def);
    return;
  }
  const color = id.startsWith("arduino") ? "#087e95" : id === "raspberry-pi-4" ? "#23854c" : "#1c1f24";
  pcb(b, w, d, color);
  headers(b, def);
  if (id === "arduino-uno" || id === "arduino-mega") {
    usbPort(b, -w / 2 + 0.3, -0.35, 0.65, 0.5, 0.42);
    b.box(0.55, 0.42, 0.35, plastic("#121212"), -w / 2 + 0.32, PCB_T, 0.45); // barrel jack
    b.cylX(0.1, 0.1, std("#000"), -w / 2 + 0.03, PCB_T + 0.22, 0.45);
    chip(b, id === "arduino-mega" ? 0.9 : 1.6, id === "arduino-mega" ? 0.9 : 0.36, 0.5, 0.25); // ATmega
    chip(b, 0.35, 0.35, -0.55, -0.4); // USB chip
    b.box(0.3, 0.1, 0.12, metal("#d8dde2"), -0.2, PCB_T, 0.15); // crystal
    b.box(0.2, 0.08, 0.2, plastic("#e6e6e6"), -w / 2 + 0.95, PCB_T, -0.75); // reset btn
    b.cyl(0.06, 0.04, plastic("#d33"), -w / 2 + 0.95, PCB_T + 0.08, -0.75, 12);
    for (let i = 0; i < 6; i++) smd(b, -0.9 + i * 0.12, 0.65);
    b.cyl(0.11, 0.24, std("#2b2b2b"), -0.95, PCB_T, 0.6, 16); // capacitors
    b.cyl(0.11, 0.24, std("#2b2b2b"), -0.95, PCB_T, 0.95, 16);
  } else if (id === "arduino-nano") {
    usbPort(b, -w / 2 + 0.2, 0, 0.35, 0.3, 0.18);
    chip(b, 0.35, 0.35, 0.3, 0, true);
    b.box(0.14, 0.08, 0.14, plastic("#eee"), -0.3, PCB_T, 0);
    marking(b, "NANO", 0.45, 0.13, 0.88, PCB_T + 0.006, 0);
  } else if (id === "esp32" || id === "esp8266") {
    b.box(1.1, 0.12, 0.7, metal("#c9ced3"), 0.45, PCB_T, 0); // RF shield
    b.box(0.5, 0.02, 0.7, std("#1d3b2c"), w / 2 - 0.27, PCB_T + 0.04, 0); // antenna board
    for (let i = 0; i < 4; i++) b.box(0.03, 0.005, 0.5, metal("#d4b45a"), w / 2 - 0.45 + i * 0.1, PCB_T + 0.06, 0);
    usbPort(b, -w / 2 + 0.18, 0, 0.3, 0.32, 0.15);
    b.box(0.14, 0.08, 0.14, plastic("#eee"), -w / 2 + 0.45, PCB_T, 0.18);
    b.box(0.14, 0.08, 0.14, plastic("#eee"), -w / 2 + 0.45, PCB_T, -0.18);
    marking(b, id === "esp32" ? "ESP-WROOM-32" : "ESP8266", 0.85, 0.17, 0.4, PCB_T + 0.123, 0, "#536067");
  }
}

function arduinoReferenceBoard(b: B, def: PartDef) {
  const nano = def.id === "arduino-nano";
  const silver = metal("#c5cdd1");
  const dark = plastic("#171e22");
  pcb(b, def.w, def.d, "#087b97");
  def.pins.forEach((pin, i) => {
    const [x, y, z] = pinLocal(def, i);
    if (nano) {
      b.add(new THREE.TorusGeometry(0.036, 0.012, 6, 16), silver, [x, PCB_T + 0.004, z], [Math.PI / 2, 0, 0]);
      b.box(0.025, 0.14, 0.025, silver, x, PCB_T, z);
    } else {
      b.box(0.125, 0.17, 0.125, dark, x, PCB_T, z);
      b.box(0.054, 0.006, 0.054, plastic("#020406"), x, y, z);
    }
    const bottom = !nano && z > 2;
    marking(b, pin.label ?? pin.name, nano ? 0.12 : 0.18, 0.065, bottom ? x : x + (x < 0 ? 0.15 : -0.15), PCB_T + 0.004, bottom ? z - 0.2 : z, "#edf2f4", 140);
  });
  // USB socket at the top, with its opening and plastic tongue.
  const usbX = nano ? 0 : 0.61;
  const usbZ = -def.d / 2 + 0.12;
  b.box(nano ? 0.4 : 0.59, nano ? 0.25 : 0.4, nano ? 0.48 : 0.64, silver, usbX, PCB_T, usbZ);
  b.box(nano ? 0.28 : 0.43, 0.14, 0.009, dark, usbX, PCB_T + 0.03, usbZ - (nano ? 0.245 : 0.325));
  const mcu = b.box(nano ? 0.35 : 0.88, 0.065, nano ? 0.35 : 0.88, dark, 0, PCB_T, nano ? -0.18 : -0.03);
  if (nano) mcu.rotation.y = Math.PI / 4;
  for (const side of [-1, 1]) for (let i = 0; i < (nano ? 8 : 20); i++) {
    const span = nano ? 0.34 : 0.84;
    const offset = -span / 2 + i * span / (nano ? 7 : 19);
    b.box(0.065, 0.025, 0.02, silver, side * (nano ? 0.23 : 0.48), PCB_T, offset + (nano ? -0.18 : -0.03));
    if (!nano) b.box(0.02, 0.025, 0.065, silver, offset, PCB_T, side * 0.48 - 0.03);
  }
  const resetZ = nano ? 0.32 : 1.13;
  b.box(0.26, 0.04, 0.2, silver, 0, PCB_T, resetZ);
  b.cyl(0.064, 0.035, plastic(nano ? "#ddd7d0" : "#a52e24"), 0, PCB_T + 0.04, resetZ, 20);
  marking(b, "RESET", 0.35, 0.07, 0, PCB_T + 0.004, resetZ - 0.15, "#edf2f4", 110);
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * (nano ? 0.16 : 0.22);
    b.box(0.06, 0.025, 0.09, std(i ? "#ddd7bd" : "#6e944e"), x, PCB_T, nano ? 0.69 : 0.65);
  }
  // Six-pin ICSP connector, distinct from the external GPIO headers.
  for (const x of [-0.13, 0, 0.13]) for (const z of [nano ? 0.96 : 0.88, nano ? 1.08 : 1.01]) {
    b.box(0.1, 0.08, 0.1, dark, x + (nano ? 0 : 0.52), PCB_T, z);
    b.box(0.025, 0.14, 0.025, silver, x + (nano ? 0 : 0.52), PCB_T + 0.08, z);
  }
  if (!nano) {
    b.box(0.43, 0.4, 0.58, dark, -0.82, PCB_T, -2.21);
    b.cylZ(0.13, 0.15, dark, -0.82, 0.28, -2.53);
    for (const z of [-1.8, -1.4]) {
      b.cyl(0.13, 0.24, dark, -0.73, PCB_T, z, 24);
      b.cyl(0.118, 0.009, silver, -0.73, PCB_T + 0.24, z, 24);
    }
    chip(b, 0.3, 0.3, 0.4, -1.42, true);
    b.box(0.27, 0.08, 0.11, silver, 0.48, PCB_T, -1.06);
    marking(b, "ARDUINO", 0.78, 0.18, -0.26, PCB_T + 0.004, 0.69, "#edf2f4", 120);
    marking(b, "MEGA 2560", 0.84, 0.15, -0.16, PCB_T + 0.004, 1.55, "#edf2f4", 120);
  } else {
    marking(b, "NANO", 0.35, 0.08, 0, PCB_T + 0.004, 0.5, "#edf2f4", 110);
  }
}

function humidityModule(b: B, def: PartDef) {
  const white = def.id === "dht22";
  pcb(b, def.w, def.d, "#181c1e", false);
  const housingW = def.w * 0.8;
  const housingD = white ? 1.1 : 0.9;
  const z = -def.d / 2 + housingD / 2 + 0.08;
  const material = plastic(white ? "#eeeae3" : "#48acd4");
  b.box(housingW, 0.08, housingD, material, 0, PCB_T, z);
  const roof = PCB_T + 0.4;
  // Open grille built from ribs: light and shadow pass through real apertures.
  for (const x of [-housingW / 2, housingW / 2]) b.box(0.06, 0.34, housingD, material, x, PCB_T + 0.08, z);
  for (let row = 0; row < 6; row++) {
    const rz = z - housingD / 2 + row * housingD / 5;
    b.box(housingW, 0.045, 0.045, material, 0, roof, rz);
    for (const x of [-housingW / 2, housingW / 2]) b.box(0.075, 0.29, 0.045, material, x, PCB_T + 0.08, rz);
  }
  for (let col = 0; col < 5; col++) b.box(0.04, 0.045, housingD, material, -housingW / 2 + col * housingW / 4, roof, z);
  // Four sensor leads soldered onto the breakout, and three external contacts.
  for (let i = 0; i < 4; i++) b.cylZ(0.017, 0.19, metal(), (i - 1.5) * 0.14, PCB_T + 0.04, z + housingD / 2 + 0.07, 8);
  const holeZ = def.d / 2 - 0.34;
  b.add(new THREE.TorusGeometry(0.1, 0.027, 8, 24), metal(), [0, PCB_T + 0.006, holeZ], [Math.PI / 2, 0, 0]);
  b.cyl(0.072, 0.005, plastic("#080c0e"), 0, PCB_T, holeZ, 24);
  def.pins.forEach((pin, i) => {
    const [x, y, pinZ] = pinLocal(def, i);
    b.box(0.17, 0.09, 0.16, plastic("#111517"), x, PCB_T, def.d / 2 - 0.05);
    b.cylZ(0.022, 0.3, metal("#d1be83"), x, y, pinZ - 0.05, 8);
    marking(b, pin.name === "VCC" ? "+" : pin.name === "GND" ? "-" : "OUT", 0.18, 0.08, x, PCB_T + 0.004, def.d / 2 - 0.18, "#eeeeec", 135);
  });
}

/** Reference-oriented ESP development boards: antenna up, USB down. */
function espDevelopmentBoard(b: B, def: PartDef) {
  const node = def.id === "esp8266";
  const black = plastic("#101719");
  const silver = metal("#c8cdcf");
  pcb(b, def.w, def.d, "#101719", node, node ? [[-0.69, -1.58], [0.69, -1.58], [-0.69, 1.58], [0.69, 1.58]] : undefined);
  // Individual soldered through-holes and square metal contacts on both edges.
  def.pins.forEach((pin, index) => {
    const [x, , z] = pinLocal(def, index);
    b.add(new THREE.TorusGeometry(0.036, 0.012, 6, 16), node ? silver : metal("#d5b75f"), [x, PCB_T + 0.006, z], [Math.PI / 2, 0, 0]);
    b.box(0.034, 0.2, 0.034, silver, x, PCB_T, z);
    marking(b, pin.label ?? pin.name, 0.18, 0.07, x + (pin.headerSide === "left" ? 0.13 : -0.13), PCB_T + 0.004, z, "#ecf2ef", 150);
  });
  const antennaZ = node ? -1.39 : -1.61;
  b.box(0.99, 0.04, 0.62, plastic(node ? "#07252b" : "#202525"), 0, PCB_T, antennaZ);
  const trace = node ? metal("#dac66b") : std("#6e7474", { roughness: 0.8 });
  // Continuous meander trace, with alternating turns as in the supplied images.
  const top = PCB_T + 0.041;
  for (let i = 0; i < 7; i++) {
    const x = -0.38 + i * 0.105;
    b.box(0.027, 0.007, 0.31, trace, x, top, antennaZ - 0.07);
    if (i < 6) b.box(0.105, 0.007, 0.027, trace, x + 0.0525, top, antennaZ + (i % 2 ? 0.075 : -0.225));
  }
  b.box(0.73, 0.006, 0.024, trace, -0.015, top, antennaZ + 0.22);
  b.box(0.024, 0.007, 0.14, trace, -0.38, top, antennaZ + 0.155);
  const shieldZ = node ? -0.61 : -0.8;
  const shieldD = node ? 0.91 : 1.01;
  // Castellated module edges around the brushed metal RF shield.
  b.box(1.0, 0.04, shieldD + 0.14, plastic("#26352e"), 0, PCB_T, shieldZ);
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) b.box(0.065, 0.03, 0.036, metal("#d5b75f"), side * 0.49, PCB_T + 0.03, shieldZ - shieldD / 2 + i * shieldD / 8);
  b.box(0.9, 0.09, shieldD, silver, 0, PCB_T + 0.04, shieldZ);
  marking(b, node ? "AI-THINKER" : "ESPRESSIF", 0.74, 0.13, 0, 0.192, shieldZ - 0.18, "#647071", 120);
  marking(b, node ? "ESP8266MOD" : "ESP32-WROOM", 0.79, 0.12, 0, 0.193, shieldZ + 0.03, "#647071", 120);
  marking(b, "CE  FCC", 0.57, 0.13, 0, 0.194, shieldZ + 0.25, "#748082", 120);
  chip(b, node ? 0.27 : 0.38, node ? 0.46 : 0.4, 0, node ? 0.52 : 0.94, true);
  if (!node) chip(b, 0.4, 0.26, 0, 0.4, true);
  for (let i = 0; i < 12; i++) smd(b, -0.38 + (i % 4) * 0.2, 0.13 + Math.floor(i / 4) * 0.15, i % 3 ? "#9aabb0" : "#9a673d");
  if (node) {
    for (const [x, z] of [[-0.31, 0.17], [-0.08, 0.33]] as const) b.box(0.12, 0.045, 0.22, std("#c77b26"), x, PCB_T, z);
    marking(b, "LoLin", 0.56, 0.16, 0, PCB_T + 0.003, 1.27);
  }
  // USB opening, inner tongue, reset and flash/boot buttons near the bottom.
  b.box(0.46, 0.2, 0.4, silver, 0, PCB_T, def.d / 2 - 0.08);
  b.box(0.34, 0.12, 0.006, black, 0, PCB_T + 0.03, def.d / 2 + 0.123);
  b.box(0.25, 0.025, 0.015, plastic("#b9bec0"), 0, PCB_T + 0.055, def.d / 2 + 0.13);
  for (const side of [-1, 1]) {
    const x = side * 0.43;
    const z = def.d / 2 - 0.21;
    b.box(0.2, 0.05, 0.25, silver, x, PCB_T, z);
    b.cyl(0.065, 0.045, black, x, PCB_T + 0.05, z, 20);
    marking(b, side < 0 ? node ? "RST" : "EN" : node ? "FLASH" : "BOOT", 0.24, 0.065, x, PCB_T + 0.004, z - 0.19);
  }
}

/** Portrait layout of the supplied Pi 3 B+ reference; J8 is on the right. */
function raspberryPi(b: B, def: PartDef) {
  pcb(b, def.w, def.d, "#28794c", true, [[-1.17, -1.9], [1.17, -1.9], [-1.17, 1.48], [1.17, 1.48]]);
  const silver = metal("#c7cfd0");
  const dark = plastic("#222b2c");
  // Two rows of twenty gold GPIO posts on one continuous black header.
  b.box(0.32, 0.16, 2.69, dark, 1.125, PCB_T, -0.535);
  def.pins.forEach((pin, index) => {
    const [x, y, z] = pinLocal(def, index);
    b.box(0.032, y - 0.2, 0.032, metal("#d6b75c"), x, 0.22, z);
    if (pin.physicalNumber === 1) b.box(0.1, 0.004, 0.1, std("#eddb73"), x, 0.064, z);
  });
  // Wireless shield at the top and square processor in the centre.
  b.box(0.84, 0.075, 0.67, silver, -0.22, PCB_T, -1.7);
  b.box(0.68, 0.045, 0.62, dark, 0.02, PCB_T, -0.62);
  b.box(0.56, 0.01, 0.52, silver, 0.02, PCB_T + 0.045, -0.62);
  marking(b, "BCM2837", 0.49, 0.1, 0.02, 0.117, -0.62, "#586567");
  chip(b, 0.65, 0.5, 0.05, 0.31, false);
  chip(b, 0.45, 0.39, -0.65, 1.2, false);
  chip(b, 0.41, 0.42, 0.05, 1.4, false);
  // Left edge: micro USB power, full-size HDMI, then the A/V jack.
  b.box(0.39, 0.18, 0.36, silver, -1.31, PCB_T, -1.32);
  b.box(0.009, 0.095, 0.23, dark, -1.51, 0.1, -1.32);
  b.box(0.52, 0.25, 0.8, silver, -1.27, PCB_T, -0.49);
  b.box(0.009, 0.14, 0.62, dark, -1.535, 0.11, -0.49);
  b.box(0.42, 0.35, 0.43, dark, -1.22, PCB_T, 0.72);
  b.cylX(0.12, 0.12, dark, -1.48, 0.23, 0.72, 24);
  // The reference has two double USB stacks and an Ethernet socket below them.
  for (const x of [-0.95, -0.15]) {
    b.box(0.67, 0.65, 0.73, silver, x, PCB_T, 1.89);
    for (const y of [0.18, 0.45]) {
      b.box(0.5, 0.16, 0.009, dark, x, y, 2.26);
      b.box(0.36, 0.04, 0.013, plastic("#b8bdba"), x, y + 0.05, 2.267);
    }
  }
  b.box(0.69, 0.72, 0.99, silver, 0.72, PCB_T, 1.82);
  b.box(0.51, 0.46, 0.009, dark, 0.72, 0.14, 2.32);
  for (let i = 0; i < 8; i++) b.box(0.023, 0.08, 0.009, metal("#ccb978"), 0.53 + i * 0.054, 0.23, 2.328);
  // DSI and CSI ribbon connectors, including their dark locking tabs.
  for (const [x, z] of [[0.7, -1.2], [-0.75, 0.42]] as const) {
    b.box(0.19, 0.08, 0.8, plastic("#e5e4d5"), x, PCB_T, z);
    b.box(0.04, 0.035, 0.8, dark, x + 0.08, PCB_T + 0.08, z);
  }
  for (let i = 0; i < 12; i++) smd(b, -0.76 + (i % 3) * 0.16, -1.1 + Math.floor(i / 3) * 0.16);
  printSurface(b, 0.55, 0.47, -0.13, PCB_T + 0.003, -1.19, ctx => {
    ctx.strokeStyle = "#e6efe6"; ctx.lineWidth = 8;
    for (const [x, y] of [[256, 104], [193, 122], [319, 122], [212, 174], [300, 174], [256, 208]] as const) {
      ctx.beginPath(); ctx.ellipse(x, y, 35, 27, 0, 0, Math.PI * 2); ctx.stroke();
    }
    for (const x of [220, 292]) { ctx.beginPath(); ctx.ellipse(x, 49, 43, 19, x < 256 ? 0.5 : -0.5, 0, Math.PI * 2); ctx.stroke(); }
  });
  marking(b, "Raspberry Pi 3 B+", 1.1, 0.13, -0.15, PCB_T + 0.003, -1.97);
}

/** Uno board: printed PCB, paired socket banks, mounting holes, USB and barrel jack. */
function arduinoUno(b: B, def: PartDef) {
  const ink = std("#d9e9ef", { roughness: 0.9 });
  const dark = plastic("#171d22");
  pcb(b, def.w, def.d, "#19517d", false);
  // Uneven end caps and four plated through mounting holes.
  for (const [x, z] of [[-1.82, -1.3], [1.81, -1.3], [-1.82, 1.28], [1.81, 1.28]] as [number, number][]) {
    b.add(new THREE.TorusGeometry(0.076, 0.022, 8, 24), metal("#d6c376"), [x, 0.067, z], [Math.PI / 2, 0, 0]);
    b.cyl(0.045, 0.004, dark, x, 0.064, z, 18);
  }
  // Realistic female connector sockets, rather than brightly coloured balls.
  b.box(3.72, 0.17, 0.22, dark, 0.005, 0.055, -1.34);
  b.box(1.22, 0.17, 0.22, dark, -1.02, 0.055, 1.34);
  b.box(1.12, 0.17, 0.22, dark, 0.99, 0.055, 1.34);
  def.pins.forEach((_, i) => {
    const [x, , z] = pinLocal(def, i);
    b.box(0.16, 0.006, 0.17, plastic("#343b41"), x, 0.225, z);
    b.box(0.075, 0.008, 0.095, plastic("#080b0e"), x, 0.232, z);
  });
  // Board markings sit between the two header banks, as on the reference.
  b.box(1.55, 0.004, 0.012, ink, 0.82, 0.065, -0.76);
  b.box(1.25, 0.004, 0.012, ink, 0.96, 0.065, 0.79);
  b.box(0.88, 0.004, 0.012, ink, -0.99, 0.065, 0.79);
  const print = document.createElement("canvas");
  print.width = 512;
  print.height = 128;
  const ctx = print.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#e3eff1";
    ctx.font = "bold 60px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ARDUINO  UNO", 256, 64);
    const map = new THREE.CanvasTexture(print);
    map.colorSpace = THREE.SRGBColorSpace;
    const legend = b.add(new THREE.PlaneGeometry(1.32, 0.33), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }), [0.63, 0.068, -0.38], [-Math.PI / 2, 0, 0]);
    legend.raycast = () => {};
  }
  // The long DIP microcontroller and its silver legs.
  chip(b, 1.28, 0.42, 0.58, 0.46, true, "#1c2429");
  for (const x of [0.12, 1.04]) b.cyl(0.027, 0.005, plastic("#3b434a"), x, 0.137, 0.46, 12);
  chip(b, 0.3, 0.32, -0.83, 0.2);
  chip(b, 0.28, 0.25, -0.25, -0.48);
  usbPort(b, -1.86, -0.38, 0.72, 0.61, 0.38);
  b.box(0.46, 0.19, 0.38, plastic("#282d30"), -1.92, 0.18, -0.38);
  b.box(0.56, 0.42, 0.39, dark, -1.82, 0.06, 0.83);
  b.cylX(0.15, 0.1, plastic("#0a0e10"), -2.12, 0.28, 0.83);
  // Crystal, capacitors, reset switch and small surface-mounted details.
  b.box(0.42, 0.13, 0.19, metal("#c8d1d7"), -0.92, 0.06, -0.2);
  for (const x of [-1.42, -1.07]) {
    b.cyl(0.105, 0.2, plastic("#292e31"), x, 0.06, 0.95, 20);
    b.cyl(0.094, 0.008, metal("#b8c0c3"), x, 0.26, 0.95, 20);
  }
  b.box(0.28, 0.12, 0.25, plastic("#dce4e5"), -1.47, 0.06, -0.98);
  b.cyl(0.075, 0.05, plastic("#ae412b"), -1.47, 0.18, -0.98, 16);
  for (let i = 0; i < 9; i++) smd(b, -0.72 + (i % 3) * 0.14, -0.8 + Math.floor(i / 3) * 0.15);
  for (const [x, z] of [[1.62, -0.43], [1.78, -0.43], [1.62, -0.23]]) b.cyl(0.036, 0.02, std("#a9c767", { emissive: "#557a2d", emissiveIntensity: 0.15 }), x, 0.065, z, 12);
  // Two fine traces beneath the screen printing break up the large flat PCB.
  b.box(0.52, 0.002, 0.01, ink, 1.35, 0.066, -0.63);
}

function power(b: B, def: PartDef) {
  const { w, d, id } = def;
  switch (id) {
    case "battery-9v": {
      b.box(w, d * 0.9, 0.95 * d, std("#2a2d34"), 0, 0, -0.02);
      b.box(w * 0.6, 0.01, d * 0.88, std("#d9a400"), -0.1, d * 0.9, -0.02);
      b.box(w * 0.98, d * 0.9 * 0.4, d * 0.96, std("#d9a400", { roughness: 0.4 }), 0, 0, -0.02);
      b.cyl(0.12, 0.08, metal(), -0.3, d * 0.9, -0.15, 6);
      b.cyl(0.1, 0.1, metal(), 0.3, d * 0.9, -0.15, 20);
      legsDown(b, def, d * 0.9);
      break;
    }
    case "battery-aa4": {
      b.box(w, 0.12, d, plastic("#151515"));
      for (let i = 0; i < 4; i++) {
        b.cylX(0.11, w * 0.85, std(i % 2 ? "#c46a00" : "#222", { metalness: 0.3, roughness: 0.35 }), 0, 0.23, -d / 2 + 0.17 + i * 0.22);
      }
      legsDown(b, def, 0.12);
      break;
    }
    case "battery-18650": {
      b.cylX(0.28, w * 0.9, std("#2f9e5b", { roughness: 0.3, metalness: 0.2 }), 0, 0.28, -0.05);
      b.cylX(0.1, 0.06, metal(), w * 0.47, 0.28, -0.05);
      b.box(w * 0.3, 0.004, 0.2, std("#fff"), -0.2, 0.56, -0.05);
      legsDown(b, def, 0.28);
      break;
    }
    case "lm7805": {
      b.box(w * 0.85, 0.12, 0.08, metal("#bfc4c9"), 0, 0.15, -0.12); // tab
      b.box(w * 0.85, 0.45, 0.12, plastic("#111"), 0, 0.15, 0);
      b.add(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 16), std("#333"), [0, 0.8, -0.12], [Math.PI / 2, 0, 0]);
      b.box(w * 0.85, 0.3, 0.06, metal("#bfc4c9"), 0, 0.6, -0.12);
      legsDown(b, def, 0.15);
      break;
    }
    default: {
      // modules: usb power, breadboard supply, AMS1117
      const col = id === "bb-power" ? "#1e3a8a" : id === "ams1117" ? "#1f6d3a" : "#0d3b66";
      pcb(b, w, d, col);
      headers(b, def);
      if (id === "usb-power") usbPort(b, -w / 2 + 0.3, -0.1, 0.55, 0.5, 0.26);
      if (id === "bb-power") {
        b.box(0.45, 0.4, 0.35, plastic("#111"), -w / 2 + 0.3, PCB_T, -0.15);
        b.box(0.25, 0.2, 0.18, plastic("#2c2c2c"), 0.2, PCB_T, -0.2);
        b.box(0.08, 0.12, 0.05, plastic("#fff"), 0.2, PCB_T + 0.2, -0.2);
        b.cyl(0.04, 0.06, glass("#ff3030", 0.9), 0.55, PCB_T, -0.25, 10);
      }
      if (id === "ams1117") chip(b, 0.35, 0.25, 0, -0.1, false);
      smd(b, 0.4, -0.25);
      smd(b, -0.3, -0.25, "#222");
    }
  }
}

function referenceSensor(b: B, def: PartDef) {
  const { id, w, d } = def;
  const pir = id === "pir", imu = id === "mpu6050", pressure = id === "bmp280";
  const mounts: [number, number][] = pir ? [[-.52, -.48], [.52, -.48]] : imu ? [[.36, -.58], [.36, .58]] : pressure ? [[.32, -.32], [.32, .32]] : [[id === "flame" ? -.55 : .55, 0]];
  pcb(b, w, d, def.color, true, mounts);
  def.pins.forEach((pin, i) => {
    const [x, y, z] = pinLocal(def, i);
    b.add(new THREE.TorusGeometry(.047, .012, 6, 16), metal("#d6bd7a"), [Math.max(-w / 2 + .08, Math.min(w / 2 - .08, x)), PCB_T + .005, z], [Math.PI / 2, 0, 0]);
    if (imu || pressure) {
      b.box(.12, .1, .15, plastic("#16191c"), x, PCB_T, z);
      b.box(.026, .2, .026, metal("#d8c17f"), x, .1, z);
      marking(b, pin.name, .27, .09, x + .25, PCB_T + .005, z, "#f3f4ed", 135);
    } else {
      const axisX = id !== "pir";
      b.box(axisX ? .12 : .16, .09, axisX ? .16 : .12, plastic("#16191c"), axisX ? Math.sign(x) * (w / 2 - .04) : x, PCB_T, axisX ? z : d / 2 - .03);
      if (axisX) b.cylX(.018, .3, metal("#d8c17f"), x, y, z, 8);
      else b.cylZ(.018, .3, metal("#d8c17f"), x, y, z, 8);
      marking(b, pin.name, .22, .085, axisX ? Math.sign(x) * (w / 2 - .22) : x, PCB_T + .006, axisX ? z : d / 2 - .18, "#eff3ef", 135);
    }
  });
  if (pir) {
    b.cyl(.48, .07, plastic("#f2f1e9"), 0, PCB_T, -.08, 48);
    b.add(new THREE.SphereGeometry(.47, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std("#f2f3ed", { flatShading: true, roughness: .68 }), [0, .13, -.08]);
    for (const x of [-.28, .28]) {
      b.box(.22, .14, .22, plastic("#e99026"), x, PCB_T, .43);
      b.cyl(.075, .014, metal(), x, .2, .43, 16);
      b.box(.11, .007, .017, plastic("#4d5355"), x, .214, .43);
    }
    for (const x of [-.52, .52]) b.cyl(.07, .25, plastic("#182320"), x, PCB_T, .19, 16);
    marking(b, "HC-SR501", .65, .11, 0, PCB_T + .005, -.51);
    return;
  }
  if (imu || pressure) {
    chip(b, imu ? .29 : .2, imu ? .29 : .2, .08, 0, false, imu ? "#22252a" : "#bfc2bd");
    if (pressure) {
      b.cyl(.018, .005, plastic("#303739"), .08, .135, -.03, 12);
      marking(b, "BMP280", .54, .12, .04, .067, .29);
    } else {
      marking(b, "MPU-6050", .63, .12, .12, .067, .46);
      marking(b, "X →  Y ↑", .5, .14, .12, .067, .62);
    }
    for (const z of [-.39, -.22, .22, .36]) {
      smd(b, .05, z, "#b49b59"); smd(b, .25, z, "#32363a");
    }
    chip(b, .15, .12, .07, -.48, true);
    return;
  }
  // LM393 comparator boards: horizontal optical heads, adjustment and status LEDs.
  const flame = id === "flame", headX = flame ? w / 2 + .23 : -w / 2 - .23;
  for (const z of flame ? [0] : [-.18, .18]) {
    const clear = !flame && z > 0;
    b.cylX(.09, .3, clear ? glass("#edf0ee", .65) : plastic("#25282a"), headX, .16, z, 24);
    b.add(new THREE.SphereGeometry(.09, 20, 12), clear ? glass("#edf0ee", .65) : plastic("#25282a"), [headX + (flame ? .15 : -.15), .16, z]);
    for (const offset of [-.045, .045]) b.cylX(.012, .23, metal(), headX + (flame ? -.2 : .2), .16, z + offset, 6);
  }
  chip(b, .24, .3, 0, -.12, true);
  b.box(.3, .18, .27, plastic("#267eaf"), .05, PCB_T, .23);
  b.cyl(.11, .015, metal("#ccd2d0"), .05, .24, .23, 20);
  b.box(.16, .008, .024, plastic("#424f53"), .05, .255, .23);
  b.box(.024, .008, .16, plastic("#424f53"), .05, .255, .23);
  for (const z of [-.27, .27]) {
    b.box(.09, .03, .07, std("#e7e659", { emissive: "#7e8b21", emissiveIntensity: .25 }), flame ? -.55 : .55, PCB_T, z);
    marking(b, z < 0 ? "D0" : "PWR", .22, .075, flame ? -.55 : .55, .067, z + .08);
  }
  for (const z of [-.24, -.08, .08, .24]) smd(b, flame ? .52 : -.52, z, "#b8aa8d");
}

function environmentSensor(b: B, def: PartDef) {
  const { id, w, d } = def;
  const soil = id === "soil", water = id === "water-level", gas = id === "mq2";
  const cx = soil ? -.67 : 0;
  if (water) {
    // Narrow neck and long exposed sensing comb, as on the red reference PCB.
    const shape = new THREE.Shape();
    shape.moveTo(-.5, -1.4); shape.lineTo(.5, -1.4); shape.lineTo(.5, -.95);
    shape.lineTo(.35, -.78); shape.lineTo(.35, -.53); shape.lineTo(.5, -.36);
    shape.lineTo(.5, 1.4); shape.lineTo(-.5, 1.4); shape.lineTo(-.5, -.36);
    shape.lineTo(-.35, -.53); shape.lineTo(-.35, -.78); shape.lineTo(-.5, -.95); shape.closePath();
    for (const x of [-.35, .35]) { const hole = new THREE.Path(); hole.absarc(x, -1.23, .085, 0, Math.PI * 2, true); shape.holes.push(hole); }
    b.add(new THREE.ExtrudeGeometry(shape, { depth: PCB_T, bevelEnabled: false }), std(def.color), [0, 0, 0], [Math.PI / 2, 0, 0]);
    // This extrusion points downward: raise it to put its upper face at PCB_T.
    b.g.children[b.g.children.length - 1]!.position.y = PCB_T;
    for (let i = 0; i < 10; i++) {
      const x = -.405 + i * .09;
      b.box(.026, .004, 1.68, metal("#dfc58c"), x, .064, .48);
      b.cyl(.033, .004, metal("#e0c895"), x, .064, -.36, 12);
    }
    for (const x of [-.405, .405]) b.box(.026, .004, .19, metal("#dfc58c"), x, .064, 1.2);
    chip(b, .15, .1, 0, -.72, true);
    for (const x of [-.23, .23]) smd(b, x, -.72, "#33383a");
    marking(b, "Water Level", .66, .12, 0, .068, -.53);
  } else if (soil) {
    const controller = new B(); pcb(controller, .76, 1.65, def.color, true, [[0, .48]]);
    controller.g.position.set(cx, 0, -.25); b.g.add(controller.g);
    chip(b, .23, .32, cx - .13, -.26, true);
    for (const z of [-.89, -.68]) for (const x of [-.22, 0, .22]) smd(b, cx + x, z, "#b6b09e");
    // Separate fork board with an open gap and tapered tips.
    const fork = new THREE.Shape();
    fork.moveTo(.22, 1.15); fork.lineTo(.99, 1.15); fork.lineTo(.99, -.98);
    fork.lineTo(.89, -1.2); fork.lineTo(.78, -.98); fork.lineTo(.78, .46);
    fork.quadraticCurveTo(.61, .67, .44, .46); fork.lineTo(.44, -.98);
    fork.lineTo(.33, -1.2); fork.lineTo(.22, -.98); fork.closePath();
    for (const x of [.32, .89]) { const hole = new THREE.Path(); hole.absarc(x, .96, .045, 0, Math.PI * 2, true); fork.holes.push(hole); }
    b.add(new THREE.ExtrudeGeometry(fork, { depth: PCB_T, bevelEnabled: false }), std("#252b2c"), [0, PCB_T, 0], [Math.PI / 2, 0, 0]);
    for (const x of [.33, .89]) {
      b.box(.16, .005, 1.63, metal("#cbd0cc"), x, .064, -.2);
      for (let j = 0; j < 8; j++) b.cyl(.025, .006, metal("#e6e8df"), x, .07, -.92 + j * .19, 12);
      b.cylZ(.018, .23, metal(), x, .14, 1.24, 8);
    }
    marking(b, "SOIL", .48, .15, .61, .068, .77);
    for (const x of [-.1, .1]) {
      b.box(.14, .09, .14, plastic("#14191b"), cx + x, PCB_T, -1.01);
      b.cylZ(.018, .27, metal(), cx + x, .14, -1.16, 8);
    }
    for (const [i, x] of [-.1, .1].entries()) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(cx + x, .14, -1.16), new THREE.Vector3(cx + x, .24, -1.45),
        new THREE.Vector3(-.12 + i * .13, .3, -1.57), new THREE.Vector3(.33 + i * .56, .2, -1.38),
        new THREE.Vector3(.33 + i * .56, .14, 1.24),
      ]);
      b.add(new THREE.TubeGeometry(curve, 40, .022, 8, false), plastic("#262b2c"), [0, 0, 0]);
    }
  } else {
    pcb(b, w, d, def.color, true, gas ? [[-.69, -.36], [-.69, .36], [.67, -.36], [.67, .36]] : [[.56, 0]]);
    if (gas) {
      b.cyl(.43, .08, plastic("#ece7dd"), -.3, PCB_T, 0, 40);
      b.cyl(.42, .43, metal("#bfc6c9"), -.3, .14, 0, 48);
      meshCap(b, .36, -.3, .57, 0);
      marking(b, "GAS SENSOR", .25, .68, .35, .068, 0);
      // The comparator and sensitivity control sit on the underside of this module.
      const underside = new B(); chip(underside, .23, .28, .3, 0, true);
      underside.box(.24, .16, .24, plastic("#2187ad"), .25, PCB_T, -.28);
      underside.cyl(.075, .01, metal(), .25, .22, -.28, 16);
      underside.g.rotation.x = Math.PI; underside.g.position.y = -.02; b.g.add(underside.g);
    } else {
      chip(b, .24, .28, -.08, .16, true);
      b.cylX(.12, .045, plastic("#d9bd80"), -w / 2 - .13, .18, 0, 28);
      b.cylX(.112, .006, std("#ad7648"), -w / 2 - .157, .18, 0, 28);
      for (const z of [-.045, .045]) b.cylX(.012, .2, metal(), -w / 2 + .01, .18, z, 8);
      for (const z of [-.24, -.08, .08, .24]) smd(b, -.5, z, "#c0b896");
    }
  }
  if (!water && !gas) {
    const tx = soil ? cx + .17 : -.06, tz = soil ? -.25 : -.2;
    b.box(.29, .18, .27, plastic("#267eaf"), tx, PCB_T, tz);
    b.cyl(.09, .015, metal(), tx, .24, tz, 20);
    b.box(.14, .008, .02, plastic("#394a50"), tx, .255, tz);
    b.box(.02, .008, .14, plastic("#394a50"), tx, .255, tz);
    for (const side of [-1, 1]) {
      const x = soil ? cx + side * .26 : .56, z = soil ? .15 : side * .27;
      b.box(.085, .03, .065, std("#e5ec53"), x, PCB_T, z);
      marking(b, side < 0 ? "D0" : "PWR", .22, .075, x, .068, z + .09);
    }
  }
  def.pins.forEach((pin, i) => {
    const [x, y, z] = pinLocal(def, i);
    const axisX = gas || id === "ldr", bx = axisX ? w / 2 - .03 : x, bz = water ? -d / 2 + .04 : soil ? .51 : z;
    b.box(axisX ? .12 : .15, .09, axisX ? .15 : .12, plastic("#171b1e"), bx, PCB_T, bz);
    if (axisX) b.cylX(.018, .3, metal("#d5bd80"), x, y, z, 8);
    else b.cylZ(.018, water ? .3 : .42, metal("#d5bd80"), x, y, water ? z : z - .04, 8);
    marking(b, water ? ({ SIG: "S", VCC: "+", GND: "-" }[pin.name] ?? pin.name) : pin.name, .2, .075, axisX ? w / 2 - .23 : x, .068, axisX ? z : water ? -1.13 : .4, "#eff4ed", 135);
  });
}

function sensor(b: B, def: PartDef) {
  const { w, d, id } = def;
  if (id === "dht11" || id === "dht22") { humidityModule(b, def); return; }
  if (["mq2", "water-level", "ldr", "soil"].includes(id)) { environmentSensor(b, def); return; }
  if (["pir", "mpu6050", "bmp280", "ir-obstacle", "flame"].includes(id)) { referenceSensor(b, def); return; }
  const boards: Record<string, string> = {
    "hc-sr04": "#1f4fa3", ldr: "#1f4fa3", pir: "#2a7d45", mq2: "#1f4fa3", soil: "#d1b03c",
    "ir-obstacle": "#1f4fa3", bmp280: "#6b2d93", mpu6050: "#1f4fa3", flame: "#1f4fa3", sound: "#c0392b",
  };
  if (id === "dht11" || id === "dht22") {
    const c = id === "dht11" ? "#2b8fd6" : "#f2f2f2";
    b.box(w * 0.8, d * 0.25, d * 0.9, plastic(c), 0, 0, -0.05);
    b.box(w * 0.8, d * 0.06, d * 0.9, plastic(c), 0, d * 0.25 - 0.01, -0.05);
    // grille
    const g = plastic(id === "dht11" ? "#1c6aa6" : "#d6d6d6");
    for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) {
      b.box(w * 0.12, 0.008, d * 0.065, g, (col - 1.5) * w * 0.17, d * 0.31, -0.05 + (row - 2) * d * 0.14);
    }
    legsDown(b, def, 0.05);
    return;
  }
  if (id === "ds18b20") {
    b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 24, 1, false, 0, Math.PI), plastic("#141414"), [0, 0.32, -0.05], [0, Math.PI / 2, 0]);
    b.box(0.44, 0.4, 0.04, plastic("#141414"), 0, 0.12, -0.05);
    legsDown(b, def, 0.12);
    return;
  }
  if (id === "lm35") {
    b.add(new THREE.CylinderGeometry(.23, .23, .42, 32, 1, false, 0, Math.PI), plastic("#1c2023"), [0, .35, -.05], [0, Math.PI / 2, 0]);
    b.box(.46, .42, .025, plastic("#1c2023"), 0, .14, .06);
    const beforeLabel = b.g.children.length;
    marking(b, "LM35", .38, .16, 0, .565, -.03);
    if (b.g.children.length > beforeLabel) {
      const label = b.g.children[b.g.children.length - 1]!;
      label.rotation.set(0, 0, 0);
      label.position.set(0, .35, .074);
    }
    legsDown(b, def, 0.18);
    return;
  }
  if (id === "ldr-bare") {
    b.cyl(0.28, 0.09, plastic("#bd7953"), 0, 0.16, -0.05, 40);
    b.cyl(0.275, 0.004, plastic("#d5c6b0"), 0, .25, -.05, 40);
    const track = std("#a6643f");
    for (let i = 0; i < 5; i++) {
      b.box(0.36, 0.005, 0.018, track, 0, 0.252, -0.23 + i * 0.09);
      if (i < 4) b.box(0.018, 0.005, 0.09, track, i % 2 ? -0.18 : 0.18, 0.252, -0.185 + i * 0.09);
    }
    for (const x of [-.2, .2]) b.cyl(.035, .004, metal("#b2b1a9"), x, .255, -.05, 16);
    legsDown(b, def, 0.14);
    return;
  }
  if (id === "potentiometer") {
    b.cyl(0.34, 0.2, metal("#c4b174"), 0, 0.06, -0.08, 40);
    b.cyl(0.32, 0.04, plastic("#89502a"), 0, 0.02, -0.08, 32);
    b.cyl(0.14, 0.1, metal("#cfd3d6"), 0, 0.26, -0.08, 28);
    b.cyl(.23, .045, metal("#b6bdc0"), 0, .28, -.08, 6);
    b.box(.62, .04, .18, plastic("#985630"), 0, .08, .22);
    for (const x of [-.25, 0, .25]) b.add(new THREE.TorusGeometry(.047, .014, 6, 20), metal("#c4c7c3"), [x, .126, .22], [Math.PI / 2, 0, 0]);
    b.cyl(0.09, 0.28, metal("#d8dce0"), 0, 0.36, -0.08, 24);
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8;
      b.cyl(.009, .24, metal("#7b8488"), Math.cos(angle) * .093, .39, -.08 + Math.sin(angle) * .093, 6);
    }
    for (let i = 0; i < 5; i++) b.add(new THREE.TorusGeometry(.135, .008, 6, 32), metal("#818a8e"), [0, .26 + i * .018, -.08], [Math.PI / 2, 0, 0]);
    b.box(0.12, 0.004, 0.015, plastic("#4b545a"), 0, 0.64, -0.08);
    legsDown(b, def, 0.05);
    return;
  }
  pcb(b, w, d, boards[id] ?? "#1f4fa3");
  if (id !== "hc-sr04") headers(b, def, PCB_T + 0.1);
  switch (id) {
    case "hc-sr04":
      for (const sx of [-1, 1]) {
        b.cyl(0.4, 0.38, metal("#d7dadd"), sx * 0.57, PCB_T, -0.03, 40);
        meshCap(b, 0.34, sx * 0.57, PCB_T + 0.38, -0.03);
      }
      b.box(0.46, 0.1, 0.17, metal(), 0, PCB_T, -0.32);
      chip(b, 0.25, 0.18, 0, 0.05);
      marking(b, "HC-SR04", 0.64, 0.13, 0, PCB_T + 0.006, 0.32);
      def.pins.forEach((pin, i) => {
        const [x, y, z] = pinLocal(def, i);
        b.box(0.15, 0.08, 0.15, plastic("#12171b"), x, PCB_T, d / 2 - 0.03);
        b.cylZ(0.02, 0.3, metal("#cbbb7e"), x, y, z - 0.05, 8);
        marking(b, pin.name, 0.18, 0.07, x, PCB_T + 0.004, d / 2 - 0.14, "#eeeeec", 135);
      });
      break;
    case "pir":
      b.add(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std("#f7f7f2", { flatShading: true, roughness: 0.65 }), [0, PCB_T + 0.05, -0.05]);
      b.cyl(0.44, 0.05, plastic("#f0f0ea"), 0, PCB_T, -0.05, 32);
      break;
    case "mq2":
      b.cyl(0.38, 0.35, std("#9aa0a6", { metalness: 0.6, roughness: 0.6, wireframe: false }), 0, PCB_T, -0.05, 32);
      b.cyl(0.39, 0.06, std("#b5651d", { roughness: 0.7 }), 0, PCB_T, -0.05, 32);
      meshCap(b, 0.3, 0, PCB_T + 0.35, -0.05);
      break;
    case "ldr":
      b.cyl(0.13, 0.08, std("#b3352f", { roughness: 0.3 }), -0.35, PCB_T + 0.15, -0.15, 20);
      legsDown(b, { ...def, pins: [] }, 0);
      b.cyl(0.02, 0.15, metal(), -0.4, PCB_T, -0.15, 6);
      b.cyl(0.02, 0.15, metal(), -0.3, PCB_T, -0.15, 6);
      b.box(0.3, 0.32, 0.3, plastic("#2a5fc2"), 0.2, PCB_T, -0.1); // trimmer
      b.cyl(0.06, 0.03, metal("#ddd"), 0.2, PCB_T + 0.32, -0.1, 12);
      chip(b, 0.3, 0.2, 0.25, 0.2);
      break;
    case "flame":
    case "ir-obstacle":
      b.cyl(0.1, 0.25, glass(id === "flame" ? "#222" : "#e8e8ff", 0.9), -0.5, PCB_T + 0.1, -0.1, 16);
      if (id === "ir-obstacle") b.cyl(0.1, 0.25, std("#111"), -0.25, PCB_T + 0.1, -0.1, 16);
      b.box(0.3, 0.32, 0.3, plastic("#2a5fc2"), 0.3, PCB_T, -0.1);
      chip(b, 0.3, 0.2, 0.2, 0.2);
      break;
    case "sound":
      b.cyl(0.28, 0.3, std("#2a2a2a", { metalness: 0.4 }), -0.35, PCB_T, -0.05, 28);
      b.cyl(0.24, 0.005, std("#111", { roughness: 1 }), -0.35, PCB_T + 0.3, -0.05, 28);
      b.box(0.3, 0.32, 0.3, plastic("#2a5fc2"), 0.3, PCB_T, -0.1);
      break;
    case "soil":
      for (const sx of [-1, 1]) b.box(0.25, 0.02, 1.4, std("#d4b45a", { metalness: 0.6, roughness: 0.3 }), sx * 0.35, 0, -d / 2 - 0.65);
      chip(b, 0.3, 0.2, 0, -0.1);
      break;
    case "water-level":
      for (let i = 0; i < 6; i++) b.box(0.055, 0.004, d * 0.62, metal("#d8aa4a"), -0.45 + i * 0.18, PCB_T, -0.28);
      b.box(w * 0.85, 0.03, 0.11, plastic("#1e2f36"), 0, PCB_T, -d / 2 + 0.18);
      break;
    default:
      // bmp280 / mpu6050
      chip(b, id === "mpu6050" ? 0.28 : 0.2, id === "mpu6050" ? 0.28 : 0.2, 0, -0.1, false, id === "bmp280" ? "#c0c4c8" : "#1a1a1a");
      smd(b, 0.3, -0.25);
      smd(b, -0.3, -0.25, "#222");
      b.cyl(0.04, 0.03, glass("#30ff60", 0.95), 0.35, PCB_T, 0.05, 10);
  }
}

function leadBetween(b: B, from: V3, to: V3, color: string, radius = .025) {
  const a = new THREE.Vector3(...from), c = new THREE.Vector3(...to), delta = c.clone().sub(a);
  const mesh = b.add(new THREE.CylinderGeometry(radius, radius, delta.length(), 10), plastic(color), a.clone().add(c).multiplyScalar(.5).toArray() as V3);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
}

function referenceActuator(b: B, def: PartDef) {
  const { id, w, d } = def;
  if (id.startsWith("relay")) {
    const count = id === "relay-8" ? 8 : id === "relay-2" ? 2 : 1;
    pcb(b, w, d, def.color);
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * .7;
      b.box(.64, .55, .64, plastic("#176bc1"), x, PCB_T, -.03);
      marking(b, "SONGLE", .54, .14, x, .612, -.18);
      marking(b, "SRD-05VDC-SL-C", .56, .14, x, .614, -.02);
      marking(b, "10A 250VAC", .5, .1, x, .615, .13);
      terminal(b, 3, x, -d / 2 + .16, "#238bc0");
      chip(b, .18, .12, x, d / 2 - .45, true);
      b.box(.1, .04, .06, std("#ed342d", { emissive: "#df2418", emissiveIntensity: .15 }), x -.22, PCB_T, d / 2 - .4);
      smd(b, x + .23, d / 2 - .4, "#282b2e");
      if (count > 1) b.box(.18, .07, .13, plastic("#292b2d"), x, PCB_T, d / 2 - .65);
    }
    def.pins.forEach((pin, i) => {
      if (/^(NC|COM|NO)/.test(pin.name)) return;
      const [x,y,z] = pinLocal(def, i);
      b.box(.12,.12,.12,plastic("#15191b"),x,PCB_T,z);
      b.box(.025,.12,.025,metal("#cfb877"),x,y-.06,z);
      marking(b,pin.name,.15,.07,x,.068,z-.14,"#f1f2e8",135);
    });
    return;
  }
  if (id === "sg90" || id === "mg995") {
    const micro = id === "sg90", color = micro ? "#163b8e" : "#292c2f", height = micro ? .83 : 1.03;
    b.box(w*.82,height,d*.82,plastic(color));
    b.box(w*.86,.16,d*.86,plastic(color),0,height,0);
    for(const side of [-1,1]) {
      b.box(.22,.09,d*.64,plastic(color),side*w*.48,height*.64,0);
      b.cyl(.045,.005,metal("#303b45"),side*w*.49,height*.64+.09,0,16);
    }
    const shaftX = -w*.19;
    b.cyl(d*.24,.17,plastic(color),shaftX,height+.16,0,32);
    b.cyl(.09,.1,metal(micro ? "#deded5" : "#b89541"),shaftX,height+.29,0,24);
    b.box(micro ? .95 : 1.05,.035,.13,plastic("#e4e5df"),shaftX,height+.38,0);
    if(!micro) b.box(.13,.035,.65,plastic("#e4e5df"),shaftX,height+.38,0);
    b.cyl(.07,.025,metal(),shaftX,height+.415,0,20);
    for(const offset of [-.38,-.25,.25,.38]) b.cyl(.022,.004,plastic("#5b6469"),shaftX+offset,height+.417,0,12);
    marking(b,micro ? "SG90" : "MG995",w*.58,d*.47,0,height+.162,.13,"#d5c267",115);
    def.pins.forEach((pin,i)=>{
      const [x,y,z]=pinLocal(def,i), color=pin.name === "VCC" ? "#e63728" : pin.name === "GND" ? "#713c24" : "#ef8d26";
      leadBetween(b,[-w*.4,.2,z],[x+.12,y,z],color,.023);
      b.box(.15,.09,.12,plastic("#16191c"),x,.1,z);
      b.cylX(.018,.09,metal(),x-.015,y,z,8);
    });
    return;
  }
  if(id === "dc-motor" || id === "water-pump") {
    const pump = id === "water-pump", centerX = pump ? .45 : 0, radius = pump ? .31 : .39;
    b.cylX(radius,pump ? 1.15 : .95,metal("#bac0c6"),centerX,.43,0,40);
    b.cylX(radius*.92,.13,plastic("#282c2e"),pump ? 1.07 : .53,.43,0,32);
    b.cylX(.065,pump ? .12 : .45,metal(),pump ? -.19 : -.67,.43,0,24);
    if(pump) {
      b.box(.83,.69,.83,plastic("#e8e7d3"),-.68,.08,0);
      b.cylX(.13,.45,plastic("#edecdc"),-1.26,.43,0,24);
      b.cyl(.13,.4,plastic("#edecdc"),-.68,.77,0,24);
      for(const z of [-.37,.37]) for(const y of [.17,.67]) b.cylX(.05,.05,metal(),-1.12,y,z,16);
      for(const z of [-.36,.36]) b.box(.54,.09,.17,plastic("#272c2e"),-.55,0,z);
      marking(b,"R385",.7,.17,.45,.745,0,"#394247",100);
    } else {
      b.cylX(.21,.06,metal("#e1e3e5"),-.5,.43,0,28);
      for(const z of [-.22,.22]) b.box(.16,.06,.09,plastic("#1c2023"),.4,.56,z);
    }
    def.pins.forEach((_,i)=>{const [x,y,z]=pinLocal(def,i);b.box(.12,.035,.07,metal("#b79454"),x-.06,y,z);});
    return;
  }
  if(id === "stepper") {
    b.cyl(.55,.39,metal("#9fa5a5"),0,0,-.07,48);
    b.cyl(.54,.025,metal("#c9ccca"),0,.39,-.07,48);
    for(const side of [-1,1]) {
      b.box(.23,.045,.27,metal("#b8c0c1"),side*.57,.37,-.07);
      b.add(new THREE.TorusGeometry(.071,.025,8,24),metal("#c8ccca"),[side*.64,.414,-.07],[Math.PI/2,0,0]);
    }
    b.cyl(.16,.065,metal(),0,.415,-.27,28);
    b.cyl(.09,.25,metal("#b59b41"),0,.48,-.27,24);
    b.box(.56,.31,.23,plastic("#1545b0"),0,.05,.5);
    marking(b,"28BYJ-48",.52,.14,0,.419,.18,"#3b474b",100);
    const colors=["#ec8b2f","#e58ac2","#e0cf32","#3476d7","#da3538"];
    def.pins.forEach((_,i)=>{const [x,y,z]=pinLocal(def,i);leadBetween(b,[x,.17,.59],[x,y,z],colors[i]!, .022);b.cylZ(.012,.08,metal(),x,y,z,8);});
    return;
  }
  // Panel buzzer with mounting ears, concentric grille and two coloured leads.
  b.cyl(.42,.22,plastic("#111416"),0,.03,0,48);
  b.cyl(.38,.012,plastic("#080a0b"),0,.25,0,48);
  for(let i=1;i<7;i++) b.add(new THREE.TorusGeometry(.055+i*.044,.008,6,48),plastic("#323638"),[0,.266,0],[Math.PI/2,0,0]);
  b.cyl(.055,.009,metal("#d3d4cc"),0,.265,0,24);
  for(const side of [-1,1]) b.add(new THREE.TorusGeometry(.075,.036,8,24),plastic("#131719"),[side*.46,.12,0],[Math.PI/2,0,0]);
  def.pins.forEach((_,i)=>{const [x,y,z]=pinLocal(def,i);leadBetween(b,[x,.12,.34],[x,y,z],i===0 ? "#d93127" : "#222628",.025);});
}

function referenceDriver(b: B, def: PartDef) {
  const {id,w,d}=def;
  if(id === "tb6600") {
    b.box(1.72,.43,d,metal("#222629"),-.1);
    // Fins stay below the faceplate; mounting flanges extend beyond each end.
    for(let i=0;i<9;i++) b.box(.045,.13,d-.08,metal("#303538"),-.9+i*.19,.36,0);
    for(const z of [-1.31,1.31]) b.box(1.85,.065,.15,metal("#1b2022"),-.12,.44,z);
    b.box(.085,.13,d,metal("#171c1f"),-.98,.43,0);
    b.box(1.62,.04,2.42,plastic("#292d30"),-.13,.5,0);
    for(const z of [-1.05,1.04]) {
      b.cyl(.065,.013,metal("#8c9191"),.43,.541,z,24);
      b.box(.083,.004,.012,plastic("#333a3d"),.43,.555,z);
      b.box(.012,.004,.083,plastic("#333a3d"),.43,.555,z);
    }
    b.box(.58,.055,.13,plastic("#111718"),-.18,.54,-1.03);
    for(let i=0;i<6;i++) b.box(.058,.02,.055,plastic("#d2d5ce"),-.42+i*.09,.595,-1.04+(i%2 ? .025 : -.025));
    printSurface(b,1.52,2.34,-.13,.543,0,ctx=>{
      ctx.fillStyle="#e0e2db";ctx.strokeStyle="#bdc3bc";ctx.lineWidth=2;
      ctx.font="34px monospace";ctx.fillText("Microstep Driver",26,163);
      ctx.font="21px monospace";ctx.fillText("SW6 SW5 SW4 SW3 SW2 SW1",115,74);
      ctx.fillText("PWR/ALARM",490,88);
      const table=(y:number, headings:string[], rows:string[][])=>{
        const widths=[105,105,52,52,52], x=26, h=43;
        ctx.font="18px monospace";ctx.textAlign="center";
        [headings,...rows].forEach((row,r)=>{let xx=x;row.forEach((value,c)=>{ctx.strokeRect(xx,y+r*h,widths[c]!,h);ctx.fillText(value,xx+widths[c]!/2,y+r*h+28);xx+=widths[c]!;});});
        ctx.textAlign="left";
      };
      table(188,["Microstep","Pulse/rev","S1","S2","S3"],[
        ["NC","NC","ON","ON","ON"],["1","200","ON","ON","OFF"],["2/A","400","ON","OFF","ON"],
        ["2/B","400","OFF","ON","ON"],["4","800","ON","OFF","OFF"],["8","1600","OFF","ON","OFF"],
        ["16","3200","OFF","OFF","ON"],["32","6400","OFF","OFF","OFF"],
      ]);
      table(622,["Current(A)","PK Current","S4","S5","S6"],[
        ["0.5","0.7","ON","ON","ON"],["1.0","1.2","ON","OFF","ON"],["1.5","1.7","ON","ON","OFF"],
        ["2.0","2.2","ON","OFF","OFF"],["2.5","2.7","OFF","ON","ON"],["2.8","2.9","OFF","OFF","ON"],
        ["3.0","3.2","OFF","ON","OFF"],["3.5","4.0","OFF","OFF","OFF"],
      ]);
      const names=["ENA−(ENA)","ENA+(+5V)","DIR−(DIR)","DIR+(+5V)","PUL−(PUL)","PUL+(+5V)","B−","B+","A−","A+","GND−","VCC+"];
      ctx.font="23px monospace";
      names.forEach((label,i)=>ctx.fillText(label,492,(.22+i*.18+(i>=6 ? .07 : 0))/2.34*1280+8));
      ctx.font="26px monospace";ctx.fillText("DC: 9–42 VDC",63,1101);
    },[768,1280]);
    for(const z of [-.485,.61]) b.box(.23,.26,1.06,plastic("#34744d"),.93,.14,z);
  } else {
    pcb(b,w,d,def.color);
    if(id === "l298n") {
      b.box(.95,.12,.48,metal("#1b2022"),0,PCB_T,-.49);
      for(let i=0;i<7;i++) b.box(.055,.58,.48,metal("#22272a"),-.43+i*.14,.18,-.49);
      chip(b,.7,.16,0,-.19,true);
      for(const x of [-.34,.37]) {b.cyl(.17,.31,plastic("#292b2b"),x,PCB_T,.3,24);b.cyl(.15,.006,metal(),x,.372,.3,24);}
      marking(b,"L298N",.53,.15,0,.068,-.03);
    } else {
      chip(b,.29,.95,-.13,-.05,true);
      marking(b,"ULN2003",.21,.57,-.13,.138,-.05);
      b.box(.27,.18,.76,plastic("#e8e8db"),.36,PCB_T,-.2);
      for(let i=0;i<4;i++){b.cyl(.065,.04,glass("#deded0",.8),.57,PCB_T,.03+i*.14,16);smd(b,.18+i*.12,.43,"#b29968");}
    }
  }
  def.pins.forEach((pin,i)=>{
    const [x,y,z]=pinLocal(def,i), screw=id === "tb6600" || id === "l298n" && (/^OUT/.test(pin.name)||["VS","GND","5V_LOGIC"].includes(pin.name));
    if(screw){
      b.box(.17,.25,.17,plastic(id === "tb6600" ? "#439662" : "#2f91c1"),x,id === "tb6600" ? .14 : .06,z);
      b.cyl(.056,.012,metal(),x,y-.025,z,16);b.box(.075,.004,.012,plastic("#323c40"),x,y-.012,z);
    } else {b.box(.1,.1,.1,plastic("#14191b"),x,PCB_T,z);b.box(.024,.17,.024,metal("#d1b777"),x,y-.1,z);}
    if(id !== "tb6600") marking(b,pin.name,.15,.065,x,.067,z+.11,"#edf1e9",130);
  });
}

function actuator(b: B, def: PartDef) {
  const { w, d, id } = def;
  if (["l298n", "tb6600", "uln2003"].includes(id)) { referenceDriver(b, def); return; }
  if (["sg90", "mg995", "dc-motor", "stepper", "buzzer", "relay", "relay-2", "relay-8", "water-pump"].includes(id)) { referenceActuator(b, def); return; }
  switch (id) {
    case "sg90":
    case "mg995": {
      const large = id === "mg995";
      const blue = plastic(large ? "#333941" : "#2f6fd6");
      b.box(large ? 1.35 : 0.95, 0.75, large ? 0.75 : 0.5, blue, -0.05, 0.05, -0.05);
      b.box(large ? 1.7 : 1.3, 0.05, large ? 0.75 : 0.5, blue, -0.05, 0.55, -0.05);
      b.cyl(0.25, 0.15, blue, 0.2, 0.8, -0.05, 24);
      b.cyl(0.07, 0.12, plastic("#f3f3f3"), 0.2, 0.95, -0.05, 16);
      const horn = b.box(0.75, 0.05, 0.12, plastic("#f6f6f6"), 0.2, 1.03, -0.05);
      horn.rotation.y = 0.5;
      legsDown(b, def, 0.4);
      break;
    }
    case "dc-motor": {
      b.cylX(0.36, 0.95, metal("#c4c9ce"), 0, 0.42, -0.05, 32);
      b.cylX(0.3, 0.06, plastic("#f1c40f"), -0.5, 0.42, -0.05, 28);
      b.cylX(0.12, 0.1, metal("#aab0b5"), 0.52, 0.42, -0.05);
      b.cylX(0.03, 0.35, metal("#eee"), 0.75, 0.42, -0.05, 10);
      legsDown(b, def, 0.4);
      break;
    }
    case "stepper": {
      b.cyl(0.5, 0.5, metal("#c8ccd0"), 0, 0, -0.1, 40);
      b.cyl(0.18, 0.08, metal("#aab"), 0.1, 0.5, -0.25, 20);
      b.cyl(0.05, 0.25, metal("#eee"), 0.1, 0.58, -0.25, 10);
      b.box(1.3, 0.04, 0.22, metal("#b8bec4"), 0, 0.46, -0.1); // ears
      b.box(0.45, 0.35, 0.25, plastic("#2f6fd6"), 0, 0, 0.42);
      legsDown(b, def, 0.35);
      break;
    }
    case "l298n": {
      pcb(b, w, d, "#c0281e");
      headers(b, def, PCB_T + 0.1);
      // heatsink with fins
      const hs = metal("#1d1d1f");
      b.box(0.9, 0.15, 0.6, hs, 0, PCB_T, -0.35);
      for (let i = 0; i < 7; i++) b.box(0.05, 0.55, 0.6, hs, -0.42 + i * 0.14, PCB_T + 0.15, -0.35);
      terminal(b, 2, -w / 2 + 0.25, -0.1, "#2f6fd6");
      terminal(b, 2, w / 2 - 0.25, -0.1, "#2f6fd6");
      terminal(b, 3, 0, 0.25, "#2f6fd6");
      b.cyl(0.18, 0.35, std("#1a1a1a"), -0.55, PCB_T, 0.3, 20);
      break;
    }
    case "tb6600": {
      b.box(w, 0.42, d, metal("#40464a"));
      for (let i = 0; i < 9; i++) b.box(0.07, 0.12, d * 0.66, metal("#666d70"), -w / 2 + 0.22 + i * 0.19, 0.42, 0);
      b.box(w * 0.73, 0.015, d * 0.52, plastic("#21282b"), 0, 0.54, 0);
      terminal(b, 4, -0.48, d / 2 - 0.25);
      terminal(b, 5, 0.45, d / 2 - 0.25);
      break;
    }
    case "uln2003": {
      pcb(b, w, d, "#2b8a3e");
      headers(b, def, PCB_T + 0.1);
      chip(b, 0.7, 0.25, -0.1, -0.05);
      b.box(0.65, 0.3, 0.2, plastic("#f2f2f2"), 0.2, PCB_T, -0.3);
      for (let i = 0; i < 4; i++) b.cyl(0.04, 0.06, glass("#ff2020", 0.9), 0.4, PCB_T, -0.28 + i * 0.14, 10);
      break;
    }
    case "relay": {
      pcb(b, w, d, "#1f4fa3");
      headers(b, def, PCB_T + 0.1);
      b.box(0.75, 0.6, 0.55, plastic("#1e5bd8"), -0.25, PCB_T, -0.12);
      marking(b, "SRD-05VDC", 0.65, 0.17, -0.25, PCB_T + 0.602, -0.2);
      marking(b, "10A 250VAC", 0.6, 0.12, -0.25, PCB_T + 0.603, 0);
      terminal(b, 3, 0.5, -0.1, "#2e9d4a");
      break;
    }
    case "water-pump": {
      b.cylZ(0.42, 0.9, plastic("#2d7696"), 0, 0.48, -0.08);
      b.cylZ(0.2, 0.2, plastic("#252f37"), 0, 0.48, 0.44);
      b.cyl(0.12, 0.42, plastic("#e1e7e8"), 0.25, 0.5, 0);
      legsDown(b, def, 0.12);
      break;
    }
    default: {
      // buzzer
      b.cyl(0.33, 0.45, plastic("#141414"), 0, 0, -0.05, 32);
      b.cyl(0.06, 0.01, std("#000"), 0, 0.45, -0.05, 12);
      b.add(new THREE.TorusGeometry(0.2, 0.01, 6, 24), std("#333"), [0, 0.455, -0.05], [Math.PI / 2, 0, 0]);
      legsDown(b, def, 0.05);
    }
  }
}

function display(b: B, def: PartDef) {
  const { w, d, id } = def;
  if (id.startsWith("led")) {
    const c = id === "led-red" ? "#ff2a2a" : id === "led-green" ? "#2aff7a" : "#f4f4ff";
    b.cyl(0.2, 0.05, glass(c, 0.85), 0, 0.28, -0.05, 24);
    b.cyl(0.17, 0.25, glass(c, 0.75), 0, 0.33, -0.05, 24);
    b.add(new THREE.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass(c, 0.75), [0, 0.58, -0.05]);
    b.box(0.045, 0.27, 0.035, metal(), -0.065, 0.29, -0.05);
    b.box(0.095, 0.12, 0.065, metal(), 0.055, 0.4, -0.05);
    b.box(0.06, 0.009, 0.02, std("#ddd3a9"), 0, 0.51, -0.05);
    legsDown(b, def, 0.28);
    return;
  }
  if (id === "seven-seg") {
    b.box(w, 0.35, d, plastic("#111"));
    const seg = glass("#ff2a2a", 0.55);
    const t = 0.36;
    const L = 0.45;
    b.box(L, 0.01, 0.07, seg, 0, t, -0.42);
    b.box(L, 0.01, 0.07, seg, 0, t, -0.05);
    b.box(L, 0.01, 0.07, seg, 0, t, 0.32);
    for (const sx of [-1, 1]) for (const sz of [-0.24, 0.14]) b.box(0.07, 0.01, 0.32, seg, sx * 0.25, t, sz);
    b.cyl(0.04, 0.01, seg, 0.35, t, 0.36, 10);
    def.pins.forEach((_, i) => {
      const [x, y, z] = pinLocal(def, i);
      b.cylZ(.014, .26, metal(), x, y, z > 0 ? z - .06 : z + .06, 8);
    });
    return;
  }
  // LCD / OLED
  const isLcd = id === "lcd-i2c" || id === "lcd-1602";
  pcb(b, w, d, isLcd ? "#1f7a3e" : "#14254a");
  def.pins.forEach((pin, i) => {
    const [x, y, z] = pinLocal(def, i);
    b.box(.11, .1, .11, plastic("#171a1b"), id === "lcd-i2c" ? -w / 2 + .03 : x, PCB_T, z);
    if (id === "lcd-i2c") b.cylX(.017, .3, metal("#d3b976"), x, y, z, 8);
    else b.box(.025, .18, .025, metal("#d3b976"), x, .1, z);
    marking(b, pin.name, .14, .065, id === "lcd-i2c" ? -w / 2 + .2 : x, .067, id === "lcd-i2c" ? z : z + .12, "#ebf2ed", 130);
  });
  if (isLcd) {
    b.box(w * 0.88, 0.25, d * 0.62, plastic("#1a1a1a"), 0, PCB_T, -0.12);
    b.box(w * 0.78, 0.01, d * 0.42, std("#9fd12e", { emissive: "#7bb31a", emissiveIntensity: 0.35, roughness: 0.2 }), 0, PCB_T + 0.25, -0.12);
    printSurface(b, w * 0.74, d * 0.38, 0, PCB_T + 0.263, -0.12, (ctx) => {
      ctx.fillStyle = "#456527";
      for (let row = 0; row < 2; row++) for (let col = 0; col < 16; col++) {
        for (let sy = 0; sy < 7; sy++) for (let sx = 0; sx < 5; sx++) ctx.fillRect(col * 32 + sx * 4 + 5, row * 128 + sy * 12 + 20, 3, 9);
      }
    });
    const back = new B();
    pcb(back, w * .85, d * .75, "#266d41", false);
    for (const x of [-.6, .55]) back.cyl(.18, .04, plastic("#171b19"), x, PCB_T, 0, 24);
    if (id === "lcd-i2c") {
      back.box(1.2, .06, .4, plastic("#17242c"), -.2, .11, 0);
      chip(back, .4, .18, -.2, 0, true);
      back.box(.2, .12, .2, plastic("#24529d"), .35, .11, 0);
    }
    back.g.rotation.x = Math.PI; back.g.position.y = -.01; b.g.add(back.g);
  } else {
    b.box(w * 0.92, 0.06, d * 0.6, plastic("#0b0b0b"), 0, PCB_T, -0.12);
    b.box(w * 0.82, 0.005, d * 0.45, std("#1d1044", { roughness: 0.1, emissive: "#25114b", emissiveIntensity: 0.12 }), 0, PCB_T + 0.06, -0.14);
    b.box(.46, .015, .22, plastic("#b79928"), 0, .067, .36);
    b.box(.4, .02, .19, plastic("#101515"), 0, .083, .36);
  }
}

function passive(b: B, def: PartDef) {
  const { id } = def;
  if (["power-source", "power-switch", "xl4015", "s-60-12"].includes(id)) {
    if (id === "power-source") {
      b.box(1.1,.6,.72,plastic("#344e65")); b.box(1.12,.06,.74,plastic("#202930"),0,.6);
      marking(b,def.name,.95,.38,0,.665,0,"#e8eee8",105);
    } else if (id === "power-switch") {
      b.box(.7,.3,.55,plastic("#171b1e")); b.box(.48,.1,.4,plastic("#3d4447"),0,.3);
      marking(b,"I / O",.35,.22,0,.405,0,"#f0f1e9",145);
    } else if (id === "xl4015") {
      pcb(b,def.w,def.d,"#267eb0"); b.cyl(.22,.28,plastic("#323b39"),-.17,PCB_T,0,32);
      b.cyl(.14,.29,plastic("#242a2d"),-.55,PCB_T,0,24); b.cyl(.13,.012,metal(),-.55,.35,0,24);
      b.box(.3,.17,.25,plastic("#1c64bd"),.45,PCB_T,-.12); b.cyl(.06,.012,metal(),.45,.23,-.12,16);
      chip(b,.3,.23,.24,.16,true); marking(b,"XL4015",.55,.12,0,.068,-.33);
    } else {
      b.box(2.65,.64,1.45,metal("#bbc2c5"));
      for(let row=0;row<7;row++) for(let col=0;col<13;col++) b.cyl(.04,.005,plastic("#303c42"),-1.1+col*.17,.645,-.6+row*.16,12);
      b.box(1.55,.007,.22,plastic("#e4e4d8"),0,.65,-.34); marking(b,"S-60-12 · 12V 5A",1.5,.18,0,.659,-.34,"#30373b",120);
    }
    def.pins.forEach((pin,i)=>{const [x,y,z]=pinLocal(def,i); b.box(.16,.12,.14,plastic("#243d45"),x,y-.12,z);b.cyl(.045,.012,metal(),x,y,z,16);});
    return;
  }
  if (id === "breadboard" || id === "breadboard-400") {
    b.box(def.w, .16, def.d, plastic("#eeede5"));
    for (const z of [-1.1, 1.1]) b.box(def.w-.08,.025,.46,plastic("#f8f7f0"),0,.16,z);
    for (const z of [-.48,.48]) b.box(def.w-.08,.025,.8,plastic("#faf9f2"),0,.16,z);
    b.box(def.w-.18,.006,.15,plastic("#b7b9b1"),0,.16,0);
    const holes = new THREE.InstancedMesh(new THREE.BoxGeometry(.046,.008,.05),plastic("#343a39"),def.pins.length);
    const rim = new THREE.InstancedMesh(new THREE.BoxGeometry(.068,.005,.072),plastic("#bcbeb5"),def.pins.length);
    const matrix = new THREE.Matrix4();
    def.pins.forEach((_,i)=>{const [x,y,z]=pinLocal(def,i);matrix.makeTranslation(x,y-.005,z);holes.setMatrixAt(i,matrix);matrix.makeTranslation(x,y-.01,z);rim.setMatrixAt(i,matrix);});
    holes.raycast=()=>{};rim.raycast=()=>{};b.g.add(rim,holes);
    for(const z of [-1.31,.91]) b.box(def.w-.5,.005,.015,std("#dc3e3c"),0,.19,z);
    for(const z of [-.91,1.31]) b.box(def.w-.5,.005,.015,std("#3582c4"),0,.19,z);
    for(const z of [-1.31,.91]) for(const x of [-def.w/2+.12,def.w/2-.12]) marking(b,"+",.15,.13,x,.196,z,"#dc3e3c",160);
    for(const z of [-.91,1.31]) for(const x of [-def.w/2+.12,def.w/2-.12]) marking(b,"−",.15,.13,x,.196,z,"#3582c4",160);
    const columns = id === "breadboard-400" ? 30 : 63;
    printSurface(b,def.w,1.86,0,.194,0,ctx=>{
      ctx.fillStyle="#737972";ctx.font="16px monospace";ctx.textAlign="center";
      for(let n=1;n<=columns;n++) {
        const x=((n-1-(columns-1)/2)*.125/def.w+.5)*1024;
        if(columns===30||n===1||n%5===0){ctx.fillText(String(n),x,22);ctx.fillText(String(n),x,492);}
      }
      "ABCDEFGHIJ".split("").forEach((row,i)=>{
        const z=i<5 ? -.73+i*.125 : .23+(i-5)*.125, y=(z/1.86+.5)*512;
        ctx.fillText(row,24,y+5);ctx.fillText(row,1000,y+5);
      });
    },[1024,512]);
    return;
  }
  if (id === "resistor-220" || id === "resistor-10k" || id === "resistor-variable") {
    const profile = [[0.055, -0.3], [0.09, -0.26], [0.105, -0.2], [0.08, -0.14], [0.08, 0.14], [0.105, 0.2], [0.09, 0.26], [0.055, 0.3]].map(([r, x]) => new THREE.Vector2(r, x));
    b.add(new THREE.LatheGeometry(profile, 32), std("#d4b583", { roughness: 0.6 }), [0, 0.15, -0.03], [0, 0, Math.PI / 2]);
    const resistance = Number(/· ([\d.]+) Ω/.exec(def.name)?.[1] ?? (id === "resistor-10k" ? 10000 : 220));
    const palette = ["#171717", "#7a4a1f", "#e5484d", "#ea8b20", "#edcf35", "#37874c", "#327bc1", "#8955ab", "#888888", "#eeeeec"];
    const exponent = Math.floor(Math.log10(resistance)) - 1, digits = Math.min(99, Math.round(resistance / 10 ** exponent));
    const bands = [palette[Math.floor(digits / 10)]!, palette[digits % 10]!, exponent === -2 ? "#c4c7c9" : exponent < 0 ? "#d4af37" : palette[Math.min(9, exponent)]!, "#d4af37"];
    for (const [i, x] of [-0.17, -0.08, 0.01, 0.15].entries()) {
      const c = bands[i] ?? "#d4af37";
      b.cylX(Math.abs(x) >= 0.15 ? 0.098 : 0.082, 0.035, std(c), x, 0.15, -0.03, 32);
    }
    def.pins.forEach((_, index) => {
      const [x, y, z] = pinLocal(def, index);
      const side = index === 0 ? -1 : 1;
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.3, 0.15, -0.03),
        new THREE.Vector3(side * 0.43, 0.15, -0.03),
        new THREE.Vector3(side * 0.46, 0.12, 0.13),
        new THREE.Vector3(x, y, z),
      ]);
      b.add(new THREE.TubeGeometry(path, 16, 0.015, 8, false), metal(), [0, 0, 0]);
    });
    return;
  }
  if (id === "push-button") {
    b.box(0.6, 0.2, 0.6, plastic("#1a1a1a"), 0, 0, -0.03);
    b.box(0.6, 0.01, 0.6, metal("#c9ced3"), 0, 0.2, -0.03);
    b.cyl(0.17, 0.18, plastic("#2c2c2c"), 0, 0.2, -0.03, 24);
    legsDown(b, def, 0.05);
    return;
  }
  // Legacy capacitor model for circuits created before the PDF catalog was imported.
  b.cyl(0.22, 0.65, std("#1d3fa0", { roughness: 0.35 }), 0, 0.12, -0.03, 28);
  b.cyl(0.2, 0.01, metal("#c9ced3"), 0, 0.77, -0.03, 28);
  b.box(0.08, 0.65, 0.02, std("#e6e6e6"), 0.12, 0.12, 0.17);
  legsDown(b, def, 0.12);
}

function wireless(b: B, def: PartDef) {
  referenceRadio(b, def);
}

function referenceRadio(b: B, def: PartDef) {
  const {id,w,d}=def;
  pcb(b,w,d,def.color,id === "rfid-rc522");
  const rfid=id === "rfid-rc522", bluetooth=id === "hc05", esp=id === "esp8266-module";
  if(rfid) {
    printSurface(b,1.4,1.7,0,.067,-.28,ctx=>{
      ctx.strokeStyle="#c3b35b";ctx.lineWidth=4;
      for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(256,128,210-i*26,105-i*13,0,.35,Math.PI*2-.35);ctx.stroke();}
    });
    chip(b,.3,.3,.16,.7,true);
    b.box(.12,.09,.35,metal(),-.56,PCB_T,.75);
    for(let i=0;i<5;i++) smd(b,-.25+i*.13,.48,"#afa284");
    marking(b,"MFRC522",.8,.14,0,.068,-1.03);
  } else {
    if(bluetooth) {
      b.box(1.47,.035,.66,std("#27964a"),-.12,PCB_T,0);
      for(let i=0;i<12;i++) for(const z of [-.34,.34]) b.box(.055,.008,.055,metal(),-.8+i*.115,.101,z);
      b.box(.14,.07,.14,plastic("#242829"),.7,PCB_T,-.28);
      b.cyl(.035,.018,metal(),.7,.14,-.28,12);
      b.box(.09,.025,.055,glass("#f44336",.9),.72,PCB_T,.3);
      marking(b,"HC-05",.33,.15,-.03,.178,-.04,"#eff4eb",125);
    }
    chip(b,esp ? .34 : .37,.34,esp ? -.02 : -.07,0,true);
    const antennaX=esp||bluetooth ? -w/2+.23 : w/2-.27;
    printSurface(b,.44,d*.78,antennaX,bluetooth ? .103 : .067,0,ctx=>{
      ctx.strokeStyle="#d0bb70";ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(70,15);ctx.lineTo(70,240);ctx.lineTo(445,240);
      for(let i=0;i<5;i++){const y=220-i*40;ctx.lineTo(i%2 ? 445 : 150,y);ctx.lineTo(i%2 ? 445 : 150,y-25);}ctx.stroke();
    });
    if(!bluetooth){
      b.box(.45,.08,.16,metal("#bfc2bb"),esp ? -.12 : -.2,PCB_T,.26);
      marking(b,esp ? "ESP-01" : "16.000",.4,.12,esp ? -.12 : -.2,.148,.26,"#656c6b",105);
    }
    for(let i=0;i<5;i++) smd(b,esp ? .21 : .3,-.27+i*.12,i%2 ? "#b6a270" : "#333638");
  }
  def.pins.forEach((pin,i)=>{
    const [x,y,z]=pinLocal(def,i);
    b.box(.12,.1,.12,plastic("#171b1c"),bluetooth ? w/2-.04 : x,PCB_T,z);
    if(bluetooth)b.cylX(.018,.25,metal("#cfb572"),x,y,z,8);
    else b.box(.025,.2,.025,metal("#cfb572"),x,.08,z);
    marking(b,pin.name,.16,.055,bluetooth ? w/2-.23 : x,.069,bluetooth ? z : rfid ? z-.13 : z+.08,"#ebf0e8",130);
  });
}

export function buildModel(def: PartDef): THREE.Group {
  const b = new B();
  switch (def.category) {
    case "Microcontrollers": microcontroller(b, def); break;
    case "Sensors": sensor(b, def); break;
    case "Actuators": actuator(b, def); break;
    case "Displays & LEDs": display(b, def); break;
    case "Motor Drivers": actuator(b, def); break;
    case "Wireless": wireless(b, def); break;
    case "Passive & Input":
      if (def.id === "potentiometer") sensor(b, def);
      else passive(b, def);
      break;
    default: passive(b, def);
  }
  return b.g;
}
