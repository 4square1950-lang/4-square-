import { animateCampusTeacher, buildCampusRooms } from '../utils/campusRooms';
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { X, MapPin, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { VenueDef } from '../types/campaign';
import { VENUES } from '../utils/venueData';
import { soundFX } from '../services/soundEffects';
import { getVenueArt, venueStill } from '../utils/venueArt';
import { buildCampusCourt, buildCampusExterior, disposeCampus } from '../utils/campusScene';
import { CAMPUS_CAFE, CAMPUS_CAFETERIA, campusPlayground, SCHOOL } from '../utils/campusLayout';

interface ArenasModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedVenueIds: string[];
  activeVenueId: string;
  onSelectVenue: (venue: VenueDef) => void;
}

export type CameraViewPreset = 'overview' | 'entrance' | 'courtyard' | 'court' | 'gym' | 'art' | 'library' | 'lab' | 'cafe' | 'dining' | 'playground' | 'flythrough';

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
  const [autoRotate, setAutoRotate] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const viewRef = useRef(activeCamPreset);
  const spinRef = useRef(autoRotate);
  viewRef.current = activeCamPreset;
  spinRef.current = autoRotate;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rotationYRef = useRef(0);
  const playgroundRef = useRef(campusPlayground(VENUES.find(({ id }) => id === activeVenueId)?.id));
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const tourTimeRef = useRef(0);

  const currentVenue = VENUES[selectedIndex] || VENUES[0];
  playgroundRef.current = campusPlayground(currentVenue.id);
  const isUnlocked = unlockedVenueIds.includes(currentVenue.id);
  const isActive = currentVenue.id === activeVenueId;

  useEffect(() => {
    if (isOpen) {
      const idx = VENUES.findIndex((v) => v.id === activeVenueId);
      if (idx >= 0) setSelectedIndex(idx);
      setIsTourOpen(false);
      setActiveCamPreset('overview');
      rotationYRef.current = 0;
      setAutoRotate(false);
    }
  }, [isOpen, activeVenueId]);

  // Full-Screen 3D School Campus Renderer
  useEffect(() => {
    if (!isOpen || !isTourOpen || !containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    tourTimeRef.current = 0;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xa0b5bc);
    scene.fog = new THREE.FogExp2(0xa0b5bc, 0.0065);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 200);
    camera.position.set(23, 28.6, 43.8);
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
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Warm Sun & Sky Illumination
    const hemiLight = new THREE.HemisphereLight(0xfffaed, 0x82786c, 1.65);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    sunLight.position.set(24, 38, 22);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -42;
    sunLight.shadow.camera.right = 42;
    sunLight.shadow.camera.top = 42;
    sunLight.shadow.camera.bottom = -42;
    sunLight.shadow.normalBias = 0.025;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xd7e3e9, 0.7);
    fillLight.position.set(-20, 20, -20);
    scene.add(fillLight);

    const aim = new THREE.Vector3();
    let previousView: CameraViewPreset | undefined;
    const offset = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const activeCamPreset = viewRef.current;
      tourTimeRef.current += delta;

      switch (activeCamPreset) {
        case 'entrance':
          aim.set(0, 2.1, SCHOOL.front); offset.set(-11, 5.8, -19); break;
        case 'courtyard':
          aim.set(0, 0.2, -30); offset.set(17, 10, -15); break;
        case 'court':
          aim.set(0, 1.15, -1.4); offset.set(8.4, 5.1, 12.9); break;
        case 'gym': {
          aim.set(-14.8, 1.5, -10.4); offset.set(-3.2, 1.25, -9.45); break;
        }
        case 'art':
          aim.set(-24.1, 1.15, -15); offset.set(1.5, .7, 4.6); break;
        case 'library':
          aim.set(16.6, 1.25, -15); offset.set(-6.5, 1.05, 2.5); break;
        case 'lab':
          aim.set(22.5, 1.2, -18.7); offset.set(-2.0, 1.0, 6.2); break;
        case 'cafe':
        case 'dining': {
          const room = activeCamPreset === 'cafe' ? CAMPUS_CAFE : CAMPUS_CAFETERIA;
          aim.set(room.x, 1.15, room.z - 1.7); offset.set(.8, .75, room.depth / 2 + .6); break;
        }
        case 'playground': {
          const play = playgroundRef.current;
          aim.set(play.x, .8, play.z); offset.set(-3, 5.5, -8); break;
        }
        case 'flythrough':
          aim.set(0, 1, -10); offset.set(0, 29, 58); break;
        default:
          aim.set(0, 1.6, -8.2); offset.set(23, 27, 52);
      }
      if (spinRef.current && activeCamPreset !== 'flythrough' && !isDraggingRef.current) rotationYRef.current += delta * 0.14;
      const angle = rotationYRef.current + (activeCamPreset === 'flythrough' ? tourTimeRef.current * 0.24 : 0);
      offset.applyAxisAngle(up, angle).add(aim);
      const inside = (view: CameraViewPreset | undefined) => view !== undefined && ['gym','art','library','lab','cafe','dining'].includes(view);
      if (inside(activeCamPreset) || inside(previousView)) camera.position.copy(offset);
      else camera.position.lerp(offset, 0.18);
      previousView = activeCamPreset;
      camera.lookAt(aim);

      if (activeCamPreset === 'gym') animateCampusTeacher(scene.getObjectByName('campusTeacher'), tourTimeRef.current);
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
      sceneRef.current = null;
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
    };
  }, [isOpen, isTourOpen]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!isOpen || !isTourOpen || !scene) return;
    const campus = buildCampusExterior(currentVenue.id);
    campus.add(buildCampusCourt(currentVenue.id).group, buildCampusRooms().group);
    scene.add(campus);
    return () => {
      scene.remove(campus);
      disposeCampus(campus);
    };
  }, [isOpen, isTourOpen, currentVenue.id]);

  // Pointer Drag Orbit
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !e.isPrimary) return;
    isDraggingRef.current = true;
    lastMouseXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
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
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
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
  const perspectives: { id: CameraViewPreset; label: string }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'entrance', label: 'Entrance' },
    { id: 'courtyard', label: 'Front walk' }, { id: 'court', label: 'Rear court' },
    { id: 'gym', label: 'Classroom' }, { id: 'art', label: 'Art room' }, { id: 'library', label: 'Library' },
    { id: 'lab', label: 'Lab' }, { id: 'cafe', label: 'Café' }, { id: 'dining', label: 'Dining hall' },
    { id: 'playground', label: 'Playground' },
    { id: 'flythrough', label: 'Flythrough' },
  ];
  const control = 'rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 font-semibold hover:bg-neutral-800';

  return (
    <section role="dialog" aria-modal="true" aria-label="School Venues" className="fixed inset-0 z-50 overflow-auto bg-[#15191b] text-stone-100"
      onKeyDown={(event) => { if (event.key === 'Escape') onClose(); if (event.key === 'ArrowLeft') handlePrev(); if (event.key === 'ArrowRight') handleNext(); }}>
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-9">
        <h2 className="text-3xl font-black tracking-tight">School Venues</h2>
        <button onClick={onClose} aria-label="Close venues" className="rounded-lg p-2 hover:bg-white/10"><X /></button>
      </header>
      <div className="w-full px-4 py-4">
        <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-neutral-900">
          <div className="relative h-[calc(100dvh-172px)] min-h-[340px] overflow-hidden bg-[#263838]">
            {isTourOpen ? (
              <div ref={containerRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
                className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing" />
            ) : <img key={currentVenue.id} src={venueStill(currentVenue.id)} alt={`Four Square court inspired by ${getVenueArt(currentVenue.id).landmark}`} className="h-full w-full object-cover" />}
          </div>
          <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-xl border border-white/15 bg-neutral-950/85 p-4 backdrop-blur">
            <p className="mb-2 flex items-center gap-2 text-sm text-amber-200"><MapPin size={15} />{currentVenue.location}</p>
            <h3 className="mb-4 text-2xl font-black leading-tight">{currentVenue.name}</h3>
            <p className="mb-5 text-sm text-neutral-400">{isActive ? 'Current venue' : isUnlocked ? 'Available' : 'Unlock in Campaign'}</p>
            <div className="flex flex-wrap gap-2">
              <button className={control} onClick={() => setIsTourOpen(!isTourOpen)}>{isTourOpen ? 'Photo' : '3D tour'}</button>
              <button disabled={!isUnlocked || isActive} onClick={() => onSelectVenue(currentVenue)} className="rounded-lg bg-amber-200 px-3 py-2 font-bold text-neutral-950 disabled:opacity-45">{isActive ? 'Selected' : 'Select venue'}</button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className={control} onClick={handlePrev} aria-label="Previous venue"><ChevronLeft size={20} /></button>
          <span className="min-w-16 text-center text-sm text-neutral-300">{selectedIndex + 1} / {VENUES.length}</span>
          <button className={control} onClick={handleNext} aria-label="Next venue"><ChevronRight size={20} /></button>
          {isTourOpen && <>
            {perspectives.map(({ id, label }) => <button key={id} onClick={() => { rotationYRef.current = 0; setActiveCamPreset(id); }} aria-pressed={activeCamPreset === id}
              className={`${control} ${activeCamPreset === id ? 'text-amber-200' : 'text-neutral-300'}`}>{label}</button>)}
            <button className={`${control} inline-flex items-center gap-2`} aria-pressed={autoRotate} onClick={() => setAutoRotate(!autoRotate)}><RotateCw size={16} /> Auto-rotate</button>
          </>}
        </div>
      </div>
    </section>
  );
};
