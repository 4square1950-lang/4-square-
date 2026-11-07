import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  X,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Crown,
  Trophy,
  Award,
} from 'lucide-react';
import { soundFX } from '../services/soundEffects';
import { SquareId } from '../types/foursquare';
import { FourSquareCoin } from './FourSquareCoin';
import { CHARACTERS } from '../utils/characters';
import { buildCharacterMesh } from '../utils/characterModelBuilder';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPracticeMatch?: () => void;
}

interface TutorialExercise {
  id: number;
  title: string;
  category: string;
  goal: string;
  instructions: string;
  coachTip: string;
  requiredHits: number;
}

const EXERCISES: TutorialExercise[] = [
  {
    id: 1,
    title: 'Exercise 1: The Underhand Serve',
    category: 'Basic Serving',
    goal: 'Serve diagonally from King (Square 1) into Square 4',
    instructions: 'Click on Square 4 (highlighted in Green) to initiate an underhand palm serve.',
    coachTip: 'Official Rule 03: The ball must be dropped and struck upward on the bounce!',
    requiredHits: 1,
  },
  {
    id: 2,
    title: 'Exercise 2: Return on Single Bounce',
    category: 'Legal Returns',
    goal: 'Let the incoming ball bounce once, then return it to Square 2',
    instructions: 'Wait for the ball to bounce inside your square, then click on Square 2 to strike!',
    coachTip: 'Never hit the ball before it bounces (Volley) and never let it bounce twice!',
    requiredHits: 1,
  },
  {
    id: 3,
    title: 'Exercise 3: Corner Placement & Drop Shots',
    category: 'Shot Placement',
    goal: 'Aim for the outer corner targets in Square 3',
    instructions: 'Click inside the target ring in Square 3 to execute a precision corner cut.',
    coachTip: 'Outside lines are IN under official League rules, but dividing cross lines are OUT!',
    requiredHits: 2,
  },
  {
    id: 4,
    title: 'Exercise 4: Downward Power Slam',
    category: 'Power & House Rules',
    goal: 'Perform a heavy downward spike into Square 4',
    instructions: 'Click Square 4 with power to unleash an aggressive smash swing!',
    coachTip: 'In Slam rules, a sharp downward angle is legal as long as your hand does not carry the ball.',
    requiredHits: 1,
  },
  {
    id: 5,
    title: 'Exercise 5: Live 3-Rally Practice',
    category: 'Mini-Match Drill',
    goal: 'Complete 3 consecutive returns in a live practice rally',
    instructions: 'Keep the rally alive against Coach Leo by returning every incoming shot!',
    coachTip: 'Stay centered on your toes and react to whichever square the ball enters!',
    requiredHits: 3,
  },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onStartPracticeMatch,
}) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [drillScore, setDrillScore] = useState(0);
  const [drillCompleted, setDrillCompleted] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState<string>('Welcome to the 3D Academy! Select a target square to start.');
  const [isSuccess, setIsSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // 3D Objects
  const playerMeshRef = useRef<THREE.Group | null>(null);
  const coachMeshRef = useRef<THREE.Group | null>(null);
  const ballMeshRef = useRef<THREE.Mesh | null>(null);
  const ballShadowRef = useRef<THREE.Mesh | null>(null);
  const squareMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const highlightMeshRef = useRef<THREE.Mesh | null>(null);

  // Animation state
  const isSwingingRef = useRef(false);
  const swingStartTimeRef = useRef(0);
  const ballFlightRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startZ: number;
    endX: number;
    endY: number;
    endZ: number;
    startTime: number;
    duration: number;
    bounced: boolean;
  } | null>(null);

  const curEx = EXERCISES[currentExerciseIndex];

  // Initialize 3D Tutorial Scene
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(4.5, 6.2, 6.5);
    camera.lookAt(0, 0.2, 0);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
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
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.2);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    dirLight.position.set(8, 14, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Court Surface (16x16ft court)
    const courtSize = 5.0;
    const sqSize = courtSize / 2;
    const colors = [0x2563eb, 0xef4444, 0xf59e0b, 0x10b981]; // Sq 1 (Blue), Sq 2 (Red), Sq 3 (Amber), Sq 4 (Green)

    const sqOffsets = [
      { id: 1, x: -sqSize / 2, z: -sqSize / 2, color: colors[0], name: 'Square 1 (King)' },
      { id: 2, x: sqSize / 2, z: -sqSize / 2, color: colors[1], name: 'Square 2' },
      { id: 3, x: sqSize / 2, z: sqSize / 2, color: colors[2], name: 'Square 3' },
      { id: 4, x: -sqSize / 2, z: sqSize / 2, color: colors[3], name: 'Square 4 (Rookie)' },
    ];

    squareMeshesRef.current.clear();
    sqOffsets.forEach((sq) => {
      const geo = new THREE.PlaneGeometry(sqSize - 0.08, sqSize - 0.08);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({
        color: sq.color,
        roughness: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(sq.x, 0.01, sq.z);
      mesh.receiveShadow = true;
      mesh.name = `tut-sq-${sq.id}`;
      scene.add(mesh);
      squareMeshesRef.current.set(sq.id, mesh);
    });

    // Asphalt Ground under court
    const groundGeo = new THREE.PlaneGeometry(16, 16);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Target Highlight Ring
    const hlGeo = new THREE.RingGeometry(0.5, 0.65, 32);
    hlGeo.rotateX(-Math.PI / 2);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide });
    const hlMesh = new THREE.Mesh(hlGeo, hlMat);
    hlMesh.position.set(-sqSize / 2, 0.03, sqSize / 2);
    scene.add(hlMesh);
    highlightMeshRef.current = hlMesh;

    // Build Player (Patch) in Square 1
    const playerGrp = buildCharacterMesh(CHARACTERS[0]);
    playerGrp.position.set(-sqSize / 2, 0, -sqSize / 2);
    playerGrp.lookAt(sqSize / 2, 0, sqSize / 2);
    scene.add(playerGrp);
    playerMeshRef.current = playerGrp;

    // Build Coach Leo (Referee / Coach) in Square 2
    const coachDef = CHARACTERS.find((c) => c.archetype === 'ref_leo') || CHARACTERS[1];
    const coachGrp = buildCharacterMesh(coachDef);
    coachGrp.position.set(sqSize / 2, 0, -sqSize / 2);
    coachGrp.lookAt(-sqSize / 2, 0, -sqSize / 2);
    scene.add(coachGrp);
    coachMeshRef.current = coachGrp;

    // Ball
    const ballGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // 8.5" Red rubber ball
      roughness: 0.35,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(-sqSize / 2 + 0.3, 0.8, -sqSize / 2 + 0.3);
    ball.castShadow = true;
    scene.add(ball);
    ballMeshRef.current = ball;

    // Ball Shadow
    const shadowGeo = new THREE.RingGeometry(0.01, 0.16, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.set(ball.position.x, 0.02, ball.position.z);
    scene.add(shadow);
    ballShadowRef.current = shadow;

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();

      // 1. Arm Swing Animation
      if (isSwingingRef.current && playerMeshRef.current) {
        const rightArm = playerMeshRef.current.getObjectByName('rightArm') as THREE.Group;
        const leftArm = playerMeshRef.current.getObjectByName('leftArm') as THREE.Group;
        const elapsed = now - swingStartTimeRef.current;
        const progress = Math.min(1.0, elapsed / 320);

        if (progress < 1.0) {
          if (progress < 0.35) {
            // Windup backswing
            const t = progress / 0.35;
            if (rightArm) {
              rightArm.rotation.x = -1.4 * Math.sin(t * (Math.PI / 2));
              rightArm.rotation.z = -0.5 * Math.sin(t * (Math.PI / 2));
            }
            if (leftArm) {
              leftArm.rotation.x = 0.6 * Math.sin(t * (Math.PI / 2));
            }
          } else {
            // Forward strike sweep and follow through!
            const t = (progress - 0.35) / 0.65;
            if (rightArm) {
              rightArm.rotation.x = -1.4 + 2.5 * Math.sin(t * Math.PI);
              rightArm.rotation.z = -0.5 + 0.8 * Math.sin(t * Math.PI);
            }
          }
        } else {
          isSwingingRef.current = false;
          if (rightArm) {
            rightArm.rotation.x = -0.2;
            rightArm.rotation.z = -0.2;
          }
        }
      }

      // 2. Ball Flight Arc
      if (ballFlightRef.current && ballFlightRef.current.active && ballMeshRef.current) {
        const flight = ballFlightRef.current;
        const t = Math.min(1.0, (now - flight.startTime) / flight.duration);

        const curX = THREE.MathUtils.lerp(flight.startX, flight.endX, t);
        const curZ = THREE.MathUtils.lerp(flight.startZ, flight.endZ, t);
        // Parabolic arc with realistic bounce
        const arcY = Math.sin(t * Math.PI) * 1.4 + 0.15;
        const curY = Math.max(0.14, THREE.MathUtils.lerp(flight.startY, flight.endY, t) + arcY);

        ballMeshRef.current.position.set(curX, curY, curZ);
        if (ballShadowRef.current) {
          ballShadowRef.current.position.set(curX, 0.02, curZ);
          const shadowScale = Math.max(0.4, 1.0 - curY * 0.25);
          ballShadowRef.current.scale.set(shadowScale, shadowScale, shadowScale);
        }

        if (t >= 1.0) {
          flight.active = false;
          soundFX.playBallBounce(1.2);
        }
      }

      // Pulse Highlight Ring
      if (highlightMeshRef.current) {
        const scale = 1.0 + Math.sin(now * 0.006) * 0.1;
        highlightMeshRef.current.scale.set(scale, scale, scale);
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 450;
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

  // Update exercise target highlights
  useEffect(() => {
    if (!highlightMeshRef.current) return;
    const sqSize = 2.5;

    if (currentExerciseIndex === 0) {
      // Ex 1: Serve into Square 4
      highlightMeshRef.current.position.set(-sqSize / 2, 0.03, sqSize / 2);
      (highlightMeshRef.current.material as THREE.MeshBasicMaterial).color.set(0x22c55e);
    } else if (currentExerciseIndex === 1) {
      // Ex 2: Return into Square 2
      highlightMeshRef.current.position.set(sqSize / 2, 0.03, -sqSize / 2);
      (highlightMeshRef.current.material as THREE.MeshBasicMaterial).color.set(0xef4444);
    } else if (currentExerciseIndex === 2) {
      // Ex 3: Corner Placement in Square 3
      highlightMeshRef.current.position.set(sqSize / 2 + 0.4, 0.03, sqSize / 2 + 0.4);
      (highlightMeshRef.current.material as THREE.MeshBasicMaterial).color.set(0xf59e0b);
    } else {
      // Ex 4 & 5: Square 4
      highlightMeshRef.current.position.set(-sqSize / 2, 0.03, sqSize / 2);
      (highlightMeshRef.current.material as THREE.MeshBasicMaterial).color.set(0x38bdf8);
    }

    setDrillScore(0);
    setDrillCompleted(false);
    setIsSuccess(false);
    setCoachFeedback(`Starting ${curEx.title}. ${curEx.instructions}`);
  }, [currentExerciseIndex]);

  // Execute 3D Shot on Target Click
  const handleExecuteShot = (targetSq: number) => {
    soundFX.playHandStrike();

    // 1. Trigger Full Athletic Arm Swing Animation
    isSwingingRef.current = true;
    swingStartTimeRef.current = performance.now();

    // 2. Launch Ball in Realistic Flight Arc
    const sqSize = 2.5;
    let targetX = -sqSize / 2;
    let targetZ = sqSize / 2;

    if (targetSq === 2) {
      targetX = sqSize / 2;
      targetZ = -sqSize / 2;
    } else if (targetSq === 3) {
      targetX = sqSize / 2 + (Math.random() - 0.5) * 0.4;
      targetZ = sqSize / 2 + (Math.random() - 0.5) * 0.4;
    }

    ballFlightRef.current = {
      active: true,
      startX: -sqSize / 2 + 0.2,
      startY: 0.6,
      startZ: -sqSize / 2 + 0.2,
      endX: targetX,
      endY: 0.15,
      endZ: targetZ,
      startTime: performance.now(),
      duration: 550,
      bounced: false,
    };

    // 3. Update drill score
    const newScore = drillScore + 1;
    setDrillScore(newScore);

    if (newScore >= curEx.requiredHits) {
      setDrillCompleted(true);
      setIsSuccess(true);
      soundFX.playWhistle();
      setCoachFeedback(`PERFECT SHOT! ${curEx.coachTip}`);
    } else {
      setCoachFeedback(`Great swing! Hit ${newScore} of ${curEx.requiredHits} completed. Keep going!`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 text-slate-100 flex flex-col select-none animate-in fade-in duration-200 overflow-hidden">
      {/* Full-Screen Header Bar */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 flex items-center justify-between border-b-2 border-amber-600 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg font-black">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-slate-900 font-extrabold block leading-tight">
              INTERACTIVE 3D TRAINING ACADEMY • FULL SCREEN
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 leading-none">
              Four Square Mastery Drills
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundFX.playWhistle();
              if (onStartPracticeMatch) {
                onStartPracticeMatch();
              }
              onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-amber-500/60 text-amber-300 hover:text-amber-200 font-black text-xs uppercase shadow transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Full Gameplay Mode</span>
          </button>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 text-amber-400 font-mono font-bold text-xs shadow-sm">
            <span>Drill {currentExerciseIndex + 1} of {EXERCISES.length}</span>
          </div>
          <button
            onClick={onClose}
            title="Exit Academy"
            className="w-9 h-9 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Main Body: Full Screen Interactive Split View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* 3D Interactive Court (Left/Top) */}
        <div className="w-full lg:w-2/3 flex-1 relative bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col overflow-hidden">
          <div ref={containerRef} className="w-full flex-1 touch-none cursor-default" />

          {/* Target Strike Controls Overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 backdrop-blur-md p-2.5 rounded-2xl border border-slate-800 shadow-2xl">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExecuteShot(4)}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase shadow-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 border border-sky-400/40"
              >
                <Zap className="w-4 h-4" />
                <span>Strike Square 4 (Blue)</span>
              </button>
              <button
                onClick={() => handleExecuteShot(2)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase shadow-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 border border-amber-300"
              >
                <Zap className="w-4 h-4" />
                <span>Strike Square 2 (Yellow)</span>
              </button>
              <button
                onClick={() => handleExecuteShot(3)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase shadow-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 border border-emerald-400/40"
              >
                <Zap className="w-4 h-4" />
                <span>Strike Square 3 (Green)</span>
              </button>
            </div>

            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-amber-400/40 text-amber-300 font-mono font-black text-sm shadow flex items-center gap-2">
              <span>HITS:</span>
              <span className="text-white">{drillScore} / {curEx.requiredHits}</span>
            </div>
          </div>
        </div>

        {/* Drill Step Guide & Coach Feedback (Right/Bottom) */}
        <div className="w-full lg:w-1/3 flex flex-col bg-slate-900/95 overflow-y-auto p-5 sm:p-6 space-y-4 border-l border-slate-800">
          {/* Step Category Badge */}
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold uppercase tracking-wider">
              {curEx.category}
            </span>
            {drillCompleted && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40">
                <CheckCircle2 className="w-4 h-4" />
                <span>Drill Cleared!</span>
              </span>
            )}
          </div>

          {/* Title & Goal */}
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white">{curEx.title}</h3>
            <p className="text-xs sm:text-sm text-amber-300 font-bold mt-1">🎯 Goal: {curEx.goal}</p>
          </div>

          {/* Instructions */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="text-[11px] font-mono font-bold text-slate-400 uppercase">Exercise Steps</div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{curEx.instructions}</p>
          </div>

          {/* Coach Leo Live Feedback Bubble */}
          <div className="bg-gradient-to-r from-blue-950/60 to-slate-950 border border-blue-800/50 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow">
              👨‍🏫
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-cyan-300 uppercase">Coach Leo (Ref)</div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">{coachFeedback}</p>
            </div>
          </div>

          {/* Reward Box */}
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-xs sm:text-sm font-bold text-amber-200">Completion Bonus</span>
            </div>
            <div className="flex items-center gap-1 text-base font-black text-amber-300">
              <span>+50</span>
              <FourSquareCoin size={18} />
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              disabled={currentExerciseIndex === 0}
              onClick={() => {
                soundFX.playClick();
                setCurrentExerciseIndex((prev) => Math.max(0, prev - 1));
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                currentExerciseIndex === 0
                  ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            {currentExerciseIndex < EXERCISES.length - 1 ? (
              <button
                onClick={() => {
                  soundFX.playClick();
                  setCurrentExerciseIndex((prev) => prev + 1);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase flex items-center gap-1 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <span>Next Drill</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  soundFX.playWhistle();
                  if (onStartPracticeMatch) {
                    onStartPracticeMatch();
                  }
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
              >
                <Trophy className="w-4 h-4" />
                <span>Start Live Match!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
