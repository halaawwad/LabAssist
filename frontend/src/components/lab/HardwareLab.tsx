import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronDown, Cpu, FilePlus2, Grid3x3, History, Magnet, Maximize, Pencil,
  Redo2, RotateCw, Save, Search, ShieldCheck, Trash2, Undo2, XCircle, ZoomIn, ZoomOut, Bookmark, Cable,
} from "lucide-react";
import { CATALOG, CATALOG_MAP, CATEGORIES, PIN_COLORS, type Category } from "@/lib/lab/catalog";
import { usePartPreviews } from "@/lib/lab/usePartPreviews";
import { LabEngine, type Selection } from "@/lib/lab/engine";
import { uid, WIRE_COLORS, type PinRef } from "@/lib/lab/types";
import { useProject } from "@/lib/lab/useProject";
import { validate, type ValidationResult } from "@/lib/lab/validate";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

type DialogKind = null | "new" | "rename" | "version" | "history";

export function HardwareLab() {
  const P = useProject();
  const previews = usePartPreviews();
  const { active } = P;
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LabEngine | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [pinInfo, setPinInfo] = useState<{ ref: PinRef; x: number; y: number; compact?: boolean } | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [wireColor, setWireColor] = useState<string>(WIRE_COLORS[2]!);

  const pRef = useRef(P);
  pRef.current = P;
  const colorRef = useRef(wireColor);
  colorRef.current = wireColor;

  // engine lifecycle
  useEffect(() => {
    const eng = new LabEngine(hostRef.current!, {
      onSelect: setSelection,
      onMovePart: (id, x, z) => pRef.current.edit((d) => ({ ...d, parts: d.parts.map((p) => (p.id === id ? { ...p, x, z } : p)) })),
      onConnect: (from, to) => {
        const exists = pRef.current.active.data.wires.some(
          (w) => (w.from.partId === from.partId && w.from.pin === from.pin && w.to.partId === to.partId && w.to.pin === to.pin) ||
            (w.to.partId === from.partId && w.to.pin === from.pin && w.from.partId === to.partId && w.from.pin === to.pin),
        );
        if (exists) { toast("These pins are already connected"); return; }
        const id = uid();
        pRef.current.edit((d) => ({ ...d, wires: [...d.wires, { id, from, to, color: colorRef.current }] }));
        setSelection({ kind: "wire", id });
      },
      onPinInfo: setPinInfo,
      onDropPart: (type, x, z) => addPart(type, x, z),
      onWireCtrl: (id, ctrl) => pRef.current.edit((d) => ({ ...d, wires: d.wires.map((w) => (w.id === id ? { ...w, ctrl } : w)) })),
    });
    engineRef.current = eng;
    return () => eng.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flagged = useMemo(() => {
    const s = new Set<string>();
    result?.issues.filter((i) => i.severity === "error").forEach((i) => i.partIds.forEach((p) => s.add(p)));
    return s;
  }, [result]);

  useEffect(() => {
    engineRef.current?.setData(structuredClone(active.data), selection, flagged);
  }, [active.data, selection, flagged]);
  useEffect(() => engineRef.current?.setGrid(grid), [grid]);
  useEffect(() => engineRef.current?.setSnap(snap), [snap]);
  useEffect(() => {
    setResult(null);
    setSelection(null);
  }, [active.id]);

  function addPart(type: string, x?: number, z?: number) {
    const [cx, cz] = x === undefined ? engineRef.current!.centerPoint() : [x, z!];
    const id = uid();
    pRef.current.edit((d) => ({ ...d, parts: [...d.parts, { id, type, x: cx, z: cz, rot: 0 }] }));
    setSelection({ kind: "part", id });
  }
  const rotateSel = () => {
    if (selection?.kind !== "part") return;
    P.edit((d) => ({ ...d, parts: d.parts.map((p) => (p.id === selection.id ? { ...p, rot: (p.rot + 1) % 4 } : p)) }));
  };
  const deleteSel = () => {
    if (!selection) return;
    if (selection.kind === "part") {
      P.edit((d) => ({
        parts: d.parts.filter((p) => p.id !== selection.id),
        wires: d.wires.filter((w) => w.from.partId !== selection.id && w.to.partId !== selection.id),
      }));
    } else P.edit((d) => ({ ...d, wires: d.wires.filter((w) => w.id !== selection.id) }));
    setSelection(null);
  };
  const runValidate = () => {
    const r = validate(active.data);
    setResult(r);
    const errs = r.issues.filter((i) => i.severity === "error").length;
    if (errs) toast.error(`${errs} wiring error${errs > 1 ? "s" : ""} found`);
    else toast.success("Wiring looks good");
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? P.redo() : P.undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); P.redo(); }
      else if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); P.save(); toast.success("Circuit saved"); }
      else if (e.key === "r" || e.key === "R") rotateSel();
      else if (e.key === "Delete" || e.key === "Backspace") deleteSel();
      else if (e.key === "Escape") { setSelection(null); setPinInfo(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const parts = CATALOG.filter((c) => (cat === "All" || c.category === cat) && c.name.toLowerCase().includes(query.toLowerCase()));
  const selPart = selection?.kind === "part" ? active.data.parts.find((p) => p.id === selection.id) : undefined;
  const selWire = selection?.kind === "wire" ? active.data.wires.find((w) => w.id === selection.id) : undefined;
  const pinLabel = (r: PinRef) => {
    const part = active.data.parts.find((p) => p.id === r.partId);
    const def = part && CATALOG_MAP[part.type];
    return def ? `${def.name} · ${def.pins[r.pin]?.name}` : "?";
  };
  const pinConnections = (r: PinRef) =>
    active.data.wires.filter((w) => (w.from.partId === r.partId && w.from.pin === r.pin) || (w.to.partId === r.partId && w.to.pin === r.pin)).length;

  const openText = (k: DialogKind, initial = "") => { setText(initial); setDialog(k); };
  const submitText = () => {
    const v = text.trim();
    if (!v) return;
    if (dialog === "new") P.createCircuit(v);
    if (dialog === "rename") P.renameCircuit(active.id, v);
    if (dialog === "version") { P.saveVersion(v); toast.success(`Version "${v}" saved`); }
    setDialog(null);
  };

  return (
    <div className="hardware-lab flex h-screen flex-col bg-background text-foreground">
      <Toaster position="bottom-center" />
      {/* ===== Toolbar */}
      <header className="flex h-14 shrink-0 items-center gap-1 border-b bg-panel px-3">
        <div className="flex items-center gap-2 pr-3">
          <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground"><Cpu className="size-4" /></div>
          <div className="leading-tight">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">HardwareMate AI · Lab</div>
            <div className="text-xs text-muted-foreground">{P.project.name}</div>
          </div>
        </div>
        <Sep />
        <DropdownMenu>
          <DropdownMenuTrigger className="tool-btn max-w-56 font-semibold">
            <Cable className="size-4 text-primary" />
            <span className="truncate">{active.name}</span>
            {P.dirty && <span className="size-1.5 rounded-full bg-warning" title="Unsaved changes" />}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Circuits in this project</DropdownMenuLabel>
            {P.project.circuits.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => P.switchCircuit(c.id)} className="justify-between">
                <span className={c.id === active.id ? "font-semibold text-primary" : ""}>{c.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{c.data.parts.length} parts</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openText("rename", active.name)}><Pencil className="size-4" />Rename current</DropdownMenuItem>
            <DropdownMenuItem disabled={P.project.circuits.length < 2} onClick={() => P.deleteCircuit(active.id)} className="text-destructive"><Trash2 className="size-4" />Delete current</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Sep />
        <button className="tool-btn" onClick={() => openText("new", `Circuit ${P.project.circuits.length + 1}`)}><FilePlus2 className="size-4" />New Circuit</button>
        <button className="tool-btn" onClick={() => { P.save(); toast.success("Circuit saved"); }}><Save className="size-4" />Save</button>
        <button className="tool-btn" onClick={() => openText("version", `v${active.versions.length + 1}`)}><Bookmark className="size-4" />Save Version</button>
        <button className="tool-btn" onClick={() => setDialog("history")}><History className="size-4" />History</button>
        <Sep />
        <button className="tool-btn" title="Undo (Ctrl+Z)" disabled={!P.canUndo} onClick={P.undo}><Undo2 className="size-4" /></button>
        <button className="tool-btn" title="Redo (Ctrl+Y)" disabled={!P.canRedo} onClick={P.redo}><Redo2 className="size-4" /></button>
        <Sep />
        <button className="tool-btn" title="Zoom in" onClick={() => engineRef.current?.zoom(1.2)}><ZoomIn className="size-4" /></button>
        <button className="tool-btn" title="Zoom out" onClick={() => engineRef.current?.zoom(1 / 1.2)}><ZoomOut className="size-4" /></button>
        <button className="tool-btn" title="Reset view" onClick={() => engineRef.current?.resetView()}><Maximize className="size-4" /></button>
        <Sep />
        <button className="tool-btn" data-active={grid} onClick={() => setGrid(!grid)}><Grid3x3 className="size-4" />Grid</button>
        <button className="tool-btn" data-active={snap} onClick={() => setSnap(!snap)}><Magnet className="size-4" />Snap</button>
        <div className="flex-1" />
        <Button onClick={runValidate} size="sm"><ShieldCheck className="size-4" />Validate Wiring</Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ===== Library */}
        <aside className="flex w-64 shrink-0 flex-col border-r bg-panel">
          <div className="space-y-2 border-b p-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Component Library</h2>
              <span className="font-mono text-[10px] text-muted-foreground">{CATALOG.length} parts</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search parts…" className="h-8 pl-7 text-sm" />
            </div>
            <div className="flex flex-wrap gap-1">
              {(["All", ...CATEGORIES] as const).map((c) => (
                <button key={c} onClick={() => setCat(c)} data-active={cat === c}
                  className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground data-[active=true]:border-primary data-[active=true]:bg-accent data-[active=true]:text-accent-foreground">
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {parts.map((c) => (
              <div key={c.id} draggable
                onDragStart={(e) => { e.dataTransfer.setData("application/x-part", c.id); e.dataTransfer.effectAllowed = "copy"; }}
                onDoubleClick={() => addPart(c.id)}
                title="Drag into the workspace (or double-click)"
                className="group mb-1 flex cursor-grab items-center gap-2.5 rounded-md border border-transparent p-2 hover:border-border hover:bg-card active:cursor-grabbing">
                <div className="component-preview">{previews[c.id] ? <img src={previews[c.id]} alt={c.name} width={96} height={72} draggable={false} /> : <span className="text-[9px] text-muted-foreground">Preview unavailable</span>}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium leading-snug">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.category} · {c.pins.length} pins</div>
                </div>
              </div>
            ))}
            {!parts.length && <p className="p-4 text-center text-sm text-muted-foreground">No parts match.</p>}
          </div>
          <div className="border-t p-3 text-[11px] leading-relaxed text-muted-foreground">
            Drag a pin onto another pin to wire it. Drag empty space to pan, scroll to zoom. <kbd className="font-mono">R</kbd> rotate · <kbd className="font-mono">Del</kbd> delete
          </div>
        </aside>

        {/* ===== Workspace */}
        <main className="relative min-w-0 flex-1">
          <div ref={hostRef} className="absolute inset-0" />
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
            {(["power", "ground", "digital", "pwm", "analog", "sda", "scl", "motor"] as const).map((k) => (
              <span key={k} className="flex items-center gap-1 rounded-full border bg-card/90 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground backdrop-blur">
                <span className="size-2 rounded-full" style={{ background: PIN_COLORS[k] }} />{k}
              </span>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border bg-card/90 px-2 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur">
            {active.data.parts.length} parts · {active.data.wires.length} wires
          </div>
          {pinInfo && (() => {
            const part = active.data.parts.find((p) => p.id === pinInfo.ref.partId);
            const def = part && CATALOG_MAP[part.type];
            const pin = def?.pins[pinInfo.ref.pin];
            if (!pin || !def) return null;
            const host = hostRef.current!.getBoundingClientRect();
            if (pinInfo.compact) return (
              <div role="tooltip" className="pin-hover-label" style={{ left: Math.max(0, Math.min(pinInfo.x - host.left + 14, host.width - 240)), top: Math.max(0, Math.min(pinInfo.y - host.top + 14, host.height - 48)) }}>
                {pin.physicalNumber ? `Pin ${pin.physicalNumber} · ` : ""}{pin.name}
                {pin.label && pin.label !== pin.name ? ` (${pin.label})` : ""}
              </div>
            );
            return (
              <div className="pointer-events-none absolute z-20 w-52 rounded-lg border bg-popover p-3 text-sm shadow-lg"
                style={{ left: Math.min(pinInfo.x - host.left + 12, host.width - 220), top: pinInfo.y - host.top + 12 }}>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: PIN_COLORS[pin.kind] }} />
                  <span className="font-mono font-semibold">{pin.physicalNumber ? `Pin ${pin.physicalNumber} · ${pin.name}` : pin.name}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{def.name}</div>
                <dl className="mt-2 grid grid-cols-2 gap-y-1 font-mono text-xs">
                  <dt className="text-muted-foreground">Type</dt><dd className="uppercase">{pin.kind}</dd>
                  <dt className="text-muted-foreground">Direction</dt><dd className="uppercase">{pin.dir}</dd>
                  <dt className="text-muted-foreground">Voltage</dt><dd>{pin.voltage !== undefined ? `${pin.voltage} V` : pin.kind === "ground" ? "0 V" : "—"}</dd>
                  {pin.functions && <><dt className="text-muted-foreground">Functions</dt><dd className="break-words">{pin.functions}</dd></>}
                  {pin.maxCurrent !== undefined && (<><dt className="text-muted-foreground">Max current</dt><dd>{pin.maxCurrent} mA</dd></>)}
                  <dt className="text-muted-foreground">Wires</dt><dd>{pinConnections(pinInfo.ref)}</dd>
                </dl>
              </div>
            );
          })()}
        </main>

        {/* ===== Right panel */}
        <aside className="flex w-80 shrink-0 flex-col border-l bg-panel">
          <section className="border-b p-3">
            <h2 className="mb-2 text-sm font-semibold">Inspector</h2>
            {selPart ? (() => {
              const def = CATALOG_MAP[selPart.type]!;
              return (
                <div className="space-y-3">
                  <div>
                    <div className="font-medium">{def.name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      x {selPart.x.toFixed(2)} · z {selPart.z.toFixed(2)} · {selPart.rot * 90}° · max {def.vMax || "—"}V · {def.draw}mA
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={rotateSel}><RotateCw className="size-4" />Rotate</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={deleteSel}><Trash2 className="size-4" />Delete</Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {def.pins.slice().sort((a, b) => (a.physicalNumber ?? ((a.headerRow ?? 0) * 2 + (a.headerSide === "right" ? 1 : 0))) - (b.physicalNumber ?? ((b.headerRow ?? 0) * 2 + (b.headerSide === "right" ? 1 : 0)))).map((p, i) => (
                      <span key={i} title={p.functions} className="flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]">
                        <span className="size-1.5 rounded-full" style={{ background: PIN_COLORS[p.kind] }} />{p.physicalNumber ? `${p.physicalNumber}: ${p.name}` : p.label ?? p.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })() : selWire ? (
              <div className="space-y-3">
                <div className="font-mono text-xs leading-relaxed">
                  <div>{pinLabel(selWire.from)}</div>
                  <div className="text-muted-foreground">↓</div>
                  <div>{pinLabel(selWire.to)}</div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Wire color</div>
                  <ColorRow value={selWire.color} onChange={(color) => P.edit((d) => ({ ...d, wires: d.wires.map((w) => (w.id === selWire.id ? { ...w, color } : w)) }))} />
                </div>
                <p className="text-[11px] text-muted-foreground">Drag the teal handle on the wire to reshape its path.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={!selWire.ctrl} onClick={() => P.edit((d) => ({ ...d, wires: d.wires.map((w) => (w.id === selWire.id ? { ...w, ctrl: undefined } : w)) }))}>Reset path</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={deleteSel}><Trash2 className="size-4" />Delete</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Select a part or wire. New wires use:</p>
                <ColorRow value={wireColor} onChange={setWireColor} />
              </div>
            )}
          </section>

          <section className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between p-3 pb-2">
              <h2 className="text-sm font-semibold">Wiring Validation</h2>
              {result && <button className="text-[11px] text-primary hover:underline" onClick={runValidate}>Re-run</button>}
            </div>
            {!result ? (
              <div className="m-3 mt-0 rounded-lg border border-dashed p-5 text-center">
                <ShieldCheck className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">Run <b>Validate Wiring</b> to check power, ground, pin types, voltage, current and shorts.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 px-3">
                  <Stat label="Correct" value={result.okWires} tone="text-success" />
                  <Stat label="Faulty" value={result.badWires} tone="text-destructive" />
                  <Stat label="Warnings" value={result.issues.filter((i) => i.severity === "warning").length} tone="text-warning" />
                </div>
                <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
                  {!result.issues.length && (
                    <div className="flex items-center gap-2 rounded-md bg-accent p-3 text-sm text-accent-foreground"><CheckCircle2 className="size-4" />No problems found.</div>
                  )}
                  {result.issues.map((iss, i) => (
                    <button key={i} onClick={() => iss.wireIds[0] ? setSelection({ kind: "wire", id: iss.wireIds[0] }) : iss.partIds[0] && setSelection({ kind: "part", id: iss.partIds[0] })}
                      className="flex w-full gap-2 rounded-md border bg-card p-2 text-left hover:border-primary">
                      {iss.severity === "error" ? <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{iss.type}</div>
                        <div className="text-[11px] leading-snug text-muted-foreground">{iss.message}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </aside>
      </div>

      {/* ===== Dialogs */}
      <Dialog open={dialog === "new" || dialog === "rename" || dialog === "version"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog === "new" ? "New circuit" : dialog === "rename" ? "Rename circuit" : "Save version"}</DialogTitle>
          </DialogHeader>
          <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitText()} placeholder={dialog === "version" ? "Version label" : "Circuit name"} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={submitText}>{dialog === "new" ? "Create" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "history"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Version history · {active.name}</DialogTitle></DialogHeader>
          <div className="max-h-80 space-y-1.5 overflow-y-auto">
            {!active.versions.length && <p className="py-6 text-center text-sm text-muted-foreground">No saved versions yet. Use “Save Version” to create one.</p>}
            {active.versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-md border p-2.5">
                <div>
                  <div className="text-sm font-medium">{v.label}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{new Date(v.date).toLocaleString()} · {v.data.parts.length} parts · {v.data.wires.length} wires</div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => { P.restoreVersion(v.id); setDialog(null); toast.success(`Restored "${v.label}"`); }}>Restore</Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Sep() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}
function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-md border bg-card p-2 text-center">
      <div className={`font-mono text-lg font-semibold ${tone}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
function ColorRow({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5">
      {WIRE_COLORS.map((c) => (
        <button key={c} onClick={() => onChange(c)} aria-label={`Wire color ${c}`}
          className={`size-6 rounded-full border-2 ${value === c ? "border-primary ring-2 ring-primary/30" : "border-border"}`} style={{ background: c }} />
      ))}
    </div>
  );
}
