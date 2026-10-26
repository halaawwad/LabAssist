import {composeSlide,type Box} from './presentationTemplates';
import {deckPalette,type Deck,type Slide} from './presentations';

export type CanvasObject=Box&{
 id:string;kind:'text'|'image'|'shape';text?:string|undefined;src?:string|undefined;
 size?:number|undefined;font?:string|undefined;color?:string|undefined;bold?:boolean|undefined;
 align?:'left'|'center'|'right'|undefined;fill?:string|undefined;stroke?:string|undefined;
 geometry?:'rect'|'ellipse'|undefined;radius?:number|undefined;rotation?:number|undefined;
 fit?:'contain'|'cover'|undefined;hidden?:boolean|undefined;locked?:boolean|undefined;z?:number|undefined;
 source?:{part:string;shapeId:string;baseline:string}|undefined;
};
export type ObjectPatch=Partial<Omit<CanvasObject,'id'|'source'|'kind'>>;
export const canvasHeight=(deck:Deck)=>deck.imported?.height??540;
export function objectFingerprint(o:CanvasObject){const {source,...value}=o;return JSON.stringify(value);}
export function slideScene(deck:Deck,slide:Slide,index=0){
 if(deck.imported)return {background:slide.background??'#ffffff',height:canvasHeight(deck),objects:(slide.objects??[]).filter(o=>!o.hidden).slice().sort((a,b)=>(a.z??0)-(b.z??0))};
 const c=composeSlide(deck.template,slide,deckPalette(deck),index,deck.slides.length,deck.title);
 const objects:CanvasObject[]=[...c.shapes.map(({kind,...s},i)=>({id:`decoration-${i}`,kind:'shape' as const,...s,geometry:kind,locked:true})),...c.texts.map(t=>({id:t.role,kind:'text' as const,...t,font:t.font,z:10}))];
 if(slide.image)objects.push({id:'image',kind:'image',...c.image,src:slide.image,radius:0,z:11,fit:'contain'});
 const modified=objects.map(o=>({...o,...slide.positions?.[o.id]}));
 return {background:c.background,height:540,objects:[...modified,...(slide.objects??[])].filter(o=>!o.hidden).sort((a,b)=>(a.z??0)-(b.z??0))};
}
export function patchSlideObject(slide:Slide,id:string,patch:ObjectPatch):Slide{
 if(slide.objects?.some(o=>o.id===id))return {...slide,objects:slide.objects.map(o=>o.id===id?{...o,...patch}:o)};
 const field=['title','body','kicker','caption'].includes(id)?id:undefined;
 const position={...slide.positions?.[id],...patch};if(field)delete position.text;
 return {...slide,...(field&&patch.text!==undefined?{[field]:patch.text}:{}),positions:{...slide.positions,[id]:position}};
}
export function boundedBox(b:Box,height=540):Box{return {x:Math.max(0,Math.min(940,b.x)),y:Math.max(0,Math.min(height-20,b.y)),w:Math.max(20,Math.min(960-Math.max(0,b.x),b.w)),h:Math.max(20,Math.min(height-Math.max(0,b.y),b.h))};}
export const validCanvasImage=(src:unknown):src is string=>typeof src==='string'&&/^data:image\/(png|jpeg|gif);base64,[a-zA-Z0-9+/=]+$/.test(src);
export function validObject(o:CanvasObject):boolean{return !!o&&typeof o.id==='string'&&['text','image','shape'].includes(o.kind)&&['x','y','w','h'].every(k=>typeof o[k as keyof CanvasObject]==='number'&&Number.isFinite(o[k as keyof CanvasObject]))&&o.w>0&&o.h>0&&Math.abs(o.x)<100000&&Math.abs(o.y)<100000&&o.w<100000&&o.h<100000&&(!o.src||validCanvasImage(o.src))&&(!o.text||typeof o.text==='string'&&o.text.length<=20000)&&(!o.color||/^#[0-9a-f]{6}$/i.test(o.color))&&(!o.fill||o.fill==='transparent'||/^#[0-9a-f]{6}$/i.test(o.fill))&&(!o.stroke||/^#[0-9a-f]{6}$/i.test(o.stroke))&&(!o.font||typeof o.font==='string'&&/^[\w .-]{1,100}$/.test(o.font))&&(!o.size||Number.isFinite(o.size)&&o.size>=1&&o.size<=500)&&(!o.rotation||Number.isFinite(o.rotation))&&(!o.source||typeof o.source.part==='string'&&typeof o.source.shapeId==='string'&&typeof o.source.baseline==='string'&&validBaseline(o.source.baseline));}
function validBaseline(value:string):boolean{try{const parsed=JSON.parse(value);return !parsed.source&&validObject(parsed);}catch{return false;}}

const DB='labassist-presentation-studio',STORE='drafts';
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function storePresentation(deck:Deck){const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(deck,'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
export async function loadPresentation():Promise<Deck|undefined>{const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}}
