import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const loginMaterial = (color: string, roughness = 0.7, metalness = 0.05) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
export function loginBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  radius = 0.04,
) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, radius), material);
  mesh.position.set(...position);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function sphere(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
  mesh.scale.set(...size);
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function rod(parent: THREE.Object3D, radius: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.9, 1, 16), material);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
const axis = new THREE.Vector3(0, 1, 0),
  direction = new THREE.Vector3();
function between(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  direction.subVectors(b, a);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.y = direction.length();
  mesh.quaternion.setFromUnitVectors(axis, direction.normalize());
}

/** A seated, articulated game character. All geometry is local and original. */
export function createWorkshopHuman() {
  const group = new THREE.Group();
  group.position.z = -1.25;
  const skin = loginMaterial("#b98261", 0.78),
    skinLight = loginMaterial("#ca9979", 0.72),
    hair = loginMaterial("#29251f", 0.94),
    shirt = loginMaterial("#566777", 0.96),
    shirtDark = loginMaterial("#394b5c", 0.96),
    trousers = loginMaterial("#303d46", 0.85),
    shoe = loginMaterial("#232b2c", 0.8),
    seat = loginMaterial("#2b383c", 0.8),
    metal = loginMaterial("#879696", 0.3, 0.7);
  // Chair: the entire assembly rotates with its passenger.
  loginBox(group, [1.22, 0.18, 1.17], [0, 1.06, 0], seat, 0.12);
  loginBox(group, [1.22, 1.26, 0.18], [0, 1.66, -0.5], seat, 0.12);
  const post = rod(group, 0.085, metal);
  between(post, new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0, 1, 0));
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5,
      leg = rod(group, 0.04, metal);
    between(
      leg,
      new THREE.Vector3(0, 0.25, 0),
      new THREE.Vector3(Math.sin(angle) * 0.68, 0.16, Math.cos(angle) * 0.68),
    );
    sphere(group, [0.09, 0.09, 0.09], [Math.sin(angle) * 0.68, 0.1, Math.cos(angle) * 0.68], seat);
  }
  // Seated legs and shoes with natural knee bends.
  for (const side of [-1, 1]) {
    const thigh = rod(group, 0.18, trousers);
    between(
      thigh,
      new THREE.Vector3(side * 0.23, 1.22, -0.08),
      new THREE.Vector3(side * 0.3, 1.08, 0.73),
    );
    sphere(group, [0.18, 0.18, 0.18], [side * 0.3, 1.08, 0.73], trousers);
    const shin = rod(group, 0.145, trousers);
    between(
      shin,
      new THREE.Vector3(side * 0.3, 1.07, 0.73),
      new THREE.Vector3(side * 0.32, 0.25, 0.78),
    );
    loginBox(group, [0.32, 0.22, 0.57], [side * 0.32, 0.18, 0.91], shoe, 0.08);
  }
  const torso = new THREE.Group();
  torso.position.set(0, 1.35, 0);
  torso.rotation.x = 0.1;
  group.add(torso);
  sphere(torso, [0.4, 0.55, 0.24], [0, 0.45, 0.04], shirt);
  loginBox(torso, [0.72, 0.32, 0.39], [0, 0.1, 0.01], shirt, 0.1);
  // Relaxed pullover hoodie: dropped hood, ribbed hem, kangaroo pocket and cords.

  const neckline = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 10, 28, Math.PI), shirtDark);
  neckline.position.set(0, 0.93, 0.13);
  neckline.rotation.x = 0.35;
  neckline.rotation.z = Math.PI;
  torso.add(neckline);
  loginBox(torso, [0.7, 0.09, 0.39], [0, -0.025, 0.018], shirtDark, 0.035);
  loginBox(torso, [0.48, 0.22, 0.065], [0, 0.22, 0.282], shirt, 0.065);
  for (const side of [-1, 1]) {
    const opening = loginBox(
      torso,
      [0.012, 0.13, 0.009],
      [side * 0.19, 0.24, 0.32],
      shirtDark,
      0.004,
    );
    opening.rotation.z = side * -0.35;
    const cord = rod(torso, 0.009, loginMaterial("#c7c7b6"));
    between(
      cord,
      new THREE.Vector3(side * 0.11, 0.88, 0.25),
      new THREE.Vector3(side * 0.13, 0.6, 0.3),
    );
  }
  const neck = rod(torso, 0.13, skin);
  between(neck, new THREE.Vector3(0, 0.85, 0), new THREE.Vector3(0, 1.09, 0));
  const head = new THREE.Group();
  head.position.set(0, 1.21, 0.04);
  torso.add(head);
  // Raised fabric hood surrounds a smaller, softly sculpted face.
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 28, Math.PI * 0.77, Math.PI * 1.46),
    shirt,
  );
  hood.scale.set(0.335, 0.43, 0.315);
  hood.position.set(0, 0.115, -0.035);
  hood.castShadow = true;
  head.add(hood);
  const lining = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 28, Math.PI * 0.77, Math.PI * 1.46),
    new THREE.MeshStandardMaterial({ color: "#263849", roughness: 1, side: THREE.BackSide }),
  );
  lining.scale.set(0.315, 0.41, 0.295);
  lining.position.copy(hood.position);
  head.add(lining);
  // Cloth opening follows the face instead of a helmet-like solid shell.
  const opening = new THREE.EllipseCurve(0, 0, 0.284, 0.368, 0, Math.PI * 2, false, 0);
  const seamCurve = new THREE.CatmullRomCurve3(
    opening.getPoints(64).map((p) => new THREE.Vector3(p.x, p.y + 0.115, 0.145)),
    true,
  );
  const seam = new THREE.Mesh(new THREE.TubeGeometry(seamCurve, 64, 0.018, 8, true), shirtDark);
  head.add(seam);
  sphere(head, [0.235, 0.305, 0.218], [0, 0.075, 0.015], skinLight);
  sphere(head, [0.19, 0.135, 0.175], [0, -0.075, 0.036], skinLight);
  sphere(head, [0.027, 0.055, 0.034], [0, 0.055, 0.222], skinLight);
  for (const side of [-1, 1]) {
    const eye = loginBox(head, [0.053, 0.009, 0.008], [side * 0.09, 0.125, 0.219], hair, 0.004);
    eye.rotation.z = side * 0.05;
    const brow = loginBox(head, [0.075, 0.012, 0.009], [side * 0.09, 0.175, 0.218], hair, 0.004);
    brow.rotation.z = side * -0.08;
  }
  loginBox(head, [0.065, 0.006, 0.006], [0, -0.073, 0.208], loginMaterial("#976d5a"), 0.003);
  // A few irregular locks escape from underneath the hood, rather than a full hair cap.
  for (let i = 0; i < 5; i++) {
    const lock = sphere(
      head,
      [0.053, 0.068, 0.048],
      [-0.13 + i * 0.058, 0.3 + (i % 2) * 0.022, 0.15],
      hair,
    );
    lock.rotation.z = -0.45 + i * 0.13;
  }
  const frames = loginMaterial("#34302d", 0.65, 0.15);
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.007, 8, 32), frames);
    rim.scale.set(1.12, 0.76, 1);
    rim.position.set(side * 0.096, 0.127, 0.243);
    head.add(rim);
    loginBox(head, [0.009, 0.012, 0.13], [side * 0.18, 0.138, 0.18], frames, 0.004);
  }
  loginBox(head, [0.054, 0.009, 0.012], [0, 0.135, 0.246], frames, 0.004);
  const arms = [-1, 1].map((side) => {
    const upper = rod(torso, 0.12, shirt),
      fore = rod(torso, 0.095, shirt),
      hand = new THREE.Group();
    torso.add(hand);
    loginBox(hand, [0.19, 0.09, 0.23], [0, 0, 0], skinLight, 0.035);
    for (let i = 0; i < 4; i++)
      loginBox(hand, [0.032, 0.055, 0.15], [-0.067 + i * 0.044, -0.008, 0.15], skin, 0.015);
    const thumb = loginBox(hand, [0.07, 0.06, 0.12], [side * -0.105, -0.005, 0.02], skin, 0.02);
    thumb.rotation.y = side * 0.5;
    // Fine soldering tool follows the working hand and leaves the bench on chair turn.
    if (side === 1) {
      const grip = loginBox(
        hand,
        [0.045, 0.045, 0.19],
        [0, -0.035, 0.13],
        loginMaterial("#547982"),
        0.012,
      );
      grip.rotation.x = -0.1;
      const tip = loginBox(hand, [0.012, 0.012, 0.15], [0, -0.05, 0.29], metal, 0.003);
      tip.rotation.x = -0.1;
    }
    const a = new THREE.Vector3(side * 0.38, 0.78, 0.02),
      b = new THREE.Vector3(),
      c = new THREE.Vector3();
    return { side, upper, fore, hand, a, b, c };
  });
  let turn = 0,
    privacyTime = 0;
  return {
    group,
    head,
    update(delta: number, time: number, privateMode: boolean, animated: boolean, startle: number) {
      const goal = privateMode ? 1 : 0;
      turn = animated ? THREE.MathUtils.damp(turn, goal, 4.5, delta) : goal;
      if (Math.abs(turn - goal) < 0.001) turn = goal;
      group.rotation.y = turn * Math.PI - 0.08;
      group.position.z = -1.25 - turn * 0.85;
      privacyTime = privateMode ? privacyTime + delta : 0;
      const peek =
        animated && turn > 0.97 ? Math.max(0, Math.sin((privacyTime - 2.8) * 1.2)) ** 8 : 0;
      head.rotation.y = peek * -1.9;
      head.rotation.x = THREE.MathUtils.lerp(0.19, 0, turn) - startle * 0.25;
      torso.rotation.x = 0.1 * (1 - turn) + startle * -0.06;
      torso.position.y = 1.35 + (animated ? Math.sin(time * 1.8) * 0.007 : 0);
      for (const arm of arms) {
        const t = turn,
          motion = animated ? (1 - t) * Math.sin(time * 2 + arm.side) * 0.035 : 0;
        arm.b.set(
          arm.side * THREE.MathUtils.lerp(0.52, 0.4, t),
          THREE.MathUtils.lerp(0.35, 0.2, t),
          THREE.MathUtils.lerp(0.6, 0.35, t),
        );
        arm.c.set(
          arm.side * THREE.MathUtils.lerp(0.3, 0.22, t),
          THREE.MathUtils.lerp(0.47, 0.02, t) + motion,
          THREE.MathUtils.lerp(1.5, 0.5, t) + motion,
        );
        between(arm.upper, arm.a, arm.b);
        between(arm.fore, arm.b, arm.c);
        arm.hand.position.copy(arm.c);
        arm.hand.rotation.set(-0.14, arm.side * 0.15, arm.side * motion);
      }
      return turn > 0.97
        ? peek > 0.12
          ? "peeking"
          : "private"
        : turn < 0.03
          ? "working"
          : privateMode
            ? "turning-away"
            : "turning-back";
    },
  };
}
