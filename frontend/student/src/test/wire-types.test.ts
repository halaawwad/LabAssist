import { expect, it } from "vitest";
import { validate } from "../lib/lab/validate";
import { wireRadius, type CircuitData } from "../lib/lab/types";
it("keeps legacy wire thickness and distinguishes thicker power gauges",()=>{
 expect(wireRadius()).toBe(wireRadius("jumper-mf"));
 expect(wireRadius("power",22)).toBeGreaterThan(wireRadius("jumper-mm"));
 expect(wireRadius("power",18)).toBeGreaterThan(wireRadius("power",20));
 expect(wireRadius("power",20)).toBeGreaterThan(wireRadius("power",22));
});
it("preserves power wire specifications in saved circuit snapshots",()=>{
 const wire={id:"power-wire",from:{partId:"s",pin:0},to:{partId:"s",pin:1},color:"#e5484d",type:"power" as const,gauge:18 as const};
 expect(JSON.parse(JSON.stringify({parts:[],wires:[wire]})).wires[0]).toEqual(wire);
});
it("still detects an electrical short when a wire is marked as a power wire",()=>{
 const data:CircuitData={parts:[{id:"s",type:"power-source",x:0,z:0,rot:0,voltage:12}],wires:[{id:"short",from:{partId:"s",pin:0},to:{partId:"s",pin:1},color:"#2b2f33",type:"power",gauge:18}]};
 const legacy=validate({...data,wires:data.wires.map(({type,gauge,...wire})=>wire)});
 expect(validate(data).issues.map(issue=>issue.type)).toEqual(legacy.issues.map(issue=>issue.type));
 expect(validate(data).badWires).toBeGreaterThan(0);
});
