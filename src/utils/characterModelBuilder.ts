import * as THREE from 'three';
import { CharacterDef, CharacterCustomization, DEFAULT_CUSTOMIZATION } from './characters';

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

/**
/**
 * Adds solid flat hip and pelvis foundation bridging torso to legs seamlessly.
 */
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
  pupilColor = 0x09090b
) {
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: pupilColor });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  [-spacing / 2, spacing / 2].forEach((xOff) => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 14, 14), eyeWhiteMat);
    eyeWhite.position.set(xOff, y, z);
    eyeWhite.scale.set(1, 1.25, 0.5);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.6, 12, 12), pupilMat);
    pupil.position.set(xOff, y, z + eyeRadius * 0.38);
    pupil.scale.set(1, 1.25, 0.5);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.22, 8, 8), glintMat);
    glint.position.set(xOff + eyeRadius * 0.2, y + eyeRadius * 0.25, z + eyeRadius * 0.48);

    parent.add(eyeWhite, pupil, glint);
  });

  // Calculate face curvature for mouth placement so it is securely mounted flush to the skull
  // For sphere centered at y, surface at (y - 0.10) sits slightly behind apex z
  const mouthY = y - 0.105;
  const mouthZ = Math.sqrt(Math.max(0.01, z * z - 0.105 * 0.105));
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
 * Builds an articulated hand group with palm, thumb, and 4 individual fingers.
 */
export function buildArticulatedHand(
  skinMat: THREE.Material,
  isRight: boolean
): THREE.Group {
  const handGroup = new THREE.Group();
  handGroup.name = isRight ? 'rightHandGroup' : 'leftHandGroup';

  // 1. Curved Cartoon Open Palm Pad (matching uploaded reference slap/high-five mitts)
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.070, 0.026), skinMat);
  palm.position.set(0, -0.035, 0);
  palm.castShadow = true;
  handGroup.add(palm);

  // Cupped Palm Heel Base
  const heel = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), skinMat);
  heel.scale.set(1.15, 0.65, 0.55);
  heel.position.set(0, -0.018, 0.006);
  handGroup.add(heel);

  // 2. Cartoon Angled Thumb
  const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), skinMat);
  thumb.scale.set(1.3, 0.85, 0.75);
  const thumbX = isRight ? -0.044 : 0.044;
  thumb.position.set(thumbX, -0.03, 0.008);
  thumb.rotation.z = isRight ? 0.65 : -0.65;
  handGroup.add(thumb);

  // 3. 4 Cartoon Finger Pads (Rounded open mitt)
  const fingerOffsets = [
    { x: -0.028, y: -0.076, radius: 0.014 }, // Index
    { x: -0.009, y: -0.082, radius: 0.015 }, // Middle
    { x: 0.009, y: -0.080, radius: 0.014 },  // Ring
    { x: 0.028, y: -0.072, radius: 0.012 },  // Pinky
  ];

  fingerOffsets.forEach((f) => {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(f.radius, 12, 10), skinMat);
    pad.scale.set(0.9, 1.35, 0.7);
    pad.position.set(isRight ? f.x : -f.x, f.y, 0.003);
    handGroup.add(pad);
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
    accGroup.add(chain);
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

  // Wristbands
  if (custom.hasWristbands) {
    const wbMat = new THREE.MeshStandardMaterial({ color: custom.wristbandColor || '#F59E0B' });
    const wbL = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.018, 8, 16), wbMat);
    wbL.rotateX(Math.PI / 2);
    wbL.position.set(-0.32, 0.52, 0);
    const wbR = wbL.clone();
    wbR.position.set(0.32, 0.52, 0);
    accGroup.add(wbL, wbR);
  }

  parentGroup.add(accGroup);
}

/**
 * Adds standard articulated arms with sculpted anatomical deltoid shoulder caps,
 * dedicated pivot groups, palms, thumbs, and fingers.
 */
export function addArms(
  parent: THREE.Group,
  skinMat: THREE.Material,
  sleeveMatL: THREE.Material,
  sleeveMatR: THREE.Material
) {
  const cuffGeo = new THREE.TorusGeometry(0.076, 0.015, 8, 16);
  cuffGeo.rotateX(Math.PI / 2);

  // Left arm pivot (spaced out from torso to prevent body clipping)
  const leftArm = new THREE.Group();
  leftArm.name = 'leftArm';
  leftArm.position.set(-0.285, 0.76, 0.035);

  // Sculpted anatomical shoulder deltoid cap (smooth rounded contour)

  const deltoidL = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 16), sleeveMatL);
  deltoidL.scale.set(1.22, 1.1, 1.05);
  deltoidL.position.set(-0.015, 0.02, 0);
  deltoidL.castShadow = true;

  const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.072, 0.13, 14), sleeveMatL);
  sleeveL.position.set(0, -0.05, 0);

  const cuffL = new THREE.Mesh(cuffGeo, sleeveMatL);
  cuffL.position.set(0, -0.115, 0);

  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.25, 12), skinMat);
  armL.position.set(-0.015, -0.21, 0.03);
  armL.rotation.z = 0.12;

  // Left hand attached directly to wrist base of armL
  const handL = buildArticulatedHand(skinMat, false);
  handL.position.set(0, -0.13, 0);
  armL.add(handL);

  leftArm.add(deltoidL, sleeveL, cuffL, armL);
  parent.add(leftArm);

  // Right arm pivot (Primary striking arm - spaced out to prevent chest clipping)
  const rightArm = new THREE.Group();
  rightArm.name = 'rightArm';
  rightArm.position.set(0.285, 0.76, 0.035);

  // Sculpted anatomical shoulder deltoid cap
  const deltoidR = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 16), sleeveMatR);
  deltoidR.scale.set(1.22, 1.1, 1.05);
  deltoidR.position.set(0.015, 0.02, 0);
  deltoidR.castShadow = true;

  const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.072, 0.13, 14), sleeveMatR);
  sleeveR.position.set(0, -0.05, 0);

  const cuffR = new THREE.Mesh(cuffGeo, sleeveMatR);
  cuffR.position.set(0, -0.115, 0);

  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.25, 12), skinMat);
  armR.position.set(0.015, -0.21, 0.03);
  armR.rotation.z = -0.12;

  // Right hand attached directly to wrist base of armR
  const handR = buildArticulatedHand(skinMat, true);
  handR.position.set(0, -0.13, 0);
  handR.name = 'strikeHand';
  armR.add(handR);

  rightArm.add(deltoidR, sleeveR, cuffR, armR);
  parent.add(rightArm);
}

/**
 * Adds high-top sneakers and legs with hip pivot groups for walking animations.
 */
/**
 * Adds sleek rounded athletic running sneakers and legs with hip pivot groups for walking animations.
 */
export function addLegsAndSneakers(
  parent: THREE.Group,
  skinMat: THREE.Material,
  shoeMat: THREE.Material,
  trimMat: THREE.Material,
  spacing = 0.22
) {
  const half = spacing / 2;
  const rubberWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });

  [-half, half].forEach((xPos, idx) => {
    const legGroup = new THREE.Group();
    legGroup.name = idx === 0 ? 'leftLeg' : 'rightLeg';
    legGroup.position.set(xPos, 0.38, 0);

    // Solid Upper Thigh & Shorts Cuff Socket (bridges seamlessly into pelvis with zero gap)
    const thighSocket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.074, 0.14, 14),
      trimMat || skinMat
    );
    thighSocket.position.set(0, 0.02, 0);
    thighSocket.castShadow = true;

    // Anatomical leg cylinder extending from inside the thigh socket down to ankle
    const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.28, 12), skinMat);
    legMesh.position.set(0, -0.12, 0);
    legMesh.castShadow = true;

    // Sleek Rounded Sneaker Body (Rounded Capsule / Cylinder)
    const shoeBodyGroup = new THREE.Group();
    shoeBodyGroup.position.set(0, -0.28, 0.03);

    // Rounded Upper Sneaker Heel & Tongue
    const shoeUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.082, 0.12, 16), shoeMat);
    shoeUpper.position.set(0, 0.02, 0);
    shoeUpper.castShadow = true;

    // Curved Rounded Toe Cap (Smooth rounded front)
    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.078, 16, 12), shoeMat);
    toeCap.scale.set(0.95, 0.75, 1.3);
    toeCap.position.set(0, -0.02, 0.06);

    // Curved Outsole Rubber Tread Rim
    const rubberSole = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.092, 0.035, 16), rubberWhiteMat);
    rubberSole.scale.set(0.95, 1, 1.35);
    rubberSole.position.set(0, -0.055, 0.03);

    // Accent Side Stripe
    const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.022, 0.10), trimMat);
    sideStripe.position.set(0, 0.01, 0.02);

    // Ankle Collar Ring bridging leg cylinder to shoe collar
    const ankleCuff = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 8, 16), trimMat);
    ankleCuff.rotateX(Math.PI / 2);
    ankleCuff.position.set(0, 0.07, 0);

    shoeBodyGroup.add(shoeUpper, toeCap, rubberSole, sideStripe, ankleCuff);
    legGroup.add(thighSocket, legMesh, shoeBodyGroup);
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
      const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.16, 10), armBlueMat);
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.26, 10), handGreenMat);
      armL.position.set(-0.04, -0.18, 0.04);
      const handL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), handGreenMat);
      handL.position.set(-0.08, -0.34, 0.08);
      leftArm.add(sleeveL, armL, handL);

      const rightArm = new THREE.Group();
      rightArm.name = 'rightArm';
      rightArm.position.set(0.42, 0.85, 0);
      const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.16, 10), armBlueMat);
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.26, 10), handGreenMat);
      armR.position.set(0.04, -0.18, 0.04);
      const handR = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), handGreenMat);
      handR.position.set(0.08, -0.34, 0.08);
      handR.name = 'strikeHand';
      rightArm.add(sleeveR, armR, handR);

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
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.26), flannelMat);
      torso.position.set(0, 0.65, 0);
      roxyGroup.add(torso);

      addNeck(roxyGroup, skinMat, 0.92, 0.08, 0.18);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), skinMat);
      head.position.set(0, 1.15, 0);
      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      helmet.position.set(0, 1.18, 0);
      roxyGroup.add(head, helmet);
      addCartoonEyes(roxyGroup, 1.15, 0.21);

      const denimMat = new THREE.MeshStandardMaterial({ color: 0x2563eb });
      addAthleticGlutes(roxyGroup, denimMat);

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
        const skateBoot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.24), bootMat);
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

      addArms(roxyGroup, skinMat, flannelMat, flannelMat);
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
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.45), cabMat);
      cabinet.position.set(0, 0.85, 0);
      botGroup.add(cabinet);

      addNeck(botGroup, cabMat, 0.88, 0.09, 0.16);

      // CRT Screen with glowing yellow smiley
      const crtTex = createSafeCanvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#facc15';
        // 8-bit eyes & smile
        ctx.fillRect(60, 70, 35, 35);
        ctx.fillRect(160, 70, 35, 35);
        ctx.fillRect(60, 160, 25, 25);
        ctx.fillRect(170, 160, 25, 25);
        ctx.fillRect(85, 180, 85, 25);
      });
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.48, 0.4),
        new THREE.MeshBasicMaterial({ map: crtTex })
      );
      screen.position.set(0, 0.95, 0.23);
      botGroup.add(screen);

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

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.28), giMat);
      torso.position.set(0, 0.65, 0);
      ninjaGroup.add(torso);

      addNeck(ninjaGroup, giMat, 0.92, 0.08, 0.18);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), giMat);
      head.position.set(0, 1.15, 0);
      // Glowing Cyan Visor Mask
      const mask = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.05), neonMat);
      mask.position.set(0, 1.16, 0.22);
      ninjaGroup.add(head, mask);

      // Scarf flowing behind
      const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.04), neonMat);
      scarf.position.set(0, 1.0, -0.2);
      scarf.rotation.x = -0.4;
      ninjaGroup.add(scarf);

      addAthleticGlutes(ninjaGroup, giMat);
      addArms(ninjaGroup, giMat, neonMat, giMat);
      addLegsAndSneakers(ninjaGroup, giMat, blackMat, neonMat);

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

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.32), suitMat);
      torso.position.set(0, 0.68, 0);
      astroGroup.add(torso);

      addNeck(astroGroup, suitMat, 0.96, 0.09, 0.18);

      // Life Support Backpack
      const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.2), suitMat);
      backpack.position.set(0, 0.72, -0.22);
      astroGroup.add(backpack);

      // Big Bubble Space Helmet
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 20), suitMat);
      helmet.position.set(0, 1.18, 0);
      const visor = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), goldVisorMat);
      visor.position.set(0, 1.18, 0.1);
      astroGroup.add(helmet, visor);

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

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.28), jerseyMat);
      torso.position.set(0, 0.65, 0);
      genericGroup.add(torso);

      addNeck(genericGroup, skinMat, 0.92, 0.08, 0.18);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 22, 18), skinMat);
      head.position.set(0, 1.15, 0);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
        capMat
      );
      cap.position.set(0, 1.18, 0);
      genericGroup.add(head, cap);

      addCartoonEyes(genericGroup, 1.15, 0.22);
      addAthleticGlutes(genericGroup, pantsMat);
      addArms(genericGroup, skinMat, jerseyMat, jerseyMat);
      addLegsAndSneakers(genericGroup, skinMat, whiteMat, capMat);

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

  const skinMat = new THREE.MeshStandardMaterial({
    color: custom.skinColor || charDef.skinColor,
    roughness: 0.5,
  });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.85,
  });

  const creature = custom.creatureArchetype || 'athlete';
  const bodyGroup = new THREE.Group();

  // Custom Jersey Texture
  const jerseyTex = createSafeCanvasTexture(256, 256, (ctx) => {
    const pattern = custom.shirtPattern || 'split';
    const c1 = custom.shirtColor || '#2563EB';
    const c2 = custom.shirtSecondaryColor || '#EF4444';

    if (pattern === 'solid') {
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

    // Centered Jersey Number
    const num = custom.jerseyNumber ?? 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${num}`, 128, 140);
  });

  const jerseyMat = new THREE.MeshStandardMaterial({ map: jerseyTex, roughness: 0.55 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: custom.shirtColor || 0x2563eb, roughness: 0.5 });
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
    const furMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.8 });
    const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
    const fangsMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const wolfEyeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.3 });

    // Sculpted Beast Torso with Chest Fur Crest
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'torsoMesh';

    const beastChest = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.36, 0.30), furMat);
    beastChest.position.set(0, 0.72, 0);
    const chestRuff = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.26, 6), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 }));
    chestRuff.rotation.x = Math.PI / 1.5;
    chestRuff.position.set(0, 0.74, 0.16);

    const beastWaist = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.26), furMat);
    beastWaist.position.set(0, 0.48, 0);
    torsoGroup.add(beastChest, chestRuff, beastWaist);
    bodyGroup.add(torsoGroup);

    // Lupine Head with Canine Snout, Fangs, Ears & Piercing Eyes
    const headGroup = new THREE.Group();
    headGroup.name = 'headMesh';
    headGroup.position.set(0, 1.15, 0);

    const wolfSkull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 16), furMat);
    wolfSkull.scale.set(1.0, 1.05, 1.15);

    // Canine Snout & Black Nose
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.18, 8), furMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.04, 0.22);
    const wolfNose = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), noseMat);
    wolfNose.position.set(0, 0.02, 0.31);

    // Sharp White Fangs
    const fangL = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 6), fangsMat);
    fangL.position.set(-0.05, -0.11, 0.24);
    fangL.rotation.x = Math.PI;
    const fangR = fangL.clone();
    fangR.position.set(0.05, -0.11, 0.24);

    // Glowing Beast Eyes
    [-0.09, 0.09].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), wolfEyeMat);
      eye.position.set(ex, 0.06, 0.20);
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.038, 0.02), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      pupil.position.set(ex, 0.06, 0.23);
      headGroup.add(eye, pupil);
    });

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

    headGroup.add(wolfSkull, snout, wolfNose, fangL, fangR, earL, innerL, earR, innerR);
    bodyGroup.add(headGroup);

    // Bushy Lupine Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.03, 0.42, 8), furMat);
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

    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.38, 0.28), chassisMat);
    cabinet.position.set(0, 0.72, 0);

    // Coin slot & Speaker grill lines
    const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), darkChassis);
    coinSlot.position.set(0, 0.65, 0.15);
    const ledMatrix = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.02), ledMat);
    ledMatrix.position.set(0, 0.80, 0.15);

    const waistPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12), darkChassis);
    waistPivot.position.set(0, 0.48, 0);

    torsoGroup.add(cabinet, coinSlot, ledMatrix, waistPivot);
    bodyGroup.add(torsoGroup);

    // Retro CRT Monitor Head with Pixel Face & Antenna
    const headGroup = new THREE.Group();
    headGroup.name = 'headMesh';
    headGroup.position.set(0, 1.15, 0);

    const crtCase = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.36), chassisMat);
    const crtScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.26), darkChassis);
    crtScreen.position.set(0, 0, 0.185);

    // Pixel Eyes & Smile
    const eyePixelL = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), screenGlowMat);
    eyePixelL.position.set(-0.08, 0.03, 0.188);
    const eyePixelR = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), screenGlowMat);
    eyePixelR.position.set(0.08, 0.03, 0.188);
    const mouthPixel = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.03), screenGlowMat);
    mouthPixel.position.set(0, -0.06, 0.188);

    // Top Spring Antenna with Glowing Orb
    const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), darkChassis);
    antennaStem.position.set(0, 0.26, 0);
    const antennaOrb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), ledMat);
    antennaOrb.position.set(0, 0.36, 0);

    headGroup.add(crtCase, crtScreen, eyePixelL, eyePixelR, mouthPixel, antennaStem, antennaOrb);
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
    const faceMask = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.20, 0.16), shadowMat);
    faceMask.position.set(0, -0.04, 0.15);

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

    headGroup.add(cowl, faceMask, scarf);
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

    headGroup.add(skull, muzzle, nose);
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
    addCartoonEyes(headGroup, 0.02, 0.22);
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

    // Sloping Trapezius / Clavicle Shoulder Bridge (connects neck to deltoid tips naturally)
    const trapGeo = new THREE.CylinderGeometry(0.12, 0.24, 0.12, 16);
    trapGeo.scale(1.2, 0.75, 0.9);
    const trapezius = new THREE.Mesh(trapGeo, jerseyMat);
    trapezius.position.set(0, 0.86, 0);

    // Upper Athletic Chest (Broad curved pectorals with contoured depth)
    const chestGeo = new THREE.CylinderGeometry(0.24, 0.21, 0.30, 20);
    chestGeo.scale(1.05, 1.0, 0.72);
    const chest = new THREE.Mesh(chestGeo, jerseyMat);
    chest.position.set(0, 0.72, 0);
    chest.castShadow = true;

    // Athletic lower waist taper (narrower athletic V-taper)
    const waistGeo = new THREE.CylinderGeometry(0.20, 0.18, 0.18, 20);
    waistGeo.scale(1.05, 1.0, 0.72);
    const waist = new THREE.Mesh(waistGeo, jerseyMat);
    waist.position.set(0, 0.49, 0);
    waist.castShadow = true;

    // Sculpted Pectoral Muscle Contours
    const pecGeo = new THREE.SphereGeometry(0.105, 16, 12);
    pecGeo.scale(1.15, 0.85, 0.45);
    const pecL = new THREE.Mesh(pecGeo, jerseyMat);
    pecL.position.set(-0.11, 0.73, 0.11);
    const pecR = new THREE.Mesh(pecGeo, jerseyMat);
    pecR.position.set(0.11, 0.73, 0.11);

    // Prominently visible anatomical neck column & athletic ribbed jersey collar
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.094, 0.18, 16), skinMat);
    neck.position.set(0, 0.98, 0);
    neck.name = 'neckMesh';

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 10, 20), trimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.88, 0);

    torsoGroup.add(trapezius, chest, waist, pecL, pecR, neck, collar);
    bodyGroup.add(torsoGroup);

    // Head with Scaled Anatomy elevated above visible neck
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 20), skinMat);
    head.position.set(0, 1.22, 0);
    head.castShadow = true;
    head.name = 'headMesh';
    bodyGroup.add(head);

    addCartoonEyes(bodyGroup, 1.22, 0.21);

    // Sculpted Hair when no hat/cap is worn
    const hairColor = custom.hairColor || '#451A03';
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.7 });

    if (!custom.hatType || custom.hatType === 'none') {
      const hairCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.248, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
        hairMat
      );
      hairCap.position.set(0, 1.24, -0.01);

      // Spiky / fade front locks
      for (let s = -3; s <= 3; s++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 5), hairMat);
        spike.position.set(s * 0.045, 1.41, 0.12 - Math.abs(s) * 0.02);
        spike.rotation.x = 0.4;
        spike.rotation.z = -s * 0.12;
        bodyGroup.add(spike);
      }
      bodyGroup.add(hairCap);
    }

    // Headgear
    if (custom.hatType === 'backwards_cap') {
      const hatMat = new THREE.MeshStandardMaterial({ color: custom.hatColor || 0xef4444 });
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
        hatMat
      );
      cap.position.set(0, 1.26, 0);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.18), hatMat);
      visor.position.set(0, 1.32, -0.16);
      bodyGroup.add(cap, visor);
    } else if (custom.hatType === 'crown') {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.22, 5), goldMat);
      crown.position.set(0, 1.52, 0);
      bodyGroup.add(crown);
    } else if (custom.hatType === 'headband') {
      const headband = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.03, 8, 20),
        new THREE.MeshStandardMaterial({ color: custom.hatColor || 0x06b6d4 })
      );
      headband.rotateX(Math.PI / 2);
      headband.position.set(0, 1.27, 0);
      bodyGroup.add(headband);
    }

    // Sunglasses & Chains
    if (custom.hasShades) {
      const shadesMat = new THREE.MeshStandardMaterial({ color: custom.shadesColor || 0x0f172a });
      const shades = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.04), shadesMat);
      shades.position.set(0, 1.23, 0.23);
      bodyGroup.add(shades);
    }
    if (custom.hasGoldChain) {
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 20), goldMat);
      chain.rotateX(Math.PI / 2.3);
      chain.position.set(0, 0.84, 0.08);
      bodyGroup.add(chain);
    }


    // Anatomical Arms with Sculpted Deltoid Caps
    addArms(bodyGroup, skinMat, sleeveMat, sleeveMat);

    // Shorts with athletic round glutes
    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.26), pantsMat);
    shorts.position.set(0, 0.38, 0);
    shorts.castShadow = true;
    bodyGroup.add(shorts);

    addAthleticGlutes(bodyGroup, pantsMat);
    addLegsAndSneakers(bodyGroup, skinMat, shoesMat, trimMat, 0.22);
  }

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
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.6, 0.26), shirtMat);
  body.position.set(0, 0.62, 0);
  body.castShadow = true;
  torsoGroup.add(body);
  grp.add(torsoGroup);

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
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5 });
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

  // 1. Torso (Black & White Striped Jersey)
  const torsoGroup = new THREE.Group();
  torsoGroup.name = 'torsoMesh';
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.65, 0.28), whiteMat);
  body.position.set(0, 0.65, 0);
  body.castShadow = true;
  torsoGroup.add(body);

  [-0.14, -0.04, 0.04, 0.14].forEach((x) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.655, 0.285), stripeMat);
    s.position.set(x, 0.65, 0);
    torsoGroup.add(s);
  });
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.26), stripeMat);
  collar.position.set(0, 0.98, 0);
  torsoGroup.add(collar);
  grp.add(torsoGroup);

  // Anatomical Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.092, 0.18, 14), skinMat);
  neck.position.set(0, 1.05, 0);
  neck.name = 'neckMesh';
  grp.add(neck);

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

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.16), stripeMat);
  visor.position.set(0, 0.08, 0.22);
  visor.rotation.x = 0.12;
  headGroup.add(capDome, visor);

  grp.add(headGroup);

  // 3. Whistle & Lanyard
  const lanyard = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.012, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
  );
  lanyard.rotation.x = Math.PI / 2.2;
  lanyard.position.set(0, 1.02, 0.08);

  grp.add(lanyard);

  // 4. Arms & Hands holding silver whistle
  const leftArm = new THREE.Group();
  leftArm.name = 'leftArm';
  leftArm.position.set(-0.27, 0.78, 0);
  const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.14, 10), stripeMat);
  sleeveL.position.set(0, -0.04, 0);
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.26, 10), skinMat);
  armL.position.set(-0.02, -0.21, 0.04);
  armL.rotation.z = 0.12;
  const handL = buildArticulatedHand(skinMat, false);
  handL.position.set(0, -0.13, 0);
  armL.add(handL);
  leftArm.add(sleeveL, armL);

  const rightArm = new THREE.Group();
  rightArm.name = 'rightArm';
  rightArm.position.set(0.27, 0.78, 0);
  const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.14, 10), stripeMat);
  sleeveR.position.set(0, -0.04, 0);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.26, 10), skinMat);
  armR.position.set(0.02, -0.21, 0.04);
  armR.rotation.z = -0.12;
  const handR = buildArticulatedHand(skinMat, true);
  handR.position.set(0, -0.13, 0);

  // Silver whistle
  const whistleGroup = new THREE.Group();
  whistleGroup.name = 'whistleMesh';
  const whistleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.07, 10), silverMat);
  whistleBody.rotation.z = Math.PI / 2;
  const whistleNozzle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.018, 0.05), silverMat);
  whistleNozzle.position.set(0, 0, 0.035);
  const whistleRing = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.005, 6, 12), silverMat);
  whistleRing.position.set(0, 0, -0.038);
  whistleGroup.add(whistleBody, whistleNozzle, whistleRing);
  whistleGroup.position.set(0, -0.08, 0.03);
  handR.add(whistleGroup);

  armR.add(handR);
  rightArm.add(sleeveR, armR);
  grp.add(leftArm, rightArm);

  // 5. Legs & Feet
  const leftLeg = new THREE.Group();
  leftLeg.name = 'leftLeg';
  leftLeg.position.set(-0.12, 0.38, 0);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.28, 10), stripeMat);
  legL.position.set(0, -0.14, 0);
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.25), shoeMat);
  shoeL.position.set(0, -0.3, 0.03);
  const soleL = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.04, 0.26),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  );
  soleL.position.set(0, -0.36, 0.03);
  leftLeg.add(legL, shoeL, soleL);

  const rightLeg = new THREE.Group();
  rightLeg.name = 'rightLeg';
  rightLeg.position.set(0.12, 0.38, 0);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.28, 10), stripeMat);
  legR.position.set(0, -0.14, 0);
  const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.25), shoeMat);
  shoeR.position.set(0, -0.3, 0.03);
  const soleR = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.04, 0.26),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  );
  soleR.position.set(0, -0.36, 0.03);
  rightLeg.add(legR, shoeR, soleR);

  grp.add(leftLeg, rightLeg);

  return grp;
}

export function buildRoadTripCar(bodyColor: number | string = 0x2563eb): THREE.Group {
  const car = new THREE.Group();
  car.name = 'roadTripCar';

  const bodyPaint = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.25,
    metalness: 0.65,
  });
  const darkGlass = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.85,
    transparent: true,
    opacity: 0.85,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.95,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85 });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const interiorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

  // 1. Lower Chassis / Main Body
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 4.2), bodyPaint);
  chassis.position.set(0, 0.6, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  chassis.name = 'chassisMesh';
  car.add(chassis);

  // Front Grille & Chrome Bumper
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.32, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 })
  );
  grille.position.set(0, 0.58, 2.12);
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.18, 0.22), chromeMat);
  frontBumper.position.set(0, 0.36, 2.14);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.18, 0.22), chromeMat);
  rearBumper.position.set(0, 0.36, -2.14);
  car.add(grille, frontBumper, rearBumper);

  // 2. Interior Seats & Steering Wheel
  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), interiorMat);
  driverSeat.position.set(-0.45, 0.85, 0.1);
  const passengerSeat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), interiorMat);
  passengerSeat.position.set(0.45, 0.85, 0.1);
  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.022, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0x09090b })
  );
  steeringWheel.position.set(-0.45, 1.05, 0.52);
  steeringWheel.rotation.x = -Math.PI / 3;
  car.add(driverSeat, passengerSeat, steeringWheel);

  // 3. Hollow Cabin with Pillars, Windshields & Open Passenger Doorway
  // Front Windshield (Angled forward glass)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.62, 0.06), darkGlass);
  windshield.position.set(0, 1.22, 0.88);
  windshield.rotation.x = -0.32;
  car.add(windshield);

  // Rear Windshield (Angled backward glass)
  const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.58, 0.06), darkGlass);
  rearWindow.position.set(0, 1.24, -1.28);
  rearWindow.rotation.x = 0.35;
  car.add(rearWindow);

  // Left Driver-Side Windows (Solid glass on driver side)
  const driverSideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 2.1), darkGlass);
  driverSideGlass.position.set(-0.92, 1.2, -0.2);
  car.add(driverSideGlass);

  // Right Passenger-Side Rear Quarter Window (Behind the open door area)
  const passengerQuarterGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.7), darkGlass);
  passengerQuarterGlass.position.set(0.92, 1.2, -0.9);
  car.add(passengerQuarterGlass);

  // Roof Pillars (A-Pillars & C-Pillars)
  const pillarMat = bodyPaint;
  [-0.92, 0.92].forEach((px) => {
    const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.08), pillarMat);
    aPillar.position.set(px, 1.22, 0.88);
    aPillar.rotation.x = -0.32;

    const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.12), pillarMat);
    cPillar.position.set(px, 1.22, -1.28);
    cPillar.rotation.x = 0.35;
    car.add(aPillar, cPillar);
  });

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 2.3), bodyPaint);
  roof.position.set(0, 1.52, -0.2);
  roof.castShadow = true;
  car.add(roof);

  // 4. Articulated Opening Passenger Door (Right side at x = 1.05)
  // The door group has its hinge at the forward edge (z = +0.65) so it swings outward realistically
  const passengerDoorHinge = new THREE.Group();
  passengerDoorHinge.name = 'passengerDoor';
  passengerDoorHinge.position.set(1.05, 0.9, 0.5); // Hinge pivot point

  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 1.2), bodyPaint);
  doorPanel.position.set(0, -0.05, -0.6); // Centered relative to hinge
  const doorWindow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.0), darkGlass);
  doorWindow.position.set(0, 0.28, -0.6);
  const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.18), chromeMat);
  doorHandle.position.set(0.05, -0.02, -1.05); // Rear edge of door
  passengerDoorHinge.add(doorPanel, doorWindow, doorHandle);
  car.add(passengerDoorHinge);

  // Driver Door (Left side at x = -1.05)
  const driverDoorHinge = new THREE.Group();
  driverDoorHinge.name = 'driverDoor';
  driverDoorHinge.position.set(-1.05, 0.9, 0.5);

  const driverPanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 1.2), bodyPaint);
  driverPanel.position.set(0, -0.05, -0.6);
  const driverWindow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.0), darkGlass);
  driverWindow.position.set(0, 0.28, -0.6);
  const driverHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.18), chromeMat);
  driverHandle.position.set(-0.05, -0.02, -1.05);
  driverDoorHinge.add(driverPanel, driverWindow, driverHandle);
  car.add(driverDoorHinge);

  // Side Mirrors
  const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), bodyPaint);
  mirrorL.position.set(-1.12, 1.15, 0.65);
  const mirrorR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), bodyPaint);
  mirrorR.position.set(1.12, 1.15, 0.65);
  car.add(mirrorL, mirrorR);

  // 5. Roof Luggage Rack & Suitcases
  const rackBars = [
    [-0.75, 1.58, -0.2],
    [0.75, 1.58, -0.2],
  ];
  rackBars.forEach(([rx, ry, rz]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.0), chromeMat);
    bar.position.set(rx, ry, rz);
    car.add(bar);
  });

  const suitcase1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.35, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 })
  );
  suitcase1.position.set(-0.25, 1.76, -0.2);
  const suitcase2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.28, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.6 })
  );
  suitcase2.position.set(0.35, 1.72, -0.15);
  car.add(suitcase1, suitcase2);

  // 6. Articulated Wheels with Steering & Spinning Pivots
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

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 18), tireMat);
    tire.rotateZ(Math.PI / 2);
    tire.castShadow = true;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.31, 14), rimMat);
    rim.rotateZ(Math.PI / 2);

    spinGroup.add(tire, rim);
    wheelGroup.add(spinGroup);
    car.add(wheelGroup);
  });

  // 7. Headlights & Beams
  [-0.65, 0.65].forEach((hx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.1), headlightMat);
    hl.position.set(hx, 0.65, 2.12);
    hl.name = 'headlight';
    car.add(hl);
  });

  // 8. Taillights & Bright Brake Lights
  [-0.65, 0.65].forEach((tx) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.1), taillightMat);
    tl.position.set(tx, 0.65, -2.12);
    tl.name = 'taillight';
    car.add(tl);
  });

  // Dual Chrome Exhaust Pipes
  [-0.5, 0.5].forEach((ex) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, 0.3, -2.2);
    pipe.name = 'exhaustPipe';
    car.add(pipe);
  });

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
  pencil.position.set(0.18, 0.76, 0.05);
  root.add(notebook, pencil);

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
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.24), shirtMat);
  torso.position.set(0, 0.76, chairZ - 0.02);
  torso.castShadow = true;
  root.add(torso);

  // Pelvis & Glutes on Seat
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.28), pantsMat);
  pelvis.position.set(0, 0.52, chairZ - 0.02);
  root.add(pelvis);

  // Thighs (Horizontal extending forward from seat towards desk)
  [-0.14, 0.14].forEach((tx) => {
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.34), pantsMat);
    thigh.position.set(tx, 0.49, chairZ - 0.22);
    thigh.castShadow = true;
    root.add(thigh);
  });

  // Lower Legs / Shins (Vertical dropping down to floor)
  [-0.14, 0.14].forEach((sx) => {
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), skinMat);
    shin.position.set(sx, 0.22, chairZ - 0.38);
    root.add(shin);

    // Sneaker
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.26), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    shoe.position.set(sx, 0.06, chairZ - 0.42);
    root.add(shoe);
  });

  // Arms (Resting forward on wooden table)
  [-0.26, 0.26].forEach((armX) => {
    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.12), shirtMat);
    upperArm.position.set(armX, 0.82, chairZ - 0.12);
    upperArm.rotation.x = 0.55;

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.26), skinMat);
    forearm.position.set(armX * 0.8, 0.74, chairZ - 0.32);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMat);
    hand.position.set(armX * 0.7, 0.74, chairZ - 0.45);

    root.add(upperArm, forearm, hand);
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
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.68, 0.3), blazerMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
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
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.76, 0.2), pantsMat);
    leg.position.set(lx, 0.42, 0);
    leg.castShadow = true;

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.28), new THREE.MeshStandardMaterial({ color: 0x09090b }));
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


