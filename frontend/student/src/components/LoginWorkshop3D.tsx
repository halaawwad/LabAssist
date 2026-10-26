import {useEffect,useRef,useState} from "react";
import * as THREE from "three";
import {Pause,Play} from "lucide-react";
import {loginBox,loginMaterial} from "@/lib/loginWorkshopHuman";
import {createWorkshopAvatar} from "@/lib/loginWorkshopAvatar";
import {createWorkbenchDetails} from "@/lib/loginWorkbenchDetails";

import type {LoginMood} from "./LoginScene";
import fallback from "@/assets/login-workshop-night-v1.png";

export function LoginWorkshop3D({mood}:{mood:LoginMood}){
 const host=useRef<HTMLDivElement>(null),moodRef=useRef(mood);moodRef.current=mood;
 const [paused,setPaused]=useState(false),pauseRef=useRef(paused);pauseRef.current=paused;
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  let renderer:THREE.WebGLRenderer|undefined,frame=0,observer:ResizeObserver|undefined,visibility:IntersectionObserver|undefined;
  let disposePerson:(()=>void)|undefined;
  const scene=new THREE.Scene();scene.background=new THREE.Color("#172728");scene.fog=new THREE.FogExp2("#172728",.032);
  try{
   renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.domElement.setAttribute("aria-label","Interactive 3D engineer working in an electronics workshop");element.appendChild(renderer.domElement);
   scene.add(new THREE.HemisphereLight("#b6cfd2","#182422",1.0));const moon=new THREE.DirectionalLight("#739eb9",1.0);moon.position.set(-5,7,-2);scene.add(moon);
   const floor=loginMaterial("#273334",.95),wall=loginMaterial("#233338",.95),wood=loginMaterial("#80684d",.7),metal=loginMaterial("#485a5d",.4,.6),plastic=loginMaterial("#283b40",.8),cream=loginMaterial("#c7c4ac",.85);
   loginBox(scene,[30,.15,30],[0,-.12,0],floor);
   loginBox(scene,[16,7,.15],[0,3.3,-4.1],wall);loginBox(scene,[.15,7,15],[-5.7,3.3,2],wall);
   // Workshop shelves and real component drawers, with warm under-shelf strips.
   for(let row=0;row<2;row++){
    const y=3.5+row*1.15;loginBox(scene,[6,.12,.8],[1.3,y,-3.65],wood);
    for(let i=0;i<6;i++){loginBox(scene,[.72,.64,.55],[-1+i*.93,y+.4,-3.62],loginMaterial(i%3?"#53605b":"#69726b"));loginBox(scene,[.40,.12,.012],[-1+i*.93,y+.36,-3.332],cream,.01);loginBox(scene,[.18,.035,.05],[-1+i*.93,y+.2,-3.30],metal,.01);}
    const strip=new THREE.Mesh(new THREE.BoxGeometry(5.5,.025,.04),new THREE.MeshBasicMaterial({color:"#b4cab5"}));strip.position.set(1.3,y-.08,-3.3);scene.add(strip);
   }
   // Wall pegboard and hanging tools.
   loginBox(scene,[2.5,2.5,.06],[-3.7,2.65,-3.95],loginMaterial("#48514b"));
   const holes=new THREE.InstancedMesh(new THREE.CircleGeometry(.022,8),loginMaterial("#1b2928"),100),matrix=new THREE.Matrix4();for(let i=0;i<100;i++){matrix.makeTranslation(-4.77+(i%10)*.24,1.58+Math.floor(i/10)*.24,-3.91);holes.setMatrixAt(i,matrix);}scene.add(holes);
   for(let i=0;i<4;i++){const tool=loginBox(scene,[.08,.65,.08],[-4.45+i*.47,2.8,-3.85],metal,.025);tool.rotation.z=(i-1.5)*.12;loginBox(scene,[.15,.35,.12],[-4.45+i*.47,2.40,-3.82],loginMaterial(i%2?"#557b7e":"#9c7b59"));}
   // Wooden bench and supports.
   loginBox(scene,[6.1,.17,3.5],[0,1.6,.7],wood,.08);for(const x of [-2.6,2.6])for(const z of [-.7,2.1])loginBox(scene,[.12,1.5,.12],[x,.75,z],metal,.02);
   createWorkbenchDetails(scene);
   // Oscilloscope to the left; screen graphics are procedural and local.
   const scope=new THREE.Group();scope.position.set(-1.7,2.03,.75);scope.rotation.y=2.45;scene.add(scope);loginBox(scope,[1.25,.85,.65],[0,0,0],cream,.08);
   // Rear ventilation and carry handle remain readable from the viewer's side.
   for(let i=0;i<7;i++)loginBox(scope,[.055,.32,.008],[-.30+i*.09,.02,-.33],plastic,.008);
   loginBox(scope,[.65,.055,.07],[0,.49,0],metal,.02);
   const canvas=document.createElement("canvas");canvas.width=512;canvas.height=256;const ctx=canvas.getContext("2d")!,texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   const screen=new THREE.Mesh(new THREE.PlaneGeometry(.86,.58),new THREE.MeshBasicMaterial({map:texture}));screen.position.set(-.1,0,.34);scope.add(screen);for(let i=0;i<3;i++){const knob=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.06,16),metal);knob.rotation.x=Math.PI/2;knob.position.set(.5,.22-i*.2,.36);scope.add(knob);}
   const wireMaterial=new THREE.MeshStandardMaterial({color:"#334b4d",roughness:.75});for(const side of [-1,1]){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-1.6,1.78,.8),new THREE.Vector3(-1.2,1.73,1.65),new THREE.Vector3(side*.3,1.74,.5)]);scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve,30,.008,6,false),wireMaterial));}
   // Articulated task lamp aimed at the circuit board.
   loginBox(scene,[.6,.06,.45],[2.4,1.74,-.35],plastic,.1);
   const link=(a:THREE.Vector3,b:THREE.Vector3,r=.045)=>{const d=b.clone().sub(a),mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),16),metal);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());scene.add(mesh);};
   link(new THREE.Vector3(2.4,1.8,-.35),new THREE.Vector3(2.4,3.15,-.55));link(new THREE.Vector3(2.4,3.15,-.55),new THREE.Vector3(1.9,3.6,.1));
   const shade=new THREE.Mesh(new THREE.ConeGeometry(.48,.4,32,1,true),loginMaterial("#30464a",.45,.4));shade.position.set(1.9,3.5,.1);shade.rotation.z=-.25;scene.add(shade);
   const bulb=new THREE.Mesh(new THREE.SphereGeometry(.1,16,12),new THREE.MeshBasicMaterial({color:"#ffedc8"}));bulb.position.set(1.9,3.35,.1);scene.add(bulb);
   const lamp=new THREE.SpotLight("#ffe0ab",65,10,.65,.6,2);lamp.position.copy(bulb.position);lamp.target.position.set(0,1.7,.5);lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);lamp.shadow.bias=-.001;scene.add(lamp,lamp.target);
   const screenLight=new THREE.PointLight("#8ec6ce",2,3,2);screenLight.position.set(-1.3,2.2,.15);scene.add(screenLight);
   const faceFill=new THREE.PointLight("#dfc6a3",8,7,2);faceFill.position.set(0,3.6,2.0);scene.add(faceFill);
   const person=createWorkshopAvatar(()=>{element.dataset["avatarState"]="ready";},()=>{setFailed(true);});disposePerson=person.dispose;scene.add(person.group);
   // A tiny board pop, only during normal work; privacy interactions take priority.
   const count=30,positions=new Float32Array(count*3),velocities=new Float32Array(count*3),geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));const sparks=new THREE.Points(geometry,new THREE.PointsMaterial({color:"#ffd49b",size:.045,transparent:true,opacity:0,depthWrite:false}));scene.add(sparks);
   const flash=new THREE.PointLight("#ffd8a1",0,3);flash.position.set(.2,1.9,.5);scene.add(flash);
   const camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(6.8,5.2,10.2);const target=new THREE.Vector3(0,1.95,-.1);camera.lookAt(target);
   observer=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;renderer!.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});observer.observe(element);
   let inView=true;visibility=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??true;});visibility.observe(element);
   let last=performance.now(),time=0,lastWave=-1,burstAge=10,nextBurst=9;
   const animate=(now:number)=>{
    const delta=Math.max(0,Math.min((now-last)/1000,.05));last=now;
    if(inView&&!document.hidden){const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches||document.documentElement.dataset["workspaceMotion"]==="off",animated=!pauseRef.current&&!reduced;
     if(animated)time+=delta;const privateMode=moodRef.current.field==="password"||moodRef.current.reveal;
     const state=person.update(delta,time,privateMode,animated,Math.max(0,1-burstAge)*.3);if(element.dataset["privacyState"]!==state)element.dataset["privacyState"]=state;
     if(animated&&!privateMode&&time>nextBurst){nextBurst=time+18;burstAge=0;for(let i=0;i<count;i++){positions.set([.2,1.85,.5],i*3);velocities.set([(Math.random()-.5)*1.5,.5+Math.random()*1.8,(Math.random()-.5)*1.5],i*3);}}
     if(animated){burstAge+=delta;for(let i=0;i<count;i++){positions[i*3]!+=velocities[i*3]!*delta;positions[i*3+1]!+=velocities[i*3+1]!*delta;positions[i*3+2]!+=velocities[i*3+2]!*delta;velocities[i*3+1]!-=3*delta;}geometry.attributes["position"]!.needsUpdate=true;}
     (sparks.material as THREE.PointsMaterial).opacity=privateMode?0:Math.max(0,1-burstAge*1.6);flash.intensity=privateMode?0:Math.max(0,12-burstAge*65);
     const wave=Math.floor(time*10);if(wave!==lastWave){lastWave=wave;ctx.fillStyle="#132c31";ctx.fillRect(0,0,512,256);ctx.strokeStyle="#3b5b56";ctx.lineWidth=1;for(let x=0;x<512;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}for(let y=0;y<256;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();}ctx.strokeStyle="#c3d5a3";ctx.lineWidth=3;ctx.beginPath();for(let x=0;x<512;x+=3){const y=128+Math.sin(x*.035-time*2)*45;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();texture.needsUpdate=true;}
     renderer!.render(scene,camera);
    }frame=requestAnimationFrame(animate);
   };frame=requestAnimationFrame(animate);
  }catch{setFailed(true);}
  return()=>{disposePerson?.();cancelAnimationFrame(frame);observer?.disconnect();visibility?.disconnect();const materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});materials.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)textures.add(v);});m.dispose();});textures.forEach(t=>t.dispose());renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();};
 },[]);
 return <div className="login-interactive-workshop" ref={host}>{failed&&<img src={fallback} alt="Electronics workshop" className="login-workshop-fallback"/>}<button type="button" className="login-workshop-pause" aria-label={paused?"Resume workshop animation":"Pause workshop animation"} aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={13}/>:<Pause size={13}/>}</button></div>;
}
