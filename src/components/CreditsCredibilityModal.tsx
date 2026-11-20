import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Play,
  Pause,
  Sparkles,
  ArrowDown,
  Flame,
} from 'lucide-react';
import { CHARACTERS, CharacterDef } from '../utils/characters';
import { buildCharacterMesh } from '../utils/characterModelBuilder';
import { soundFX } from '../services/soundEffects';

interface CreditsCredibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface CreditEntry {
  id: number;
  role: string;
  name: string;
  category: string;
  character: CharacterDef;
  highlight: string;
  notes: string;
}

// Map 16 Characters to official Credits & Credibility roles
export const CREDITS_DATA: CreditEntry[] = CHARACTERS.map((char, index) => {
  const roles = [
    'Lead Game Designer & Founder',
    '3D Character Sculptor & Animator',
    'Physics & Court Mechanics Lead',
    'World Audio & Soundtrack Producer',
    'World Federation Rules Commissioner',
    'Campaign Level & World Architect',
    'Tournament Bracket Programmer',
    'Lead UI/UX & Motion Designer',
    'AI Opponent Behavior Specialist',
    'Match Statistics & Analytics Lead',
    'Lighting & Court Material Specialist',
    'Schoolyard Lore & Script Supervisor',
    'Referee Call & Fair Play Director',
    'Sound Effects & Arena Foley Artist',
    'Character Outfits & Shop Stylist',
    'Executive Producer & Federation King',
  ];

  return {
    id: index + 1,
    role: roles[index % roles.length],
    name: char.name.toUpperCase(),
    category: index < 4 ? 'FOUNDERS & DIRECTORS' : index < 10 ? 'CORE DEVELOPMENT TEAM' : 'FEDERATION HALL OF FAME',
    character: char,
    highlight: `${char.speciesType} • ${char.title}`,
    notes: char.description,
  };
});

// 6 Distinct Still Action Shot Moments for Four Square Legends
export interface StillActionShotDef {
  actionName: string;
  tag: string;
  venueName: string;
  pose: 'spike_smash' | 'dive_save' | 'side_dig' | 'power_slam' | 'corner_scoop' | 'crown_hold';
  ballPos: [number, number, number];
  charRotY: number;
  cameraPos: [number, number, number];
  cameraLookAt: [number, number, number];
}

const ACTION_SHOTS: StillActionShotDef[] = [
  {
    actionName: 'Mid-Air Topspin Spike Smash',
    tag: 'AERIAL SMASH',
    venueName: 'Oakridge Schoolyard Court 4',
    pose: 'spike_smash',
    ballPos: [0.38, 1.48, 0.42],
    charRotY: -0.38,
    cameraPos: [1.35, 1.25, 3.1],
    cameraLookAt: [0, 0.95, 0],
  },
  {
    actionName: 'Diving Boundary Chalk Save',
    tag: 'DIVE SAVE',
    venueName: 'Varsity Courtyard Quad 1',
    pose: 'dive_save',
    ballPos: [0.18, 0.38, 0.62],
    charRotY: 0.32,
    cameraPos: [1.6, 0.85, 2.9],
    cameraLookAt: [0, 0.65, 0],
  },
  {
    actionName: 'Sideline Cross-Court Dig Save',
    tag: 'SIDELINE DIG',
    venueName: 'Lincoln High Gymnasium',
    pose: 'side_dig',
    ballPos: [0.42, 0.65, 0.38],
    charRotY: -0.42,
    cameraPos: [1.45, 1.1, 3.0],
    cameraLookAt: [0, 0.88, 0],
  },
  {
    actionName: 'Volcanic Power Slam Volley',
    tag: 'POWER SLAM',
    venueName: 'Asphalt Blacktop Stadium',
    pose: 'power_slam',
    ballPos: [0.05, 1.68, 0.32],
    charRotY: -0.15,
    cameraPos: [0.3, 0.95, 3.0],
    cameraLookAt: [0, 1.05, 0],
  },
  {
    actionName: 'Low Corner Spin Scoop',
    tag: 'CORNER SCOOP',
    venueName: 'Downtown Skydeck Court',
    pose: 'corner_scoop',
    ballPos: [0.32, 0.45, 0.48],
    charRotY: 0.28,
    cameraPos: [1.5, 0.95, 3.1],
    cameraLookAt: [0, 0.75, 0],
  },
  {
    actionName: 'Sovereign King Victory Stance',
    tag: 'CROWN HOLD',
    venueName: 'World Grand Finals Arena',
    pose: 'crown_hold',
    ballPos: [0.32, 0.22, 0.32],
    charRotY: -0.28,
    cameraPos: [1.2, 1.2, 3.2],
    cameraLookAt: [0, 0.95, 0],
  },
];

// Helper to pose 3D character mesh into athletic freeze-frame action stance
function applyStillActionPose(mesh: THREE.Group, poseType: string) {
  const rightArm = mesh.getObjectByName('rightArm') as THREE.Group | undefined;
  const leftArm = mesh.getObjectByName('leftArm') as THREE.Group | undefined;
  const torso = mesh.getObjectByName('torsoMesh') as THREE.Mesh | undefined;
  const head = mesh.getObjectByName('headMesh') as THREE.Mesh | undefined;
  const leftLeg = mesh.getObjectByName('leftLeg') as THREE.Group | undefined;
  const rightLeg = mesh.getObjectByName('rightLeg') as THREE.Group | undefined;

  switch (poseType) {
    case 'spike_smash':
      // Mid-Air Topspin Spike: right arm raised high angled forward-downward, left arm back for balance
      if (rightArm) rightArm.rotation.set(-1.85, 0.2, -0.3);
      if (leftArm) leftArm.rotation.set(0.65, -0.2, 0.45);
      if (torso) torso.rotation.set(0.28, 0.15, 0);
      if (leftLeg) leftLeg.rotation.set(-0.35, 0, 0);
      if (rightLeg) rightLeg.rotation.set(0.45, 0, 0);
      mesh.position.y = 0.22;
      break;

    case 'dive_save':
      // Low Diving Save: body pitched forward toward court floor, arms reaching forward
      if (rightArm) rightArm.rotation.set(-1.3, 0.3, -0.2);
      if (leftArm) leftArm.rotation.set(-1.25, -0.2, 0.2);
      if (torso) torso.rotation.set(0.55, 0, 0);
      if (leftLeg) leftLeg.rotation.set(0.65, 0, 0);
      if (rightLeg) rightLeg.rotation.set(0.5, 0, 0);
      mesh.position.y = -0.12;
      break;

    case 'side_dig':
      // Sideline Dig: deep lunge, right arm scooping up from hip
      if (rightArm) rightArm.rotation.set(-0.65, 0.4, -0.35);
      if (leftArm) leftArm.rotation.set(-0.2, -0.3, 0.4);
      if (torso) torso.rotation.set(0.18, 0.25, 0);
      if (leftLeg) leftLeg.rotation.set(-0.55, 0, -0.2);
      if (rightLeg) rightLeg.rotation.set(0.45, 0, 0.2);
      mesh.position.y = -0.06;
      break;

    case 'power_slam':
      // Two-handed overhead power slam
      if (rightArm) rightArm.rotation.set(-1.75, 0.1, -0.25);
      if (leftArm) leftArm.rotation.set(-1.75, -0.1, 0.25);
      if (torso) torso.rotation.set(0.15, 0, 0);
      if (leftLeg) leftLeg.rotation.set(-0.25, 0, 0);
      if (rightLeg) rightLeg.rotation.set(0.25, 0, 0);
      mesh.position.y = 0.15;
      break;

    case 'corner_scoop':
      // Low corner scoop save
      if (rightArm) rightArm.rotation.set(-0.95, 0.3, -0.3);
      if (leftArm) leftArm.rotation.set(0.3, -0.2, 0.4);
      if (torso) torso.rotation.set(0.35, 0.2, 0);
      if (leftLeg) leftLeg.rotation.set(-0.4, 0, 0);
      if (rightLeg) rightLeg.rotation.set(0.55, 0, 0);
      mesh.position.y = -0.05;
      break;

    case 'crown_hold':
    default:
      // Triumphant King Hold stance
      if (rightArm) rightArm.rotation.set(-1.55, 0.1, -0.3);
      if (leftArm) leftArm.rotation.set(-0.25, -0.2, 0.35);
      if (torso) torso.rotation.set(-0.08, 0, 0);
      if (head) head.rotation.set(-0.15, 0, 0);
      mesh.position.y = 0;
      break;
  }
}

// Still 3D Gameplay Action Shot Viewer (Zero rotation, freeze-framed in athletic action moment)
const CreditCharacterViewer: React.FC<{ character: CharacterDef; actionShot: StillActionShotDef }> = ({
  character,
  actionShot,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 800;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070d18);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(...actionShot.cameraPos);
    camera.lookAt(...actionShot.cameraLookAt);

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

    // Studio Lights
    const hemiLight = new THREE.HemisphereLight(0xfffbe8, 0x0f172a, 1.35);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.4);
    keyLight.position.set(3.5, 5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const warmFill = new THREE.DirectionalLight(0xf59e0b, 1.5);
    warmFill.position.set(-3.5, 2.5, 2.5);
    scene.add(warmFill);

    // Court Pedestal with Asphalt Texture
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.45, 0.22, 32),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 })
    );
    pedestal.position.y = -0.11;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Chalk Boundary Lines on Court Surface
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    const lineH = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.05).rotateX(-Math.PI / 2), lineMat);
    lineH.position.y = 0.012;
    const lineV = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 2.5).rotateX(-Math.PI / 2), lineMat);
    lineV.position.y = 0.012;
    scene.add(lineH, lineV);

    // Cyan High-Tech Line Ring
    const cyanRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.36, 0.035, 16, 32).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
      })
    );
    cyanRing.position.y = 0.01;
    scene.add(cyanRing);

    // Build the character's exact 3D in-game model
    const mesh = buildCharacterMesh(character);
    // Apply athletic freeze-frame action pose
    applyStillActionPose(mesh, actionShot.pose);
    // STATIC HEROIC ROTATION ANGLE: ZERO CONTINUOUS ROTATION!
    mesh.rotation.y = actionShot.charRotY;
    scene.add(mesh);

    // Freeze-Framed Official Red Four Square Ball mid-flight/mid-impact
    const ballGeo = new THREE.SphereGeometry(0.22, 24, 24);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.35,
      metalness: 0.05,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.position.set(...actionShot.ballPos);
    scene.add(ballMesh);

    // Ball contact shadow on court floor
    const ballShadowGeo = new THREE.CircleGeometry(0.22, 24);
    ballShadowGeo.rotateX(-Math.PI / 2);
    const ballShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: Math.max(0.2, 0.65 - actionShot.ballPos[1] * 0.25),
    });
    const ballShadow = new THREE.Mesh(ballShadowGeo, ballShadowMat);
    ballShadow.position.set(actionShot.ballPos[0], 0.015, actionShot.ballPos[2]);
    scene.add(ballShadow);

    // SINGLE RENDER CALL: NO ROTATION LOOP!
    renderer.render(scene, camera);

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
    };
  }, [character, actionShot]);

  return (
    <div className="w-full h-full relative bg-slate-950 flex flex-col justify-between overflow-hidden">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Top Overlay Banner */}
      <div className="relative z-20 p-6 bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-sky-500 text-slate-950 text-xs font-black uppercase font-mono tracking-wider shadow">
            {actionShot.tag}
          </span>
          <span className="text-xs sm:text-sm font-mono font-bold text-sky-300 tracking-wide drop-shadow">
            {actionShot.venueName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300 bg-slate-900/80 px-3 py-1 rounded-lg border border-amber-500/40 backdrop-blur-md">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>STILL ACTION SHOT</span>
        </div>
      </div>

      {/* Bottom Overlay Info Banner */}
      <div className="relative z-20 p-6 sm:p-8 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent flex items-end justify-between pointer-events-none">
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>STILL ACTION MOMENT • {actionShot.actionName}</span>
          </div>
          <div className="text-2xl sm:text-4xl font-black text-white uppercase tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            {character.name}
          </div>
          <div className="text-xs sm:text-sm text-slate-300 font-sans pt-0.5 max-w-md italic">
            "{character.quote}"
          </div>

          {/* Character Stat Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-3 font-mono text-[11px]">
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-amber-400 font-bold">
              SPEED {character.speed}/10
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-rose-400 font-bold">
              POWER {character.power}/10
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-emerald-400 font-bold">
              SPIN {character.spin}/10
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-cyan-400 font-bold">
              CAREER KOS {character.careerEliminations}
            </span>
          </div>
        </div>

        {/* Character Avatar Icon Badge */}
        <div
          className="w-16 h-16 rounded-2xl border-2 border-sky-400/60 flex items-center justify-center font-black text-2xl shadow-2xl shrink-0 backdrop-blur-md"
          style={{
            backgroundColor: character.colors.primary,
            color: character.colors.secondary,
          }}
        >
          {character.name.charAt(0)}
        </div>
      </div>
    </div>
  );
};

export const CreditsCredibilityModal: React.FC<CreditsCredibilityModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const activeCredit = CREDITS_DATA[currentIndex] || CREDITS_DATA[0];
  const activeActionShot = ACTION_SHOTS[currentIndex % ACTION_SHOTS.length];

  // Auto-scroll downward smoothly
  useEffect(() => {
    if (!isOpen || !isAutoScrolling || !scrollContainerRef.current) return;
    const scrollEl = scrollContainerRef.current;
    let animId: number;

    const scrollStep = () => {
      if (scrollEl) {
        scrollEl.scrollTop += 0.75;
        // If reached bottom, loop smoothly back to top
        if (scrollEl.scrollTop >= scrollEl.scrollHeight - scrollEl.clientHeight - 4) {
          scrollEl.scrollTop = 0;
        }
      }
      animId = requestAnimationFrame(scrollStep);
    };

    animId = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, isAutoScrolling]);

  const handleNext = () => {
    soundFX.playClick();
    setCurrentIndex((prev) => (prev + 1) % CREDITS_DATA.length);
  };

  const handlePrev = () => {
    soundFX.playClick();
    setCurrentIndex((prev) => (prev - 1 + CREDITS_DATA.length) % CREDITS_DATA.length);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-black flex flex-col select-none animate-in fade-in duration-200 overflow-hidden font-sans text-slate-100">
      {/* ========================================================================= */}
      {/* PREVIOUS AND NEXT BUTTONS ON LEFT AND RIGHT SIDES OF THE ENTIRE SECTION */}
      {/* ========================================================================= */}
      <button
        onClick={handlePrev}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-4 rounded-2xl bg-slate-900/90 hover:bg-sky-500 text-sky-400 hover:text-slate-950 border border-sky-500/40 shadow-[0_0_30px_rgba(56,189,248,0.4)] transition-all cursor-pointer hover:scale-110 active:scale-95 group backdrop-blur-md"
        title="Previous Character & Role (Left Arrow)"
        aria-label="Previous Credit"
      >
        <ChevronLeft className="w-8 h-8 transition-transform group-hover:-translate-x-1" />
        <span className="sr-only">Previous</span>
      </button>

      <button
        onClick={handleNext}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-4 rounded-2xl bg-slate-900/90 hover:bg-sky-500 text-sky-400 hover:text-slate-950 border border-sky-500/40 shadow-[0_0_30px_rgba(56,189,248,0.4)] transition-all cursor-pointer hover:scale-110 active:scale-95 group backdrop-blur-md"
        title="Next Character & Role (Right Arrow)"
        aria-label="Next Credit"
      >
        <ChevronRight className="w-8 h-8 transition-transform group-hover:translate-x-1" />
        <span className="sr-only">Next</span>
      </button>

      {/* Top Bar Header */}
      <div className="h-16 px-6 bg-black/90 border-b border-sky-900/40 flex items-center justify-between z-30 shrink-0 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500 text-slate-950 flex items-center justify-center font-black shadow-[0_0_20px_rgba(56,189,248,0.5)]">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-sky-400 font-black">
              FOUR SQUARE WORLD FEDERATION • OFFICIAL HALL OF FAME
            </span>
            <h1 className="text-base sm:text-lg font-black text-white tracking-wider">
              CREDITS & CREDIBILITY
            </h1>
          </div>
        </div>

        {/* Center Auto-Scroll Status Indicator & Play/Pause */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-1.5 rounded-full border border-slate-800">
          <button
            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              isAutoScrolling
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            {isAutoScrolling ? <Pause className="w-3.5 h-3.5 text-sky-400" /> : <Play className="w-3.5 h-3.5" />}
            <span className="font-mono text-[11px] uppercase tracking-wider">
              {isAutoScrolling ? 'Auto-Scrolling Down' : 'Scroll Paused'}
            </span>
          </button>

          <div className="w-px h-4 bg-slate-800" />

          <span className="font-mono text-xs font-black text-sky-300 min-w-[70px] text-center">
            {currentIndex + 1} / {CREDITS_DATA.length}
          </span>
        </div>

        {/* Right Close Button */}
        <button
          onClick={() => {
            soundFX.playClick();
            onClose();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg"
        >
          <X className="w-4 h-4" />
          <span>Close</span>
        </button>
      </div>

      {/* Main Screen Layout: Left Auto-Scrolling Credits Text + Right Real 3D Gameplay Character Viewer */}
      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
        {/* LEFT SIDE: Auto-Scrolling Downward Clean Credits Text */}
        <div
          ref={scrollContainerRef}
          onMouseEnter={() => setIsAutoScrolling(false)}
          onMouseLeave={() => setIsAutoScrolling(true)}
          className="w-full md:w-1/2 h-full bg-black flex flex-col p-6 sm:p-12 overflow-y-auto scrollbar-none scroll-smooth relative"
        >
          {/* Top Auto-Scroll Hint */}
          <div className="text-center py-4 mb-4 border-b border-slate-900">
            <span className="text-[10px] font-mono tracking-widest uppercase text-sky-400 flex items-center justify-center gap-1.5 font-bold">
              <ArrowDown className="w-3 h-3 animate-bounce" />
              CREDITS SCROLL DOWN AUTOMATICALLY • HOVER TO PAUSE
            </span>
          </div>

          <div className="space-y-12 max-w-xl mx-auto w-full py-8">
            {/* Active Character Credit Focal Presentation */}
            <div className="space-y-4 py-6 border-b border-sky-900/40 text-center">
              <span className="text-xs font-mono font-black tracking-widest text-sky-400 uppercase">
                {activeCredit.category}
              </span>
              <div className="font-mono text-sm sm:text-base tracking-widest text-sky-300 font-bold uppercase">
                {activeCredit.role}
              </div>
              <div className="font-black text-3xl sm:text-5xl text-white tracking-widest uppercase drop-shadow-[0_2px_15px_rgba(56,189,248,0.4)]">
                {activeCredit.name}
              </div>
              <div className="text-xs font-mono text-slate-400 tracking-wider">
                {activeCredit.highlight}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-md mx-auto pt-2 italic">
                "{activeCredit.notes}"
              </p>
            </div>

            {/* Continuous Flowing Credits List */}
            <div className="space-y-6 text-center font-mono py-6">
              {CREDITS_DATA.map((entry, idx) => {
                const isCurrent = idx === currentIndex;
                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      soundFX.playClick();
                      setCurrentIndex(idx);
                    }}
                    className={`py-3 transition-all cursor-pointer group ${
                      isCurrent
                        ? 'text-sky-300 font-black scale-105'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-[11px] text-sky-400/90 tracking-widest uppercase mb-1 font-bold">
                      {entry.role}
                    </div>
                    <div className="text-lg sm:text-2xl font-black uppercase text-white tracking-wider group-hover:text-sky-300 transition-colors">
                      {entry.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono tracking-wider mt-0.5">
                      {entry.highlight}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* End of Credits Federation Seal */}
            <div className="text-center pt-12 pb-24 space-y-3">
              <div className="w-12 h-12 rounded-full border border-sky-500/60 mx-auto flex items-center justify-center text-sky-400 font-black text-xl">
                4S
              </div>
              <div className="text-xs font-mono tracking-widest text-sky-300 uppercase font-black">
                FOUR SQUARE WORLD TOUR FEDERATION
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Dedicated to schoolyard legends, asphalt kings, and court contenders worldwide since 1950.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Real 3D In-Game Still Action Shot filling the ENTIRE right side of the screen */}
        <div className="w-full md:w-1/2 h-full relative bg-slate-950 border-t md:border-t-0 md:border-l border-slate-900 flex flex-col justify-center items-center overflow-hidden">
          <CreditCharacterViewer character={activeCredit.character} actionShot={activeActionShot} />
        </div>
      </div>
    </div>
  );
};
