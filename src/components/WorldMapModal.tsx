import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  X,
  MapPin,
  Trophy,
  Car,
  RotateCw,
  Home,
  Coins,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Calendar,
  Award,
} from 'lucide-react';
import { VenueDef, VenueId, CampaignProgress } from '../types/campaign';
import { VENUES } from '../utils/venueData';
import { soundFX } from '../services/soundEffects';
import { buildCityModel } from '../utils/cityModelBuilder';
import { FourSquareCoin } from './FourSquareCoin';

interface WorldMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: CampaignProgress;
  onSelectVenue: (venue: VenueDef) => void;
  onResumeExploration?: () => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  isOpen,
  onClose,
  progress,
  onSelectVenue,
  onResumeExploration,
}) => {
  const [selectedVenueId, setSelectedVenueId] = useState<VenueId>(progress.currentVenueId || VENUES[0].id);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showDossier, setShowDossier] = useState<boolean>(true);

  // Auto-rotate ref to fix stale closure bug: ensures turning off orbit stops rotation immediately
  const autoRotateRef = useRef<boolean>(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // 3D Map Viewport Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mapGroupRef = useRef<THREE.Group | null>(null);
  const cityModelsMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const microCarRef = useRef<THREE.Group | null>(null);
  const rotationYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const selectedVenueRef = useRef(selectedVenueId);

  useEffect(() => {
    selectedVenueRef.current = selectedVenueId;
  }, [selectedVenueId]);

  const currentIndex = VENUES.findIndex((v) => v.id === selectedVenueId);
  const inspectedVenue = VENUES[currentIndex >= 0 ? currentIndex : 0];
  const isCurrent = inspectedVenue.id === progress.currentVenueId;

  const handlePrevCity = () => {
    soundFX.playClick();
    const prevIdx = (currentIndex - 1 + VENUES.length) % VENUES.length;
    setSelectedVenueId(VENUES[prevIdx].id);
  };

  const handleNextCity = () => {
    soundFX.playClick();
    const nextIdx = (currentIndex + 1) % VENUES.length;
    setSelectedVenueId(VENUES[nextIdx].id);
  };

  // Initialize 3D Poptropica-Style Island Archipelago
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Warm parchment nautical ocean background (#e9d4a3)
    scene.background = new THREE.Color(0xe8d29d);
    scene.fog = new THREE.FogExp2(0xe8d29d, 0.008);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 150);
    // Elevated bird's eye view over spread-out islands
    camera.position.set(0, 32, 38);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Warm Tropical Sun Lighting
    const hemiLight = new THREE.HemisphereLight(0xfffaed, 0xb48b50, 1.4);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfffaed, 2.0);
    sun.position.set(22, 36, 24);
    sun.castShadow = true;
    scene.add(sun);

    const blueSkyFill = new THREE.DirectionalLight(0x7dd3fc, 0.6);
    blueSkyFill.position.set(-24, 20, -20);
    scene.add(blueSkyFill);

    // 3D Map Group (Spread-Out Islands, Transit Ribbon, Cloud Layer Over Top)
    const mapGroup = new THREE.Group();
    mapGroupRef.current = mapGroup;
    scene.add(mapGroup);

    // 1. Warm Parchment Ocean Basin with Nautical Waves Texture
    const oceanGeo = new THREE.CylinderGeometry(36, 36, 0.5, 64);
    const oceanCanvas = document.createElement('canvas');
    oceanCanvas.width = 512;
    oceanCanvas.height = 512;
    const octx = oceanCanvas.getContext('2d');
    if (octx) {
      octx.fillStyle = '#ebd5a0';
      octx.fillRect(0, 0, 512, 512);
      // Subtle vintage nautical wave lines
      octx.strokeStyle = 'rgba(180, 140, 80, 0.25)';
      octx.lineWidth = 3;
      for (let y = 30; y < 512; y += 64) {
        for (let x = 20; x < 512; x += 110) {
          octx.beginPath();
          octx.arc(x, y, 14, Math.PI, 0, false);
          octx.stroke();
          octx.beginPath();
          octx.arc(x + 28, y, 14, 0, Math.PI, false);
          octx.stroke();
        }
      }
    }
    const oceanTex = new THREE.CanvasTexture(oceanCanvas);
    oceanTex.wrapS = THREE.RepeatWrapping;
    oceanTex.wrapT = THREE.RepeatWrapping;
    oceanTex.repeat.set(6, 6);

    const oceanMat = new THREE.MeshStandardMaterial({
      map: oceanTex,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.position.y = -0.3;
    mapGroup.add(ocean);

    // 2. Spread Out Island Dioramas across the World Map
    cityModelsMapRef.current.clear();
    const routeCoords: THREE.Vector3[] = [];

    VENUES.forEach((v) => {
      // Wide dispersion so cities are spread out and never clustered!
      const wx = (v.mapCoords.x / 100 - 0.5) * 44;
      const wz = (v.mapCoords.y / 100 - 0.5) * 32;

      routeCoords.push(new THREE.Vector3(wx, 0.35, wz));

      const isCurrentStop = v.id === progress.currentVenueId;
      const isSel = v.id === selectedVenueRef.current;

      const cityGroup = buildCityModel(v, isSel, isCurrentStop);
      cityGroup.position.set(wx, 0, wz);

      // Sandy Beach Island Base beneath the city
      const islandBaseMat = new THREE.MeshStandardMaterial({
        color: 0xdfbe85,
        roughness: 0.8,
      });
      const islandBase = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.4, 18), islandBaseMat);
      islandBase.position.y = 0.05;
      cityGroup.add(islandBase);

      mapGroup.add(cityGroup);
      cityModelsMapRef.current.set(v.id, cityGroup);
    });

    // 3. Golden Navigation Sea Route connecting the Top 10 cities
    if (routeCoords.length > 1) {
      const curve = new THREE.CatmullRomCurve3(routeCoords, true);
      const tubeGeo = new THREE.TubeGeometry(curve, 160, 0.14, 8, true);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xca8a04,
        emissive: 0xb45309,
        emissiveIntensity: 0.5,
        roughness: 0.4,
      });
      const highway = new THREE.Mesh(tubeGeo, tubeMat);
      mapGroup.add(highway);

      // Micro Travel Ferry / Car traversing the route
      const microCar = new THREE.Group();
      const carBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.28, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.6 })
      );
      microCar.add(carBody);
      microCarRef.current = microCar;
      mapGroup.add(microCar);
    }

    // 4. Layered Cartoon Clouds Floating OVER TOP of the Islands (matching image 3)
    const cloudLayerGroup = new THREE.Group();
    const cloudPuffMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      transparent: true,
      opacity: 0.82,
    });

    // Puffy cloud clusters positioned over the map and islands
    const cloudClusterPositions = [
      { x: 12, y: 4.8, z: 8, scale: 2.2 },
      { x: 16, y: 5.2, z: 12, scale: 2.6 }, // Hovering over bottom-right island like in Poptropica!
      { x: -14, y: 4.6, z: -6, scale: 2.0 },
      { x: -8, y: 5.0, z: 14, scale: 2.4 },
      { x: 4, y: 5.4, z: -12, scale: 2.5 },
      { x: 18, y: 4.5, z: -4, scale: 1.8 },
      { x: -18, y: 5.2, z: 8, scale: 2.1 },
    ];

    cloudClusterPositions.forEach((cfg) => {
      const cluster = new THREE.Group();
      cluster.position.set(cfg.x, cfg.y, cfg.z);

      // Multi-sphere puffy cumulus shape
      const sphereOffsets = [
        { dx: 0, dy: 0, dz: 0, r: 1.2 },
        { dx: 0.8, dy: -0.15, dz: 0.2, r: 0.95 },
        { dx: -0.8, dy: -0.2, dz: -0.1, r: 0.9 },
        { dx: 0.3, dy: 0.35, dz: -0.2, r: 0.85 },
        { dx: -0.4, dy: 0.25, dz: 0.3, r: 0.8 },
      ];

      sphereOffsets.forEach((sp) => {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(sp.r * cfg.scale * 0.45, 12, 10), cloudPuffMat);
        sphere.position.set(sp.dx * cfg.scale * 0.4, sp.dy * cfg.scale * 0.4, sp.dz * cfg.scale * 0.4);
        cluster.add(sphere);
      });

      cloudLayerGroup.add(cluster);
    });

    mapGroup.add(cloudLayerGroup);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Orbit Rotation: Strictly checked against autoRotateRef.current to stop immediately when Manual is selected!
      if (mapGroupRef.current) {
        if (autoRotateRef.current && !isDraggingRef.current) {
          rotationYRef.current += 0.0022;
        }
        mapGroupRef.current.rotation.y = rotationYRef.current;
      }

      // Animate floating beacons above the islands
      cityModelsMapRef.current.forEach((cityGrp) => {
        const beacon = cityGrp.getObjectByName('cityBeacon');
        if (beacon) {
          beacon.position.y = 4.2 + Math.sin(elapsed * 3.5 + Number(cityGrp.id)) * 0.2;
          beacon.rotation.y += 0.025;
        }
      });

      // Animate travel car/ferry along the route curve
      if (microCarRef.current && routeCoords.length > 1) {
        const loopT = (elapsed * 0.04) % 1.0;
        const curve = new THREE.CatmullRomCurve3(routeCoords, true);
        const pos = curve.getPointAt(loopT);
        const tangent = curve.getTangentAt(loopT);
        microCarRef.current.position.copy(pos);
        microCarRef.current.position.y += 0.2;
        microCarRef.current.lookAt(pos.clone().add(tangent));
      }

      // Gently drift the cloud layer over the map
      cloudLayerGroup.children.forEach((c, idx) => {
        c.position.x += Math.sin(elapsed * 0.2 + idx) * 0.004;
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [isOpen]);

  // Update selection rings when selected city changes
  useEffect(() => {
    cityModelsMapRef.current.forEach((cityGrp, vid) => {
      const isSel = vid === selectedVenueId;
      const isCur = vid === progress.currentVenueId;
      const beacon = cityGrp.getObjectByName('cityBeacon') as THREE.Mesh | undefined;
      if (beacon && beacon.material) {
        const mat = beacon.material as THREE.MeshStandardMaterial;
        mat.color.set(isSel ? 0xf59e0b : isCur ? 0x0284c7 : 0x785532);
        mat.emissive.set(isSel ? 0xd97706 : 0x0369a1);
      }
    });
  }, [selectedVenueId, progress.currentVenueId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMouseXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMouseXRef.current;
    lastMouseXRef.current = e.clientX;
    rotationYRef.current += deltaX * 0.007;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!cameraRef.current) return;
    const zoomFactor = e.deltaY * 0.035;
    const cam = cameraRef.current;
    const newY = THREE.MathUtils.clamp(cam.position.y + zoomFactor * 0.8, 14, 65);
    const newZ = THREE.MathUtils.clamp(cam.position.z + zoomFactor, 16, 75);
    cam.position.set(cam.position.x, newY, newZ);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#edd59f] flex flex-col select-none overflow-hidden text-amber-950 font-sans animate-in fade-in duration-200">
      {/* ------------------------------------------------------------- */}
      {/* TOP POPTROPICA HEADER BAR                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="relative px-4 sm:px-6 py-2.5 bg-gradient-to-b from-[#38bdf8] to-[#0284c7] border-b-4 border-[#0369a1] shadow-md flex items-center justify-between z-30 shrink-0">
        {/* Left: Blue Settings Cogwheel */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundFX.playClick();
              setAutoRotate((prev) => !prev);
            }}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center border-2 border-white/60 shadow-lg transition-transform active:scale-95 cursor-pointer ${
              autoRotate
                ? 'bg-amber-400 text-slate-950 shadow-[0_4px_12px_rgba(251,191,36,0.6)]'
                : 'bg-sky-700 text-white shadow-inner'
            }`}
            title={autoRotate ? 'Orbit is ON (Click to turn Manual)' : 'Orbit is OFF / Manual (Click to turn On)'}
          >
            <RotateCw className={`w-6 h-6 ${autoRotate ? 'animate-spin-slow' : ''}`} />
          </button>

          <div className="hidden sm:block">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-100 drop-shadow">
              3D ORBIT MODE
            </span>
            <div className="text-xs font-black text-white">
              {autoRotate ? 'Continuous Orbit' : 'Manual Rotate'}
            </div>
          </div>
        </div>

        {/* Center: Four Square World Tour Title */}
        <div className="flex items-center gap-2">
          <div className="relative text-center">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_3px_2px_rgba(3,105,161,1)] font-sans uppercase">
              FOUR SQUARE WORLD <span className="text-yellow-300 drop-shadow-[0_2px_2px_rgba(180,83,9,1)]">TOUR</span>
            </h1>
            <div className="text-[10px] sm:text-xs font-black text-sky-100 tracking-widest uppercase">
              TOP 10 WORLD CHAMPIONSHIP RANKED CITIES
            </div>
          </div>
        </div>

        {/* Right: Home / Close Cottage & Gold Coins */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#15803d] border-2 border-[#86efac] text-white font-black text-xs sm:text-sm shadow-md">
            <FourSquareCoin size={18} />
            <span>{progress.coins || 70}</span>
          </div>

          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="w-11 h-11 rounded-2xl bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white flex items-center justify-center border-2 border-white/60 shadow-lg transition-transform active:scale-95 cursor-pointer"
            title="Return to Game"
          >
            <Home className="w-5 h-5 drop-shadow" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAP BODY WITH STITCHED DASHED BORDER AND FLOATING CLOUDS       */}
      {/* ------------------------------------------------------------- */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#edd59f] flex flex-col">
        {/* Top Dashed Stitched Border matching Poptropica Screenshot */}
        <div className="w-full h-3 border-t-2 border-b-2 border-dashed border-[#8c6738]/50 bg-[#e5cb93] shrink-0 pointer-events-none" />

        {/* 3D Interactive Map Canvas */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          className="relative w-full flex-1 cursor-grab active:cursor-grabbing touch-none"
        />

        {/* Left Navigation Arrow Button (Bright Blue Poptropica Arrow) */}
        <button
          onClick={handlePrevCity}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-16 sm:w-14 sm:h-20 bg-gradient-to-r from-[#38bdf8] to-[#0284c7] hover:from-[#7dd3fc] hover:to-[#0369a1] text-white flex items-center justify-center rounded-r-2xl border-4 border-l-0 border-white/80 shadow-[0_10px_25px_rgba(2,132,199,0.5)] transition-all cursor-pointer active:scale-95"
          title="Previous Ranked City"
        >
          <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 -ml-1 stroke-[3]" />
        </button>

        {/* Right Navigation Arrow Button (Bright Blue Poptropica Arrow) */}
        <button
          onClick={handleNextCity}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-16 sm:w-14 sm:h-20 bg-gradient-to-l from-[#38bdf8] to-[#0284c7] hover:from-[#7dd3fc] hover:to-[#0369a1] text-white flex items-center justify-center rounded-l-2xl border-4 border-r-0 border-white/80 shadow-[0_10px_25px_rgba(2,132,199,0.5)] transition-all cursor-pointer active:scale-95"
          title="Next Ranked City"
        >
          <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 -mr-1 stroke-[3]" />
        </button>

        {/* 2D Puffy Cartoon Clouds Hovering Over Top of the Islands */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {/* Cloud cluster 1 - floating over bottom right island */}
          <div className="absolute bottom-24 right-12 w-80 h-32 opacity-85 animate-float-slow">
            <svg viewBox="0 0 320 120" className="w-full h-full drop-shadow-[0_12px_18px_rgba(140,103,56,0.25)]">
              <path
                d="M40 90 A30 30 0 0 1 70 40 A45 45 0 0 1 140 25 A50 50 0 0 1 220 30 A40 40 0 0 1 270 55 A35 35 0 0 1 290 90 A25 25 0 0 1 260 115 L50 115 A25 25 0 0 1 40 90 Z"
                fill="#fffdf5"
              />
              <path
                d="M60 85 A20 20 0 0 1 85 50 A35 35 0 0 1 135 40 A40 40 0 0 1 190 45 A30 30 0 0 1 230 65 A25 25 0 0 1 245 88 Z"
                fill="#fef08a"
                opacity="0.3"
              />
            </svg>
          </div>

          {/* Cloud cluster 2 - floating on top left */}
          <div className="absolute top-12 left-16 w-64 h-28 opacity-80 animate-float-delayed">
            <svg viewBox="0 0 280 110" className="w-full h-full drop-shadow-[0_10px_15px_rgba(140,103,56,0.2)]">
              <path
                d="M30 80 A25 25 0 0 1 60 35 A40 40 0 0 1 125 25 A45 45 0 0 1 195 30 A35 35 0 0 1 240 55 A30 30 0 0 1 255 80 A20 20 0 0 1 235 105 L45 105 A20 20 0 0 1 30 80 Z"
                fill="#fffef9"
              />
            </svg>
          </div>
        </div>

        {/* Expandable / Floating Top City Info Dossier */}
        {showDossier && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 max-w-xl w-[92%] sm:w-auto bg-[#fffdf5] border-4 border-[#8c6738] rounded-2xl p-4 sm:p-5 shadow-[0_15px_35px_rgba(120,85,50,0.35)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs border border-amber-600 shadow-sm">
                    WORLD RANK #{inspectedVenue.rank || inspectedVenue.order}
                  </span>
                  <span className="text-xs font-black text-[#8c6738] uppercase">
                    {inspectedVenue.region}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#451a03] mt-1">
                  {inspectedVenue.location}
                </h2>
              </div>

              <button
                onClick={() => setShowDossier(false)}
                className="w-7 h-7 rounded-full bg-[#f4e0b5] hover:bg-[#ebd49a] text-[#78350f] flex items-center justify-center font-bold text-xs cursor-pointer"
                title="Minimize details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Primary Reason for Ranking (from user table) */}
            <div className="mt-2.5 p-2.5 rounded-xl bg-[#fef3c7] border border-[#f59e0b]/50">
              <div className="text-[10px] font-mono font-bold uppercase text-[#92400e] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                PRIMARY REASON FOR RANKING
              </div>
              <div className="text-xs sm:text-sm font-black text-[#78350f] mt-0.5">
                {inspectedVenue.reasonForRanking}
              </div>
            </div>

            {/* Key Historical Milestone (from user table) */}
            <div className="mt-2 p-2.5 rounded-xl bg-[#e0f2fe] border border-[#38bdf8]/50">
              <div className="text-[10px] font-mono font-bold uppercase text-[#0369a1] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                KEY HISTORICAL MILESTONE
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#0c4a6e] mt-0.5">
                {inspectedVenue.keyMilestone}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3.5 pt-3 border-t-2 border-[#e5cb93] flex items-center gap-2.5">
              <button
                onClick={() => {
                  soundFX.playClick();
                  onSelectVenue(inspectedVenue);
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-md border-2 border-[#78350f] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <Car className="w-4 h-4 fill-slate-950" />
                <span>Travel to {inspectedVenue.location.split(',')[0]}</span>
              </button>

              {isCurrent && onResumeExploration && (
                <button
                  onClick={() => {
                    soundFX.playClick();
                    onResumeExploration();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md border-2 border-[#0369a1] transition-all cursor-pointer active:scale-95"
                >
                  Enter Arena
                </button>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* BOTTOM ROLLED PARCHMENT BANNER & 10 RANK PAGINATION DOTS      */}
        {/* ------------------------------------------------------------- */}
        <div className="w-full bg-[#ebd49a] border-t-4 border-[#8c6738] px-4 py-3 shrink-0 flex flex-col items-center justify-center gap-2 z-30 shadow-[0_-8px_20px_rgba(140,103,56,0.2)]">
          {/* Realistic Rolled Parchment Scroll Banner */}
          <div className="relative inline-flex items-center justify-center px-8 py-2 bg-gradient-to-r from-[#fef08a] via-[#fffbeb] to-[#fef08a] border-2 border-[#8c6738] rounded-md shadow-md text-center">
            {/* Left curled scroll roll */}
            <div className="absolute -left-3 top-0 bottom-0 w-3 bg-[#eab308] border-2 border-r-0 border-[#8c6738] rounded-l-md shadow-inner" />
            {/* Right curled scroll roll */}
            <div className="absolute -right-3 top-0 bottom-0 w-3 bg-[#eab308] border-2 border-l-0 border-[#8c6738] rounded-r-md shadow-inner" />

            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowDossier(true)}>
              <span className="text-xs sm:text-base font-black text-[#78350f] uppercase tracking-wide">
                Adventures of {inspectedVenue.location}
              </span>
              {!showDossier && (
                <span className="p-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black">
                  <Info className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          </div>

          {/* Bottom 10 Circular Rank Pagination Dots (matching Image 3) */}
          <div className="relative flex items-center justify-center gap-2.5 sm:gap-3.5 w-full max-w-xl">
            {VENUES.map((v, idx) => {
              const isSelected = v.id === selectedVenueId;
              const isCurrentStop = v.id === progress.currentVenueId;

              return (
                <button
                  key={v.id}
                  onClick={() => {
                    soundFX.playClick();
                    setSelectedVenueId(v.id);
                    setShowDossier(true);
                  }}
                  className={`group relative flex items-center justify-center transition-all cursor-pointer ${
                    isSelected ? 'scale-125' : 'hover:scale-110'
                  }`}
                  title={`Rank #${idx + 1}: ${v.location}`}
                >
                  {/* Outer ring */}
                  <div
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                      isSelected
                        ? 'border-[#78350f] bg-[#fef08a] shadow-[0_0_8px_rgba(234,179,8,0.8)]'
                        : isCurrentStop
                        ? 'border-[#0284c7] bg-[#bae6fd]'
                        : 'border-[#8c6738] bg-[#dfbe85]/60 hover:bg-[#dfbe85]'
                    }`}
                  >
                    {/* Concentric center dot for selected city (just like Poptropica screenshot!) */}
                    {isSelected ? (
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#78350f]" />
                    ) : (
                      <span className="text-[9px] font-black text-[#78350f]">{idx + 1}</span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Yellow Hot-Air Balloon from Screenshot */}
            <div className="absolute right-0 sm:right-4 -top-3 w-8 h-10 pointer-events-none animate-bounce-slow">
              <svg viewBox="0 0 32 40" className="w-full h-full drop-shadow-md">
                <path d="M16 2 C8 2 4 10 6 18 C8 24 13 28 16 28 C19 28 24 24 26 18 C28 10 24 2 16 2 Z" fill="#eab308" />
                <path d="M16 4 C11 4 8 10 10 18 C12 24 15 26 16 26 C17 26 20 24 22 18 C24 10 21 4 16 4 Z" fill="#facc15" />
                <rect x="14" y="31" width="4" height="4" rx="1" fill="#78350f" />
                <line x1="12" y1="27" x2="14" y2="31" stroke="#8c6738" strokeWidth="1" />
                <line x1="20" y1="27" x2="18" y2="31" stroke="#8c6738" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Dashed Stitched Border */}
        <div className="w-full h-3 border-t-2 border-b-2 border-dashed border-[#8c6738]/50 bg-[#e5cb93] shrink-0 pointer-events-none" />
      </div>
    </div>
  );
};
