import * as THREE from 'three';

function ellipsoid(material: THREE.Material, position: [number, number, number], scale: [number, number, number]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mesh;
}

function lipSurface(material: THREE.Material, part: 'upper' | 'lower' | 'opening') {
  const segments = 24;
  const rows = 5;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let x = 0; x <= segments; x++) {
    const t = x / segments * 2 - 1;
    const taper = Math.pow(Math.max(0, 1 - t * t), 0.63);
    const mid = -0.107 + 0.012 * t * t;
    const bow = 0.003 * Math.exp(-((Math.abs(t) - 0.34) ** 2) / 0.045);
    const top = mid + 0.004 * taper;
    const bottom = mid - 0.007 * taper;
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      const low = part === 'upper' ? top : part === 'lower' ? bottom - 0.009 * taper : bottom;
      const high = part === 'upper' ? top + (0.009 + bow) * taper : part === 'lower' ? bottom : top;
      const z = (part === 'opening' ? 0.222 : 0.226 + Math.sin(v * Math.PI) * taper * 0.006) - 0.016 * t * t;
      positions.push(0.053 * t, THREE.MathUtils.lerp(low, high, v), z);
      if (x < segments && j < rows) {
        const i = x * (rows + 1) + j;
        indices.push(i, i + rows + 1, i + 1, i + 1, i + rows + 1, i + rows + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

export function buildWolfJaw(fur: THREE.Material) {
  const jaw = new THREE.Group();
  jaw.name = 'characterMouth';
  const mouth = new THREE.MeshStandardMaterial({ color: 0x302021, roughness: 0.88 });
  const enamel = new THREE.MeshStandardMaterial({ color: 0xe3dac5, roughness: 0.4 });
  jaw.add(ellipsoid(mouth, [0, -0.109, 0.249], [0.093, 0.027, 0.103]));
  jaw.add(ellipsoid(fur, [0, -0.132, 0.237], [0.085, 0.033, 0.106]));
  for (const side of [-1, 1]) {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.036, 10), enamel);
    fang.position.set(side * 0.055, -0.107, 0.31);
    fang.rotation.x = Math.PI;
    jaw.add(fang);
  }
  return jaw;
}

export function buildAthleteHead(skin: THREE.MeshStandardMaterial, hairColor: string, style?: string) {
  const head = new THREE.Group();
  head.name = 'headMesh';
  head.position.set(0, 1.18, 0);
  head.scale.set(0.86, 0.94, 0.91);

  const faceGeometry = new THREE.SphereGeometry(0.24, 44, 32);
  const positions = faceGeometry.attributes.position;
  const colors: number[] = [];
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const front = Math.max(0, z / 0.24);
    const jaw = THREE.MathUtils.clamp(-y / 0.21, 0, 1);
    const cheek = Math.exp(-((Math.abs(x) - 0.112) ** 2 / 0.0019 + (y + 0.038) ** 2 / 0.003));
    const eyeSocket = Math.exp(-((Math.abs(x) - 0.083) ** 2 / 0.0023 + (y - 0.024) ** 2 / 0.00068));
    positions.setXYZ(index, x * (1 - jaw * 0.24), y * 1.02, z + front * (cheek * 0.018 - eyeSocket * 0.009));
    const warm = cheek * front * 0.12 + jaw * 0.037;
    colors.push(1 - warm * 0.13, 1 - warm * 0.62, 1 - warm * 0.82);
  }
  faceGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  faceGeometry.computeVertexNormals();
  const shadedSkin = skin.clone();
  shadedSkin.vertexColors = true;
  const face = new THREE.Mesh(faceGeometry, shadedSkin);
  face.castShadow = true;
  head.add(face);

  const brow = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.93 });
  const sclera = new THREE.MeshStandardMaterial({ color: 0xf1e9d9, roughness: 0.47 });
  const iris = new THREE.MeshStandardMaterial({ color: 0x50321e, roughness: 0.42 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.15 });
  const lip = new THREE.MeshStandardMaterial({ color: skin.color.clone().lerp(new THREE.Color(0x6f3127), 0.55), roughness: 0.58 });
  const creaseMaterial = new THREE.MeshStandardMaterial({ color: skin.color.clone().multiplyScalar(0.49), roughness: 0.75 });

  for (const side of [-1, 1]) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.084, 0.025, 0.226);
    eyeGroup.rotation.y = side * 0.22;
    eyeGroup.add(
      ellipsoid(sclera, [0, 0, 0], [0.041, 0.022, 0.013]),
      ellipsoid(iris, [0, 0.001, 0.013], [0.015, 0.015, 0.004]),
      ellipsoid(pupil, [0, 0.001, 0.017], [0.007, 0.008, 0.0029]),
    );
    const browLine = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.037, 0.034, -0.002),
      new THREE.Vector3(0, 0.052, 0.008),
      new THREE.Vector3(0.034, 0.035, -0.003),
    );
    eyeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(browLine, 12, 0.0048, 7, false), brow));
    head.add(eyeGroup);

    const ear = ellipsoid(skin, [side * 0.222, -0.009, -0.008], [0.036, 0.052, 0.026]);
    ear.rotation.z = side * 0.22;
    const concha = ellipsoid(creaseMaterial, [side * 0.231, -0.008, 0.013], [0.014, 0.027, 0.008]);
    concha.rotation.z = side * 0.27;
    head.add(ear, concha);
    head.add(ellipsoid(creaseMaterial, [side * 0.019, -0.061, 0.245], [0.006, 0.0035, 0.005]));
  }

  const nose = ellipsoid(skin, [0, -0.032, 0.237], [0.028, 0.041, 0.032]);
  const mouth = new THREE.Group();
  mouth.name = 'characterMouth';
  const lipShadow = new THREE.MeshStandardMaterial({ color: 0x311916, roughness: 0.89 });
  const lowerLip = lip.clone();
  lowerLip.color.lerp(skin.color, 0.28);
  mouth.add(lipSurface(lip, 'upper'), lipSurface(lowerLip, 'lower'), lipSurface(lipShadow, 'opening'));
  head.add(nose, mouth);

  const cap = new THREE.SphereGeometry(0.247, 56, 25, 0, Math.PI * 2, 0, Math.PI * 0.6);
  const hairPositions = cap.attributes.position;
  const isShort = style === 'buzz';
  for (let i = 0; i < hairPositions.count; i++) {
    const x = hairPositions.getX(i);
    const y = hairPositions.getY(i);
    const z = hairPositions.getZ(i);
    const heading = Math.atan2(x, z);
    const wave = Math.sin(heading * 10 + y * 23) * 0.007 + Math.sin(heading * 21 - y * 17) * 0.003;
    const fringe = THREE.MathUtils.smoothstep(z, 0.04, 0.20);
    const taper = isShort ? 0.36 : 1;
    const shape = style === 'afro' ? 0.15 + Math.sin(y * 65 + heading * 26) * 0.03 : 0;
    const spike = style === 'spiky' ? Math.max(0, Math.sin(heading * 7 + y * 23)) * Math.max(0, y) * 0.27 : 0;
    hairPositions.setXYZ(i, x * (1 + (wave + shape) * taper), y * (1 + shape) + (wave + 0.015) * taper + fringe * 0.058 + spike, z * (1.018 + shape));
  }
  cap.computeVertexNormals();
  const hairstyle = new THREE.Mesh(cap, new THREE.MeshPhysicalMaterial({
    color: hairColor,
    roughness: 0.68,
    bumpMap: makeFabricHeightMap('fur'),
    bumpScale: 0.007,
    sheen: 0.30,
    sheenColor: new THREE.Color(hairColor).multiplyScalar(1.7),
  }));
  hairstyle.name = 'sculptedHair';
  hairstyle.position.set(0, style === 'afro' || style === 'spiky' ? .054 : .027,
    style === 'afro' || style === 'spiky' ? -.036 : -.014);
  hairstyle.castShadow = true;
  head.add(hairstyle);
  return head;
}

export function makeFabricHeightMap(kind: 'knit' | 'fur') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#828282';
  ctx.fillRect(0, 0, 96, 96);

  for (let row = 0; row < 24; row++) {
    for (let col = 0; col < 24; col++) {
      const luminance = 150 + ((row * 127 + col * 197 + row * col * 17) % 52);
      ctx.strokeStyle = `rgb(${luminance},${luminance},${luminance})`;
      ctx.beginPath();
      ctx.moveTo(col * 4 + row % 2, row * 4);
      ctx.lineTo(col * 4 + (kind === 'fur' ? 3 : 2), row * 4 + (kind === 'fur' ? 6 : 2));
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'knit' ? 3 : 2, kind === 'knit' ? 3 : 2);
  return texture;
}
