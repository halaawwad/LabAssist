import { expect, it } from "vitest";
import * as THREE from "three";
import { componentCatalog } from "../lib/componentCatalog";
import { catalogPartDemos } from "../lib/catalogPartDemos";
import { createCatalogDemo } from "../lib/lab/catalogDemo";
import { CATALOG_MAP } from "../lib/lab/catalog";

it("covers all 43 approved parts with individual demo descriptions", () => {
  expect(componentCatalog).toHaveLength(43);
  for (const part of componentCatalog) {
    expect(catalogPartDemos[part.model], part.key).toBeDefined();
    expect(catalogPartDemos[part.model]!.caption.length).toBeGreaterThan(15);
  }
  expect(new Set(componentCatalog.map((part) => catalogPartDemos[part.model]!.title)).size).toBe(
    43,
  );
});
it("moves only the button cap and the potentiometer shaft", () => {
  const button = new THREE.Group(),
    cap = new THREE.Object3D();
  cap.name = "demo-button-cap";
  cap.position.y = 0.29;
  button.add(cap);
  const updateButton = createCatalogDemo(button, CATALOG_MAP["push-button"]!, 4);
  updateButton(Math.PI / 4);
  expect(cap.position.y).toBeLessThan(0.29);
  expect(button.position.y).toBe(0);
  updateButton(Math.PI * 0.75);
  expect(cap.position.y).toBe(0.29);
  const pot = new THREE.Group(),
    shaft = new THREE.Group();
  shaft.name = "demo-knob";
  pot.add(shaft);
  createCatalogDemo(pot, CATALOG_MAP["potentiometer"]!, 4)(1);
  expect(shaft.rotation.y).not.toBe(0);
  expect(pot.rotation.y).toBe(0);
});
it("counts digits by changing the correct seven segment lights", () => {
  const part = new THREE.Group();
  for (const letter of ["a", "b", "c", "d", "e", "f", "g", "dp"]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhysicalMaterial());
    mesh.name = `demo-segment-${letter}`;
    part.add(mesh);
  }
  const update = createCatalogDemo(part, CATALOG_MAP["seven-seg"]!, 3);
  const intensity = (name: string) =>
    (
      (part.getObjectByName(`demo-segment-${name}`) as THREE.Mesh)
        .material as THREE.MeshPhysicalMaterial
    ).emissiveIntensity;
  update(-0.001);
  expect(intensity("a")).toBeGreaterThan(0);
  expect(intensity("g")).toBe(0);
  update(1);
  expect(intensity("a")).toBe(0);
  expect(intensity("b")).toBeGreaterThan(0);
  expect(intensity("c")).toBeGreaterThan(0);
});
