import { expect, it } from "vitest";
import { CATALOG_MAP, pinLocal } from "../lib/lab/catalog";
import { validate } from "../lib/lab/validate";

const board = CATALOG_MAP["breadboard"]!;
it("matches the compact reference with 30 columns and four 25-hole rails", () => {
  const compact = CATALOG_MAP["breadboard-400"]!;
  expect(compact.pins).toHaveLength(400);
  expect(compact.pins[299]!.name).toBe("J30");
  expect(new Set(compact.pins.map((_,i)=>pinLocal(compact,i).join(","))).size).toBe(400);
  compact.pins.forEach((_,i)=>expect(Math.abs(pinLocal(compact,i)[0])).toBeLessThan(compact.w/2));
});
it("provides 830 distinct holes and separates the two circuit banks", () => {
  expect(board.pins).toHaveLength(830);
  expect(new Set(board.pins.map((_, i) => pinLocal(board, i).join(","))).size).toBe(830);
  expect(board.pins[0]!.internalNet).toBe(board.pins[4]!.internalNet);
  expect(board.pins[0]!.internalNet).not.toBe(board.pins[5]!.internalNet);
  expect(board.pins[0]!.internalNet).not.toBe(board.pins[10]!.internalNet);
});

it.each([["A1", "E1", true], ["A1", "F1", false], ["TOP+ 1", "TOP+ 50", true], ["TOP+ 1", "TOP- 1", false]])("checks electrical continuity from %s to %s", (a, b, short) => {
  const uno = CATALOG_MAP["arduino-uno"]!;
  const result = validate({parts:[{id:"board",type:"breadboard",x:0,z:0,rot:0},{id:"uno",type:"arduino-uno",x:0,z:0,rot:0}],wires:[
    {id:"power",from:{partId:"uno",pin:uno.pins.findIndex(p=>p.name === "5V")},to:{partId:"board",pin:board.pins.findIndex(p=>p.name === a)},color:"red"},
    {id:"ground",from:{partId:"uno",pin:uno.pins.findIndex(p=>p.kind === "ground")},to:{partId:"board",pin:board.pins.findIndex(p=>p.name === b)},color:"black"},
  ]});
  expect(result.issues.some(issue=>issue.type === "Short Circuit")).toBe(short);
});
