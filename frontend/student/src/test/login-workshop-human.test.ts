import {expect,it} from "vitest";
import {createWorkshopHuman} from "../lib/loginWorkshopHuman";

it("turns the chair and person together, then returns without discontinuities",()=>{
 const person=createWorkshopHuman();let time=0,state="";
 const tick=(privateMode:boolean,count:number)=>{for(let i=0;i<count;i++){time+=1/60;state=person.update(1/60,time,privateMode,true,0);}};
 tick(true,100);expect(state).toBe("private");expect(person.group.rotation.y).toBeGreaterThan(3);expect(person.group.position.z).toBeLessThan(-2);
 tick(false,100);expect(state).toBe("working");expect(person.group.rotation.y).toBeCloseTo(-.08,2);
 for(let i=0;i<10;i++)tick(i%2===0,4);tick(false,100);expect(state).toBe("working");expect(Number.isFinite(person.group.rotation.y)).toBe(true);
});
it("preserves privacy with reduced motion while stopping the playful peek",()=>{
 const person=createWorkshopHuman();expect(person.update(.016,0,true,false,0)).toBe("private");expect(person.group.rotation.y).toBeCloseTo(Math.PI-.08);expect(person.head.rotation.y).toBeCloseTo(0);
 expect(person.update(.016,0,false,false,0)).toBe("working");
});
it("peeks over the shoulder while the chair remains turned away",()=>{
 const person=createWorkshopHuman();let peeked=false;
 for(let i=0;i<400;i++){const state=person.update(1/60,i/60,true,true,0);if(state==="peeking"){peeked=true;expect(person.group.rotation.y).toBeGreaterThan(3);expect(Math.abs(person.head.rotation.y)).toBeGreaterThan(.2);}}
 expect(peeked).toBe(true);
});
