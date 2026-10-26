import * as THREE from "three";
function texture(kind:'fire'|'smoke'|'soot'){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=kind==='fire'?512:256;const c=canvas.getContext('2d')!;
 if(kind==='fire'){
  const gradient=c.createLinearGradient(0,512,0,0);gradient.addColorStop(0,'#fff4b0');gradient.addColorStop(.23,'#ffd754');gradient.addColorStop(.55,'#ff851c');gradient.addColorStop(.82,'#ed3d0c');gradient.addColorStop(1,'#c8280800');c.fillStyle=gradient;
  c.beginPath();c.moveTo(127,510);c.bezierCurveTo(10,470,9,360,66,284);c.bezierCurveTo(26,367,120,308,119,196);c.bezierCurveTo(92,139,161,99,144,12);c.bezierCurveTo(243,141,143,235,202,258);c.bezierCurveTo(218,214,233,214,226,173);c.bezierCurveTo(293,349,244,485,127,510);c.fill();
 }else{
  const g=c.createRadialGradient(128,128,5,128,128,126);g.addColorStop(0,kind==='soot'?'rgba(15,18,16,.9)':'rgba(20,22,21,.8)');g.addColorStop(.4,'rgba(26,28,26,.65)');g.addColorStop(.72,'rgba(41,43,39,.25)');g.addColorStop(1,'rgba(30,32,28,0)');c.fillStyle=g;c.fillRect(0,0,256,256);
 }
 const result=new THREE.CanvasTexture(canvas);result.colorSpace=THREE.SRGBColorSpace;return result;
}
/** Reusable visual failure burst. It never changes the circuit's simulation or input state. */
export function createLoginFailureFX(world:THREE.Group){
 const group=new THREE.Group();world.add(group);const origin=new THREE.Vector3(.35,.72,1.1),fireTexture=texture('fire'),smokeTexture=texture('smoke');
 const flames=Array.from({length:9},(_,i)=>{const material=new THREE.MeshBasicMaterial({map:fireTexture,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.renderOrder=8;group.add(mesh);return {mesh,seed:i*.83};});
 const smoke=Array.from({length:15},(_,i)=>{const material=new THREE.MeshBasicMaterial({map:smokeTexture,transparent:true,opacity:0,depthWrite:false,toneMapped:false});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.renderOrder=9;group.add(mesh);return {mesh,seed:i*.73};});
 const sparks=Array.from({length:48},()=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(.022,6,4),new THREE.MeshBasicMaterial({color:'#ffce62',toneMapped:false}));group.add(mesh);return {mesh,velocity:new THREE.Vector3(),position:new THREE.Vector3()};});
 const debris=Array.from({length:10},()=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(.08,.04,.1),new THREE.MeshStandardMaterial({color:'#333b34',roughness:.9}));group.add(mesh);return {mesh,velocity:new THREE.Vector3()};});
 const soot=new THREE.Mesh(new THREE.PlaneGeometry(2.7,1.7),new THREE.MeshBasicMaterial({map:texture('soot'),transparent:true,opacity:0,depthWrite:false}));soot.rotation.x=-Math.PI/2;soot.position.set(.35,.425,1.1);soot.renderOrder=4;group.add(soot);
 const shock=new THREE.Mesh(new THREE.TorusGeometry(1,.018,6,64),new THREE.MeshBasicMaterial({color:'#ffad57',transparent:true,opacity:0,depthWrite:false,toneMapped:false}));shock.rotation.x=-Math.PI/2;shock.position.copy(origin);group.add(shock);
 const light=new THREE.PointLight('#ff8c32',0,7,2);light.position.copy(origin).add(new THREE.Vector3(0,.8,0));group.add(light);
 group.visible=false;let age=100;const parentQuaternion=new THREE.Quaternion(),billboard=new THREE.Quaternion();
 const reset=()=>{age=100;group.visible=false;light.intensity=0;};
 return {trigger(){age=0;group.visible=true;sparks.forEach(({velocity})=>{const angle=Math.random()*Math.PI*2,speed=1.3+Math.random()*3.3;velocity.set(Math.cos(angle)*speed,1.7+Math.random()*4,Math.sin(angle)*speed);});debris.forEach(({velocity})=>velocity.set((Math.random()-.5)*3,1.5+Math.random()*2.5,(Math.random()-.5)*2));},reset,
 update(delta:number,camera:THREE.Camera,staticMode:boolean){
  if(age>=6.5)return {active:false,kick:0,age:6.5};age+=delta;const fade=1-THREE.MathUtils.smoothstep(age,3.1,5.0),smokeFade=1-THREE.MathUtils.smoothstep(age,4.5,6.5);group.visible=true;
  world.getWorldQuaternion(parentQuaternion);camera.getWorldQuaternion(billboard);billboard.premultiply(parentQuaternion.invert());
  flames.forEach(({mesh,seed},i)=>{const flicker=1+Math.sin(age*17+seed)*.16;const h=(1.3+(i%3)*.55)*flicker;mesh.position.copy(origin).add(new THREE.Vector3(Math.sin(seed)*.65,h*.47-.05,Math.cos(seed)*.38));mesh.scale.set((.65+(i%3)*.14)*fade,h*fade,1);mesh.quaternion.copy(billboard);(mesh.material as THREE.MeshBasicMaterial).opacity=staticMode?0:fade*(.65+Math.sin(age*11+seed)*.12);});
  smoke.forEach(({mesh,seed},i)=>{const t=Math.max(0,age-i*.12),size=.7+t*.48;mesh.position.copy(origin).add(new THREE.Vector3(Math.sin(seed+t*.8)*(.25+t*.12),.3+t*.9,Math.cos(seed)*.38));mesh.scale.setScalar(size);mesh.quaternion.copy(billboard);(mesh.material as THREE.MeshBasicMaterial).opacity=staticMode?0:Math.min(1,t*3)*smokeFade*.68;});
  sparks.forEach(({mesh,velocity,position},i)=>{const t=Math.max(0,age-(i%5)*.045);mesh.visible=!staticMode&&t<1.6;position.copy(origin).addScaledVector(velocity,t);position.y-=3.4*t*t;mesh.position.copy(position);mesh.scale.set(1,2.5,1);(mesh.material as THREE.MeshBasicMaterial).color.set(t<.5?'#ffe3a0':'#f17b30');if(position.y<.3)mesh.visible=false;});
  debris.forEach(({mesh,velocity},i)=>{mesh.visible=!staticMode&&age<2.2;mesh.position.copy(origin).addScaledVector(velocity,age);mesh.position.y=Math.max(.46,mesh.position.y-3.4*age*age);mesh.rotation.set(age*(i+1),age*2,age);});
  (soot.material as THREE.MeshBasicMaterial).opacity=THREE.MathUtils.smoothstep(age,0,.35)*smokeFade*.8;
  shock.visible=!staticMode&&age<.5;shock.scale.setScalar(.2+age*6);(shock.material as THREE.MeshBasicMaterial).opacity=Math.max(0,.6-age*1.2);
  light.intensity=staticMode?0:(age<.18?15*(1-age/.18):fade*(3.5+Math.sin(age*21)*.8));
  const elapsed=age;if(age>=6.5)reset();return {active:elapsed<6.5,kick:staticMode?0:Math.exp(-elapsed*2.5),age:elapsed};
 }};
}
