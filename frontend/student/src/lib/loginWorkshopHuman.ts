import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const loginMaterial=(color:string,roughness=.7,metalness=.05)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
export function loginBox(parent:THREE.Object3D,size:[number,number,number],position:[number,number,number],material:THREE.Material,radius=.04){
 const mesh=new THREE.Mesh(new RoundedBoxGeometry(...size,3,radius),material);mesh.position.set(...position);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function sphere(parent:THREE.Object3D,size:[number,number,number],position:[number,number,number],material:THREE.Material){
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material);mesh.scale.set(...size);mesh.position.set(...position);mesh.castShadow=true;parent.add(mesh);return mesh;
}
function rod(parent:THREE.Object3D,radius:number,material:THREE.Material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius*.9,1,16),material);mesh.castShadow=true;parent.add(mesh);return mesh;}
const axis=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
function between(mesh:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3){direction.subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=direction.length();mesh.quaternion.setFromUnitVectors(axis,direction.normalize());}

/** A seated, articulated game character. All geometry is local and original. */
export function createWorkshopHuman(){
 const group=new THREE.Group();group.position.z=-1.25;
 const skin=loginMaterial("#b98261",.78),skinLight=loginMaterial("#ca9979",.72),hair=loginMaterial("#29251f",.94),shirt=loginMaterial("#566777",.96),shirtDark=loginMaterial("#394b5c",.96),trousers=loginMaterial("#303d46",.85),shoe=loginMaterial("#232b2c",.8),seat=loginMaterial("#2b383c",.8),metal=loginMaterial("#879696",.3,.7);
 // Chair: the entire assembly rotates with its passenger.
 loginBox(group,[1.22,.18,1.17],[0,1.06,0],seat,.12);loginBox(group,[1.22,1.26,.18],[0,1.66,-.5],seat,.12);
 const post=rod(group,.085,metal);between(post,new THREE.Vector3(0,.2,0),new THREE.Vector3(0,1,0));
 for(let i=0;i<5;i++){const angle=i*Math.PI*2/5,leg=rod(group,.04,metal);between(leg,new THREE.Vector3(0,.25,0),new THREE.Vector3(Math.sin(angle)*.68,.16,Math.cos(angle)*.68));sphere(group,[.09,.09,.09],[Math.sin(angle)*.68,.1,Math.cos(angle)*.68],seat);}
 // Seated legs and shoes with natural knee bends.
 for(const side of [-1,1]){const thigh=rod(group,.18,trousers);between(thigh,new THREE.Vector3(side*.23,1.22,-.08),new THREE.Vector3(side*.3,1.08,.73));sphere(group,[.18,.18,.18],[side*.3,1.08,.73],trousers);const shin=rod(group,.145,trousers);between(shin,new THREE.Vector3(side*.3,1.07,.73),new THREE.Vector3(side*.32,.25,.78));loginBox(group,[.32,.22,.57],[side*.32,.18,.91],shoe,.08);}
 const torso=new THREE.Group();torso.position.set(0,1.35,0);torso.rotation.x=.1;group.add(torso);
 sphere(torso,[.40,.55,.24],[0,.45,.04],shirt);loginBox(torso,[.72,.32,.39],[0,.10,.01],shirt,.1);
 // Relaxed pullover hoodie: dropped hood, ribbed hem, kangaroo pocket and cords.

 const neckline=new THREE.Mesh(new THREE.TorusGeometry(.18,.045,10,28,Math.PI),shirtDark);neckline.position.set(0,.93,.13);neckline.rotation.x=.35;neckline.rotation.z=Math.PI;torso.add(neckline);
 loginBox(torso,[.70,.09,.39],[0,-.025,.018],shirtDark,.035);
 loginBox(torso,[.48,.22,.065],[0,.22,.282],shirt,.065);
 for(const side of [-1,1]){
  const opening=loginBox(torso,[.012,.13,.009],[side*.19,.24,.32],shirtDark,.004);opening.rotation.z=side*-.35;
  const cord=rod(torso,.009,loginMaterial("#c7c7b6"));between(cord,new THREE.Vector3(side*.11,.88,.25),new THREE.Vector3(side*.13,.60,.30));
 } const neck=rod(torso,.13,skin);between(neck,new THREE.Vector3(0,.85,0),new THREE.Vector3(0,1.09,0));
 const head=new THREE.Group();head.position.set(0,1.21,.04);torso.add(head);
 // Raised fabric hood surrounds a smaller, softly sculpted face.
 const hood=new THREE.Mesh(new THREE.SphereGeometry(1,40,28,Math.PI*.77,Math.PI*1.46),shirt);
 hood.scale.set(.335,.43,.315);hood.position.set(0,.115,-.035);hood.castShadow=true;head.add(hood);
 const lining=new THREE.Mesh(new THREE.SphereGeometry(1,40,28,Math.PI*.77,Math.PI*1.46),new THREE.MeshStandardMaterial({color:"#263849",roughness:1,side:THREE.BackSide}));
 lining.scale.set(.315,.41,.295);lining.position.copy(hood.position);head.add(lining);
 // Cloth opening follows the face instead of a helmet-like solid shell.
 const opening=new THREE.EllipseCurve(0,0,.284,.368,0,Math.PI*2,false,0);
 const seamCurve=new THREE.CatmullRomCurve3(opening.getPoints(64).map(p=>new THREE.Vector3(p.x,p.y+.115,.145)),true);
 const seam=new THREE.Mesh(new THREE.TubeGeometry(seamCurve,64,.018,8,true),shirtDark);head.add(seam);
 sphere(head,[.235,.305,.218],[0,.075,.015],skinLight);
 sphere(head,[.19,.135,.175],[0,-.075,.036],skinLight);
 sphere(head,[.027,.055,.034],[0,.055,.222],skinLight);
 for(const side of [-1,1]){
  const eye=loginBox(head,[.053,.009,.008],[side*.09,.125,.219],hair,.004);eye.rotation.z=side*.05;
  const brow=loginBox(head,[.075,.012,.009],[side*.09,.175,.218],hair,.004);brow.rotation.z=side*-.08;
 }
 loginBox(head,[.065,.006,.006],[0,-.073,.208],loginMaterial("#976d5a"),.003);
 // A few irregular locks escape from underneath the hood, rather than a full hair cap.
 for(let i=0;i<5;i++){
  const lock=sphere(head,[.053,.068,.048],[-.13+i*.058,.30+(i%2)*.022,.15],hair);lock.rotation.z=-.45+i*.13;
 }
 const frames=loginMaterial("#34302d",.65,.15);
 for(const side of [-1,1]){
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.064,.007,8,32),frames);rim.scale.set(1.12,.76,1);rim.position.set(side*.096,.127,.243);head.add(rim);
  loginBox(head,[.009,.012,.13],[side*.18,.138,.18],frames,.004);
 }
 loginBox(head,[.054,.009,.012],[0,.135,.246],frames,.004); const arms=[-1,1].map(side=>{
  const upper=rod(torso,.12,shirt),fore=rod(torso,.095,shirt),hand=new THREE.Group();torso.add(hand);
  loginBox(hand,[.19,.09,.23],[0,0,0],skinLight,.035);
  for(let i=0;i<4;i++)loginBox(hand,[.032,.055,.15],[-.067+i*.044,-.008,.15],skin,.015);
  const thumb=loginBox(hand,[.07,.06,.12],[side*-.105,-.005,.02],skin,.02);thumb.rotation.y=side*.5;
  // Fine soldering tool follows the working hand and leaves the bench on chair turn.
  if(side===1){
   const grip=loginBox(hand,[.045,.045,.19],[0,-.035,.13],loginMaterial("#547982"),.012);grip.rotation.x=-.1;
   const tip=loginBox(hand,[.012,.012,.15],[0,-.05,.29],metal,.003);tip.rotation.x=-.1;
  }
  const a=new THREE.Vector3(side*.38,.78,.02),b=new THREE.Vector3(),c=new THREE.Vector3();
  return {side,upper,fore,hand,a,b,c};
 });
 let turn=0,privacyTime=0;
 return {group,head,update(delta:number,time:number,privateMode:boolean,animated:boolean,startle:number){
  const goal=privateMode?1:0;turn=animated?THREE.MathUtils.damp(turn,goal,4.5,delta):goal;
  if(Math.abs(turn-goal)<.001)turn=goal;
  group.rotation.y=turn*Math.PI-.08;
  group.position.z=-1.25-turn*.85;
  privacyTime=privateMode?privacyTime+delta:0;
  const peek=animated&&turn>.97?Math.max(0,Math.sin((privacyTime-2.8)*1.2))**8:0;
  head.rotation.y=peek*-1.9;head.rotation.x=THREE.MathUtils.lerp(.19,0,turn)-startle*.25;
  torso.rotation.x=.10*(1-turn)+startle*-.06;
  torso.position.y=1.35+(animated?Math.sin(time*1.8)*.007:0);
  for(const arm of arms){const t=turn,motion=animated?(1-t)*Math.sin(time*2+arm.side)*.035:0;
   arm.b.set(arm.side*THREE.MathUtils.lerp(.52,.4,t),THREE.MathUtils.lerp(.35,.20,t),THREE.MathUtils.lerp(.60,.35,t));
   arm.c.set(arm.side*THREE.MathUtils.lerp(.30,.22,t),THREE.MathUtils.lerp(.47,.02,t)+motion,THREE.MathUtils.lerp(1.50,.50,t)+motion);
   between(arm.upper,arm.a,arm.b);between(arm.fore,arm.b,arm.c);arm.hand.position.copy(arm.c);arm.hand.rotation.set(-.14,arm.side*.15,arm.side*motion);
  }
  return turn>.97?(peek>.12?"peeking":"private"):turn<.03?"working":privateMode?"turning-away":"turning-back";
 }};
}
