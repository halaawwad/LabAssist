import * as THREE from "three";
import { box, material, textPlane, connectRod } from "./loginLightRobot";
import type { simulateSmartLight } from "./loginDemo";
export function createSmartLightBench(world: THREE.Group) {
  const metal = material("#b9c5c2", 0.85, 0.26),
    cream = material("#f5f2df", 0.02, 0.8),
    dark = material("#334d52");
  box(world, [9, 0.24, 6.2], [0, -0.1, 0.2], material("#d4e2d8", 0.15), 0.16);
  box(world, [8.9, 0.08, 6.1], [0, 0.06, 0.2], material("#eef2e4"), 0.1);
  for (const x of [-3.7, 3.7])
    for (const z of [-2.1, 2.4]) box(world, [0.18, 0.55, 0.18], [x, -0.42, z], dark, 0.04);
  // Breadboard: isolated five-hole strips, central trench, and separate supply rails.
  const board = box(world, [5.8, 0.24, 2.85], [0, 0.28, 1], cream, 0.13);
  box(world, [5.35, 0.012, 0.09], [0, 0.407, 1], material("#c6cdbf"), 0.02);
  const rowZ = [-0.91, -0.73, -0.55, -0.37, -0.19, 0.19, 0.37, 0.55, 0.73, 0.91];
  const holes = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.027, 0.027, 0.009, 8),
    material("#758379"),
    26 * 14,
  );
  let index = 0;
  const transform = new THREE.Matrix4();
  for (let c = 0; c < 26; c++)
    for (const z of [...rowZ, -1.18, -1.32, 1.18, 1.32]) {
      transform.makeTranslation(-2.5 + c * 0.2, 0.41, 1 + z);
      holes.setMatrixAt(index++, transform);
    }
  world.add(holes);
  box(world, [5.25, 0.006, 0.012], [0, 0.417, -0.25], material("#c47a70"), 0.001);
  box(world, [5.25, 0.006, 0.012], [0, 0.417, 2.25], material("#6f929d"), 0.001);
  const railLabel = textPlane(world, "+  9V", 0.55, 0.14, [-2.35, 0.425, -0.45], "#a66660");
  railLabel.rotation.x = -Math.PI / 2;
  const groundLabel = textPlane(world, "-  GND", 0.7, 0.14, [-2.25, 0.425, 2.47], "#53757b");
  groundLabel.rotation.x = -Math.PI / 2;
  const assemblyWires: { mesh: THREE.Mesh; count: number }[] = [];
  const trace = (points: THREE.Vector3[], color: string, radius = 0.021) => {
    const curve = new THREE.CatmullRomCurve3(points),
      geometry = new THREE.TubeGeometry(curve, 32, radius, 8, false),
      mesh = new THREE.Mesh(geometry, material(color, 0.15, 0.55));
    mesh.castShadow = true;
    world.add(mesh);
    const count = geometry.index!.count;
    geometry.setDrawRange(0, 0);
    assemblyWires.push({ mesh, count });
    return { curve, mesh };
  };
  const point = (x: number, z: number) => new THREE.Vector3(x, 0.43, z);
  const jumper = (a: THREE.Vector3, b: THREE.Vector3, color: string, rise = 0.15) =>
    trace(
      [
        a,
        a
          .clone()
          .lerp(b, 0.3)
          .add(new THREE.Vector3(0, rise, 0)),
        a
          .clone()
          .lerp(b, 0.75)
          .add(new THREE.Vector3(0, rise, 0)),
        b,
      ],
      color,
    );
  const resistor = (a: THREE.Vector3, b: THREE.Vector3, bands: string[], label: string) => {
    const direction = b.clone().sub(a).normalize(),
      center = a.clone().add(b).multiplyScalar(0.5);
    center.y = 0.59;
    const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 12), metal);
    world.add(lead);
    connectRod(lead, a, b);
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.31, 20),
      material("#cfc0a0"),
    );
    body.position.copy(center);
    body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    body.castShadow = true;
    world.add(body);
    bands.forEach((color, i) => {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.012, 6, 20), material(color));
      stripe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
      stripe.position.copy(center).addScaledVector(direction, -0.1 + i * 0.065);
      world.add(stripe);
    });
    for (const p of [a, b]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1, 10), metal);
      world.add(leg);
      connectRod(leg, p, center.clone().addScaledVector(direction, p === a ? -0.2 : 0.2));
    }
    const text = textPlane(world, label, 0.55, 0.14, [center.x + 0.28, 0.62, center.z]);
    text.rotation.x = -Math.PI / 2;
  };
  resistor(
    point(-1.7, -0.18),
    point(-1.7, 0.6),
    ["#79523a", "#202b2b", "#bb9c42", "#b9a263"],
    "100k",
  );
  resistor(point(-1.1, 1.1), point(-0.3, 1.1), ["#c7aa52", "#8d6a9d", "#b77d49", "#b9a263"], "47k");
  resistor(
    point(1.55, -0.18),
    point(1.55, 0.62),
    ["#79523a", "#202b2b", "#a75c4e", "#b9a263"],
    "1k",
  );
  // LDR's serpentine resistive surface faces upward, where the robot can shade it.
  const ldr = new THREE.Group();
  ldr.position.set(-1.6, 0.87, 1.1);
  world.add(ldr);
  const ldrCanvas = document.createElement("canvas");
  ldrCanvas.width = ldrCanvas.height = 256;
  const ldrCtx = ldrCanvas.getContext("2d")!;
  ldrCtx.fillStyle = "#dac9a0";
  ldrCtx.fillRect(0, 0, 256, 256);
  ldrCtx.strokeStyle = "#9b694d";
  ldrCtx.lineWidth = 10;
  ldrCtx.lineJoin = "round";
  ldrCtx.beginPath();
  ldrCtx.moveTo(48, 45);
  for (let i = 0; i < 6; i++) {
    const y = 45 + i * 31;
    ldrCtx.lineTo(i % 2 ? 48 : 208, y);
    if (i < 5) ldrCtx.lineTo(i % 2 ? 48 : 208, y + 31);
  }
  ldrCtx.stroke();
  const ldrTexture = new THREE.CanvasTexture(ldrCanvas);
  ldrTexture.colorSpace = THREE.SRGBColorSpace;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.045, 40), [
    material("#a38d64", 0.2),
    new THREE.MeshStandardMaterial({ map: ldrTexture, roughness: 0.8 }),
    material("#cab78d"),
  ]);
  disc.castShadow = true;
  ldr.add(disc);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.43, 12), metal);
    leg.position.set(side * 0.1, -0.23, 0);
    ldr.add(leg);
  }
  const sensorPoint = new THREE.Vector3(-1.6, 0.9, 1.1);
  // NPN low-side switch, with three separate C/B/E leads.
  const transistor = new THREE.Group();
  transistor.position.set(0.35, 0.71, 1.25);
  world.add(transistor);
  box(transistor, [0.31, 0.32, 0.2], [0, 0, 0], material("#263335"), 0.06);
  textPlane(transistor, "BC547", 0.25, 0.08, [0, 0.025, 0.108], "#bac6bc");
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.29, 10), metal);
    leg.position.set(-0.12 + i * 0.12, -0.25, 0);
    transistor.add(leg);
  }
  // Saturated red LED, driven by the circuit model rather than the animation clock.
  const led = new THREE.Group();
  led.position.set(1.65, 0.75, 1.3);
  world.add(led);
  const ledMaterial = new THREE.MeshPhysicalMaterial({
    color: "#a51627",
    roughness: 0.26,
    metalness: 0,
    transparent: false,
    opacity: 1,
    emissive: "#ff1237",
    emissiveIntensity: 0,
    toneMapped: false,
  });
  const ledBody = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.24, 28), ledMaterial);
  ledBody.position.y = 0.12;
  led.add(ledBody);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    ledMaterial,
  );
  dome.position.y = 0.24;
  led.add(dome);
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.045, 28), ledMaterial);
  led.add(flange);
  for (const side of [-1, 1]) {
    const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.35, 12), metal);
    lead.position.set(side * 0.1, -0.19, 0);
    led.add(lead);
  }
  const ledLight = new THREE.PointLight("#ff2449", 0, 6, 2);
  ledLight.position.set(1.65, 1.13, 1.3);
  ledLight.castShadow = false;
  world.add(ledLight);
  const warmBounce = new THREE.PointLight("#ff6b76", 0, 5, 2);
  warmBounce.position.set(-0.5, 1.75, 0.45);
  world.add(warmBounce);
  // A real supply outline with positive and negative snap terminals.
  const battery = new THREE.Group();
  battery.position.set(-3.0, 0.45, -1.45);
  battery.scale.setScalar(0.62);
  battery.rotation.z = Math.PI / 2;
  world.add(battery);
  box(battery, [0.9, 1.42, 0.68], [0, 0, 0], material("#8b7d62", 0.35), 0.07);
  box(battery, [0.91, 0.35, 0.69], [0, 0.56, 0], material("#364850"), 0.045);
  textPlane(battery, "9V", 0.5, 0.26, [0, 0.03, 0.352], "#f0ebd4");
  for (const side of [-1, 1]) {
    const terminal = new THREE.Mesh(
      new THREE.CylinderGeometry(
        side < 0 ? 0.075 : 0.1,
        side < 0 ? 0.075 : 0.1,
        0.075,
        side < 0 ? 20 : 6,
      ),
      metal,
    );
    terminal.position.set(side * 0.22, 0.77, 0);
    battery.add(terminal);
  }
  battery.updateMatrix();
  const positive = new THREE.Vector3(-0.22, 0.8, 0).applyMatrix4(battery.matrix),
    negative = new THREE.Vector3(0.22, 0.8, 0).applyMatrix4(battery.matrix);
  trace(
    [
      negative,
      new THREE.Vector3(-3.2, 0.6, -1),
      new THREE.Vector3(-3.15, 0.6, 2.1),
      point(-2.4, 2.18),
    ],
    "#42565e",
  );
  jumper(point(-1.7, 0.6), point(-1.7, 1.1), "#78977c", 0.08);
  jumper(point(-1.5, 1.1), point(-1.5, 2.18), "#435860", 0.11);
  jumper(point(-1.7, 1.1), point(-1.1, 1.1), "#7f9d7d", 0.1);
  jumper(point(-0.3, 1.1), point(0.35, 1.25), "#7f9d7d", 0.15);
  jumper(point(0.47, 1.25), point(0.5, 2.18), "#435860", 0.1);
  jumper(point(0.23, 1.25), point(1.75, 1.3), "#b3966f", 0.19);
  jumper(point(1.55, 0.62), point(1.55, 1.3), "#be8e65", 0.09);
  const looseStart = new THREE.Vector3(-1.12, 1.42, -0.72),
    socket = point(-2.4, -0.18);
  const wireGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      positive,
      new THREE.Vector3(-3.0, 0.75, -1.0),
      new THREE.Vector3(-2.7, 0.65, -0.5),
      looseStart,
    ]),
    56,
    0.027,
    8,
    false,
  );
  const finalWire = new THREE.Mesh(wireGeometry, material("#bf7164", 0.1));
  world.add(finalWire);
  finalWire.geometry.setDrawRange(0, 0);
  const plug = box(
    world,
    [0.09, 0.16, 0.09],
    [looseStart.x, looseStart.y, looseStart.z],
    dark,
    0.025,
  );
  const socketRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.009, 6, 24),
    new THREE.MeshBasicMaterial({ color: "#b9846f" }),
  );
  socketRing.rotation.x = -Math.PI / 2;
  socketRing.position.copy(socket).add(new THREE.Vector3(0, 0.02, 0));
  world.add(socketRing);
  const pulseCurve = new THREE.CatmullRomCurve3([
    socket,
    point(-1.7, -0.18),
    point(-1.7, 0.6),
    point(-0.3, 1.1),
    point(0.35, 1.25),
    point(1.55, 0.62),
    new THREE.Vector3(1.65, 1.1, 1.3),
    point(0.5, 2.18),
  ]);
  const pulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 12),
    new THREE.MeshBasicMaterial({ color: "#f2d69f" }),
  );
  pulse.visible = false;
  world.add(pulse);
  // Instrument screen uses the same measured state as the physical LED and light.
  const meter = new THREE.Group();
  meter.position.set(2.1, 1.63, -1.55);
  meter.rotation.y = -0.2;
  world.add(meter);
  box(meter, [2.12, 1.12, 0.2], [0, 0, 0], dark, 0.1);
  box(meter, [0.15, 1.0, 0.15], [0, -0.9, -0.03], metal, 0.035);
  box(meter, [0.9, 0.08, 0.6], [0, -1.4, 0], dark, 0.06);
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 768;
  screenCanvas.height = 384;
  const ctx = screenCanvas.getContext("2d")!,
    screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.92, 0.93),
    new THREE.MeshBasicMaterial({ map: screenTexture }),
  );
  screen.position.z = 0.11;
  meter.add(screen);
  const label = textPlane(
    world,
    "SMART LIGHT / LDR + NPN",
    2.7,
    0.24,
    [-0.9, 0.123, 2.88],
    "#567367",
  );
  label.rotation.x = -Math.PI / 2;
  let lastScreen = "";
  const lastTip = new THREE.Vector3(Infinity, 0, 0);
  return {
    board,
    ldr,
    sensorPoint,
    looseStart,
    socket,
    update(
      tip: THREE.Vector3,
      state: ReturnType<typeof simulateSmartLight>,
      pulseProgress: number,
      assemblyProgress: number,
    ) {
      const count = assemblyWires.length + 1;
      const fraction = (i: number) =>
        THREE.MathUtils.smoothstep(assemblyProgress, (i / count) * 0.8, (i / count) * 0.8 + 0.2);
      assemblyWires.forEach(({ mesh, count: indices }, i) =>
        mesh.geometry.setDrawRange(0, Math.floor((indices * fraction(i)) / 3) * 3),
      );
      if (lastTip.distanceToSquared(tip) > 0.000001) {
        lastTip.copy(tip);
        const next = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            positive,
            new THREE.Vector3(-3.0, 0.75, -1.0),
            new THREE.Vector3(-2.7, 0.65, -0.5),
            tip,
          ]),
          56,
          0.027,
          8,
          false,
        );
        finalWire.geometry.dispose();
        finalWire.geometry = next;
        plug.position.copy(tip);
      }
      const finalFraction = fraction(assemblyWires.length);
      finalWire.geometry.setDrawRange(
        0,
        Math.floor((finalWire.geometry.index!.count * finalFraction) / 3) * 3,
      );
      plug.visible = finalFraction > 0;
      if (plug.visible) {
        const curve = new THREE.CatmullRomCurve3([
          positive,
          new THREE.Vector3(-3.0, 0.75, -1.0),
          new THREE.Vector3(-2.7, 0.65, -0.5),
          tip,
        ]);
        plug.position.copy(curve.getPointAt(finalFraction));
      }
      ledMaterial.emissiveIntensity = state.brightness * 0.9;
      ledMaterial.color.set(state.ledOn ? "#f51b3b" : "#981c2e");
      ledLight.intensity = state.brightness * 6;
      warmBounce.intensity = state.brightness * 1.8;
      pulse.visible = pulseProgress > 0 && pulseProgress < 1;
      if (pulse.visible) pulse.position.copy(pulseCurve.getPointAt(pulseProgress));
      const key = `${state.light}-${state.ledOn}-${state.connected}`;
      if (key !== lastScreen) {
        lastScreen = key;
        ctx.fillStyle = "#1c383f";
        ctx.fillRect(0, 0, 768, 384);
        ctx.textAlign = "left";
        ctx.fillStyle = "#8facab";
        ctx.font = "24px monospace";
        ctx.fillText("LIGHT SENSOR / LIVE", 40, 51);
        ctx.fillStyle = "#e7f0dc";
        ctx.font = "bold 66px monospace";
        ctx.fillText(`Light: ${state.light}%`, 40, 150);
        ctx.fillStyle = state.ledOn ? "#ff7185" : "#9eb5ad";
        ctx.font = "bold 57px monospace";
        ctx.fillText(`LED: ${state.ledOn ? "ON" : "OFF"}`, 40, 239);
        ctx.fillStyle = "#37545a";
        ctx.fillRect(40, 294, 680, 12);
        ctx.fillStyle = "#aac6ad";
        ctx.fillRect(40, 294, (680 * state.light) / 100, 12);
        ctx.font = "22px monospace";
        ctx.fillStyle = "#829e99";
        ctx.fillText(state.connected ? "CIRCUIT CONNECTED" : "AWAITING FINAL WIRE", 40, 351);
        screenTexture.needsUpdate = true;
      }
      return {
        completedWires:
          assemblyWires.filter(({ mesh, count }) => mesh.geometry.drawRange.count >= count).length +
          (finalWire.geometry.drawRange.count >= finalWire.geometry.index!.count ? 1 : 0),
        totalWires: count,
      };
    },
  };
}
