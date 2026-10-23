import { useEffect, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { CATALOG } from "./catalog";
import { buildModel } from "./models";

let cachedPreviews: Record<string, string> | undefined;

/** Render the actual workspace models once, using one temporary WebGL context. */
export function usePartPreviews() {
  const [previews, setPreviews] = useState<Record<string, string>>(cachedPreviews ?? {});

  useEffect(() => {
    if (cachedPreviews) return;
    let cancelled = false;
    let renderer: THREE.WebGLRenderer | undefined;
    let environment: THREE.WebGLRenderTarget | undefined;
    void (async () => {
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(192, 144);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      environment = pmrem.fromScene(room, 0.04);
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.6;
      room.dispose();
      pmrem.dispose();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 1.4));
      const light = new THREE.DirectionalLight(0xffffff, 2.2);
      light.position.set(-3, 6, 4);
      scene.add(light);
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
      const images: Record<string, string> = {};
      for (const def of CATALOG) {
        if (cancelled) break;
        const model = buildModel(def);
        scene.add(model);
        try {
          const bounds = new THREE.Box3().setFromObject(model);
          const center = bounds.getCenter(new THREE.Vector3());
          const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
          const halfHeight = Math.max(radius * 1.15, 0.3);
          camera.left = -halfHeight * 4 / 3;
          camera.right = halfHeight * 4 / 3;
          camera.top = halfHeight;
          camera.bottom = -halfHeight;
          camera.position.copy(center).add(new THREE.Vector3(2, 3, 4).normalize().multiplyScalar(10));
          camera.lookAt(center);
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
          images[def.id] = renderer.domElement.toDataURL("image/png");
        } finally {
          scene.remove(model);
          const materials = new Set<THREE.Material>();
          model.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.geometry.dispose();
              const list = Array.isArray(object.material) ? object.material : [object.material];
              list.forEach((material) => materials.add(material));
            }
          });
          const textures = new Set<THREE.Texture>();
          materials.forEach((material) => {
            const map = (material as THREE.MeshBasicMaterial).map;
            if (map) textures.add(map);
            material.dispose();
          });
          textures.forEach((texture) => texture.dispose());
        }
        if (!cancelled) setPreviews({ ...images });
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
      if (!cancelled) { cachedPreviews = images; setPreviews(images); }
    } catch (error) {
      console.warn("Component previews could not be rendered", error);
    } finally {
      environment?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
    }
    })();
    return () => { cancelled = true; };
  }, []);

  return previews;
}
