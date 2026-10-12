import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CATALOG_MAP } from "@/lib/lab/catalog";
import { buildModel } from "@/lib/lab/models";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

export function ComponentPreview({ model }: { model: string }) {
  const host = useRef<HTMLDivElement>(null);
  const actions = useRef<{ zoom: (factor: number) => void; reset: () => void } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = host.current;
    const def = CATALOG_MAP[model];
    if (!element || !def) return;
    let renderer: THREE.WebGLRenderer | undefined;
    let controls: OrbitControls | undefined;
    let part: THREE.Group | undefined;
    let observer: ResizeObserver | undefined;
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.domElement.setAttribute("aria-label", "Interactive component: drag to rotate, scroll to zoom");
      element.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 2.5));
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(-3, 6, 4);
      scene.add(light);
      part = buildModel(def);
      scene.add(part);
      const bounds = new THREE.Box3().setFromObject(part);
      const center = bounds.getCenter(new THREE.Vector3());
      const radius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 0.1);
      const camera = new THREE.PerspectiveCamera(40, 1, radius / 100, radius * 100);
      camera.position.copy(center).add(new THREE.Vector3(2, 3, 4).normalize().multiplyScalar(radius * 3.6));
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(center);
      controls.minDistance = radius * 1.2;
      controls.maxDistance = radius * 9;
      controls.enablePan = true;
      controls.update();
      controls.saveState();
      const draw = () => renderer?.render(scene, camera);
      controls.addEventListener("change", draw);
      actions.current = {
        zoom: factor => {
          const offset = camera.position.clone().sub(controls!.target);
          offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, radius * 1.2, radius * 9));
          camera.position.copy(controls!.target).add(offset);
          controls!.update();
          draw();
        },
        reset: () => { controls!.reset(); draw(); },
      };
      observer = new ResizeObserver(() => {
        const width = element.clientWidth, height = element.clientHeight;
        if (!width || !height) return;
        renderer!.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        draw();
      });
      observer.observe(element);
    } catch { setFailed(true); }
    return () => {
      actions.current = null;
      observer?.disconnect();
      controls?.dispose();
      part?.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
        }
      });
      materials.forEach(material => {
        Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
        material.dispose();
      });
      textures.forEach(texture => texture.dispose());
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };
  }, [model]);
  return <div className="component-preview">
    <div ref={host} className="component-preview-canvas" />
    {failed && <p className="absolute inset-0 flex items-center justify-center text-xs">3D preview is unavailable in this browser.</p>}
    <div className="component-preview-controls">
      <button type="button" aria-label="Zoom in" onClick={() => actions.current?.zoom(0.8)}><ZoomIn size={14} /></button>
      <button type="button" aria-label="Zoom out" onClick={() => actions.current?.zoom(1.25)}><ZoomOut size={14} /></button>
      <button type="button" aria-label="Reset view" onClick={() => actions.current?.reset()}><RotateCcw size={14} /></button>
    </div>
    <span className="component-preview-hint">Drag to rotate · Scroll to zoom</span>
  </div>;
}
