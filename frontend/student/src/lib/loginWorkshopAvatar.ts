import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loginBox, loginMaterial, createWorkshopHuman } from "./loginWorkshopHuman";

/** Rigged textured avatar; the chair controller owns privacy motion independently of loading. */
export function createWorkshopAvatar(onReady: () => void, onError: () => void) {
  const controller = createWorkshopHuman();
  // Retain the rolling chair. The old procedural body is never shown while the asset loads.
  controller.group.children.slice(13).forEach((child) => {
    child.visible = false;
  });
  let avatar: THREE.Group | undefined,
    disposed = false;
  const rest = new Map<THREE.Object3D, THREE.Quaternion>();
  let hips: THREE.Object3D | undefined, head: THREE.Object3D | undefined;
  const p = new THREE.Vector3(),
    c = new THREE.Vector3(),
    target = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    parentQ = new THREE.Quaternion();
  const loader = new GLTFLoader();
  loader.load(
    "/models/workshop-avatar.glb",
    (gltf) => {
      if (disposed) {
        disposeAvatar(gltf.scene);
        return;
      }
      avatar = gltf.scene;
      avatar.scale.setScalar(1.95);
      controller.group.add(avatar);
      avatar.traverse((o) => {
        if (o instanceof THREE.Bone) rest.set(o, o.quaternion.clone());
        if (o instanceof THREE.Mesh) {
          o.castShadow = o.receiveShadow = true;
          o.frustumCulled = false;
        }
      });
      hips = avatar.getObjectByName("Hips");
      head = avatar.getObjectByName("Head");
      if (head) addHoodAndGlasses(head);
      const hand = avatar.getObjectByName("RightHand");
      if (hand) {
        loginBox(hand, [0.02, 0.085, 0.02], [0.015, 0.055, 0.025], loginMaterial("#48646f"), 0.007);
        loginBox(
          hand,
          [0.005, 0.105, 0.005],
          [0.015, 0.145, 0.025],
          loginMaterial("#b0b9ba", 0.25, 0.8),
          0.002,
        );
      }
      onReady();
    },
    undefined,
    () => {
      if (!disposed) onError();
    },
  );
  function aim(name: string, childName: string, x: number, y: number, z: number) {
    const bone = avatar?.getObjectByName(name),
      child = avatar?.getObjectByName(childName);
    if (!bone || !child || !bone.parent) return;
    controller.group.updateWorldMatrix(true, true);
    bone.getWorldPosition(p);
    child.getWorldPosition(c);
    target.set(x, y, z);
    controller.group.localToWorld(target);
    q.setFromUnitVectors(c.sub(p).normalize(), target.sub(p).normalize());
    bone.getWorldQuaternion(parentQ);
    q.multiply(parentQ);
    bone.parent.getWorldQuaternion(parentQ);
    bone.quaternion.copy(parentQ.invert().multiply(q));
  }
  return {
    ...controller,
    update(delta: number, time: number, privateMode: boolean, animated: boolean, startle: number) {
      const state = controller.update(delta, time, privateMode, animated, startle);
      controller.group.position.z += 0.4;
      if (avatar && hips && head) {
        rest.forEach((rotation, bone) => bone.quaternion.copy(rotation));
        hips.position.set(0, 1.18 / 1.95, 0);
        const turn = THREE.MathUtils.clamp((controller.group.rotation.y + 0.08) / Math.PI, 0, 1);
        const spine = avatar.getObjectByName("Spine");
        if (spine) spine.rotation.x += 0.2 * (1 - turn);
        for (const [side, prefix] of [
          [1, "Left"],
          [-1, "Right"],
        ] as const) {
          aim(prefix + "UpLeg", prefix + "Leg", side * 0.28, 1.05, 0.72);
          aim(prefix + "Leg", prefix + "Foot", side * 0.3, 0.23, 0.77);
          aim(prefix + "Foot", prefix + "ToeBase", side * 0.3, 0.15, 1.05);
          const motion = animated ? (1 - turn) * Math.sin(time * 2 + side) * 0.018 : 0;
          const arm = avatar.getObjectByName(prefix + "Arm")!,
            elbow = avatar.getObjectByName(prefix + "ForeArm")!,
            wrist = avatar.getObjectByName(prefix + "Hand")!;
          controller.group.updateWorldMatrix(true, true);
          const a = controller.group.worldToLocal(arm.getWorldPosition(new THREE.Vector3()));
          const b = controller.group.worldToLocal(elbow.getWorldPosition(new THREE.Vector3()));
          const c = controller.group.worldToLocal(wrist.getWorldPosition(new THREE.Vector3()));
          const l1 = a.distanceTo(b),
            l2 = b.distanceTo(c);
          // Keep palms outside the PCB silhouette; only fingertips and the iron approach its edges.
          const goal = new THREE.Vector3(
            side * THREE.MathUtils.lerp(0.5, 0.23, turn),
            THREE.MathUtils.lerp(1.81, 1.47, turn) + motion,
            THREE.MathUtils.lerp(0.98, 0.36, turn),
          );
          const direction = goal.clone().sub(a),
            distance = Math.min(direction.length(), (l1 + l2) * 0.98);
          direction.normalize();
          const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
          const pole = new THREE.Vector3(side * 0.9, 1.55, 0.25).sub(a);
          pole.addScaledVector(direction, -pole.dot(direction)).normalize();
          const bend = a
            .clone()
            .addScaledVector(direction, along)
            .addScaledVector(pole, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
          aim(prefix + "Arm", prefix + "ForeArm", bend.x, bend.y, bend.z);
          aim(prefix + "ForeArm", prefix + "Hand", goal.x, goal.y, goal.z);
          aim(
            prefix + "Hand",
            prefix + "HandMiddle1",
            goal.x - side * 0.07,
            goal.y - 0.035,
            goal.z + 0.16,
          );
        }
        head.rotation.y += controller.head.rotation.y;
        head.rotation.x += THREE.MathUtils.lerp(0.17, 0, turn) - startle * 0.25;
      }
      return state;
    },
    dispose() {
      disposed = true;
    },
  };
}
function disposeAvatar(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) value.dispose();
        });
        material.dispose();
      }
    }
  });
}

function addHoodAndGlasses(head: THREE.Object3D) {
  // Cloth shell is open at the face; small displacement gives soft fabric folds.
  const fabric = loginMaterial("#b7b5a9", 1),
    lining = loginMaterial("#777e79", 1);
  const geo = new THREE.SphereGeometry(1, 48, 40, Math.PI * 0.77, Math.PI * 1.46);
  const positions = geo.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    const fold = 1 + 0.022 * Math.sin(y * 15 + x * 7) * Math.sin(z * 9);
    positions.setXYZ(i, x * 0.107 * fold, y * 0.151 * fold + 0.1, z * 0.108 * fold + 0.012);
  }
  geo.computeVertexNormals();
  const hood = new THREE.Mesh(geo, fabric);
  hood.castShadow = true;
  head.add(hood);
  const inner = new THREE.Mesh(geo.clone(), lining);
  inner.material.side = THREE.BackSide;
  inner.scale.setScalar(0.99);
  head.add(inner);
  const frame = loginMaterial("#272d2d", 0.5, 0.3);
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0025, 8, 32), frame);
    rim.scale.y = 0.76;
    rim.position.set(side * 0.03, 0.087, 0.093);
    head.add(rim);
    loginBox(head, [0.003, 0.004, 0.066], [side * 0.058, 0.089, 0.063], frame, 0.001);
  }
  loginBox(head, [0.016, 0.003, 0.004], [0, 0.091, 0.095], frame, 0.001);
}
