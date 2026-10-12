export interface PlacedPart {
  id: string;
  type: string;
  x: number;
  z: number;
  rot: number; // quarter turns 0..3
  voltage?: number;
  resistance?: number;
  enabled?: boolean;
}
export interface PinRef {
  partId: string;
  pin: number;
}
export interface Wire {
  id: string;
  from: PinRef;
  to: PinRef;
  color: string;
  ctrl?: [number, number] | undefined; // custom midpoint (x,z) for path editing
}
export interface CircuitData {
  parts: PlacedPart[];
  wires: Wire[];
}
export interface Version {
  id: string;
  label: string;
  date: number;
  data: CircuitData;
}
export interface Circuit {
  id: string;
  name: string;
  data: CircuitData;
  versions: Version[];
  updated: number;
}
export interface Project {
  name: string;
  circuits: Circuit[];
  activeId: string;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const WIRE_COLORS = ["#e5484d", "#2b2f33", "#12a594", "#f5a524", "#3e9bf0", "#8e4ec6", "#ffffff"];
