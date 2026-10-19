import {useEffect,useRef,useState} from "react";
import * as THREE from "three";
import {RoundedBoxGeometry} from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {RoomEnvironment} from "three/examples/jsm/environments/RoomEnvironment.js";
import {Lightbulb,Radio,RotateCw,Pause,Play} from "lucide-react";
import {buildLoginPart} from "@/lib/loginPartModels";

export type LoginMood={field:"email"|"password"|null;reveal:boolean;phase:"ready"|"connecting"|"welcome"};
const modes=[{id:"light",label:"Light it up",part:"led-green",color:"#86ad77",Icon:Lightbulb},{id:"motion",label:"Make it move",part:"sg90",color:"#729bb9",Icon:RotateCw},{id:"sense",label:"Sense something",part:"hc-sr04",color:"#a48eba",Icon:Radio}] as const;
export function LoginScene({mood}:{mood:LoginMood}){
 const host=useRef<HTMLDivElement>(null),current=useRef(mood);current.current=mood;
 const [active,setActive]=useState(0),activeRef=useRef(active);activeRef.current=active;
 const [paused,setPaused]=useState(false),pausedRef=useRef(paused);pausedRef.current=paused;
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  let renderer:THREE.WebGLRenderer|undefined,environment:THREE.WebGLRenderTarget|undefined,observer:ResizeObserver|undefined,visibility:IntersectionObserver|undefined,frame=0;
  const scene=new THREE.Scene(),pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster();
  const pickable:THREE.Object3D[]=[];
  const mat=(color:string,metalness=.05,roughness=.5)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const box=(parent:THREE.Object3D,w:number,h:number,d:number,r:number,material:THREE.Material,x:number,y:number,z:number)=>{const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,4,r),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const ring=(parent:THREE.Object3D,r:number,tube:number,color:string,opacity=1)=>{const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,tube,8,96),new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1}));mesh.rotation.x=-Math.PI/2;parent.add(mesh);return mesh;};
  const camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(10,10,17);const look=new THREE.Vector3(0,1.9,0);camera.lookAt(look);
  const move=(event:PointerEvent)=>{const r=element.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width-.5,(event.clientY-r.top)/r.height-.5);};
  const leave=()=>pointer.set(0,0);
  const click=(event:MouseEvent)=>{if((event.target as HTMLElement).closest('button'))return;const rect=element.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);const hit=raycaster.intersectObjects(pickable,true)[0];if(hit){let object:THREE.Object3D|null=hit.object;while(object&&object.userData['mode']===undefined)object=object.parent;if(object)setActive(object.userData['mode'] as number);}};
  try{
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.domElement.setAttribute('aria-label','An interactive floating electronics workbench with a friendly robot');element.appendChild(renderer.domElement);
   const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.7;room.dispose();pmrem.dispose();
   scene.add(new THREE.HemisphereLight('#ffffff','#94aaa6',2.5));
   const sun=new THREE.DirectionalLight('#fff4df',3.5);sun.position.set(-5,12,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8});sun.shadow.bias=-.0005;scene.add(sun);
   const fill=new THREE.DirectionalLight('#c2ddee',2);fill.position.set(6,5,-4);scene.add(fill);
   const world=new THREE.Group();world.rotation.y=-.16;scene.add(world);
   // A suspended circuit island, with a central processor and three satellite stations.
   const base=new THREE.Mesh(new THREE.CylinderGeometry(4.3,4.1,.22,96),mat('#d8e5dd',.25));base.position.y=-.5;base.receiveShadow=true;world.add(base);
   const rim=ring(world,4.22,.025,'#8baaa1',.65);rim.position.y=-.37;
   const inner=ring(world,2.35,.012,'#6f9995',.35);inner.position.y=-.36;
   box(world,2.65,.28,2.3,.16,mat('#3b5b60',.45),0,.12,0);
   box(world,2.35,.04,2,.12,mat('#4d7075',.35),0,.28,0);
   const gold=mat('#c9b58a',.75,.3);
   for(const side of [-1,1])for(let i=0;i<8;i++){
    box(world,.29,.08,.085,.025,gold,side*1.44,.09,-.85+i*.24);
    box(world,.085,.08,.27,.025,gold,-.91+i*.26,.09,side*1.27);
   }
   const coreRing=ring(world,1.02,.019,'#a1d2b8',.8);coreRing.position.y=.34;
   const stations=modes.map((mode,i)=>{
    const station=new THREE.Group();station.userData['mode']=i;world.add(station);pickable.push(station);
    const plate=box(station,2,.13,1.85,.24,mat(i===0?'#edf2df':i===1?'#e3edf3':'#ede8f3',.15),0,0,0);
    plate.receiveShadow=true;
    const glow=ring(station,.83,.025,mode.color,.75);glow.position.y=.075;
    const model=buildLoginPart(mode.part);model.scale.setScalar(i===0?1.35:i===1?1.05:.77);model.position.set(0,.1,0);model.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=o.receiveShadow=true;});station.add(model);
    const light=new THREE.PointLight(mode.color,0,3,2);light.position.set(0,.7,0);station.add(light);
    return {station,model,light,glow};
   });
   const locations=[new THREE.Vector3(-2.9,.85,.75),new THREE.Vector3(2.75,1.25,-.55),new THREE.Vector3(.4,.45,3.05)];
   const traces=locations.map((location,i)=>{
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(location.x*.95,-.34,location.z*.95),new THREE.Vector3(location.x*.65,-.34,location.z*.65),new THREE.Vector3(location.x*.35,-.34,location.z*.35)]);
    world.add(new THREE.Mesh(new THREE.TubeGeometry(curve,24,.018,6,false),mat(modes[i]!.color,.4)));
    const photon=new THREE.Mesh(new THREE.SphereGeometry(.06,12,8),new THREE.MeshBasicMaterial({color:modes[i]!.color}));world.add(photon);return {curve,photon};
   });
   // The floating robot is the hero, with softer shell, cheek lights and articulated hands.
   const robot=new THREE.Group();robot.position.set(0,2.85,0);robot.scale.setScalar(1.4);world.add(robot);
   const shell=mat('#d7e8e5',.3,.32),dark=mat('#284a54',.25,.3),trim=mat('#fafbf3',.2,.35);
   box(robot,1.65,1.55,.75,.27,shell,0,0,0);box(robot,1.38,1.06,.12,.2,dark,0,.04,.42);
   const eyeMaterial=new THREE.MeshBasicMaterial({color:'#bbebc9'});
   const eyes=[-.32,.32].map(x=>box(robot,.13,.26,.05,.055,eyeMaterial,x,.14,.51));
   const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.17,-.14,.51),new THREE.Vector3(0,-.22,.52),new THREE.Vector3(.17,-.14,.51)]);robot.add(new THREE.Mesh(new THREE.TubeGeometry(smile,20,.023,8,false),eyeMaterial));
   for(const side of [-1,1]){
    box(robot,.13,.045,.015,.02,mat('#8bbbad'),side*.48,-.10,.51);
    for(let i=0;i<4;i++)box(robot,.16,.07,.13,.02,trim,side*.88,-.45+i*.28,0);
    box(robot,.30,.17,.4,.07,dark,side*.43,-.87,.04);
   }
   box(robot,.065,.25,.065,.025,trim,0,.90,0);
   const antenna=new THREE.Mesh(new THREE.SphereGeometry(.10,20,16),eyeMaterial);antenna.position.set(0,1.08,0);robot.add(antenna);
   const hands=[-1,1].map(side=>{const hand=new THREE.Group();box(hand,.38,.46,.22,.13,shell,0,0,0);for(let i=0;i<3;i++)box(hand,.018,.16,.018,.008,trim,-.09+i*.09,.08,.13);robot.add(hand);return hand;});
   const orbit=new THREE.Group();orbit.position.y=2.65;orbit.rotation.set(.3,0,.35);world.add(orbit);
   const orbitPath=ring(orbit,2.55,.012,'#719e9c',.3);orbitPath.rotation.x=Math.PI/2;
   const orbitDot=new THREE.Mesh(new THREE.SphereGeometry(.065,16,12),eyeMaterial);orbit.add(orbitDot);
   const waves=[0,1,2].map(()=>{const wave=ring(world,.4,.012,'#9b86b6',.3);wave.position.set(.4,.58,3.05);return wave;});
   let inView=true;visibility=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??true;});visibility.observe(element);
   observer=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;renderer!.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});observer.observe(element);
   element.addEventListener('pointermove',move);element.addEventListener('pointerleave',leave);element.addEventListener('click',click);
   let last=performance.now(),time=0,closed=0;const accent=new THREE.Color();
   const animate=(now:number)=>{
    const delta=Math.max(0,Math.min((now-last)/1000,.05));last=now;
    if(inView&&!document.hidden){
     const still=pausedRef.current||matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset['workspaceMotion']==='off';if(!still)time+=delta;
     const state=current.current,cover=state.field==='password'||state.reveal,index=activeRef.current;
     closed=still?(cover?1:0):THREE.MathUtils.damp(closed,cover?1:0,8,delta);element.dataset['privacyState']=cover?'covered':'open';element.dataset['activePart']=modes[index]!.id;
     accent.set(modes[index]!.color);eyeMaterial.color.lerp(accent.clone().lerp(new THREE.Color('#ffffff'),.5),still?1:.07);
     robot.position.y=2.85+(still?0:Math.sin(time*1.3)*.11);robot.rotation.y=THREE.MathUtils.damp(robot.rotation.y,cover?0:(index-1)*.14+pointer.x*.25,4,delta);robot.rotation.z=still?0:Math.sin(time*.8)*.025;
     const blink=still?1:Math.sin(time*1.1)>.995?.1:1;eyes.forEach(eye=>eye.scale.y=blink);
     hands.forEach((hand,i)=>{const side=i===0?-1:1;hand.position.set(side*THREE.MathUtils.lerp(1.04,.34,closed),THREE.MathUtils.lerp(-.25,.15,closed),THREE.MathUtils.lerp(.1,.7,closed));hand.rotation.z=side*THREE.MathUtils.lerp(-.22,.12,closed);if(state.phase==='welcome'&&i===1&&!cover&&!still){hand.position.y=.65;hand.rotation.z=Math.sin(time*6)*.3-.5;}});
     stations.forEach(({station,model,light,glow},i)=>{
      const selected=index===i;station.position.copy(locations[i]!);station.position.y+=(still?0:Math.sin(time*1.1+i*2)*.10);station.position.y+=selected?.25:0;station.rotation.y=THREE.MathUtils.damp(station.rotation.y,selected?.1:-.08,3,delta);light.intensity=selected?1.4:0;
      (glow.material as THREE.MeshBasicMaterial).opacity=selected?.85:.25;
      if(i===1){const horn=model.getObjectByName('demo-servo-horn');if(horn)horn.rotation.y=still?0:Math.sin(time*(selected?2:.6))*.7;}
     });
     traces.forEach(({curve,photon},i)=>{photon.position.copy(curve.getPointAt((time*(state.phase==='connecting'?.7:.2)+i*.3)%1));photon.scale.setScalar(index===i?1.3:.65);});
     orbitDot.position.set(Math.cos(time*.6)*2.55,Math.sin(time*.6)*2.55,0);
     waves.forEach((wave,i)=>{const cycle=(time*.6+i/3)%1;wave.scale.setScalar(1+cycle*2);(wave.material as THREE.MeshBasicMaterial).opacity=index===2&&!still?(1-cycle)*.4:0;});
     camera.position.x=THREE.MathUtils.damp(camera.position.x,10+(still?0:pointer.x*.6),3,delta);camera.lookAt(look);renderer!.render(scene,camera);
    }frame=requestAnimationFrame(animate);
   };frame=requestAnimationFrame(animate);
  }catch{setFailed(true);}
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();visibility?.disconnect();element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);element.removeEventListener('click',click);const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();scene.traverse(o=>{if(o instanceof THREE.Mesh){geometry.add(o.geometry);for(const material of Array.isArray(o.material)?o.material:[o.material])materials.add(material);}});geometry.forEach(g=>g.dispose());materials.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)textures.add(v);});m.dispose();});textures.forEach(t=>t.dispose());environment?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();};
 },[]);
 const cover=mood.field==='password'||mood.reveal;
 return <div className={`login-three-scene login-orbit-scene ${failed?'login-scene-fallback':''}`} ref={host}>
  <span className="login-orbit-watermark" aria-hidden="true">MAKE.</span>
  <div className="login-scene-note" aria-live="polite"><i/>{cover?"No peeking. Promise.":mood.phase==='welcome'?"Let's make it happen.":mood.phase==='connecting'?"Connecting the dots�":"A little curiosity starts it all."}</div>
  <div className="login-part-switcher" role="group" aria-label="Try a component">{modes.map(({id,label,Icon},i)=><button type="button" key={id} aria-pressed={active===i} className={active===i?'is-active':''} onClick={()=>setActive(i)}><Icon size={15}/><span>{label}</span></button>)}</div>
  <button type="button" className="login-scene-motion" aria-label={paused?'Resume scene animation':'Pause scene animation'} aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={13}/>:<Pause size={13}/>}</button>
  {failed&&<div className="login-scene-fallback-art" aria-hidden="true"><span>HM</span></div>}
 </div>;
}
