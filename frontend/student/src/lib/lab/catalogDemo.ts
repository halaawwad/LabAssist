import * as THREE from "three";
import type { PartDef } from "./catalog";

/** Presentation animation only. Never used by the circuit engine. */
export function createCatalogDemo(part:THREE.Group,def:PartDef,category:number){
 const horn=part.getObjectByName("demo-servo-horn");
 const button=part.getObjectByName("demo-button-cap"),buttonY=button?.position.y??0,knob=part.getObjectByName("demo-knob");
 let stepMarker:THREE.Group|undefined,signal:THREE.Mesh|undefined;
 if(def.id==="stepper"){
  stepMarker=new THREE.Group();stepMarker.position.set(0,.75,-.27);const needle=new THREE.Mesh(new THREE.BoxGeometry(.22,.02,.035),new THREE.MeshStandardMaterial({color:"#426783"}));needle.position.x=.09;stepMarker.add(needle);part.add(stepMarker);
 }
 if(def.id.startsWith("resistor-")){
  signal=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),new THREE.MeshBasicMaterial({color:"#6bafba"}));signal.position.set(-.45,.18,-.03);part.add(signal);
 }
 const segments=["a","b","c","d","e","f","g","dp"].map(name=>part.getObjectByName(`demo-segment-${name}`));
 const digits=["abcdef","bc","abdeg","abcdg","bcfg","acdfg","acdefg","abc","abcdefg","abcdfg"];
 let fan:THREE.Group|undefined,led:THREE.MeshStandardMaterial|undefined;
 let display:{context:CanvasRenderingContext2D;texture:THREE.CanvasTexture}|undefined;
 if(def.id==="dc-motor"){
  fan=new THREE.Group();fan.position.set(-.92,.43,0);
  const material=new THREE.MeshStandardMaterial({color:"#719bb8",transparent:true,opacity:.8,metalness:.25,roughness:.3});
  for(let i=0;i<3;i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(.035,.48,.10),material);const holder=new THREE.Group();holder.rotation.x=i*Math.PI*2/3;blade.position.y=.24;holder.add(blade);fan.add(holder);}
  part.add(fan);
 }
 if(category===0){
  led=new THREE.MeshStandardMaterial({color:"#71cfaa",emissive:"#45cf8c",emissiveIntensity:1.5});
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),led);dot.position.set(def.w*.2,.12,def.d*.2);part.add(dot);
 }
 if(["lcd-i2c","lcd-1602","oled"].includes(def.id)){
  const canvas=document.createElement("canvas");canvas.width=768;canvas.height=192;
  const context=canvas.getContext("2d");if(context){
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   const lcd=def.id!=="oled",screen=new THREE.Mesh(new THREE.PlaneGeometry(def.w*(lcd?.73:.76),def.d*(lcd?.34:.36)),new THREE.MeshBasicMaterial({map:texture,transparent:false}));
   screen.rotation.x=-Math.PI/2;screen.position.set(0,lcd?.326:.13,lcd?-.12:-.14);part.add(screen);display={context,texture};
  }
 }
 const emissive:THREE.MeshStandardMaterial[]=[];
 if(category===4&&def.id.startsWith("led"))part.traverse(object=>{if(object instanceof THREE.Mesh){for(const mat of Array.isArray(object.material)?object.material:[object.material])if(mat instanceof THREE.MeshStandardMaterial&&mat.emissive.getHex()!==0)emissive.push(mat);}});
 let glow:THREE.Sprite|undefined;
 if(emissive.length){
  const canvas=document.createElement("canvas");canvas.width=128;canvas.height=128;const context=canvas.getContext("2d");
  if(context){const gradient=context.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,"rgba(255,255,255,.8)");gradient.addColorStop(.25,"rgba(255,255,255,.35)");gradient.addColorStop(1,"rgba(255,255,255,0)");context.fillStyle=gradient;context.fillRect(0,0,128,128);
   glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),color:def.id==="led-green"?"#28ee70":"#ff3548",transparent:true,opacity:.65,depthWrite:false,toneMapped:false}));glow.position.set(0,.5,-.05);glow.scale.setScalar(.85);part.add(glow);
  }
  emissive.forEach(material=>{material.toneMapped=false;if(material instanceof THREE.MeshPhysicalMaterial){material.transmission=0;material.opacity=.96;}});
 }
 let lastText="";
 return (seconds:number)=>{
  seconds=Math.max(0,seconds);
  if(horn)horn.rotation.y=Math.sin(seconds*(def.id==="mg995"?.9:1.3))*Math.PI*(def.id==="mg995"?.58:.4);
  if(button)button.position.y=buttonY-Math.max(0,Math.sin(seconds*2))*.075;
  if(knob)knob.rotation.y=Math.sin(seconds*.8)*1.8;
  if(stepMarker)stepMarker.rotation.y=Math.floor(seconds*5)*Math.PI/6;
  if(signal)signal.position.x=-.46+((seconds*(def.id==="resistor-10k"?.3:.7))%1)*.92;
  if(def.id==="mpu6050"){part.rotation.x=Math.sin(seconds*.8)*.12;part.rotation.z=Math.sin(seconds*.6)*.12;}
  if(def.id==="seven-seg")segments.forEach((object,i)=>{if(object instanceof THREE.Mesh){const material=object.material as THREE.MeshPhysicalMaterial,on=digits[Math.floor(seconds)%10]!.includes(["a","b","c","d","e","f","g","dp"][i]!);material.transmission=0;material.color.set(on?"#ff3548":"#311e25");material.emissive.set(on?"#ff1734":"#000000");material.emissiveIntensity=on?1.5:0;material.opacity=1;}});
  if(fan)fan.rotation.x=seconds*7;
  if(led)led.emissiveIntensity=.5+(Math.sin(seconds*3)+1)*1.2;
  const bulbColor=new THREE.Color(def.id==="led-green"?"#24f570":"#ff2538");if(def.id==="led-rgb")bulbColor.setHSL((seconds*.1)%1,1,.48);
  emissive.forEach(material=>{material.color.copy(bulbColor);material.emissive.copy(bulbColor);material.emissiveIntensity=1.1+(Math.sin(seconds*2)+1)*.25;});
  if(glow){glow.material.color.copy(bulbColor);glow.material.opacity=.55+(Math.sin(seconds*2)+1)*.12;glow.scale.setScalar(.85+Math.sin(seconds*2)*.05);}
  if(display){const text="HELLO, BUILDER".slice(0,Math.min(14,Math.floor(seconds*6)%30)),cursor=Math.floor(seconds*2)%2===0?"_":" ";const key=def.id==="oled"?String(Math.floor(seconds*12)):text+cursor;
   if(lastText!==key){lastText=key;const c=display.context;c.fillStyle=def.id==="oled"?"#102a39":"#a8d47b";c.fillRect(0,0,768,192);c.font="bold 66px monospace";c.fillStyle=def.id==="oled"?"#c2edf5":"#254d32";
    if(def.id==="oled"){c.font="28px monospace";c.fillText("SIGNAL / DEMO",22,35);c.beginPath();for(let x=10;x<760;x+=4){const y=112+Math.sin(x*.025-seconds*3)*38;x===10?c.moveTo(x,y):c.lineTo(x,y);}c.strokeStyle="#82dccd";c.lineWidth=5;c.stroke();}
    else{c.fillText(text+cursor,24,80);c.font="35px monospace";c.fillText("HARDWARE / CREATE",26,155);}display.texture.needsUpdate=true;}
  }
 };
}
