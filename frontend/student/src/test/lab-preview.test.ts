import {describe,it,expect} from 'vitest';
import {simulatePreview,starterCircuit} from '@/lib/lab-preview/simulation';
describe('isolated series experiment',()=>{
 it('computes current from supply, LED drop and resistor',()=>{const r=simulatePreview(starterCircuit(),85);expect(r.ok).toBe(true);expect(r.current).toBeCloseTo((5-2.2)/470*1000);});
 it('responds to actual LDR resistance',()=>{const d=starterCircuit(true);expect(simulatePreview(d,85).current).toBeGreaterThan(simulatePreview(d,15).current*10);});
 it('rejects an open loop, reversed diode and shorted supply',()=>{const d=starterCircuit();d.wires.pop();expect(simulatePreview(d,85).ok).toBe(false);const reversed=starterCircuit();for(const w of reversed.wires){if(w.from.partId==='led')w.from.pin=0;if(w.to.partId==='led')w.to.pin=1;}expect(simulatePreview(reversed,85).message).toContain('reversed');const short=starterCircuit();short.wires.push({id:'short',from:{partId:'supply',pin:0},to:{partId:'supply',pin:1},color:'#000'});expect(simulatePreview(short,85).message).toContain('Short circuit');});
 it('blocks overcurrent and unsupported parallel branches',()=>{const d=starterCircuit();d.parts.find(p=>p.id==='resistor')!.resistance=10;expect(simulatePreview(d,85).message).toContain('20 mA');const branched=starterCircuit();branched.parts.push({id:'extra',type:'resistor-variable',resistance:1000,x:0,z:0,rot:0});branched.wires.push({id:'branch',from:{partId:'supply',pin:0},to:{partId:'extra',pin:0},color:'#000'});expect(simulatePreview(branched,85).message).toContain('parallel');});
});
