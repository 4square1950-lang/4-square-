import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  X,
  Sparkles,
  Palette,
  Shirt,
  Scissors,
  Glasses,
  Check,
  RotateCw,
  Dices,
  Crown,
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Eye,
  Sliders,
} from 'lucide-react';
import { soundFX } from '../services/soundEffects';
import {
  CharacterDef,
  CHARACTERS,
  CharacterCustomization,
  CreatureArchetype,
  DEFAULT_CUSTOMIZATION,
  getStoredCustomization,
  saveStoredCustomization,
  getEquippedCharacterId,
  setEquippedCharacterId,
  getStoredCoins,
  saveStoredCoins,
  getUnlockedCharacterIds,
  unlockCharacter,
  getUnlockedCreatureForms,
  unlockCreatureForm,
  ACCESSORY_TYPES,
  SHIRT_TYPES,
  PANTS_TYPES,
  SHOES_TYPES,
} from '../utils/characters';
import { buildCustomizablePlayerMesh } from '../utils/characterModelBuilder';
import { ColorWheelPicker } from './ColorWheelPicker';
import { FourSquareCoin } from './FourSquareCoin';

export interface CharacterCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (customization: CharacterCustomization) => void;
  onSaveCustomization?: (customization: CharacterCustomization) => void;
  currentCustomization?: CharacterCustomization;
}

export const CREATURE_FORMS: {
  id: CreatureArchetype;
  name: string;
  badge: string;
  desc: string;
  icon: string;
  tagColor: string;
  price: number;
}[] = [
  {
    id: 'athlete',
    name: 'Stylized Athlete',
    badge: 'Prodigy',
    desc: 'Anatomically sculpted torso, deltoid shoulder caps, sports jersey & fresh sneakers.',
    icon: '🏃',
    tagColor: 'from-blue-600 to-indigo-600',
    price: 0,
  },
  {
    id: 'slime',
    name: 'Gloop Slime King',
    badge: 'Bio Gel Overlord',
    desc: 'Translucent bio-slime entity with floating gel core, crown and bouncy elastic form.',
    icon: '👑',
    tagColor: 'from-lime-500 to-emerald-600',
    price: 0,
  },
  {
    id: 'mecha',
    name: 'Cyber Mecha',
    badge: 'Sci-Fi Unit',
    desc: 'Titanium armor plating, glowing Arc Reactor core, heavy pauldrons & neon visor.',
    icon: '🤖',
    tagColor: 'from-cyan-500 to-blue-600',
    price: 0,
  },
  {
    id: 'doggo',
    name: 'Barnaby Doggo',
    badge: 'Cartoon Hound',
    desc: 'Sassy talking hound with floppy ears, snout, wagging tail and open palm slapping mitts.',
    icon: '🐶',
    tagColor: 'from-amber-500 to-yellow-600',
    price: 100,
  },
  {
    id: 'golem',
    name: 'Plasma Golem',
    badge: 'Obsidian Titan',
    desc: 'Basalt rock armor, molten plasma chest fissure, stone brow horns & crystal boulders.',
    icon: '🌋',
    tagColor: 'from-orange-500 to-red-600',
    price: 200,
  },
  {
    id: 'dragon',
    name: 'Pyro Dragon',
    badge: 'Flame Beast',
    desc: 'Reptilian scaled dragon with snout, nostrils, sweeping horns, dorsal ridge & fiery dragon wings.',
    icon: '🐉',
    tagColor: 'from-red-600 to-orange-500',
    price: 400,
  },
  {
    id: 'alien',
    name: 'Cosmic Starlord',
    badge: 'Galactic Entity',
    desc: 'Bioluminescent alien cranium, antennae with glowing orb tips, triple star eyes & levitating shoulder rings.',
    icon: '👽',
    tagColor: 'from-fuchsia-500 to-indigo-600',
    price: 800,
  },
  {
    id: 'shadow',
    name: 'Shadow Shinobi',
    badge: 'Phantom Assassin',
    desc: 'Ethereal ninja cowl, glowing purple spectral eyes, demon shoulder pauldrons & shadow scarf.',
    icon: '🥷',
    tagColor: 'from-purple-600 to-slate-900',
    price: 1600,
  },
  {
    id: 'bot',
    name: 'Retro Arcade Bot',
    badge: 'Pixel Synthetic',
    desc: 'CRT screen face with animated pixel smile, top spring antenna, coin slot & chrome servos.',
    icon: '👾',
    tagColor: 'from-emerald-500 to-teal-600',
    price: 3200,
  },
  {
    id: 'wolf',
    name: 'Dire Wolf Beast',
    badge: 'Mythic Beast',
    desc: 'Lupine snout, sharp white fangs, shoulder fur mane, curved tail & predatory amber eyes.',
    icon: '🐺',
    tagColor: 'from-amber-600 to-rose-600',
    price: 6400,
  },
];

const PRESETS: { name: string; desc: string; icon: string; style: CharacterCustomization }[] = [
  {
    name: 'Classic Rookie',
    desc: 'Timeless schoolyard split-color jersey and backwards cap.',
    icon: '🧢',
    style: {
      ...DEFAULT_CUSTOMIZATION,
      creatureArchetype: 'athlete',
      shirtColor: '#2563EB',
      shirtSecondaryColor: '#EF4444',
      shirtPattern: 'split',
      hatType: 'backwards_cap',
      hatColor: '#EF4444',
      pantsColor: '#1E293B',
      shoesColor: '#F8FAFC',
      hasShades: false,
      hasGoldChain: false,
      hasHeadphones: false,
      hasWristbands: true,
      wristbandColor: '#F59E0B',
    },
  },
  {
    name: 'Cyber Mecha Prime',
    desc: 'Heavy alloy plating with pulsing blue Arc Reactor and cyber pauldrons.',
    icon: '🤖',
    style: {
      ...DEFAULT_CUSTOMIZATION,
      creatureArchetype: 'mecha',
      shirtColor: '#1E293B',
      shirtSecondaryColor: '#06B6D4',
      shirtPattern: 'solid',
      pantsColor: '#0F172A',
      shoesColor: '#38BDF8',
      hasShades: false,
      hasGoldChain: false,
      hasHeadphones: false,
      hasWristbands: true,
      wristbandColor: '#06B6D4',
    },
  },
  {
    name: 'Shadow Phantom',
    desc: 'Dark ninja cowl with violet gaze and shadow armor.',
    icon: '🥷',
    style: {
      ...DEFAULT_CUSTOMIZATION,
      creatureArchetype: 'shadow',
      shirtColor: '#0F172A',
      shirtSecondaryColor: '#7C3AED',
      shirtPattern: 'solid',
      pantsColor: '#020617',
      shoesColor: '#7C3AED',
      hasShades: false,
      hasGoldChain: false,
      hasHeadphones: false,
      hasWristbands: true,
      wristbandColor: '#A855F7',
    },
  },
  {
    name: 'Cosmic Starlord',
    desc: 'Celestial alien champion with levitating energy rings.',
    icon: '👽',
    style: {
      ...DEFAULT_CUSTOMIZATION,
      creatureArchetype: 'alien',
      shirtColor: '#4C1D95',
      shirtSecondaryColor: '#06B6D4',
      shirtPattern: 'geometric',
      pantsColor: '#1E1B4B',
      shoesColor: '#F43F5E',
      hasShades: false,
      hasGoldChain: true,
      hasHeadphones: false,
      hasWristbands: true,
    },
  },
  {
    name: 'Feral Dire Wolf',
    desc: 'Apex predator with canine snout, fangs, shoulder fur mane and wagging tail.',
    icon: '🐺',
    style: {
      ...DEFAULT_CUSTOMIZATION,
      creatureArchetype: 'wolf',
      hairColor: '#334155',
      shirtColor: '#DC2626',
      shirtSecondaryColor: '#F59E0B',
      pantsColor: '#0F172A',
      shoesColor: '#E2E8F0',
      hasShades: false,
      hasGoldChain: false,
      jerseyNumber: 9,
    },
  },
  {
    name: 'Molten Obsidian Golem',
    desc: 'Basalt titan with glowing lava fissure and crystal boulder shoulders.',
    icon: '🌋',
    style: {
      ...DEFAULT_CUSTOMIZATION,
      creatureArchetype: 'golem',
      shirtColor: '#0F172A',
      shirtSecondaryColor: '#F97316',
      pantsColor: '#1E293B',
      shoesColor: '#06B6D4',
      jerseyNumber: 0,
    },
  },
  {
    name: 'Pixel Arcade Bot',
    desc: '80s arcade machine with glowing green CRT screen and coin slot.',
    icon: '👾',
    style: {
      ...DEFAULT_CUSTOMIZATION,
      creatureArchetype: 'bot',
      shirtColor: '#0284C7',
      shirtSecondaryColor: '#F59E0B',
      pantsColor: '#0F172A',
      shoesColor: '#10B981',
      jerseyNumber: 84,
    },
  },
  {
    name: 'Cyber Neon Volt',
    desc: 'Ultra-bright cyan & hot pink futuristic court street style.',
    icon: '⚡',
    style: {
      ...DEFAULT_CUSTOMIZATION,
      creatureArchetype: 'athlete',
      skinColor: '#06B6D4',
      shirtColor: '#EC4899',
      shirtSecondaryColor: '#06B6D4',
      shirtPattern: 'striped',
      hatType: 'headband',
      hatColor: '#06B6D4',
      pantsColor: '#0F172A',
      shoesColor: '#EC4899',
      hasShades: true,
      shadesColor: '#0F172A',
      hasGoldChain: false,
      hasHeadphones: true,
      headphonesColor: '#06B6D4',
      hasWristbands: true,
      wristbandColor: '#EC4899',
      jerseyNumber: 99,
    },
  },
];

type CustomizerTab = 'characters' | 'form' | 'jersey' | 'pants' | 'head' | 'accessories' | 'presets';

export const CharacterCustomizerModal: React.FC<CharacterCustomizerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveCustomization,
  currentCustomization,
}) => {
  const [activeTab, setActiveTab] = useState<CustomizerTab>('characters');
  const [custom, setCustom] = useState<CharacterCustomization>(() => {
    return currentCustomization || getStoredCustomization();
  });
  const [equippedCharId, setEquippedCharId] = useState<string>(() => getEquippedCharacterId());
  const [coins, setCoins] = useState<number>(() => getStoredCoins());
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() => getUnlockedCharacterIds());
  const [unlockedCreatures, setUnlockedCreatures] = useState<CreatureArchetype[]>(
    () => getUnlockedCreatureForms() as CreatureArchetype[]
  );
  const [autoRotate, setAutoRotate] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(2.5);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const characterGroupRef = useRef<THREE.Group | null>(null);
  const rotationYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);

  const equippedChar = CHARACTERS.find((c) => c.id === equippedCharId) || CHARACTERS[0];

  useEffect(() => {
    if (isOpen) {
      setCustom(currentCustomization || getStoredCustomization());
      setEquippedCharId(getEquippedCharacterId());
      setCoins(getStoredCoins());
      setUnlockedIds(getUnlockedCharacterIds());
      setUnlockedCreatures(getUnlockedCreatureForms() as CreatureArchetype[]);
    }
  }, [isOpen, currentCustomization]);

  // Setup 3D Viewport on Left
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const container = containerRef.current;
    const width = Math.max(container.clientWidth || 360, 200);
    const height = Math.max(container.clientHeight || 450, 200);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a101f);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0.95, zoomLevel);
    camera.lookAt(0, 0.75, 0);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      renderer = new THREE.WebGLRenderer({ antialias: false });
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.4);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-2, 2, -2);
    scene.add(rimLight);

    // Mini Court Turntable Platform
    const platformGeo = new THREE.CylinderGeometry(0.9, 1.0, 0.1, 32);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.2,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.05;
    platform.receiveShadow = true;
    scene.add(platform);

    // Neon Court Ring on platform
    const ringGeo = new THREE.RingGeometry(0.76, 0.8, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.005;
    scene.add(ring);

    // Build initial mesh immediately
    const charMesh = buildCustomizablePlayerMesh(equippedChar, custom);
    charMesh.position.set(0, 0, 0);
    charMesh.rotation.y = rotationYRef.current;
    scene.add(charMesh);
    characterGroupRef.current = charMesh;

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (characterGroupRef.current) {
        if (autoRotate && !isDraggingRef.current) {
          rotationYRef.current += 0.008;
        }
        characterGroupRef.current.rotation.y = rotationYRef.current;
        characterGroupRef.current.position.y = Math.sin(elapsed * 2.5) * 0.015;
      }
      renderer.render(scene, camera);
    };
    animate();

    const updateSize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = Math.max(container.clientWidth || 360, 200);
      const h = Math.max(container.clientHeight || 450, 200);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    window.addEventListener('resize', updateSize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [isOpen]);

  // Update 3D Character Mesh when `custom` state changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (characterGroupRef.current) {
      scene.remove(characterGroupRef.current);
    }

    const newMesh = buildCustomizablePlayerMesh(equippedChar, custom);
    newMesh.position.set(0, 0, 0);
    newMesh.rotation.y = rotationYRef.current;
    scene.add(newMesh);
    characterGroupRef.current = newMesh;
  }, [custom, equippedChar]);

  // Update Zoom
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.z = zoomLevel;
    }
  }, [zoomLevel]);

  // Mouse / Touch Drag to Spin Character
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMouseXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMouseXRef.current;
    lastMouseXRef.current = e.clientX;
    rotationYRef.current += deltaX * 0.015;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleResetAngle = () => {
    rotationYRef.current = 0;
  };

  const handleRandomize = () => {
    soundFX.playClick();
    const colors = ['#2563EB', '#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6', '#EC4899', '#F97316', '#FACC15', '#0F172A'];
    const patterns: CharacterCustomization['shirtPattern'][] = ['solid', 'split', 'striped', 'drip', 'geometric'];
    const hats: CharacterCustomization['hatType'][] = ['none', 'backwards_cap', 'headband', 'beanie', 'crown'];
    const hairs: CharacterCustomization['hairStyle'][] = ['short', 'afro', 'spiky'];

    const randomColor = () => colors[Math.floor(Math.random() * colors.length)];
    const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    setCustom((prev) => ({
      ...prev,
      creatureArchetype: randomItem(CREATURE_FORMS.map((f) => f.id)),
      shirtColor: randomColor(),
      shirtSecondaryColor: randomColor(),
      shirtPattern: randomItem(patterns),
      pantsColor: randomColor(),
      skinColor: randomColor(),
      hatType: randomItem(hats),
      hatColor: randomColor(),
      hairStyle: randomItem(hairs),
      hairColor: randomColor(),
      shoesColor: randomColor(),
      hasShades: Math.random() > 0.5,
      shadesColor: randomColor(),
      hasGoldChain: Math.random() > 0.6,
      hasHeadphones: Math.random() > 0.6,
      headphonesColor: randomColor(),
      hasWristbands: Math.random() > 0.4,
      wristbandColor: randomColor(),
      jerseyNumber: Math.floor(Math.random() * 99) + 1,
      playerNickname: prev.playerNickname || 'King of Kanata',
    }));
  };

  const handleSave = () => {
    soundFX.playClick();
    saveStoredCustomization(custom);
    if (onSave) onSave(custom);
    if (onSaveCustomization) onSaveCustomization(custom);
    onClose();
  };

  const handleResetDefaults = () => {
    soundFX.playClick();
    setCustom(DEFAULT_CUSTOMIZATION);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen z-50 bg-slate-950 flex flex-col md:flex-row overflow-hidden text-slate-100 select-none animate-in fade-in duration-200">
      {/* ------------------------------------------------------------- */}
      {/* LEFT SIDE: Full-Height 3D Turntable Character Stage */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full md:w-1/2 h-[42vh] md:h-full relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col">
        {/* Top Overlay Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-400/40 backdrop-blur-md flex items-center gap-2 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {equippedChar.name}
            </span>
            <span className="text-[11px] text-amber-300 font-mono font-bold">#{custom.jerseyNumber ?? 4}</span>
          </div>
        </div>

        {/* 3D Canvas Viewport */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full flex-1 cursor-grab active:cursor-grabbing touch-none"
        />

        {/* Bottom 3D Viewport Controls Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl pointer-events-auto">
            <button
              onClick={() => setAutoRotate((prev) => !prev)}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                autoRotate ? 'bg-amber-400 text-slate-950 shadow' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle Auto Rotation"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetAngle}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Reset View Angle"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(1.5, z - 0.3))}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.min(3.8, z + 0.3))}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleRandomize}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs uppercase shadow-xl hover:from-purple-500 hover:to-indigo-500 transition-all cursor-pointer pointer-events-auto active:scale-95"
          >
            <Dices className="w-4 h-4" />
            <span className="hidden sm:inline">Randomize</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT SIDE: Full Customization Console with Color Wheels */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full md:w-1/2 h-[58vh] md:h-full flex flex-col bg-slate-950">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-black">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>Character Studio</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Full Suite
                </span>
              </h2>
              <div className="text-xs text-slate-400">Color Wheels • Hex & Decimal Codes • Style Presets</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-3 bg-slate-900/60 border-b border-slate-800/80 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => { soundFX.playClick(); setActiveTab('characters'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              activeTab === 'characters' ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-400/50' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-500" />
            <span>Characters (10)</span>
          </button>

          <button
            onClick={() => { soundFX.playClick(); setActiveTab('form'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              activeTab === 'form' ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-400/50' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Creature Form</span>
          </button>

          <button
            onClick={() => { soundFX.playClick(); setActiveTab('jersey'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              activeTab === 'jersey' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Shirt className="w-4 h-4" />
            <span>Jersey & Shirt</span>
          </button>

          <button
            onClick={() => { soundFX.playClick(); setActiveTab('pants'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              activeTab === 'pants' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Shorts & Shoes</span>
          </button>

          <button
            onClick={() => { soundFX.playClick(); setActiveTab('head'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              activeTab === 'head' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Skin & Hair</span>
          </button>

          <button
            onClick={() => { soundFX.playClick(); setActiveTab('accessories'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              activeTab === 'accessories' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Glasses className="w-4 h-4" />
            <span>Accessories</span>
          </button>

          <button
            onClick={() => { soundFX.playClick(); setActiveTab('presets'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
              activeTab === 'presets' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Presets</span>
          </button>
        </div>

        {/* Tab Scroll Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          {/* TAB 0: 10 CHARACTERS ROSTER */}
          {activeTab === 'characters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Character Studio & Roster
                  </div>
                  <div className="text-xs text-slate-400">
                    Select & unlock from 10 distinct competitors.
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 font-black text-sm">
                  <FourSquareCoin size={18} />
                  <span>{coins} Coins</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CHARACTERS.slice(0, 10).map((char, index) => {
                  const isUnlocked = unlockedIds.includes(char.id) || char.isFree || index < 3;
                  const isEquipped = equippedCharId === char.id;

                  return (
                    <div
                      key={char.id}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isEquipped
                          ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-400 ring-2 ring-amber-400/40'
                          : isUnlocked
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-950/80 border-slate-900 opacity-90'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-black text-sm text-white truncate">{char.name}</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 flex items-center gap-1">
                            {index < 3 ? 'FREE' : <><FourSquareCoin size={12} /><span>{char.price}</span></>}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2 line-clamp-2">{char.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="text-[10px] text-slate-400 font-mono">
                          SPD:{char.speed} | PWR:{char.power} | SPN:{char.spin}
                        </div>

                        {isEquipped ? (
                          <span className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">
                            Equipped
                          </span>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => {
                              soundFX.playClick();
                              setEquippedCharId(char.id);
                              setEquippedCharacterId(char.id);
                            }}
                            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Equip
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (coins >= char.price) {
                                soundFX.playClick();
                                const newBalance = coins - char.price;
                                setCoins(newBalance);
                                saveStoredCoins(newBalance);
                                const newUnlocked = unlockCharacter(char.id);
                                setUnlockedIds(newUnlocked);
                                setEquippedCharId(char.id);
                                setEquippedCharacterId(char.id);
                              } else {
                                soundFX.playWhistle();
                              }
                            }}
                            className={`px-3 py-1 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                              coins >= char.price
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-md'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            Unlock ({char.price} 🪙)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activeTab === 'form' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Character Body & Creature Form
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Active: {(custom.creatureArchetype || 'athlete').toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 font-black text-xs">
                      <FourSquareCoin size={14} />
                      <span>{coins}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  First 3 forms are FREE! Unlock additional creature forms with Four Square Coins.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CREATURE_FORMS.map((form) => {
                    const isFormUnlocked = form.price === 0 || unlockedCreatures.includes(form.id);
                    const isSelected = (custom.creatureArchetype || 'athlete') === form.id;

                    return (
                      <div
                        key={form.id}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                            : isFormUnlocked
                            ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                            : 'bg-slate-950/80 border-slate-900 opacity-90'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <span className="text-3xl p-2 rounded-xl bg-slate-950/70 border border-slate-800 shrink-0">
                            {form.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-black text-sm text-white truncate">
                                {form.name}
                              </span>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${form.tagColor}`}>
                                {form.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                              {form.desc}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-1">
                          <div className="flex items-center gap-1.5 text-xs font-black">
                            {form.price === 0 ? (
                              <span className="text-emerald-400 font-mono uppercase text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                FREE
                              </span>
                            ) : (
                              <div className="flex items-center gap-1 text-amber-300 font-mono text-xs">
                                <FourSquareCoin size={14} />
                                <span>{form.price} Coins</span>
                              </div>
                            )}
                          </div>

                          {isSelected ? (
                            <span className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">
                              Selected
                            </span>
                          ) : isFormUnlocked ? (
                            <button
                              onClick={() => {
                                soundFX.playClick();
                                setCustom((prev) => ({
                                  ...prev,
                                  creatureArchetype: form.id,
                                }));
                              }}
                              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition-colors cursor-pointer"
                            >
                              Equip Form
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (coins >= form.price) {
                                  soundFX.playClick();
                                  const newBalance = coins - form.price;
                                  setCoins(newBalance);
                                  saveStoredCoins(newBalance);
                                  const newUnlocked = unlockCreatureForm(form.id);
                                  setUnlockedCreatures(newUnlocked as CreatureArchetype[]);
                                  setCustom((prev) => ({
                                    ...prev,
                                    creatureArchetype: form.id,
                                  }));
                                } else {
                                  soundFX.playWhistle();
                                }
                              }}
                              className={`px-3 py-1 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                coins >= form.price
                                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-md'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <FourSquareCoin size={12} />
                              <span>Unlock ({form.price})</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Archetype Quick Color Palettes */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
                  Anatomy & Shoulder Sculpting Notes
                </div>
                <div className="text-xs text-slate-400 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Contoured athletic deltoid caps eliminate primitive cylinder shoulder seams.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Tapered chest and pectoral sculpting provide real physical depth.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>Custom jersey colors, numbers, and skin tones adapt to all 5 creature forms.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: JERSEY & SHIRT */}
          {activeTab === 'jersey' && (
            <div className="space-y-6">
              {/* Pattern Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-400 mb-2.5">
                  Jersey Pattern Style
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(['solid', 'split', 'striped', 'drip', 'geometric'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => { soundFX.playClick(); setCustom((prev) => ({ ...prev, shirtPattern: p })); }}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs capitalize transition-all cursor-pointer ${
                        custom.shirtPattern === p
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/40'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jersey Number */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-400 mb-2">
                  Jersey Number (0 - 99)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={99}
                    value={custom.jerseyNumber ?? 4}
                    onChange={(e) => setCustom((prev) => ({ ...prev, jerseyNumber: parseInt(e.target.value, 10) }))}
                    className="flex-1 h-2 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-amber-400"
                  />
                  <span className="w-12 text-center font-mono font-black text-lg text-amber-300 bg-slate-900 border border-slate-700 py-1 rounded-xl shadow-inner">
                    {custom.jerseyNumber ?? 4}
                  </span>
                </div>
              </div>

              {/* Color Wheel 1: Primary Jersey Color */}
              <ColorWheelPicker
                label="Primary Jersey Color"
                color={custom.shirtColor || '#2563EB'}
                onChange={(hex) => setCustom((prev) => ({ ...prev, shirtColor: hex }))}
              />

              {/* Color Wheel 2: Secondary / Accent Jersey Color */}
              {custom.shirtPattern !== 'solid' && (
                <ColorWheelPicker
                  label="Secondary / Collar Accent Color"
                  color={custom.shirtSecondaryColor || '#EF4444'}
                  onChange={(hex) => setCustom((prev) => ({ ...prev, shirtSecondaryColor: hex }))}
                />
              )}
            </div>
          )}

          {/* TAB 2: SHORTS & SHOES */}
          {activeTab === 'pants' && (
            <div className="space-y-6">
              <ColorWheelPicker
                label="Court Shorts / Pants Color"
                color={custom.pantsColor || '#1E293B'}
                onChange={(hex) => setCustom((prev) => ({ ...prev, pantsColor: hex }))}
              />

              <ColorWheelPicker
                label="High-Top Sneakers Color"
                color={custom.shoesColor || '#F8FAFC'}
                onChange={(hex) => setCustom((prev) => ({ ...prev, shoesColor: hex }))}
              />
            </div>
          )}

          {/* TAB 3: COMPLEXION & HAIR */}
          {activeTab === 'head' && (
            <div className="space-y-6">
              {/* Skin Tone Color Wheel */}
              <ColorWheelPicker
                label="Skin Complexion & Tone"
                color={custom.skinColor || '#F2D6B3'}
                onChange={(hex) => setCustom((prev) => ({ ...prev, skinColor: hex }))}
                presetSwatches={[
                  '#F2D6B3', '#D4A373', '#B45309', '#78350F', '#3B2010',
                  '#FBBF24', '#22C55E', '#06B6D4', '#EC4899', '#9333EA'
                ]}
              />

              {/* Hair Style */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-400 mb-2.5">
                  Hairstyle
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['short', 'afro', 'spiky'] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => { soundFX.playClick(); setCustom((prev) => ({ ...prev, hairStyle: h })); }}
                      className={`p-3 rounded-xl border text-center font-bold text-xs capitalize transition-all cursor-pointer ${
                        custom.hairStyle === h
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/40'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hair Color Wheel */}
              <ColorWheelPicker
                label="Hair Color"
                color={custom.hairColor || '#475569'}
                onChange={(hex) => setCustom((prev) => ({ ...prev, hairColor: hex }))}
                presetSwatches={[
                  '#1E293B', '#334155', '#78350F', '#B45309', '#FBBF24',
                  '#EF4444', '#06B6D4', '#EC4899', '#10B981', '#F8FAFC'
                ]}
              />
            </div>
          )}

          {/* TAB 4: ACCESSORIES & DRIP */}
          {activeTab === 'accessories' && (
            <div className="space-y-6">
              {/* 12 Accessories Grid */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-400 mb-2.5">
                  Full Headwear & Drip Accessories (12 Types)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ACCESSORY_TYPES.map((accItem) => {
                    const accId = typeof accItem === 'string' ? accItem : (accItem as any).id;
                    const accName = typeof accItem === 'string' ? accItem.toUpperCase() : (accItem as any).name;
                    const isSelected = (custom.accessoryType || custom.hatType || 'none') === accId;
                    return (
                      <button
                        key={accId}
                        onClick={() => {
                          soundFX.playClick();
                          setCustom((prev) => ({
                            ...prev,
                            accessoryType: accId,
                            hatType: accId,
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/40'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <span className="text-xl">✨</span>
                        <span className="truncate">{accName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {(custom.accessoryType || custom.hatType) !== 'none' && (
                <ColorWheelPicker
                  label="Accessory Color"
                  color={custom.accessoryColor || custom.hatColor || '#EF4444'}
                  onChange={(hex) =>
                    setCustom((prev) => ({
                      ...prev,
                      accessoryColor: hex,
                      hatColor: hex,
                    }))
                  }
                />
              )}

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCustom((prev) => ({ ...prev, hasShades: !prev.hasShades }))}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    custom.hasShades
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>🕶️ Dark Shades</span>
                  {custom.hasShades && <Check className="w-4 h-4 text-amber-400" />}
                </button>

                <button
                  onClick={() => setCustom((prev) => ({ ...prev, hasGoldChain: !prev.hasGoldChain }))}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    custom.hasGoldChain
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>👑 Gold 4-Chain</span>
                  {custom.hasGoldChain && <Check className="w-4 h-4 text-amber-400" />}
                </button>

                <button
                  onClick={() => setCustom((prev) => ({ ...prev, hasHeadphones: !prev.hasHeadphones }))}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    custom.hasHeadphones
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>🎧 DJ Headphones</span>
                  {custom.hasHeadphones && <Check className="w-4 h-4 text-amber-400" />}
                </button>

                <button
                  onClick={() => setCustom((prev) => ({ ...prev, hasWristbands: !prev.hasWristbands }))}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    custom.hasWristbands
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>⚡ Pro Wristbands</span>
                  {custom.hasWristbands && <Check className="w-4 h-4 text-amber-400" />}
                </button>
              </div>

              {custom.hasWristbands && (
                <ColorWheelPicker
                  label="Wristband Color"
                  color={custom.wristbandColor || '#F59E0B'}
                  onChange={(hex) => setCustom((prev) => ({ ...prev, wristbandColor: hex }))}
                />
              )}
            </div>
          )}

          {/* TAB 5: PRESETS */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    soundFX.playClick();
                    setCustom(preset.style);
                  }}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-400/60 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-2xl">{preset.icon}</span>
                    <span className="font-black text-sm text-white group-hover:text-amber-300 transition-colors">
                      {preset.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{preset.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase transition-all cursor-pointer"
          >
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
