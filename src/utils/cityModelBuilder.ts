import * as THREE from 'three';
import { VenueDef } from '../types/campaign';

/**
 * Procedural 3D Miniature City Landmark & Skyline Builder
 * Generates iconic 3D models for the Top 10 Ranked Four Square Cities Worldwide.
 */

function createCityCanvasTexture(
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Window facade texture generator for skyscrapers
const windowTex = createCityCanvasTexture(128, 256, (ctx) => {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = '#fef08a';
  for (let y = 12; y < 248; y += 20) {
    for (let x = 12; x < 120; x += 22) {
      if (Math.random() > 0.25) {
        ctx.fillStyle = Math.random() > 0.5 ? '#fef08a' : '#38bdf8';
        ctx.fillRect(x, y, 12, 12);
      }
    }
  }
});

export function buildCityModel(venue: VenueDef, isSelected: boolean, isCurrent: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = `city-${venue.id}`;

  // Base Island / Pedestal Plinth with Warm Parchment Edge
  const baseMat = new THREE.MeshStandardMaterial({
    color: isSelected ? 0xd97706 : isCurrent ? 0x0284c7 : 0xc2a677,
    roughness: 0.7,
    metalness: 0.1,
  });
  const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.85, 0.35, 24), baseMat);
  basePlinth.position.y = 0.175;
  group.add(basePlinth);

  // Outer glowing ring
  const ringMat = new THREE.MeshBasicMaterial({
    color: isSelected ? 0xf59e0b : isCurrent ? 0x38bdf8 : 0x785532,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.85, 2.05, 32).rotateX(-Math.PI / 2), ringMat);
  ring.position.y = 0.36;
  group.add(ring);

  // Landmark City Center Group
  const cityGroup = new THREE.Group();
  cityGroup.position.y = 0.35;

  switch (venue.id) {
    // 1. Bridgton & Naples, Maine — World Championship Trophy Arena & Maine Pines
    case 'bridgton_maine': {
      // Golden World Championship Arena
      const arenaMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
      const arena = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.8, 20), arenaMat);
      arena.position.set(0, 0.4, 0);

      // Gold Cup Trophy on roof
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
      const trophyStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 12), goldMat);
      trophyStem.position.set(0, 1.05, 0);
      const trophyCup = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.4, 16), goldMat);
      trophyCup.position.set(0, 1.45, 0);
      cityGroup.add(arena, trophyStem, trophyCup);

      // Maine Evergreen Pines
      const pineMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
      [-0.9, 0.9].forEach((px, i) => {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 8), trunkMat);
        trunk.position.set(px, 0.2, (i % 2 === 0 ? 0.6 : -0.6));
        const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 8), pineMat);
        foliage.position.set(px, 0.85, (i % 2 === 0 ? 0.6 : -0.6));
        cityGroup.add(trunk, foliage);
      });
      break;
    }

    // 2. Boston, Massachusetts — Brownstones, Tower & Common
    case 'boston_mass': {
      // Brick brownstone row
      const brickMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 });
      const brownstone = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.7), brickMat);
      brownstone.position.set(-0.35, 0.45, 0.1);

      // Boston Glass Tower (Prudential style)
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 2.3, 0.6),
        new THREE.MeshStandardMaterial({ map: windowTex, roughness: 0.3 })
      );
      tower.position.set(0.45, 1.15, -0.2);

      // Spire
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.06, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 })
      );
      spire.position.set(0.45, 2.7, -0.2);
      cityGroup.add(brownstone, tower, spire);
      break;
    }

    // 3. Burlington, Vermont — Waterfront Lighthouse & Green Mountain Peak
    case 'burlington_vermont': {
      // Lighthouse
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
      const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
      const lighthouseBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 1.4, 12), whiteMat);
      lighthouseBase.position.set(-0.4, 0.7, 0.2);
      const lighthouseTop = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.35, 12), redMat);
      lighthouseTop.position.set(-0.4, 1.55, 0.2);

      // Lake Champlain Pier
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.12, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 })
      );
      pier.position.set(0.3, 0.1, 0.2);

      // Mountain Peak
      const mtn = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 1.6, 6),
        new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 })
      );
      mtn.position.set(0.4, 0.8, -0.4);
      cityGroup.add(lighthouseBase, lighthouseTop, pier, mtn);
      break;
    }

    // 4. Needham, Massachusetts — 34-Hour Marathon Monument & Giant Clock
    case 'needham_mass': {
      // Clock Tower
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 2.2, 0.65),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 })
      );
      tower.position.set(0, 1.1, 0);

      // Clock Face
      const clockMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const clock = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), clockMat);
      clock.position.set(0, 1.9, 0.33);

      // Marathon Golden Ribbon
      const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7 });
      const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 24), ribbonMat);
      ribbon.position.set(0, 0.6, 0);
      ribbon.rotation.x = Math.PI / 3;
      cityGroup.add(tower, clock, ribbon);
      break;
    }

    // 5. Youngstown, Ohio — Steel Valley Mill & Brick Fieldhouse
    case 'youngstown_ohio': {
      // Brick Mill
      const brickMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.8 });
      const mill = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.8), brickMat);
      mill.position.set(-0.2, 0.45, 0.1);

      // Twin Steel Smokestacks
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      [0.35, 0.65].forEach((sx) => {
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.8, 12), steelMat);
        stack.position.set(sx, 0.9, -0.2);
        cityGroup.add(stack);
      });
      cityGroup.add(mill);
      break;
    }

    // 6. North Manchester, Indiana — Manchester University Quad & Bell Tower
    case 'north_manchester_indiana': {
      // Collegiate Hall
      const hallMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.7 });
      const hall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.7), hallMat);
      hall.position.set(0, 0.4, 0.1);

      // Bell Tower Spire
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), hallMat);
      tower.position.set(0, 1.2, 0.1);
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.7, 4),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 })
      );
      spire.position.set(0, 2.35, 0.1);
      spire.rotation.y = Math.PI / 4;
      cityGroup.add(hall, tower, spire);
      break;
    }

    // 7. Melbourne, Australia — Downball Arena & Arts Spire
    case 'melbourne_australia': {
      // Golden Arts Spire
      const spireMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.6, 8), spireMat);
      spire.position.set(0, 1.3, -0.2);

      // Downball Court Base
      const court = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x0284c7 })
      );
      court.position.set(0, 0.02, 0.3);

      // Aussie Eucalyptus
      const eucaMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.8 });
      const tree = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), eucaMat);
      tree.position.set(-0.6, 0.7, 0.2);
      cityGroup.add(spire, court, tree);
      break;
    }

    // 8. Montreal, Quebec — Mont-Royal Stone Courtyard & Mansard Roof
    case 'montreal_quebec': {
      // Grey stone building
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
      const building = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.8), stoneMat);
      building.position.set(0, 0.45, 0);

      // Copper Green Mansard Roof
      const copperMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 });
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 0.6, 4), copperMat);
      roof.position.set(0, 1.2, 0);
      roof.rotation.y = Math.PI / 4;

      // Fleur-de-lis Spire
      const cupola = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x1e3a8a })
      );
      cupola.position.set(0, 1.7, 0);
      cityGroup.add(building, roof, cupola);
      break;
    }

    // 9. Calgary, Alberta — Stampede Saddle & Prairie Tower
    case 'calgary_alberta': {
      // Curved Saddledome Arena
      const domeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
      dome.position.set(-0.25, 0.1, 0.1);

      // Calgary Tower Observation Spire
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.15, 2.2, 12),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })
      );
      tower.position.set(0.55, 1.1, -0.2);
      const skyPod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.2, 0.25, 16),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc })
      );
      skyPod.position.set(0.55, 1.9, -0.2);
      cityGroup.add(dome, tower, skyPod);
      break;
    }

    // 10. Buenos Aires, Argentina — Obelisco & Casa Rosada
    case 'buenos_aires_argentina':
    default: {
      // White Obelisk Monument
      const obeliskMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const obelisk = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.4, 0.28), obeliskMat);
      obelisk.position.set(0, 1.2, -0.2);
      const pyramidion = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 4), obeliskMat);
      pyramidion.position.set(0, 2.6, -0.2);
      pyramidion.rotation.y = Math.PI / 4;

      // Casa Rosada Salmon Arcade
      const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.6 });
      const casa = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.55), pinkMat);
      casa.position.set(0, 0.325, 0.4);
      cityGroup.add(obelisk, pyramidion, casa);
      break;
    }
  }

  // Floating City Beacon Pin (pulsing above the landmark)
  const beaconMat = new THREE.MeshStandardMaterial({
    color: isSelected ? 0xf59e0b : isCurrent ? 0x38bdf8 : 0xfacc15,
    emissive: isSelected ? 0xd97706 : 0x0284c7,
    emissiveIntensity: 0.8,
  });
  const beaconCone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 8), beaconMat);
  beaconCone.rotateX(Math.PI);
  beaconCone.position.set(0, 3.8, 0);
  beaconCone.name = 'cityBeacon';
  group.add(beaconCone);

  group.add(cityGroup);
  return group;
}
