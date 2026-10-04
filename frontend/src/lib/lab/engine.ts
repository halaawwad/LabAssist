import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { CATALOG_MAP, PIN_COLORS, isLeaded, pinLocal, type PartDef } from "./catalog";
import { buildModel } from "./models";
import type { CircuitData, PinRef, Wire } from "./types";

export type Selection = { kind: "part" | "wire"; id: string } | null;

export interface EngineCallbacks {
  onSelect: (s: Selection) => void;
  onMovePart: (id: string, x: number, z: number) => void;
  onConnect: (from: PinRef, to: PinRef) => void;
  onPinInfo: (info: { ref: PinRef; x: number; y: number; compact?: boolean } | null) => void;
  onDropPart: (type: string, x: number, z: number) => void;
  onWireCtrl: (id: string, ctrl: [number, number]) => void;
}

interface PartObj {
  group: THREE.Group;
  type: string;
  pins: THREE.Mesh[];
  body: THREE.Mesh;
}

type Mode =
  | { m: "idle" }
  | { m: "pan"; sx: number; sy: number; target: THREE.Vector3; moved: boolean }
  | { m: "drag"; id: string; off: THREE.Vector2; moved: boolean; sx: number; sy: number }
  | { m: "wire"; from: PinRef; start: THREE.Vector3; sx: number; sy: number; moved: boolean }
  | { m: "ctrl"; id: string };

const CAM_OFFSET = new THREE.Vector3(14, 18, 14);
const VIEW = 14;

export class LabEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private target = new THREE.Vector3();
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private parts = new Map<string, PartObj>();
  private wireGroup = new THREE.Group();
  private wireMeshes = new Map<string, THREE.Mesh>();
  private grid: THREE.GridHelper;
  private handle: THREE.Mesh;
  private preview: THREE.Mesh | null = null;
  private data: CircuitData = { parts: [], wires: [] };
  private selection: Selection = null;
  private flagged = new Set<string>();
  private snap = true;
  private mode: Mode = { m: "idle" };
  private dirty = true;
  private raf = 0;
  private ro: ResizeObserver;
  private pinLabelCache = new Map<string, THREE.Texture>();
  private hoverPin: THREE.Mesh | null = null;

  constructor(private el: HTMLElement, private cb: EngineCallbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.scene.background = new THREE.Color("#eef2f3");
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.6;
    pmrem.dispose();

    // lights
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#b8c7c9", 1.4));
    const sun = new THREE.DirectionalLight("#ffffff", 2.2);
    sun.position.set(8, 20, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 6;
    sun.shadow.bias = -0.0005;
    const s = sun.shadow.camera;
    s.left = s.bottom = -25;
    s.right = s.top = 25;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight("#bff3ea", 0.6);
    fill.position.set(-10, 8, -6);
    this.scene.add(fill);

    // ground mat
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: "#f7f9f9", roughness: 0.95 }),
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    this.grid = new THREE.GridHelper(80, 160, "#9fc9c3", "#d6e2e3");
    (this.grid.material as THREE.Material).transparent = true;
    (this.grid.material as THREE.Material).opacity = 0.8;
    this.grid.position.y = 0.002;
    this.scene.add(this.grid);
    this.scene.add(this.wireGroup);

    this.handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 12),
      new THREE.MeshStandardMaterial({ color: "#0d9488", emissive: "#0d9488", emissiveIntensity: 0.4 }),
    );
    this.handle.visible = false;
    this.scene.add(this.handle);

    this.resetView();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.resize();

    const c = this.renderer.domElement;
    c.addEventListener("pointerdown", this.down);
    window.addEventListener("pointermove", this.move);
    window.addEventListener("pointerup", this.up);
    c.addEventListener("wheel", this.wheel, { passive: false });
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("dragover", this.dragOver);
    el.addEventListener("drop", this.drop);

    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (this.dirty) {
        this.dirty = false;
        this.renderer.render(this.scene, this.camera);
      }
    };
    loop();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    window.removeEventListener("pointermove", this.move);
    window.removeEventListener("pointerup", this.up);
    this.el.removeEventListener("dragover", this.dragOver);
    this.el.removeEventListener("drop", this.drop);
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const m = o.material as THREE.Material | THREE.Material[];
        (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
      }
    });
    this.pinLabelCache.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ---------- public API
  setData(data: CircuitData, selection: Selection, flagged: Set<string>) {
    this.data = data;
    this.selection = selection;
    this.flagged = flagged;
    this.syncParts();
    this.syncWires();
    this.dirty = true;
  }
  setGrid(v: boolean) {
    this.grid.visible = v;
    this.dirty = true;
  }
  setSnap(v: boolean) {
    this.snap = v;
  }
  zoom(f: number) {
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * f, 0.3, 5);
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }
  resetView() {
    this.target.set(0, 0, 0);
    this.camera.zoom = 1;
    this.updateCamera();
  }

  // ---------- scene sync
  /** Engraved connector legend, printed lengthwise so even closely spaced headers have a name. */
  private pinLabel(name: string, printed = false) {
    const key = `${printed ? "ink" : "tag"}:${name}`;
    const cached = this.pinLabelCache.get(key);
    if (cached) return cached;
    const cv = document.createElement("canvas");
    cv.width = 128;
    cv.height = 384;
    const g = cv.getContext("2d");
    if (!g) return null;
    g.clearRect(0, 0, cv.width, cv.height);
    g.save();
    g.translate(cv.width / 2, cv.height / 2);
    g.rotate(-Math.PI / 2);
    g.fillStyle = printed ? "#ffffff" : "#172c30";
    let size = 83;
    do {
      g.font = `bold ${size}px Arial, sans-serif`;
      if (g.measureText(name).width <= 340) break;
      size -= 3;
    } while (size > 28);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(name, 0, 0);
    g.restore();
    const texture = new THREE.CanvasTexture(cv);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    this.pinLabelCache.set(key, texture);
    return texture;
  }

  private buildPart(id: string, type: string): PartObj {
    const def = CATALOG_MAP[type]!;
    const group = new THREE.Group();
    group.userData = { partId: id };
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(def.w, def.h, def.d),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    body.position.y = def.h / 2;
    body.userData = { partId: id };
    group.add(body);
    group.add(buildModel(def));

    const pins: THREE.Mesh[] = [];
    const header = new THREE.BoxGeometry(0.045, 0.14, 0.045);
    const detailedHeader = ["raspberry-pi-4", "esp32", "esp8266", "arduino-nano", "arduino-mega", "dht11", "dht22", "hc-sr04", "pir", "mpu6050", "bmp280", "ir-obstacle", "flame", "mq2", "soil", "water-level", "ldr", "sg90", "mg995", "dc-motor", "stepper", "buzzer", "relay", "relay-2", "relay-8", "water-pump", "oled", "lcd-i2c", "lcd-1602", "seven-seg", "l298n", "tb6600", "uln2003", "esp8266-module", "rfid-rc522", "hc05", "nrf24l01", "breadboard", "breadboard-400"].includes(def.id);
    const headGeo = new THREE.SphereGeometry(detailedHeader ? 0.045 : 0.07, 14, 10);
    const nameBacking = new THREE.MeshBasicMaterial({ color: "#f7faf9", side: THREE.DoubleSide });
    const rowCount = def.pins.length > 8 ? Math.ceil(def.pins.length / 2) : def.pins.length;
    const labelWidth = Math.min(0.24, (def.w - 0.3) / Math.max(rowCount - 1, 1) * 0.82);
    const labelDepth = 0.65;
    const uno = def.id === "arduino-uno";

    def.pins.forEach((p, i) => {
      const [x, y, z] = pinLocal(def, i);
      const post = new THREE.Mesh(header, new THREE.MeshStandardMaterial({ color: "#c9a227", metalness: 0.8, roughness: 0.3 }));
      post.position.set(x, y + 0.04, z);
      post.raycast = () => {};
      if (uno || detailedHeader) post.visible = false;
      group.add(post);
      const head = new THREE.Mesh(
        headGeo,
        new THREE.MeshStandardMaterial({ color: PIN_COLORS[p.kind], roughness: 0.35, emissive: PIN_COLORS[p.kind], emissiveIntensity: 0.15 }),
      );
      head.position.set(x, detailedHeader ? y : y + 0.11, z);
      head.userData = { partId: id, pin: i };
      head.castShadow = true;
      if (uno || detailedHeader) {
        // The physical black socket remains visible; this invisible target keeps wiring unchanged.
        (head as THREE.Mesh<THREE.BufferGeometry, THREE.Material>).material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        head.castShadow = false;
      }
      group.add(head);
      pins.push(head);

      // Dense 2x20 GPIO header: physical gold posts stay visible; hover opens
      // the numbered pin information instead of overlapping forty paper labels.
      if (detailedHeader) return;

      const texture = this.pinLabel(p.name, uno);
      if (texture) {
        // On the Uno, silkscreen lettering belongs on the PCB, between the sockets and the components.
        const direction = isLeaded(def) || z >= 0 ? 1 : -1;
        const nameZ = uno ? z - direction * 0.36 : z + direction * (0.11 + labelDepth / 2);
        const labelY = uno ? 0.067 : isLeaded(def) ? 0.055 : 0.15;
        if (!uno) {
          const backing = new THREE.Mesh(new THREE.PlaneGeometry(labelWidth + 0.018, labelDepth + 0.02), nameBacking);
          backing.rotation.x = -Math.PI / 2;
          backing.position.set(x, labelY, nameZ);
          backing.raycast = () => {};
          group.add(backing);
        }
        const text = new THREE.Mesh(
          new THREE.PlaneGeometry(uno ? 0.18 : labelWidth, uno ? 0.44 : labelDepth),
          new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
        );
        text.rotation.x = -Math.PI / 2;
        text.rotation.z = direction < 0 ? Math.PI : 0;
        text.position.set(x, labelY + (uno ? 0 : 0.002), nameZ);
        text.raycast = () => {};
        group.add(text);
      }
    });

    // selection outline
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(def.w + 0.12, def.h + 0.06, def.d + 0.12)),
      new THREE.LineBasicMaterial({ color: "#0d9488" }),
    );
    outline.position.y = def.h / 2;
    outline.visible = false;
    outline.name = "outline";
    outline.raycast = () => {};
    group.add(outline);

    this.scene.add(group);
    return { group, type, pins, body };
  }

  private disposeObj(o: THREE.Object3D) {
    const maps = new Set<THREE.Texture>();
    const labelMaps = new Set(this.pinLabelCache.values());
    o.traverse((c) => {
      if (c instanceof THREE.Mesh || c instanceof THREE.LineSegments) {
        c.geometry.dispose();
        const materials = Array.isArray(c.material) ? c.material : [c.material];
        materials.forEach((material) => {
          const map = (material as THREE.MeshBasicMaterial).map;
          if (map && !labelMaps.has(map)) maps.add(map);
          material.dispose();
        });
      }
    });
    maps.forEach((map) => map.dispose());
    o.removeFromParent();
  }

  private syncParts() {
    const ids = new Set(this.data.parts.map((p) => p.id));
    for (const [id, obj] of this.parts) {
      if (!ids.has(id)) {
        this.disposeObj(obj.group);
        this.parts.delete(id);
      }
    }
    for (const p of this.data.parts) {
      if (!CATALOG_MAP[p.type]) continue;
      let obj = this.parts.get(p.id);
      if (!obj || obj.type !== p.type) {
        if (obj) this.disposeObj(obj.group);
        obj = this.buildPart(p.id, p.type);
        this.parts.set(p.id, obj);
      }
      obj.group.position.set(p.x, 0, p.z);
      obj.group.rotation.y = (-p.rot * Math.PI) / 2;
      const sel = this.selection?.kind === "part" && this.selection.id === p.id;
      const outline = obj.group.getObjectByName("outline") as THREE.LineSegments;
      outline.visible = sel || this.flagged.has(p.id);
      (outline.material as THREE.LineBasicMaterial).color.set(sel ? "#0d9488" : "#e5484d");
      obj.group.updateMatrixWorld(true);
    }
  }

  private pinWorld(ref: PinRef) {
    const obj = this.parts.get(ref.partId);
    const pin = obj?.pins[ref.pin];
    if (!pin) return null;
    return pin.getWorldPosition(new THREE.Vector3());
  }

  private curveFor(a: THREE.Vector3, b: THREE.Vector3, ctrl?: [number, number]) {
    const dist = a.distanceTo(b);
    const lift = Math.min(1.6, 0.35 + dist * 0.12);
    const mid = ctrl ? new THREE.Vector3(ctrl[0], 0, ctrl[1]) : a.clone().add(b).multiplyScalar(0.5);
    mid.y = Math.max(a.y, b.y) + lift;
    return new THREE.CatmullRomCurve3(
      [a, a.clone().add(new THREE.Vector3(0, lift * 0.5, 0)), mid, b.clone().add(new THREE.Vector3(0, lift * 0.5, 0)), b],
      false,
      "centripetal",
    );
  }

  private syncWires(only?: string) {
    const alive = new Set(this.data.wires.map((w) => w.id));
    for (const [id, m] of this.wireMeshes) {
      if (!alive.has(id)) {
        this.disposeObj(m);
        this.wireMeshes.delete(id);
      }
    }
    this.handle.visible = false;
    for (const w of this.data.wires) {
      if (only && w.from.partId !== only && w.to.partId !== only) continue;
      this.buildWire(w);
    }
  }

  private buildWire(w: Wire) {
    const a = this.pinWorld(w.from);
    const b = this.pinWorld(w.to);
    const old = this.wireMeshes.get(w.id);
    if (!a || !b) {
      if (old) this.disposeObj(old);
      this.wireMeshes.delete(w.id);
      return;
    }
    const curve = this.curveFor(a, b, w.ctrl);
    const geo = new THREE.TubeGeometry(curve, 48, 0.045, 8, false);
    const sel = this.selection?.kind === "wire" && this.selection.id === w.id;
    if (old) {
      old.geometry.dispose();
      old.geometry = geo;
      const m = old.material as THREE.MeshStandardMaterial;
      m.color.set(w.color);
      m.emissive.set(sel ? "#14b8a6" : "#000000");
    } else {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: w.color, roughness: 0.45, emissive: sel ? "#14b8a6" : "#000000", emissiveIntensity: 0.6 }),
      );
      mesh.castShadow = true;
      mesh.userData = { wireId: w.id };
      this.wireGroup.add(mesh);
      this.wireMeshes.set(w.id, mesh);
    }
    if (sel) {
      this.handle.position.copy(curve.getPoint(0.5));
      this.handle.visible = true;
    }
  }

  // ---------- camera
  private resize() {
    const { clientWidth: w, clientHeight: h } = this.el;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    this.camera.left = -VIEW * aspect * 0.5;
    this.camera.right = VIEW * aspect * 0.5;
    this.camera.top = VIEW * 0.5;
    this.camera.bottom = -VIEW * 0.5;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }
  private updateCamera() {
    this.camera.position.copy(this.target).add(CAM_OFFSET);
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  // ---------- input
  private setNdc(e: { clientX: number; clientY: number }) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
  }
  private groundPoint(e: { clientX: number; clientY: number }) {
    this.setNdc(e);
    return this.ray.ray.intersectPlane(this.ground, new THREE.Vector3());
  }
  private hitPin(): THREE.Mesh | null {
    const pins = [...this.parts.values()].flatMap((p) => p.pins);
    const h = this.ray.intersectObjects(pins, false)[0];
    return (h?.object as THREE.Mesh) ?? null;
  }
  private snapV(v: number) {
    return this.snap ? Math.round(v * 4) / 4 : v;
  }

  private down = (e: PointerEvent) => {
    this.setNdc(e);
    this.cb.onPinInfo(null);
    const panBtn = e.button === 1 || e.button === 2;
    if (!panBtn) {
      if (this.handle.visible && this.ray.intersectObject(this.handle).length && this.selection?.kind === "wire") {
        this.mode = { m: "ctrl", id: this.selection.id };
        return;
      }
      const pin = this.hitPin();
      if (pin) {
        const ref = pin.userData as PinRef;
        this.mode = { m: "wire", from: { partId: ref.partId, pin: ref.pin }, start: pin.getWorldPosition(new THREE.Vector3()), sx: e.clientX, sy: e.clientY, moved: false };
        return;
      }
      const bodies = [...this.parts.values()].map((p) => p.body);
      const bh = this.ray.intersectObjects(bodies, false)[0];
      if (bh) {
        const id = bh.object.userData["partId"] as string;
        const gp = this.groundPoint(e)!;
        const obj = this.parts.get(id)!;
        this.mode = { m: "drag", id, off: new THREE.Vector2(obj.group.position.x - gp.x, obj.group.position.z - gp.z), moved: false, sx: e.clientX, sy: e.clientY };
        this.cb.onSelect({ kind: "part", id });
        return;
      }
      const wh = this.ray.intersectObjects([...this.wireMeshes.values()], false)[0];
      if (wh) {
        this.cb.onSelect({ kind: "wire", id: wh.object.userData["wireId"] });
        this.mode = { m: "idle" };
        return;
      }
    }
    this.mode = { m: "pan", sx: e.clientX, sy: e.clientY, target: this.target.clone(), moved: false };
  };

  private move = (e: PointerEvent) => {
    const md = this.mode;
    if (md.m === "idle") {
      if (e.target !== this.renderer.domElement) {
        if (this.hoverPin) {
          this.hoverPin.scale.setScalar(1);
          this.hoverPin = null;
          this.dirty = true;
          this.cb.onPinInfo(null);
        }
        return;
      }
      this.setNdc(e);
      const pin = this.hitPin();
      if (pin !== this.hoverPin) {
        if (this.hoverPin) this.hoverPin.scale.setScalar(1);
        if (pin) pin.scale.setScalar(1.45);
        this.hoverPin = pin;
        this.dirty = true;
      }
      const overBody = !pin && this.ray.intersectObjects([...this.parts.values()].map((p) => p.body), false).length > 0;
      this.renderer.domElement.style.cursor = pin ? "crosshair" : overBody ? "grab" : "default";
      if (pin) {
        const ref = pin.userData as PinRef;
        this.cb.onPinInfo({ ref: { partId: ref.partId, pin: ref.pin }, x: e.clientX, y: e.clientY, compact: true });
      } else {
        this.cb.onPinInfo(null);
      }
      return;
    }
    if (md.m === "pan") {
      const dx = e.clientX - md.sx;
      const dy = e.clientY - md.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) md.moved = true;
      const r = this.renderer.domElement.getBoundingClientRect();
      const unitsPerPx = (this.camera.right - this.camera.left) / this.camera.zoom / r.width;
      const right = new THREE.Vector3(1, 0, -1).normalize();
      const fwd = new THREE.Vector3(-1, 0, -1).normalize();
      this.target
        .copy(md.target)
        .addScaledVector(right, -dx * unitsPerPx)
        .addScaledVector(fwd, dy * unitsPerPx * 1.35);
      this.updateCamera();
      return;
    }
    const gp = this.groundPoint(e);
    if (!gp) return;
    if (md.m === "drag") {
      if (Math.abs(e.clientX - md.sx) + Math.abs(e.clientY - md.sy) > 3) md.moved = true;
      if (!md.moved) return;
      const obj = this.parts.get(md.id)!;
      obj.group.position.set(this.snapV(gp.x + md.off.x), 0, this.snapV(gp.z + md.off.y));
      obj.group.updateMatrixWorld(true);
      this.renderer.domElement.style.cursor = "grabbing";
      this.syncWires(md.id);
      this.dirty = true;
    } else if (md.m === "wire") {
      if (Math.abs(e.clientX - md.sx) + Math.abs(e.clientY - md.sy) > 4) md.moved = true;
      if (!md.moved) return;
      this.setNdc(e);
      const over = this.hitPin();
      const end = over ? over.getWorldPosition(new THREE.Vector3()) : gp.setY(0.3);
      const geo = new THREE.TubeGeometry(this.curveFor(md.start, end), 32, 0.04, 6, false);
      if (!this.preview) {
        this.preview = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#14b8a6", transparent: true, opacity: 0.75 }));
        this.scene.add(this.preview);
      } else {
        this.preview.geometry.dispose();
        this.preview.geometry = geo;
      }
      this.dirty = true;
    } else if (md.m === "ctrl") {
      const w = this.data.wires.find((x) => x.id === md.id);
      if (!w) return;
      w.ctrl = [gp.x, gp.z];
      this.buildWire(w);
      this.dirty = true;
    }
  };

  private up = (e: PointerEvent) => {
    const md = this.mode;
    this.mode = { m: "idle" };
    if (md.m === "pan" && !md.moved && e.target === this.renderer.domElement) this.cb.onSelect(null);
    if (md.m === "drag" && md.moved) {
      const g = this.parts.get(md.id)!.group.position;
      this.cb.onMovePart(md.id, g.x, g.z);
    }
    if (md.m === "ctrl") {
      const w = this.data.wires.find((x) => x.id === md.id);
      if (w?.ctrl) this.cb.onWireCtrl(md.id, [...w.ctrl] as [number, number]);
    }
    if (md.m === "wire") {
      if (this.preview) {
        this.disposeObj(this.preview);
        this.preview = null;
        this.dirty = true;
      }
      this.setNdc(e);
      const pin = this.hitPin();
      if (!md.moved) {
        this.cb.onPinInfo({ ref: md.from, x: e.clientX, y: e.clientY });
      } else if (pin) {
        const to = pin.userData as PinRef;
        if (to.partId !== md.from.partId || to.pin !== md.from.pin) this.cb.onConnect(md.from, { partId: to.partId, pin: to.pin });
      }
    }
  };

  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1);
  };
  private dragOver = (e: DragEvent) => {
    if (e.dataTransfer?.types.includes("application/x-part")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };
  private drop = (e: DragEvent) => {
    const type = e.dataTransfer?.getData("application/x-part");
    if (!type) return;
    e.preventDefault();
    const gp = this.groundPoint(e);
    if (gp) this.cb.onDropPart(type, this.snapV(gp.x), this.snapV(gp.z));
  };

  /** Drop a part at the visible center (used by click-to-add). */
  centerPoint(): [number, number] {
    return [this.snapV(this.target.x), this.snapV(this.target.z)];
  }
}
