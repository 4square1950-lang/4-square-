import * as THREE from 'three';
import type { VenueId } from '../types/campaign';
import type { SquareId } from '../types/foursquare';
import { campusPerimeter, campusPlayground, campusTrees, campusWalls, campusYardFence, FUNNEL_POSITION, getCampusLayout, SCHOOL } from './campusLayout';
import { COURT_HALF_SIZE, LINE_HALF_WIDTH, SQUARE_CONFIGS } from './courtGeometry';
import { getVenueArt } from './venueArt';

type Group = THREE.Group;
type Material = THREE.Material;

function box(parent: Group, material: Material, x: number, y: number, z: number, w: number, h: number, d: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  mesh.castShadow = h > 0.3;
  parent.add(mesh);
  return mesh;
}

function paint(color: number, roughness = 0.86) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function batchSchoolDetails(parent: Group) {
  const batches = new Map<Material, THREE.Mesh<THREE.BoxGeometry, Material>[]>();
  for (const child of parent.children) {
    if (!(child instanceof THREE.Mesh) || !(child.geometry instanceof THREE.BoxGeometry) ||
      child.userData.cameraWall || Array.isArray(child.material)) continue;
    const boxes = batches.get(child.material) ?? [];
    boxes.push(child);
    batches.set(child.material, boxes);
  }
  const pose = new THREE.Object3D();
  for (const [material, boxes] of batches) {
    if (boxes.length < 2) continue;
    const instances = new THREE.InstancedMesh(new THREE.BoxGeometry(), material, boxes.length);
    instances.receiveShadow = true;
    instances.castShadow = boxes.some((mesh) => mesh.castShadow);
    for (const [index, mesh] of boxes.entries()) {
      const { width, height, depth } = mesh.geometry.parameters;
      pose.position.copy(mesh.position);
      pose.scale.set(width, height, depth);
      pose.updateMatrix();
      instances.setMatrixAt(index, pose.matrix);
      parent.remove(mesh);
      mesh.geometry.dispose();
    }
    parent.add(instances);
  }
}

function surface(color: number, pattern: string, repeatX: number, repeatY: number) {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return paint(color);
  const pixels = ctx.createImageData(size, size);
  let seed = 171;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = (i / 4) % size, y = Math.floor(i / (4 * size));
    const patch = Math.sin(x * Math.PI / 32 + Math.sin(y * Math.PI / 64)) * Math.cos(y * Math.PI / 32);
    const grain = seed >>> 27;
    const grass = pattern === 'grass';
    const brightness = 193 + grain + patch * (grass ? 16 : 8) - (grain < 3 ? 24 : 0);
    pixels.data.set([brightness - (grass ? 11 : 0), brightness, brightness - (grass ? 25 : 1), 255], i);
  }
  ctx.putImageData(pixels, 0, 0);
  if (pattern === 'asphalt') {
    ctx.lineWidth = .85;
    ctx.strokeStyle = '#4a484a70';
    for (let crack = 0; crack < 7; crack++) {
      const x = 8 + (crack * 87) % 211;
      const y = 17 + (crack * 61) % 209;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 8, y + 3);
      ctx.lineTo(x + 11, y + 11);
      ctx.lineTo(x + 22, y + 15);
      ctx.moveTo(x + 11, y + 11);
      ctx.lineTo(x + 8, y + 17);
      ctx.stroke();
    }
  }
  if (pattern === 'brick' || pattern === 'stone' || pattern === 'clapboard') {
    ctx.strokeStyle = pattern === 'clapboard' ? '#4f4e49' : '#95918a';
    ctx.lineWidth = pattern === 'clapboard' ? 1.5 : 2;
    const row = pattern === 'stone' ? 64 : 32;
    ctx.beginPath();
    for (let y = 0; y < size; y += row) {
      ctx.moveTo(0, y); ctx.lineTo(size, y);
      if (pattern === 'clapboard') continue;
      for (let x = (y / row) % 2 * 32; x < size; x += 64) {
        ctx.moveTo(x, y); ctx.lineTo(x, y + row);
      }
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ color, map: texture, bumpMap: texture, bumpScale: pattern === 'asphalt' ? 0.028 : 0.016, roughness: 0.91 });
}

function roof(parent: Group, material: Material, style: string, x: number, y: number, z: number, width: number, depth: number, rise: number) {
  const w = width + 0.35, d = depth + 0.4;
  if (style === 'flat') {
    box(parent, material, x, y + 0.16, z, w, 0.32, d);
    for (const side of [-1, 1]) {
      box(parent, material, x, y + rise / 2, z + side * d / 2, w + 0.14, rise, 0.22);
      box(parent, material, x + side * w / 2, y + rise / 2, z, 0.22, rise, d);
    }
    return;
  }
  const rows = style === 'sawtooth' ? 3 : 1;
  for (let i = 0; i < rows; i++) {
    const half = d / rows / 2;
    const profile = new THREE.Shape().moveTo(-half, 0).lineTo(half, 0);
    if (style === 'gable') profile.lineTo(0, rise);
    else if (style === 'mansard') profile.lineTo(half * 0.66, rise * 0.85).lineTo(0, rise).lineTo(-half * 0.66, rise * 0.85);
    else profile.lineTo(-half, rise);
    profile.closePath();
    const crown = new THREE.Mesh(new THREE.ExtrudeGeometry(profile, { depth: w, bevelEnabled: false }), material);
    crown.rotation.y = Math.PI / 2;
    crown.position.set(x - w / 2, y, z - d / 2 + (i + 0.5) * d / rows);
    crown.castShadow = crown.receiveShadow = true;
    parent.add(crown);
  }
}

export function buildCampusSchool(id?: VenueId) {
  const layout = getCampusLayout(id);
  const art = getVenueArt(id ?? 'bridgton_maine');
  const shell = new THREE.Group();
  shell.name = 'schoolExterior';
  const frontWall = surface(art.facade, layout.wall, 13, layout.height / 2);
  const sideWall = surface(art.facade, layout.wall, 7, layout.height / 2);
  const trim = paint(art.trim);
  const roofing = paint(art.roof);
  const glass = new THREE.MeshStandardMaterial({ color: 0x253740, roughness: 0.29, metalness: 0.2 });
  const walls = campusWalls(layout);
  for (const [index, wall] of walls.entries()) {
    const mesh = box(shell, index < 2 ? sideWall : frontWall, wall.x, wall.height / 2, wall.z, wall.width, wall.height, wall.depth);
    mesh.userData.cameraWall = true;
    if (index >= 6) roof(shell, roofing, layout.wings[index - 6].roof, wall.x, wall.height, wall.z, wall.width, wall.depth, layout.rise * 0.54);
  }
  roof(shell, roofing, layout.roof, 0, layout.height, (SCHOOL.front + SCHOOL.rear) / 2, SCHOOL.maxX - SCHOOL.minX, SCHOOL.rear - SCHOOL.front, layout.rise);

  const stories = layout.height > 7 ? 2 : 1;
  const windowWidth = layout.window === 'ribbon' ? 2.7 : 1.45;
  const arch = new THREE.TorusGeometry(windowWidth / 2, 0.077, 6, 15, Math.PI);
  for (const side of [-1, 1]) {
    const z = side < 0 ? SCHOOL.front : SCHOOL.rear;
    box(shell, frontWall, 0, (layout.height + 3.3) / 2, z - side * 0.22, 3.6, layout.height - 3.3, 0.44);
    box(shell, trim, 0, 3.33, z + 0.02 * side, 3.8, 0.19, 0.22);
    const frameColor = layout.wall === 'clapboard' ? art.trim : art.roof;
    const doorFrame = paint(frameColor);
    for (const edge of [-1, 1]) box(shell, doorFrame, edge * 1.75, 1.69, z + side * 0.03, 0.13, 3.36, 0.2);
    const canopyDepth = side < 0 ? 2.45 : layout.wall === 'clapboard' ? 1.9 : 1.25;
    box(shell, roofing, 0, 3.55, z + side * canopyDepth / 2, 5.55, 0.19, canopyDepth);
    if (side < 0) {
      for (const column of [-2.43, 2.43]) box(shell, trim, column, 1.71, z - (canopyDepth - 0.2), 0.25, 3.42, 0.25);
    }

    for (let floor = 0; floor < stories; floor++) {
      const y = 2.08 + floor * 3.25;
      const spacing = layout.window === 'ribbon' ? 4.1 : layout.window === 'arch' ? 3.12 : 3.55;
      for (let x = 5; x < 24.8; x += spacing) {
        for (const sign of [-1, 1]) {
          const wx = x * sign;
          box(shell, trim, wx, y, z + side * 0.045, windowWidth + 0.23, 1.8, 0.13);
          box(shell, glass, wx, y, z + side * 0.12, windowWidth, 1.57, 0.055);
          box(shell, trim, wx, y - 0.88, z + side * 0.13, windowWidth + 0.31, 0.12, 0.26);
          box(shell, trim, wx, y, z + side * 0.16, windowWidth, 0.075, 0.043);
          box(shell, trim, wx, y, z + side * 0.16, 0.061, 1.59, 0.043);
          if (layout.window === 'arch') {
            const lintel = new THREE.Mesh(arch, trim);
            lintel.position.set(wx, y + 0.87, z + side * 0.13);
            shell.add(lintel);
          }
        }
      }
    }
    if (layout.wall === 'brick' || layout.wall === 'plaster') box(shell, trim, 0, layout.height - 0.45, z + side * 0.025, 52, 0.14, 0.11);
  }
  batchSchoolDetails(shell);
  return shell;
}

function ground(parent: Group, surfaceMaterial: Material, x: number, y: number, z: number, width: number, depth: number) {
  const tile = new THREE.Mesh(new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2), surfaceMaterial);
  tile.position.set(x, y, z);
  tile.name = 'asphaltGround';
  tile.receiveShadow = true;
  parent.add(tile);
}

function boundary(parent: Group, layout: ReturnType<typeof getCampusLayout>) {
  const stone = paint(0x8b8680), wood = paint(0x766755), metal = paint(0x616969, 0.65);
  const meshMaterial = new THREE.MeshBasicMaterial({ color: 0x67736d, side: THREE.DoubleSide, transparent: true, opacity: 0.3, depthWrite: false, wireframe: true });
  const segments = campusYardFence(layout);
  for (const { x, z, length, side } of segments) {
    const width = (size: number) => side ? size : length;
    const depth = (size: number) => side ? length : size;
    if (layout.boundary === 'masonry') {
      box(parent, stone, x, 0.65, z, width(0.3), 1.3, depth(0.3));
      box(parent, stone, x, 1.36, z, width(0.38), 0.12, depth(0.38));
      continue;
    }
    const ranch = layout.boundary === 'ranch';
    const bar = ranch ? wood : metal;
    const h = ranch ? 1.12 : 1.9;
    for (const y of ranch ? [0.45, 0.88] : [0.2, h]) box(parent, bar, x, y, z, width(0.06), ranch ? 0.095 : 0.046, depth(0.06));
    const posts = Math.ceil(length / 3.2);
    for (let index = 0; index <= posts; index++) {
      const offset = (index / posts - 0.5) * length;
      box(parent, bar, x + (side ? 0 : offset), h / 2, z + (side ? offset : 0), 0.085, h, 0.085);
    }
    if (!ranch) {
      const chain = new THREE.Mesh(new THREE.PlaneGeometry(length, 1.7, Math.ceil(length * 4), 8), meshMaterial);
      chain.position.set(x, 1.04, z);
      if (side) chain.rotation.y = Math.PI / 2;
      parent.add(chain);
    }
  }
}

function buildSurroundings(id: VenueId, parent: Group) {
  const art = getVenueArt(id);
  const horizon = new THREE.Group();
  parent.add(horizon);
  if (art.terrain === 'plaza' || art.terrain === 'city' || id === 'boston_mass' || id === 'montreal_quebec' || id === 'youngstown_ohio') {
    const concrete = paint(0xbcb2a2);
    const masonry = paint(id === 'boston_mass' || id === 'youngstown_ohio' ? 0x8c6354 : 0xa6a59b);
    const glazing = paint(0x46565f, 0.46);
    const taller = art.terrain === 'city' || art.terrain === 'plaza';
    for (let i = 0; i < 6; i++) {
      if (i === 2 || i === 3) continue;
      const x = (i - 2.5) * 13.2;
      const z = -57 - (i % 2) * 7;
      const floors = taller ? 3 + (i * 2 % 4) : 2 + (i % 2);
      const height = floors * 2.75;
      const material = i % 2 ? masonry : concrete;
      box(horizon, material, x, height / 2, z, 10.9, height, 7.2);
      box(horizon, material, x, height + 0.2, z, 11.26, 0.4, 7.56);
      for (let floor = 0; floor < floors; floor++) {
        for (const column of [-3.18, 0, 3.18]) {
          box(horizon, glazing, x + column, floor * 2.75 + 1.47, z + 3.63, 1.35, 1.55, 0.06);
        }
      }
    }
    if (id === 'youngstown_ohio') {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 17, 13), masonry);
      stack.position.set(-37, 8.5, -50);
      horizon.add(stack);
    }
    batchSchoolDetails(horizon);
  }
  if (art.terrain === 'lake' || art.terrain === 'prairie' || art.terrain === 'hills') {
    const ridge = new THREE.SphereGeometry(1, 20, 10);
    const material = paint(art.terrain === 'prairie' ? 0x737e78 : 0x687e7d);
    for (let i = 0; i < 7; i++) {
      const hill = new THREE.Mesh(ridge, material);
      hill.position.set(-79 + 26.4 * i, -2, art.terrain === 'lake' ? 77 + (i % 2) * 9 : -72 - (i % 2) * 9);
      hill.scale.set(22, 5.1 + (i % 4) * 1.8, 12);
      horizon.add(hill);
    }
  }
}

export function buildCampusExterior(id?: VenueId) {
  const campus = new THREE.Group();
  const layout = getCampusLayout(id);
  const art = getVenueArt(id ?? 'bridgton_maine');
  const { left, right, back } = layout.yard;
  const green = art.terrain === 'plaza' ? 0x817b68 : art.terrain === 'prairie' ? 0x727d58 : 0x596a4d;
  ground(campus, surface(green, 'grass', 26, 23), 0, -0.025, -23, 180, 180);
  ground(campus, surface(layout.shade, 'asphalt', 8, 12), (left + right) / 2, 0, (SCHOOL.rear + back) / 2, right - left, back - SCHOOL.rear);
  const pavers = surface(art.terrain === 'plaza' ? 0xb2a48f : 0x92918c, 'stone', 6, 8);
  ground(campus, pavers, 0, 0, -30.5, 6.4, 17);
  ground(campus, pavers, 0, 0, -39.4, 80, 0.8);
  ground(campus, surface(0x383b3c, 'asphalt', 16, 5), 0, 0, -46, 104, 12.4);
  ground(campus, pavers, 0, 0, -53, 89, 1.5);
  ground(campus, pavers, 0, 0, -60, 4.4, 13.8);
  for (let i = 0; i < 9; i++) ground(campus, paint(0xcac6ad), 0, .011, -40.5-i*1.31, 4.4, .62);
  if (id) buildSurroundings(id, campus);
  campus.add(buildCampusSchool(id));
  boundary(campus, layout);
  const perimeter = new THREE.Group();
  const iron = paint(0x43534c);
  for (const { x, z, width, depth } of campusPerimeter()) {
    const side = depth > width;
    const length = Math.max(width, depth);
    for (const y of [.34, 1.18]) box(perimeter, iron, x, y, z, width, .08, depth);
    const posts = Math.ceil(length / 2.3);
    for (let index = 0; index <= posts; index++) {
      const offset = (index / posts - .5) * length;
      box(perimeter, iron, x + (side ? 0 : offset), .69, z + (side ? offset : 0), .15, 1.38, .15);
    }
  }
  batchSchoolDetails(perimeter);
  campus.add(perimeter);

  const play = campusPlayground(id);
  ground(campus, surface(art.terrain === 'plaza' ? 0x91695d : 0x827254, 'stone', 4, 4), play.x, -.006, play.z, play.width, play.depth);
  const steel = paint(0x566e7d), rail = paint(0xa75945), deck = paint(0xa38b57);
  const tower = play.equipment[0];
  for (const x of [-.8, .8]) for (const z of [-.8, .8]) {
    box(campus, steel, tower.x + x, 1.05, tower.z + z, .12, 2.1, .12);
  }
  box(campus, deck, tower.x, 1.07, tower.z, 1.82, .14, 1.75);
  for (const z of [-.78, .78]) box(campus, rail, tower.x, 1.65, tower.z + z, 1.82, .13, .14);
  const ramp = box(campus, rail, tower.x, .67, tower.z + 1.42, .7, .12, 1.55);
  ramp.rotation.x = .52;
  const balance = play.equipment[1];
  for (const x of [-1.02, 1.02]) box(campus, steel, balance.x + x, .28, balance.z, .14, .56, .16);
  box(campus, deck, balance.x, .58, balance.z, 2.55, .15, .38);
  for (const offset of [-2.4, 0, 2.4]) ground(campus, paint(0xcac3ad), play.x + offset, .005, play.z + 3.65, 1.25, .12);

  const sideline = surface(layout.boundary === 'masonry' ? 0x79756a : 0x706f65, 'stone', 3, 7);
  const outsideLeft = left - 1.2, outsideRight = right + 1.2;
  ground(campus, sideline, outsideLeft, 0, (back + 1) / 2, 1.82, back - 1);
  ground(campus, sideline, outsideRight, 0, (back + 1) / 2, 1.82, back - 1);

  const bark = paint(0x665950);
  const deciduous = paint(art.terrain === 'hills' ? 0x8e6947 : art.terrain === 'plaza' ? 0x657556 : 0x576e50);
  const conifer = paint(0x415d51);
  for (const [index, [x, z]] of campusTrees(layout).entries()) {
    const height = 4.2 + (index % 3) * 1.0;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.27, height * 0.7, 10), bark);
    trunk.position.set(x, height * 0.35, z);
    trunk.castShadow = true;
    campus.add(trunk);
    for (let tier = 0; tier < 3; tier++) {
      const pine = art.terrain === 'lake';
      const crown = new THREE.Mesh(pine ? new THREE.ConeGeometry(1.76 - tier * 0.32, 2.4, 12) : new THREE.IcosahedronGeometry(1.44 - tier * 0.17, 2), pine ? conifer : deciduous);
      crown.position.set(x + (pine ? 0 : Math.sin(tier * 2.8 + index) * 0.87), height * (0.62 + tier * 0.16), z + (pine ? 0 : Math.cos(tier * 2.8 + index) * 0.73));
      crown.castShadow = true;
      campus.add(crown);
    }
  }
  if (art.terrain === 'lake') {
    ground(campus, new THREE.MeshPhysicalMaterial({ color: 0x407082, roughness: 0.33, clearcoat: 0.32 }), 0, -0.018, back + 34, 110, 50);
  }

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.073, 0.1, 2.85, 12), paint(0x596162));
  pole.position.set(FUNNEL_POSITION.x, 1.43, FUNNEL_POSITION.z);
  pole.castShadow = true;
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.15, 0.5, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xa74738, roughness: 0.72, side: THREE.DoubleSide }));
  basket.position.set(FUNNEL_POSITION.x, 2.76, FUNNEL_POSITION.z);
  campus.add(pole, basket);
  return campus;
}

export function buildCampusCourt(id?: VenueId) {
  const group = new THREE.Group();
  const layout = getCampusLayout(id);
  const squareMeshes = new Map<SquareId, THREE.Mesh>();
  const line = paint(layout.lineColor);
  const size = COURT_HALF_SIZE * 2;
  for (const config of Object.values(SQUARE_CONFIGS)) {
    const shade = new THREE.Color(layout.shade).lerp(new THREE.Color(config.colorHex), 0.13);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT_HALF_SIZE - LINE_HALF_WIDTH * 2, COURT_HALF_SIZE - LINE_HALF_WIDTH * 2).rotateX(-Math.PI / 2),
      surface(shade.getHex(), 'asphalt', 2, 2),
    );
    mesh.position.set(config.center[0], 0.009, config.center[1]);
    mesh.receiveShadow = true;
    mesh.name = `courtSquare-${config.id}`;
    group.add(mesh);
    squareMeshes.set(config.id, mesh);
  }
  for (const offset of [-COURT_HALF_SIZE, 0, COURT_HALF_SIZE]) {
    const thickness = offset === 0 ? LINE_HALF_WIDTH * 2 : 0.14;
    ground(group, line, 0, 0.015, offset, size + 0.14, thickness);
    ground(group, line, offset, 0.016, 0, thickness, size);
  }
  return { group, squareMeshes };
}

export function disposeCampus(group: Group) {
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const textures = new Set<THREE.Texture>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of [object.material].flat()) {
      materials.add(material);
      if (material instanceof THREE.MeshStandardMaterial) {
        if (material.map) textures.add(material.map);
        if (material.bumpMap) textures.add(material.bumpMap);
      }
    }
  });
  geometries.forEach((item) => item.dispose());
  materials.forEach((item) => item.dispose());
  textures.forEach((item) => item.dispose());
}
