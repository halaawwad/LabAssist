import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Cpu,
  FilePlus2,
  Grid3x3,
  History,
  Magnet,
  Maximize,
  Pencil,
  Redo2,
  RotateCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  XCircle,
  ZoomIn,
  ZoomOut,
  Bookmark,
  Cable,
  PanelLeft,
  PanelRight,
  ChevronsLeftRight,
  X,
} from "lucide-react";
import {
  CATALOG,
  CATALOG_MAP,
  placedDefinition,
  CATEGORIES,
  PIN_COLORS,
  type Category,
} from "@/lib/lab/catalog";
import { usePartPreviews } from "@/lib/lab/usePartPreviews";
import { LabEngine, type Selection } from "@/lib/lab/engine";
import {
  uid,
  WIRE_COLORS,
  WIRE_TYPES,
  wireRadius,
  type WireType,
  type PowerGauge,
  type PinRef,
} from "@/lib/lab/types";
import { useProject } from "@/lib/lab/useProject";
import {
  checkWireFit,
  connectorFor,
  connectorLabels,
  type WireFit,
} from "@/lib/lab/wireCompatibility";
import { LabWiringAssistant } from "./LabWiringAssistant";
import { validate, type ValidationResult, type Issue } from "@/lib/lab/validate";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

type DialogKind = null | "new" | "rename" | "version" | "history";

export function HardwareLab({
  addComponent,
  addRequest,
}: { addComponent?: string | undefined; addRequest?: string | undefined } = {}) {
  const P = useProject();
  const [leftOpen, setLeftOpen] = useState(
      () => typeof window === "undefined" || window.innerWidth >= 900,
    ),
    [rightOpen, setRightOpen] = useState(
      () => typeof window === "undefined" || window.innerWidth >= 1100,
    );
  const [leftWidth, setLeftWidth] = useState(256),
    [rightWidth, setRightWidth] = useState(320),
    [resizing, setResizing] = useState(false);
  const panelLayout = useRef<HTMLDivElement>(null),
    restorePanels = useRef({ left: true, right: true });
  const resizePanel = (side: "left" | "right", clientX: number) => {
    const rect = panelLayout.current?.getBoundingClientRect();
    if (!rect) return;
    const other = side === "left" ? (rightOpen ? rightWidth : 0) : leftOpen ? leftWidth : 0;
    const min = side === "left" ? 190 : 220;
    const max = Math.max(min, Math.min(440, rect.width - other - 290));
    const value = side === "left" ? clientX - rect.left : rect.right - clientX;
    (side === "left" ? setLeftWidth : setRightWidth)(Math.max(min, Math.min(max, value)));
  };
  const keyboardResize = (side: "left" | "right", key: string) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
    const rect = panelLayout.current?.getBoundingClientRect();
    if (!rect) return;
    const current = side === "left" ? leftWidth : rightWidth;
    const delta = (key === "ArrowRight" ? 1 : -1) * (side === "left" ? 1 : -1) * 20;
    const width =
      key === "Home" ? (side === "left" ? 190 : 220) : key === "End" ? 440 : current + delta;
    resizePanel(side, side === "left" ? rect.left + width : rect.right - width);
  };
  const toggleFocus = () => {
    if (leftOpen || rightOpen) {
      restorePanels.current = { left: leftOpen, right: rightOpen };
      setLeftOpen(false);
      setRightOpen(false);
    } else {
      setLeftOpen(restorePanels.current.left);
      setRightOpen(restorePanels.current.right);
    }
  };
  useEffect(() => {
    const fit = () => {
      if (innerWidth < 700) {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);
  const appliedRequest = useRef<string | null>(null);
  useEffect(() => {
    if (!addComponent || !CATALOG_MAP[addComponent]) return;
    const key = addRequest ?? addComponent;
    if (appliedRequest.current === key) return;
    appliedRequest.current = key;
    addPart(addComponent, 0, 0);
  }, [addComponent, addRequest]);
  const previews = usePartPreviews();
  const { active } = P;
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LabEngine | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [pinInfo, setPinInfo] = useState<{
    ref: PinRef;
    x: number;
    y: number;
    compact?: boolean;
  } | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [wireColor, setWireColor] = useState<string>(WIRE_COLORS[2]!);
  const [wireNotice, setWireNotice] = useState<WireFit | null>(null);
  const [noticePin, setNoticePin] = useState<PinRef | null>(null);
  const [assistantTarget, setAssistantTarget] =
    useState<ReturnType<LabEngine["connectionScreenPoint"]>>(null);
  useEffect(() => {
    if (!wireNotice || !noticePin) {
      setAssistantTarget(null);
      return;
    }
    const update = () => {
      const next = engineRef.current?.connectionScreenPoint(noticePin) ?? null;
      setAssistantTarget((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    update();
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [wireNotice, noticePin]);
  const [wireNoticeEditId, setWireNoticeEditId] = useState<string | null>(null);
  const changeWireType = (id: string, type: WireType) => {
    const wire = pRef.current.active.data.wires.find((item) => item.id === id);
    if (!wire) return;
    const fit = checkWireFit(pRef.current.active.data, wire.from, wire.to, type);
    setNoticePin(fit.message.startsWith("The first") ? wire.from : wire.to);
    setWireNotice(fit);
    setWireNoticeEditId(id);
    if (!fit.ok) return;
    pRef.current.edit((data) => ({
      ...data,
      wires: data.wires.map((item) =>
        item.id === id
          ? { ...item, type, ...(type === "power" ? { gauge: item.gauge ?? 22 } : {}) }
          : item,
      ),
    }));
  };

  const [wireType, setWireType] = useState<WireType>("jumper-mm"),
    [powerGauge, setPowerGauge] = useState<PowerGauge>(22);
  const wireSpecRef = useRef({ type: wireType, gauge: powerGauge });
  wireSpecRef.current = { type: wireType, gauge: powerGauge };
  const pRef = useRef(P);
  pRef.current = P;
  const colorRef = useRef(wireColor);
  colorRef.current = wireColor;

  // engine lifecycle
  useEffect(() => {
    const eng = new LabEngine(hostRef.current!, {
      onSelect: setSelection,
      onMovePart: (id, x, z) =>
        pRef.current.edit((d) => ({
          ...d,
          parts: d.parts.map((p) => (p.id === id ? { ...p, x, z } : p)),
        })),
      onConnect: (from, to) => {
        const exists = pRef.current.active.data.wires.some(
          (w) =>
            (w.from.partId === from.partId &&
              w.from.pin === from.pin &&
              w.to.partId === to.partId &&
              w.to.pin === to.pin) ||
            (w.to.partId === from.partId &&
              w.to.pin === from.pin &&
              w.from.partId === to.partId &&
              w.from.pin === to.pin),
        );
        if (exists) {
          toast("These pins are already connected");
          return;
        }
        const fit = checkWireFit(pRef.current.active.data, from, to, wireSpecRef.current.type);
        setNoticePin(fit.message.startsWith("The first") ? from : to);
        setWireNotice(fit);
        setWireNoticeEditId(null);
        if (!fit.ok) return;
        const id = uid();
        pRef.current.edit((d) => ({
          ...d,
          wires: [
            ...d.wires,
            {
              id,
              from,
              to,
              color: colorRef.current,
              type: wireSpecRef.current.type,
              ...(wireSpecRef.current.type === "power" ? { gauge: wireSpecRef.current.gauge } : {}),
            },
          ],
        }));
        setSelection({ kind: "wire", id });
      },
      onPinInfo: setPinInfo,
      onDropPart: (type, x, z) => addPart(type, x, z),
      onWireCtrl: (id, ctrl) =>
        pRef.current.edit((d) => ({
          ...d,
          wires: d.wires.map((w) => (w.id === id ? { ...w, ctrl } : w)),
        })),
    });
    engineRef.current = eng;
    return () => eng.dispose();
  }, []);

  const flagged = useMemo(() => {
    const s = new Set<string>();
    result?.issues
      .filter((i) => i.severity === "error")
      .forEach((i) => i.partIds.forEach((p) => s.add(p)));
    return s;
  }, [result]);

  useEffect(() => {
    engineRef.current?.setData(structuredClone(active.data), selection, flagged);
  }, [active.data, selection, flagged]);
  useEffect(
    () => engineRef.current?.setDraftWireRadius(wireRadius(wireType, powerGauge)),
    [wireType, powerGauge],
  );
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
    P.edit((d) => ({
      ...d,
      parts: d.parts.map((p) => (p.id === selection.id ? { ...p, rot: (p.rot + 1) % 4 } : p)),
    }));
  };
  const deleteSel = () => {
    if (!selection) return;
    if (selection.kind === "part") {
      P.edit((d) => ({
        parts: d.parts.filter((p) => p.id !== selection.id),
        wires: d.wires.filter(
          (w) => w.from.partId !== selection.id && w.to.partId !== selection.id,
        ),
      }));
    } else P.edit((d) => ({ ...d, wires: d.wires.filter((w) => w.id !== selection.id) }));
    setSelection(null);
  };
  const showIssue = (issue: Issue) => {
    const data = pRef.current.active.data,
      wire = data.wires.find((item) => issue.wireIds.includes(item.id));
    const part = data.parts.find((item) => issue.partIds.includes(item.id));
    const pin = wire?.to ?? (part ? { partId: part.id, pin: 0 } : null);
    if (!pin) return;
    const explanations: Record<string, string> = {
      "Short Circuit":
        "في قصر كهربائي بين نقاط الشبكة. راجع أطراف التغذية والأرضي وافصل المسار الخاطئ.",
      "Missing Power": "القطعة غير موصولة بالتغذية المطلوبة. راجع مسار الطاقة والجهد المناسب.",
      "Missing Ground": "ناقص توصيل الأرضي. تأكد من ربط الأرضي بين القطع.",
      "Wrong Pin Type": "وظيفة المدخل لا تناسب هذا التوصيل. راجع أسماء المداخل ووظائفها.",
      "Voltage Over Limit":
        "الجهد يتجاوز الحد المسموح للقطعة. راجع مصدر الطاقة أو استخدم محوّل جهد مناسبًا.",
      "Current Over Limit":
        "التيار المطلوب يتجاوز الحد المسموح. راجع مصدر التغذية والدارة المشغّلة.",
      "Too Many Connections": "عدد التوصيلات على المدخل زائد. راجع توزيع الأسلاك.",
      "Compatibility Warning": "راجع توافق القطع ووظائف المداخل في هذه الشبكة.",
    };
    setNoticePin(pin);
    setWireNoticeEditId(null);
    setWireNotice({
      ok: false,
      title: issue.type,
      message: issue.message,
      from: wire
        ? (CATALOG_MAP[data.parts.find((item) => item.id === wire.from.partId)?.type ?? ""]?.name ??
          "Connection")
        : "Circuit check",
      to:
        CATALOG_MAP[data.parts.find((item) => item.id === pin.partId)?.type ?? ""]?.name ?? "Part",
      arabic: {
        title: "المشكلة في هذه الشبكة",
        message: explanations[issue.type] ?? "راجع توصيلات هذه القطعة.",
      },
    });
    if (wire) setSelection({ kind: "wire", id: wire.id });
    else if (part) setSelection({ kind: "part", id: part.id });
  };
  const runValidate = () => {
    const r = validate(active.data);
    setResult(r);
    const first = r.issues.find((issue) => issue.severity === "error") ?? r.issues[0];
    if (first) showIssue(first);
    else setWireNotice(null);
    const errs = r.issues.filter((i) => i.severity === "error").length;
    if (errs) toast.error(`${errs} wiring error${errs > 1 ? "s" : ""} found`);
    else toast.success("Wiring looks good");
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) P.redo();
        else P.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        P.redo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        P.save();
        toast.success("Circuit saved");
      } else if (e.key === "r" || e.key === "R") rotateSel();
      else if (e.key === "Delete" || e.key === "Backspace") deleteSel();
      else if (e.key === "Escape") {
        setSelection(null);
        setPinInfo(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const parts = CATALOG.filter(
    (c) =>
      !["resistor-220", "resistor-10k"].includes(c.id) &&
      (cat === "All" || c.category === cat) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );
  const selPart =
    selection?.kind === "part" ? active.data.parts.find((p) => p.id === selection.id) : undefined;
  const selWire =
    selection?.kind === "wire" ? active.data.wires.find((w) => w.id === selection.id) : undefined;
  const pinLabel = (r: PinRef) => {
    const part = active.data.parts.find((p) => p.id === r.partId);
    const def = part && placedDefinition(part);
    return def ? `${def.name} · ${def.pins[r.pin]?.name}` : "?";
  };
  const pinConnections = (r: PinRef) =>
    active.data.wires.filter(
      (w) =>
        (w.from.partId === r.partId && w.from.pin === r.pin) ||
        (w.to.partId === r.partId && w.to.pin === r.pin),
    ).length;

  const openText = (k: DialogKind, initial = "") => {
    setText(initial);
    setDialog(k);
  };
  const submitText = () => {
    const v = text.trim();
    if (!v) return;
    if (dialog === "new") P.createCircuit(v);
    if (dialog === "rename") P.renameCircuit(active.id, v);
    if (dialog === "version") {
      P.saveVersion(v);
      toast.success(`Version "${v}" saved`);
    }
    setDialog(null);
  };

  return (
    <div className="hardware-lab flex h-screen flex-col bg-background text-foreground">
      <Toaster position="bottom-center" />
      {/* ===== Toolbar */}
      <header className="lab-main-toolbar flex h-14 shrink-0 items-center gap-1 border-b bg-panel px-3">
        <div className="flex items-center gap-2 pr-3">
          <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Cpu className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              LabAssist · Lab
            </div>
            <div className="text-xs text-muted-foreground">{P.project.name}</div>
          </div>
        </div>
        <Sep />
        <DropdownMenu>
          <DropdownMenuTrigger className="tool-btn max-w-56 font-semibold">
            <Cable className="size-4 text-primary" />
            <span className="truncate">{active.name}</span>
            {P.dirty && (
              <span className="size-1.5 rounded-full bg-warning" title="Unsaved changes" />
            )}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="lab-ui-surface w-64">
            <DropdownMenuLabel>Circuits in this project</DropdownMenuLabel>
            {P.project.circuits.map((c) => (
              <DropdownMenuItem
                key={c.id}
                onClick={() => P.switchCircuit(c.id)}
                className="justify-between"
              >
                <span className={c.id === active.id ? "font-semibold text-primary" : ""}>
                  {c.name}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {c.data.parts.length} parts
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openText("rename", active.name)}>
              <Pencil className="size-4" />
              Rename current
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={P.project.circuits.length < 2}
              onClick={() => P.deleteCircuit(active.id)}
              className="text-destructive"
            >
              <Trash2 className="size-4" />
              Delete current
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Sep />
        <button
          className="tool-btn"
          onClick={() => openText("new", `Circuit ${P.project.circuits.length + 1}`)}
        >
          <FilePlus2 className="size-4" />
          New Circuit
        </button>
        <button
          className="tool-btn"
          onClick={() => {
            P.save();
            toast.success("Circuit saved");
          }}
        >
          <Save className="size-4" />
          Save
        </button>
        <button
          className="tool-btn"
          onClick={() => openText("version", `v${active.versions.length + 1}`)}
        >
          <Bookmark className="size-4" />
          Save Version
        </button>
        <button className="tool-btn" onClick={() => setDialog("history")}>
          <History className="size-4" />
          History
        </button>
        <Sep />
        <button className="tool-btn" title="Undo (Ctrl+Z)" disabled={!P.canUndo} onClick={P.undo}>
          <Undo2 className="size-4" />
        </button>
        <button className="tool-btn" title="Redo (Ctrl+Y)" disabled={!P.canRedo} onClick={P.redo}>
          <Redo2 className="size-4" />
        </button>
        <Sep />
        <button className="tool-btn" title="Zoom in" onClick={() => engineRef.current?.zoom(1.2)}>
          <ZoomIn className="size-4" />
        </button>
        <button
          className="tool-btn"
          title="Zoom out"
          onClick={() => engineRef.current?.zoom(1 / 1.2)}
        >
          <ZoomOut className="size-4" />
        </button>
        <button
          className="tool-btn"
          title="Reset view"
          onClick={() => engineRef.current?.resetView()}
        >
          <Maximize className="size-4" />
        </button>
        <Sep />
        <button className="tool-btn" data-active={grid} onClick={() => setGrid(!grid)}>
          <Grid3x3 className="size-4" />
          Grid
        </button>
        <button className="tool-btn" data-active={snap} onClick={() => setSnap(!snap)}>
          <Magnet className="size-4" />
          Snap
        </button>
        <div className="flex-1" />
        <Button onClick={runValidate} size="sm">
          <ShieldCheck className="size-4" />
          Validate Wiring
        </Button>
      </header>

      <div className="lab-panel-toolbar">
        <div>
          <button
            aria-controls="lab-library"
            aria-expanded={leftOpen}
            onClick={() => setLeftOpen((value) => !value)}
          >
            <PanelLeft size={15} />
            {leftOpen ? "Hide library" : "Show library"}
          </button>
          <button
            aria-controls="lab-inspector"
            aria-expanded={rightOpen}
            onClick={() => setRightOpen((value) => !value)}
          >
            <PanelRight size={15} />
            {rightOpen ? "Hide inspector" : "Show inspector"}
          </button>
        </div>
        <button
          className="lab-focus-button"
          aria-pressed={!leftOpen && !rightOpen}
          onClick={toggleFocus}
        >
          <ChevronsLeftRight size={15} />
          {leftOpen || rightOpen ? "Workspace only" : "Restore panels"}
        </button>
      </div>
      <div
        ref={panelLayout}
        className={`lab-panel-layout flex min-h-0 flex-1 ${resizing ? "lab-is-resizing" : ""}`}
      >
        {/* ===== Library */}
        <aside
          id="lab-library"
          className={`lab-side-panel lab-library-panel flex shrink-0 flex-col border-r bg-panel ${leftOpen ? "" : "lab-panel-hidden"}`}
          style={{ width: leftWidth }}
        >
          <div className="space-y-2 border-b p-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">Component Library</h2>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {CATALOG.length} parts
                </span>
                <button
                  aria-label="Hide component library"
                  className="lab-panel-close"
                  onClick={() => setLeftOpen(false)}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search parts…"
                className="h-8 pl-7 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(["All", ...CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  data-active={cat === c}
                  className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground data-[active=true]:border-primary data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {parts.map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-part", c.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onDoubleClick={() => addPart(c.id)}
                title="Drag into the workspace (or double-click)"
                className="lab-library-item group mb-1 flex cursor-grab items-center gap-2.5 rounded-md border border-transparent p-2 hover:border-border hover:bg-card active:cursor-grabbing"
              >
                <div className="component-preview">
                  {previews[c.id] ? (
                    <img
                      src={previews[c.id]}
                      alt={c.name}
                      width={96}
                      height={72}
                      draggable={false}
                    />
                  ) : (
                    <span className="text-[9px] text-muted-foreground">Preview unavailable</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium leading-snug">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {c.category} · {c.pins.length} pins
                  </div>
                </div>
              </div>
            ))}
            {!parts.length && (
              <p className="p-4 text-center text-sm text-muted-foreground">No parts match.</p>
            )}
          </div>
          <div className="border-t p-3 text-[11px] leading-relaxed text-muted-foreground">
            Drag a pin onto another pin to wire it. Drag empty space to pan, scroll to zoom.{" "}
            <kbd className="font-mono">R</kbd> rotate · <kbd className="font-mono">Del</kbd> delete
          </div>
        </aside>

        {/* ===== Workspace */}
        {leftOpen && (
          <div
            className="lab-panel-resizer"
            role="separator"
            aria-label="Resize component library"
            aria-orientation="vertical"
            aria-valuemin={190}
            aria-valuemax={440}
            aria-valuenow={leftWidth}
            tabIndex={0}
            onKeyDown={(event) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                keyboardResize("left", event.key);
              }
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setResizing(true);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                resizePanel("left", event.clientX);
            }}
            onPointerUp={() => setResizing(false)}
            onLostPointerCapture={() => setResizing(false)}
          >
            <i />
          </div>
        )}
        <main className="lab-workspace relative min-w-0 flex-1">
          <div ref={hostRef} className="absolute inset-0" />
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
            {(["power", "ground", "digital", "pwm", "analog", "sda", "scl", "motor"] as const).map(
              (k) => (
                <span
                  key={k}
                  className="flex items-center gap-1 rounded-full border bg-card/90 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground backdrop-blur"
                >
                  <span className="size-2 rounded-full" style={{ background: PIN_COLORS[k] }} />
                  {k}
                </span>
              ),
            )}
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border bg-card/90 px-2 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur">
            {active.data.parts.length} parts · {active.data.wires.length} wires
          </div>
          {pinInfo &&
            (() => {
              const part = active.data.parts.find((p) => p.id === pinInfo.ref.partId);
              const def = part && placedDefinition(part);
              const pin = def?.pins[pinInfo.ref.pin];
              if (!pin || !def) return null;
              const host = hostRef.current!.getBoundingClientRect();
              if (pinInfo.compact)
                return (
                  <div
                    role="tooltip"
                    className="pin-hover-label"
                    style={{
                      left: Math.max(0, Math.min(pinInfo.x - host.left + 14, host.width - 240)),
                      top: Math.max(0, Math.min(pinInfo.y - host.top + 14, host.height - 48)),
                    }}
                  >
                    {pin.physicalNumber ? `Pin ${pin.physicalNumber} · ` : ""}
                    {pin.name}
                    {pin.label && pin.label !== pin.name ? ` (${pin.label})` : ""}
                  </div>
                );
              return (
                <div
                  className="pointer-events-none absolute z-20 w-52 rounded-lg border bg-popover p-3 text-sm shadow-lg"
                  style={{
                    left: Math.min(pinInfo.x - host.left + 12, host.width - 220),
                    top: pinInfo.y - host.top + 12,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: PIN_COLORS[pin.kind] }}
                    />
                    <span className="font-mono font-semibold">
                      {pin.physicalNumber ? `Pin ${pin.physicalNumber} · ${pin.name}` : pin.name}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{def.name}</div>
                  <dl className="mt-2 grid grid-cols-2 gap-y-1 font-mono text-xs">
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="uppercase">{pin.kind}</dd>
                    <dt className="text-muted-foreground">Connector</dt>
                    <dd>{connectorLabels[connectorFor(part!.type, pinInfo.ref.pin)]}</dd>
                    <dt className="text-muted-foreground">Direction</dt>
                    <dd className="uppercase">{pin.dir}</dd>
                    <dt className="text-muted-foreground">Voltage</dt>
                    <dd>
                      {pin.voltage !== undefined
                        ? `${pin.voltage} V`
                        : pin.kind === "ground"
                          ? "0 V"
                          : "—"}
                    </dd>
                    {pin.functions && (
                      <>
                        <dt className="text-muted-foreground">Functions</dt>
                        <dd className="break-words">{pin.functions}</dd>
                      </>
                    )}
                    {pin.maxCurrent !== undefined && (
                      <>
                        <dt className="text-muted-foreground">Max current</dt>
                        <dd>{pin.maxCurrent} mA</dd>
                      </>
                    )}
                    <dt className="text-muted-foreground">Wires</dt>
                    <dd>{pinConnections(pinInfo.ref)}</dd>
                  </dl>
                </div>
              );
            })()}
          <LabWiringAssistant
            target={assistantTarget}
            notice={wireNotice}
            onClose={() => setWireNotice(null)}
            onUse={() => {
              if (!wireNotice?.suggested) return;
              if (wireNoticeEditId) {
                changeWireType(wireNoticeEditId, wireNotice.suggested);
              } else {
                setWireType(wireNotice.suggested);
                setWireNotice(null);
                toast("Wire type updated. Connect the pins again.");
              }
            }}
          />
        </main>

        {/* ===== Right panel */}
        {rightOpen && (
          <div
            className="lab-panel-resizer"
            role="separator"
            aria-label="Resize inspector"
            aria-orientation="vertical"
            aria-valuemin={220}
            aria-valuemax={440}
            aria-valuenow={rightWidth}
            tabIndex={0}
            onKeyDown={(event) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                keyboardResize("right", event.key);
              }
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setResizing(true);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                resizePanel("right", event.clientX);
            }}
            onPointerUp={() => setResizing(false)}
            onLostPointerCapture={() => setResizing(false)}
          >
            <i />
          </div>
        )}
        <aside
          id="lab-inspector"
          className={`lab-side-panel lab-inspector-panel flex shrink-0 flex-col border-l bg-panel ${rightOpen ? "" : "lab-panel-hidden"}`}
          style={{ width: rightWidth }}
        >
          <section className="lab-wire-setup border-b p-3">
            <h2 className="mb-3 text-sm font-semibold">New wire setup</h2>
            <WireOptions
              type={wireType}
              gauge={powerGauge}
              color={wireColor}
              onType={setWireType}
              onGauge={setPowerGauge}
              onColor={setWireColor}
            />
          </section>
          <section className="border-b p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Inspector</h2>
              <button
                aria-label="Hide inspector panel"
                className="lab-panel-close"
                onClick={() => setRightOpen(false)}
              >
                <X size={14} />
              </button>
            </div>
            {selPart ? (
              (() => {
                const def = placedDefinition(selPart);
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium">{def.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        x {selPart.x.toFixed(2)} · z {selPart.z.toFixed(2)} · {selPart.rot * 90}° ·
                        max {def.vMax || "—"}V · {def.draw}mA
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={rotateSel}>
                        <RotateCw className="size-4" />
                        Rotate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={deleteSel}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                    {(["power-source", "xl4015"].includes(selPart.type) ||
                      selPart.type.startsWith("resistor-")) && (
                      <label className="block text-xs">
                        {selPart.type.startsWith("resistor-")
                          ? "Resistance (Ω)"
                          : "Output voltage (V)"}
                        <Input
                          type="number"
                          min={selPart.type.startsWith("resistor-") ? 0.01 : 0.1}
                          max={selPart.type === "xl4015" ? 32 : undefined}
                          step="any"
                          value={
                            selPart.type.startsWith("resistor-")
                              ? (selPart.resistance ??
                                (selPart.type === "resistor-10k" ? 10000 : 220))
                              : (selPart.voltage ?? (selPart.type === "xl4015" ? 12 : 5))
                          }
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (
                              !Number.isFinite(value) ||
                              value <= 0 ||
                              (selPart.type === "xl4015" && value > 32)
                            )
                              return;
                            P.edit((data) => ({
                              ...data,
                              parts: data.parts.map((part) =>
                                part.id === selPart.id
                                  ? {
                                      ...part,
                                      ...(selPart.type.startsWith("resistor-")
                                        ? { resistance: value }
                                        : { voltage: value }),
                                    }
                                  : part,
                              ),
                            }));
                          }}
                        />
                      </label>
                    )}
                    {selPart.type === "power-switch" && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          P.edit((data) => ({
                            ...data,
                            parts: data.parts.map((part) =>
                              part.id === selPart.id
                                ? { ...part, enabled: part.enabled === false }
                                : part,
                            ),
                          }))
                        }
                      >
                        {selPart.enabled === false ? "Switch OFF" : "Switch ON"}
                      </Button>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {def.pins
                        .slice()
                        .sort(
                          (a, b) =>
                            (a.physicalNumber ??
                              (a.headerRow ?? 0) * 2 + (a.headerSide === "right" ? 1 : 0)) -
                            (b.physicalNumber ??
                              (b.headerRow ?? 0) * 2 + (b.headerSide === "right" ? 1 : 0)),
                        )
                        .map((p, i) => (
                          <span
                            key={i}
                            title={p.functions}
                            className="flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]"
                          >
                            <span
                              className="size-1.5 rounded-full"
                              style={{ background: PIN_COLORS[p.kind] }}
                            />
                            {p.physicalNumber
                              ? `${p.physicalNumber}: ${p.name}`
                              : (p.label ?? p.name)}
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })()
            ) : selWire ? (
              <div className="space-y-3">
                <div className="font-mono text-xs leading-relaxed">
                  <div>{pinLabel(selWire.from)}</div>
                  <div className="text-muted-foreground">↓</div>
                  <div>{pinLabel(selWire.to)}</div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold">Selected wire</div>
                  <WireOptions
                    type={selWire.type}
                    gauge={selWire.gauge ?? 22}
                    color={selWire.color}
                    onType={(type) => changeWireType(selWire.id, type)}
                    onGauge={(gauge) =>
                      P.edit((data) => ({
                        ...data,
                        wires: data.wires.map((w) => (w.id === selWire.id ? { ...w, gauge } : w)),
                      }))
                    }
                    onColor={(color) =>
                      P.edit((data) => ({
                        ...data,
                        wires: data.wires.map((w) => (w.id === selWire.id ? { ...w, color } : w)),
                      }))
                    }
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Drag the teal handle on the wire to reshape its path.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!selWire.ctrl}
                    onClick={() =>
                      P.edit((d) => ({
                        ...d,
                        wires: d.wires.map((w) =>
                          w.id === selWire.id ? { ...w, ctrl: undefined } : w,
                        ),
                      }))
                    }
                  >
                    Reset path
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={deleteSel}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Select a part or wire to inspect it. New connections use the wire setup above.
                </p>
              </div>
            )}
          </section>

          <section className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between p-3 pb-2">
              <h2 className="text-sm font-semibold">Wiring Validation</h2>
              {result && (
                <button className="text-[11px] text-primary hover:underline" onClick={runValidate}>
                  Re-run
                </button>
              )}
            </div>
            {!result ? (
              <div className="m-3 mt-0 rounded-lg border border-dashed p-5 text-center">
                <ShieldCheck className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Run <b>Validate Wiring</b> to check power, ground, pin types, voltage, current and
                  shorts.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 px-3">
                  <Stat label="Correct" value={result.okWires} tone="text-success" />
                  <Stat label="Faulty" value={result.badWires} tone="text-destructive" />
                  <Stat
                    label="Warnings"
                    value={result.issues.filter((i) => i.severity === "warning").length}
                    tone="text-warning"
                  />
                </div>
                <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
                  {!result.issues.length && (
                    <div className="flex items-center gap-2 rounded-md bg-accent p-3 text-sm text-accent-foreground">
                      <CheckCircle2 className="size-4" />
                      No problems found.
                    </div>
                  )}
                  {result.issues.map((iss, i) => (
                    <button
                      key={i}
                      onClick={() => showIssue(iss)}
                      className="flex w-full gap-2 rounded-md border bg-card p-2 text-left hover:border-primary"
                    >
                      {iss.severity === "error" ? (
                        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                      ) : (
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{iss.type}</div>
                        <div className="text-[11px] leading-snug text-muted-foreground">
                          {iss.message}
                        </div>
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
      <Dialog
        open={dialog === "new" || dialog === "rename" || dialog === "version"}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <DialogContent className="lab-ui-surface sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {dialog === "new"
                ? "New circuit"
                : dialog === "rename"
                  ? "Rename circuit"
                  : "Save version"}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitText()}
            placeholder={dialog === "version" ? "Version label" : "Circuit name"}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={submitText}>{dialog === "new" ? "Create" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "history"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="lab-ui-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Version history · {active.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-1.5 overflow-y-auto">
            {!active.versions.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No saved versions yet. Use “Save Version” to create one.
              </p>
            )}
            {active.versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-md border p-2.5">
                <div>
                  <div className="text-sm font-medium">{v.label}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {new Date(v.date).toLocaleString()} · {v.data.parts.length} parts ·{" "}
                    {v.data.wires.length} wires
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    P.restoreVersion(v.id);
                    setDialog(null);
                    toast.success(`Restored "${v.label}"`);
                  }}
                >
                  Restore
                </Button>
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
        <button
          key={c}
          onClick={() => onChange(c)}
          aria-label={`Wire color ${c}`}
          className={`size-6 rounded-full border-2 ${value === c ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function WireOptions({
  type,
  gauge,
  color,
  onType,
  onGauge,
  onColor,
}: {
  type: WireType | undefined;
  gauge: PowerGauge;
  color: string;
  onType: (value: WireType) => void;
  onGauge: (value: PowerGauge) => void;
  onColor: (value: string) => void;
}) {
  return (
    <div className="lab-wire-options">
      <label>
        Wire type
        <select
          aria-label="Wire type"
          value={type ?? "legacy"}
          onChange={(event) => onType(event.target.value as WireType)}
        >
          {!type && (
            <option value="legacy" disabled>
              Existing wire · type unspecified
            </option>
          )}
          {WIRE_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <div
        className={`lab-wire-sample ${type === "power" ? "wire-sample-power" : ""}`}
        style={{ "--wire-color": color } as React.CSSProperties}
      >
        <span
          className={
            type === "jumper-ff" || type === "jumper-fm" ? "wire-end-female" : "wire-end-male"
          }
        />
        <i />
        <span
          className={
            type === "jumper-mf" || type === "jumper-ff" || type === "jumper-fm"
              ? "wire-end-female"
              : "wire-end-male"
          }
        />
        <small>
          {type === "power"
            ? `${gauge} AWG · DC power`
            : type === "jumper-mm"
              ? "M → M"
              : type === "jumper-mf"
                ? "M → F"
                : type === "jumper-ff"
                  ? "F → F"
                  : type === "jumper-fm"
                    ? "F → M"
                    : "Jumper"}
        </small>
      </div>
      {type === "power" && (
        <>
          <label>
            Wire gauge
            <select
              aria-label="Power wire gauge"
              value={gauge}
              onChange={(event) => onGauge(Number(event.target.value) as PowerGauge)}
            >
              {([22, 20, 18] as const).map((value) => (
                <option key={value} value={value}>
                  {value} AWG{value === 18 ? " · thicker" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="lab-power-presets">
            <button type="button" onClick={() => onColor("#e5484d")}>
              <i style={{ background: "#e5484d" }} />
              DC + · red
            </button>
            <button type="button" onClick={() => onColor("#2b2f33")}>
              <i style={{ background: "#2b2f33" }} />
              GND · black
            </button>
          </div>
          <small>Gauge changes visual thickness. Current capacity is not calculated.</small>
        </>
      )}
      <div>
        <p className="mb-2 text-[10px] text-muted-foreground">Wire color</p>
        <ColorRow value={color} onChange={onColor} />
      </div>
      {type === "jumper-mf" && <small>Male at the first pin → female at the second pin.</small>}
    </div>
  );
}
