import * as THREE from 'three';
import { getVenueArt } from './venueArt';
import type { VenueDef } from '../types/campaign';

export function getRegionalRoad(id: VenueDef['id']) {
  if (id === 'melbourne_australia') return { surface: 'asphalt', paint: '#58707b', width: 20, mark: 'tram', side: -1, lanes: 2 } as const;
  if (id === 'buenos_aires_argentina') return { surface: 'stone', paint: '#675044', width: 17, mark: 'broken', side: 1, lanes: 1 } as const;
  if (id === 'bridgton_maine' || id === 'burlington_vermont' || id === 'north_manchester_indiana') {
    return { surface: 'rural', paint: '#386053', width: 14, mark: 'double', side: 1, lanes: 1 } as const;
  }
  if (id === 'youngstown_ohio' || id === 'calgary_alberta') return { surface: 'rural', paint: '#725447', width: 21, mark: 'double', side: 1, lanes: 2 } as const;
  return { surface: 'asphalt', paint: '#40586b', width: 19, mark: 'broken', side: 1, lanes: 2 } as const;
}

export function makeRoadTexture(surface: ReturnType<typeof getRegionalRoad>['surface'] = 'asphalt') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(256, 256);
  let noise = 40;
  for (let offset = 0; offset < image.data.length; offset += 4) {
    noise = (Math.imul(1664525, noise) + 1013904223) >>> 0;
    const x = (offset / 4) % 256;
    const y = Math.floor(offset / 1024);
    const joint = surface === 'stone' && (y % 64 < 5 || (x + (Math.floor(y / 64) % 2) * 64) % 128 < 5);
    const value = joint ? 55 + (noise >>> 29) : (surface === 'stone' ? 96 : surface === 'rural' ? 73 : 60) + (noise >>> 27);
    image.data[offset] = value;
    image.data[offset + 1] = value + (surface === 'stone' ? -6 : 2);
    image.data[offset + 2] = value + (surface === 'stone' ? -12 : 4);
    image.data[offset + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(surface === 'stone' ? 8 : 13, surface === 'stone' ? 98 : 220);
  texture.anisotropy = 4;
  return texture;
}

const concrete = new THREE.MeshStandardMaterial({ color: 0xa9a096, roughness: 0.91 });
const trim = new THREE.MeshStandardMaterial({ color: 0xd7cbbb, roughness: 0.72 });
const iron = new THREE.MeshStandardMaterial({ color: 0x253135, roughness: 0.54, metalness: 0.18 });
const windowGlass = new THREE.MeshStandardMaterial({ color: 0x243f50, roughness: 0.24, metalness: 0.52 });
const box = new THREE.BoxGeometry(1, 1, 1);

function block(parent: THREE.Group, material: THREE.Material, x: number, y: number, z: number, width: number, height: number, depth: number) {
  const mesh = new THREE.Mesh(box, material);
  mesh.scale.set(width, height, depth);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function batchBlocks(group: THREE.Group) {
  const byMaterial = new Map<THREE.Material, THREE.Mesh[]>();
  for (const object of group.children) {
    if (!(object instanceof THREE.Mesh) || object.geometry !== box || Array.isArray(object.material)) continue;
    const list = byMaterial.get(object.material) ?? [];
    list.push(object);
    byMaterial.set(object.material, list);
  }
  for (const [material, meshes] of byMaterial) {
    const instance = new THREE.InstancedMesh(box, material, meshes.length);
    meshes.forEach((mesh, index) => {
      mesh.updateMatrix();
      instance.setMatrixAt(index, mesh.matrix);
      group.remove(mesh);
    });
    instance.receiveShadow = true;
    group.add(instance);
  }
}

function building(parent: THREE.Group, x: number, z: number, stories: number, facade: THREE.Material) {
  const height = stories * 2.6 + 0.45;
  block(parent, facade, x, height / 2, z, 8.6, height, 6.6);
  block(parent, trim, x, height - 0.22, z, 8.85, 0.32, 6.86);
  block(parent, concrete, x, 0.36, z, 8.73, 0.72, 6.7);
  for (let floor = 0; floor < stories; floor++) {
    const y = 1.57 + floor * 2.6;
    block(parent, trim, x, y - 1, z, 8.69, 0.08, 6.68);
    for (let column = 0; column < 4; column++) {
      const wx = x - 3.05 + 2.03 * column;
      block(parent, trim, wx, y, z + 3.32, 1.13, 1.72, 0.14);
      block(parent, windowGlass, wx, y + 0.055, z + 3.401, 0.89, 1.45, 0.05);
      block(parent, trim, wx, y - 0.75, z + 3.454, 1.28, 0.13, 0.24);
      block(parent, iron, wx, y + 0.04, z + 3.438, 0.051, 1.4, 0.058);
    }
    for (const side of [-1, 1]) {
      for (const along of [-1.8, 0, 1.8]) {
        block(parent, trim, x + side * 4.32, y, z + along, 0.13, 1.57, 1.07);
        block(parent, windowGlass, x + side * 4.4, y + 0.028, z + along, 0.06, 1.35, 0.83);
      }
    }
  }
}

function trees(positions: { x: number; z: number; size: number }[]) {
  const group = new THREE.Group();
  const timber = new THREE.MeshStandardMaterial({ color: 0x524034, roughness: 1 });
  const foliage = new THREE.MeshStandardMaterial({ roughness: 0.92 });
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.24, 3.4, 9), timber, positions.length);
  const crown = new THREE.IcosahedronGeometry(1, 3);
  const points = crown.attributes.position;
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i);
    const y = points.getY(i);
    const z = points.getZ(i);
    const variation = 1 + Math.sin(x * 15 + z * 11) * Math.cos(y * 14 - z * 5) * 0.085;
    points.setXYZ(i, x * variation, y * variation, z * variation);
  }
  const leaves = new THREE.InstancedMesh(crown, foliage, positions.length * 5);
  const pose = new THREE.Object3D();
  const canopy = [0x536d44, 0x435e37, 0x6b814d, 0x3a5435, 0x577241];
  for (let index = 0; index < positions.length; index++) {
    const { x, z, size } = positions[index];
    pose.position.set(x, size * 1.65, z);
    pose.scale.set(size, size, size);
    pose.rotation.set(0, 0, 0);
    pose.updateMatrix();
    trunks.setMatrixAt(index, pose.matrix);
    for (let tier = 0; tier < canopy.length; tier++) {
      const angle = tier * 1.54 + index;
      pose.position.set(x + Math.cos(angle) * size * 0.89, size * (3.25 + tier * 0.17), z + Math.sin(angle) * size * 0.87);
      pose.scale.set(size * 1.38, size * (1.04 + tier * 0.075), size * 1.36);
      pose.rotation.y = angle;
      pose.updateMatrix();
      const instance = index * 5 + tier;
      leaves.setMatrixAt(instance, pose.matrix);
      leaves.setColorAt(instance, new THREE.Color(canopy[tier]));
    }
  }
  trunks.castShadow = true;
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  group.add(trunks, leaves);
  return group;
}

export function buildRoadside(venue: VenueDef) {
  const group = new THREE.Group();
  const art = getVenueArt(venue.id);
  const grass = new THREE.MeshStandardMaterial({ color: art.terrain === 'plaza' ? 0xb4a798 : 0x465b3c, roughness: 1 });
  const shoulder = new THREE.MeshStandardMaterial({ color: 0x373a37, roughness: 0.92 });
  const edge = getRegionalRoad(venue.id).width / 2;
  block(group, grass, 0, -0.14, 0, 410, 0.18, 420);
  for (const side of [-1, 1]) {
    block(group, shoulder, side * (edge + .60), -0.045, 0, 1.4, 0.075, 360);
    block(group, concrete, side * (edge + 1.9), -0.015, 0, 1.45, 0.105, 360);
  }

  const treeLine = [];
  for (let i = 0; i < 27; i++) {
    const z = -170 + i * 13;
    treeLine.push({ x: -15.1 - (i % 4), z, size: 0.8 + (i % 6) * 0.09 });
    treeLine.push({ x: 12.8 + (i % 5), z: z + 5, size: 0.91 + (i % 4) * 0.12 });
  }
  group.add(trees(treeLine));
  const facades = [art.facade, art.trim, 0x92847a].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.93 }));
  // Distant blocks make the foreground vegetation read against an urban edge.
  const neighborhoodBlocks = art.terrain === 'lake' ? 5 : 14;
  for (let index = 0; index < neighborhoodBlocks; index++) {
    const side = index % 2 ? -1 : 1;
    const x = side * (23 + index % 4 * 2.9);
    building(group, x, 18 - index * 11.5, art.terrain === 'lake' ? 1 : 2 + index % 3, facades[index % facades.length]);
  }
  const district = buildVenueDistrict(venue);
  district.position.set(0, 0, -63);
  group.add(district);
  batchBlocks(group);
  return group;
}

export function buildArrivalFrontage(venue: VenueDef) {
  const group = new THREE.Group();
  const art = getVenueArt(venue.id);
  const facade = new THREE.MeshStandardMaterial({
    color: art.facade, roughness: 0.84,
  });
  building(group, -4.34, -13, 2, facade);
  building(group, 4.34, -13, 2, facade);
  block(group, trim, 0, 5.25, -9.61, 17.8, 0.44, 0.5);
  block(group, trim, 0, 0.23, -8.6, 17.5, 0.46, 2.2);
  block(group, iron, 0, 1.62, -9.56, 1.33, 2.28, 0.19);
  block(group, trim, 0, 3.0, -9.44, 1.83, 0.24, 0.32);
  const roof = new THREE.MeshStandardMaterial({ color: art.roof, roughness: 0.9 });
  const localTrim = new THREE.MeshStandardMaterial({ color: art.trim, roughness: 0.78 });
  if (art.terrain === 'lake') {
    const profile = new THREE.Shape();
    profile.moveTo(-9.0, 0);
    profile.lineTo(0, 2.35);
    profile.lineTo(9.0, 0);
    profile.closePath();
    const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(profile, { depth: 7.4, bevelEnabled: false }), roof);
    gable.position.set(0, 5.64, -16.7);
    gable.castShadow = true;
    group.add(gable);
    for (const x of [-8.3, -4.45, 4.45, 8.3]) {
      block(group, localTrim, x, 2.84, -9.57, 0.14, 5.3, 0.13);
    }
    const centralWindow = block(group, windowGlass, 0, 6.33, -9.26, 1.2, 0.8, 0.07);
    centralWindow.castShadow = true;
  } else {
    block(group, roof, 0, 5.41, -13, 17.8, 0.29, 7.6);
  }
  if (art.terrain === 'plaza') {
    for (const x of [-8.5, -4.3, -0.95, 0.95, 4.3, 8.5]) {
      block(group, localTrim, x, 2.82, -9.55, 0.19, 5.35, 0.2);
    }
    for (const x of [-7.4, -5.35, -3.32, -1.28, 1.28, 3.32, 5.35, 7.4]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.065, 7, 22, Math.PI), localTrim);
      arch.position.set(x, 2.33, -9.49);
      group.add(arch);
    }
    const centralArch = new THREE.Mesh(new THREE.TorusGeometry(0.77, 0.12, 7, 25, Math.PI), localTrim);
    centralArch.position.set(0, 2.58, -9.40);
    group.add(centralArch);
    block(group, facade, 0, 5.79, -10.0, 6.7, 0.52, 0.48);
    block(group, localTrim, 0, 6.11, -9.93, 7.0, 0.21, 0.6);
  }
  group.add(trees([
    { x: -10.5, z: -6.8, size: 0.84 },
    { x: 9.4, z: -5.9, size: 0.86 },
  ]));

  const bloom = new THREE.MeshStandardMaterial({ color: 0xd1c3a9, emissive: 0xffc97c, emissiveIntensity: 0.45 });
  for (const x of [-6.9, 6.9]) {
    block(group, iron, x, 1.35, -5.3, 0.09, 2.75, 0.09);
    block(group, iron, x, 0.18, -5.3, 0.29, 0.36, 0.29);
    block(group, bloom, x, 2.84, -5.3, 0.22, 0.29, 0.22);
    block(group, iron, x, 3.016, -5.3, 0.30, 0.065, 0.30);
  }
  batchBlocks(group);
  return group;
}

// Surroundings stay outside the playable footprint. The same district is viewed
// from the road, from the school grounds, and in the venue tour.
export function buildVenueDistrict(venue: VenueDef) {
  const group = new THREE.Group();
  const art = getVenueArt(venue.id);
  const material = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.88 });
  const facade = material(art.facade);
  const edging = material(art.trim);
  const roof = material(art.roof);
  const marker = (geometry: THREE.BufferGeometry, surface: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  if (art.terrain === 'lake') {
    block(group, new THREE.MeshPhysicalMaterial({ color: 0x366677, roughness: 0.3, clearcoat: 0.65 }), 0, 0.025, -66, 170, 0.045, 69);
    block(group, roof, -30, 0.2, -48, 3.4, 0.3, 23);
    for (let index = 0; index < 15; index++) {
      const x = -64 + 9 * index;
      const z = -38 - Math.sin(index * 1.7) * 4;
      const height = 4.7 + index % 4;
      block(group, roof, x, height / 4, z, 0.34, height / 2, 0.34);
      for (let tier = 0; tier < 3; tier++) {
        marker(new THREE.ConeGeometry(2.05 - tier * 0.43, height * 0.54, 11), material(0x395b4c + tier * 0x050400), x, 1.9 + tier * height * 0.19, z);
      }
    }
  } else if (art.terrain === 'plaza') {
    const plaza = buildArrivalFrontage(venue);
    plaza.scale.setScalar(2.6);
    plaza.position.set(0, 0, -27);
    group.add(plaza);
    block(group, edging, 0, 0.045, -49, 70, 0.09, 25);
    marker(new THREE.CylinderGeometry(0.06, 0.11, 10), edging, 0, 18, -61);
    for (let i = 0; i < 3; i++) block(group, material(i === 1 ? 0xf4f2e9 : 0x66acd1), 1.8, 22.7 - i * 0.52, -61, 3.5, 0.52, 0.08);
  } else if (art.terrain === 'mill') {
    for (let i = 0; i < 5; i++) {
      building(group, -23 + i * 11, -52, 2 + (i % 2), facade);
      const cap = marker(new THREE.CylinderGeometry(4.7, 4.7, 8.7, 3), roof, -23 + i * 11, 7, -52);
      cap.rotation.x = Math.PI / 2;
    }
    marker(new THREE.CylinderGeometry(0.75, 1.3, 18, 12), facade, 25, 9, -57);
  } else {
    for (let i = 0; i < 7; i++) {
      const x = -39 + i * 13;
      const skyline = art.terrain === 'city' || art.terrain === 'prairie';
      building(group, x, -49 - i % 3 * 7, skyline ? 3 + (i * 3 % 5) : 1 + i % 3, i % 3 === 0 ? edging : facade);
    }
    if (art.terrain === 'hills' || art.terrain === 'prairie') {
      for (let i = 0; i < 7; i++) {
        const hill = marker(new THREE.SphereGeometry(1, 24, 12), material(0x4c665a + 0x030200 * (i % 3)), -67 + i * 22, -1, -87 - i % 2 * 7);
        hill.scale.set(27, 7 + (i % 4) * 3, 12);
      }
    }
    if (venue.id === 'calgary_alberta') {
      marker(new THREE.CylinderGeometry(1.05, 1.65, 24, 14), edging, 14, 12, -58);
      marker(new THREE.CylinderGeometry(3, 1.8, 2.5, 18), facade, 14, 22.8, -58);
    } else if (venue.id === 'melbourne_australia') {
      block(group, material(0x386b58), -16, 1.6, -34, 13.6, 2.5, 2.8);
      block(group, edging, -16, 2.9, -34, 13.7, 0.28, 2.9);
      for (let i = 0; i < 9; i++) block(group, roof, -21.8 + i * 1.42, 2.15, -32.57, 1.06, 0.73, 0.1);
    } else {
      const towerX = venue.id === 'boston_mass' ? 13 : venue.id === 'needham_mass' ? 22 : -7;
      block(group, edging, towerX, 5.5, -47, 4.4, 11, 4.4);
      marker(new THREE.SphereGeometry(2.5, 19, 13, 0, Math.PI * 2, 0, Math.PI / 2),
        venue.id === 'boston_mass' ? material(0xbe9b54) : roof, towerX, 11, -47);
    }
  }
  batchBlocks(group);
  return group;
}
