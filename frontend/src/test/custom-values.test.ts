import { expect, it } from "vitest";
import { placedDefinition } from "../lib/lab/catalog";
import { validate } from "../lib/lab/validate";
const source = { id: "source", type: "power-source", x: 0, z: 0, rot: 0, voltage: 24 };
it("uses each placed source voltage in validation", () => {
  expect(placedDefinition(source).pins[0]!.voltage).toBe(24);
  const result = validate({parts:[source,{id:"servo",type:"sg90",x:1,z:0,rot:0}],wires:[{id:"w",from:{partId:"source",pin:0},to:{partId:"servo",pin:0},color:"red"}]});
  expect(result.issues.some(issue=>issue.type === "Voltage Over Limit")).toBe(true);
});
it("keeps resistance and converter voltage specific to each instance", () => {
  expect(placedDefinition({...source,type:"resistor-variable",resistance:4700}).name).toContain("4700 Ω");
  expect(placedDefinition({...source,type:"xl4015",voltage:9}).pins[2]!.voltage).toBe(9);
  expect(placedDefinition({...source,type:"power-switch",enabled:false}).pins[0]!.internalNet).toBeUndefined();
});
