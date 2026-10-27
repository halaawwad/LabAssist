import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Cpu,
  Focus,
  Lightbulb,
  Maximize,
  MousePointer2,
  Play,
  Plus,
  RotateCcw,
  Search,
  Square,
  Sun,
  Trash2,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
  Cable,
} from "lucide-react";
import { PreviewLabEngine, type Selection } from "@/lib/lab-preview/engine";
import { previewKit, simulatePreview, starterCircuit } from "@/lib/lab-preview/simulation";
import { CATALOG_MAP, placedDefinition } from "@/lib/lab/catalog";
import { checkWireFit } from "@/lib/lab/wireCompatibility";
import { usePreviewKitImages } from "@/lib/lab-preview/usePreviewKitImages";
import { uid, type CircuitData, type PinRef } from "@/lib/lab/types";

export function LabPreview() {
  const [data, setData] = useState<CircuitData>(() => starterCircuit()),
    [selection, setSelection] = useState<Selection>(null),
    [running, setRunning] = useState(false),
    [focus, setFocus] = useState(false),
    [light, setLight] = useState(85),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState(
      "Pick a part, explore its terminals, then bring the circuit to life.",
    ),
    [pin, setPin] = useState<PinRef | null>(null),
    [color, setColor] = useState("#bc6c64"),
    [trace, setTrace] = useState(false),
    [ready, setReady] = useState(false);
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<PreviewLabEngine | null>(null),
    latest = useRef({ data, running, color, pin });
  latest.current = { data, running, color, pin };
  const previews = usePreviewKitImages(),
    result = useMemo(() => simulatePreview(data, light), [data, light]);
  const selectedPart =
      selection?.kind === "part" ? data.parts.find((p) => p.id === selection.id) : undefined,
    selectedWire =
      selection?.kind === "wire" ? data.wires.find((w) => w.id === selection.id) : undefined;
  const selectedDef = selectedPart ? placedDefinition(selectedPart) : undefined;
  const wireLabel = (ref: PinRef) => {
    const p = data.parts.find((p) => p.id === ref.partId);
    return p
      ? `${placedDefinition(p).name} / ${placedDefinition(p).pins[ref.pin]?.name ?? "terminal"}`
      : "Unknown terminal";
  };
  const connect = (from: PinRef, to: PinRef) => {
    const state = latest.current;
    if (state.running) return;
    if (from.partId === to.partId && from.pin === to.pin) {
      setPin(null);
      return;
    }
    if (
      state.data.wires.some(
        (w) =>
          (w.from.partId === from.partId &&
            w.from.pin === from.pin &&
            w.to.partId === to.partId &&
            w.to.pin === to.pin) ||
          (w.to.partId === from.partId &&
            w.to.pin === from.pin &&
            w.from.partId === to.partId &&
            w.from.pin === to.pin),
      )
    ) {
      setNotice("These terminals are already connected.");
      setPin(null);
      return;
    }
    const fit = checkWireFit(state.data, from, to, "power");
    if (!fit.ok) {
      setNotice(fit.message);
      setPin(null);
      return;
    }
    const id = uid();
    setData((d) => ({
      ...d,
      wires: [...d.wires, { id, from, to, color: state.color, type: "power" }],
    }));
    setSelection({ kind: "wire", id });
    setPin(null);
    setNotice("Connection added. Select a wire to follow its path.");
  };
  const connectRef = useRef(connect);
  connectRef.current = connect;
  const add = (type: string, x?: number, z?: number) => {
    if (latest.current.running) return;
    const center = engine.current?.centerPoint() ?? [0, 0],
      id = uid();
    setData((d) => ({
      ...d,
      parts: [
        ...d.parts,
        {
          id,
          type,
          x: x ?? center[0],
          z: z ?? center[1],
          rot: 0,
          ...(type === "power-source" ? { voltage: 5 } : {}),
          ...(type === "resistor-variable" ? { resistance: 470 } : {}),
        },
      ],
    }));
    setSelection({ kind: "part", id });
    setNotice("Part added. Drag it into place and connect its terminals.");
  };
  const addRef = useRef(add);
  addRef.current = add;
  useEffect(() => {
    const eng = new PreviewLabEngine(host.current!, {
      onSelect: setSelection,
      onMovePart: (id, x, z) => {
        if (!latest.current.running)
          setData((d) => ({ ...d, parts: d.parts.map((p) => (p.id === id ? { ...p, x, z } : p)) }));
      },
      onConnect: (a, b) => connectRef.current(a, b),
      onPinInfo: (info) => {
        if (info) {
          setSelection({ kind: "part", id: info.ref.partId });
          setNotice(
            "Drag between the terminal dots, or select two terminal buttons in the inspector.",
          );
        }
      },
      onDropPart: (type, x, z) => addRef.current(type, x, z),
      onWireCtrl: (id, ctrl) => {
        if (!latest.current.running)
          setData((d) => ({ ...d, wires: d.wires.map((w) => (w.id === id ? { ...w, ctrl } : w)) }));
      },
    });
    engine.current = eng;
    eng.zoom(1.55);
    setReady(true);
    return () => {
      engine.current = null;
      eng.dispose();
    };
  }, []);
  useEffect(() => {
    engine.current?.setData(structuredClone(data), selection, new Set());
    engine.current?.setPlayback(running, running ? result.brightness : 0, result.ledId);
  }, [data, selection, running, result]);
  const patch = (value: Record<string, number | boolean>) => {
    if (!selectedPart || running) return;
    setData((d) => ({
      ...d,
      parts: d.parts.map((p) => (p.id === selectedPart.id ? { ...p, ...value } : p)),
    }));
  };
  const remove = () => {
    if (!selection || running) return;
    const id = selection.id;
    setData((d) =>
      selection.kind === "part"
        ? {
            parts: d.parts.filter((p) => p.id !== id),
            wires: d.wires.filter((w) => w.from.partId !== id && w.to.partId !== id),
          }
        : { ...d, wires: d.wires.filter((w) => w.id !== id) },
    );
    setSelection(null);
    setPin(null);
  };
  const load = (sensor: boolean) => {
    setRunning(false);
    setData(starterCircuit(sensor));
    setSelection(null);
    setPin(null);
    setTrace(false);
    setNotice(
      sensor
        ? "Light response: increase the light to reduce LDR resistance and brighten the LED."
        : "A battery, a resistor, an LED. Follow the loop and try Run.",
    );
  };
  const start = () => {
    setPin(null);
    if (!result.ok) {
      setNotice(result.message);
      setFocus(false);
      return;
    }
    setRunning(true);
    setSelection(null);
    setNotice(
      data.parts.some((p) => p.type === "ldr-bare")
        ? "Move the light slider and watch the actual LED and measured current respond."
        : "Your circuit is live. Stop to change its wiring or component values.",
    );
  };
  const onTerminal = (ref: PinRef) => {
    if (running) return;
    if (pin) connect(pin, ref);
    else {
      setPin(ref);
      setNotice("First terminal selected. Choose the other end on a different part.");
    }
  };
  return (
    <div
      className={`lab-playground ${focus ? "lp-focused" : ""} ${running ? "lp-running" : ""}`}
      data-testid="lab-preview"
    >
      <header className="lp-topbar">
        <div className="lp-brand">
          <span>
            <Cpu size={21} />
          </span>
          <div>
            <strong>Lab Playground</strong>
            <small>EXPERIMENTAL EDITION</small>
          </div>
        </div>
        <div className="lp-mode">
          <button className={!running ? "active" : ""} onClick={() => setRunning(false)}>
            <MousePointer2 size={15} />
            Build
          </button>
          <button className={running ? "active" : ""} onClick={start}>
            <Play size={14} />
            Run
          </button>
        </div>
        <Link to="/lab" className="lp-original">
          <ArrowLeft size={14} />
          Original lab
        </Link>
      </header>
      <div className="lp-layout">
        <aside className="lp-library">
          <div className="lp-section-title">
            <span>01 / THE KIT</span>
            <strong>
              Small parts.
              <br />
              Real possibilities.
            </strong>
            <p>A series circuit. No code needed.</p>
          </div>
          <label className="lp-search">
            <Search size={15} />
            <input
              placeholder="Find a part…"
              aria-label="Find a kit part"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="lp-kit">
            {previewKit
              .filter((id) => CATALOG_MAP[id]?.name.toLowerCase().includes(query.toLowerCase()))
              .map((id, i) => (
                <button
                  key={id}
                  disabled={running}
                  draggable={!running}
                  onDragStart={(e) => e.dataTransfer.setData("application/x-part", id)}
                  onClick={() => add(id)}
                  className={`lp-part lp-part-${i % 3}`}
                >
                  <span>
                    {previews[id] ? (
                      <img src={previews[id]} alt="" draggable={false} />
                    ) : (
                      <Cpu size={30} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {id === "resistor-variable"
                        ? "Resistor"
                        : id === "power-source"
                          ? "Power source"
                          : CATALOG_MAP[id]!.name}
                    </strong>
                    <small>
                      {id === "ldr-bare"
                        ? "Responds to light"
                        : id === "power-source"
                          ? "Adjustable DC supply"
                          : "Click or drag to add"}
                    </small>
                  </div>
                  <Plus size={14} />
                </button>
              ))}
          </div>
          <div className="lp-starters">
            <span>START WITH A SPARK</span>
            <button onClick={() => load(false)}>
              <Lightbulb size={17} />
              <div>
                <strong>First light</strong>
                <small>Battery → resistor → LED</small>
              </div>
              <ChevronRight size={15} />
            </button>
            <button onClick={() => load(true)}>
              <Sun size={17} />
              <div>
                <strong>Chase the light</strong>
                <small>Add an interactive LDR</small>
              </div>
              <ChevronRight size={15} />
            </button>
          </div>
        </aside>
        <main className="lp-stage">
          <div className="lp-stage-heading">
            <span>
              <i />
              {running ? "LIVE EXPERIMENT" : "YOUR LITTLE WORKBENCH"}
            </span>
            <h1>{running ? "You built it. It’s alive." : "Make the connection."}</h1>
            <p>
              {running
                ? "Same circuit. Real-time response."
                : "Place it. Wire it. See what happens."}
            </p>
          </div>
          <div
            className="lp-engine"
            ref={host}
            aria-label="Interactive 3D circuit workspace"
            data-ready={ready}
          />
          <div className="lp-view-tools">
            <button aria-label="Zoom in" onClick={() => engine.current?.zoom(1.2)}>
              <ZoomIn size={17} />
            </button>
            <button aria-label="Zoom out" onClick={() => engine.current?.zoom(1 / 1.2)}>
              <ZoomOut size={17} />
            </button>
            <button
              aria-label="Reset view"
              onClick={() => {
                engine.current?.resetView();
                engine.current?.zoom(1.55);
              }}
            >
              <Maximize size={17} />
            </button>
            <span />
            <button
              aria-label="Focus workspace"
              aria-pressed={focus}
              onClick={() => setFocus((v) => !v)}
            >
              <Focus size={17} />
            </button>
          </div>
          <div className="lp-scene-tag">
            <span>{data.parts.length} PARTS</span>
            <i />
            <span>{data.wires.length} CONNECTIONS</span>
            <span className="lp-no-code">NO CODE</span>
          </div>
          <div className={`lp-guide ${!result.ok ? "lp-guide-warning" : ""}`} role="status">
            <span className="lp-guide-bot">
              <Cpu size={23} />
              <i />
              <i />
            </span>
            <div>
              <small>BENCH BUDDY</small>
              <p>{notice}</p>
            </div>
          </div>
          <div className="lp-bottom-deck">
            <div className="lp-live-reading">
              <span>
                <Zap size={15} />
                {running ? "LIVE CURRENT" : "CIRCUIT CURRENT"}
              </span>
              <strong>
                {running ? result.current.toFixed(2) : "—"}
                <small>mA</small>
              </strong>
              <div className="lp-meter-bars" aria-hidden="true">
                {Array.from({ length: 20 }, (_, i) => (
                  <i key={i} className={running && i < result.brightness * 20 ? "lit" : ""} />
                ))}
              </div>
            </div>
            <div className="lp-led-reading">
              <span
                className={running && result.brightness > 0.016 ? "lp-led-dot lit" : "lp-led-dot"}
              />
              <div>
                <small>LED OUTPUT</small>
                <strong>
                  {!running
                    ? "Standby"
                    : result.current > 0.1
                      ? "Light on"
                      : "Below visible threshold"}
                </strong>
              </div>
            </div>
            <button
              className="lp-run"
              onClick={() =>
                running
                  ? (setRunning(false),
                    setNotice("Back to the bench. Your circuit is ready to edit."))
                  : start()
              }
            >
              {running ? <Square size={16} /> : <Play size={16} />}{" "}
              {running ? "Stop experiment" : "Run experiment"}
              <ArrowRight size={16} />
            </button>
          </div>
        </main>
        <aside className="lp-inspector">
          <div className="lp-section-title">
            <span>02 / EXPLORE & ADJUST</span>
            <strong>{running ? "Try a little change." : "Every connection counts."}</strong>
          </div>
          {running ? (
            <>
              <div className="lp-live-badge">
                <i />
                SIMULATION RUNNING
              </div>
              <div className="lp-sensor-control">
                <Sun size={25} />
                <h2>Let there be light.</h2>
                <p>
                  {data.parts.some((p) => p.type === "ldr-bare")
                    ? "Your LDR changes resistance with the light. More light, more current in this series loop."
                    : "Add an LDR using “Chase the light” to make the circuit respond to this control."}
                </p>
                <label htmlFor="lp-light">
                  Ambient light<strong>{light}%</strong>
                </label>
                <input
                  id="lp-light"
                  type="range"
                  min="0"
                  max="100"
                  value={light}
                  disabled={!data.parts.some((p) => p.type === "ldr-bare")}
                  onChange={(e) => setLight(Number(e.target.value))}
                />
                <div>
                  <span>Dark</span>
                  <span>Bright</span>
                </div>
                <div className="lp-light-presets">
                  <button
                    disabled={!data.parts.some((p) => p.type === "ldr-bare")}
                    onClick={() => setLight(15)}
                  >
                    Shade · 15%
                  </button>
                  <button
                    disabled={!data.parts.some((p) => p.type === "ldr-bare")}
                    onClick={() => setLight(85)}
                  >
                    Daylight · 85%
                  </button>
                </div>
              </div>
              <dl className="lp-measurements">
                <div>
                  <dt>Supply</dt>
                  <dd>{result.voltage} V</dd>
                </div>
                <div>
                  <dt>Total resistance</dt>
                  <dd>{(result.resistance / 1000).toFixed(2)} kΩ</dd>
                </div>
                <div>
                  <dt>LED current</dt>
                  <dd>{result.current.toFixed(2)} mA</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <div className="lp-inspect-card">
                {selectedPart && selectedDef ? (
                  <>
                    <span className="lp-eyebrow">SELECTED COMPONENT</span>
                    <h2>{selectedDef.name}</h2>
                    <p>Select a terminal, then another part’s terminal to connect them.</p>
                    {selectedPart.type === "power-source" && (
                      <label className="lp-number">
                        Supply voltage
                        <input
                          aria-label="Supply voltage"
                          type="number"
                          min=".1"
                          max="12"
                          step=".1"
                          value={selectedPart.voltage ?? 5}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (v > 0 && v <= 12) patch({ voltage: v });
                          }}
                        />
                        <span>V</span>
                      </label>
                    )}
                    {selectedPart.type === "resistor-variable" && (
                      <label className="lp-number">
                        Resistance
                        <input
                          aria-label="Resistance"
                          type="number"
                          min="1"
                          max="1000000"
                          value={selectedPart.resistance ?? 470}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (v >= 1 && v <= 1000000) patch({ resistance: v });
                          }}
                        />
                        <span>Ω</span>
                      </label>
                    )}
                    {selectedPart.type === "power-switch" && (
                      <button
                        className="lp-switch"
                        onClick={() => patch({ enabled: selectedPart.enabled === false })}
                      >
                        {selectedPart.enabled === false ? "Open switch" : "Closed switch"} · click
                        to toggle
                      </button>
                    )}
                    <div className="lp-terminals">
                      {selectedDef.pins.map((p, i) => (
                        <button
                          key={i}
                          className={
                            pin?.partId === selectedPart.id && pin.pin === i ? "selected" : ""
                          }
                          onClick={() => onTerminal({ partId: selectedPart.id, pin: i })}
                        >
                          <i />
                          {p.name}
                          <Plus size={12} />
                        </button>
                      ))}
                    </div>
                    <div className="lp-part-actions">
                      <button onClick={() => patch({ rot: (selectedPart.rot + 1) % 4 })}>
                        <RotateCcw size={14} />
                        Rotate
                      </button>
                      <button onClick={remove}>
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </>
                ) : selectedWire ? (
                  <>
                    <span className="lp-eyebrow">FOLLOW THE PATH</span>
                    <h2>One wire. Two ends.</h2>
                    <p>{wireLabel(selectedWire.from)}</p>
                    <ArrowRight size={15} />
                    <p>{wireLabel(selectedWire.to)}</p>
                    <button className="lp-remove-wire" onClick={remove}>
                      <Trash2 size={14} />
                      Disconnect wire
                    </button>
                  </>
                ) : (
                  <>
                    <div className="lp-inspect-symbol">
                      <MousePointer2 size={26} />
                    </div>
                    <h2>A closer look.</h2>
                    <p>
                      Pick a component on the bench to adjust its properties. Pick a wire to reveal
                      both ends.
                    </p>
                    <span className="lp-inspect-hint">
                      Drag a terminal onto another to connect.
                    </span>
                  </>
                )}
              </div>
              {pin && (
                <div className="lp-pending">
                  <Cable size={15} />
                  <span>From {wireLabel(pin)}</span>
                  <button aria-label="Cancel connection" onClick={() => setPin(null)}>
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="lp-wire-palette">
                <span>WIRE COLOUR</span>
                <div>
                  {["#bc6c64", "#4c6868", "#557f9c", "#ab8ab7", "#759278"].map((c) => (
                    <button
                      key={c}
                      aria-label={`Wire colour ${c}`}
                      aria-pressed={color === c}
                      style={{ background: c }}
                      onClick={() => {
                        setColor(c);
                        if (selectedWire)
                          setData((d) => ({
                            ...d,
                            wires: d.wires.map((w) =>
                              w.id === selectedWire.id ? { ...w, color: c } : w,
                            ),
                          }));
                      }}
                    >
                      {color === c && <Check size={12} />}
                    </button>
                  ))}
                </div>
                <small>Solderable power wire · bare terminals</small>
              </div>
            </>
          )}
          <button
            className="lp-trace-toggle"
            aria-expanded={trace}
            onClick={() => setTrace((v) => !v)}
          >
            <Cable size={16} />
            Trace connections<span>{data.wires.length}</span>
          </button>
          {trace && (
            <div className="lp-trace-list">
              {data.wires.map((w, i) => (
                <button
                  key={w.id}
                  className={selection?.id === w.id ? "selected" : ""}
                  onClick={() => setSelection({ kind: "wire", id: w.id })}
                >
                  <i style={{ background: w.color }} />
                  <span>
                    <b>Connection {i + 1}</b>
                    {wireLabel(w.from)}
                    <br />↳ {wireLabel(w.to)}
                  </span>
                </button>
              ))}
              {!data.wires.length && <p>No wires connected yet.</p>}
            </div>
          )}
          <div className="lp-model-note">
            <span>THE EXPERIMENT</span>
            <p>
              Single-loop DC model: one supply, one LED, resistors, LDR and switch. LED drop and
              current limit are included.
            </p>
          </div>
        </aside>
      </div>
      <footer className="lp-page-footer">
        <span>
          <i />
          Separate playground · original lab stays as it is
        </span>
        <span>Drag parts to move · drag terminals to wire · scroll to zoom</span>
      </footer>
    </div>
  );
}
