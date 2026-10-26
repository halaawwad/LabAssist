import {expect,it} from "vitest";
import {checkWireFit} from "../lib/lab/wireCompatibility";
import type {CircuitData} from "../lib/lab/types";
const data:CircuitData={parts:[{id:"a",type:"arduino-uno",x:0,z:0,rot:0},{id:"b",type:"hc-sr04",x:3,z:0,rot:0},{id:"p",type:"power-source",x:6,z:0,rot:0}],wires:[]};
const a={partId:"a",pin:0},b={partId:"b",pin:0},p={partId:"p",pin:0};
it("matches male and female cable ends in connection order",()=>{
 expect(checkWireFit(data,a,b,"jumper-mf").ok).toBe(true);
 expect(checkWireFit(data,b,a,"jumper-mf").suggested).toBe("jumper-fm");
 expect(checkWireFit(data,b,a,"jumper-fm").ok).toBe(true);
 expect(checkWireFit(data,a,b,"jumper-mm").ok).toBe(false);
 expect(checkWireFit(data,a,b,"jumper-ff").ok).toBe(false);
});
it("supports terminals and soldered power leads without relaxing jumper fit",()=>{
 expect(checkWireFit(data,p,{partId:"p",pin:1},"power").ok).toBe(true);
 expect(checkWireFit(data,p,{partId:"p",pin:1},"jumper-mm").suggested).toBe("power");
 expect(checkWireFit(data,a,b,"power").ok).toBe(true);
 expect(checkWireFit(data,p,b,"power").message).toContain("soldered joint");
 expect(checkWireFit(data,a,b,"jumper-mm").ok).toBe(false);
});
it("blocks unknown contacts without modifying the circuit",()=>{
 const before=JSON.stringify(data);
 expect(checkWireFit(data,a,{partId:"b",pin:999},"jumper-mf").ok).toBe(false);
 expect(JSON.stringify(data)).toBe(before);
});
