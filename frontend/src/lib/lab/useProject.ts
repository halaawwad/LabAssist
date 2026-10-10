import { useCallback, useEffect, useRef, useState } from "react";
import { uid, type Circuit, type CircuitData, type Project } from "./types";

const KEY = "hardwaremate.lab.project.v1";

function sample(): CircuitData {
  const uno = uid();
  const led = uid();
  const res = uid();
  return {
    parts: [
      { id: uno, type: "arduino-uno", x: -2, z: 0, rot: 0 },
      { id: res, type: "resistor-220", x: 3, z: 2.5, rot: 0 },
      { id: led, type: "led-red", x: 5, z: 1, rot: 0 },
    ],
    wires: [
      { id: uid(), from: { partId: uno, pin: 10 }, to: { partId: res, pin: 0 }, color: "#12a594" },
      { id: uid(), from: { partId: res, pin: 1 }, to: { partId: led, pin: 0 }, color: "#f5a524" },
      { id: uid(), from: { partId: uno, pin: 3 }, to: { partId: led, pin: 1 }, color: "#2b2f33" },
    ],
  };
}

const newCircuit = (name: string, data: CircuitData = { parts: [], wires: [] }): Circuit => ({
  id: uid(),
  name,
  data,
  versions: [],
  updated: Date.now(),
});

function initial(): Project {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const c = newCircuit("Blink LED Circuit", sample());
  return { name: "Smart Greenhouse", circuits: [c], activeId: c.id };
}

const clone = <T,>(v: T): T => structuredClone(v);

export function useProject() {
  const [project, setProject] = useState<Project>(initial);
  const [dirty, setDirty] = useState(false);
  const past = useRef<CircuitData[]>([]);
  const future = useRef<CircuitData[]>([]);
  const [, force] = useState(0);

  const active = project.circuits.find((c) => c.id === project.activeId) ?? project.circuits[0]!;

  const patchActive = useCallback((fn: (c: Circuit) => Circuit) => {
    setProject((p) => ({ ...p, circuits: p.circuits.map((c) => (c.id === p.activeId ? fn(c) : c)) }));
  }, []);

  /** Apply an undoable edit to the active circuit's data. */
  const edit = useCallback(
    (fn: (d: CircuitData) => CircuitData) => {
      patchActive((c) => {
        past.current.push(clone(c.data));
        if (past.current.length > 100) past.current.shift();
        future.current = [];
        return { ...c, data: fn(clone(c.data)), updated: Date.now() };
      });
      setDirty(true);
      force((n) => n + 1);
    },
    [patchActive],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    patchActive((c) => {
      future.current.push(clone(c.data));
      return { ...c, data: prev };
    });
    setDirty(true);
    force((n) => n + 1);
  }, [patchActive]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    patchActive((c) => {
      past.current.push(clone(c.data));
      return { ...c, data: next };
    });
    setDirty(true);
    force((n) => n + 1);
  }, [patchActive]);

  const resetHistory = () => {
    past.current = [];
    future.current = [];
    force((n) => n + 1);
  };

  const save = useCallback(() => {
    localStorage.setItem(KEY, JSON.stringify(project));
    setDirty(false);
  }, [project]);

  // persist when save() is called via state – also keep latest for version ops
  useEffect(() => {
    if (!dirty) localStorage.setItem(KEY, JSON.stringify(project));
  }, [project, dirty]);

  const createCircuit = (name: string) => {
    const c = newCircuit(name);
    setProject((p) => ({ ...p, circuits: [...p.circuits, c], activeId: c.id }));
    resetHistory();
    setDirty(true);
  };
  const switchCircuit = (id: string) => {
    setProject((p) => ({ ...p, activeId: id }));
    resetHistory();
  };
  const renameCircuit = (id: string, name: string) => {
    setProject((p) => ({ ...p, circuits: p.circuits.map((c) => (c.id === id ? { ...c, name } : c)) }));
    setDirty(true);
  };
  const deleteCircuit = (id: string) => {
    setProject((p) => {
      if (p.circuits.length <= 1) return p;
      const circuits = p.circuits.filter((c) => c.id !== id);
      return { ...p, circuits, activeId: p.activeId === id ? circuits[0]!.id : p.activeId };
    });
    resetHistory();
    setDirty(true);
  };
  const saveVersion = (label: string) => {
    patchActive((c) => ({
      ...c,
      versions: [{ id: uid(), label, date: Date.now(), data: clone(c.data) }, ...c.versions],
    }));
    setDirty(false);
  };
  const restoreVersion = (vid: string) => {
    const v = active.versions.find((x) => x.id === vid);
    if (v) edit(() => clone(v.data));
  };

  return {
    project,
    active,
    dirty,
    edit,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    save,
    createCircuit,
    switchCircuit,
    renameCircuit,
    deleteCircuit,
    saveVersion,
    restoreVersion,
  };
}
