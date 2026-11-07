import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VenueDef } from '../types/campaign';
import { buildRoadTripCar } from '../utils/characterModelBuilder';
import { soundFX } from '../services/soundEffects';
import { Car, Compass, MapPin, Sparkles, Navigation, FastForward } from 'lucide-react';

interface CarRideViewProps {
  fromVenue: VenueDef;
  toVenue: VenueDef;
  onArrival: () => void;
}

export const CarRideView: React.FC<CarRideViewProps> = ({
  fromVenue,
  toVenue,
  onArrival,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [speedMph, setSpeedMph] = useState(65);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x38bdf8); // Sunny morning road trip sky
    scene.fog = new THREE.FogExp2(0xbae6fd, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(3.5, 3.2, 7.5);
    camera.lookAt(0, 1.2, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      renderer = new THREE.WebGLRenderer({ antialias: false });
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.3);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xffedd5, 1.8);
    sun.position.set(20, 30, 15);
    sun.castShadow = true;
    scene.add(sun);

    // The Blue Road Trip Hatchback with Luggage Roof Rack
    const car = buildRoadTripCar();
    car.position.set(0, 0, 0);
    scene.add(car);

    // Highway Asphalt Ground (infinite cycling strip)
    const roadSegments: THREE.Mesh[] = [];
    const roadGeo = new THREE.PlaneGeometry(10, 240);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 0, 0);
    scene.add(road);
    roadSegments.push(road);

    // Yellow Dashed Highway Centerline
    const dashGroup = new THREE.Group();
    for (let i = -100; i < 100; i += 6) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.25, 3).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      dash.position.set(0, 0.01, i);
      dashGroup.add(dash);
    }
    scene.add(dashGroup);

    // Grass Shoulders & Rolling Hills
    const grassL = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 240).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 })
    );
    grassL.position.set(-35, -0.05, 0);
    const grassR = grassL.clone();
    grassR.position.set(35, -0.05, 0);
    scene.add(grassL, grassR);

    // Pine Trees along the highway
    const treeGroup = new THREE.Group();
    for (let i = 0; i < 30; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const xPos = side * (8 + Math.random() * 18);
      const zPos = -100 + i * 8;

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x451a03 })
      );
      trunk.position.set(xPos, 0.75, zPos);

      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(1.8, 4.0, 7),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 })
      );
      foliage.position.set(xPos, 3.5, zPos);
      treeGroup.add(trunk, foliage);
    }
    scene.add(treeGroup);

    // Speed Lines / Dust
    const speedLinesGeo = new THREE.BufferGeometry();
    const lineCount = 40;
    const positions = new Float32Array(lineCount * 6);
    for (let i = 0; i < lineCount; i++) {
      const lx = (Math.random() - 0.5) * 8;
      const ly = 0.2 + Math.random() * 2;
      const lz = (Math.random() - 0.5) * 50;
      positions[i * 6] = lx;
      positions[i * 6 + 1] = ly;
      positions[i * 6 + 2] = lz;
      positions[i * 6 + 3] = lx;
      positions[i * 6 + 4] = ly;
      positions[i * 6 + 5] = lz - 4;
    }
    speedLinesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const speedLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
    const speedLines = new THREE.LineSegments(speedLinesGeo, speedLineMat);
    scene.add(speedLines);

    let animId: number;
    let clock = new THREE.Clock();
    const duration = 4.5; // 4.5 second road trip sequence
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      const currentProg = Math.min(1.0, elapsed / duration);
      setProgress(currentProg);

      // Car vibration & spring physics
      car.position.y = Math.sin(now * 0.02) * 0.015;
      car.rotation.z = Math.sin(now * 0.005) * 0.01;

      // Scroll dashed road lines backward
      dashGroup.children.forEach((dash) => {
        dash.position.z += 1.2;
        if (dash.position.z > 80) dash.position.z -= 160;
      });

      // Scroll scenery trees backward
      treeGroup.children.forEach((t) => {
        t.position.z += 1.2;
        if (t.position.z > 80) t.position.z -= 160;
      });

      // Dynamic Speedometer fluctuation
      setSpeedMph(Math.round(62 + Math.sin(now * 0.003) * 6));

      renderer.render(scene, camera);

      if (currentProg >= 1.0) {
        cancelAnimationFrame(animId);
        soundFX.playCheer();
        onArrival();
      }
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [fromVenue, toVenue]);

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col select-none overflow-hidden animate-in fade-in duration-300">
      {/* 3D Highway Stage */}
      <div ref={containerRef} className="w-full h-full relative" />

      {/* Top Road Trip Header Banner */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="p-4 rounded-3xl bg-slate-950/80 backdrop-blur-md border border-amber-400/40 shadow-2xl flex items-center gap-4 pointer-events-auto">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-lg">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest uppercase text-amber-400 font-black flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" /> ON THE ROAD • TRANSIT
            </div>
            <h2 className="text-xl font-black text-white">
              Traveling to {toVenue.name.replace('The ', '')}
            </h2>
          </div>
        </div>

        {/* Speedometer & Compass */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-right shadow-xl">
            <div className="text-[9px] font-mono uppercase text-slate-400 font-bold">Speed</div>
            <div className="text-lg font-black text-amber-300 font-mono">{speedMph} MPH</div>
          </div>
          <button
            onClick={onArrival}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl transition-all cursor-pointer active:scale-95"
          >
            <FastForward className="w-4 h-4" />
            <span>Skip Trip</span>
          </button>
        </div>
      </div>

      {/* Bottom Progress Bar & Scenic Highway Sign */}
      <div className="absolute bottom-8 left-8 right-8 pointer-events-none flex flex-col items-center gap-3">
        {/* Scenic Road Sign */}
        <div className="px-6 py-2.5 rounded-2xl bg-emerald-800/90 border-2 border-emerald-400 text-white font-mono font-black text-xs tracking-wider shadow-2xl flex items-center gap-3 pointer-events-auto">
          <MapPin className="w-4 h-4 text-emerald-300" />
          <span>Next Stop: {toVenue.location.toUpperCase()}</span>
          <span className="text-emerald-300">•</span>
          <span>{Math.round((1 - progress) * 24)} km remaining</span>
        </div>

        {/* Trip Progress Bar */}
        <div className="w-full max-w-xl h-3.5 bg-slate-950/90 backdrop-blur-md rounded-full border border-slate-700 p-0.5 overflow-hidden shadow-2xl">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 rounded-full transition-all duration-100"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
