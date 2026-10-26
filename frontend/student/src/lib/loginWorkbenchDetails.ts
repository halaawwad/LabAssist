import * as THREE from "three";
import {loginBox,loginMaterial} from "./loginWorkshopHuman";

/** Bench dimensions share the character's scale: a palm is 0.19 units wide. */
export function createWorkbenchDetails(scene:THREE.Scene){
 const steel=loginMaterial("#b1b8b5",.3,.8),rubber=loginMaterial("#27363b"),copper=loginMaterial("#bc8955",.4,.65),pcb=loginMaterial("#255b4d"),black=loginMaterial("#222c30");
 const wire=(parent:THREE.Object3D,points:number[][],color:string,r=.009)=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number])));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,28,r,6,false),loginMaterial(color));parent.add(mesh);return mesh;};
 const cylinder=(parent:THREE.Object3D,r:number,h:number,x:number,y:number,z:number,mat:THREE.Material)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20),mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
 // A repairable power/audio board, not a development board. All parts sit on the PCB.
 const circuit=new THREE.Group();circuit.position.set(.05,1.706,.38);circuit.rotation.y=-.12;scene.add(circuit);
 loginBox(circuit,[.64,.025,.48],[0,0,0],pcb,.015);
 for(let i=0;i<8;i++){
  const x=-.27+i*.075;loginBox(circuit,[.009,.002,.32],[x,.014,0],copper,.001);
  for(const z of [-.19,.19])cylinder(circuit,.009,.004,x,.017,z,steel);
 }
 loginBox(circuit,[.15,.055,.12],[-.1,.043,0],black,.007);
 for(let i=0;i<5;i++)for(const side of [-1,1])loginBox(circuit,[.012,.009,.035],[-.155+i*.027,.024,side*.079],steel,.002);
 for(let i=0;i<3;i++){cylinder(circuit,.027,.075,.17,.05,-.12+i*.12,loginMaterial("#344957"));cylinder(circuit,.023,.003,.17,.089,-.12+i*.12,steel);}
 for(let i=0;i<4;i++){const x=-.23+i*.10;loginBox(circuit,[.055,.025,.023],[x,.03,.14],loginMaterial("#c5af85"),.008);for(const s of [-1,1])loginBox(circuit,[.024,.008,.008],[x+s*.036,.022,.14],steel,.002);}
 loginBox(circuit,[.12,.055,.07],[.23,.043,.18],loginMaterial("#61907c"),.008);
 cylinder(circuit,.012,.025,-.23,.035,-.13,new THREE.MeshStandardMaterial({color:"#8dc9a1",emissive:"#5cab76",emissiveIntensity:.9}));
 wire(circuit,[[.25,.03,.18],[.37,.055,.25],[.45,-.005,.4],[.72,-.01,.52]],"#a65249");
 // Cutting mat and scattered schematic pages with real drawn circuit marks.
 loginBox(scene,[1.6,.012,1.1],[.02,1.692,.48],loginMaterial("#365453"),.025);
 for(let i=0;i<3;i++){
  const paper=new THREE.Group();paper.position.set(-.95+i*.27,1.703+i*.004,1.22+i*.12);paper.rotation.y=-.25+i*.21;scene.add(paper);
  loginBox(paper,[.66,.003,.87],[0,0,0],loginMaterial("#ded7bf"),.002);
  for(let j=0;j<6;j++)loginBox(paper,[.25+(j%3)*.08,.001,.005],[-.08,.003,-.31+j*.045],loginMaterial("#69797a"),.001);
  for(let j=0;j<3;j++){loginBox(paper,[.08,.002,.055],[-.2+j*.19,.004,.12],loginMaterial("#83908c"),.002);loginBox(paper,[.12,.002,.003],[-.1+j*.17,.004,.12],loginMaterial("#546b6f"),.001);}
 }
 // Solder station, iron in its spring cradle, solder reel and sponge tray.
 loginBox(scene,[.48,.22,.38],[1.68,1.81,-.36],rubber,.035);
 loginBox(scene,[.18,.065,.006],[1.61,1.84,-.165],new THREE.MeshStandardMaterial({color:"#98bcb3",emissive:"#639b8d",emissiveIntensity:.5}),.008);
 const knob=cylinder(scene,.04,.025,1.83,1.84,-.16,steel);knob.rotation.x=Math.PI/2;
 loginBox(scene,[.32,.025,.42],[1.22,1.706,.52],rubber,.02);
 loginBox(scene,[.22,.018,.16],[1.22,1.729,.64],loginMaterial("#b8a56c"),.01);
 const iron=new THREE.Group();iron.position.set(1.22,1.84,.36);iron.rotation.x=.85;scene.add(iron);cylinder(iron,.035,.23,0,0,0,loginMaterial("#4e757e"));cylinder(iron,.014,.18,0,.2,0,steel);
 for(let j=0;j<7;j++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.065,.008,6,20),steel);ring.rotation.x=Math.PI/2;ring.position.set(1.22,1.77+j*.015,.37-j*.014);scene.add(ring);}
 wire(scene,[[1.22,1.79,.28],[1.5,1.71,.1],[1.95,1.71,.12],[1.84,1.77,-.3]],"#202d31",.012);
 cylinder(scene,.105,.10,.95,1.75,1.35,steel);cylinder(scene,.12,.012,.95,1.81,1.35,rubber);cylinder(scene,.035,.014,.95,1.823,1.35,creamMaterial());
 wire(scene,[[1,1.71,1.4],[1.2,1.704,1.5],[1.4,1.704,1.38],[1.6,1.704,1.5]],"#b8bfbb",.004);
 // Pliers, screwdriver, parts tray, clipped leads and loose jumper wire loops.
 const pliers=new THREE.Group();pliers.position.set(.2,1.72,1.65);pliers.rotation.y=.4;scene.add(pliers);
 for(const s of [-1,1]){const h=loginBox(pliers,[.055,.04,.24],[s*.055,0,0],loginMaterial("#9b6854"),.02);h.rotation.y=s*.24;const jaw=loginBox(pliers,[.035,.025,.14],[s*.025,0,-.17],steel,.005);jaw.rotation.y=-s*.2;}
 const driver=new THREE.Group();driver.position.set(1.7,1.73,1.08);driver.rotation.z=Math.PI/2;driver.rotation.y=.4;scene.add(driver);cylinder(driver,.04,.18,0,0,0,loginMaterial("#67818d"));cylinder(driver,.012,.25,0,.21,0,steel);
 loginBox(scene,[.45,.035,.35],[2.12,1.71,1.65],rubber,.025);
 for(let i=0;i<9;i++){loginBox(scene,[.045,.025,.025],[1.97+(i%3)*.12,1.744,1.54+Math.floor(i/3)*.10],i%2?copper:black,.005);}
 for(let i=0;i<3;i++)wire(scene,[[-1.3+i*.12,1.71,-.3],[-1.15+i*.12,1.72,-.05],[-.8+i*.12,1.71,-.1],[-.7+i*.12,1.71,-.3]],["#b46c5d","#6e91a1","#c3b68b"][i]!);
 for(let i=0;i<6;i++)loginBox(scene,[.065,.003,.006],[.48+i*.065,1.704,.95+(i%3)*.055],steel,.001);
}
function creamMaterial(){return loginMaterial("#ded7bf");}
