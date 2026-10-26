import {unzipSync,strFromU8} from 'fflate';
import {newSlide,type Deck,type Slide} from './presentations';
import {objectFingerprint,type CanvasObject} from './presentationScene';

const P='http://schemas.openxmlformats.org/presentationml/2006/main',A='http://schemas.openxmlformats.org/drawingml/2006/main';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export function parseXml(value:string){if(/<!DOCTYPE|<!ENTITY/i.test(value))throw Error('Unsupported XML declarations.');const d=new DOMParser().parseFromString(value,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('This PowerPoint contains invalid XML.');return d;}
export const elements=(el:Document|Element,name:string,ns=A)=>Array.from(el.getElementsByTagNameNS(ns,name));
const first=(el:Document|Element|undefined,name:string,ns=A)=>el?elements(el,name,ns)[0]:undefined;
export function resolvePart(part:string,target:string){const segments=(target.startsWith('/')?target.slice(1):part.slice(0,part.lastIndexOf('/')+1)+target).split('/'),out:string[]=[];for(const s of segments){if(s==='..')out.pop();else if(s&&s!=='.')out.push(s);}return out.join('/');}
export const relationshipsPart=(part:string)=>part.slice(0,part.lastIndexOf('/')+1)+'_rels/'+part.slice(part.lastIndexOf('/')+1)+'.rels';
export function base64(bytes:Uint8Array){let value='';for(let i=0;i<bytes.length;i+=16384)value+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(value);}
export const unbase64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export function unpackPresentation(bytes:Uint8Array){
 let size=0,count=0;
 // fflate filters entries before decompression; limit expanded size as well as input.
 const files=unzipSync(bytes,{filter:entry=>{size+=entry.originalSize;count++;if(size>100*1024*1024||count>6000)throw Error('This presentation is too large to open here. Limit: 100 MB expanded.');return true;}});
 if(!files['ppt/presentation.xml'])throw Error('Choose a PowerPoint .pptx file.');return files;
}
export async function importPowerPoint(bytes:Uint8Array,name:string):Promise<Deck>{
 if(!/\.pptx$/i.test(name))throw Error('Choose a .pptx file. For an older .ppt file, save it as .pptx in PowerPoint first.');
 if(bytes.length>25*1024*1024)throw Error('Choose a PowerPoint up to 25 MB.');
 const files=unpackPresentation(bytes),warnings=new Set<string>();
 const read=(part:string)=>files[part]?parseXml(strFromU8(files[part]!)):undefined;
 const relations=(part:string)=>{const d=read(relationshipsPart(part));return d?Array.from(d.documentElement.children).map(e=>({id:e.getAttribute('Id')!,type:e.getAttribute('Type')!,target:e.getAttribute('Target')!,external:e.getAttribute('TargetMode')==='External'})):[];};
 const related=(part:string,type:string)=>{const r=relations(part).find(r=>r.type.endsWith('/'+type)&&!r.external);return r?resolvePart(part,r.target):undefined;};
 const doc=read('ppt/presentation.xml')!,dimensions=first(doc,'sldSz',P),width=Number(dimensions?.getAttribute('cx')||12192000),cy=Number(dimensions?.getAttribute('cy')||6858000);
 const scale=960/width,height=cy*scale;
 if(!Number.isFinite(height)||height<200||height>1800)throw Error('This slide aspect ratio is not supported.');
 const slideParts=elements(doc,'sldId',P).map(e=>{const id=e.getAttributeNS(R,'id');const r=relations('ppt/presentation.xml').find(r=>r.id===id&&!r.external);return r?resolvePart('ppt/presentation.xml',r.target):'';});
 if(!slideParts.length||slideParts.length>40)throw Error('Open a presentation containing 1–40 slides.');
 const contentTypes=read('[Content_Types].xml');
 const mime=(part:string)=>Array.from(contentTypes?.documentElement.children??[]).find(e=>e.getAttribute('PartName')==='/'+part)?.getAttribute('ContentType')??Array.from(contentTypes?.documentElement.children??[]).find(e=>e.getAttribute('Extension')===part.split('.').pop())?.getAttribute('ContentType')??'';
 const slides:Slide[]=[];
 for(const [index,part] of slideParts.entries()){
  const sd=read(part);if(!sd)throw Error('A slide is missing from this presentation.');
  const lp=related(part,'slideLayout'),mp=lp?related(lp,'slideMaster'):undefined,tp=(mp?related(mp,'theme'):undefined)??'ppt/theme/theme1.xml',theme=read(tp);
  const scheme:Record<string,string>={dk1:'#20252c',lt1:'#ffffff',dk2:'#354052',lt2:'#e9eef4',accent1:'#547b9b',accent2:'#8ba179',tx1:'#20252c',tx2:'#354052',bg1:'#ffffff',bg2:'#e9eef4'};
  const clrScheme=theme?first(theme,'clrScheme'):undefined;
  for(const entry of Array.from(clrScheme?.children??[])){const color=first(entry,'srgbClr')?.getAttribute('val')??first(entry,'sysClr')?.getAttribute('lastClr');if(color&&/^[0-9a-f]{6}$/i.test(color))scheme[entry.localName]='#'+color;}
  const colorMap=mp?first(read(mp)!,'clrMap',P):undefined;
  if(colorMap)for(const attr of Array.from(colorMap.attributes))if(scheme[attr.value])scheme[attr.name]=scheme[attr.value]!;
  const color=(el:Element|undefined,fallback:string)=>{if(!el)return fallback;const rgb=first(el,'srgbClr')?.getAttribute('val'),key=first(el,'schemeClr')?.getAttribute('val');let c=rgb&&/^[0-9a-f]{6}$/i.test(rgb)?'#'+rgb:key?scheme[key]??fallback:fallback;const tint=Number(first(el,'tint')?.getAttribute('val')??0)/100000,shade=Number(first(el,'shade')?.getAttribute('val')??100000)/100000,lumMod=Number(first(el,'lumMod')?.getAttribute('val')??100000)/100000,lumOff=Number(first(el,'lumOff')?.getAttribute('val')??0)/100000;if(/^#[0-9a-f]{6}$/i.test(c)&&(tint||shade!==1||lumMod!==1||lumOff)){c='#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round((parseInt(c.slice(i,i+2),16)*shade*lumMod+255*lumOff)*(1-tint)+255*tint))).toString(16).padStart(2,'0')).join('');}return c;};
  const objects:CanvasObject[]=[],sourceShapeIds:string[]=[];
  const phKey=(el:Element)=>{const ph=first(el,'ph',P);return ph?`${ph.getAttribute('type')??'obj'}:${ph.getAttribute('idx')??'0'}`:'';};
  const layoutShapes=lp?elements(read(lp)!,'sp',P):[],masterShapes=mp?elements(read(mp)!,'sp',P):[];
  const inherited=(el:Element)=>{const key=phKey(el);return key?layoutShapes.find(e=>phKey(e)===key)??masterShapes.find(e=>phKey(e)===key):undefined;};
  const imageSource=(el:Element,owner:string)=>{const blip=first(el,'blip'),id=blip?.getAttributeNS(R,'embed');if(!id)return undefined;const rel=relations(owner).find(r=>r.id===id&&!r.external);if(!rel){warnings.add('Linked images are not loaded. Embed them in PowerPoint to show them here.');return undefined;}const target=resolvePart(owner,rel.target),bytes=files[target],type=mime(target);if(!bytes)return undefined;let mt=/png$/i.test(target)?'image/png':/jpe?g$/i.test(target)?'image/jpeg':/gif$/i.test(target)?'image/gif':type;if(!['image/png','image/jpeg','image/gif'].includes(mt)){warnings.add('Some vector images cannot be previewed here. Their original files remain in the PowerPoint export.');return undefined;}return `data:${mt};base64,${base64(bytes)}`;};
  type Transform={sx:number;sy:number;tx:number;ty:number};
  const walk=(root:Element,owner:string,locked:boolean,tr:Transform={sx:1,sy:1,tx:0,ty:0})=>{
   for(const el of Array.from(root.children)){
    if(el.localName==='grpSp'){
     const xf=first(el,'xfrm'),off=xf?first(xf,'off'):undefined,ext=xf?first(xf,'ext'):undefined,co=xf?first(xf,'chOff'):undefined,ce=xf?first(xf,'chExt'):undefined;
     const sx=Number(ext?.getAttribute('cx')??1)/Number(ce?.getAttribute('cx')??1),sy=Number(ext?.getAttribute('cy')??1)/Number(ce?.getAttribute('cy')??1);
     walk(el,owner,true,{sx:tr.sx*sx,sy:tr.sy*sy,tx:tr.tx+tr.sx*(Number(off?.getAttribute('x')??0)-Number(co?.getAttribute('x')??0)*sx),ty:tr.ty+tr.sy*(Number(off?.getAttribute('y')??0)-Number(co?.getAttribute('y')??0)*sy)});
     warnings.add('Grouped drawings keep their original grouping and are locked in this editor.');continue;
    }
    if(!['sp','pic','cxnSp','graphicFrame'].includes(el.localName))continue;
    if(locked&&phKey(el))continue; // inherited placeholders supply geometry, not duplicate sample text.
    const shapeId=first(el,'cNvPr',P)?.getAttribute('id')??String(objects.length+1);
    if(el.localName==='graphicFrame'){warnings.add('Charts, tables and SmartArt keep their original PowerPoint data, but are not editable or fully previewed here.');continue;}
    const inh=inherited(el),xf=first(el,'xfrm')??(inh?first(inh,'xfrm'):undefined),off=xf?first(xf,'off'):undefined,ext=xf?first(xf,'ext'):undefined;
    if(!off||!ext){warnings.add('Some inherited elements could not be positioned in the preview. Their originals are kept.');continue;}
    const box={x:(Number(off.getAttribute('x'))*tr.sx+tr.tx)*scale,y:(Number(off.getAttribute('y'))*tr.sy+tr.ty)*scale,w:Math.max(1,Number(ext.getAttribute('cx'))*tr.sx*scale),h:Math.max(1,Number(ext.getAttribute('cy'))*tr.sy*scale)};
    const rotation=Number(xf?.getAttribute('rot')??0)/60000;
    if(xf?.getAttribute('flipH')==='1'||xf?.getAttribute('flipV')==='1')warnings.add('Flipped images and shapes may look different in the preview; original transforms are retained until edited.');
    const spPr=Array.from(el.children).find(e=>e.localName==='spPr'),fill=spPr?Array.from(spPr.children).find(e=>e.localName==='solidFill'):undefined,ln=spPr?Array.from(spPr.children).find(e=>e.localName==='ln'):undefined,geom=first(el,'prstGeom')?.getAttribute('prst')??'rect';
    const textBody=first(el,'txBody',P),paragraphs=textBody?elements(textBody,'p'):[],text=paragraphs.map(p=>elements(p,'t').map(t=>t.textContent??'').join('')).join('\n');
    const base={id:`import-${owner.replace(/\W/g,'-')}-${shapeId}`, ...box,rotation,locked,z:objects.length};
    let object:CanvasObject;
    if(el.localName==='pic'){
     const src=imageSource(el,owner);if(!src)continue;object={...base,kind:'image',src,fit:'contain'};
     if(first(el,'srcRect'))warnings.add('Cropped photos use their full image in the preview; the original crop stays in PowerPoint until that photo is edited.');
    }else if(textBody&&text.trim()){
     const runs=elements(textBody!,'rPr'),rpr=runs[0]??first(textBody!,'defRPr')??first(textBody!,'endParaRPr')??(inh?first(inh,'defRPr'):undefined),ppr=first(textBody!,'pPr'),style=first(el,'fontRef');
     const themeFont=first(theme??sd,'minorFont'),font=first(rpr??themeFont??sd.documentElement,'latin')?.getAttribute('typeface')??'Arial';
     object={...base,kind:'text',text,size:Number(rpr?.getAttribute('sz')??2400)/100*12700*scale,color:color(rpr,color(style,scheme['tx1']!)),bold:rpr?.getAttribute('b')==='1',font:/^[\w .-]{1,100}$/.test(font)&&!font.startsWith('+')?font:'Arial',align:ppr?.getAttribute('algn')==='ctr'?'center':ppr?.getAttribute('algn')==='r'?'right':'left',fill:fill?color(fill,'transparent'):'transparent'};
     if(new Set(runs.map(r=>r.getAttribute('sz')+'|'+r.getAttribute('b')+'|'+color(r,'#000000'))).size>1)warnings.add('Mixed text formatting is simplified in the preview. Unedited text keeps its original formatting in PowerPoint.');
     if(paragraphs.some(p=>first(p,'buChar')||first(p,'buAutoNum')))warnings.add('Some PowerPoint list styling is simplified in the preview.');
    }else{
     if(!['rect','roundRect','ellipse','line'].includes(geom)||first(el,'custGeom'))warnings.add('Complex shapes use a simplified preview and keep their original geometry in PowerPoint.');
     object={...base,kind:'shape',geometry:geom==='ellipse'?'ellipse':'rect',radius:geom==='roundRect'?16:0,fill:fill?color(fill,'transparent'):'transparent',...(ln?{stroke:color(ln,scheme['accent1']!)}:{})};
    }
    if(first(el,'gradFill')||first(el,'effectLst')?.children.length)warnings.add('Gradients, shadows and effects may differ in the preview; original effects are kept in the PowerPoint file.');
    if(!locked&&owner===part){sourceShapeIds.push(shapeId);object.source={part,shapeId,baseline:objectFingerprint(object)};}
    objects.push(object);
   }
  };
  for(const owner of [mp,lp,part].filter((v):v is string=>!!v)){
   const d=read(owner);if(!d)continue;const tree=first(d,'spTree',P);if(tree)walk(tree,owner,owner!==part);
  }
  let background=scheme['bg1']??'#ffffff';
  for(const owner of [mp,lp,part].filter((v):v is string=>!!v)){const d=read(owner),bg=d?first(d,'bg',P):undefined;if(bg){background=color(bg,background);const src=imageSource(bg,owner);if(src)objects.unshift({id:'background-'+owner,kind:'image',x:0,y:0,w:960,h:height,src,locked:true,z:-100,fit:'cover'});}}
  const np=related(part,'notesSlide'),nd=np?read(np):undefined;
  const notes=nd?elements(nd,'sp',P).filter(sp=>first(sp,'ph',P)?.getAttribute('type')==='body').map(sp=>elements(sp,'t').map(e=>e.textContent).join(' ')).join('\n').slice(0,3000):'';
  if(first(sd,'timing',P)||first(sd,'transition',P))warnings.add('Animations and transitions remain in the PowerPoint export; the editor shows still slides.');
  const texts=objects.filter(o=>o.kind==='text'&&!o.locked);
  slides.push({...newSlide(index===0?'cover':'bullets'),title:(texts[0]?.text??`Slide ${index+1}`).slice(0,110),body:texts.slice(1).map(o=>o.text).join('\n').slice(0,1200),kicker:'',notes,sourcePart:part,sourceShapeIds,objects,background});
 }
 return {title:name.replace(/\.pptx$/i,'').slice(0,90),theme:'sage',status:'Draft',slides,imported:{name,package:base64(bytes),width,height,warnings:[...warnings]}};
}
