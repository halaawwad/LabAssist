import {describe,it,expect} from 'vitest';
import {zipSync,unzipSync,strFromU8,strToU8} from 'fflate';
import {starterDeck,validDeck} from '@/lib/presentations';
import {exportDeckPptx} from '@/lib/presentationExport';
import {importPowerPoint,unpackPresentation} from '@/lib/presentationImport';
import {slideScene,patchSlideObject,objectFingerprint} from '@/lib/presentationScene';
const bytes=(blob:Blob)=>new Promise<Uint8Array>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(new Uint8Array(reader.result as ArrayBuffer));reader.onerror=()=>reject(reader.error);reader.readAsArrayBuffer(blob);});
describe('free placement and PowerPoint import',()=>{
 it('keeps text, font size, multiple images and coordinates through backup validation and palette changes',()=>{
  const d=starterDeck('Project');let s=patchSlideObject(d.slides[0]!,'title',{x:300,y:70,w:450,h:160,size:39,text:'Moved title'});
  s={...s,objects:[{id:'second-image',kind:'image',x:50,y:310,w:200,h:100,src:'data:image/png;base64,YQ==',fit:'cover',rotation:12},{id:'extra-text',kind:'text',x:600,y:350,w:250,h:90,text:'More context',font:'Georgia',size:24,color:'#123456'}]};
  const next={...d,slides:[s]},scene=slideScene(next,s);
  expect(validDeck(JSON.parse(JSON.stringify(next)))).toBe(true);expect(scene.objects.find(o=>o.id==='title')).toMatchObject({x:300,y:70,size:39,text:'Moved title'});
  expect(slideScene({...next,theme:'iris'},s).objects.find(o=>o.id==='second-image')).toEqual(scene.objects.find(o=>o.id==='second-image'));
  expect(slideScene(next,patchSlideObject(s,'extra-text',{hidden:true})).objects.some(o=>o.id==='extra-text')).toBe(false);
  expect(validDeck({...next,slides:[{...s,objects:[{...s.objects![0],src:'https://untrusted.invalid/x.png'}]}]})).toBe(false);
 });
 it('opens native text and source design, preserves unsupported parts, and exports edits without replacing the master',async()=>{
  const d=starterDeck('Original template');d.slides=d.slides.slice(0,2);d.template='editorial';
  const original=unzipSync(await bytes(await exportDeckPptx(d)));
  // A 4:3 external template and an unsupported chart must survive round-trip.
  original['ppt/presentation.xml']=strToU8(strFromU8(original['ppt/presentation.xml']!).replace('cy="6858000"','cy="9144000"'));
  original['ppt/slides/slide1.xml']=strToU8(strFromU8(original['ppt/slides/slide1.xml']!).replace('</p:spTree>','<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="7000" name="Keep chart"/></p:nvGraphicFramePr><a:graphic><a:graphicData uri="chart"/></a:graphic></p:graphicFrame></p:spTree>'));
  original['ppt/charts/custom-chart.xml']=strToU8('<chart>original chart payload</chart>');
  const deck=await importPowerPoint(zipSync(original),'My template.pptx');
  expect(validDeck(deck)).toBe(true);expect(deck.imported!.height).toBe(720);expect(deck.slides).toHaveLength(2);
  expect(deck.imported!.warnings.some(w=>w.includes('SmartArt'))).toBe(true);
  const title=deck.slides[0]!.objects!.find(o=>o.text==='Original template')!;expect(title.source!.baseline).toBe(objectFingerprint(title));
  deck.slides[0]=patchSlideObject(deck.slides[0]!,title.id,{x:180,y:200,text:'Edited in LabAssist'});
  deck.slides[0]!.objects!.push({id:'added-text',kind:'text',x:50,y:600,w:400,h:55,text:'An extra text box',size:28,font:'Arial',color:'#123456'});
  const output=unzipSync(await bytes(await exportDeckPptx(deck)));
  expect(strFromU8(output['ppt/theme/theme1.xml']!)).toBe(strFromU8(original['ppt/theme/theme1.xml']!));expect(strFromU8(output['ppt/slideMasters/slideMaster1.xml']!)).toBe(strFromU8(original['ppt/slideMasters/slideMaster1.xml']!));expect(strFromU8(output['ppt/charts/custom-chart.xml']!)).toBe(strFromU8(original['ppt/charts/custom-chart.xml']!));
  const slide=strFromU8(output['ppt/slides/labassist-1.xml']!);expect(slide).toContain('Edited in LabAssist');expect(slide).toContain('An extra text box');expect(slide).toContain('Keep chart');expect(slide).toContain('x="2286000" y="2540000"');
  expect(strFromU8(output['ppt/presentation.xml']!)).toContain('cy="9144000"');
  for(const [name,value] of Object.entries(output))if(name.endsWith('.xml')||name.endsWith('.rels'))expect(new DOMParser().parseFromString(strFromU8(value),'application/xml').querySelector('parsererror'),name).toBeNull();
  const reopened=await importPowerPoint(await bytes(await exportDeckPptx(deck)),'Edited.pptx');expect(reopened.slides[0]!.objects!.some(o=>o.text==='Edited in LabAssist')).toBe(true);
 });
 it('rejects older formats, invalid archives and excessive expanded data',async()=>{
  await expect(importPowerPoint(new Uint8Array(),'old.ppt')).rejects.toThrow('.pptx');
  expect(()=>unpackPresentation(zipSync({'hello.txt':strToU8('not a presentation')}))).toThrow('PowerPoint');
 });
});
