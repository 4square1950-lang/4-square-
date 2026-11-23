import * as THREE from 'three';
import { buildCharacterMesh } from './characterModelBuilder';
import type { CharacterDef } from './characters';

const portraits = new Map<string, string>();
let renderer: THREE.WebGLRenderer | undefined;
let unavailable = false;

export function renderCardPortrait(character: CharacterDef) {
  const cached = portraits.get(character.id);
  if (cached || unavailable) return cached;

  if (!renderer) {
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(240, 240);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.setClearColor(0x000000, 0);
    } catch {
      unavailable = true;
      return;
    }
  }

  const scene = new THREE.Scene();
  const model = buildCharacterMesh(character);
  model.rotation.y = -0.22;
  scene.add(model, new THREE.HemisphereLight(0xeff7fb, 0x4c5559, 1.6));
  const key = new THREE.DirectionalLight(0xffeed1, 3.0);
  key.position.set(3, 5, 4);
  const rim = new THREE.DirectionalLight(0xb5e8f4, 2.3);
  rim.position.set(-3, 3, -3);
  scene.add(key, rim);

  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const focus = center.y + size.y * 0.20;
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 12);
  camera.position.set(center.x, focus + 0.07, 1.8 + size.x * 0.28);
  camera.lookAt(center.x, focus, 0);
  renderer.render(scene, camera);

  const portrait = renderer.domElement.toDataURL();
  portraits.set(character.id, portrait);
  const materials = new Set<THREE.Material>();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    for (const material of [object.material].flat()) materials.add(material);
  });
  for (const material of materials) material.dispose();
  return portrait;
}
