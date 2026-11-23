import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CharacterDef, CharacterCustomization, DEFAULT_CUSTOMIZATION } from './characters';
import { buildAthleteHead, buildWolfJaw, makeFabricHeightMap } from './characterDetail';

/**
 * Safe canvas texture generator that gracefully falls back without throwing errors.
 */
function createSafeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    try {
      draw(ctx);
    } catch {}
  }
  return new THREE.CanvasTexture(canvas);
}

// A sampled meridian keeps the shoulder, ribs and waist in one continuous surface.
function curvedBodyGeometry(profile: readonly (readonly [number, number])[], depth: number, segments = 32) {
  const curve = new THREE.SplineCurve(profile.map(([radius, height]) => new THREE.Vector2(radius, height)));
  const points = curve.getPoints(profile.length * 4);
  const radiusLimit = Math.max(...profile.map(([radius]) => radius));
  const top = profile[profile.length - 1][1];
  points.forEach((point, index) => {
    point.x = THREE.MathUtils.clamp(point.x, 0, radiusLimit);
    if (index) point.y = THREE.MathUtils.clamp(point.y, points[index - 1].y, top);
  });
  return new THREE.LatheGeometry(points, segments).scale(1, 1, depth);
}

const athleteTorsoProfile = [
  [0, -.23], [.148, -.23], [.182, -.202], [.174, -.112],
  [.186, -.031], [.216, .057], [.244, .133], [.228, .185],
  [.175, .226], [.112, .255], [.086, .264], [0, .264],
] as const;

function fittedJersey(material: THREE.Material, width = 1, depth = .76) {
  const jersey = new THREE.Mesh(curvedBodyGeometry(athleteTorsoProfile, depth), material);
  jersey.scale.x = width;
  jersey.position.y = .65;
  jersey.name = 'torsoMesh';
  jersey.castShadow = true;
  return jersey;
}

function addHumanPelvis(parent: THREE.Group, material: THREE.Material, width = 1) {
  const profile = [
    [0, .323], [.122, .323], [.173, .341], [.198, .377],
    [.195, .421], [.177, .467], [.155, .479], [0, .479],
  ] as const;
  const pelvis = new THREE.Mesh(curvedBodyGeometry(profile, .74, 28), material);
  pelvis.scale.x = width;
  pelvis.name = 'pelvisMesh';
  pelvis.castShadow = true;
  parent.add(pelvis);
}

/** Adds a solid pelvis foundation for the heavier character forms. */
export function addAthleticGlutes(
  parent: THREE.Group,
  pantsMat: THREE.Material,
  width = 0.44,
  depth = 0.26,
  yPos = 0.38
) {
  // Solid pelvis / shorts block bridging the torso and upper thighs seamlessly
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, depth), pantsMat);
  pelvis.position.set(0, yPos, 0);
  pelvis.castShadow = true;
  pelvis.name = 'pelvisMesh';
  parent.add(pelvis);
}

/**
 * Adds an anatomical neck cylinder connecting torso and head seamlessly.
 */
export function addNeck(
  parent: THREE.Group,
  skinMat: THREE.Material,
  yPos = 0.94,
  radius = 0.082,
  height = 0.18
) {
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius, height, 16), skinMat);
  neck.position.set(0, yPos, 0);
  neck.name = 'neckMesh';
  neck.castShadow = true;
  parent.add(neck);
  return neck;
}


/**
 * Adds anime/cartoon expressive eyes with glossy pupils and specular highlights, plus flush expressive mouth.
 */
export function addCartoonEyes(
  parent: THREE.Group,
  y: number,
  z: number,
  spacing = 0.16,
  eyeRadius = 0.065,
  pupilColor = 0x09090b,
  mouthDepth?: number,
) {
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const irisMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
  const pupilMat = new THREE.MeshBasicMaterial({ color: pupilColor });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const browMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65 });

  [-spacing / 2, spacing / 2].forEach((xOff, idx) => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 14, 14), eyeWhiteMat);
    eyeWhite.position.set(xOff, y, z);
    eyeWhite.scale.set(1, 1.25, 0.5);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.72, 12, 12), irisMat);
    iris.position.set(xOff, y, z + eyeRadius * 0.30);
    iris.scale.set(1, 1.25, 0.5);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.52, 12, 12), pupilMat);
    pupil.position.set(xOff, y, z + eyeRadius * 0.40);
    pupil.scale.set(1, 1.25, 0.5);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.22, 8, 8), glintMat);
    glint.position.set(xOff + eyeRadius * 0.2, y + eyeRadius * 0.25, z + eyeRadius * 0.50);

    // Expressive sculpted eyebrow ridge
    const brow = new THREE.Mesh(new THREE.BoxGeometry(eyeRadius * 1.45, eyeRadius * 0.34, eyeRadius * 0.35), browMat);
    brow.position.set(xOff, y + eyeRadius * 1.38, z + eyeRadius * 0.25);
    brow.rotation.z = idx === 0 ? 0.1 : -0.1;

    parent.add(eyeWhite, iris, pupil, glint, brow);
  });

  // Calculate face curvature for mouth placement so it is securely mounted flush to the skull
  // For sphere centered at y, surface at (y - 0.10) sits slightly behind apex z
  const mouthY = y - 0.105;
  const mouthZ = mouthDepth ?? Math.sqrt(Math.max(0.01, z * z - 0.105 * 0.105));
  addExpressiveMouth(parent, mouthY, mouthZ - 0.005);
}

/**
 * Adds an articulated expressive mouth (lips, smile, teeth) attached directly and flush to the character face.
 */
export function addExpressiveMouth(
  parent: THREE.Group,
  y: number,
  z: number,
  style: 'smile' | 'open' | 'smirk' | 'fangs' | 'mech' = 'smile'
) {
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0x881337 }); // deep smile red
  const teethMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // bright teeth

  const mouthGroup = new THREE.Group();
  mouthGroup.name = 'characterMouth';
  mouthGroup.position.set(0, y, z);

  if (style === 'open') {
    // Open cheering mouth recessed against face
    const cavityMat = new THREE.MeshBasicMaterial({ color: 0x450a0a });
    const cavity = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      cavityMat
    );
    cavity.rotation.x = Math.PI / 2;
    cavity.scale.set(1.1, 0.8, 0.35);

    const topTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.012), teethMat);
    topTeeth.position.set(0, 0.016, 0.003);

    const lipRing = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.008, 6, 14, Math.PI), mouthMat);
    lipRing.rotation.x = 0.12;

    mouthGroup.add(cavity, topTeeth, lipRing);
  } else if (style === 'fangs') {
    // Beast / vampire fangs embedded in mouth line
    const mouthLine = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.02, 0.01), mouthMat);
    const fangL = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 6), teethMat);
    fangL.position.set(-0.028, -0.012, 0.003);
    fangL.rotateZ(Math.PI);
    const fangR = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 6), teethMat);
    fangR.position.set(0.028, -0.012, 0.003);
    fangR.rotateZ(Math.PI);
    mouthGroup.add(mouthLine, fangL, fangR);
  } else {
    // Attached, contoured athletic smile flush against face geometry:
    // 1. Recessed mouth bed
    const cavityMat = new THREE.MeshBasicMaterial({ color: 0x500724 });
    const cavity = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.028, 0.008), cavityMat);
    cavity.position.set(0, 0, -0.003);

    // 2. Curved smiling lip arch flush against face
    const smileArc = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.008, 8, 16, Math.PI), mouthMat);
    smileArc.rotateZ(Math.PI);

    // 3. Teeth flush inside the mouth cavity
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.011, 0.008), teethMat);
    teeth.position.set(0, 0.006, 0.001);

    mouthGroup.add(cavity, smileArc, teeth);
  }

  // Slight tilt to align with curvature of head
  mouthGroup.rotation.x = -0.06;
  parent.add(mouthGroup);
}

/**
 * Builds an articulated anatomical hand group with a sculpted beveled palm,
 * palmar cushion, opposable 2-segment thumb, and 4 curved 2-phalanx fingers.
 */
function addVisibleMouth(head: THREE.Object3D, y: number, z: number, color = 0x302025, width = .067) {
  const smile = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-width, y + .012, z), new THREE.Vector3(0, y - .035, z + .009), new THREE.Vector3(width, y + .012, z));
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(smile, 12, .011, 7), new THREE.MeshStandardMaterial({color, roughness: .75}));
  mouth.name = 'characterMouth';
  head.add(mouth);
}

export function buildArticulatedHand(
  skinMat: THREE.Material,
  isRight: boolean
): THREE.Group {
  const handGroup = new THREE.Group();
  handGroup.name = isRight ? 'rightHandGroup' : 'leftHandGroup';
  const side = isRight ? 1 : -1;

  // 1. Seamless Wrist Transition Joint
  const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.041, 14, 12), skinMat);
  wrist.scale.set(.88, 1, .72);
  wrist.position.set(0, 0.002, 0);
  handGroup.add(wrist);

  // 2. Sculpted Contoured & Beveled Metacarpal Palm (trapezoid silhouette with anatomical knuckle arch)
  const palmShape = new THREE.Shape();
  palmShape.moveTo(-0.029, -0.004);
  palmShape.lineTo(0.029, -0.004);
  palmShape.quadraticCurveTo(0.044, -0.036, 0.041, -0.068);
  palmShape.quadraticCurveTo(0.018, -0.076, 0, -0.075);
  palmShape.quadraticCurveTo(-0.022, -0.076, -0.041, -0.065);
  palmShape.quadraticCurveTo(-0.043, -0.034, -0.029, -0.004);

  const palmGeo = new THREE.ExtrudeGeometry(palmShape, {
    depth: 0.020,
    bevelEnabled: true,
    bevelThickness: 0.011,
    bevelSize: 0.0085,
    bevelSegments: 3,
    curveSegments: 8,
  });
  palmGeo.translate(0, 0, -0.010);
  if (!isRight) {
    palmGeo.scale(-1, 1, 1);
  }
  const palm = new THREE.Mesh(palmGeo, skinMat);
  palm.castShadow = true;
  handGroup.add(palm);

  // Thenar (thumb-base) muscle cushion on palmar face for lifelike hand volume
  const thenarPad = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), skinMat);
  thenarPad.scale.set(0.78, 1.18, 0.52);
  thenarPad.position.set(side * 0.024, -0.034, 0.012);
  thenarPad.rotation.z = -side * 0.25;
  handGroup.add(thenarPad);

  // 3. Opposable 2-Phalanx Articulated Thumb
  const thumbPivot = new THREE.Group();
  thumbPivot.name = 'thumbPivot';
  thumbPivot.position.set(side * 0.041, -0.026, 0.010);
  thumbPivot.rotation.z = -side * 0.62;
  thumbPivot.rotation.x = -0.32;

  const thumbBaseJoint = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), skinMat);
  const thumbProx = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.014, 0.032, 10), skinMat);
  thumbProx.position.set(0, -0.016, 0);
  thumbProx.castShadow = true;

  const thumbDistPivot = new THREE.Group();
  thumbDistPivot.position.set(0, -0.032, 0);
  thumbDistPivot.rotation.z = side * 0.28;
  thumbDistPivot.rotation.x = -0.22;

  const thumbKnuckle = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), skinMat);
  const thumbDist = new THREE.Mesh(new THREE.CylinderGeometry(0.0135, 0.0105, 0.027, 10), skinMat);
  thumbDist.position.set(0, -0.0135, 0);
  const thumbTip = new THREE.Mesh(new THREE.SphereGeometry(0.0108, 16, 12), skinMat);
  thumbTip.position.set(0, -0.027, 0);

  thumbDistPivot.add(thumbKnuckle, thumbDist, thumbTip);
  thumbPivot.add(thumbBaseJoint, thumbProx, thumbDistPivot);
  handGroup.add(thumbPivot);

  // 4. 4 Articulated 2-Phalanx Curved Fingers (Index, Middle, Ring, Pinky)
  const fingers = [
    { x: side * 0.032, y: -0.072, r: 0.0132, proxLen: 0.035, distLen: 0.027, spreadZ: -side * 0.08, curlX: -0.18 }, // Index
    { x: side * 0.010, y: -0.075, r: 0.0138, proxLen: 0.040, distLen: 0.030, spreadZ: -side * 0.02, curlX: -0.20 }, // Middle
    { x: side * -0.012, y: -0.073, r: 0.0130, proxLen: 0.036, distLen: 0.027, spreadZ: side * 0.04, curlX: -0.23 }, // Ring
    { x: side * -0.032, y: -0.067, r: 0.0114, proxLen: 0.028, distLen: 0.022, spreadZ: side * 0.11, curlX: -0.27 }, // Pinky
  ];

  fingers.forEach((f) => {
    const fPivot = new THREE.Group();
    fPivot.position.set(f.x, f.y, 0.002);
    fPivot.rotation.z = f.spreadZ;
    fPivot.rotation.x = f.curlX;

    const mcp = new THREE.Mesh(new THREE.SphereGeometry(f.r * .94, 14, 10), skinMat);
    const prox = new THREE.Mesh(
      new THREE.CapsuleGeometry(f.r * .82, Math.max(.005, f.proxLen - f.r), 4, 12),
      skinMat
    );
    prox.position.set(0, -f.proxLen / 2, 0);
    prox.castShadow = true;

    const pipPivot = new THREE.Group();
    pipPivot.position.set(0, -f.proxLen, 0);
    pipPivot.rotation.x = f.curlX * 1.15;

    const pip = new THREE.Mesh(new THREE.SphereGeometry(f.r * 0.86, 10, 8), skinMat);
    const dist = new THREE.Mesh(
      new THREE.CapsuleGeometry(f.r * .69, Math.max(.005, f.distLen - f.r), 4, 12),
      skinMat
    );
    dist.position.set(0, -f.distLen / 2, 0);
    dist.castShadow = true;

    const tip = new THREE.Mesh(new THREE.SphereGeometry(f.r * 0.69, 10, 8), skinMat);
    tip.position.set(0, -f.distLen, 0);

    pipPivot.add(pip, dist, tip);
    fPivot.add(mcp, prox, pipPivot);
    handGroup.add(fPivot);
  });

  return handGroup;
}

/**
 * Attaches 3D meshes for all 12 accessories, dark shades, gold chain, headphones, and wristbands.
 */
export function attachAccessories(
  parentGroup: THREE.Group,
  custom: CharacterCustomization,
  headY = 1.25
) {
  const accType = custom.accessoryType || custom.hatType || 'none';
  const accColorHex = custom.accessoryColor || custom.hatColor || '#EF4444';
  const accMat = new THREE.MeshStandardMaterial({
    color: accColorHex,
    roughness: 0.4,
    metalness: accType === 'crown' || accType === 'halo' ? 0.85 : 0.1,
  });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });

  const accGroup = new THREE.Group();
  accGroup.name = 'accessoriesGroup';

  switch (accType) {
    case 'sweatband': {
      const headband = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.032, 10, 24), accMat);
      headband.rotateX(Math.PI / 2);
      headband.position.set(0, headY + 0.02, 0);
      accGroup.add(headband);
      break;
    }
    case 'beanie': {
      const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.252, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.54), accMat);
      beanie.position.set(0, headY + 0.02, 0);
      const foldedRim = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.028, 10, 24), accMat);
      foldedRim.rotateX(Math.PI / 2);
      foldedRim.position.set(0, headY - 0.02, 0);
      const pomPom = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), whiteMat);
      pomPom.position.set(0, headY + 0.27, 0);
      accGroup.add(beanie, foldedRim, pomPom);
      break;
    }
    case 'crown': {
      const crownMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.22, 5), goldMat);
      crownMesh.position.set(0, headY + 0.26, 0);
      accGroup.add(crownMesh);
      break;
    }
    case 'backwards_cap': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), accMat);
      cap.position.set(0, headY + 0.02, 0);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.18), accMat);
      visor.position.set(0, headY + 0.08, -0.16);
      accGroup.add(cap, visor);
      break;
    }
    case 'forward_cap': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), accMat);
      cap.position.set(0, headY + 0.02, 0);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.18), accMat);
      visor.position.set(0, headY + 0.02, 0.18);
      visor.rotation.x = 0.15;
      accGroup.add(cap, visor);
      break;
    }
    case 'headphones': {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 10, 24, Math.PI), accMat);
      band.position.set(0, headY + 0.12, 0);
      [-0.24, 0.24].forEach((xOff) => {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16), darkMat);
        cup.rotation.z = Math.PI / 2;
        cup.position.set(xOff, headY, 0);
        accGroup.add(cup);
      });
      accGroup.add(band);
      break;
    }
    case 'ninja_headband': {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 8, 24), darkMat);
      band.rotateX(Math.PI / 2);
      band.position.set(0, headY + 0.04, 0);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.015), goldMat);
      plate.position.set(0, headY + 0.04, 0.24);
      accGroup.add(band, plate);
      break;
    }
    case 'sun_visor': {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 8, 24), accMat);
      band.rotateX(Math.PI / 2);
      band.position.set(0, headY, 0);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.18), accMat);
      visor.position.set(0, headY, 0.16);
      visor.rotation.x = 0.2;
      accGroup.add(band, visor);
      break;
    }
    case 'cowboy_hat': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 24), accMat);
      brim.position.set(0, headY + 0.12, 0);
      brim.scale.set(1.1, 1, 1.3);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.18, 16), accMat);
      crown.position.set(0, headY + 0.22, 0);
      accGroup.add(brim, crown);
      break;
    }
    case 'halo': {
      const haloMesh = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 10, 24), goldMat);
      haloMesh.rotateX(Math.PI / 2);
      haloMesh.position.set(0, headY + 0.38, 0);
      accGroup.add(haloMesh);
      break;
    }
    case 'viking_helmet': {
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.252, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), darkMat);
      helm.position.set(0, headY + 0.02, 0);
      [-0.22, 0.22].forEach((xOff) => {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 10), whiteMat);
        horn.position.set(xOff, headY + 0.18, 0);
        horn.rotation.z = xOff < 0 ? 0.6 : -0.6;
        accGroup.add(horn);
      });
      accGroup.add(helm);
      break;
    }
    case 'party_hat': {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 16), accMat);
      cone.position.set(0, headY + 0.28, 0);
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), goldMat);
      pom.position.set(0, headY + 0.44, 0);
      accGroup.add(cone, pom);
      break;
    }
  }

  // Dark Shades
  if (custom.hasShades) {
    const shadesMat = new THREE.MeshStandardMaterial({ color: custom.shadesColor || 0x0f172a, roughness: 0.1 });
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.04), shadesMat);
    shades.position.set(0, headY, 0.23);
    accGroup.add(shades);
  }

  // Gold Chain
  if (custom.hasGoldChain) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 20), goldMat);
    chain.rotateX(Math.PI / 2.3);
    chain.position.set(0, 0.84, 0.08);
    parentGroup.add(chain);
  }

  // Standalone DJ Headphones
  if (custom.hasHeadphones && accType !== 'headphones') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 10, 24, Math.PI), darkMat);
    band.position.set(0, headY + 0.12, 0);
    [-0.24, 0.24].forEach((xOff) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16), darkMat);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(xOff, headY, 0);
      accGroup.add(cup);
    });
    accGroup.add(band);
  }

  // Wristbands attached directly to articulated forearms when available
  if (custom.hasWristbands) {
    const wbMat = new THREE.MeshStandardMaterial({ color: custom.wristbandColor || '#F59E0B' });
    const leftForearm = parentGroup.getObjectByName('leftForearm') as THREE.Group | undefined;
    const rightForearm = parentGroup.getObjectByName('rightForearm') as THREE.Group | undefined;
    if (leftForearm && rightForearm) {
      const wbL = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.052, 0.055, 14), wbMat);
      wbL.position.set(0, -0.14, 0);
      const wbR = wbL.clone();
      leftForearm.add(wbL);
      rightForearm.add(wbR);
    } else {
      const wbL = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.018, 8, 16), wbMat);
      wbL.rotateX(Math.PI / 2);
      wbL.position.set(-0.32, 0.52, 0);
      const wbR = wbL.clone();
      wbR.position.set(0.32, 0.52, 0);
      parentGroup.add(wbL, wbR);
    }
  }

  // Mount head-level accessories onto headMesh group so headgear follows head turns!
  const headMeshObj = parentGroup.getObjectByName('headMesh');
  if (headMeshObj && headMeshObj instanceof THREE.Group) {
    accGroup.position.set(0, -headMeshObj.position.y, 0);
    headMeshObj.add(accGroup);
  } else {
    parentGroup.add(accGroup);
  }
}

/**
 * Adds standard articulated arms with sculpted anatomical deltoid shoulder caps,
 * dedicated pivot groups, palms, thumbs, and fingers.
 */
export function addArms(
  parent: THREE.Group,
  skinMat: THREE.Material,
  sleeveMatL: THREE.Material,
  sleeveMatR: THREE.Material,
  fittedSleeves = false,
) {
  const cuffGeo = new THREE.TorusGeometry(0.078, 0.016, 10, 18);
  cuffGeo.rotateX(Math.PI / 2);

  const buildSingleArm = (isRight: boolean, sleeveMat: THREE.Material) => {
    const side = isRight ? 1 : -1;
    const armPivot = new THREE.Group();
    armPivot.name = isRight ? 'rightArm' : 'leftArm';
    armPivot.position.set(side * (fittedSleeves ? 0.239 : 0.258), 0.77, 0.02);

    // Naturally proportioned athletic deltoid shoulder cap & jersey sleeve
    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.086, 22, 16), sleeveMat);
    deltoid.scale.set(fittedSleeves ? 0.83 : 1.06, 0.96, 0.96);
    deltoid.position.set(side * 0.01, 0.01, 0);
    deltoid.castShadow = true;

    const sleeveGeometry = fittedSleeves
      ? new THREE.LatheGeometry([
          new THREE.Vector2(0.061, -0.116), new THREE.Vector2(0.065, -0.097),
          new THREE.Vector2(0.071, -0.066), new THREE.Vector2(0.075, -0.025),
          new THREE.Vector2(0.073, 0.020), new THREE.Vector2(0.061, 0.053),
          new THREE.Vector2(0.043, 0.077), new THREE.Vector2(0.014, 0.083), new THREE.Vector2(0, 0.084),
        ], 24)
      : new THREE.CylinderGeometry(0.072, 0.068, 0.13, 14);
    const sleeve = new THREE.Mesh(sleeveGeometry, sleeveMat);
    sleeve.position.y = fittedSleeves ? 0 : -0.05;
    sleeve.castShadow = true;

    const cuff = new THREE.Mesh(cuffGeo, sleeveMat);
    cuff.scale.setScalar(fittedSleeves ? 0.77 : 0.92);
    cuff.position.set(0, -0.112, 0);

    // Upper bicep/arm down to elbow joint
    const upperArmProfile = fittedSleeves
      ? new THREE.LatheGeometry([
          new THREE.Vector2(0.047, -0.078), new THREE.Vector2(0.053, -0.048),
          new THREE.Vector2(0.059, 0.018), new THREE.Vector2(0.056, 0.083),
        ], 20)
      : new THREE.CylinderGeometry(0.058, 0.053, 0.14, 12);
    const upperArm = new THREE.Mesh(upperArmProfile, skinMat);
    upperArm.position.set(side * 0.008, -0.175, 0.01);
    upperArm.rotation.z = -side * 0.07;
    upperArm.castShadow = true;

    // Articulated Elbow Joint & Forearm Pivot
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.051, 12, 10), skinMat);
    elbow.position.set(side * 0.014, -0.245, 0.015);
    if (fittedSleeves) elbow.scale.set(0.88, 1.05, 0.93);

    const forearmPivot = new THREE.Group();
    forearmPivot.name = isRight ? 'rightForearm' : 'leftForearm';
    forearmPivot.position.set(side * 0.014, -0.245, 0.015);
    // Natural athletic ready bend forward at the elbow
    forearmPivot.rotation.x = -0.32;

    const forearmProfile = fittedSleeves
      ? new THREE.LatheGeometry([
          new THREE.Vector2(0.036, -0.108), new THREE.Vector2(0.041, -0.073),
          new THREE.Vector2(0.055, -0.015), new THREE.Vector2(0.055, 0.046),
          new THREE.Vector2(0.048, 0.086),
        ], 20)
      : new THREE.CylinderGeometry(0.052, 0.044, 0.18, 12);
    const forearm = new THREE.Mesh(forearmProfile, skinMat);
    forearm.position.set(0, -0.09, 0);
    forearm.castShadow = true;

    const hand = buildArticulatedHand(skinMat, isRight);
    hand.position.set(0, -0.182, 0);
    if (isRight) {
      hand.name = 'strikeHand';
    } else {
      hand.name = 'leftStrikeHand';
    }

    forearmPivot.add(forearm, hand);
    if (!fittedSleeves) armPivot.add(deltoid);
    armPivot.add(sleeve, cuff, upperArm, elbow, forearmPivot);
    return armPivot;
  };

  parent.add(buildSingleArm(false, sleeveMatL), buildSingleArm(true, sleeveMatR));
}

/**
 * Adds sleek rounded athletic running sneakers and articulated hip/thigh/knee/shin legs.
 */
export function addLegsAndSneakers(
  parent: THREE.Group,
  skinMat: THREE.Material,
  shoeMat: THREE.Material,
  trimMat: THREE.Material,
  spacing = 0.22,
  shortsMat?: THREE.Material,
) {
  const half = spacing / 2;
  const rubberWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
  const laceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

  [-half, half].forEach((xPos, idx) => {
    const legGroup = new THREE.Group();
    legGroup.name = idx === 0 ? 'leftLeg' : 'rightLeg';
    legGroup.position.set(xPos, 0.38, 0);

    // Upper Thigh & Shorts Cuff Socket (bridges seamlessly into pelvis)
    const thighSocket = new THREE.Mesh(
      shortsMat ? curvedBodyGeometry([[.077, -.092], [.081, -.067], [.087, -.009], [.101, .061], [.094, .093]], .91, 22)
        : new THREE.CylinderGeometry(0.086, 0.076, 0.15, 20),
      shortsMat ?? trimMat ?? skinMat
    );
    thighSocket.position.set(0, shortsMat ? -0.023 : 0.01, 0);
    thighSocket.castShadow = true;

    // Lower thigh cylinder to knee
    const thigh = new THREE.Mesh(shortsMat
      ? curvedBodyGeometry([[.058, -.07], [.064, -.047], [.071, .005], [.076, .065]], .94, 18)
      : new THREE.CylinderGeometry(0.072, 0.064, 0.13, 12), skinMat);
    thigh.position.set(0, -0.09, 0);
    thigh.castShadow = true;

    // Articulated Knee Joint & Shin Pivot
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), skinMat);
    knee.position.set(0, -0.16, 0);

    const shinPivot = new THREE.Group();
    shinPivot.name = idx === 0 ? 'leftShin' : 'rightShin';
    shinPivot.position.set(0, -0.16, 0);

    const calf = new THREE.Mesh(shortsMat
      ? curvedBodyGeometry([[.038, -.082], [.042, -.06], [.052, -.029], [.062, .021], [.058, .066]], .92, 18)
      : new THREE.CylinderGeometry(0.062, 0.052, 0.14, 12), skinMat);
    calf.position.set(0, -0.065, 0);
    calf.castShadow = true;

    // Detailed Multi-Part Athletic Sneaker
    const shoeBodyGroup = new THREE.Group();
    shoeBodyGroup.position.set(0, -0.13, 0.03);
    if (shortsMat) shoeBodyGroup.scale.set(0.92, 0.92, 1.07);

    const shoeUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.082, 0.11, 16), shoeMat);
    shoeUpper.position.set(0, 0.015, -0.01);
    shoeUpper.castShadow = true;

    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.078, 16, 12), shoeMat);
    toeCap.scale.set(0.96, 0.72, 1.32);
    toeCap.position.set(0, -0.02, 0.055);
    toeCap.castShadow = true;

    // Crisp Athletic Lace Straps & Midsole Cushion
    const lace1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.016, 0.03), laceMat);
    lace1.position.set(0, 0.035, 0.055);
    lace1.rotation.x = 0.35;
    const lace2 = lace1.clone();
    lace2.position.set(0, 0.02, 0.08);

    const rubberSole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.094, 0.038, 16), rubberWhiteMat);
    rubberSole.scale.set(0.96, 1, 1.36);
    rubberSole.position.set(0, -0.052, 0.025);

    const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.10), trimMat);
    sideStripe.position.set(0, 0.005, 0.015);

    const ankleCuff = new THREE.Mesh(new THREE.TorusGeometry(0.064, shortsMat ? 0.008 : 0.016, 8, 16), trimMat);
    ankleCuff.rotateX(Math.PI / 2);
    ankleCuff.position.set(0, 0.062, -0.01);

    shoeBodyGroup.add(shoeUpper, toeCap, lace1, lace2, rubberSole, sideStripe, ankleCuff);
    shinPivot.add(calf, shoeBodyGroup);
    legGroup.add(thighSocket, thigh, knee, shinPivot);
    parent.add(legGroup);
  });
}

/**
 * Procedurally creates a full 3D character mesh matching any of the 32 distinct archetypes.
 */
export function buildCharacterMesh(
  charDef: CharacterDef,
  customization?: CharacterCustomization
): THREE.Group {
  if (customization) {
    return buildCustomizablePlayerMesh(charDef, customization);
  }

  const root = new THREE.Group();
  root.name = `character-${charDef.archetype}`;

  const archetype = charDef.archetype;

  const skinMat = new THREE.MeshStandardMaterial({
    color: charDef.skinColor,
    roughness: 0.5,
    metalness: 0.05,
  });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.85,
  });

  switch (archetype) {
    // -------------------------------------------------------------
    // 1. PATCH (Classic Court Kid)
    // -------------------------------------------------------------
    case 'patch': {
      return buildCustomizablePlayerMesh(charDef, DEFAULT_CUSTOMIZATION);
    }

    // -------------------------------------------------------------
    // 2. BLOCKY (Living Green Court Voxel Block)
    // -------------------------------------------------------------
    case 'blocky': {
      const blockyGroup = new THREE.Group();

      const greenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 });
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.44), greenMat);
      cube.position.set(0, 0.85, 0);
      cube.name = 'torsoMesh';
      blockyGroup.add(cube);

      // 4-Square court grid front
      const gridTex = createSafeCanvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 8;
        ctx.strokeRect(6, 6, 244, 244);
        ctx.beginPath();
        ctx.moveTo(128, 0);
        ctx.lineTo(128, 256);
        ctx.moveTo(0, 128);
        ctx.lineTo(256, 128);
        ctx.stroke();
      });
      const gridFace = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.7),
        new THREE.MeshStandardMaterial({ map: gridTex, roughness: 0.4 })
      );
      gridFace.position.set(0, 0.85, 0.225);
      blockyGroup.add(gridFace);

      // Big Eyes & Cap
      addCartoonEyes(blockyGroup, 0.96, 0.23, 0.22, 0.08);

      const capMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.5 });
      const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), capMat);
      capDome.position.set(0.06, 1.28, -0.02);
      const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.2), capMat);
      capVisor.position.set(0.18, 1.28, 0.12);
      blockyGroup.add(capDome, capVisor);

      // Anatomical Hands & Arms
      const armBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
      const handGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a });

      const leftArm = new THREE.Group();
      leftArm.name = 'leftArm';
      leftArm.position.set(-0.42, 0.85, 0);
      const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.16, 10), armBlueMat);
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.046, 0.24, 10), handGreenMat);
      armL.position.set(-0.04, -0.17, 0.04);
      const handL = buildArticulatedHand(handGreenMat, false);
      handL.position.set(0, -0.12, 0);
      armL.add(handL);
      leftArm.add(sleeveL, armL);

      const rightArm = new THREE.Group();
      rightArm.name = 'rightArm';
      rightArm.position.set(0.42, 0.85, 0);
      const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.16, 10), armBlueMat);
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.046, 0.24, 10), handGreenMat);
      armR.position.set(0.04, -0.17, 0.04);
      const handR = buildArticulatedHand(handGreenMat, true);
      handR.position.set(0, -0.12, 0);
      handR.name = 'strikeHand';
      armR.add(handR);
      rightArm.add(sleeveR, armR);

      blockyGroup.add(leftArm, rightArm);

      // Rounded Block Glutes & Legs
      addAthleticGlutes(blockyGroup, greenMat, 0.5, 0.3, 0.45);
      addLegsAndSneakers(blockyGroup, greenMat, new THREE.MeshStandardMaterial({ color: 0xef4444 }), capMat, 0.28);

      root.add(blockyGroup);
      break;
    }

    // -------------------------------------------------------------
    // 3. SKATER ROXY (Retro Roller Skater)
    // -------------------------------------------------------------
    case 'skater_roxy': {
      const roxyGroup = new THREE.Group();
      const flannelMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
      const torso = fittedJersey(flannelMat, .94, .70);
      roxyGroup.add(torso);

      addNeck(roxyGroup, skinMat, 0.92, 0.08, 0.18);

      const head = buildAthleteHead(skinMat, '#492b25', 'buzz');
      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      helmet.position.set(0, 1.277, -.042);
      helmet.scale.set(.90,.79,.90);
      roxyGroup.add(head, helmet);

      const denimMat = new THREE.MeshStandardMaterial({ color: 0x2563eb });
      addHumanPelvis(roxyGroup, denimMat);

      // Connected articulated legs and Quad roller skates with purple wheels
      const bootMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0xa855f7 });
      [-0.14, 0.14].forEach((xPos, idx) => {
        const legGroup = new THREE.Group();
        legGroup.name = idx === 0 ? 'leftLeg' : 'rightLeg';
        legGroup.position.set(xPos, 0.38, 0);

        // Denim shorts cuff
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.072, 0.12, 14), denimMat);
        cuff.position.set(0, 0.02, 0);
        cuff.castShadow = true;

        // Anatomical leg cylinder
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.054, 0.26, 12), skinMat);
        leg.position.set(0, -0.12, 0);
        leg.castShadow = true;

        // Skate boot mounted directly at bottom of leg
        const skateBoot = new THREE.Mesh(new RoundedBoxGeometry(.14, .14, .24, 3, .034), bootMat);
        skateBoot.position.set(0, -0.26, 0.02);
        skateBoot.castShadow = true;

        [-0.07, 0.07].forEach((zOff) => {
          [-0.07, 0.07].forEach((xOff) => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10), wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(xOff, -0.34, 0.02 + zOff);
            legGroup.add(wheel);
          });
        });

        legGroup.add(cuff, leg, skateBoot);
        roxyGroup.add(legGroup);
      });

      addArms(roxyGroup, skinMat, flannelMat, flannelMat, true);
      root.add(roxyGroup);
      break;
    }

    // -------------------------------------------------------------
    // 4. FANG WOLF (Cyber Werewolf Athlete)
    // -------------------------------------------------------------
    case 'fang_wolf': {
      const wolfGroup = new THREE.Group();
      const furMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
      const jerseyMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.28), jerseyMat);
      torso.position.set(0, 0.65, 0);
      wolfGroup.add(torso);

      addNeck(wolfGroup, furMat, 0.92, 0.085, 0.18);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 16), furMat);
      head.position.set(0, 1.15, 0);
      // Wolf muzzle & ears
      const snout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 8), furMat);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, 1.12, 0.25);
      const earL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 6), furMat);
      earL.position.set(-0.14, 1.36, 0);
      const earR = earL.clone();
      earR.position.set(0.14, 1.36, 0);
      wolfGroup.add(head, snout, earL, earR);
      const jaw = buildWolfJaw(furMat);
      jaw.position.y = 1.15;
      wolfGroup.add(jaw);

      addCartoonEyes(wolfGroup, 1.18, 0.22, 0.16, 0.06, 0xf59e0b);

      // Bushy tail
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.4, 8), furMat);
      tail.position.set(0, 0.38, -0.25);
      tail.rotation.x = -0.6;
      wolfGroup.add(tail);

      const shortsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      addAthleticGlutes(wolfGroup, shortsMat);
      addArms(wolfGroup, furMat, jerseyMat, jerseyMat);
      addLegsAndSneakers(wolfGroup, furMat, blackMat, jerseyMat);

      root.add(wolfGroup);
      break;
    }

    // -------------------------------------------------------------
    // 5. ARCADE BOT (Pixel Pete Unit-84)
    // -------------------------------------------------------------
    case 'arcade_bot': {
      const botGroup = new THREE.Group();
      const cabMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3, metalness: 0.5 });
      const cabinet = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.8, 0.45, 3, 0.06), cabMat);
      cabinet.position.set(0, 0.85, 0);
      botGroup.add(cabinet);

      addNeck(botGroup, cabMat, 0.88, 0.09, 0.16);

      // CRT Screen with glowing yellow smiley
      const crtTex = createSafeCanvasTexture(256, 256, (ctx) => {
        const phosphor = ctx.createRadialGradient(121, 101, 12, 128, 128, 156);
        phosphor.addColorStop(0, '#244459');
        phosphor.addColorStop(1, '#09131e');
        ctx.fillStyle = phosphor;
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#e9b84a';
        ctx.shadowBlur = 11;
        // 8-bit eyes & smile
        ctx.fillRect(60, 70, 35, 35);
        ctx.fillRect(160, 70, 35, 35);
        ctx.fillRect(60, 160, 25, 25);
        ctx.fillRect(170, 160, 25, 25);
        ctx.fillRect(85, 180, 85, 25);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#07101959';
        for (let y = 0; y < 256; y += 4) ctx.fillRect(0, y, 256, 1);
      });
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.48, 0.4),
        new THREE.MeshBasicMaterial({ map: crtTex })
      );
      const bezel = new THREE.Mesh(new RoundedBoxGeometry(0.515, 0.44, 0.027, 3, 0.013), blackMat);
      bezel.position.set(0, 0.95, 0.228);
      screen.position.set(0, 0.95, 0.243);
      crtTex.colorSpace = THREE.SRGBColorSpace;
      botGroup.add(bezel, screen);

      // Joystick ball on top
      const joyStick = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
      joyStick.position.set(0, 1.34, 0);
      botGroup.add(joyStick);

      addAthleticGlutes(botGroup, cabMat, 0.55, 0.35, 0.42);
      addArms(botGroup, cabMat, new THREE.MeshStandardMaterial({ color: 0xfacc15 }), cabMat);
      addLegsAndSneakers(botGroup, cabMat, blackMat, goldMat);

      root.add(botGroup);
      break;
    }

    // -------------------------------------------------------------
    // 6. MAGMA INFERNO REX (Molten Lava Titan)
    // -------------------------------------------------------------
    case 'magma_rex': {
      const magmaGroup = new THREE.Group();
      const lavaMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.6, emissive: 0xc2410c, emissiveIntensity: 0.6 });
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, 0.34), rockMat);
      torso.position.set(0, 0.7, 0);
      magmaGroup.add(torso);

      addNeck(magmaGroup, rockMat, 0.96, 0.095, 0.18);

      // Glowing lava core
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), lavaMat);
      core.position.set(0, 0.7, 0.12);
      magmaGroup.add(core);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), rockMat);
      head.position.set(0, 1.2, 0);
      const horns = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), lavaMat);
      horns.position.set(-0.16, 1.45, 0);
      const hornR = horns.clone();
      hornR.position.set(0.16, 1.45, 0);
      magmaGroup.add(head, horns, hornR);

      addCartoonEyes(magmaGroup, 1.2, 0.2, 0.18, 0.07, 0xffedd5);
      addVisibleMouth(magmaGroup, 1.106, .198, 0xf98a55);
      addAthleticGlutes(magmaGroup, rockMat, 0.52, 0.32, 0.4);
      addArms(magmaGroup, lavaMat, rockMat, rockMat);
      addLegsAndSneakers(magmaGroup, rockMat, rockMat, lavaMat);

      root.add(magmaGroup);
      break;
    }

    // -------------------------------------------------------------
    // 7. SHINOBI ZEPHYR (Cyber Ninja)
    // -------------------------------------------------------------
    case 'shinobi_zephyr': {
      const ninjaGroup = new THREE.Group();
      const giMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.5 });
      const neonMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.8 });

      const torso = fittedJersey(giMat);
      ninjaGroup.add(torso);

      addNeck(ninjaGroup, giMat, 0.92, 0.08, 0.18);

      ninjaGroup.add(buildAthleteHead(skinMat, '#241f2a', 'spiky'));

      // Scarf flowing behind
      const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.04), neonMat);
      scarf.position.set(0, 1.0, -0.2);
      scarf.rotation.x = -0.4;
      ninjaGroup.add(scarf);

      addHumanPelvis(ninjaGroup, giMat);
      addArms(ninjaGroup, giMat, neonMat, giMat, true);
      addLegsAndSneakers(ninjaGroup, giMat, blackMat, neonMat, .22, giMat);

      root.add(ninjaGroup);
      break;
    }

    // -------------------------------------------------------------
    // 8. ASTRO NOVA (Deep Space Cosmonaut)
    // -------------------------------------------------------------
    case 'astro_nova': {
      const astroGroup = new THREE.Group();
      const suitMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
      const goldVisorMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.95, roughness: 0.1 });

      const torso = fittedJersey(suitMat, 1.08, .86);
      astroGroup.add(torso);

      addNeck(astroGroup, suitMat, 0.96, 0.09, 0.18);

      // Life Support Backpack
      const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.2), suitMat);
      backpack.position.set(0, 0.72, -0.22);
      astroGroup.add(backpack);

      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(.30, 24, 20, .30, Math.PI * 1.4),
        new THREE.MeshStandardMaterial({color: 0xe1e4e4, roughness: .45, side: THREE.DoubleSide}),
      );
      helmet.position.set(0, 1.18, -.07);
      helmet.rotation.y = -Math.PI / 4;
      const face = buildAthleteHead(skinMat, '#594743', 'buzz');
      face.position.z = .054;
      astroGroup.add(helmet, face);

      addAthleticGlutes(astroGroup, suitMat, 0.5, 0.3, 0.4);
      addArms(astroGroup, suitMat, suitMat, suitMat);
      addLegsAndSneakers(astroGroup, suitMat, suitMat, goldMat);

      root.add(astroGroup);
      break;
    }

    // -------------------------------------------------------------
    // 9. SLIME GOO (Translucent Gel Golem)
    // -------------------------------------------------------------
    case 'slime_goo': {
      const slimeGroup = new THREE.Group();
      const slimeMat = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        roughness: 0.1,
        transparent: true,
        opacity: 0.88,
        emissive: 0x059669,
        emissiveIntensity: 0.3,
      });

      const blob = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 18), slimeMat);
      blob.position.set(0, 0.75, 0);
      blob.scale.set(1.1, 1.2, 0.9);
      slimeGroup.add(blob);

      addNeck(slimeGroup, slimeMat, 0.88, 0.09, 0.16);

      addCartoonEyes(slimeGroup, 1.05, 0.28, 0.2, 0.08);
      addVisibleMouth(slimeGroup, .955, .333, 0x143e33);

      addAthleticGlutes(slimeGroup, slimeMat, 0.48, 0.28, 0.4);
      addArms(slimeGroup, slimeMat, slimeMat, slimeMat);
      addLegsAndSneakers(slimeGroup, slimeMat, slimeMat, slimeMat);

      root.add(slimeGroup);
      break;
    }

    // -------------------------------------------------------------
    // 10. SKULLY CROSSBONES (Skeleton Street Baller)
    // -------------------------------------------------------------
    case 'skully_bones': {
      const skullyGroup = new THREE.Group();
      const boneMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
      const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });

      // Ribcage
      const ribs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.24), boneMat);
      ribs.position.set(0, 0.65, 0);
      skullyGroup.add(ribs);

      addNeck(skullyGroup, boneMat, 0.92, 0.075, 0.18);

      // Skull
      const skull = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.3), boneMat);
      skull.position.set(0, 1.18, 0);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.22), boneMat);
      jaw.position.set(0, 0.98, 0.04);
      const bandana = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.32), redMat);
      bandana.position.set(0, 1.3, 0);
      skullyGroup.add(skull, jaw, bandana);

      // Dark eye sockets
      [-0.08, 0.08].forEach((x) => {
        const socket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), blackMat);
        socket.position.set(x, 1.18, 0.16);
        skullyGroup.add(socket);
      });

      addAthleticGlutes(skullyGroup, blackMat);
      addArms(skullyGroup, boneMat, redMat, redMat);
      addLegsAndSneakers(skullyGroup, boneMat, redMat, whiteMat);

      root.add(skullyGroup);
      break;
    }

    // -------------------------------------------------------------
    // DEFAULT DIVERSE FALLBACK FOR REMAINING ARCHETYPES
    // -------------------------------------------------------------
    default: {
      const genericGroup = new THREE.Group();
      const jerseyMat = new THREE.MeshStandardMaterial({ color: charDef.avatarColor || 0x2563eb });
      const capMat = new THREE.MeshStandardMaterial({ color: charDef.capColor || 0xef4444 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const bareheaded = archetype === 'maya' || archetype === 'cyber_ronin';

      const torso = fittedJersey(jerseyMat, archetype === 'maya' ? .96 : 1);
      genericGroup.add(torso);

      addNeck(genericGroup, skinMat, 0.92, 0.08, 0.18);

      const head = buildAthleteHead(skinMat, archetype === 'cyber_ronin' ? '#201d29' : '#342721',
        archetype === 'maya' ? 'afro' : archetype === 'cyber_ronin' ? 'spiky' : 'buzz');
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
        capMat
      );
      cap.position.set(0, 1.27, -.04);
      cap.scale.set(.9,.78,.90);
      genericGroup.add(head);
      if (!bareheaded) genericGroup.add(cap);
      else {
        cap.geometry.dispose();
        const collar = new THREE.Mesh(new THREE.TorusGeometry(.095,.015,12,32), capMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0,.91,0);
        genericGroup.add(collar);
        const stripePath = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-.15, .051, .119), new THREE.Vector3(-.075, .077, .162),
          new THREE.Vector3(.02, .104, .181), new THREE.Vector3(.15, .135, .157),
        ]);
        const inset = new THREE.Mesh(new THREE.TubeGeometry(stripePath, 14, .012, 6, false), whiteMat);
        torso.add(inset);
        const badge = new THREE.Mesh(new THREE.CircleGeometry(.045,24), capMat);
        badge.position.set(.097,.161,.161);
        badge.rotation.y = .28;
        torso.add(badge);
      }

      addHumanPelvis(genericGroup, pantsMat);
      addArms(genericGroup, skinMat, jerseyMat, jerseyMat, true);
      addLegsAndSneakers(genericGroup, skinMat, whiteMat, capMat, .22, pantsMat);

      root.add(genericGroup);
      break;
    }
  }

  return root;
}

/**
 * Builds custom player mesh for the full screen Character Customizer with high visual fidelity.
 */
export function buildCustomizablePlayerMesh(
  charDef: CharacterDef,
  customization?: CharacterCustomization
): THREE.Group {
  const custom = customization || DEFAULT_CUSTOMIZATION;
  const root = new THREE.Group();
  root.name = `custom-player-${charDef.id}`;

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: custom.skinColor || charDef.skinColor,
    roughness: 0.57,
    sheen: 0.18,
    sheenColor: new THREE.Color(0xa77355),
    sheenRoughness: 0.8,
  });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.85,
  });

  const creature = custom.creatureArchetype || custom.archetype;
  const bodyGroup = new THREE.Group();

  // Custom Jersey Texture
  const jerseyTex = createSafeCanvasTexture(256, 256, (ctx) => {
    const pattern = custom.shirtPattern || 'split';
    const c1 = custom.shirtColor || '#2563EB';
    const c2 = custom.shirtSecondaryColor || '#EF4444';

    if (pattern === 'solid' || pattern === 'logo') {
      ctx.fillStyle = c1;
      ctx.fillRect(0, 0, 256, 256);
    } else if (pattern === 'split') {
      ctx.fillStyle = c1;
      ctx.fillRect(0, 0, 128, 256);
      ctx.fillStyle = c2;
      ctx.fillRect(128, 0, 128, 256);
    } else if (pattern === 'striped') {
      for (let x = 0; x < 256; x += 32) {
        ctx.fillStyle = (x / 32) % 2 === 0 ? c1 : c2;
        ctx.fillRect(x, 0, 32, 256);
      }
    } else if (pattern === 'checker' || pattern === 'hoops' || pattern === 'drip') {
      ctx.fillStyle = c1;
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = c2;
      if (pattern === 'checker') {
        for (let row = 0; row < 8; row++) for (let column = row % 2; column < 8; column += 2) {
          ctx.fillRect(column * 32, row * 32, 32, 32);
        }
      } else if (pattern === 'hoops') {
        for (let y = 20; y < 256; y += 58) ctx.fillRect(0, y, 256, 22);
      } else {
        ctx.fillRect(0, 0, 256, 42);
        for (let x = 0; x < 256; x += 19) {
          const height = 40 + ((x * 17) % 51);
          ctx.beginPath();
          ctx.roundRect(x, 31, 14, height, 7);
          ctx.fill();
        }
      }
    } else {
      ctx.fillStyle = c1;
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.moveTo(0, 256);
      ctx.lineTo(128, 100);
      ctx.lineTo(256, 256);
      ctx.fill();
    }

    // The broad ink panels read at court distance, while the weave and stitching
    // give the same jersey surface detail in the Studio close-up.
    for (let y = 1; y < 256; y += 4) {
      ctx.fillStyle = y % 8 === 1 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.10)';
      for (let x = y % 8; x < 256; x += 8) ctx.fillRect(x, y, 3, 1);
    }
    ctx.fillStyle = 'rgba(12,18,30,.40)';
    ctx.fillRect(0, 10, 256, 5);
    ctx.fillRect(0, 233, 256, 7);
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(0, 237);
    ctx.lineTo(256, 237);
    ctx.stroke();
    ctx.setLineDash([]);

    // Centered Jersey Number
    const num = custom.jerseyNumber ?? 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#182538';
    ctx.strokeText(`${num}`, 128, 140);
    ctx.fillText(`${num}`, 128, 140);
    ctx.font = 'bold 55px sans-serif';
    for (const seamX of [0, 256]) {
      ctx.strokeText(`${num}`, seamX, 136);
      ctx.fillText(`${num}`, seamX, 136);
    }
    const name = custom.jerseyName?.trim().slice(0, 14).toUpperCase();
    if (name) {
      ctx.font = '700 18px sans-serif';
      ctx.lineWidth = 2.5;
      for (const x of [0, 128, 256]) {
        ctx.strokeText(name, x, 87, 102);
        ctx.fillText(name, x, 87, 102);
      }
    }
  });
  if (custom.shirtPattern === 'logo' && custom.shirtLogo?.startsWith('data:image/png;base64,')) {
    const image = new Image();
    image.onload = () => {
      const canvas = jerseyTex.image as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      if (!ctx || !image.width || !image.height) return;
      const scale = Math.min(102 / image.width, 88 / image.height);
      const w = image.width * scale, h = image.height * scale;
      ctx.fillStyle = custom.shirtColor || '#2563EB';
      ctx.fillRect(68, 96, 120, 98);
      ctx.drawImage(image, 128 - w / 2, 145 - h / 2, w, h);
      jerseyTex.needsUpdate = true;
    };
    image.src = custom.shirtLogo;
  }
  jerseyTex.colorSpace = THREE.SRGBColorSpace;

  const weave = makeFabricHeightMap('knit');
  const jerseyMat = new THREE.MeshPhysicalMaterial({
    map: jerseyTex, roughness: 0.77, bumpMap: weave, bumpScale: 0.017,
    sheen: 0.24, sheenRoughness: 0.8,
  });
  const dressCreature = (model: THREE.Group) => {
    let chest: THREE.Mesh | undefined;
    let area=0;
    const torso = model.getObjectByName('torsoMesh') ?? model.children[0];
    torso?.traverse((object)=>{
      if (!(object instanceof THREE.Mesh) || object.position.y < .52 || object.position.y >= .92) return;
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      if (size.x*size.y<=area || size.x<.21) return;
      area=size.x*size.y;
      chest=object;
    });
    if (!chest || !torso) return;
    const bounds = new THREE.Box3().setFromObject(chest);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    chest.material = jerseyMat;
    if (custom.shirtPattern === 'logo' && custom.shirtLogo) {
      const crest = new THREE.Mesh(new THREE.PlaneGeometry(size.x*.54, size.y*.52), jerseyMat);
      crest.position.copy(torso.worldToLocal(new THREE.Vector3(center.x,center.y,Math.max(bounds.max.z+.009,.21))));
      torso.add(crest);
    }
  };
  const rosterCreatures = new Set(['blocky','fang_wolf','arcade_bot','magma_rex','slime_goo','skully_bones']);
  if (creature === 'athlete' && rosterCreatures.has(charDef.archetype)) {
    const rosterModel = buildCharacterMesh(charDef);
    dressCreature(rosterModel);
    return rosterModel;
  }
  const sleeveMat = new THREE.MeshStandardMaterial({ color: custom.shirtColor || 0x2563eb, roughness: 0.73, bumpMap: weave, bumpScale: 0.014 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: custom.pantsColor || 0x1e293b, roughness: 0.6 });
  const shoesMat = new THREE.MeshStandardMaterial({ color: custom.shoesColor || 0xf8fafc, roughness: 0.4 });
  const trimMat = new THREE.MeshStandardMaterial({ color: custom.shirtSecondaryColor || 0xef4444 });

  // -----------------------------------------------------------------
  // 1. CYBER MECHA CREATURE FORM
  // -----------------------------------------------------------------
  if (creature === 'mecha') {
    const metalMat = new THREE.MeshStandardMaterial({
      color: custom.shirtColor || 0x334155,
      metalness: 0.85,
      roughness: 0.25,
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.3,
    });
    const reactorCoreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    // Sculpted Angular Mecha Torso
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torsoMesh';

    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.34, 0.30), metalMat);
    chestPlate.position.set(0, 0.72, 0);
    chestPlate.castShadow = true;

    const waistPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.18, 12), darkMetal);
    waistPiston.position.set(0, 0.48, 0);

    // Glowing Arc Reactor in Center of Chest
    const reactorHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 16), darkMetal);
    reactorHousing.rotation.x = Math.PI / 2;
    reactorHousing.position.set(0, 0.72, 0.16);
    const reactorGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.035, 16), reactorCoreMat);
    reactorGlow.rotation.x = Math.PI / 2;
    reactorGlow.position.set(0, 0.72, 0.162);
    torsoGroup.add(chestPlate, waistPiston, reactorHousing, reactorGlow);
    addNeck(torsoGroup, darkMetal, 0.94, 0.09, 0.18);
    bodyGroup.add(torsoGroup);

    // Mecha Head with Glowing Visor Strip
    const headGroup = new THREE.Group();
    headGroup.name = 'headMesh';
    headGroup.position.set(0, 1.15, 0);

    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.40, 0.40), metalMat);
    helmet.castShadow = true;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.06), visorMat);
    visor.position.set(0, 0.04, 0.205);
    const antennaL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.18, 8), darkMetal);
    antennaL.position.set(-0.20, 0.24, 0);
    const antennaR = antennaL.clone();
    antennaR.position.set(0.20, 0.24, 0);
    headGroup.add(helmet, visor, antennaL, antennaR);
    bodyGroup.add(headGroup);

    // Mecha Arms with Heavy Armored Pauldrons
    const leftArm = new THREE.Group();
    leftArm.name = 'leftArm';
    leftArm.position.set(-0.30, 0.78, 0);

    const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.22), metalMat);
    pauldronL.position.set(-0.02, 0.04, 0);
    pauldronL.rotation.z = -0.18;
    const limbL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.36, 10), darkMetal);
    limbL.position.set(-0.02, -0.20, 0.02);
    const handL = buildArticulatedHand(metalMat, false);
    handL.position.set(0, -0.18, 0);
    limbL.add(handL);
    leftArm.add(pauldronL, limbL);

    const rightArm = new THREE.Group();
    rightArm.name = 'rightArm';
    rightArm.position.set(0.30, 0.78, 0);

    const pauldronR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.22), metalMat);
    pauldronR.position.set(0.02, 0.04, 0);
    pauldronR.rotation.z = 0.18;
    const limbR = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.36, 10), darkMetal);
    limbR.position.set(0.02, -0.20, 0.02);
    const handR = buildArticulatedHand(metalMat, true);
    handR.position.set(0, -0.18, 0);
    handR.name = 'strikeHand';
    limbR.add(handR);
    rightArm.add(pauldronR, limbR);

    bodyGroup.add(leftArm, rightArm);

    // Pelvis & Robotic Legs
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.28), darkMetal);
    pelvis.position.set(0, 0.38, 0);
    bodyGroup.add(pelvis);
    addAthleticGlutes(bodyGroup, darkMetal);
    addLegsAndSneakers(bodyGroup, darkMetal, metalMat, reactorCoreMat, 0.24);
  }

  // -----------------------------------------------------------------
  // 2. DIRE WOLF / BEAST CREATURE FORM
  // -----------------------------------------------------------------
  else if (creature === 'wolf') {
    const furColor = custom.hairColor || '#475569';
    const furHeight = makeFabricHeightMap('fur');
    const furMat = new THREE.MeshPhysicalMaterial({
      color: furColor, roughness: 0.89, bumpMap: furHeight, bumpScale: 0.024,
      sheen: 0.34, sheenColor: new THREE.Color(furColor).multiplyScalar(2.4),
    });
    const innerEarMat = new THREE.MeshStandardMaterial({ color: 0x87685f, roughness: 0.84 });
    const wolfEyeMat = new THREE.MeshPhysicalMaterial({ color: 0xb58732, roughness: 0.27, clearcoat: 0.65 });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.3 });

    // Sculpted Beast Torso with Chest Fur Crest
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torsoMesh';

    const beastChest = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), furMat);
    beastChest.scale.set(0.27, 0.22, 0.174);
    beastChest.position.set(0, 0.72, 0);
    const ruffMat = furMat.clone();
    ruffMat.color.lerp(new THREE.Color(0xb7b9b2), 0.38);
    const tuftGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0, -0.095), new THREE.Vector2(0.068, -0.05),
      new THREE.Vector2(0.059, 0.014), new THREE.Vector2(0.029, 0.063), new THREE.Vector2(0, 0.11),
    ], 16);
    for (const side of [-1, 0, 1]) {
      const tuft = new THREE.Mesh(tuftGeo, ruffMat);
      tuft.position.set(side * 0.083, 0.73 + Math.abs(side) * 0.045, 0.143);
      tuft.rotation.set(2.77, 0, side * 0.34);
      torsoGroup.add(tuft);
    }

    const beastWaist = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), furMat);
    beastWaist.scale.set(0.207, 0.116, 0.141);
    beastWaist.position.set(0, 0.48, 0);
    torsoGroup.add(beastChest, beastWaist);
    bodyGroup.add(torsoGroup);

    // Lupine Head with Canine Snout, Fangs, Ears & Piercing Eyes
    const headGroup = new THREE.Group();
    headGroup.name = 'headMesh';
    headGroup.position.set(0, 1.15, 0);

    const wolfSkull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 20), furMat);
    wolfSkull.scale.set(1.0, 1.05, 1.15);

    // Canine Snout & Black Nose
    const snout = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), ruffMat);
    snout.scale.set(0.112, 0.074, 0.149);
    snout.position.set(0, -0.055, 0.211);
    const wolfNose = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), noseMat);
    wolfNose.position.set(0, 0.02, 0.31);

    // Glowing Beast Eyes
    [-0.09, 0.09].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), wolfEyeMat);
      eye.position.set(ex, 0.06, 0.253);
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.038, 0.02), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      pupil.position.set(ex, 0.06, 0.286);
      headGroup.add(eye, pupil);
    });
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(tuftGeo, ruffMat);
      cheek.position.set(side * 0.197, -0.09, 0.109);
      cheek.rotation.z = side * 2.25;
      headGroup.add(cheek);
    }

    // Pointed Wolf Ears with Pink Inner Lining
    const earGeo = new THREE.ConeGeometry(0.075, 0.19, 4);
    const earL = new THREE.Mesh(earGeo, furMat);
    earL.position.set(-0.16, 0.22, 0.02);
    earL.rotation.z = -0.3;
    const innerL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), innerEarMat);
    innerL.position.set(-0.16, 0.22, 0.035);
    innerL.rotation.z = -0.3;

    const earR = new THREE.Mesh(earGeo, furMat);
    earR.position.set(0.16, 0.22, 0.02);
    earR.rotation.z = 0.3;
    const innerR = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), innerEarMat);
    innerR.position.set(0.16, 0.22, 0.035);
    innerR.rotation.z = 0.3;

    headGroup.add(wolfSkull, snout, wolfNose, buildWolfJaw(ruffMat), earL, innerL, earR, innerR);
    bodyGroup.add(headGroup);

    // Bushy Lupine Tail
    const tail = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.038, -0.22), new THREE.Vector2(0.089, -0.095),
      new THREE.Vector2(0.096, 0.028), new THREE.Vector2(0.068, 0.13), new THREE.Vector2(0, 0.23),
    ], 16), furMat);
    tail.position.set(0, 0.42, -0.28);
    tail.rotation.x = -0.7;
    bodyGroup.add(tail);

    // Wolf Arms with Furry Deltoids & Claws
    const leftArm = new THREE.Group();
    leftArm.name = 'leftArm';
    leftArm.position.set(-0.28, 0.77, 0);

    const furDeltoidL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), furMat);
    furDeltoidL.position.set(-0.02, 0.02, 0);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.28, 10), furMat);
    armL.position.set(-0.02, -0.21, 0.03);
    const handL = buildArticulatedHand(furMat, false);
    handL.position.set(0, -0.14, 0);
    armL.add(handL);
    leftArm.add(furDeltoidL, armL);

    const rightArm = new THREE.Group();
    rightArm.name = 'rightArm';
    rightArm.position.set(0.28, 0.77, 0);

    const furDeltoidR = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), furMat);
    furDeltoidR.position.set(0.02, 0.02, 0);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.28, 10), furMat);
    armR.position.set(0.02, -0.21, 0.03);
    const handR = buildArticulatedHand(furMat, true);
    handR.position.set(0, -0.14, 0);
    handR.name = 'strikeHand';
    armR.add(handR);
    rightArm.add(furDeltoidR, armR);

    bodyGroup.add(leftArm, rightArm);

    // Beast Shorts & Legs
    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.28), pantsMat);
    shorts.position.set(0, 0.38, 0);
    bodyGroup.add(shorts);
    addAthleticGlutes(bodyGroup, pantsMat);
    addLegsAndSneakers(bodyGroup, furMat, shoesMat, trimMat, 0.24);
  }

  // -----------------------------------------------------------------
  // 3. OBSIDIAN PLASMA GOLEM CREATURE FORM
  // -----------------------------------------------------------------
  else if (creature === 'golem') {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.15,
    });
    const magmaCoreMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.2,
      metalness: 0.7,
    });

    // Chiseled Rock Torso with Glowing Magma Fissure Core
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torsoMesh';

    const rockChest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.36, 0.32), rockMat);
    rockChest.position.set(0, 0.72, 0);

    // Magma fissure line
    const fissure = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.30, 0.04), magmaCoreMat);
    fissure.position.set(0, 0.72, 0.17);
    fissure.rotation.z = 0.2;

    const rockWaist = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.28), rockMat);
    rockWaist.position.set(0, 0.48, 0);

    torsoGroup.add(rockChest, fissure, rockWaist);
    bodyGroup.add(torsoGroup);

    // Chiseled Stone Titan Head with Molten Eyes and Basalt Horns
    const headGroup = new THREE.Group();
    headGroup.name = 'headMesh';
    headGroup.position.set(0, 1.15, 0);

    const stoneSkull = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.36), rockMat);

    // Molten Magma Eye Slits
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.04), magmaCoreMat);
    eyeL.position.set(-0.09, 0.04, 0.19);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.04), magmaCoreMat);
    eyeR.position.set(0.09, 0.04, 0.19);

    // Basalt Stone Horns
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), crystalMat);
    hornL.position.set(-0.16, 0.24, 0.05);
    hornL.rotation.z = -0.4;
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), crystalMat);
    hornR.position.set(0.16, 0.24, 0.05);
    hornR.rotation.z = 0.4;

    headGroup.add(stoneSkull, eyeL, eyeR, hornL, hornR);
    addVisibleMouth(headGroup, -.092, .213);
    bodyGroup.add(headGroup);

    // Golem Arms with Heavy Crystalline Boulder Shoulders
    const leftArm = new THREE.Group();
    leftArm.name = 'leftArm';
    leftArm.position.set(-0.32, 0.78, 0);

    const boulderL = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13), crystalMat);
    boulderL.position.set(-0.02, 0.05, 0);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.30, 0.13), rockMat);
    armL.position.set(-0.02, -0.21, 0.02);
    const handL = buildArticulatedHand(rockMat, false);
    handL.position.set(0, -0.15, 0);
    armL.add(handL);
    leftArm.add(boulderL, armL);

    const rightArm = new THREE.Group();
    rightArm.name = 'rightArm';
    rightArm.position.set(0.32, 0.78, 0);

    const boulderR = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13), crystalMat);
    boulderR.position.set(0.02, 0.05, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.30, 0.13), rockMat);
    armR.position.set(0.02, -0.21, 0.02);
    const handR = buildArticulatedHand(rockMat, true);
    handR.position.set(0, -0.15, 0);
    handR.name = 'strikeHand';
    armR.add(handR);
    rightArm.add(boulderR, armR);

    bodyGroup.add(leftArm, rightArm);

    // Rock Pelvis & Legs
    const rockPelvis = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.30), rockMat);
    rockPelvis.position.set(0, 0.38, 0);
    bodyGroup.add(rockPelvis);
    addAthleticGlutes(bodyGroup, rockMat);
    addLegsAndSneakers(bodyGroup, rockMat, crystalMat, magmaCoreMat, 0.26);
  }

  // -----------------------------------------------------------------
  // 4. RETRO ARCADE BOT CREATURE FORM
  // -----------------------------------------------------------------
  else if (creature === 'bot') {
    const chassisMat = new THREE.MeshStandardMaterial({
      color: custom.shirtColor || 0x0284c7,
      roughness: 0.3,
      metalness: 0.6,
    });
    const darkChassis = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.5 });
    const screenGlowMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    // Arcade Cabinet Chassis Torso
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torsoMesh';

    const cabinet = new THREE.Mesh(new RoundedBoxGeometry(0.50, 0.38, 0.28, 3, 0.042), chassisMat);
    cabinet.position.set(0, 0.72, 0);

    // Coin slot & Speaker grill lines
    const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), darkChassis);
    coinSlot.position.set(0, 0.65, 0.15);
    const ledMatrix = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.02), ledMat);
    ledMatrix.position.set(0, 0.80, 0.15);
    const vent = new THREE.BoxGeometry(0.105, 0.012, 0.012);
    for (const side of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        const grille = new THREE.Mesh(vent, darkChassis);
        grille.position.set(side * 0.153, 0.62 + row * 0.026, 0.142);
        torsoGroup.add(grille);
      }
    }

    const waistPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12), darkChassis);
    waistPivot.position.set(0, 0.48, 0);

    const neckGimbal = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.12, 0.17, 24), darkChassis);
    neckGimbal.position.set(0, 0.965, -0.018);
    const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.091, 0.013, 8, 28).rotateX(Math.PI / 2), chassisMat);
    neckRing.position.set(0, 0.991, -0.018);
    torsoGroup.add(cabinet, coinSlot, ledMatrix, waistPivot, neckGimbal, neckRing);
    bodyGroup.add(torsoGroup);

    // Retro CRT Monitor Head with Pixel Face & Antenna
    const headGroup = new THREE.Group();
    headGroup.name = 'headMesh';
    headGroup.position.set(0, 1.15, 0);

    const crtCase = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.38, 0.36, 3, 0.06), chassisMat);
    const bezel = new THREE.Mesh(new RoundedBoxGeometry(0.353, 0.288, 0.022, 3, 0.011), darkChassis);
    bezel.position.z = 0.18;
    const crtScreen = new THREE.Mesh(new RoundedBoxGeometry(0.313, 0.246, 0.018, 3, 0.009), new THREE.MeshStandardMaterial({
      color: 0x142c2b, roughness: 0.23, metalness: 0.28,
    }));
    crtScreen.position.set(0, 0, 0.193);

    // Pixel Eyes & Smile
    const eyePixelL = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), screenGlowMat);
    eyePixelL.position.set(-0.08, 0.03, 0.204);
    const eyePixelR = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), screenGlowMat);
    eyePixelR.position.set(0.08, 0.03, 0.204);
    const mouthPixel = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.03), screenGlowMat);
    mouthPixel.position.set(0, -0.06, 0.204);

    // Top Spring Antenna with Glowing Orb
    const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), darkChassis);
    antennaStem.position.set(0, 0.26, 0);
    const antennaOrb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), ledMat);
    antennaOrb.position.set(0, 0.36, 0);

    headGroup.add(crtCase, bezel, crtScreen, eyePixelL, eyePixelR, mouthPixel, antennaStem, antennaOrb);
    bodyGroup.add(headGroup);

    // Arcade Arms with Chrome Servo Joint Shoulders
    const leftArm = new THREE.Group();
    leftArm.name = 'leftArm';
    leftArm.position.set(-0.30, 0.77, 0);

    const servoL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12), darkChassis);
    servoL.rotation.z = Math.PI / 2;
    servoL.position.set(-0.02, 0.02, 0);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.26, 10), chassisMat);
    armL.position.set(-0.02, -0.21, 0.02);
    const handL = buildArticulatedHand(chassisMat, false);
    handL.position.set(0, -0.13, 0);
    armL.add(handL);
    leftArm.add(servoL, armL);

    const rightArm = new THREE.Group();
    rightArm.name = 'rightArm';
    rightArm.position.set(0.30, 0.77, 0);

    const servoR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12), darkChassis);
    servoR.rotation.z = Math.PI / 2;
    servoR.position.set(0.02, 0.02, 0);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.26, 10), chassisMat);
    armR.position.set(0.02, -0.21, 0.02);
    const handR = buildArticulatedHand(chassisMat, true);
    handR.position.set(0, -0.13, 0);
    handR.name = 'strikeHand';
    armR.add(handR);
    rightArm.add(servoR, armR);

    bodyGroup.add(leftArm, rightArm);

    // Bot Chassis Base & Legs
    const botPelvis = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.26), darkChassis);
    botPelvis.position.set(0, 0.38, 0);
    bodyGroup.add(botPelvis);
    addAthleticGlutes(bodyGroup, darkChassis);
    addLegsAndSneakers(bodyGroup, chassisMat, darkChassis, ledMat, 0.24);
  }

  // -----------------------------------------------------------------
  // 5. SHADOW SHINOBI CREATURE FORM
  // -----------------------------------------------------------------
  else if (creature === 'shadow') {
    const shadowMat = new THREE.MeshStandardMaterial({
      color: custom.shirtColor || 0x0f172a,
      roughness: 0.35,
      metalness: 0.4,
    });
    const purpleGlow = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const darkCloth = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });

    // Armored Shadow Shinobi Torso with Crossed Sash
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torsoMesh';

    const chestArmor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.34, 0.28), shadowMat);
    chestArmor.position.set(0, 0.72, 0);

    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.30), purpleGlow);
    sash.position.set(0, 0.72, 0);
    sash.rotation.z = 0.55;

    const waistWrap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.26), darkCloth);
    waistWrap.position.set(0, 0.48, 0);

    torsoGroup.add(chestArmor, sash, waistWrap);
    bodyGroup.add(torsoGroup);

    // Shinobi Cowl Head with Glowing Spectral Purple Eyes
    const headGroup = new THREE.Group();
    headGroup.name = 'headMesh';
    headGroup.position.set(0, 1.15, 0);

    const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 18), darkCloth);

    // Glowing Slit Eyes
    [-0.08, 0.08].forEach((xOff) => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.018, 0.02), purpleGlow);
      eye.position.set(xOff, 0.04, 0.245);
      headGroup.add(eye);
    });

    // Fluttering Shadow Scarf Ribbon
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.48), purpleGlow);
    scarf.position.set(0.12, -0.06, -0.22);
    scarf.rotation.x = -0.3;
    scarf.rotation.y = 0.2;

    headGroup.add(cowl, scarf);
    addVisibleMouth(headGroup, -.091, .231, 0xa489ae);
    bodyGroup.add(headGroup);

    // Curved Demon Pauldrons & Armored Limbs
    const leftArm = new THREE.Group();
    leftArm.name = 'leftArm';
    leftArm.position.set(-0.28, 0.77, 0);
    const pauldronL = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.18, 4), shadowMat);
    pauldronL.position.set(-0.02, 0.06, 0);
    pauldronL.rotation.z = -0.4;
    const trimL = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 12), goldMat);
    trimL.position.set(-0.02, 0.02, 0);
    trimL.rotation.x = Math.PI / 2;
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.046, 0.26, 10), darkCloth);
    armL.position.set(-0.02, -0.20, 0.02);
    const handL = buildArticulatedHand(shadowMat, false);
    handL.position.set(0, -0.13, 0);
    armL.add(handL);
    leftArm.add(pauldronL, trimL, armL);

    const rightArm = new THREE.Group();
    rightArm.name = 'rightArm';
    rightArm.position.set(0.28, 0.77, 0);
    const pauldronR = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.18, 4), shadowMat);
    pauldronR.position.set(0.02, 0.06, 0);
    pauldronR.rotation.z = 0.4;
    const trimR = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 12), goldMat);
    trimR.position.set(0.02, 0.02, 0);
    trimR.rotation.x = Math.PI / 2;
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.046, 0.26, 10), darkCloth);
    armR.position.set(0.02, -0.20, 0.02);
    const handR = buildArticulatedHand(shadowMat, true);
    handR.position.set(0, -0.13, 0);
    handR.name = 'strikeHand';
    armR.add(handR);
    rightArm.add(pauldronR, trimR, armR);

    bodyGroup.add(leftArm, rightArm);

    // Shinobi Hakama Pants & Tabi Boots
    const hakama = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.28), darkCloth);
    hakama.position.set(0, 0.38, 0);
    bodyGroup.add(hakama);
    addAthleticGlutes(bodyGroup, darkCloth);
    addLegsAndSneakers(bodyGroup, darkCloth, shadowMat, purpleGlow, 0.22);
  }

  // -----------------------------------------------------------------
  // 6. COSMIC ALIEN / STARLORD CREATURE FORM
  // -----------------------------------------------------------------
  // -----------------------------------------------------------------
  // 6. COSMIC STALORD ALIEN CREATURE FORM
  // -----------------------------------------------------------------
  else if (creature === 'alien') {
    const alienSkinMat = new THREE.MeshStandardMaterial({
      color: custom.skinColor || 0x22d3ee,
      roughness: 0.15,
      metalness: 0.2,
    });
    const suitMat = new THREE.MeshStandardMaterial({
      color: custom.shirtColor || 0x4c1d95,
      metalness: 0.7,
      roughness: 0.25,
    });
    const starGlow = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ringGlow = new THREE.MeshBasicMaterial({ color: 0xec4899 });

    // Sleek Biomechanical Suit Torso
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torsoMesh';

    const bioChest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.26), suitMat);
    bioChest.position.set(0, 0.72, 0);

    // Glowing Star Core on Chest
    const coreOrb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 14), starGlow);
    coreOrb.position.set(0, 0.74, 0.14);

    const bioWaist = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.24), suitMat);
    bioWaist.position.set(0, 0.48, 0);

    torsoGroup.add(bioChest, coreOrb, bioWaist);
    bodyGroup.add(torsoGroup);

    // Elongated Alien Cranium with Dual Antennas and Triple Celestial Eyes
    const headGroup = new THREE.Group();
    headGroup.name = 'headMesh';
    headGroup.position.set(0, 1.18, 0);

    const craniumGeo = new THREE.SphereGeometry(0.24, 24, 20);
    craniumGeo.scale(0.9, 1.35, 1.55);
    const cranium = new THREE.Mesh(craniumGeo, alienSkinMat);
    cranium.rotation.x = -0.18;
    headGroup.add(cranium);

    // Antennae with glowing orb tips
    [-0.12, 0.12].forEach((xOff) => {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.28, 8), suitMat);
      ant.position.set(xOff, 0.32, -0.05);
      ant.rotation.z = xOff < 0 ? 0.3 : -0.3;
      ant.rotation.x = -0.2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), starGlow);
      bulb.position.set(xOff * 1.5, 0.45, -0.08);
      headGroup.add(ant, bulb);
    });

    // Triple Eyes (Left, Right, and Third Forehead Eye)
    [-0.08, 0.08].forEach((xOff) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), starGlow);
      eye.position.set(xOff, 0.02, 0.22);
      headGroup.add(eye);
    });
    const thirdEye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 12), starGlow);
    thirdEye.position.set(0, 0.14, 0.22);
    headGroup.add(thirdEye);
    addVisibleMouth(headGroup, -.09, .232, 0x382252);

    bodyGroup.add(headGroup);

    // Levitating Orbiting Energy Rings over Shoulders
    const leftArm = new THREE.Group();
    leftArm.name = 'leftArm';
    leftArm.position.set(-0.28, 0.77, 0);
    const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.024, 8, 24), ringGlow);
    ringL.rotation.x = Math.PI / 2;
    ringL.position.set(-0.02, 0.08, 0);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.26, 12), alienSkinMat);
    armL.position.set(-0.02, -0.20, 0.02);
    const handL = buildArticulatedHand(alienSkinMat, false);
    handL.position.set(0, -0.13, 0);
    armL.add(handL);
    leftArm.add(ringL, armL);

    const rightArm = new THREE.Group();
    rightArm.name = 'rightArm';
    rightArm.position.set(0.28, 0.77, 0);
    const ringR = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.024, 8, 24), ringGlow);
    ringR.rotation.x = Math.PI / 2;
    ringR.position.set(0.02, 0.08, 0);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.26, 12), alienSkinMat);
    armR.position.set(0.02, -0.20, 0.02);
    const handR = buildArticulatedHand(alienSkinMat, true);
    handR.position.set(0, -0.13, 0);
    handR.name = 'strikeHand';
    armR.add(handR);
    rightArm.add(ringR, armR);

    bodyGroup.add(leftArm, rightArm);

    // Celestial Suit Pelvis & Hover Boots
    const alienPelvis = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.26), suitMat);
    alienPelvis.position.set(0, 0.38, 0);
    bodyGroup.add(alienPelvis);
    addAthleticGlutes(bodyGroup, suitMat);
    addLegsAndSneakers(bodyGroup, suitMat, ringGlow, starGlow, 0.22);
  }

  // -----------------------------------------------------------------
  // 8. BARNABY CARTOON DOGGO CREATURE FORM (Inspired by classic Dukey Dog!)
  // -----------------------------------------------------------------
  else if (creature === 'doggo') {
    const furMat = new THREE.MeshStandardMaterial({ color: custom.hairColor || 0xd97706, roughness: 0.7 });
    const muzzleMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torsoMesh';
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.28), furMat);
    chest.position.set(0, 0.72, 0);
    const chestRuff = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), muzzleMat);
    chestRuff.scale.set(1.2, 0.9, 0.5);
    chestRuff.position.set(0, 0.72, 0.14);
    torsoGroup.add(chest, chestRuff);
    bodyGroup.add(torsoGroup);

    // Hound Head with Floppy Ears & Snout
    const headGroup = new THREE.Group();
    headGroup.name = 'headMesh';
    headGroup.position.set(0, 1.18, 0);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 16), furMat);
    skull.scale.set(1, 1.1, 1.15);

    // Muzzle & Black Nose
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.18), muzzleMat);
    muzzle.position.set(0, -0.04, 0.16);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), noseMat);
    nose.position.set(0, 0.02, 0.26);

    // Floppy Canine Ears
    [-0.22, 0.22].forEach((xOff) => {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.065, 0.32, 12), furMat);
      ear.position.set(xOff, 0.02, 0.02);
      ear.rotation.z = xOff < 0 ? 0.35 : -0.35;
      ear.rotation.x = 0.2;
      headGroup.add(ear);
    });

    headGroup.add(skull, muzzle, nose, buildWolfJaw(furMat));
    addCartoonEyes(headGroup, 0.08, 0.18);
    bodyGroup.add(headGroup);

    // Wagging Dog Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.28, 10), furMat);
    tail.position.set(0, 0.45, -0.18);
    tail.rotation.x = -0.7;
    bodyGroup.add(tail);

    addArms(bodyGroup, furMat, sleeveMat, sleeveMat);
    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.26), pantsMat);
    shorts.position.set(0, 0.38, 0);
    bodyGroup.add(shorts);
    addLegsAndSneakers(bodyGroup, furMat, shoesMat, trimMat, 0.22);
  }

  // -----------------------------------------------------------------
  // 9. PYRO FLAME DRAGON CREATURE FORM (True Majestic Dragon!)
  // -----------------------------------------------------------------
  else if (creature === 'dragon') {
    const scaleMat = new THREE.MeshStandardMaterial({ color: custom.shirtColor || 0xd97706, roughness: 0.4 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.6 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torsoMesh';
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.30), scaleMat);
    chest.position.set(0, 0.72, 0);
    const bellyPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.30, 0.06), bellyMat);
    bellyPlate.position.set(0, 0.70, 0.14);
    torsoGroup.add(chest, bellyPlate);
    bodyGroup.add(torsoGroup);

    // Dragon Head with Snout, 4 Sweeping Horns & Ridge Spikes
    const headGroup = new THREE.Group();
    headGroup.name = 'headMesh';
    headGroup.position.set(0, 1.20, 0);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), scaleMat);
    skull.scale.set(1.0, 1.05, 1.35);

    // Dragon Snout with Nostrils
    const dragonSnout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.24), scaleMat);
    dragonSnout.position.set(0, -0.04, 0.20);

    // Sweeping Back Horns
    [-0.14, 0.14].forEach((xOff) => {
      const mainHorn = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.34, 12), hornMat);
      mainHorn.position.set(xOff, 0.22, -0.06);
      mainHorn.rotation.x = -0.5;
      mainHorn.rotation.z = xOff < 0 ? -0.35 : 0.35;

      const browSpike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.16, 8), hornMat);
      browSpike.position.set(xOff * 0.8, 0.12, 0.12);
      browSpike.rotation.x = -0.2;

      headGroup.add(mainHorn, browSpike);
    });

    headGroup.add(skull, dragonSnout);
    addVisibleMouth(headGroup, -.097, .32, 0x34201f);
    addCartoonEyes(headGroup, 0.06, 0.20, 0.16, 0.065, 0xd97706);
    bodyGroup.add(headGroup);

    // 3D Dragon Wings with Bone Struts
    [-0.32, 0.32].forEach((xOff) => {
      const wingGroup = new THREE.Group();
      wingGroup.position.set(xOff, 0.82, -0.16);

      const wingBone = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.015, 0.42, 8), hornMat);
      wingBone.rotation.z = xOff < 0 ? -0.8 : 0.8;

      const wingMembrane = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.02), scaleMat);
      wingMembrane.position.set(xOff < 0 ? -0.12 : 0.12, 0.05, 0);

      wingGroup.add(wingBone, wingMembrane);
      bodyGroup.add(wingGroup);
    });

    // Dragon Tail with Flame Tip
    const dragonTail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.45, 12), scaleMat);
    dragonTail.position.set(0, 0.42, -0.22);
    dragonTail.rotation.x = -0.8;
    const flameTip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 8), flameMat);
    flameTip.position.set(0, 0.22, -0.38);
    flameTip.rotation.x = -0.8;
    bodyGroup.add(dragonTail, flameTip);

    addArms(bodyGroup, scaleMat, sleeveMat, sleeveMat);
    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.26), pantsMat);
    shorts.position.set(0, 0.38, 0);
    bodyGroup.add(shorts);
    addLegsAndSneakers(bodyGroup, scaleMat, shoesMat, trimMat, 0.22);
  }

  // -----------------------------------------------------------------
  // 10. GLOOP BIO-GEL SLIME KING CREATURE FORM
  // -----------------------------------------------------------------
  else if (creature === 'slime') {
    const gelMat = new THREE.MeshStandardMaterial({
      color: custom.skinColor || 0x84cc16,
      transparent: true,
      opacity: 0.88,
      roughness: 0.1,
    });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xa3e635 });

    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torsoMesh';
    const gelTorso = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 18), gelMat);
    gelTorso.scale.set(1.1, 0.95, 0.85);
    gelTorso.position.set(0, 0.68, 0);

    // Floating Plasma Core Orb
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), coreMat);
    core.position.set(0, 0.68, 0);

    torsoGroup.add(gelTorso, core);
    bodyGroup.add(torsoGroup);

    // Amorphous Slime Head
    const headGroup = new THREE.Group();
    headGroup.name = 'headMesh';
    headGroup.position.set(0, 1.15, 0);

    const gelHead = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 18), gelMat);
    gelHead.scale.set(1.15, 1.0, 1.0);

    headGroup.add(gelHead);
    addCartoonEyes(headGroup, 0.02, 0.24);
    addVisibleMouth(headGroup, -.09, .243, 0x143e33);
    bodyGroup.add(headGroup);

    addArms(bodyGroup, gelMat, sleeveMat, sleeveMat);
    addLegsAndSneakers(bodyGroup, gelMat, shoesMat, trimMat, 0.22);
  }

  // -----------------------------------------------------------------
  // STYLIZED ATHLETE (SCULPTED ANATOMICAL ATHLETIC HUMAN)
  // -----------------------------------------------------------------
  else {
    // Sculpted Anatomical Athletic Torso (Broad athletic shoulders, tapered waist, pectoral sculpt)
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torsoMesh';

    const jersey = fittedJersey(jerseyMat);
    jersey.name = 'jerseyMesh';

    // Prominently visible anatomical neck column & athletic ribbed jersey collar
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.094, 0.18, 16), skinMat);
    neck.position.set(0, 0.98, 0);
    neck.name = 'neckMesh';

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.091, 0.012, 10, 28), trimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.913, 0);

    torsoGroup.add(jersey, neck, collar);
    bodyGroup.add(torsoGroup);

    const headGroup = buildAthleteHead(skinMat, custom.hairColor || '#342118', custom.hairStyle);
    const hair = headGroup.getObjectByName('sculptedHair');
    if (hair) hair.visible = !custom.hatType || custom.hatType === 'none';

    // Headgear
    if (custom.hatType === 'backwards_cap') {
      const hatMat = new THREE.MeshStandardMaterial({ color: custom.hatColor || 0xef4444 });
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
        hatMat
      );
      cap.position.set(0, 0.12, -0.025);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.18), hatMat);
      visor.position.set(0, 0.10, -0.16);
      headGroup.add(cap, visor);
    } else if (custom.hatType === 'crown') {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.22, 5), goldMat);
      crown.position.set(0, 0.30, 0);
      headGroup.add(crown);
    } else if (custom.hatType === 'headband') {
      const headband = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.03, 8, 20),
        new THREE.MeshStandardMaterial({ color: custom.hatColor || 0x06b6d4 })
      );
      headband.rotateX(Math.PI / 2);
      headband.position.set(0, 0.11, 0);
      headGroup.add(headband);
    }

    bodyGroup.add(headGroup);

    // Sunglasses & Chains
    if (custom.hasShades) {
      const shadesMat = new THREE.MeshStandardMaterial({ color: custom.shadesColor || 0x0f172a, transparent:true, opacity:.27, depthWrite:false });
      const shades = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.04), shadesMat);
      shades.position.set(0, .027, .252);
      headGroup.add(shades);
    }
    if (custom.hasGoldChain) {
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 20), goldMat);
      chain.rotateX(Math.PI / 2.3);
      chain.position.set(0, 0.84, 0.08);
      bodyGroup.add(chain);
    }


    // Anatomical Arms with Sculpted Deltoid Caps
    addArms(bodyGroup, skinMat, sleeveMat, sleeveMat, true);

    addHumanPelvis(bodyGroup, pantsMat);
    addLegsAndSneakers(bodyGroup, skinMat, shoesMat, trimMat, 0.22, pantsMat);
  }

  if (creature !== 'athlete') dressCreature(bodyGroup);

  // Attach all 12 accessories (sweatbands, beanies, crowns, etc.) and drip to ALL creature forms
  attachAccessories(bodyGroup, custom, 1.25);

  root.add(bodyGroup);
  return root;
}

export function buildSpectatorPerson(
  optionsOrSeed:
    | number
    | {
        shirtColor?: number | string;
        pantsColor?: number | string;
        skinColor?: number | string;
        hairColor?: number | string;
        hasHat?: boolean;
        cheering?: boolean;
      } = 0
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'spectatorPerson';

  let shirtColor: number | string = '#ef4444';
  let pantsColor: number | string = '#1e293b';
  let skinColor: number | string = '#f1c27d';
  let hairColor: number | string = '#451a03';
  let cheering = false;

  if (typeof optionsOrSeed === 'number') {
    const palette = [
      { shirt: '#ef4444', pants: '#1e293b', skin: '#f1c27d', hair: '#451a03' },
      { shirt: '#3b82f6', pants: '#334155', skin: '#8d5524', hair: '#09090b' },
      { shirt: '#10b981', pants: '#0f172a', skin: '#ffdbac', hair: '#d97706' },
      { shirt: '#f59e0b', pants: '#475569', skin: '#c68642', hair: '#1e293b' },
      { shirt: '#8b5cf6', pants: '#1e1b4b', skin: '#e0ac69', hair: '#7c2d12' },
    ];
    const item = palette[optionsOrSeed % palette.length];
    shirtColor = item.shirt;
    pantsColor = item.pants;
    skinColor = item.skin;
    hairColor = item.hair;
    cheering = optionsOrSeed % 2 === 1;
  } else if (optionsOrSeed) {
    if (optionsOrSeed.shirtColor !== undefined) shirtColor = optionsOrSeed.shirtColor;
    if (optionsOrSeed.pantsColor !== undefined) pantsColor = optionsOrSeed.pantsColor;
    if (optionsOrSeed.skinColor !== undefined) skinColor = optionsOrSeed.skinColor;
    if (optionsOrSeed.hairColor !== undefined) hairColor = optionsOrSeed.hairColor;
    if (optionsOrSeed.cheering !== undefined) cheering = optionsOrSeed.cheering;
  }

  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.5 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.6 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.7 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

  // 1. Torso
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'torsoMesh';
  const body = fittedJersey(shirtMat, .94, .73);
  body.name = 'jerseyMesh';
  torsoGroup.add(body);
  grp.add(torsoGroup);
  addHumanPelvis(grp, pantsMat, .91);

  // Anatomical Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.16, 12), skinMat);
  neck.position.set(0, 0.96, 0);
  neck.name = 'neckMesh';
  grp.add(neck);

  // 2. Head with Face, Eyes, Nose, Ears, Mouth & Hair
  const headGroup = new THREE.Group();
  headGroup.name = 'headMesh';
  headGroup.position.set(0, 1.18, 0);


  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 16), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.07, 8), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.02, 0.21);
  headGroup.add(nose);

  // Ears
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), skinMat);
  earL.scale.set(0.6, 1.1, 0.7);
  earL.position.set(-0.19, 0, 0);
  const earR = earL.clone();
  earR.position.set(0.19, 0, 0);
  headGroup.add(earL, earR);

  // Eyes with pupils & glint
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  [-0.07, 0.07].forEach((xOff) => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), eyeWhiteMat);
    eyeWhite.position.set(xOff, 0.03, 0.18);
    eyeWhite.scale.set(1, 1.25, 0.5);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), pupilMat);
    pupil.position.set(xOff, 0.03, 0.205);
    pupil.scale.set(1, 1.25, 0.5);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), glintMat);
    glint.position.set(xOff + 0.01, 0.04, 0.215);

    headGroup.add(eyeWhite, pupil, glint);
  });

  // Mouth (Cheering open mouth or smile)
  addExpressiveMouth(headGroup, -0.08, 0.18, cheering ? 'open' : 'smile');

  // Hair
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    hairMat
  );
  hairCap.position.set(0, 0.02, -0.01);
  headGroup.add(hairCap);

  grp.add(headGroup);

  // 3. Arms & Hands
  const leftArm = new THREE.Group();
  leftArm.name = 'leftArm';
  leftArm.position.set(-0.25, 0.76, 0);
  const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.14, 10), shirtMat);
  sleeveL.position.set(0, -0.04, 0);
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.24, 10), skinMat);
  armL.position.set(-0.02, -0.19, 0.03);
  armL.rotation.z = cheering ? -0.8 : 0.1;
  armL.rotation.x = cheering ? -1.2 : 0;
  const handL = buildArticulatedHand(skinMat, false);
  handL.position.set(0, -0.12, 0);
  armL.add(handL);
  leftArm.add(sleeveL, armL);

  const rightArm = new THREE.Group();
  rightArm.name = 'rightArm';
  rightArm.position.set(0.25, 0.76, 0);
  const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.14, 10), shirtMat);
  sleeveR.position.set(0, -0.04, 0);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.24, 10), skinMat);
  armR.position.set(0.02, -0.19, 0.03);
  armR.rotation.z = cheering ? 0.8 : -0.1;
  armR.rotation.x = cheering ? -1.2 : 0;
  const handR = buildArticulatedHand(skinMat, true);
  handR.position.set(0, -0.12, 0);
  armR.add(handR);
  rightArm.add(sleeveR, armR);

  grp.add(leftArm, rightArm);

  // 4. Legs & Feet
  const leftLeg = new THREE.Group();
  leftLeg.name = 'leftLeg';
  leftLeg.position.set(-0.11, 0.35, 0);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.26, 10), pantsMat);
  legL.position.set(0, -0.13, 0);
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.23), shoeMat);
  shoeL.position.set(0, -0.28, 0.02);
  const soleL = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.035, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x334155 })
  );
  soleL.position.set(0, -0.34, 0.02);
  leftLeg.add(legL, shoeL, soleL);

  const rightLeg = new THREE.Group();
  rightLeg.name = 'rightLeg';
  rightLeg.position.set(0.11, 0.35, 0);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.26, 10), pantsMat);
  legR.position.set(0, -0.13, 0);
  const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.23), shoeMat);
  shoeR.position.set(0, -0.28, 0.02);
  const soleR = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.035, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x334155 })
  );
  soleR.position.set(0, -0.34, 0.02);
  rightLeg.add(legR, shoeR, soleR);

  grp.add(leftLeg, rightLeg);

  return grp;
}

export function buildRefereeModel(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'refereeModel';

  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.5 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x9b6247, roughness: 0.66 });
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

  const stripes = createSafeCanvasTexture(256, 128, (ctx) => {
    ctx.fillStyle = '#eeedf0';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#202127';
    for (let x = 0; x < 256; x += 32) ctx.fillRect(x + 8, 0, 16, 128);
  });
  stripes.colorSpace = THREE.SRGBColorSpace;
  stripes.anisotropy = 4;
  const jerseyMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: .79 });
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'torsoMesh';
  const jersey = fittedJersey(jerseyMat, 1.06, .77);
  jersey.name = 'jerseyMesh';
  jersey.scale.y = 1.03;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.084, .012, 10, 32), stripeMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = .922;
  collar.scale.y = .83;
  torsoGroup.add(jersey, collar);
  grp.add(torsoGroup);
  addNeck(grp, skinMat, 1.015, .073, .22);
  addHumanPelvis(grp, stripeMat, 1.06);

  // 2. Head with Detailed Face Features (Eyes, Pupil, Glints, Nose, Ears, Mouth, Referee Cap)
  const headGroup = new THREE.Group();
  headGroup.name = 'headMesh';
  headGroup.position.set(0, 1.25, 0);

  const headBase = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 18), skinMat);
  headBase.castShadow = true;
  headGroup.add(headBase);

  // 3D Cone Nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.08, 8), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.02, 0.23);
  headGroup.add(nose);

  // Ears
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), skinMat);
  earL.scale.set(0.6, 1.1, 0.7);
  earL.position.set(-0.21, 0, 0);
  const earR = earL.clone();
  earR.position.set(0.21, 0, 0);
  headGroup.add(earL, earR);

  // Eyes
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  [-0.08, 0.08].forEach((xOff) => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), eyeWhiteMat);
    eyeWhite.position.set(xOff, 0.04, 0.2);
    eyeWhite.scale.set(1, 1.2, 0.5);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), pupilMat);
    pupil.position.set(xOff, 0.04, 0.225);
    pupil.scale.set(1, 1.2, 0.5);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), glintMat);
    glint.position.set(xOff + 0.01, 0.05, 0.235);

    headGroup.add(eyeWhite, pupil, glint);
  });

  addExpressiveMouth(headGroup, -0.09, 0.2, 'smile');

  // Referee Cap
  const capDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
    stripeMat
  );
  capDome.position.set(0, 0.03, 0);

  const visor = new THREE.Mesh(new RoundedBoxGeometry(.24, .028, .16, 4, .012), stripeMat);
  visor.position.set(0, .113, .212);
  visor.rotation.x = 0.12;
  headGroup.add(capDome, visor);

  grp.add(headGroup);

  const cord = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.073, .954, .040), new THREE.Vector3(-.061, .850, .141),
    new THREE.Vector3(0, .753, .190), new THREE.Vector3(.061, .850, .141),
    new THREE.Vector3(.073, .954, .040),
  ]);
  const lanyard = new THREE.Mesh(new THREE.TubeGeometry(cord, 28, .006, 7, false), stripeMat);
  torsoGroup.add(lanyard);

  addArms(grp, skinMat, stripeMat, stripeMat, true);
  const whistle = new THREE.Group();
  whistle.name = 'whistleMesh';
  const chamber = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .046, 18), silverMat);
  chamber.rotation.z = Math.PI / 2;
  const mouthpiece = new THREE.Mesh(new RoundedBoxGeometry(.029, .017, .04, 2, .007), silverMat);
  mouthpiece.position.z = .031;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.012, .003, 7, 16), silverMat);
  ring.position.z = -.027;
  whistle.add(chamber, mouthpiece, ring);
  whistle.position.set(.026, -.054, .019);
  grp.getObjectByName('strikeHand')?.add(whistle);

  const soleMat = new THREE.MeshStandardMaterial({ color: 0xd9dce0, roughness: .86 });
  for (const [index, side] of [-1, 1].entries()) {
    const leg = new THREE.Group();
    leg.name = index === 0 ? 'leftLeg' : 'rightLeg';
    leg.position.set(side * .111, .399, 0);
    const thigh = new THREE.Mesh(curvedBodyGeometry([
      [.063, -.193], [.068, -.151], [.083, -.066], [.096, .047], [.087, .081],
    ], .97, 24), stripeMat);
    thigh.castShadow = true;
    const shin = new THREE.Group();
    shin.name = index === 0 ? 'leftShin' : 'rightShin';
    shin.position.y = -.174;
    const trouserCuff = new THREE.Mesh(curvedBodyGeometry([
      [.049, -.149], [.051, -.130], [.060, -.081], [.067, -.025], [.065, .023],
    ], .92, 24), stripeMat);
    trouserCuff.castShadow = true;
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(.095, 24, 16), shoeMat);
    shoe.scale.set(.79, .55, 1.32);
    shoe.position.set(0, -.162, .04);
    shoe.castShadow = true;
    const sole = new THREE.Mesh(new RoundedBoxGeometry(.149, .030, .233, 3, .014), soleMat);
    sole.position.set(0, -.210, .045);
    shin.add(trouserCuff, shoe, sole);
    leg.add(thigh, shin);
    grp.add(leg);
  }

  return grp;
}

export function applySeatedDriverPose(
  charRoot: THREE.Group,
  seatedFactor: number,
  steerAngle = 0,
  driving = true,
) {
  const f = THREE.MathUtils.clamp(seatedFactor, 0, 1);
  const leftLeg = charRoot.getObjectByName('leftLeg') as THREE.Group | undefined;
  const rightLeg = charRoot.getObjectByName('rightLeg') as THREE.Group | undefined;
  const leftShin = charRoot.getObjectByName('leftShin') as THREE.Group | undefined;
  const rightShin = charRoot.getObjectByName('rightShin') as THREE.Group | undefined;
  const leftArm = charRoot.getObjectByName('leftArm') as THREE.Group | undefined;
  const rightArm = charRoot.getObjectByName('rightArm') as THREE.Group | undefined;
  const leftForearm = charRoot.getObjectByName('leftForearm') as THREE.Group | undefined;
  const rightForearm = charRoot.getObjectByName('rightForearm') as THREE.Group | undefined;
  const torso = charRoot.getObjectByName('torsoMesh') as THREE.Object3D | undefined;
  const head = charRoot.getObjectByName('headMesh') as THREE.Object3D | undefined;

  // Flex hips forward (+Z) and bend knees downward (-Y) cleanly into cabin footwell
  if (leftLeg) {
    leftLeg.rotation.x = THREE.MathUtils.lerp(0, -1.48, f);
    leftLeg.rotation.y = THREE.MathUtils.lerp(0, -0.06, f);
  }
  if (rightLeg) {
    rightLeg.rotation.x = THREE.MathUtils.lerp(0, -1.48, f);
    rightLeg.rotation.y = THREE.MathUtils.lerp(0, 0.06, f);
  }
  if (leftShin) leftShin.rotation.x = THREE.MathUtils.lerp(0, 1.38, f);
  if (rightShin) rightShin.rotation.x = THREE.MathUtils.lerp(0, 1.38, f);

  // Reach arms forward onto steering wheel rim with subtle steering turn response
  const wheelPitch = steerAngle * 0.45;
  if (leftArm) {
    leftArm.rotation.x = THREE.MathUtils.lerp(0, driving ? -0.92 - wheelPitch : -.36, f);
    leftArm.rotation.z = THREE.MathUtils.lerp(0, 0.18, f);
    leftArm.rotation.y = THREE.MathUtils.lerp(0, 0.22, f);
  }
  if (rightArm) {
    rightArm.rotation.x = THREE.MathUtils.lerp(0, driving ? -0.92 + wheelPitch : -.36, f);
    rightArm.rotation.z = THREE.MathUtils.lerp(0, -0.18, f);
    rightArm.rotation.y = THREE.MathUtils.lerp(0, -0.22, f);
  }
  if (leftForearm) leftForearm.rotation.x = THREE.MathUtils.lerp(-0.32, -0.62, f);
  if (rightForearm) rightForearm.rotation.x = THREE.MathUtils.lerp(-0.32, -0.62, f);

  // Slight reclined athletic driving posture & head look into turns
  if (torso) torso.rotation.x = THREE.MathUtils.lerp(0, -0.08, f);
  if (head) {
    head.rotation.x = THREE.MathUtils.lerp(0, 0.05, f);
    head.rotation.y = THREE.MathUtils.lerp(0, -steerAngle * 0.6, f);
  }
}

export function buildRoadTripCar(bodyColor: number | string = 0x2563eb, detail = false, roofCargo: 'cases' | 'carrier' | 'none' = 'cases', rightHandDrive = false): THREE.Group {
  const car = new THREE.Group();
  car.name = 'roadTripCar';

  // Sprung body wrapper so suspension pitch/roll/bounce never lifts tires off pavement
  const carBody = new THREE.Group();
  carBody.name = 'carBodyGroup';
  car.add(carBody);

  const bodyPaint = new THREE.MeshPhysicalMaterial({
    color: bodyColor,
    roughness: 0.27,
    metalness: 0.48,
    clearcoat: 0.88,
    clearcoatRoughness: 0.13,
  });
  const cabinGlass = new THREE.MeshStandardMaterial({
    color: 0x6e929f,
    roughness: 0.14,
    metalness: 0.28,
    transparent: true,
    opacity: 0.31,
    depthWrite: false,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.95,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xaeb8bf, metalness: 0.78, roughness: 0.31 });
  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xd7efff, emissive: 0xa6d4ff, emissiveIntensity: 0.45, roughness: 0.17 });
  const taillightMat = new THREE.MeshStandardMaterial({ color: 0x7d1023, emissive: 0xc01630, emissiveIntensity: 0.42, roughness: 0.24 });
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.82 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.92 });
  const seatTrimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });

  // 1. Hollow Chassis: Engine Hood, Rear Cargo/Trunk, Floorpan & Side Rocker Sills
  const curve = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, detail ? 3 : 1, r);
  const frontHood = new THREE.Mesh(curve(2.08, 0.55, 1.51, 0.19), bodyPaint);
  frontHood.position.set(0, 0.61, 1.41);
  frontHood.castShadow = true;
  frontHood.receiveShadow = true;
  frontHood.name = 'chassisMesh';

  const rearBody = new THREE.Mesh(curve(2.08, 0.63, 1.4, 0.16), bodyPaint);
  rearBody.position.set(0, 0.63, -1.46);
  rearBody.castShadow = true;
  rearBody.receiveShadow = true;

  const cabinFloor = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.1, 1.65), floorMat);
  cabinFloor.position.set(0, 0.33, -0.05);
  cabinFloor.receiveShadow = true;

  [-0.98, 0.98].forEach((sx) => {
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 1.64), bodyPaint);
    sill.position.set(sx, 0.41, -0.05);
    sill.castShadow = true;
    carBody.add(sill);
  });

  const centerConsole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 1.3), interiorMat);
  centerConsole.position.set(0, 0.48, 0.05);

  const dashboard = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.28, 0.36), interiorMat);
  dashboard.position.set(0, 0.84, 0.72);
  carBody.add(frontHood, rearBody, cabinFloor, centerConsole, dashboard);

  // Front Grille & Chrome Bumpers
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.32, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 })
  );
  grille.position.set(0, 0.58, 2.12);
  const frontBumper = new THREE.Mesh(curve(2.10, 0.21, 0.24, 0.09), floorMat);
  frontBumper.position.set(0, 0.36, 2.14);
  const rearBumper = new THREE.Mesh(curve(2.11, 0.21, 0.25, 0.09), floorMat);
  rearBumper.position.set(0, 0.36, -2.14);
  carBody.add(grille, frontBumper, rearBumper);

  // 2. Sculpted Interior Seats & Steerable Wheel
  [-0.46, 0.46].forEach((sx) => {
    const cushion = new THREE.Mesh(curve(0.54, 0.14, 0.54, 0.065), seatTrimMat);
    cushion.position.set(sx, 0.44, 0.02);
    const backrest = new THREE.Mesh(curve(0.52, 0.62, 0.16, 0.072), interiorMat);
    backrest.position.set(sx, 0.78, -0.24);
    backrest.rotation.x = -0.14;
    const headrest = new THREE.Mesh(curve(0.28, 0.18, 0.12, 0.055), seatTrimMat);
    headrest.position.set(sx, 1.15, -0.30);
    carBody.add(cushion, backrest, headrest);
  });

  const steeringColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.036, 0.32, 10),
    interiorMat
  );
  steeringColumn.position.set(rightHandDrive ? .46 : -.46, 0.88, 0.62);
  steeringColumn.rotation.x = Math.PI / 3;
  carBody.add(steeringColumn);

  const steeringWheelGroup = new THREE.Group();
  steeringWheelGroup.name = 'steeringWheel';
  steeringWheelGroup.position.set(rightHandDrive ? .46 : -.46, 0.96, 0.50);
  steeringWheelGroup.rotation.x = -Math.PI / 3;

  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.024, 10, 20),
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 })
  );
  const wheelSpoke = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.03, 0.02),
    chromeMat
  );
  steeringWheelGroup.add(wheelRim, wheelSpoke);
  carBody.add(steeringWheelGroup);

  // 3. Hollow Cabin with Clearer Glass, Pillars & Raised Roof Headroom (y = 1.62)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.68, 0.05), cabinGlass);
  windshield.position.set(0, 1.26, 0.88);
  windshield.rotation.x = -0.34;
  carBody.add(windshield);

  const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.64, 0.05), cabinGlass);
  rearWindow.position.set(0, 1.28, -1.28);
  rearWindow.rotation.x = 0.36;
  carBody.add(rearWindow);

  // Rear Quarter Side Windows (Behind front doors)
  [-0.96, 0.96].forEach((qx) => {
    const qGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.50, 0.62), cabinGlass);
    qGlass.position.set(qx, 1.26, -0.92);
    carBody.add(qGlass);
  });

  // Roof Pillars (A-Pillars, B-Pillars & C-Pillars)
  [-0.94, 0.94].forEach((px) => {
    const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.08), bodyPaint);
    aPillar.position.set(px, 1.26, 0.88);
    aPillar.rotation.x = -0.34;

    const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.10), bodyPaint);
    bPillar.position.set(px, 1.24, -0.62);

    const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.70, 0.14), bodyPaint);
    cPillar.position.set(px, 1.28, -1.28);
    cPillar.rotation.x = 0.36;
    carBody.add(aPillar, bPillar, cPillar);
  });

  // Roof (y = 1.62 gives generous headroom above seated driver)
  const roof = new THREE.Mesh(curve(1.9, 0.118, 2.31, 0.055), bodyPaint);
  roof.position.set(0, 1.62, -0.2);
  roof.castShadow = true;
  carBody.add(roof);

  // 4. Articulated Opening Passenger Door (Right side at x = +1.05, hinged at front z = +0.58)
  const passengerDoorHinge = new THREE.Group();
  passengerDoorHinge.name = 'passengerDoor';
  passengerDoorHinge.position.set(1.05, 0.84, 0.58);

  const doorPanel = new THREE.Mesh(curve(0.11, 0.62, 1.18, 0.048), bodyPaint);
  doorPanel.position.set(0, -0.02, -0.59);
  const doorWindow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 1.04), cabinGlass);
  doorWindow.position.set(0, 0.44, -0.59);
  const doorFrameTop = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 1.12), bodyPaint);
  doorFrameTop.position.set(0, 0.69, -0.59);
  const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.18), chromeMat);
  doorHandle.position.set(0.05, 0.08, -1.04);
  passengerDoorHinge.add(doorPanel, doorWindow, doorFrameTop, doorHandle);
  carBody.add(passengerDoorHinge);

  // Driver Door (Left side at x = -1.05, hinged at front z = +0.58)
  const driverDoorHinge = new THREE.Group();
  driverDoorHinge.name = 'driverDoor';
  driverDoorHinge.position.set(-1.05, 0.84, 0.58);

  const driverPanel = new THREE.Mesh(curve(0.11, 0.62, 1.18, 0.048), bodyPaint);
  driverPanel.position.set(0, -0.02, -0.59);
  const driverWindow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 1.04), cabinGlass);
  driverWindow.position.set(0, 0.44, -0.59);
  const driverFrameTop = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 1.12), bodyPaint);
  driverFrameTop.position.set(0, 0.69, -0.59);
  const driverHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.18), chromeMat);
  driverHandle.position.set(-0.05, 0.08, -1.04);
  driverDoorHinge.add(driverPanel, driverWindow, driverFrameTop, driverHandle);
  carBody.add(driverDoorHinge);

  // Side Mirrors
  const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), bodyPaint);
  mirrorL.position.set(-1.12, 1.16, 0.66);
  const mirrorR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), bodyPaint);
  mirrorR.position.set(1.12, 1.16, 0.66);
  carBody.add(mirrorL, mirrorR);

  // 5. Roof Luggage Rack & Suitcases (elevated to match y = 1.62 roof)
  const rackBars = [
    [-0.75, 1.68, -0.2],
    [0.75, 1.68, -0.2],
  ];
  if (roofCargo !== 'none') rackBars.forEach(([rx, ry, rz]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.0), chromeMat);
    bar.position.set(rx, ry, rz);
    carBody.add(bar);
  });

  if (roofCargo === 'cases') {
    const suitcase1 = new THREE.Mesh(curve(.68, .28, 1.08, .12), new THREE.MeshStandardMaterial({ color: 0x8a6447, roughness: .76 }));
    const suitcase2 = new THREE.Mesh(curve(.61, .23, .92, .105), new THREE.MeshStandardMaterial({ color: 0x3c5650, roughness: .8 }));
    suitcase1.position.set(-.29, 1.82, -.2);
    suitcase2.position.set(.35, 1.795, -.15);
    carBody.add(suitcase1, suitcase2);
  } else if (roofCargo === 'carrier') {
    const carrier = new THREE.Mesh(curve(1.25, .27, 1.74, .125), floorMat);
    carrier.position.set(0, 1.81, -.2);
    carBody.add(carrier);
  }

  // 6. Articulated Wheels with Steering & Spinning Pivots (mounted to car root so tires stay grounded)
  const wheelSetup = [
    { name: 'frontWheelLeft', x: -1.05, y: 0.38, z: 1.3, isFront: true },
    { name: 'frontWheelRight', x: 1.05, y: 0.38, z: 1.3, isFront: true },
    { name: 'rearWheelLeft', x: -1.05, y: 0.38, z: -1.3, isFront: false },
    { name: 'rearWheelRight', x: 1.05, y: 0.38, z: -1.3, isFront: false },
  ];

  wheelSetup.forEach((w) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.name = w.name;
    wheelGroup.position.set(w.x, w.y, w.z);

    const spinGroup = new THREE.Group();
    spinGroup.name = 'spinWheel';

    const tireProfile = [
      new THREE.Vector2(0.25, -0.15), new THREE.Vector2(0.32, -0.164),
      new THREE.Vector2(0.367, -0.139), new THREE.Vector2(0.38, -0.092),
      new THREE.Vector2(0.382, 0.092), new THREE.Vector2(0.367, 0.139),
      new THREE.Vector2(0.32, 0.164), new THREE.Vector2(0.25, 0.15),
    ];
    const tire = new THREE.Mesh(new THREE.LatheGeometry(tireProfile, detail ? 48 : 24).rotateZ(Math.PI / 2), tireMat);
    tire.castShadow = true;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.247, 0.247, 0.302, 32), floorMat);
    rim.rotateZ(Math.PI / 2);

    const face = new THREE.Group();
    face.position.x = Math.sign(w.x) * 0.161;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.244, 0.014, 8, 36).rotateY(Math.PI / 2), rimMat);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.05, 20).rotateZ(Math.PI / 2), rimMat);
    face.add(lip, hub);
    const spokeGeometry = curve(0.027, 0.156, 0.043, 0.012);
    for (let index = 0; index < 6; index++) {
      const angle = index * Math.PI / 3;
      const spoke = new THREE.Mesh(spokeGeometry, rimMat);
      spoke.position.set(0, Math.cos(angle) * 0.143, Math.sin(angle) * 0.143);
      spoke.rotation.x = angle;
      face.add(spoke);
    }
    spinGroup.add(tire, rim, face);
    wheelGroup.add(spinGroup);
    car.add(wheelGroup);
  });

  // 7. Headlights & Beams
  [-0.65, 0.65].forEach((hx) => {
    const hl = new THREE.Mesh(curve(0.47, 0.115, 0.105, 0.047), headlightMat);
    hl.position.set(hx * 1.11, 0.72, 2.145);
    hl.name = 'headlight';
    carBody.add(hl);
  });

  // 8. Taillights & Bright Brake Lights
  [-0.65, 0.65].forEach((tx) => {
    const tl = new THREE.Mesh(curve(0.44, 0.145, 0.08, 0.036), taillightMat);
    tl.position.set(tx * 1.13, 0.701, -2.165);
    tl.name = 'taillight';
    carBody.add(tl);
  });

  // Dual Chrome Exhaust Pipes
  [-0.5, 0.5].forEach((ex) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.3, -2.2);
    pipe.name = 'exhaustPipe';
    carBody.add(pipe);
  });

  if (detail) {
    const apron = new THREE.Mesh(curve(1.79, 0.1, 0.35, 0.045), bodyPaint);
    apron.position.set(0, 0.927, 0.92);
    carBody.add(apron);
    for (const x of [-0.966, 0.966]) {
      const frontWing = new THREE.Mesh(curve(0.145, 0.44, 0.37, 0.065), bodyPaint);
      frontWing.position.set(x, 0.674, 0.74);
      const rearWing = new THREE.Mesh(curve(0.145, 0.44, 0.39, 0.065), bodyPaint);
      rearWing.position.set(x, 0.668, -0.768);
      carBody.add(frontWing, rearWing);
    }
    for (const door of [driverDoorHinge, passengerDoorHinge]) {
      for (const z of [-1.124, -0.054]) {
        const seal = new THREE.Mesh(curve(0.046, 0.47, 0.046, 0.013), floorMat);
        seal.position.set(0, 0.447, z);
        door.add(seal);
      }
    }
    const plateTexture = createSafeCanvasTexture(256, 80, (ctx) => {
      ctx.fillStyle = '#dadee1';
      ctx.fillRect(0, 0, 256, 80);
      ctx.fillStyle = '#203d51';
      ctx.fillRect(0, 0, 256, 12);
      ctx.font = '700 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FS 04 TOUR', 128, 57);
    });
    plateTexture.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.134), new THREE.MeshStandardMaterial({ map: plateTexture }));
    plate.rotation.y = Math.PI;
    plate.position.set(0, 0.545, -2.169);
    const rearTrim = new THREE.Mesh(curve(1.56, 0.036, 0.035, 0.013), chromeMat);
    rearTrim.position.set(0, 0.79, -2.158);
    carBody.add(plate, rearTrim);
    for (const x of [-0.29, 0.35]) {
      for (const z of [-0.48, 0.08]) {
        const tie = new THREE.Mesh(curve(0.62, 0.02, 0.052, 0.008), floorMat);
        tie.position.set(x, x < 0 ? 1.956 : 1.906, z);
        carBody.add(tie);
      }
    }
    const wiperGeometry = curve(0.63, 0.02, 0.026, 0.008);
    for (const x of [-0.43, 0.43]) {
      const wiper = new THREE.Mesh(wiperGeometry, floorMat);
      wiper.position.set(x, 1.025, 0.994);
      wiper.rotation.z = 0.11;
      carBody.add(wiper);
    }
  }

  return car;
}

// -------------------------------------------------------------
// Procedural Seated Student at Wooden Desk
// -------------------------------------------------------------
export function buildSeatedStudent(
  charDef: CharacterDef,
  options?: { deskWidth?: number; deskDepth?: number }
): THREE.Group {
  const root = new THREE.Group();
  root.name = `student-desk-${charDef.id}`;
  (root as any).userData = { character: charDef, isStudent: true };

  const dw = options?.deskWidth || 1.3;
  const dd = options?.deskDepth || 0.75;

  // Materials
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: charDef.skinColor, roughness: 0.5 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: charDef.avatarColor, roughness: 0.6 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const capMat = new THREE.MeshStandardMaterial({ color: charDef.capColor, roughness: 0.5 });

  // 1. Desk Table Top & Tubular Legs
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(dw, 0.06, dd), woodMat);
  deskTop.position.set(0, 0.72, 0);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  root.add(deskTop);

  // Book Storage Shelf under desk
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.1, 0.03, dd - 0.1), woodMat);
  shelf.position.set(0, 0.58, 0);
  root.add(shelf);

  // Metal Tubular Desk Legs
  [[-dw / 2 + 0.08, -dd / 2 + 0.08], [dw / 2 - 0.08, -dd / 2 + 0.08], [-dw / 2 + 0.08, dd / 2 - 0.08], [dw / 2 - 0.08, dd / 2 - 0.08]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8), steelMat);
    leg.position.set(lx, 0.36, lz);
    leg.castShadow = true;
    root.add(leg);
  });

  // Open Notebook & Pencil on Desk
  const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.015, 0.28), paperMat);
  notebook.position.set(-0.15, 0.76, 0);
  notebook.rotation.y = -0.12;
  const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
  pencil.rotation.z = Math.PI / 2;
  pencil.rotation.y = 0.4;
  pencil.position.set(.015,.04,-.045);
  const palm=new THREE.Group();
  palm.name='writingHand';
  palm.position.set(.18,.827,.11);
  palm.add(pencil);
  const writingPalm = new THREE.Mesh(new THREE.SphereGeometry(.044,12,10),skinMat);
  palm.add(writingPalm);
  root.add(notebook,palm);

  // 2. Student Chair (positioned behind desk at z = 0.55)
  const chairZ = 0.55;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.48), woodMat);
  seat.position.set(0, 0.46, chairZ);
  seat.castShadow = true;
  root.add(seat);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.35, 0.04), woodMat);
  backrest.position.set(0, 0.76, chairZ + 0.22);
  root.add(backrest);

  // Chair Steel Frame & Legs
  [[-0.2, chairZ - 0.18], [0.2, chairZ - 0.18], [-0.2, chairZ + 0.18], [0.2, chairZ + 0.18]].forEach(([cx, cz]) => {
    const cLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.46, 8), steelMat);
    cLeg.position.set(cx, 0.23, cz);
    root.add(cLeg);
  });

  // Backpack hanging on chair leg
  const backpackMat = new THREE.MeshStandardMaterial({ color: charDef.capColor, roughness: 0.7 });
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.22), backpackMat);
  backpack.position.set(-0.28, 0.28, chairZ + 0.12);
  backpack.rotation.z = -0.15;
  root.add(backpack);

  // 3. Seated Student Character Body
  // Torso
  const torso = fittedJersey(shirtMat, .90, .68);
  torso.position.set(0, 0.76, chairZ - 0.02);
  torso.rotation.y = Math.PI;
  root.add(torso);

  // Pelvis & Glutes on Seat
  const seatedHips = new THREE.Group();
  seatedHips.position.set(0, .12, chairZ - .02);
  addHumanPelvis(seatedHips, pantsMat);
  root.add(seatedHips);

  // Thighs (Horizontal extending forward from seat towards desk)
  [-0.14, 0.14].forEach((tx) => {
    const thigh = new THREE.Mesh(curvedBodyGeometry([[0, -.17], [.064, -.153], [.089, -.086], [.092, .094], [.064, .152], [0, .17]], .78, 18), pantsMat);
    thigh.position.set(tx, 0.49, chairZ - 0.22);
    thigh.rotation.x = Math.PI / 2;
    thigh.castShadow = true;
    root.add(thigh);
  });

  // Lower Legs / Shins (Vertical dropping down to floor)
  [-0.14, 0.14].forEach((sx) => {
    const shin = new THREE.Mesh(curvedBodyGeometry([[.048, -.2], [.06, -.111], [.076, .06], [.07, .20]], .98, 18), skinMat);
    shin.position.set(sx, 0.22, chairZ - 0.38);
    root.add(shin);

    // Sneaker
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(.16, .12, .26, 3, .038), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    shoe.position.set(sx, 0.06, chairZ - 0.42);
    root.add(shoe);
  });

  // Arms (Resting forward on wooden table)
  [-0.26, 0.26].forEach((armX) => {
    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.12), shirtMat);
    upperArm.position.set(armX, 0.82, chairZ - 0.12);
    upperArm.rotation.x = 0.55;

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.26), skinMat);
    forearm.position.set(armX * 0.8, 0.815, chairZ - 0.32);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMat);
    hand.position.set(armX * 0.7, 0.828, chairZ - 0.45);

    root.add(upperArm, forearm);
    if(armX<0)root.add(hand);
  });

  // Head with Cap & Eyes
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.32), skinMat);
  head.position.set(0, 1.14, chairZ - 0.04);
  root.add(head);

  // Cap
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.34), capMat);
  cap.position.set(0, 1.34, chairZ - 0.04);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.18), capMat);
  visor.position.set(0, 1.28, chairZ - 0.26);
  root.add(cap, visor);

  // Big Cartoon Eyes
  [-0.09, 0.09].forEach((ex) => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    eyeWhite.position.set(ex, 1.16, chairZ - 0.2);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0x09090b }));
    pupil.position.set(ex, 1.16, chairZ - 0.24);
    root.add(eyeWhite, pupil);
  });

  // Name Tag Billboard above Student
  const tagCanvas = document.createElement('canvas');
  tagCanvas.width = 256;
  tagCanvas.height = 64;
  const tctx = tagCanvas.getContext('2d');
  if (tctx) {
    tctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    tctx.roundRect(4, 4, 248, 56, 12);
    tctx.fill();
    tctx.strokeStyle = '#fbbf24';
    tctx.lineWidth = 3;
    tctx.stroke();
    tctx.fillStyle = '#ffffff';
    tctx.font = 'bold 24px sans-serif';
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.fillText(charDef.name, 128, 32);
  }
  const tagTex = new THREE.CanvasTexture(tagCanvas);
  const tagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex }));
  tagSprite.scale.set(1.4, 0.35, 1);
  tagSprite.position.set(0, 1.7, chairZ);
  root.add(tagSprite);

  return root;
}

// -------------------------------------------------------------
// Procedural Teacher / Coach Instructor Standing at Chalkboard
// -------------------------------------------------------------
export function buildTeacherInstructor(
  name = 'Coach Leo',
  role = 'Four Square Head Instructor'
): THREE.Group {
  const teacher = new THREE.Group();
  teacher.name = 'teacher-instructor';
  (teacher as any).userData = { name, role, isTeacher: true };

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.5 });
  const blazerMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 }); // Navy academic blazer
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });

  // 1. Torso with Shirt & Tie
  const torso = fittedJersey(blazerMat, 1.10, .78);
  torso.position.y = 1.15;
  torso.scale.y = 1.32;
  teacher.add(torso);

  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.05), whiteMat);
  shirt.position.set(0, 1.2, 0.15);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.06), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
  tie.position.set(0, 1.18, 0.17);
  teacher.add(shirt, tie);

  // Whistle on lanyard
  const lanyard = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 6, 16), goldMat);
  lanyard.position.set(0, 1.35, 0.16);
  teacher.add(lanyard);

  // 2. Legs & Dress Shoes
  [-0.14, 0.14].forEach((lx) => {
    const leg = new THREE.Mesh(curvedBodyGeometry([[.066, -.38], [.075, -.29], [.081, -.05], [.096, .19], [.10, .38]], 1.03, 20), pantsMat);
    leg.position.set(lx, 0.42, 0);
    leg.castShadow = true;

    const shoe = new THREE.Mesh(new RoundedBoxGeometry(.19, .12, .28, 3, .038), new THREE.MeshStandardMaterial({ color: 0x09090b }));
    shoe.position.set(lx, 0.06, 0.04);
    teacher.add(leg, shoe);
  });

  // 3. Head, Hair & Teacher Spectacles
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.34), skinMat);
  head.position.y = 1.68;
  teacher.add(head);

  // Graying Professor Hair
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.38), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }));
  hair.position.y = 1.9;
  teacher.add(hair);

  // Glasses / Spectacles
  const glassesMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.1 });
  [-0.09, 0.09].forEach((gx) => {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 6, 16), glassesMat);
    rim.position.set(gx, 1.7, 0.18);
    teacher.add(rim);
  });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.02), glassesMat);
  bridge.position.set(0, 1.7, 0.18);
  teacher.add(bridge);

  // 4. Arms: Right Arm Raised with Wooden Pointer Stick towards Blackboard
  const armMat = blazerMat;
  // Right Arm (Pointing)
  const rightUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.14), armMat);
  rightUpperArm.position.set(0.34, 1.35, 0.1);
  rightUpperArm.rotation.z = -0.7;
  rightUpperArm.rotation.x = -0.6;

  const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.12), armMat);
  rightForearm.position.set(0.55, 1.55, 0.28);
  rightForearm.rotation.x = -1.2;

  // Pointer Stick
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
  stick.position.set(0.68, 1.85, 0.55);
  stick.rotation.x = -0.8;
  stick.rotation.z = -0.4;
  teacher.add(rightUpperArm, rightForearm, stick);

  // Left Arm (Holding Chalk by side)
  const leftUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.14), armMat);
  leftUpperArm.position.set(-0.34, 1.25, 0);
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), skinMat);
  leftHand.position.set(-0.34, 0.95, 0.05);
  const chalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), whiteMat);
  chalk.position.set(-0.34, 0.95, 0.08);
  chalk.rotation.x = Math.PI / 2;
  teacher.add(leftUpperArm, leftHand, chalk);

  // Teacher Name Tag
  const tagCanvas = document.createElement('canvas');
  tagCanvas.width = 280;
  tagCanvas.height = 64;
  const tctx = tagCanvas.getContext('2d');
  if (tctx) {
    tctx.fillStyle = 'rgba(30, 58, 138, 0.9)';
    tctx.roundRect(4, 4, 272, 56, 12);
    tctx.fill();
    tctx.strokeStyle = '#f59e0b';
    tctx.lineWidth = 3;
    tctx.stroke();
    tctx.fillStyle = '#ffffff';
    tctx.font = 'bold 22px sans-serif';
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.fillText(`★ ${name} (Teacher) ★`, 140, 32);
  }
  const tagTex = new THREE.CanvasTexture(tagCanvas);
  const tagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex }));
  tagSprite.scale.set(1.6, 0.38, 1);
  tagSprite.position.set(0, 2.25, 0);
  teacher.add(tagSprite);

  return teacher;
}

// -------------------------------------------------------------
// Procedural Hallway Student
// -------------------------------------------------------------
export function buildHallwayStudent(
  charDef: CharacterDef,
  posture: 'locker_lean' | 'holding_ball' | 'chatting' = 'holding_ball'
): THREE.Group {
  const root = new THREE.Group();
  root.name = `hallway-student-${charDef.id}`;
  (root as any).userData = { character: charDef, isHallwayStudent: true };

  const skinMat = new THREE.MeshStandardMaterial({ color: charDef.skinColor, roughness: 0.5 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: charDef.avatarColor, roughness: 0.6 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const capMat = new THREE.MeshStandardMaterial({ color: charDef.capColor, roughness: 0.5 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.62, 0.26), shirtMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  root.add(torso);

  // Legs
  [-0.14, 0.14].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.2), pantsMat);
    leg.position.set(lx, 0.38, 0);
    leg.castShadow = true;

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.28), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    shoe.position.set(lx, 0.06, 0.04);
    root.add(leg, shoe);
  });

  // Head & Cap
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.34), skinMat);
  head.position.y = 1.54;
  root.add(head);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.36), capMat);
  cap.position.y = 1.74;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.18), capMat);
  visor.position.set(0, 1.68, -0.22);
  root.add(cap, visor);

  // Eyes
  [-0.09, 0.09].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0x09090b }));
    eye.position.set(ex, 1.55, -0.18);
    root.add(eye);
  });

  // Posture Specifics
  if (posture === 'holding_ball') {
    // Left arm holding rubber Voit ball tucked against hip
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.12), shirtMat);
    arm.position.set(0.28, 1.05, 0.1);
    arm.rotation.x = -0.6;
    arm.rotation.z = -0.3;

    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }));
    ball.position.set(0.32, 0.95, 0.24);
    root.add(arm, ball);
  } else if (posture === 'locker_lean') {
    root.rotation.z = -0.08;
    root.position.x += 0.05;
  }

  // Name Tag Billboard
  const tagCanvas = document.createElement('canvas');
  tagCanvas.width = 240;
  tagCanvas.height = 56;
  const tctx = tagCanvas.getContext('2d');
  if (tctx) {
    tctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    tctx.roundRect(4, 4, 232, 48, 10);
    tctx.fill();
    tctx.strokeStyle = '#38bdf8';
    tctx.lineWidth = 2;
    tctx.stroke();
    tctx.fillStyle = '#ffffff';
    tctx.font = 'bold 20px sans-serif';
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.fillText(charDef.name, 120, 28);
  }
  const tagTex = new THREE.CanvasTexture(tagCanvas);
  const tagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex }));
  tagSprite.scale.set(1.4, 0.35, 1);
  tagSprite.position.set(0, 2.05, 0);
  root.add(tagSprite);

  return root;
}


