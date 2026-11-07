import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  X,
  MapPin,
  RotateCw,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Check,
  Lock,
  Trophy,
  Globe,
  Sparkles,
  Camera,
  Play,
  Pause,
} from 'lucide-react';
import { VenueDef } from '../types/campaign';
import { VENUES } from '../utils/venueData';
import { soundFX } from '../services/soundEffects';
import { FourSquareCoin } from './FourSquareCoin';

interface ArenasModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedVenueIds: string[];
  activeVenueId: string;
  onSelectVenue: (venue: VenueDef) => void;
}

export type CameraViewPreset = 'overview' | 'entrance' | 'courtyard' | 'court' | 'gym' | 'flythrough';

export const ArenasModal: React.FC<ArenasModalProps> = ({
  isOpen,
  onClose,
  unlockedVenueIds,
  activeVenueId,
  onSelectVenue,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    const idx = VENUES.findIndex((v) => v.id === activeVenueId);
    return idx >= 0 ? idx : 0;
  });

  const [activeCamPreset, setActiveCamPreset] = useState<CameraViewPreset>('overview');
  const [autoRotate, setAutoRotate] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(18);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const campusGroupRef = useRef<THREE.Group | null>(null);
  const rotationYRef = useRef(0.35);
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const tourTimeRef = useRef(0);

  const currentVenue = VENUES[selectedIndex] || VENUES[0];
  const isUnlocked = unlockedVenueIds.includes(currentVenue.id);
  const isActive = currentVenue.id === activeVenueId;

  // Real capacity and attendance statistics for the official school venues
  const stadiumCapacities: Record<string, { capacity: string; projected: string; bonus: number; minimum: string; yearBuilt: string }> = {
    bridgton_maine: { capacity: '4,500', projected: '6,000', bonus: 100, minimum: '3,500', yearBuilt: '1808' },
    boston_mass: { capacity: '5,200', projected: '6,500', bonus: 90, minimum: '4,000', yearBuilt: '1912' },
    burlington_vermont: { capacity: '3,800', projected: '4,800', bonus: 80, minimum: '3,000', yearBuilt: '1924' },
    needham_mass: { capacity: '4,100', projected: '5,000', bonus: 70, minimum: '3,200', yearBuilt: '1954' },
    youngstown_ohio: { capacity: '4,600', projected: '5,500', bonus: 60, minimum: '3,600', yearBuilt: '1938' },
    north_manchester_indiana: { capacity: '3,900', projected: '4,600', bonus: 50, minimum: '3,000', yearBuilt: '1889' },
    melbourne_australia: { capacity: '4,800', projected: '5,800', bonus: 45, minimum: '3,800', yearBuilt: '1962' },
    montreal_quebec: { capacity: '4,400', projected: '5,200', bonus: 40, minimum: '3,400', yearBuilt: '1905' },
    calgary_alberta: { capacity: '3,600', projected: '4,400', bonus: 35, minimum: '2,800', yearBuilt: '1976' },
    buenos_aires_argentina: { capacity: '4,200', projected: '5,000', bonus: 30, minimum: '3,200', yearBuilt: '1898' },
  };

  const currentStats = stadiumCapacities[currentVenue.id] || {
    capacity: '4,000',
    projected: '5,000',
    bonus: 50,
    minimum: '3,000',
    yearBuilt: '1950',
  };

  useEffect(() => {
    if (isOpen) {
      const idx = VENUES.findIndex((v) => v.id === activeVenueId);
      if (idx >= 0) setSelectedIndex(idx);
    }
  }, [isOpen, activeVenueId]);

  // Full-Screen 3D School Campus Renderer
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a1128);
    scene.fog = new THREE.FogExp2(0x0a1128, 0.012);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 200);
    camera.position.set(0, 12, 22);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      renderer = new THREE.WebGLRenderer({ antialias: false });
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Warm Sun & Sky Illumination
    const hemiLight = new THREE.HemisphereLight(0xfffaed, 0x1e293b, 1.7);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    sunLight.position.set(24, 38, 22);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    fillLight.position.set(-20, 20, -20);
    scene.add(fillLight);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      tourTimeRef.current += delta;

      // Handle Camera Presets & Smooth Transitions
      if (cameraRef.current) {
        const cam = cameraRef.current;

        if (activeCamPreset === 'flythrough') {
          // Autonomous scenic flythrough through the entire school grounds
          const t = tourTimeRef.current * 0.25;
          const radius = 20 + Math.sin(t * 0.5) * 5;
          const camX = Math.sin(t) * radius;
          const camZ = Math.cos(t) * radius;
          const camY = 8 + Math.sin(t * 1.2) * 4;

          cam.position.x = THREE.MathUtils.lerp(cam.position.x, camX, 0.05);
          cam.position.y = THREE.MathUtils.lerp(cam.position.y, camY, 0.05);
          cam.position.z = THREE.MathUtils.lerp(cam.position.z, camZ, 0.05);
          cam.lookAt(0, 2.5, 0);
        } else if (activeCamPreset === 'overview') {
          cam.position.x = THREE.MathUtils.lerp(cam.position.x, 0, 0.08);
          cam.position.y = THREE.MathUtils.lerp(cam.position.y, 14, 0.08);
          cam.position.z = THREE.MathUtils.lerp(cam.position.z, 24, 0.08);
          cam.lookAt(0, 2, 0);
        } else if (activeCamPreset === 'entrance') {
          cam.position.x = THREE.MathUtils.lerp(cam.position.x, 0, 0.08);
          cam.position.y = THREE.MathUtils.lerp(cam.position.y, 3.2, 0.08);
          cam.position.z = THREE.MathUtils.lerp(cam.position.z, 8, 0.08);
          cam.lookAt(0, 3.0, -4);
        } else if (activeCamPreset === 'courtyard') {
          cam.position.x = THREE.MathUtils.lerp(cam.position.x, -5, 0.08);
          cam.position.y = THREE.MathUtils.lerp(cam.position.y, 4.5, 0.08);
          cam.position.z = THREE.MathUtils.lerp(cam.position.z, 10, 0.08);
          cam.lookAt(0, 1.5, 2);
        } else if (activeCamPreset === 'court') {
          cam.position.x = THREE.MathUtils.lerp(cam.position.x, 5.5, 0.08);
          cam.position.y = THREE.MathUtils.lerp(cam.position.y, 5.0, 0.08);
          cam.position.z = THREE.MathUtils.lerp(cam.position.z, 7.5, 0.08);
          cam.lookAt(4.5, 0.5, 0.5);
        } else if (activeCamPreset === 'gym') {
          cam.position.x = THREE.MathUtils.lerp(cam.position.x, 14, 0.08);
          cam.position.y = THREE.MathUtils.lerp(cam.position.y, 4.0, 0.08);
          cam.position.z = THREE.MathUtils.lerp(cam.position.z, 5, 0.08);
          cam.lookAt(12, 2.5, -3);
        }
      }

      if (autoRotate && activeCamPreset !== 'flythrough' && !isDraggingRef.current) {
        rotationYRef.current += delta * 0.12;
      }

      if (campusGroupRef.current && activeCamPreset !== 'flythrough') {
        campusGroupRef.current.rotation.y = rotationYRef.current;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
    };
  }, [isOpen, activeCamPreset]);

  // Build the Complete 3D School Campus Architecture for current venue
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (campusGroupRef.current) {
      scene.remove(campusGroupRef.current);
    }

    const campusGroup = new THREE.Group();
    const vId = currentVenue.id;

    // Venue-specific materials
    const isNewEngland = vId === 'bridgton_maine' || vId === 'boston_mass' || vId === 'needham_mass';
    const isGothicStone = vId === 'north_manchester_indiana' || vId === 'montreal_quebec';
    const isColonial = vId === 'buenos_aires_argentina';
    const isModern = vId === 'melbourne_australia' || vId === 'calgary_alberta';

    const brickColor = isNewEngland ? 0xb91c1c : isGothicStone ? 0x64748b : isColonial ? 0xd97706 : 0x7c2d12;
    const stoneColor = 0xf8fafc;
    const roofColor = isColonial ? 0xc2410c : isGothicStone ? 0x10b981 : 0x1e293b;

    const wallMat = new THREE.MeshStandardMaterial({ color: brickColor, roughness: 0.8 });
    const trimMat = new THREE.MeshStandardMaterial({ color: stoneColor, roughness: 0.5 });
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.6 });

    // 1. Campus Grounds Base Plinth & Paved Plaza
    const groundGeo = new THREE.CylinderGeometry(24, 25, 0.4, 48);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    campusGroup.add(ground);

    // Paved Stone Plaza Texture in Central Courtyard
    const paverCanvas = document.createElement('canvas');
    paverCanvas.width = 256;
    paverCanvas.height = 256;
    const pctx = paverCanvas.getContext('2d');
    if (pctx) {
      pctx.fillStyle = '#94a3b8';
      pctx.fillRect(0, 0, 256, 256);
      pctx.strokeStyle = '#64748b';
      pctx.lineWidth = 4;
      for (let x = 0; x < 256; x += 32) {
        for (let y = 0; y < 256; y += 32) {
          pctx.strokeRect(x, y, 32, 32);
        }
      }
    }
    const paverTex = new THREE.CanvasTexture(paverCanvas);
    paverTex.wrapS = THREE.RepeatWrapping;
    paverTex.wrapT = THREE.RepeatWrapping;
    paverTex.repeat.set(12, 12);
    const plazaMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 22).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: paverTex, roughness: 0.8 })
    );
    plazaMesh.position.set(0, 0.02, 2);
    plazaMesh.receiveShadow = true;
    campusGroup.add(plazaMesh);

    // Center Plaza Circular Stone Medallion (matching image_f03e2a34.png)
    const medallionGeo = new THREE.RingGeometry(0, 2.8, 32).rotateX(-Math.PI / 2);
    const medallionMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
    const medallion = new THREE.Mesh(medallionGeo, medallionMat);
    medallion.position.set(0, 0.03, 4);
    campusGroup.add(medallion);

    // Center Plaza Carved Stone Fountain (matching image_89a4909a.png)
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(0, 0, 4);
    const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.5, 24), trimMat);
    fountainBase.position.y = 0.25;
    const fountainWater = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 0.05, 24),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.2 })
    );
    fountainWater.position.y = 0.48;
    const fountainPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.4, 16), trimMat);
    fountainPedestal.position.y = 0.95;
    const fountainTier = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.8, 0.35, 16), trimMat);
    fountainTier.position.y = 1.6;
    const fountainSpout = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 8), trimMat);
    fountainSpout.position.y = 2.0;
    fountainGroup.add(fountainBase, fountainWater, fountainPedestal, fountainTier, fountainSpout);
    campusGroup.add(fountainGroup);

    // 2. GRAND MULTI-STORY ACADEMIC SCHOOL BUILDING (Center Hall & Wings)
    const schoolBuilding = new THREE.Group();
    schoolBuilding.position.set(0, 0, -6.5);

    // Center Main Hall (2-story, 18m wide, 7.5m high, 8m deep)
    const centerHall = new THREE.Mesh(new THREE.BoxGeometry(16, 7.5, 8.5), wallMat);
    centerHall.position.set(0, 3.75, 0);
    centerHall.castShadow = true;
    centerHall.receiveShadow = true;
    schoolBuilding.add(centerHall);

    // Stone Pilasters & Window Headers
    for (let wx = -6; wx <= 6; wx += 3) {
      if (Math.abs(wx) < 1.5) continue; // Doorway clearance
      // Lower Floor Windows
      const winLow = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.8, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.8 })
      );
      winLow.position.set(wx, 2.2, 4.3);
      // Upper Floor Windows
      const winHigh = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.8, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.8 })
      );
      winHigh.position.set(wx, 5.2, 4.3);
      schoolBuilding.add(winLow, winHigh);
    }

    // Grand Entrance Stone Portico with Columns & Steps
    const porticoCanopy = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.4, 2.8), trimMat);
    porticoCanopy.position.set(0, 4.2, 5.4);
    schoolBuilding.add(porticoCanopy);

    [-2.2, 2.2].forEach((cx) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 4.0, 12), trimMat);
      col.position.set(cx, 2.0, 6.4);
      schoolBuilding.add(col);
    });

    // Grand Stone Entrance Steps
    for (let step = 0; step < 4; step++) {
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(5.8 - step * 0.4, 0.25, 1.0),
        trimMat
      );
      stepMesh.position.set(0, 0.125 + step * 0.25, 5.2 + step * 0.6);
      stepMesh.receiveShadow = true;
      schoolBuilding.add(stepMesh);
    }

    // Open Double Front Doors with Welcome Glow
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 0.2), trimMat);
    doorFrame.position.set(0, 2.2, 4.3);
    const doorOpening = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 3.0),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    doorOpening.position.set(0, 2.2, 4.32);
    schoolBuilding.add(doorFrame, doorOpening);

    // Pitched Terracotta / Slate Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(17, 1.8, 9.5), roofMat);
    roof.position.set(0, 8.2, 0);
    schoolBuilding.add(roof);

    // Clock Tower / Cupola with Bell Spire
    const clockTower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.5, 3.2), trimMat);
    clockTower.position.set(0, 10.5, 0);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.5, 4), roofMat);
    spire.position.set(0, 14.5, 0);
    spire.rotation.y = Math.PI / 4;
    schoolBuilding.add(clockTower, spire);

    // School Banner
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const bctx = bannerCanvas.getContext('2d');
    if (bctx) {
      bctx.fillStyle = '#1e3a8a';
      bctx.fillRect(0, 0, 512, 128);
      bctx.strokeStyle = '#f59e0b';
      bctx.lineWidth = 6;
      bctx.strokeRect(4, 4, 504, 120);
      bctx.fillStyle = '#ffffff';
      bctx.font = 'bold 36px sans-serif';
      bctx.textAlign = 'center';
      bctx.textBaseline = 'middle';
      bctx.fillText(currentVenue.name.toUpperCase(), 256, 64);
    }
    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 1.5),
      new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.4 })
    );
    banner.position.set(0, 6.2, 4.35);
    schoolBuilding.add(banner);

    // West Classroom Wing (extending forward along X = -12)
    const westWing = new THREE.Mesh(new THREE.BoxGeometry(8, 6.5, 12), wallMat);
    westWing.position.set(-11, 3.25, 2.5);
    westWing.castShadow = true;
    const westRoof = new THREE.Mesh(new THREE.BoxGeometry(8.8, 1.4, 12.8), roofMat);
    westRoof.position.set(-11, 7.0, 2.5);
    schoolBuilding.add(westWing, westRoof);

    // East Gymnasium Wing (high ceiling sports arena wing at X = +12)
    const gymWing = new THREE.Mesh(new THREE.BoxGeometry(9.5, 7.8, 14), wallMat);
    gymWing.position.set(12, 3.9, 1.5);
    gymWing.castShadow = true;
    const gymRoof = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 14.8, 16, 1, false, 0, Math.PI), roofMat);
    gymRoof.rotation.x = Math.PI / 2;
    gymRoof.position.set(12, 7.8, 1.5);
    schoolBuilding.add(gymWing, gymRoof);

    // Large Arched Gymnasium Windows
    for (let gz = -3; gz <= 6; gz += 4) {
      const gymWin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 2.8, 12),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.5 })
      );
      gymWin.position.set(7.1, 4.2, gz);
      schoolBuilding.add(gymWin);
    }

    campusGroup.add(schoolBuilding);

    // 3. AUTHENTIC OUTDOOR FOUR-SQUARE COURT IN COURTYARD
    const courtGroup = new THREE.Group();
    courtGroup.position.set(4.5, 0.04, 2.5);

    // Four Square Court Asphalt Slab
    const courtSlab = new THREE.Mesh(
      new THREE.PlaneGeometry(6.6, 6.6).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    courtSlab.receiveShadow = true;
    courtGroup.add(courtSlab);

    // Colored Quadrants (1: Red, 2: Amber, 3: Green, 4: Blue)
    const courtSquares = [
      { id: 1, color: 0xef4444, x: -1.4, z: 1.4 },
      { id: 2, color: 0xf59e0b, x: 1.4, z: 1.4 },
      { id: 3, color: 0x10b981, x: 1.4, z: -1.4 },
      { id: 4, color: 0x3b82f6, x: -1.4, z: -1.4 },
    ];

    courtSquares.forEach((sq) => {
      const sqMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: sq.color, roughness: 0.4 })
      );
      sqMesh.position.set(sq.x, 0.01, sq.z);
      sqMesh.receiveShadow = true;
      courtGroup.add(sqMesh);

      // Square Number
      const sqNumCanvas = document.createElement('canvas');
      sqNumCanvas.width = 128;
      sqNumCanvas.height = 128;
      const sctx = sqNumCanvas.getContext('2d');
      if (sctx) {
        sctx.fillStyle = '#ffffff';
        sctx.font = 'bold 96px sans-serif';
        sctx.textAlign = 'center';
        sctx.textBaseline = 'middle';
        sctx.fillText(`${sq.id}`, 64, 64);
      }
      const numTex = new THREE.CanvasTexture(sqNumCanvas);
      const numDecal = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: numTex, transparent: true, opacity: 0.8 })
      );
      numDecal.position.set(sq.x, 0.02, sq.z);
      courtGroup.add(numDecal);
    });

    // White Court Boundary Lines
    const chalkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lineH = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 0.12).rotateX(-Math.PI / 2), chalkMat);
    lineH.position.set(0, 0.03, 0);
    const lineV = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 5.8).rotateX(-Math.PI / 2), chalkMat);
    lineV.position.set(0, 0.03, 0);
    courtGroup.add(lineH, lineV);

    // Official 4-Square Red Rubber Ball on Court
    const ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
    );
    ballMesh.position.set(0.6, 0.22, 0.6);
    ballMesh.castShadow = true;
    courtGroup.add(ballMesh);

    // Referee Chair Stand
    const refChair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.6), trimMat);
    refChair.position.set(-3.2, 0.9, 0);
    courtGroup.add(refChair);

    // Spectator Bleachers beside the Court
    const bleacherMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
    for (let b = 0; b < 3; b++) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.35, 0.6), bleacherMat);
      bench.position.set(0, 0.2 + b * 0.35, 3.8 + b * 0.6);
      courtGroup.add(bench);
    }

    campusGroup.add(courtGroup);

    // 4. GREEN LAWN QUADS, SHADE TREES & CAMPUS BENCHES (matching image_817fdac9.png)
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
    const lawnLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 12).rotateX(-Math.PI / 2),
      grassMat
    );
    lawnLeft.position.set(-7.5, 0.03, 5);
    lawnLeft.receiveShadow = true;
    campusGroup.add(lawnLeft);

    // Shade Trees (Lush green foliage crowns on brown trunks)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const leafMat = new THREE.MeshStandardMaterial({ color: isColonial ? 0x166534 : 0x15803d, roughness: 0.8 });

    const treePositions = [
      [-9.5, 2.5],
      [-6.5, 8.5],
      [-8.5, 10.5],
      [14.5, 10.5],
      [-13.5, 8.0],
    ];

    treePositions.forEach(([tx, tz]) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 2.5, 8), trunkMat);
      trunk.position.set(tx, 1.25, tz);
      trunk.castShadow = true;

      const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6), leafMat);
      canopy.position.set(tx, 3.2, tz);
      canopy.castShadow = true;

      campusGroup.add(trunk, canopy);
    });

    // Park Benches along paths (matching image_817fdac9.png)
    const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });
    [-4.5, 4.5].forEach((bx) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.5), benchWoodMat);
      bench.position.set(bx, 0.25, 7.5);
      campusGroup.add(bench);
    });

    // Campus Street Lamps / Lantern Posts (matching image_f03e2a34.png)
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    [
      [-3.5, 1.5],
      [3.5, 1.5],
      [-3.5, 9.5],
      [3.5, 9.5],
    ].forEach(([lx, lz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8), lampMat);
      pole.position.set(lx, 1.6, lz);
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), lampGlowMat);
      lantern.position.set(lx, 3.2, lz);
      campusGroup.add(pole, lantern);
    });

    // 5. FRONT CAMPUS GATES, DROP-OFF LOOP & YELLOW SCHOOL BUS
    const busMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });

    const schoolBus = new THREE.Group();
    schoolBus.position.set(-6, 0.5, 14);
    schoolBus.rotation.y = -Math.PI / 2;

    const busBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 5.2), busMat);
    busBody.position.y = 0.6;
    busBody.castShadow = true;

    // Bus Windows
    const busWindows = new THREE.Mesh(
      new THREE.BoxGeometry(2.05, 0.6, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.8 })
    );
    busWindows.position.y = 0.9;

    schoolBus.add(busBody, busWindows);
    campusGroup.add(schoolBus);

    scene.add(campusGroup);
    campusGroupRef.current = campusGroup;
  }, [currentVenue]);

  // Pointer Drag Orbit
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMouseXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMouseXRef.current;
    lastMouseXRef.current = e.clientX;
    rotationYRef.current += deltaX * 0.012;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handlePrev = () => {
    soundFX.playClick();
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : VENUES.length - 1));
  };

  const handleNext = () => {
    soundFX.playClick();
    setSelectedIndex((prev) => (prev < VENUES.length - 1 ? prev + 1 : 0));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen z-50 bg-slate-950 overflow-hidden text-slate-100 select-none font-sans animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 100% FULL-SCREEN 3D SCHOOL CAMPUS VIEWPORT */}
      {/* ========================================================================= */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none z-0"
      />

      {/* ========================================================================= */}
      {/* MANDATORY PREVIOUS AND NEXT BUTTONS ON LEFT AND RIGHT FLANKS OF SCREEN */}
      {/* ========================================================================= */}
      <button
        onClick={handlePrev}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-40 p-4 rounded-2xl bg-slate-900/90 hover:bg-amber-400 text-amber-400 hover:text-slate-950 border border-amber-400/40 shadow-[0_0_30px_rgba(251,191,36,0.4)] transition-all cursor-pointer hover:scale-110 active:scale-95 group backdrop-blur-md"
        title="Previous School Venue (Left Arrow)"
        aria-label="Previous Venue"
      >
        <ChevronLeft className="w-8 h-8 transition-transform group-hover:-translate-x-1" />
        <span className="sr-only">Previous</span>
      </button>

      <button
        onClick={handleNext}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 p-4 rounded-2xl bg-slate-900/90 hover:bg-amber-400 text-amber-400 hover:text-slate-950 border border-amber-400/40 shadow-[0_0_30px_rgba(251,191,36,0.4)] transition-all cursor-pointer hover:scale-110 active:scale-95 group backdrop-blur-md"
        title="Next School Venue (Right Arrow)"
        aria-label="Next Venue"
      >
        <ChevronRight className="w-8 h-8 transition-transform group-hover:translate-x-1" />
        <span className="sr-only">Next</span>
      </button>

      {/* TOP-LEFT OVERLAY: School Venue Credentials Card */}
      <div className="absolute top-4 left-4 z-20 w-80 sm:w-96 p-4 rounded-2xl bg-slate-950/90 border border-slate-700/80 backdrop-blur-md shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <div className="text-[10px] font-mono font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>OFFICIAL SCHOOL VENUE #{currentVenue.order} • EST. {currentStats.yearBuilt}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight mt-0.5">
              {currentVenue.name}
            </h1>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            {selectedIndex + 1}/{VENUES.length}
          </span>
        </div>

        {/* Specs Table Grid */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CAMPUS CAPACITY</div>
            <div className="text-white font-black text-sm mt-0.5">{currentStats.capacity} Students</div>
          </div>

          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SURFACE TYPE</div>
            <div className="text-cyan-400 font-black text-xs truncate mt-0.5">
              {currentVenue.courtSurface.replace(/_/g, ' ').toUpperCase()}
            </div>
          </div>
        </div>

        {/* Bonus Bar */}
        <div className="mt-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 font-bold text-[11px] uppercase">VICTORY COIN REWARD</span>
          <div className="flex items-center gap-1 text-amber-300 font-black text-sm">
            <FourSquareCoin size={16} />
            <span>+{currentStats.bonus} Coins</span>
          </div>
        </div>

        {/* Detailed School History & Description */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
          <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1 mb-1 font-mono">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>{currentVenue.location}</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3">
            {currentVenue.reasonForRanking || currentVenue.description}
          </p>
        </div>

        {/* Enter Venue Action Button */}
        <div className="mt-3">
          <button
            onClick={() => {
              soundFX.playClick();
              onSelectVenue(currentVenue);
              onClose();
            }}
            className={`w-full py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
              isActive
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20 active:scale-95'
            }`}
          >
            {isActive ? <Check className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
            <span>{isActive ? 'CURRENT CIRCUIT VENUE' : 'TRAVEL TO THIS SCHOOL'}</span>
          </button>
        </div>
      </div>

      {/* TOP-RIGHT CONTROLS: Close & Rotation */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xl backdrop-blur-md border border-slate-800 ${
            autoRotate ? 'bg-amber-400 text-slate-950' : 'bg-slate-900/90 text-slate-300 hover:text-white'
          }`}
          title={autoRotate ? 'Pause Rotation' : 'Auto Rotate'}
        >
          {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={() => {
            soundFX.playClick();
            onClose();
          }}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-rose-500 text-slate-300 hover:text-white transition-all cursor-pointer shadow-xl border border-slate-800"
          title="Close Arenas Modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* BOTTOM CENTER: INTERACTIVE SCHOOL VENUE CAMERA CONTROLS DOCK */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-700/80 shadow-2xl max-w-[94vw] overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-400 px-2 shrink-0 flex items-center gap-1">
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          <span>VIEW:</span>
        </span>

        {[
          { id: 'overview', label: 'Campus Overview' },
          { id: 'entrance', label: 'Front Steps & Doors' },
          { id: 'courtyard', label: 'Courtyard & Fountain' },
          { id: 'court', label: '4-Square Court' },
          { id: 'gym', label: 'Gymnasium Wing' },
          { id: 'flythrough', label: '🎥 Flythrough Tour' },
        ].map((preset) => {
          const isSelected = activeCamPreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => {
                soundFX.playClick();
                setActiveCamPreset(preset.id as CameraViewPreset);
              }}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
