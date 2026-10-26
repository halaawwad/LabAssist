import {useEffect,useRef,useState} from "react";
import * as THREE from "three";
import {RoomEnvironment} from "three/examples/jsm/environments/RoomEnvironment.js";
import {Pause,Play,Hand,Sun} from "lucide-react";
import {createLoginFailureFX} from "@/lib/loginFailureFX";
import {createLightRobot} from "@/lib/loginLightRobot";
import {createSmartLightBench} from "@/lib/loginSmartLightBench";
import {LIGHT_DEMO_DURATION,lightDemoStage,simulateSmartLight,smoothRange} from "@/lib/loginDemo";
export type LoginMood={field:"email"|"password"|null;reveal:boolean;phase:"ready"|"connecting"|"welcome";sequenceStartedAt?:number;failureId?:number};
type Reading={light:number;ledOn:boolean;connected:boolean;stage:string;elapsed:number;complete:boolean;welcomed:boolean};
const initialReading:Reading={light:85,ledOn:false,connected:false,stage:'ready',elapsed:0,complete:false,welcomed:false};
export function LoginScene({mood,onComplete}:{mood:LoginMood;onComplete?:()=>void}){
 const host=useRef<HTMLDivElement>(null),moodRef=useRef(mood);moodRef.current=mood;
 const completeRef=useRef(onComplete);completeRef.current=onComplete;
 const [exploding,setExploding]=useState(false);
 const [paused,setPaused]=useState(false),pauseRef=useRef(paused);pauseRef.current=paused;
 const [manualCovered,setManualCovered]=useState(false),manualRef=useRef(manualCovered);manualRef.current=manualCovered;
 const [reading,setReading]=useState<Reading>(initialReading),[failed,setFailed]=useState(false),[sceneReady,setSceneReady]=useState(false);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  const scene=new THREE.Scene(),pointer=new THREE.Vector2();
  let renderer:THREE.WebGLRenderer|undefined,environment:THREE.WebGLRenderTarget|undefined,resize:ResizeObserver|undefined,visibility:IntersectionObserver|undefined,frame=0;

  const camera=new THREE.PerspectiveCamera(37,1,.1,100),look=new THREE.Vector3(0,1.2,.25);camera.position.set(9,8.3,14);camera.lookAt(look);
  const move=(event:PointerEvent)=>{const r=element.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width-.5,(event.clientY-r.top)/r.height-.5);};
  const leave=()=>pointer.set(0,0);
  let toggleSensor=()=>{};
  const click=(event:MouseEvent)=>{if((event.target as HTMLElement).closest('button'))return;toggleSensor();};
  try{
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.domElement.setAttribute('aria-label','Robot beside a smart-light breadboard with an LDR, resistors, transistor, battery and automatically assembled wires');element.appendChild(renderer.domElement);
   const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
   scene.add(new THREE.HemisphereLight('#fff9ec','#9bb9ae',1.65));const sun=new THREE.DirectionalLight('#fff0d6',2.6);sun.position.set(-5,12,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7});sun.shadow.bias=-.0006;scene.add(sun);const fill=new THREE.DirectionalLight('#c3dee6',1.2);fill.position.set(5,5,-4);scene.add(fill);
   const world=new THREE.Group();world.rotation.y=-.15;scene.add(world);const bench=createSmartLightBench(world),robot=createLightRobot(world),failureFX=createLoginFailureFX(world);
   const idleRobot=new THREE.Vector3(-.2,2.65,-1.4),workingRobot=new THREE.Vector3(-1.3,2.2,-.7),shadePoint=bench.sensorPoint.clone().add(new THREE.Vector3(0,.16,0));
   const raycaster=new THREE.Raycaster();let complete=false;
   toggleSensor=()=>{if(!complete)return;raycaster.setFromCamera(new THREE.Vector2(pointer.x*2,-pointer.y*2),camera);if(raycaster.intersectObject(bench.ldr,true).length)setManualCovered(value=>!value);};
   resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;renderer!.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});resize.observe(element);
   let visible=true;visibility=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;});visibility.observe(element);
   element.addEventListener('pointermove',move);element.addEventListener('pointerleave',leave);element.addEventListener('click',click);
   let lastFailure=0,wasExploding=false,firstFrame=true,last=performance.now(),decorativeTime=0,elapsed=0,started=false,light=85,manualBlend=0,lastReadingKey='',welcomed=false;
   const handWorld=(index:number,position:THREE.Vector3)=>{world.updateWorldMatrix(true,true);const p=position.clone();robot.group.localToWorld(p);return world.worldToLocal(p);};
   const animate=(now:number)=>{
    const delta=Math.max(0,Math.min((now-last)/1000,.08));last=now;
    if(visible&&!document.hidden){
     const state=moodRef.current,running=state.phase!=='ready',reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset['workspaceMotion']==='off',still=reduced||pauseRef.current;
     if(!running&&(state.failureId||0)>lastFailure){lastFailure=state.failureId||0;failureFX.trigger();}
     if(running)failureFX.reset();
     const blast=failureFX.update(delta,camera,reduced||pauseRef.current);
     if(blast.active!==wasExploding){wasExploding=blast.active;setExploding(blast.active);}
     element.dataset['failureEffect']=blast.active?'active':'idle';
     if(!pauseRef.current)decorativeTime+=delta;
     if(running&&!started){started=true;elapsed=0;}
     if(started&&!complete&&!pauseRef.current)elapsed=Math.min(LIGHT_DEMO_DURATION,elapsed+delta*(reduced?3:1));
     const approach=smoothRange(elapsed,1,2.4,reduced);robot.group.position.copy(idleRobot).lerp(workingRobot,approach);robot.group.position.y+=still||running?0:Math.sin(decorativeTime*1.2)*.055;
     const privacy=!running&&(state.field==='password'||state.reveal);
     const yaw=privacy?0:!running?(state.field==='email'?.35:pointer.x*.22):-.08;
     const fall=blast.active&&!still?THREE.MathUtils.smoothstep(blast.age,.08,.85)*(1-THREE.MathUtils.smoothstep(blast.age,3.8,5.7)):0;
     const scorch=blast.active?THREE.MathUtils.smoothstep(blast.age,.05,.35)*(1-THREE.MathUtils.smoothstep(blast.age,5.6,6.5)):0;
     robot.setScorch(scorch);
     robot.group.rotation.x=-Math.PI/2*fall;
     robot.group.rotation.y=(reduced?yaw:THREE.MathUtils.damp(robot.group.rotation.y,yaw,5,delta))*(1-fall);
     robot.group.rotation.z=blast.active&&!still?Math.sin(blast.age*18)*blast.kick*.12:0;
     robot.group.position.y=THREE.MathUtils.lerp(robot.group.position.y,.63,fall)+(blast.active&&!still?Math.sin(Math.min(1,blast.age/.85)*Math.PI)*.35:0);
     robot.group.position.z-=fall*.65;
     element.dataset['robotPose']=fall>.95?'fallen':fall>0?(blast.age<1?'falling':'recovering'):'upright';element.dataset['robotScorch']=scorch.toFixed(2);
     const blink=still?1:Math.sin(decorativeTime*1.1)>.995?.1:1;robot.eyes.forEach(eye=>eye.scale.y=blink);
     for(const [index,side] of [[0,-1],[1,1]] as const)robot.setLocalHand(index,new THREE.Vector3(side*(privacy?.33:1.02),privacy?.15:-.37,privacy?.69:.1),privacy);
     if(blast.active&&!still)for(const [index,side] of [[0,-1],[1,1]] as const)robot.setLocalHand(index,new THREE.Vector3(side*(.83+fall*.3),.48-fall*.7,.42-fall*.25));
     const leftIdle=handWorld(0,new THREE.Vector3(-1.02,-.37,.1)),rightIdle=handWorld(1,new THREE.Vector3(1.02,-.37,.1));
     const tip=bench.socket.clone();
     if(running&&elapsed<4.5&&!still){const pointing=rightIdle.clone().add(new THREE.Vector3(0,-.22,.28));robot.setHand(1,pointing);}
     if(complete)robot.setLocalHand(1,new THREE.Vector3(1.05,.48+(still?0:Math.sin(decorativeTime*5)*.12),.45),true);
     const scriptedCover=smoothRange(elapsed,5.4,7,reduced)*(1-smoothRange(elapsed,10,11.8,reduced));
     if(complete)manualBlend=reduced?(manualRef.current?1:0):THREE.MathUtils.damp(manualBlend,manualRef.current?1:0,5,delta);
     const shade=complete?manualBlend:scriptedCover;
     if(running)robot.setHand(0,leftIdle.clone().lerp(shadePoint,shade));
     // Read coverage from the actual palm position in bench coordinates.
     world.updateWorldMatrix(true,true);const palm=world.worldToLocal(robot.arms[0]!.hand.getWorldPosition(new THREE.Vector3()));
     const coverage=running?1-THREE.MathUtils.smoothstep(palm.distanceTo(shadePoint),.07,.65):0;
     const targetLight=85-70*coverage;light=reduced?targetLight:THREE.MathUtils.damp(light,targetLight,5,delta);
     const connected=elapsed>=4.5,circuit=simulateSmartLight(light,connected),pulse=smoothRange(elapsed,4.5,5.4,reduced);const assembly=bench.update(tip,circuit,pulse,smoothRange(elapsed,1.2,4.5,reduced));element.dataset["assembledWires"]=`${assembly.completedWires}/${assembly.totalWires}`;
     if(connected&&circuit.ledOn&&circuit.light<=17)welcomed=true;
     const stage=started?lightDemoStage(elapsed):'ready';
     element.dataset['privacyState']=privacy?'covered':'open';element.dataset['light']=String(circuit.light);element.dataset['ledState']=circuit.ledOn?'ON':'OFF';element.dataset['circuitStage']=stage;element.dataset['wireConnected']=String(connected);element.dataset['palmCoverage']=coverage.toFixed(3);
     const key=[circuit.light,circuit.ledOn,connected,stage,Math.floor(elapsed*4),complete,welcomed].join('|');if(key!==lastReadingKey){lastReadingKey=key;setReading({light:circuit.light,ledOn:circuit.ledOn,connected,stage,elapsed,complete,welcomed});}

     if(started&&elapsed>=LIGHT_DEMO_DURATION&&!complete){complete=true;completeRef.current?.();}
     const narrow=camera.aspect<.8,targetZ=running?(narrow?34:15):14,targetY=running?(narrow?14:8.3):8.3;
     camera.position.x=THREE.MathUtils.damp(camera.position.x,9+(!running&&!still?pointer.x*.4:0),4,delta);camera.position.z=THREE.MathUtils.damp(camera.position.z,targetZ,3,delta);camera.position.y=THREE.MathUtils.damp(camera.position.y,targetY,3,delta);camera.lookAt(look);renderer!.render(scene,camera);if(firstFrame){renderer!.getContext().finish();firstFrame=false;element.dataset['sceneReady']='true';setSceneReady(true);}
    }frame=requestAnimationFrame(animate);
   };frame=requestAnimationFrame(animate);
  }catch(error){console.error('Smart light scene could not initialize',error);setFailed(true);}
  return()=>{cancelAnimationFrame(frame);resize?.disconnect();visibility?.disconnect();element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);element.removeEventListener('click',click);const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const material of Array.isArray(o.material)?o.material:[o.material])materials.add(material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)textures.add(v);});m.dispose();});textures.forEach(t=>t.dispose());environment?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();};
 },[]);
 const running=mood.phase!=='ready';
 const action=reading.complete?(reading.ledOn?'Shade detected. The red LED is on.':'Light detected. The LED is off.'):reading.stage==='ready'?'A little circuit. A little curiosity.':reading.elapsed<3?'Assembling the circuit':reading.elapsed<4.5?'Connecting the wires':reading.elapsed<5.4?'Power reaches the circuit':reading.elapsed<10?'A little shade. A clear red light.':reading.elapsed<11.8?'Letting the light back in':'Bright again. The LED switches off.';
 return <div className={`login-three-scene login-orbit-scene login-light-scene ${sceneReady?'scene-is-ready':''} ${running?'login-circuit-running':''} ${failed?'login-scene-fallback':''}`} ref={host}>
  {!sceneReady&&!failed&&<div className="login-lab-loading" role="status"><i/>Preparing your little lab</div>}
  {!running&&<><span className="login-orbit-watermark" aria-hidden="true">LIGHT.</span><div className="login-circuit-label"><span>SMART LIGHT / 01</span><strong>A little light. A little logic.</strong><small>LDR + NPN + red LED / breadboard circuit</small></div><div className="login-light-ready"><i/>{exploding?"Oops. Let's try those details again.":mood.field==='password'||mood.reveal?'No peeking. Promise.':mood.field==='email'?"I'm listening, Noor.":'A little circuit waiting to come together.'}</div></>}
  <button type="button" className="login-scene-motion" aria-label={paused?'Resume scene animation':'Pause scene animation'} aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={13}/>:<Pause size={13}/>}</button>
  {running&&<div className={`login-circuit-overlay login-light-overlay ${reading.welcomed?'login-welcome-live':''}`}><header>{reading.welcomed&&<div className="login-welcome-signal" aria-hidden="true"><span/><span/><span/><Sun size={23}/></div>}<span>{reading.welcomed?'YOUR WORKSPACE IS READY':'A LITTLE CIRCUIT, COMING TO LIFE'}</span><h2 aria-label={reading.welcomed?'Welcome back, Noor':undefined}>{reading.welcomed?<><small>Welcome back,</small><b>Noor<span>.</span></b></>:"Let's make the connection."}</h2><p>{action}</p></header><footer><div className="login-light-readings" aria-live="polite"><div><Sun size={19}/><span>Light<strong>{reading.light}%</strong></span></div><div className={reading.ledOn?'light-led-on':''}><i/><span>LED<strong>{reading.ledOn?'ON':'OFF'}</strong></span></div><div><span>Circuit<strong>{reading.connected?'Connected':'Circuit open'}</strong></span></div></div>{reading.complete?<button className="login-shade-control" type="button" onClick={()=>setManualCovered(value=>!value)}>{manualCovered?<Sun size={16}/>:<Hand size={16}/>} {manualCovered?'Uncover LDR':'Cover LDR'}<small>Try the light sensor yourself</small></button>:<div className="login-light-progress" aria-label="Circuit demonstration progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(reading.elapsed/LIGHT_DEMO_DURATION*100)}><i style={{transform:`scaleX(${reading.elapsed/LIGHT_DEMO_DURATION})`}}/></div>}</footer></div>}
  {failed&&<div className="login-light-fallback" role="status"><strong>Smart light</strong><p>Light: {reading.light}% · LED: {reading.ledOn?'ON':'OFF'}</p><p>The 3D scene is unavailable in this browser.</p></div>}
 </div>;
}
