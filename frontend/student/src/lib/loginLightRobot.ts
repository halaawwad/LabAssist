import * as THREE from "three";
import {RoundedBoxGeometry} from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
export function material(color:string,metalness=.05,roughness=.55){return new THREE.MeshStandardMaterial({color,metalness,roughness});}
export function box(parent:THREE.Object3D,size:[number,number,number],position:[number,number,number],mat:THREE.Material,radius=.04){const mesh=new THREE.Mesh(new RoundedBoxGeometry(...size,3,Math.min(radius,...size.map(v=>v/2))),mat);mesh.position.set(...position);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
export function textPlane(parent:THREE.Object3D,text:string,width:number,height:number,position:[number,number,number],color='#48665b',background?:string){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const context=canvas.getContext('2d')!;if(background){context.fillStyle=background;context.fillRect(0,0,768,192);}context.fillStyle=color;context.font='600 65px sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText(text,384,96);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:!background,depthWrite:false}));mesh.position.set(...position);parent.add(mesh);return mesh;}
export function connectRod(mesh:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3){const direction=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=direction.length();mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());}
export function createLightRobot(parent:THREE.Group){
 const group=new THREE.Group();group.position.set(-.2,2.65,-1.4);parent.add(group);
 const shell=material('#d7e8e5',.3,.32),dark=material('#284a54',.25,.3),trim=material('#fafbf3',.2,.35);
 box(group,[1.65,1.55,.75],[0,0,0],shell,.27);
 const sootMaterial=new THREE.MeshBasicMaterial({color:'#090b0a',transparent:true,opacity:0,depthWrite:false});
 box(group,[1.59,1.49,.06],[0,0,.365],sootMaterial,.24);
 const faceMaterial=dark.clone();box(group,[1.38,1.06,.12],[0,.04,.42],faceMaterial,.2);
 const eyesMaterial=new THREE.MeshBasicMaterial({color:'#bbebc9'}),eyes=[-.32,.32].map(x=>box(group,[.13,.26,.05],[x,.14,.51],eyesMaterial,.055));
 const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.17,-.14,.51),new THREE.Vector3(0,-.22,.52),new THREE.Vector3(.17,-.14,.51)]);group.add(new THREE.Mesh(new THREE.TubeGeometry(smile,20,.023,8,false),eyesMaterial));
 for(const side of [-1,1]){box(group,[.13,.045,.015],[side*.48,-.1,.51],material('#8bbbad'),.02);for(let i=0;i<4;i++)box(group,[.16,.07,.13],[side*.88,-.45+i*.28,0],trim,.02);box(group,[.3,.17,.4],[side*.43,-.87,.04],dark,.07);}
 box(group,[.065,.25,.065],[0,.9,0],trim,.025);const antenna=new THREE.Mesh(new THREE.SphereGeometry(.10,20,16),eyesMaterial);antenna.position.set(0,1.08,0);group.add(antenna);
 const arms=[-1,1].map(side=>{
  const hand=new THREE.Group();box(hand,[.40,.16,.43],[0,0,0],shell,.075);for(let i=0;i<3;i++)box(hand,[.017,.012,.14],[-.10+i*.10,.087,.05],trim,.004);group.add(hand);
  const upper=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,1,12),material('#a2bdb8',.55));const fore=new THREE.Mesh(new THREE.CylinderGeometry(.04,.045,1,12),trim);group.add(upper,fore);
  const shoulder=new THREE.Vector3(side*.78,-.25,0);const joint=new THREE.Mesh(new THREE.SphereGeometry(.08,12,8),dark);group.add(joint);
  return {side,hand,upper,fore,shoulder,joint};
 });
 const target=new THREE.Vector3();
 return {group,eyes,arms,setScorch(amount:number){sootMaterial.opacity=amount;faceMaterial.color.set('#284a54').lerp(new THREE.Color('#050706'),amount);faceMaterial.roughness=.3+.7*amount;},setHand(index:number,worldTarget:THREE.Vector3,coverEyes=false){
  const arm=arms[index]!;parent.updateWorldMatrix(true,true);target.copy(worldTarget);parent.localToWorld(target);group.worldToLocal(target);
  arm.hand.position.copy(target);arm.hand.rotation.set(coverEyes?Math.PI/2:0,0,coverEyes?arm.side*.08:arm.side*.05);
  const elbow=arm.shoulder.clone().lerp(target,.48);elbow.x+=arm.side*.13;elbow.y-=.14;connectRod(arm.upper,arm.shoulder,elbow);connectRod(arm.fore,elbow,target);arm.joint.position.copy(elbow);
 },setLocalHand(index:number,localTarget:THREE.Vector3,coverEyes=false){group.updateWorldMatrix(true,true);const position=localTarget.clone();group.localToWorld(position);parent.worldToLocal(position);this.setHand(index,position,coverEyes);}};
}
