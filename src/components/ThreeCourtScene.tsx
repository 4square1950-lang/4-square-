import { campusCollectibles } from '../services/collectibles';
import { readGamepad, stickAxis } from '../services/gamepad';
import { buildCampusAnnex, buildCampusCrowd, buildSchoolUpperFloor } from '../utils/campusAnnex';
import { animateCampusTeacher, buildCampusRooms, EAST_OPENING, LIBRARY_READ_SPOT, poseCampusStudent, STUDY_SEAT } from '../utils/campusRooms';
import { SchoolBookReader } from './SchoolBookReader';
import { trafficTravel } from '../utils/trafficCollision';
import type { CourtWeather } from '../services/soloSetup';
import type { BallLook } from '../services/ballCatalog';
import { courtBallMaterial } from '../utils/courtBall';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Timer, Volume2 } from 'lucide-react';
import { Player, BallState, SquareId, RuleSet, RefereeCall } from '../types/foursquare';
import { DIVE_STEP, STRIKE_STEP } from '../services/returnReach';
import { VenueDef, CampaignNPC } from '../types/campaign';
import { SQUARE_CONFIGS, COURT_HALF_SIZE, LINE_HALF_WIDTH } from '../utils/courtGeometry';
import { CHARACTERS, CharacterDef, CharacterCustomization } from '../utils/characters';
import {
  buildCharacterMesh,
  buildSpectatorPerson,
  buildRefereeModel,
  buildRoadTripCar,
  buildSeatedStudent,
  buildTeacherInstructor,
  buildHallwayStudent,
  applySeatedDriverPose,
} from '../utils/characterModelBuilder';
import { globalPhysics } from '../utils/physicsEngine';
import { soundFX } from '../services/soundEffects';
import { serveContactPosition } from '../services/foursquareEngine';
import { fitMatchCamera } from '../utils/matchCamera';
import { ClassroomModal } from './ClassroomModal';
import { buildCampusCourt, buildCampusExterior, disposeCampus } from '../utils/campusScene';
import { campusNpcSpot, campusPerimeter, campusPlayground, campusTrees, campusWalls, FUNNEL_POSITION, getCampusElevation, getCampusLayout, SCHOOL, SCHOOL_LIFT, SCHOOL_UPPER, campusYardFence } from '../utils/campusLayout';

const STRIKE_PHASE = 0.23;
const STRIKE_DURATION = 0.30;
const BALL_RADIUS = 0.22;

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

interface ThreeCourtSceneProps {
  mode?: 'match' | 'exploration' | 'preview';
  manualFootwork?: boolean;
  assistFootwork?: boolean;
  clickDrillMarkerToMove?: boolean;
  drillMarker?: {x:number;z:number};
  captureFrameRef?: React.RefObject<(() => Promise<Blob | null>) | null>;
  paused?: boolean;
  weather?: CourtWeather;
  ballLook?: BallLook;
  onControlledPose?: (pose: { id: string; x: number; z: number; reaching: boolean }) => void;
  venue?: VenueDef;
  players: Player[];
  waitingQueue: Player[];
  ballState: BallState;
  refereeCall?: RefereeCall;
  matchFinished?: boolean;
  humanPlayerId: string;
  activeTurnPlayerId: string | null;
  servingPlayerId: string | null;
  isHumanTurn: boolean;
  highlightedSquares: SquareId[];
  onSelectTargetSquare: (squareId: SquareId, clickPoint?: { x: number; z: number }, fast?: boolean) => void;
  onMatchIntroChange?: (active: boolean) => void;
  skipMatchIntro?: boolean;
  cameraView: 'first_person' | 'third_person' | 'isometric' | 'top_down' | 'action';
  ruleSet?: RuleSet;
  explorationPlayerPos?: [number, number, number];
  onExplorationMove?: (pos: [number, number, number]) => void;
  onInteractNPC?: (npc: CampaignNPC) => void;
  onInteractCourt?: () => void;
  onInteractFunnelBall?: () => void;
  onInteractSchoolDoor?: () => void;
  onRewardCoins?: (amount: number) => void;
  completedLessons?:string[];
  collectedItems?: readonly string[];
  onCollectItem?: (id: string, name: string) => void;
  onPassLesson?:(id:string,coins:number)=>void;
  customization?: CharacterCustomization;
  isOrbitMode?: boolean;
  onToggleOrbitMode?: () => void;
  venueType?: 'outdoor' | 'indoor';
  onShotClockExpired?: () => void;
  serveDeadline?: number;
  paAnnouncement?: string | null;
  disableBackgroundVideo?: boolean;
  covered?: boolean;
}

export const ThreeCourtScene: React.FC<ThreeCourtSceneProps> = ({
  mode = 'match',
  manualFootwork = false,
  assistFootwork = true,
  drillMarker,
  clickDrillMarkerToMove = false,
  captureFrameRef,
  paused = false,
  weather = 'Clear',
  ballLook,
  onControlledPose,
  venue,
  players,
  ballState,
  refereeCall,
  matchFinished = false,
  humanPlayerId,
  activeTurnPlayerId,
  servingPlayerId,
  isHumanTurn,
  highlightedSquares,
  onSelectTargetSquare,
  onMatchIntroChange,
  skipMatchIntro = false,
  cameraView,
  explorationPlayerPos = [0, 0, -6.0],
  onExplorationMove,
  onInteractNPC,
  onInteractCourt,
  onInteractFunnelBall,
  onInteractSchoolDoor,
  onRewardCoins,
  completedLessons,
  collectedItems,
  onCollectItem,
  onPassLesson,
  customization,
  isOrbitMode,
  onToggleOrbitMode,
  venueType = 'outdoor',
  onShotClockExpired,
  serveDeadline,
  paAnnouncement,
  disableBackgroundVideo = false,
  covered = false,
}) => {
  const reportPose=useRef(onControlledPose);
  reportPose.current=onControlledPose;
  const followDrillMarker=useRef(false);
  useEffect(()=>{followDrillMarker.current=false;},[drillMarker]);
  const currentDrillMarker=useRef(drillMarker);
  currentDrillMarker.current=drillMarker;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const collection = useRef({ collectedItems, onCollectItem });
  collection.current = { collectedItems, onCollectItem };
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Visual Meshes refs
  const ballMeshRef = useRef<THREE.Mesh | null>(null);
  const ballShadowMeshRef = useRef<THREE.Mesh | null>(null);
  const playerMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const squareMeshesRef = useRef<Map<SquareId, THREE.Mesh>>(new Map());
  const squareHighlightsRef = useRef<Map<SquareId, THREE.Mesh>>(new Map());
  const dustPuffsRef = useRef<THREE.Mesh[]>([]);
  const hoverIndicatorRef = useRef<THREE.Mesh | null>(null);
  const refereeMeshRef = useRef<THREE.Group | null>(null);
  const spectatorsRef = useRef<THREE.Group[]>([]);
  const npcsRef = useRef<THREE.Group[]>([]);
  const cyclingRef = useRef(false);
  const [isClassroomOpen, setIsClassroomOpen] = useState(false);
  const [bookIndex,setBookIndex] = useState<number>();
  const [seated,setSeated] = useState(false);
  const seatedRef=useRef(false);
  seatedRef.current=seated;
  const lessonVisible=useRef(false);
  lessonVisible.current=isClassroomOpen || bookIndex!==undefined;
  const gymDoorsRef = useRef<{ left: THREE.Group; right: THREE.Group } | null>(null);
  const streetVehiclesRef = useRef<{
    mesh: THREE.Group;
    carBody?: THREE.Group;
    passenger?: THREE.Group;
    speed: number;
    laneZ: number;
    direction: 1 | -1;
    isArrival?: boolean;
    taillight?: THREE.Mesh;
    frontWheelL?: THREE.Group;
    frontWheelR?: THREE.Group;
    door?: THREE.Group;
  }[]>([]);

  // Dynamic hit swing & contact animation refs
  const swingAnimsRef = useRef<
    Map<
      string,
      {
        elapsed: number;
        contactPos: THREE.Vector3;
        rank: SquareId;
        plantLimit: number;
        plantStep?: { startX: number; startZ: number; endX: number; endZ: number };
      }
    >
  >(new Map());
  const hitShockwavesRef = useRef<THREE.Mesh[]>([]);
  const playerCourtPoseRef = useRef<
    Map<string, { x: number; z: number; yaw: number; rank: number | null }>
  >(new Map());
  const lastHitterWatchedRef = useRef<string | null>(null);
  const lastHitCountWatchedRef = useRef<number>(-1);

  // Exploration player & interactive props refs
  const explorerMeshRef = useRef<THREE.Group | null>(null);
  const targetMovePosRef = useRef<{ x: number; z: number } | null>(null);

  // Orbit Mode & 360-Degree Spherical Drag Refs
  const [internalOrbitMode, setInternalOrbitMode] = useState(false);
  const activeOrbit = isOrbitMode !== undefined ? isOrbitMode : internalOrbitMode;
  const activeOrbitRef = useRef(activeOrbit);
  activeOrbitRef.current = activeOrbit;

  const isDraggingRef = useRef(false);
  const orbitGesture = useRef<{ id: number; x: number; y: number } | undefined>(undefined);
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const orbitYawRef = useRef(explorationPlayerPos[2] < SCHOOL.front ? Math.PI : 0);
  const orbitPitchRef = useRef(0.24);
  const orbitDistanceRef = useRef(7.5); // Smooth zoomable distance between 4.0m and 26.0m
  const matchZoomRef = useRef(1.0); // Match zoom multiplier (scroll wheel adjustable)

  // 10-Second Skippable Scene-Setting Match Intro Zoom State
  const [isMatchIntroActive, setIsMatchIntroActive] = useState(mode === 'match' && !skipMatchIntro);
  useEffect(() => {
    onMatchIntroChange?.(mode === 'match' && isMatchIntroActive);
  }, [mode, isMatchIntroActive, onMatchIntroChange]);
  const isMatchIntroActiveRef = useRef(mode === 'match' && !skipMatchIntro);
  const matchIntroStartTimeRef = useRef(performance.now());
  const [introCountdown, setIntroCountdown] = useState(4);

  // 5-Second Turn Shot Clock
  const [shotClockSeconds, setShotClockSeconds] = useState(5.0);
  const shotClockRef = useRef(5.0);
  const onShotClockExpiredRef = useRef(onShotClockExpired);
  onShotClockExpiredRef.current = onShotClockExpired;
  const deadlineRef = useRef(serveDeadline);
  deadlineRef.current = serveDeadline;

  // Reset shot clock on turn change or serve change
  useEffect(() => {
    shotClockRef.current = 5.0;
    setShotClockSeconds(serveDeadline ? Math.max(0, (serveDeadline - Date.now()) / 1000) : 5);
  }, [activeTurnPlayerId, ballState.isServing, serveDeadline, refereeCall?.timestamp]);

  const skipIntro = () => {
    isMatchIntroActiveRef.current = false;
    setIsMatchIntroActive(false);
    if (gymDoorsRef.current) {
      gymDoorsRef.current.left.rotation.y = -1.65;
      gymDoorsRef.current.right.rotation.y = 1.65;
    }
    if (cameraRef.current) {
      updateCameraPosition(cameraRef.current, cameraViewRef.current, 'match', localPlayerPos.current, venueType, matchZoomRef.current);
    }
  };


  // Listen for Spacebar hotkey to skip match intro
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isMatchIntroActiveRef.current && mode === 'match') {
        e.preventDefault();
        skipIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  // Restart intro zoom whenever entering match mode
  useEffect(() => {
    if (mode === 'match' && !skipMatchIntro) {
      setIsMatchIntroActive(true);
      isMatchIntroActiveRef.current = true;
      matchIntroStartTimeRef.current = performance.now();
      setIntroCountdown(4);
    } else {
      setIsMatchIntroActive(false);
      isMatchIntroActiveRef.current = false;
    }
  }, [mode, skipMatchIntro]);

  // Countdown timer for intro HUD
  useEffect(() => {
    if (!isMatchIntroActive) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((4000 - performance.now() + matchIntroStartTimeRef.current) / 1000));
      setIntroCountdown(remaining);
      if (remaining <= 0) {
        setIsMatchIntroActive(false);
        isMatchIntroActiveRef.current = false;
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isMatchIntroActive]);

  // Preview Mode Simulated Match State
  const previewSimRef = useRef<{
    rallyCount: number;
    currentHitterSq: SquareId;
    targetSq: SquareId;
    shotStartTime: number;
    shotDuration: number;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    peakHeight: number;
  }>({
    rallyCount: 0,
    currentHitterSq: 1,
    targetSq: 4,
    shotStartTime: performance.now(),
    shotDuration: 900,
    startPos: new THREE.Vector3(-1.4, 0.4, -1.4),
    targetPos: new THREE.Vector3(1.4, 0.22, 1.4),
    peakHeight: 1.8,
  });

  // Camera View ref to prevent stale closures
  const cameraViewRef = useRef(cameraView);
  useEffect(() => {
    cameraViewRef.current = cameraView;
  }, [cameraView]);

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const playersRef = useRef(players);
  playersRef.current = players;

  const ballStateRef = useRef(ballState);
  ballStateRef.current = ballState;
  const refereeState = useRef({ call: refereeCall, finished: matchFinished });
  refereeState.current = { call: refereeCall, finished: matchFinished };

  const humanPlayerIdRef = useRef(humanPlayerId);
  humanPlayerIdRef.current = humanPlayerId;

  const activeTurnPlayerIdRef = useRef(activeTurnPlayerId);
  activeTurnPlayerIdRef.current = activeTurnPlayerId;

  const servingPlayerIdRef = useRef(servingPlayerId);
  servingPlayerIdRef.current = servingPlayerId;


  const disableBackgroundVideoRef = useRef(disableBackgroundVideo);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const coveredRef = useRef(covered);
  coveredRef.current = covered;
  useEffect(() => {
    disableBackgroundVideoRef.current = disableBackgroundVideo;
  }, [disableBackgroundVideo]);

  const venueRef = useRef(venue);
  useEffect(() => {
    venueRef.current = venue;
  }, [venue]);

  const onExplorationMoveRef = useRef(onExplorationMove);
  useEffect(() => {
    onExplorationMoveRef.current = onExplorationMove;
  }, [onExplorationMove]);

  const onInteractNPCRef = useRef(onInteractNPC);
  useEffect(() => {
    onInteractNPCRef.current = onInteractNPC;
  }, [onInteractNPC]);

  const onInteractCourtRef = useRef(onInteractCourt);
  useEffect(() => {
    onInteractCourtRef.current = onInteractCourt;
  }, [onInteractCourt]);

  const onInteractFunnelBallRef = useRef(onInteractFunnelBall);
  useEffect(() => {
    onInteractFunnelBallRef.current = onInteractFunnelBall;
  }, [onInteractFunnelBall]);

  const onInteractSchoolDoorRef = useRef(onInteractSchoolDoor);
  useEffect(() => {
    onInteractSchoolDoorRef.current = onInteractSchoolDoor;
  }, [onInteractSchoolDoor]);

  // Nearby interaction prompt state
  const [interactionPrompt, setInteractionPrompt] = useState<{
    text: string;
    action: () => void;
  } | null>(null);
  const interactionPromptRef = useRef(interactionPrompt);
  useEffect(() => {
    interactionPromptRef.current = interactionPrompt;
  }, [interactionPrompt]);

  // Keyboard navigation for exploration
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const localPlayerPos = useRef<[number, number, number]>([...explorationPlayerPos]);
  const liftJourney = useRef<{ from: number; to: number; elapsed: number } | null>(null);
  const occupyDesk = (sit:boolean) => {
    const position:[number,number,number] = [STUDY_SEAT.x+(sit?0:1.02),0,STUDY_SEAT.z];
    localPlayerPos.current=position;
    targetMovePosRef.current=null;
    if (explorerMeshRef.current) {
      explorerMeshRef.current.position.set(position[0],0,position[2]);
      explorerMeshRef.current.rotation.y=0;
      if (!sit) for (const limb of ['leftLeg','rightLeg','leftShin','rightShin','leftArm','rightArm','headMesh']) {
        explorerMeshRef.current.getObjectByName(limb)?.rotation.set(0,0,0);
      }
    }
    globalPhysics.updateCylinderPos('player-explorer',position[0],position[2]);
    onExplorationMoveRef.current?.(position);
    setSeated(sit);
    setInteractionPrompt(sit?{text:'Stand up [E]',action:()=>occupyDesk(false)}:null);
  };

  useEffect(() => {
    localPlayerPos.current = [...explorationPlayerPos];
    if (explorerMeshRef.current) {
      explorerMeshRef.current.position.set(...explorationPlayerPos);
    }
  }, [explorationPlayerPos]);

  // Handle keyboard inputs for WASD and Arrow key walking in exploration mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.target as HTMLElement | null)?.closest('input,textarea,select,[contenteditable]')) return;
      keysPressed.current[k] = true;
      if (e.code === 'KeyB' && !e.repeat && modeRef.current === 'exploration') cyclingRef.current = !cyclingRef.current;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') keysPressed.current['w'] = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keysPressed.current['s'] = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keysPressed.current['a'] = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keysPressed.current['d'] = true;

      if (!pausedRef.current && !coveredRef.current && !lessonVisible.current && !e.repeat && (k === 'e' || e.code === 'KeyE' || e.code === 'Space') && interactionPromptRef.current) {
        interactionPromptRef.current.action();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressed.current[k] = false;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') keysPressed.current['w'] = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keysPressed.current['s'] = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keysPressed.current['a'] = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keysPressed.current['d'] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Setup Three.js scene once
  useEffect(() => {
    if (!canvasMountRef.current) return;
    const mountNode = canvasMountRef.current;
    const width = Math.max(10, mountNode.clientWidth || window.innerWidth || 800);
    const height = Math.max(10, mountNode.clientHeight || window.innerHeight || 600);

    // Clear and reset collections for the new scene
    playerMeshesRef.current.clear();
    squareMeshesRef.current.clear();
    squareHighlightsRef.current.clear();
    dustPuffsRef.current = [];
    spectatorsRef.current = [];
    streetVehiclesRef.current = [];
    globalPhysics.reset();

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const isIndoorVenue = venueType === 'indoor';
    scene.background = new THREE.Color(isIndoorVenue ? '#070d18' : '#a2b7c1');
    scene.fog = isIndoorVenue ? new THREE.FogExp2('#070d18', 0.003) : new THREE.FogExp2('#38bdf8', 0.007);
    const clouded = !isIndoorVenue && weather !== 'Clear';
    if (clouded) {
      const sky = weather === 'Rain' ? '#596e76' : weather === 'Fog' || weather==='Snow' ? '#b9c3bd' : '#8b9ca1';
      scene.background = new THREE.Color(sky);
      scene.fog = new THREE.FogExp2(sky, weather === 'Fog' ? .039 : .014);
    }
    const snowfall = weather==='Snow';
    const rainLines = !isIndoorVenue && (weather === 'Rain' || snowfall) ? new Float32Array(500 * 6) : undefined;
    const rain = rainLines ? new THREE.LineSegments(new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xd1e7ef, transparent: true, opacity: .34, depthWrite: false })) : undefined;
    if (rain && rainLines) {
      for (let i = 0; i < rainLines.length; i += 6) {
        rainLines[i] = (Math.random() - .5) * 60;
        rainLines[i + 1] = Math.random() * 18;
        rainLines[i + 2] = (Math.random() - .5) * 60;
      }
      rain.geometry.setAttribute('position', new THREE.BufferAttribute(rainLines, 3));
      rain.frustumCulled = false;
      scene.add(rain);
    }

    // Camera setup
    const aspect = height > 0 ? width / height : 1.33;
    const camera = new THREE.PerspectiveCamera(50, aspect, 0.12, 260);
    cameraRef.current = camera;
    if (mode === 'match' && isIndoorVenue) {
      // Start in entrance hallway foyer facing the closed double doors to the gymnasium
      camera.position.set(0, 2.0, 23.0);
      camera.lookAt(0, 2.1, 14.5);
    } else if (mode === 'preview') {
      camera.position.set(6.5, 3.6, 9.2);
      camera.lookAt(0.6, 0.4, 0.0);
    } else {
      updateCameraPosition(camera, cameraView, mode, localPlayerPos.current, venueType, matchZoomRef.current);
    }

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false });
      } catch (err) {
        console.warn('WebGL initialization error:', err);
        return;
      }
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;
    mountNode.innerHTML = '';
    mountNode.appendChild(renderer.domElement);

    // Lights
    if (isIndoorVenue) {
      // High school indoor arena illumination
      const ambientLight = new THREE.AmbientLight(0xfff5ea, 1.35);
      scene.add(ambientLight);

      const spot1 = new THREE.SpotLight(0xfffaed, 2.6, 45, Math.PI / 3, 0.4, 0.8);
      spot1.position.set(-6, 11, -5);
      spot1.target.position.set(0, 0, 0);
      spot1.castShadow = true;
      scene.add(spot1);
      scene.add(spot1.target);

      const spot2 = new THREE.SpotLight(0xfffaed, 2.6, 45, Math.PI / 3, 0.4, 0.8);
      spot2.position.set(6, 11, 5);
      spot2.target.position.set(0, 0, 0);
      scene.add(spot2);
      scene.add(spot2.target);
    } else {
      // Outdoor bright sunny blacktop
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(clouded ? 0xd5e2e7 : 0xfffaed, clouded ? .65 : 1.6);
      sunLight.position.set(18, 30, 22);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 85;
      sunLight.shadow.camera.left = -28;
      sunLight.shadow.camera.right = 28;
      sunLight.shadow.camera.top = 28;
      sunLight.shadow.camera.bottom = -28;
      sunLight.shadow.bias = -0.0005;
      scene.add(sunLight);

      const skyFill = new THREE.DirectionalLight(0xbae6fd, 0.5);
      skyFill.position.set(-20, 15, -15);
      scene.add(skyFill);
    }

    // Register Static Object Colliders in Physics Engine
    if (!isIndoorVenue) setupStaticColliders(venue?.id);

    // Build Schoolyard Environment with Enterable School Building or Indoor Gymnasium
    buildVenueEnvironment(scene, venue, refereeMeshRef, spectatorsRef, npcsRef, streetVehiclesRef, venueType, gymDoorsRef, mode === 'exploration');
    const teacher = scene.getObjectByName('campusTeacher');
    const collectibles = mode === 'exploration' && venue && onCollectItem ? campusCollectibles(venue.id).map((item) => {
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.23,0), new THREE.MeshStandardMaterial({ color:item.color, emissive:item.color, emissiveIntensity:.35, metalness:.45 }));
      mesh.position.set(item.x,.44,item.z);
      scene.add(mesh);
      return {mesh,item};
    }) : [];
    const crowd = scene.getObjectByName('campusCrowd');
    const liftPlatform = scene.getObjectByName('schoolLiftPlatform');
    let lastCrowdFrame = -1;
    const students:THREE.Object3D[]=[];
    scene.traverse((object)=>{if(typeof object.userData.studyIndex==='number')students.push(object);});
    const cameraAnchor = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();
    const marker = new THREE.Mesh(new THREE.TorusGeometry(.51,.045,8,32), new THREE.MeshBasicMaterial({color:0xffd081}));
    marker.rotation.x=-Math.PI/2;
    marker.visible=false;
    scene.add(marker);
    const cameraRay = new THREE.Raycaster();
    const cameraWalls: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && (object.userData.cameraWall || object.name === 'classroomFloor' || object.name === 'schoolFloor')) cameraWalls.push(object);
    });

    // Build Four Square Court
    const court = buildCourt(scene, squareMeshesRef, squareHighlightsRef, isIndoorVenue ? undefined : venue?.id);
    if (rain) {
      squareMeshesRef.current.forEach(({ material }) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.color.multiplyScalar(.74);
          material.roughness = .54;
        }
      });
    }

    // Build Ball and ground shadow
    buildBall(scene, ballMeshRef, ballShadowMeshRef, ballLook);
    if (mode === 'exploration') {
      globalPhysics.addCylinder({ id:'campus-court-ball',type:'object',x:3.4,z:2.4,radius:.22,height:.44,isStatic:true });
    }

    // Build Hover Reticle
    const reticleGeo = new THREE.RingGeometry(0.35, 0.45, 32);
    reticleGeo.rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.position.y = 0.04;
    scene.add(reticle);
    hoverIndicatorRef.current = reticle;

    // Build Exploration Avatar
    const explorer = buildCharacterMesh(CHARACTERS[0], customization);
    explorer.position.set(...localPlayerPos.current);
    explorer.visible = mode === 'exploration';
    scene.add(explorer);
    explorerMeshRef.current = explorer;

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = Math.max(10, containerRef.current.clientWidth || window.innerWidth || 800);
      const h = Math.max(10, containerRef.current.clientHeight || window.innerHeight || 600);
      cameraRef.current.aspect = h > 0 ? w / h : 1.33;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation & Physics Loop
    let animId: number;
    let clock = new THREE.Clock();

    let controllerInteract = false;
    let baselineX = 0;
    let lastCallKey = '';
    let lastBounceKey = '';
    let signal: 'serve' | 'in' | 'replay' | 'out' | 'end' = 'serve';
    let signalSquare: SquareId = 4;
    let signalStarted = -10;
    let crowdStarted = -10;
    if (captureFrameRef) captureFrameRef.current = () => new Promise((resolve) => {
      renderer.render(scene, camera);
      renderer.domElement.toBlob(resolve, 'image/png');
    });
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      const targetMarker=currentDrillMarker.current;
      marker.visible=Boolean(targetMarker);
      if(targetMarker)marker.position.set(targetMarker.x,.052,targetMarker.z);
      const currentMode = modeRef.current;
      const pad = document.hasFocus() ? readGamepad() : undefined;
      const interact = !!pad?.buttons[0]?.pressed;
      const interactPressed = interact && !controllerInteract;
      controllerInteract = interact;
      const stickX = stickAxis(pad, 0), stickZ = stickAxis(pad, 1);
      if (pausedRef.current || (coveredRef.current && (currentMode === 'preview' || currentMode === 'exploration')) ||
        (currentMode === 'preview' && disableBackgroundVideoRef.current)) return;
      if (rain && rainLines) {
        for (let i = 0; i < rainLines.length; i += 6) {
          rainLines[i + 1] = (18 + rainLines[i + 1] - delta * (snowfall?2.1:14)) % 18;
          rainLines[i + 3] = rainLines[i] - .12;
          rainLines[i + 4] = rainLines[i + 1] - (snowfall?.055:.48);
          rainLines[i + 5] = rainLines[i + 2] + .056;
        }
        rain.geometry.attributes.position.needsUpdate = true;
      }
      const currentCamView = currentMode === 'exploration' && activeOrbitRef.current ? 'third_person' : cameraViewRef.current;

      if (currentMode === 'exploration') {
        if (interactPressed && !lessonVisible.current) interactionPromptRef.current?.action();
        orbitYawRef.current -= stickAxis(pad, 2) * delta * 2.1;
        orbitPitchRef.current = THREE.MathUtils.clamp(orbitPitchRef.current - stickAxis(pad, 3) * delta * 1.5, -.38, 1.27);
        for (const [index,{mesh,item}] of collectibles.entries()) {
          mesh.visible = !collection.current.collectedItems?.includes(item.id);
          mesh.rotation.y = elapsed*1.3+index;
          mesh.position.y = .44+Math.sin(elapsed*2.3+index)*.075;
        }
        animateCampusTeacher(teacher, elapsed);
        const crowdFrame = Math.floor(elapsed * 24);
        if (crowd && lastCrowdFrame !== crowdFrame) {
          crowd.userData.update(elapsed);
          lastCrowdFrame = crowdFrame;
        }
        students.forEach((student)=>poseCampusStudent(student,elapsed,student.userData.studyIndex));
        if (seatedRef.current && explorerMeshRef.current) {
          explorerMeshRef.current.position.y=-.035;
          poseCampusStudent(explorerMeshRef.current,elapsed,2);
          renderer.render(scene,camera);
          return;
        }
        if (lessonVisible.current) { renderer.render(scene,camera);return; }
      }

      // Update 5-Second Shot Clock during active match turn
      if ((onShotClockExpiredRef.current || deadlineRef.current) && currentMode === 'match' && !isMatchIntroActiveRef.current &&
          !refereeState.current.finished && ballStateRef.current.isServing && activeTurnPlayerIdRef.current) {
        shotClockRef.current = deadlineRef.current ? Math.max(0, (deadlineRef.current - Date.now()) / 1000) :
          Math.max(0, shotClockRef.current - delta);
        setShotClockSeconds(Math.ceil(shotClockRef.current * 10) / 10);
        if (shotClockRef.current <= 0 && !deadlineRef.current) {
          shotClockRef.current = 5.0;
          if (onShotClockExpiredRef.current) {
            onShotClockExpiredRef.current();
          }
        }
      }

      if (currentMode === 'exploration' && explorerMeshRef.current && liftJourney.current) {
        const travel = liftJourney.current;
        travel.elapsed += delta;
        const fraction = THREE.MathUtils.smoothstep(travel.elapsed, 0, 1.55);
        const y = THREE.MathUtils.lerp(travel.from, travel.to, fraction);
        const dy = y - localPlayerPos.current[1];
        localPlayerPos.current = [SCHOOL_LIFT.x, y, SCHOOL_LIFT.z];
        explorerMeshRef.current.position.set(...localPlayerPos.current);
        if (liftPlatform) liftPlatform.position.y = y + .036;
        if (cameraRef.current) {
          cameraRef.current.position.y += dy;
          cameraRef.current.lookAt(SCHOOL_LIFT.x, y + 1.2, SCHOOL_LIFT.z);
        }
        if (fraction === 1) {
          liftJourney.current = null;
          onExplorationMoveRef.current?.(localPlayerPos.current);
          checkProximityPrompts(localPlayerPos.current);
        }
        renderer.render(scene, camera);
        return;
      }

      // 1. Exploration Free-Roam Physics & Camera-Relative WASD Movement
      if (currentMode === 'exploration' && explorerMeshRef.current) {
        // In first person mode, hide avatar mesh so it doesn't obstruct camera view
        explorerMeshRef.current.visible = currentCamView !== 'first_person';

        const activeLocomotion = cyclingRef.current ? 'bike' : (keysPressed.current.shift || pad?.buttons[10]?.pressed) ? 'run' : 'walk';
        const baseSpeed = activeLocomotion === 'walk' ? 4.5 : activeLocomotion === 'bike' ? 14.0 : 8.5;
        const speed = baseSpeed * delta;
        let moveX = 0;
        let moveZ = 0;

        const isKeyActive = stickX || stickZ ||
          keysPressed.current['w'] ||
          keysPressed.current['arrowup'] ||
          keysPressed.current['s'] ||
          keysPressed.current['arrowdown'] ||
          keysPressed.current['a'] ||
          keysPressed.current['arrowleft'] ||
          keysPressed.current['d'] ||
          keysPressed.current['arrowright'];

        if (isKeyActive) {
          targetMovePosRef.current = null;

          // Camera-relative forward/right vectors based on scene rotation (orbitYawRef.current)
          const yaw = orbitYawRef.current;
          const fwdX = -Math.sin(yaw);
          const fwdZ = -Math.cos(yaw);
          const rightX = Math.cos(yaw);
          const rightZ = -Math.sin(yaw);
          moveX = (stickX * rightX - stickZ * fwdX) * speed;
          moveZ = (stickX * rightZ - stickZ * fwdZ) * speed;

          // W / Up: Forward in camera view
          if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
            moveX += fwdX * speed;
            moveZ += fwdZ * speed;
          }
          // S / Down: Backwards in camera view
          if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
            moveX -= fwdX * speed;
            moveZ -= fwdZ * speed;
          }
          // A / Left: Left relative to camera view
          if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
            moveX -= rightX * speed;
            moveZ -= rightZ * speed;
          }
          // D / Right: Right relative to camera view
          if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
            moveX += rightX * speed;
            moveZ += rightZ * speed;
          }

          // Orient character mesh to face their moving direction
          if (moveX !== 0 || moveZ !== 0) {
            explorerMeshRef.current.rotation.y = Math.atan2(moveX, moveZ);
          }
        } else if (targetMovePosRef.current) {
          // Walk towards clicked point on ground
          const dx = targetMovePosRef.current.x - localPlayerPos.current[0];
          const dz = targetMovePosRef.current.z - localPlayerPos.current[2];
          const dist = Math.hypot(dx, dz);

          if (dist > 0.18) {
            const clickAngle = Math.atan2(dx, dz);
            explorerMeshRef.current.rotation.y = clickAngle;
            moveX = (dx / dist) * Math.min(speed, dist);
            moveZ = (dz / dist) * Math.min(speed, dist);
          } else {
            targetMovePosRef.current = null;
          }
        }

        const isMoving = moveX !== 0 || moveZ !== 0;

        if (isMoving) {
          const rawX = localPlayerPos.current[0] + moveX;
          const rawZ = localPlayerPos.current[2] + moveZ;

          // Resolve person-to-person, person-to-wall, and person-to-object physics collision
          const [resolvedX, resolvedZ] = globalPhysics.resolvePersonMovement(
            'player-explorer',
            rawX,
            rawZ,
            0.45,
            localPlayerPos.current[1]
          );

          const elevation = getCampusElevation(localPlayerPos.current[1], resolvedX, resolvedZ);
          localPlayerPos.current = [resolvedX, elevation, resolvedZ];
          explorerMeshRef.current.position.set(...localPlayerPos.current);

          // Walking body bobbing & limb gait cycle (Arms & Legs swinging)
          explorerMeshRef.current.position.y = elevation + Math.abs(Math.sin(elapsed * 12)) * 0.08;

          const leftArm = explorerMeshRef.current.getObjectByName('leftArm') as THREE.Group;
          const rightArm = explorerMeshRef.current.getObjectByName('rightArm') as THREE.Group;
          const leftLeg = explorerMeshRef.current.getObjectByName('leftLeg') as THREE.Group;
          const rightLeg = explorerMeshRef.current.getObjectByName('rightLeg') as THREE.Group;

          const walkGait = Math.sin(elapsed * 12);
          if (leftArm) leftArm.rotation.x = walkGait * 0.6;
          if (rightArm) rightArm.rotation.x = -walkGait * 0.6;
          if (leftLeg) leftLeg.rotation.x = -walkGait * 0.6;
          if (rightLeg) rightLeg.rotation.x = walkGait * 0.6;

          if (onExplorationMoveRef.current) {
            onExplorationMoveRef.current(localPlayerPos.current);
          }

          checkProximityPrompts(localPlayerPos.current);
        } else {
          explorerMeshRef.current.position.y = localPlayerPos.current[1];
          // Lerp limbs back to natural standing stance
          const leftArm = explorerMeshRef.current.getObjectByName('leftArm') as THREE.Group;
          const rightArm = explorerMeshRef.current.getObjectByName('rightArm') as THREE.Group;
          const leftLeg = explorerMeshRef.current.getObjectByName('leftLeg') as THREE.Group;
          const rightLeg = explorerMeshRef.current.getObjectByName('rightLeg') as THREE.Group;

          if (leftArm) leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, 0.2);
          if (rightArm) rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, 0.2);
          if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.2);
          if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.2);
        }

        // Camera Tracking with Live View & Right-Click Orbit Rotation
        if (cameraRef.current) {
          const [px, py, pz] = localPlayerPos.current;
          const yaw = orbitYawRef.current;
          const pitch = orbitPitchRef.current;

          if (currentCamView === 'first_person') {
            // First Person: Camera placed right at avatar's eye height
            const eyeY = py + 1.55 + (isMoving ? Math.sin(elapsed * 12) * 0.04 : 0);
            cameraRef.current.position.set(px, eyeY, pz);
            cameraRef.current.lookAt(
              px - Math.sin(yaw) * 12,
              eyeY + Math.sin(pitch) * 8,
              pz - Math.cos(yaw) * 12
            );
          } else if (currentCamView === 'third_person') {
            // Third Person: Free 360-degree rotation with smooth zoom and pan around the player!
            const dist = orbitDistanceRef.current;
            const yaw = orbitYawRef.current;
            const pitch = orbitPitchRef.current;

            cameraAnchor.set(px, py + 1.36, pz);
            cameraDirection.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).normalize();
            cameraRay.set(cameraAnchor, cameraDirection);
            cameraRay.far = dist;
            const wall = cameraRay.intersectObjects(cameraWalls, false)[0];
            const clear = wall ? Math.max(0.21, wall.distance - 0.40) : dist;
            explorerMeshRef.current.visible = clear > .85;
            cameraRef.current.position.copy(cameraAnchor).addScaledVector(cameraDirection, clear);
            cameraRef.current.position.y = Math.max(py + .25, cameraRef.current.position.y);
            cameraRef.current.lookAt(px, py + 1.2, pz);
          } else if (currentCamView === 'top_down') {
            // Top Down: Overhead bird's eye
            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, px, 0.15);
            cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, py + 18.0, 0.15);
            cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, pz + 0.1, 0.15);
            cameraRef.current.lookAt(px, py, pz);
          } else if (currentCamView === 'action') {
            // Action Cam: Low dynamic angle
            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, px + 3.2, 0.12);
            cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, py + 2.2, 0.12);
            cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, pz + 4.2, 0.12);
            cameraRef.current.lookAt(px, py + 0.8, pz);
          } else {
            // Isometric view
            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, px + 7.5, 0.12);
            cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, py + 9.5, 0.12);
            cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, pz + 9.5, 0.12);
            cameraRef.current.lookAt(px, py + 0.8, pz);
          }
        }
      }

      // 2. Main Menu Animated Background Match Simulation (Continuous Live 4-Player Match Rally)
      if (currentMode === 'preview' && ballMeshRef.current && ballShadowMeshRef.current) {
        const sim = previewSimRef.current;
        const now = performance.now();
        const progress = Math.max(0, (now - sim.shotStartTime) / sim.shotDuration);
        const livePlayers = playersRef.current;

        if (progress >= 1.0) {
          // Ball arrived in target square! Pick next hitter & target
          sim.currentHitterSq = sim.targetSq;
          const remainingSquares: SquareId[] = ([1, 2, 3, 4] as SquareId[]).filter((s) => s !== sim.currentHitterSq);
          sim.targetSq = remainingSquares[Math.floor(Math.random() * remainingSquares.length)];
          sim.shotStartTime = now + STRIKE_PHASE * STRIKE_DURATION * 1000;
          sim.shotDuration = 820 + Math.random() * 240;
          sim.rallyCount++;

          const hitterPlayer = livePlayers.find((p) => p.rank === sim.currentHitterSq);
          const nextSqCenter = SQUARE_CONFIGS[sim.targetSq].center;
          const nextDestX = nextSqCenter[0] + (Math.random() - 0.5) * 1.4;
          const nextDestZ = nextSqCenter[1] + (Math.random() - 0.5) * 1.4;

          // Launch directly from extended hand strike position
          const contactX = sim.targetPos.x;
          const contactZ = sim.targetPos.z;
          const contactPos = new THREE.Vector3(contactX, 0.58, contactZ);
          sim.startPos.copy(contactPos);
          sim.targetPos.set(nextDestX, 0.22, nextDestZ);
          sim.peakHeight = 1.25 + Math.random() * 0.65;

          // Trigger hand-to-ball strike animation on the hitter
          if (hitterPlayer?.rank) {
            swingAnimsRef.current.set(hitterPlayer.id, {
              elapsed: 0,
              contactPos,
              rank: hitterPlayer.rank,
              plantLimit: 1.05,
            });
          }

          if (sceneRef.current) {
            spawnDustPuff(sceneRef.current, contactX, contactZ, dustPuffsRef);
          }
        } else {
          // Realistic parabolic flight trajectory
          const curX = THREE.MathUtils.lerp(sim.startPos.x, sim.targetPos.x, progress);
          const curZ = THREE.MathUtils.lerp(sim.startPos.z, sim.targetPos.z, progress);
          const curY =
            THREE.MathUtils.lerp(sim.startPos.y, 0.22, progress) +
            Math.sin(progress * Math.PI) * sim.peakHeight;

          ballMeshRef.current.position.set(curX, curY, curZ);
          ballMeshRef.current.rotation.x += 0.14;
          ballMeshRef.current.rotation.z += 0.09;

          ballShadowMeshRef.current.position.set(curX, 0.02, curZ);
          const shadowScale = Math.max(0.3, 1.0 - curY * 0.22);
          ballShadowMeshRef.current.scale.set(shadowScale, shadowScale, shadowScale);
        }

        // Active preview footwork: target contender runs cleanly behind sim.targetPos to meet ball on arrival
        livePlayers.forEach((player) => {
          const grp = playerMeshesRef.current.get(player.id);
          if (!grp || !player.rank) return;
          const sq = player.rank;
          const [defX, , defZ] = SQUARE_CONFIGS[sq].defaultPlayerPos;
          let desiredX = defX;
          let desiredZ = defZ;

          if (sq === sim.targetSq) {
            // Stand 0.48m behind incoming ball strike point toward square's outer corner
            const outLen = Math.hypot(defX, defZ) || 1;
            desiredX = sim.targetPos.x + (defX / outLen) * 0.46;
            desiredZ = sim.targetPos.z + (defZ / outLen) * 0.46;
          }

          const clampBounds = getSquarePlayBounds(sq);
          desiredX = THREE.MathUtils.clamp(desiredX, clampBounds.minX, clampBounds.maxX);
          desiredZ = THREE.MathUtils.clamp(desiredZ, clampBounds.minZ, clampBounds.maxZ);

          const stepRate = sq === sim.targetSq ? Math.min(1, delta * 7.2) : Math.min(1, delta * 3.4);
          const prevX = grp.position.x;
          const prevZ = grp.position.z;
          const nextX = THREE.MathUtils.lerp(prevX, desiredX, stepRate);
          const nextZ = THREE.MathUtils.lerp(prevZ, desiredZ, stepRate);
          grp.position.x = nextX;
          grp.position.z = nextZ;

          const moveSpeed = Math.hypot(nextX - prevX, nextZ - prevZ) / Math.max(0.001, delta);
          const lookTarget = ballMeshRef.current ? ballMeshRef.current.position : new THREE.Vector3(0, 0.5, 0);
          const targetYaw = Math.atan2(lookTarget.x - nextX, lookTarget.z - nextZ);
          grp.rotation.y = lerpAngle(grp.rotation.y, targetYaw, Math.min(1, delta * 10));

          if (!swingAnimsRef.current.has(player.id)) {
            applyFootworkGait(grp, moveSpeed, elapsed);
          }

          const head = grp.getObjectByName('headMesh') as THREE.Group;
          if (head && ballMeshRef.current) {
            const dx = ballMeshRef.current.position.x - grp.position.x;
            const dz = ballMeshRef.current.position.z - grp.position.z;
            const angle = Math.atan2(dx, dz) - grp.rotation.y;
            head.rotation.y = THREE.MathUtils.clamp(angle, -0.65, 0.65);
            head.rotation.x = -THREE.MathUtils.clamp((ballMeshRef.current.position.y - 1.1) * 0.35, -0.4, 0.4);
          }
        });

        // Elevated studio camera perspective framing the 4-player rally on the center-right of the screen
        // Positioned safely inside the venue boundary (z ≈ 10.2) to prevent clipping through gymnasium entrance walls
        if (cameraRef.current) {
          const panDrift = Math.sin(now * 0.00035) * 0.4;
          const tiltDrift = Math.cos(now * 0.0003) * 0.15;
          cameraRef.current.position.set(2.4 + panDrift, 7.8 + tiltDrift, 10.2);
          cameraRef.current.lookAt(0.6, 0.4, 0.0);
        }
      }

      // Match camera stays on the near baseline as players rotate.
      if (currentMode === 'match' && cameraRef.current) {
        if (isMatchIntroActiveRef.current) {
          const progress = Math.min(1, (performance.now() - matchIntroStartTimeRef.current) / 4000);
          const ease = progress * progress * (3 - 2 * progress);
          const zoom = matchZoomRef.current;
          const narrow = Math.max(1, 1.12 / cameraRef.current.aspect);
          const distance = (venueType === 'indoor' ? 12 : 15) * narrow;
          cameraRef.current.position.set(
            THREE.MathUtils.lerp(4.2, 0, ease) * zoom,
            THREE.MathUtils.lerp(8.2, 6.5, ease) * zoom * narrow,
            THREE.MathUtils.lerp(distance, 9.75 * narrow, ease) * zoom,
          );
          cameraRef.current.lookAt(0, .65, .15);
        } else {
          const zf = matchZoomRef.current;
          if (currentCamView === 'first_person') {
            // Baseline Corner Cam pulled cleanly outside court boundaries behind human player (no torso clipping!)
            const human = playersRef.current.find((p) => p.id === humanPlayerIdRef.current || p.isHuman);
            const sq = human?.rank || 1;
            const [hx, , hz] = SQUARE_CONFIGS[sq].defaultPlayerPos;
            const len = Math.hypot(hx, hz) || 1;
            const cx = (hx / len) * 10.2 * zf;
            const cz = (hz / len) * 10.2 * zf;
            cameraRef.current.position.set(cx, 7.6 * zf, cz);
            cameraRef.current.lookAt(0, 0.3, 0);
          } else if (currentCamView === 'third_person') {
            const controlled = playerMeshesRef.current.get(humanPlayerIdRef.current);
            const sx = controlled?.position.x ?? 0;
            const narrow = Math.max(1, 1.12 / cameraRef.current.aspect);

            baselineX = THREE.MathUtils.lerp(baselineX, sx, Math.min(1, delta * 5));
            cameraRef.current.position.set(baselineX * 0.32, 6.5 * zf * narrow, 9.75 * zf * narrow);
            cameraRef.current.lookAt(baselineX * 0.22, 0.65, 0.15);
          } else if (currentCamView === 'top_down') {
            cameraRef.current.position.set(0, (venueType === 'indoor' ? 20.0 : 27.0) * zf, 0.2);
            cameraRef.current.lookAt(0, 0, 0);
          } else if (currentCamView === 'action') {
            cameraRef.current.position.set(
              (venueType === 'indoor' ? 8.2 : 10.5) * zf,
              (venueType === 'indoor' ? 7.8 : 9.8) * zf,
              (venueType === 'indoor' ? 13.5 : 17.5) * zf
            );
            cameraRef.current.lookAt(0, 0.3, -0.5);
          } else {
            // Isometric 3/4 Elevated Broadcast
            cameraRef.current.position.set(
              (venueType === 'indoor' ? 11.5 : 15.5) * zf,
              (venueType === 'indoor' ? 13.0 : 18.0) * zf,
              (venueType === 'indoor' ? 15.5 : 21.0) * zf
            );
            cameraRef.current.lookAt(0, 0.2, -1.0);
          }
          fitMatchCamera(cameraRef.current, playerMeshesRef.current.get(humanPlayerIdRef.current)?.position,
            ballMeshRef.current?.position);
        }
      }

      // 3B. Live Match Footwork Interception & Ball Tracking
      if (currentMode === 'match') {
        const liveBall = ballStateRef.current;
        const livePlayers = playersRef.current;
        const serverId = servingPlayerIdRef.current;
        const turnId = activeTurnPlayerIdRef.current;

        // Predict landing/intercept coordinate for incoming ball
        let interceptX = liveBall.x;
        let interceptZ = liveBall.z;
        if (liveBall.isLive && !liveBall.hasBouncedThisPlay) {
          // Move to the first bounce, then track the playable ball.
          const g = 9.8;
          const height = Math.max(0, liveBall.y - 0.22);
          const tReach = Math.min(1.25, (liveBall.vy + Math.sqrt(liveBall.vy ** 2 + 2 * g * height)) / g);
          interceptX = liveBall.x + liveBall.vx * tReach;
          interceptZ = liveBall.z + liveBall.vz * tReach;
        }

        const ballPosVec = ballMeshRef.current ? ballMeshRef.current.position : new THREE.Vector3(liveBall.x, liveBall.y, liveBall.z);

        livePlayers.forEach((player) => {
          const grp = playerMeshesRef.current.get(player.id);
          if (!grp || !player.rank) return;
          const sq = player.rank;
          const [defX, , defZ] = SQUARE_CONFIGS[sq].defaultPlayerPos;
          const bounds = getSquarePlayBounds(sq);

          let desiredX = defX;
          let desiredZ = defZ;

          if (liveBall.isServing && !liveBall.isLive) {
            if (player.id === serverId) {
              desiredX = defX * 0.88;
              desiredZ = defZ * 0.88;
            }
          } else if (liveBall.isLive) {
            const isReceivingTarget = player.id === turnId ||
              (!liveBall.hasBouncedThisPlay && liveBall.targetSquare === sq);

            if (isReceivingTarget && (assistFootwork || player.id !== humanPlayerIdRef.current)) {
              // Position defender ~0.48m behind incoming ball toward outer corner so palm lands directly on ball
              const outLen = Math.hypot(defX, defZ) || 1;
              desiredX = THREE.MathUtils.clamp(interceptX + (defX / outLen) * 0.46, bounds.minX, bounds.maxX);
              desiredZ = THREE.MathUtils.clamp(interceptZ + (defZ / outLen) * 0.46, bounds.minZ, bounds.maxZ);
            } else {
              // Subtle ready-stance tracking shift toward court center
              desiredX = THREE.MathUtils.clamp(defX + THREE.MathUtils.clamp(liveBall.x - defX, -0.5, 0.5) * 0.3, bounds.minX, bounds.maxX);
              desiredZ = THREE.MathUtils.clamp(defZ + THREE.MathUtils.clamp(liveBall.z - defZ, -0.5, 0.5) * 0.3, bounds.minZ, bounds.maxZ);
            }
          }

          const keys = keysPressed.current;
          const moveX = THREE.MathUtils.clamp(Number(!!keys.d) - Number(!!keys.a) + stickX, -1, 1);
          const moveZ = THREE.MathUtils.clamp(Number(!!keys.s) - Number(!!keys.w) + stickZ, -1, 1);
          const controlled = manualFootwork && player.id === humanPlayerIdRef.current;
          const trainingTarget = followDrillMarker.current ? currentDrillMarker.current : undefined;
          const manual = controlled && (moveX !== 0 || moveZ !== 0 || Boolean(trainingTarget));
          const dive = controlled && (keys.f || pad?.buttons[5]?.pressed);
          if (manual) {
            const direction = (cameraRef.current?.position.z ?? 0) < 0 ? -1 : 1;
            desiredX = THREE.MathUtils.clamp(grp.position.x + moveX * direction, bounds.minX, bounds.maxX);
            desiredZ = THREE.MathUtils.clamp(grp.position.z + moveZ * direction, bounds.minZ, bounds.maxZ);
            if (trainingTarget && moveX===0 && moveZ===0) { desiredX=trainingTarget.x;desiredZ=trainingTarget.z; if (Math.hypot(grp.position.x-trainingTarget.x,grp.position.z-trainingTarget.z)<.38) followDrillMarker.current=false; }
            else followDrillMarker.current=false;
          }
          const isSwinging = swingAnimsRef.current.has(player.id);
          const prevX = grp.position.x;
          const prevZ = grp.position.z;
          const distance = Math.hypot(desiredX - prevX, desiredZ - prevZ);
          const speedLimit = manual ? (dive ? 10 : 5.8) : player.id === turnId || liveBall.targetSquare === sq ? 6.4 : 4.2;
          const step = isSwinging || !distance ? 0 : Math.min(1, delta * 8, speedLimit * delta / distance);
          const nextX = THREE.MathUtils.lerp(prevX, desiredX, step);
          const nextZ = THREE.MathUtils.lerp(prevZ, desiredZ, step);
          if (controlled) reportPose.current?.({ id: player.id, x: nextX, z: nextZ, reaching: Boolean(dive) });
          grp.position.x = nextX;
          grp.position.z = nextZ;
          grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, dive && !isSwinging ? -moveX * 0.34 : 0, Math.min(1, delta * 12));
          grp.position.y = THREE.MathUtils.lerp(grp.position.y, 0.035, Math.min(1, delta * 12));
          playerCourtPoseRef.current.set(player.id, {
            x: nextX,
            z: nextZ,
            yaw: grp.rotation.y,
            rank: sq,
          });
          globalPhysics.updateCylinderPos(player.id, nextX, nextZ);

          const moveSpeed = Math.hypot(nextX - prevX, nextZ - prevZ) / Math.max(0.001, delta);
          if (!isSwinging) {
            const lookTarget =
              liveBall.isServing && !liveBall.isLive && player.id === serverId
                ? new THREE.Vector3(0, 0.5, 0)
                : ballPosVec;
            const targetYaw = Math.atan2(lookTarget.x - nextX, lookTarget.z - nextZ);
            grp.rotation.y = lerpAngle(grp.rotation.y, targetYaw, Math.min(1, delta * 11));
            applyFootworkGait(grp, moveSpeed, elapsed);
            if (dive) {
              const torso = grp.getObjectByName('torsoMesh');
              const arm = grp.getObjectByName('rightArm');
              if (torso) torso.rotation.x = .24;
              if (arm) arm.rotation.x = -.9;
            }
          }

          // Smooth head eye-tracking toward the ball
          const head = grp.getObjectByName('headMesh') as THREE.Group;
          if (head) {
            const dx = ballPosVec.x - grp.position.x;
            const dz = ballPosVec.z - grp.position.z;
            const relAngle = Math.atan2(dx, dz) - grp.rotation.y;
            head.rotation.y = THREE.MathUtils.clamp(relAngle, -0.65, 0.65);
            head.rotation.x = -THREE.MathUtils.clamp((ballPosVec.y - 1.1) * 0.35, -0.38, 0.38);
          }

          // Keep serve ball physically cradled in front of the server's palm
          if (liveBall.isServing && !liveBall.isLive && player.id === serverId && ballMeshRef.current && ballShadowMeshRef.current) {
            const contact = serveContactPosition(sq);
            ballMeshRef.current.position.set(contact.x, contact.y, contact.z);
            ballShadowMeshRef.current.position.set(contact.x, 0.02, contact.z);
          }
        });
      }

      // 4. Update dynamic inverse-reach palm-strike hitting animations
      swingAnimsRef.current.forEach((anim, playerId) => {
        const pGrp = playerMeshesRef.current.get(playerId);
        if (!pGrp) {
          swingAnimsRef.current.delete(playerId);
          return;
        }

        const rightArm = pGrp.getObjectByName('rightArm') as THREE.Group;
        const rightForearm = pGrp.getObjectByName('rightForearm') as THREE.Group;
        const leftArm = pGrp.getObjectByName('leftArm') as THREE.Group;
        const leftForearm = pGrp.getObjectByName('leftForearm') as THREE.Group;
        const torso = pGrp.getObjectByName('torsoMesh') as THREE.Object3D;
        const leftLeg = pGrp.getObjectByName('leftLeg') as THREE.Group;
        const rightLeg = pGrp.getObjectByName('rightLeg') as THREE.Group;
        const leftShin = pGrp.getObjectByName('leftShin') as THREE.Group;
        const rightShin = pGrp.getObjectByName('rightShin') as THREE.Group;

        const previousProgress = anim.elapsed / STRIKE_DURATION;
        anim.elapsed += delta;
        // Render the contact frame even at low frame rates.
        if (previousProgress < STRIKE_PHASE && anim.elapsed > STRIKE_PHASE * STRIKE_DURATION) {
          anim.elapsed = STRIKE_PHASE * STRIKE_DURATION;
        }
        const progress = Math.min(1, anim.elapsed / STRIKE_DURATION);
        const approach = Math.sin(Math.min(1, progress / STRIKE_PHASE) * Math.PI / 2);
        if (!anim.plantStep) {
          const { x: startX, z: startZ } = pGrp.position;
          const dx = anim.contactPos.x - startX;
          const dz = anim.contactPos.z - startZ;
          const distance = Math.hypot(dx, dz);
          const bounds = getSquarePlayBounds(anim.rank);
          const step = distance > 0.42 ? Math.min(anim.plantLimit, distance - 0.42) / distance : 0;
          anim.plantStep = {
            startX, startZ,
            endX: THREE.MathUtils.clamp(startX + dx * step, bounds.minX, bounds.maxX),
            endZ: THREE.MathUtils.clamp(startZ + dz * step, bounds.minZ, bounds.maxZ),
          };
        }
        const aimYaw = Math.atan2(
          anim.contactPos.x - pGrp.position.x,
          anim.contactPos.z - pGrp.position.z
        );
        const strikeHeight = THREE.MathUtils.clamp(anim.contactPos.y, 0.35, 1.35);
        // Pitch shoulder angle dynamically to ball height (low scoop vs waist drive vs high chop)
        const reachAngleX = THREE.MathUtils.lerp(-1.15, -2.05, (strikeHeight - 0.35) / 1.0);

        if (progress < 1.0) {
          pGrp.rotation.y = lerpAngle(pGrp.rotation.y, aimYaw, 0.45);
          if (progress < STRIKE_PHASE) {
            const lungeCurve = approach;

            if (rightArm) {
              rightArm.rotation.x = THREE.MathUtils.lerp(-0.3, reachAngleX, lungeCurve);
              rightArm.rotation.z = THREE.MathUtils.lerp(-0.28, -0.08, lungeCurve);
              rightArm.rotation.y = THREE.MathUtils.lerp(0, -0.18, lungeCurve);
            }
            if (rightForearm) {
              rightForearm.rotation.x = THREE.MathUtils.lerp(-0.35, -0.08, lungeCurve);
            }
            if (leftArm) {
              leftArm.rotation.x = THREE.MathUtils.lerp(-0.3, 0.45, lungeCurve);
              leftArm.rotation.z = THREE.MathUtils.lerp(0.32, 0.55, lungeCurve);
            }
            if (leftForearm) leftForearm.rotation.x = -0.4;
            if (torso) {
              torso.rotation.x = lungeCurve * 0.34;
              torso.rotation.y = lungeCurve * 0.22;
            }
            if (leftLeg) leftLeg.rotation.x = -lungeCurve * 0.44;
            if (rightLeg) rightLeg.rotation.x = lungeCurve * 0.42;
            if (leftShin) leftShin.rotation.x = lungeCurve * 0.42;
            if (rightShin) rightShin.rotation.x = lungeCurve * 0.25;
            pGrp.position.y = 0.045;
          } else {
            const returnT = (progress - STRIKE_PHASE) / (1 - STRIKE_PHASE);
            const ease = 1 - Math.pow(1 - returnT, 2);
            if (rightArm) {
              rightArm.rotation.x = THREE.MathUtils.lerp(reachAngleX, -0.25, ease);
              rightArm.rotation.z = THREE.MathUtils.lerp(-0.08, -0.18, ease);
              rightArm.rotation.y = THREE.MathUtils.lerp(-0.18, 0, ease);
            }
            if (rightForearm) rightForearm.rotation.x = THREE.MathUtils.lerp(-0.08, -0.32, ease);
            if (leftArm) {
              leftArm.rotation.x = THREE.MathUtils.lerp(0.45, -0.25, ease);
              leftArm.rotation.z = THREE.MathUtils.lerp(0.55, 0.18, ease);
            }
            if (leftForearm) leftForearm.rotation.x = THREE.MathUtils.lerp(-0.4, -0.32, ease);
            if (torso) {
              torso.rotation.x = THREE.MathUtils.lerp(0.34, 0, ease);
              torso.rotation.y = THREE.MathUtils.lerp(0.22, 0, ease);
            }
            if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(-0.44, 0, ease);
            if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(0.42, 0, ease);
            if (leftShin) leftShin.rotation.x = THREE.MathUtils.lerp(0.42, 0, ease);
            if (rightShin) rightShin.rotation.x = THREE.MathUtils.lerp(0.25, 0, ease);
            pGrp.position.y = 0.045;
          }
          const { startX, startZ, endX, endZ } = anim.plantStep;
          pGrp.position.x = THREE.MathUtils.lerp(startX, endX, approach);
          pGrp.position.z = THREE.MathUtils.lerp(startZ, endZ, approach);
          const contactWeight = progress <= STRIKE_PHASE ? approach : Math.max(0, 1 - (progress - STRIKE_PHASE) / 0.24);
          const diving = anim.plantLimit === DIVE_STEP;
          if (torso && contactWeight > 0) {
            torso.rotation.x = contactWeight * (diving ? 0.58 : strikeHeight < 0.55 ? 0.44 : strikeHeight > 1.2 ? 0.12 : 0.26);
          }
          if (rightArm && contactWeight > 0) aimStrikePalm(rightArm, anim.contactPos, contactWeight);

          if (previousProgress < STRIKE_PHASE && progress >= STRIKE_PHASE) {
            spawnHitShockwave(scene, anim.contactPos, hitShockwavesRef);
          }

          const liveBall = ballStateRef.current;
          if (currentMode === 'match' && liveBall.isLive && liveBall.lastHitterId === playerId &&
              !liveBall.hasBouncedThisPlay && ballMeshRef.current && ballShadowMeshRef.current) {
            const release = THREE.MathUtils.smoothstep(progress, STRIKE_PHASE, STRIKE_PHASE + 0.25);
            ballMeshRef.current.position.set(
              THREE.MathUtils.lerp(anim.contactPos.x, liveBall.x, release),
              THREE.MathUtils.lerp(anim.contactPos.y, liveBall.y, release),
              THREE.MathUtils.lerp(anim.contactPos.z, liveBall.z, release),
            );
            ballShadowMeshRef.current.position.set(ballMeshRef.current.position.x, 0.02, ballMeshRef.current.position.z);
          }
        } else {
          if (rightArm) {
            rightArm.rotation.set(-0.25, 0, -0.18);
          }
          if (rightForearm) rightForearm.rotation.x = -0.32;
          if (leftArm) {
            leftArm.rotation.set(-0.25, 0, 0.18);
          }
          if (leftForearm) leftForearm.rotation.x = -0.32;
          if (torso) {
            torso.rotation.x = 0;
            torso.rotation.y = 0;
          }
          if (leftLeg) leftLeg.rotation.x = 0;
          if (rightLeg) rightLeg.rotation.x = 0;
          if (leftShin) leftShin.rotation.x = 0;
          if (rightShin) rightShin.rotation.x = 0;
          pGrp.position.y = 0.035;
          swingAnimsRef.current.delete(playerId);
        }
      });

      // 5. Idle breathing & Controlled Player ("YOU") Cyan Aura + Bobbing Arrow Animation
      if (currentMode !== 'exploration') {
        playerMeshesRef.current.forEach((grp, id) => {
          if (!swingAnimsRef.current.has(id)) {
            const idleOffset = Number(id.replace(/\D/g, '')) || 0;
            const body = grp.getObjectByName('playerBody');
            if (body) {
              body.position.y = 0.018 * (1 + Math.sin(elapsed * 3.0 + idleOffset));
            }
          }
          const youAura = grp.getObjectByName('youGroundAura') as THREE.Group | undefined;
          if (youAura && youAura.visible) {
            const pulse = 1.0 + Math.sin(elapsed * 4.2) * 0.085;
            youAura.scale.set(pulse, 1, pulse);
            youAura.rotation.y = elapsed * 0.8;
          }
          const youArrow = grp.getObjectByName('youPointerArrow') as THREE.Sprite | undefined;
          if (youArrow && youArrow.visible) {
            youArrow.position.y = 2.68 + Math.sin(elapsed * 4.8) * 0.10;
          }
        });
      }

      // 5B. Expand & fade dust puffs and hand-to-ball strike shockwaves
      for (let i = dustPuffsRef.current.length - 1; i >= 0; i--) {
        const puff = dustPuffsRef.current[i];
        const mat = puff.material as THREE.MeshBasicMaterial;
        puff.scale.x += delta * 2.8;
        puff.scale.y += delta * 2.8;
        mat.opacity -= delta * 1.9;
        if (mat.opacity <= 0.02) {
          if (sceneRef.current) sceneRef.current.remove(puff);
          puff.geometry.dispose();
          mat.dispose();
          dustPuffsRef.current.splice(i, 1);
        }
      }
      for (let i = hitShockwavesRef.current.length - 1; i >= 0; i--) {
        const ring = hitShockwavesRef.current[i];
        const mat = ring.material as THREE.MeshBasicMaterial;
        ring.scale.addScalar(delta * 4.2);
        mat.opacity -= delta * 3.2;
        if (mat.opacity <= 0.02) {
          if (sceneRef.current) sceneRef.current.remove(ring);
          ring.geometry.dispose();
          mat.dispose();
          hitShockwavesRef.current.splice(i, 1);
        }
      }

      // Officials react to the same calls used by the match HUD.
      if (currentMode !== 'exploration') {
        const ball = ballStateRef.current;
        const { call, finished } = refereeState.current;
        const callKey = call ? [call.type, call.timestamp, call.message, finished].join(':') : '';
        if (callKey && callKey !== lastCallKey) {
          lastCallKey = callKey;
          if (finished) {
            signal = 'end';
            crowdStarted = signalStarted = elapsed;
          } else if (call && call.type !== 'clean_hit') {
            signal = call.type === 'serve_ready' ? 'serve' : call.type === 'serve_fault_one' ? 'replay' : 'out';
            signalSquare = call.offendingSquare ?? 4;
            if (signal === 'out' && lastBounceKey) crowdStarted = elapsed;
            signalStarted = elapsed;
          }
          if (!ball.isLive) lastBounceKey = '';
        }

        if (ball.hasBouncedThisPlay && ball.currentSquareOwner && ball.isLive) {
          const bounceKey = [ball.hitCount, ball.lastHitterId, ball.currentSquareOwner].join(':');
          if (bounceKey !== lastBounceKey) {
            lastBounceKey = bounceKey;
            signal = 'in';
            signalSquare = ball.currentSquareOwner;
            signalStarted = elapsed;
            const hits = ball.hitCount ?? 0;
            if (hits >= 3 && hits % 3 === 0) crowdStarted = elapsed;
          }
        }

        const official = refereeMeshRef.current;
        const ballPosition = ballMeshRef.current?.position;
        if (official && ballPosition) {
          const age = elapsed - signalStarted;
          const signaling = age < 1.12;
          const targetZ = signaling ? official.position.z : THREE.MathUtils.clamp(ballPosition.z * 0.55, -2.7, 2.7);
          const step = THREE.MathUtils.clamp(targetZ - official.position.z, -delta * 1.45, delta * 1.45);
          official.position.z += step;
          globalPhysics.updateCylinderPos('referee', official.position.x, official.position.z);
          const [squareX, squareZ] = SQUARE_CONFIGS[signalSquare].center;
          const focusX = signaling && signal !== 'end' ? squareX : ballPosition.x;
          const focusZ = signaling && signal !== 'end' ? squareZ : ballPosition.z;
          const yaw = Math.atan2(focusX - official.position.x, focusZ - official.position.z);
          official.rotation.y = lerpAngle(official.rotation.y, yaw, Math.min(1, delta * 7));
          applyFootworkGait(official, Math.abs(step) / Math.max(delta, 0.001), elapsed);

          const head = official.getObjectByName('headMesh');
          if (head) {
            head.rotation.y = THREE.MathUtils.clamp(lerpAngle(official.rotation.y, yaw, 1) - official.rotation.y, -0.5, 0.5);
            head.rotation.x = THREE.MathUtils.clamp((0.9 - ballPosition.y) * 0.15, -0.25, 0.25);
          }
          const pointing = official.getObjectByName('leftArm');
          const whistle = official.getObjectByName('rightArm');
          const weight = THREE.MathUtils.smoothstep(age, 0, 0.16) * (1 - THREE.MathUtils.smoothstep(age, 0.8, 1.12));
          if (pointing) {
            pointing.rotation.z = 0.14 + weight * (signal === 'replay' ? 0.5 : 0.13);
            if (signaling) pointing.rotation.x = -0.25 - weight * (signal === 'in' ? 0.52 : signal === 'out' || signal === 'end' ? 2.15 : 1.15);
          }
          if (whistle) {
            const blowsWhistle = signaling && (signal === 'out' || signal === 'end' || signal === 'replay');
            whistle.rotation.z = -0.18 - (blowsWhistle ? weight * 0.48 : 0);
            if (blowsWhistle) whistle.rotation.x = -0.25 - weight * 2.15;
          }
        }

        spectatorsRef.current.forEach((spectator, index) => {
          const head = spectator.getObjectByName('headMesh');
          const left = spectator.getObjectByName('leftArm');
          const right = spectator.getObjectByName('rightArm');
          const phase = elapsed * 1.6 + index * 2.4;
          if (head && ballPosition) {
            const yaw = Math.atan2(ballPosition.x - spectator.position.x, ballPosition.z - spectator.position.z);
            const turn = lerpAngle(spectator.rotation.y, yaw, 1) - spectator.rotation.y;
            head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, THREE.MathUtils.clamp(turn, -0.75, 0.75), Math.min(1, delta * 5));
            head.rotation.x = -0.025 + Math.sin(phase * 0.53) * 0.045;
          }
          if (!left || !right) return;
          const age = elapsed - crowdStarted - (index % 7) * 0.105;
          const reaction = currentMode === 'match' && index % 5 !== 4
            ? THREE.MathUtils.smoothstep(age, 0, 0.19) * (1 - THREE.MathUtils.smoothstep(age, 0.62, 1.18))
            : 0;
          left.rotation.set(-0.1 + 0.024 * Math.sin(phase), 0, 0.09);
          right.rotation.set(-0.1 - 0.024 * Math.sin(phase), 0, -0.09);
          if (index % 3 === 0) {
            right.rotation.x -= reaction * 2.48;
            right.rotation.z -= reaction * 0.37;
          } else if (index % 3 === 1) {
            const clap = reaction * (0.68 + 0.32 * Math.cos(age * 18));
            left.rotation.x -= reaction * 1.04;
            right.rotation.x -= reaction * 1.04;
            left.rotation.y = -clap * 0.65;
            right.rotation.y = clap * 0.65;
          } else if (head) {
            head.rotation.x -= reaction * 0.18;
          }
        });
      }

      // 8. Dynamic Street Traffic & High-Quality Venue Arrival Animation (with solid exploration colliders & door-safe passenger)
      streetVehiclesRef.current.forEach((veh, vehIdx) => {
          const actualSpeed = veh.speed;
          const vehicleX = veh.mesh.position.x;
          const vehicleZ = veh.mesh.position.z;
          const [ex, , ez] = localPlayerPos.current;
          const blockers = streetVehiclesRef.current.filter((item) => item !== veh)
            .map(({ mesh }) => ({ x: mesh.position.x, z: mesh.position.z, halfX: 2.24, halfZ: 1.10 }));
          if (currentMode === 'exploration') {
            blockers.push({ x: ex, z: ez, halfX: 0.45, halfZ: 0.45 });
            for (const npc of npcsRef.current) blockers.push({x:npc.position.x,z:npc.position.z,halfX:.45,halfZ:.45});
          }
          const movement = veh.direction * actualSpeed * delta;
          const clear = trafficTravel({ x: vehicleX, z: vehicleZ, halfX: 2.24, halfZ: 1.10 },
            vehicleX + movement, veh.laneZ, blockers);
          veh.mesh.position.x += movement * clear;
          const spawnIsClear=(x:number)=>blockers.every((item)=>Math.abs(item.x-x)>item.halfX+2.38 || Math.abs(item.z-veh.laneZ)>item.halfZ+1.24);
          if (veh.direction === 1 && veh.mesh.position.x > 38 && spawnIsClear(-38)) {
            veh.mesh.position.x = -38;
          } else if (veh.direction === -1 && veh.mesh.position.x < -38 && spawnIsClear(38)) {
            veh.mesh.position.x = 38;
          }

          veh.mesh.rotation.y = veh.direction === 1 ? Math.PI / 2 : -Math.PI / 2;
          veh.mesh.position.z = veh.laneZ;
          if (veh.carBody) {
            veh.carBody.position.y = Math.sin(elapsed * 16 + vehIdx * 2) * 0.01;
          }

          // Dynamic AABB collider so explorer cannot clip through cruising street cars
          globalPhysics.addBox({
            id: `street-car-${vehIdx}`,
            type: 'car',
            minX: veh.mesh.position.x - 2.25,
            maxX: veh.mesh.position.x + 2.25,
            minZ: veh.mesh.position.z - 1.15,
            maxZ: veh.mesh.position.z + 1.15,
            minY: 0,
            maxY: 2.2,
          });

          const spinDelta = (actualSpeed / 0.38) * delta;
          ['frontWheelLeft', 'frontWheelRight', 'rearWheelLeft', 'rearWheelRight'].forEach((wn) => {
            const wGroup = veh.mesh.getObjectByName(wn);
            const spin = wGroup?.getObjectByName('spinWheel');
            if (spin) spin.rotation.x += spinDelta;
          });
      });

      if (currentMode === 'preview') {
        for (const player of playerMeshesRef.current.values()) {
          for (const label of ['playerTagBadge', 'youGroundAura', 'youPointerArrow']) {
            const element = player.getObjectByName(label);
            if (element) element.visible = false;
          }
        }
      }
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      disposeCampus(court);
      const campus = scene.getObjectByName('campusExterior');
      if (campus instanceof THREE.Group) disposeCampus(campus);
      if(ballMeshRef.current?.material instanceof THREE.MeshStandardMaterial) {
        ballMeshRef.current.material.map?.dispose();
        ballMeshRef.current.material.bumpMap?.dispose();
        ballMeshRef.current.material.dispose();
        ballMeshRef.current.geometry.dispose();
      }
      if(captureFrameRef)captureFrameRef.current=null;
      marker.geometry.dispose();
      marker.material.dispose();
      collectibles.forEach(({mesh})=>{mesh.geometry.dispose();mesh.material.dispose();});
      renderer.dispose();
      rain?.geometry.dispose();
      rain?.material.dispose();
      if (mountNode.contains(renderer.domElement)) {
        mountNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update mode visibility
  useEffect(() => {
    if (explorerMeshRef.current) {
      explorerMeshRef.current.visible = mode === 'exploration';
    }
    playerMeshesRef.current.forEach((grp) => {
      grp.visible = mode !== 'exploration';
    });
    if (refereeMeshRef.current) {
      refereeMeshRef.current.visible = mode !== 'exploration';
    }
    spectatorsRef.current.forEach((spec) => {
      spec.visible = mode !== 'exploration';
    });
    npcsRef.current.forEach((npc) => {
      npc.visible = mode === 'exploration';
    });
    if (ballMeshRef.current) {
      ballMeshRef.current.visible = true;
    }
    if (ballShadowMeshRef.current) {
      ballShadowMeshRef.current.visible = true;
    }
    if (cameraRef.current) {
      updateCameraPosition(
        cameraRef.current,
        cameraView,
        mode,
        localPlayerPos.current,
        venueType,
        matchZoomRef.current
      );
    }
  }, [mode, cameraView, venueType]);

  // Rebuild explorer avatar whenever character customization updates
  useEffect(() => {
    if (!sceneRef.current) return;
    if (explorerMeshRef.current) {
      sceneRef.current.remove(explorerMeshRef.current);
    }
    const explorer = buildCharacterMesh(CHARACTERS[0], customization);
    explorer.position.set(...localPlayerPos.current);
    explorer.visible = mode === 'exploration';
    sceneRef.current.add(explorer);
    explorerMeshRef.current = explorer;
  }, [customization, mode]);

  // Trigger athletic palm-to-ball strike animation on every hit/serve
  useEffect(() => {
    const hitterId = ballState.lastHitterId;
    const hitCount = ballState.hitCount ?? 0;
    const rank = ballState.lastHitterSquare;
    if (mode !== 'match' || !hitterId || !rank) {
      lastHitterWatchedRef.current = null;
      lastHitCountWatchedRef.current = 0;
      if (mode === 'match') swingAnimsRef.current.clear();
      return;
    }
    const hitChanged =
      (hitCount > 0 && hitCount !== lastHitCountWatchedRef.current) ||
      (hitterId && hitterId !== lastHitterWatchedRef.current);

    if (hitterId && hitChanged) {
      lastHitterWatchedRef.current = hitterId;
      lastHitCountWatchedRef.current = hitCount;

      const { x, y, z } = ballState.lastContact ?? ballState;
      const isDiving = hitterId === humanPlayerIdRef.current &&
        (keysPressed.current.f || readGamepad()?.buttons[5]?.pressed);
      swingAnimsRef.current.set(hitterId, {
        elapsed: 0,
        rank,
        contactPos: new THREE.Vector3(x, y, z),
        plantLimit: isDiving ? DIVE_STEP : STRIKE_STEP,
      });
    }
  }, [ballState.hitCount, ballState.lastHitterId, ballState.lastHitterSquare, ballState.lastContact, mode]);

  // Raycast hover reticle and click targets
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const gesture = orbitGesture.current;
    if (gesture && gesture.id === e.pointerId && !isDraggingRef.current) {
      if (Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) < 5) return;
      isDraggingRef.current = true;
    }
    if (isDraggingRef.current) {
      const dx = e.clientX - lastPointerPosRef.current.x;
      const dy = e.clientY - lastPointerPosRef.current.y;
      orbitYawRef.current -= dx * 0.007;
      orbitPitchRef.current = Math.max(-0.35, Math.min(1.15, orbitPitchRef.current + dy * 0.007));
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    if (mode === 'match' && isHumanTurn && hoverIndicatorRef.current) {
      const groundHit = intersects.find(
        (hit) => hit.object.name === 'asphaltGround' || hit.object.name.startsWith('courtSquare-')
      );
      if (groundHit) {
        hoverIndicatorRef.current.position.x = groundHit.point.x;
        hoverIndicatorRef.current.position.z = groundHit.point.z;
        hoverIndicatorRef.current.position.y = 0.04;
        const mat = hoverIndicatorRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.75;
      } else {
        const mat = hoverIndicatorRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0;
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !e.isPrimary) return;
    if (mode === 'exploration' && (e.button === 0 || e.button === 2)) {
      orbitGesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      isDraggingRef.current = e.button === 2;
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    activatePointer(e);
  };

  const activatePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    // 1. Match Mode: striking the ball into target square
    const trainingTarget = currentDrillMarker.current;
    if (clickDrillMarkerToMove && trainingTarget && e.button === 0 && intersects.some(({point,object})=>
      object.name.startsWith('courtSquare-') && Math.hypot(point.x-trainingTarget.x,point.z-trainingTarget.z)<.9)) {
      followDrillMarker.current=true;
      return;
    }
    if (mode === 'match' && isHumanTurn && e.button === 0) {
      for (const hit of intersects) {
        const obj = hit.object;
        if (obj.name && obj.name.startsWith('courtSquare-')) {
          const sqId = parseInt(obj.name.split('-')[1], 10) as SquareId;
          if (highlightedSquares.includes(sqId)) {
            onSelectTargetSquare(sqId, { x: hit.point.x, z: hit.point.z }, e.shiftKey);
            if (hoverIndicatorRef.current) {
              (hoverIndicatorRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
            }
            return;
          }
        }
      }
    }

    // 2. Exploration Mode: click people or click ground to walk
    if (mode === 'exploration' && e.button === 0) {
      if (seatedRef.current || lessonVisible.current) return;
      // Check if user clicked an NPC, student at desk, or teacher
      for (const hit of intersects) {
        let cur: THREE.Object3D | null = hit.object;
        while (cur && cur !== sceneRef.current) {
          if (cur.userData.studyDesk && Math.hypot(localPlayerPos.current[0]-STUDY_SEAT.x,localPlayerPos.current[2]-STUDY_SEAT.z)<2.3) {
            occupyDesk(true);
            return;
          }
          if (typeof cur.userData.bookIndex==='number' && Math.abs(localPlayerPos.current[1] + 1 - hit.point.y) < 1.3 && Math.hypot(localPlayerPos.current[0]-hit.point.x,localPlayerPos.current[2]-hit.point.z)<3) {
            setBookIndex(cur.userData.bookIndex);
            return;
          }
          if (cur.userData.campaignNpc) {
            soundFX.playClick();
            onInteractNPCRef.current?.(cur.userData.campaignNpc);
            return;
          }
          if ((cur as any).userData?.character) {
            const char = (cur as any).userData.character as CharacterDef;
            soundFX.playClick();
            if (onInteractNPCRef.current) {
              onInteractNPCRef.current({
                id: `npc-${char.id}`,
                name: char.name,
                role: char.nickname,
                characterId: char.id,
                position: [cur.position.x, cur.position.y, cur.position.z],
                rotationY: 0,
                dialogueLines: [
                  `"${char.quote}"`,
                  `My schoolyard specialty is ${char.qualities?.[0] || 'court spin'}. Let's see your reflexes!`,
                  `Challenge me to a Four Square match anytime you're ready!`,
                ],
                tips: `Counter deep hits by staying light on your toes near the baseline!`,
                isOpponent: typeof cur.userData.studyIndex !== 'number',
              });
            }
            return;
          }
          if ((cur as any).userData?.isTeacher) {
            soundFX.playSchoolPAChime();
            setIsClassroomOpen(true);
            return;
          }
          cur = cur.parent;
        }
      }

      const groundHit = intersects.find(
        (h) =>
          h.object.name === 'asphaltGround' ||
          h.object.name.startsWith('courtSquare-') ||
          h.object.name === 'schoolFloor' ||
          h.object.name === 'classroomFloor'
      );
      if (groundHit) {
        targetMovePosRef.current = { x: groundHit.point.x, z: groundHit.point.z };
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!orbitGesture.current || orbitGesture.current.id !== e.pointerId) return;
    const clicked = !isDraggingRef.current && e.button === 0 && e.type === 'pointerup';
    orbitGesture.current = undefined;
    isDraggingRef.current = false;
    if (clicked) activatePointer(e);
  };

  const handlePointerLeave = () => {
    if (!orbitGesture.current) isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (mode === 'exploration') {
      orbitDistanceRef.current = Math.max(4.0, Math.min(26.0, orbitDistanceRef.current + e.deltaY * 0.015));
    } else if (mode === 'match') {
      matchZoomRef.current = Math.max(0.75, Math.min(1.55, matchZoomRef.current + e.deltaY * 0.0008));
    }
  };

  // Check proximity to interactive stations on the schoolyard
  const checkProximityPrompts = (pos: [number, number, number]) => {
    const [px, py, pz] = pos;
    if (Math.hypot(px - SCHOOL_LIFT.x, pz - SCHOOL_LIFT.z) < .99) {
      setInteractionPrompt({text: py > 1 ? 'Elevator to ground floor [E]' : 'Elevator to second floor [E]', action: () => {
        if (liftJourney.current) return;
        liftJourney.current = {from: py, to: py > 1 ? 0 : SCHOOL_UPPER.floor, elapsed: 0};
        targetMovePosRef.current = null;
        setInteractionPrompt(null);
      }});
      return;
    }
    if (py > 1) {
      setInteractionPrompt(null);
      return;
    }
    const pickup = venue && collection.current.onCollectItem && campusCollectibles(venue.id).find((item)=>!collection.current.collectedItems?.includes(item.id) && Math.hypot(px-item.x,pz-item.z)<1.5);
    if (pickup) {
      setInteractionPrompt({text:'Collect '+pickup.name+' [E]', action:()=>{collection.current.onCollectItem?.(pickup.id,pickup.name);setInteractionPrompt(null);}});
      return;
    }
    if (Math.hypot(px-STUDY_SEAT.x,pz-STUDY_SEAT.z)<1.5) {
      setInteractionPrompt({text:'Sit at the study desk [E]',action:()=>occupyDesk(true)});
      return;
    }
    if (Math.hypot(px-LIBRARY_READ_SPOT.x,pz-LIBRARY_READ_SPOT.z)<1.7) {
      setInteractionPrompt({text:'Read a book [E]',action:()=>setBookIndex(0)});
      return;
    }

    // 1. Check Four Square Court center (behind the school)
    const dCourt = Math.hypot(px - 0, pz - 0);
    if (dCourt < 2.5) {
      setInteractionPrompt({
        text: 'Press [E] or Click to Play Four Square Match!',
        action: () => onInteractCourtRef.current && onInteractCourtRef.current(),
      });
      return;
    }

    // 2. Check Red Funnel Ball
    const dFunnel = Math.hypot(px - FUNNEL_POSITION.x, pz - FUNNEL_POSITION.z);
    if (dFunnel < 2.5) {
      setInteractionPrompt({
        text: 'Press [E] or Click to Toss Ball in Red Funnel!',
        action: () => onInteractFunnelBallRef.current && onInteractFunnelBallRef.current(),
      });
      return;
    }

    // 3. Check Teacher Coach Leo at the Chalkboard in Room 101
    const dTeacher = Math.hypot(px - (-11.8), pz - (-10.4));
    if (dTeacher < 3.2) {
      setInteractionPrompt({
        text: 'Press [E] or Click to Learn Four Square Theory from Coach Leo 🎓',
        action: () => setIsClassroomOpen(true),
      });
      return;
    }

    // 4. Check Seated Students in Classroom 101
    const classDesks = [
      { name: 'Toby "Patch"', char: CHARACTERS[0], x: -12.2, z: -13.6 },
      { name: 'Blocky', char: CHARACTERS[1], x: -15.8, z: -13.6 },
      { name: 'Skater Roxy', char: CHARACTERS[2], x: -19.4, z: -13.6 },
      { name: 'Gloop Slime', char: CHARACTERS[4], x: -12.2, z: -17.4 },
      { name: 'Nova', char: CHARACTERS[5], x: -15.8, z: -17.4 },
      { name: 'Ren', char: CHARACTERS[6], x: -19.4, z: -17.4 },
    ];
    for (const desk of classDesks) {
      const dDesk = Math.hypot(px - desk.x, pz - desk.z);
      if (dDesk < 2.2) {
        setInteractionPrompt({
          text: `Press [E] or Click to Talk to ${desk.name} at Desk!`,
          action: () => {
            soundFX.playClick();
            if (onInteractNPCRef.current) {
              onInteractNPCRef.current({
                id: `npc-${desk.char.id}`,
                name: desk.char.name,
                role: `${desk.char.nickname} (Classmate)`,
                characterId: desk.char.id,
                position: [desk.x, 0, desk.z],
                rotationY: 0,
                dialogueLines: [
                  `"${desk.char.quote}"`,
                  `I'm studying the 45-degree corner trajectory for recess!`,
                  'I’m finishing my notes before recess.',
                ],
                tips: `Watch out for high topspin bounces into the corners!`,
                isOpponent: false,
              });
            }
          },
        });
        return;
      }
    }

    // 5. Check Hallway Students
    const dMaya = Math.hypot(px - 3.8, pz - (-17.5));
    if (dMaya < 2.2) {
      const mayaChar = CHARACTERS[3] || CHARACTERS[1];
      setInteractionPrompt({
        text: `Press [E] or Click to Talk to ${mayaChar.name} in Hallway!`,
        action: () => {
          soundFX.playClick();
          if (onInteractNPCRef.current) {
            onInteractNPCRef.current({
              id: `npc-${mayaChar.id}`,
              name: mayaChar.name,
              role: 'Hallway Ace',
              characterId: mayaChar.id,
              position: [3.8, 0, -17.5],
              rotationY: -Math.PI / 2,
              dialogueLines: [
                'Hey! I just got this Voit 8.5" ball from the equipment locker.',
                'Let’s head out the back doors to the playground and play a match!',
              ],
              tips: 'Keep your palm open on underhand strikes to maximize rebound control.',
              isOpponent: true,
            });
          }
        },
      });
      return;
    }

    // 6. Check School Rear Doors (z = -8.0) or Front Main Entrance Doors (z = -22.0)
    const dSchoolRear = Math.hypot(px - 0, pz - (-8.0));
    const dSchoolFront = Math.hypot(px - 0, pz - (-22.0));
    if (dSchoolRear < 2.8 || dSchoolFront < 2.8) {
      setInteractionPrompt({
        text: 'Enter classroom [E]',
        action: () => setIsClassroomOpen(true),
      });
      return;
    }



    // 4. Check NPCs
    const currentVenue = venueRef.current;
    if (currentVenue && currentVenue.npcs) {
      for (const npc of currentVenue.npcs) {
        const [nx, , nz] = npc.position;
        const dNpc = Math.hypot(px - nx, pz - nz);
        if (dNpc < 2.2) {
          setInteractionPrompt({
            text: `Press [E] or Click to Talk to ${npc.name} (${npc.role})`,
            action: () => onInteractNPCRef.current && onInteractNPCRef.current(npc),
          });
          return;
        }
      }
    }

    setInteractionPrompt(null);
  };

  // Update ball position and ground collision shadow (zero floating in mid-air)
  useEffect(() => {
    if (mode === 'preview') return;
    if (ballMeshRef.current && ballShadowMeshRef.current) {
      if (mode === 'exploration') {
        ballMeshRef.current.position.set(3.4,.235,2.4);
        ballShadowMeshRef.current.position.set(3.4,.02,2.4);
        return;
      }
      if (ballState.isServing && !ballState.isLive) {
        const { x, y, z } = serveContactPosition(1);
        ballMeshRef.current.position.set(x, y, z);
        ballShadowMeshRef.current.position.set(x, 0.02, z);
        ballShadowMeshRef.current.scale.set(0.7, 0.7, 0.7);
        const shadowMat = ballShadowMeshRef.current.material as THREE.MeshBasicMaterial;
        shadowMat.opacity = 0.45;
      } else {
        const safeY = Math.max(0.22, ballState.y);
        ballMeshRef.current.position.set(ballState.x, safeY, ballState.z);
        ballShadowMeshRef.current.position.set(ballState.x, 0.02, ballState.z);

        const shadowScale = Math.max(0.3, 1.0 - ballState.y * 0.18);
        ballShadowMeshRef.current.scale.set(shadowScale, shadowScale, shadowScale);
        const shadowMat = ballShadowMeshRef.current.material as THREE.MeshBasicMaterial;
        shadowMat.opacity = Math.max(0.1, 0.55 - ballState.y * 0.1);

        if (ballState.y <= 0.26 && ballState.isLive && sceneRef.current) {
          spawnDustPuff(sceneRef.current, ballState.x, ballState.z, dustPuffsRef);
        }
      }
    }
  }, [ballState.x, ballState.y, ballState.z, ballState.isLive, ballState.isServing, mode]);

  // Update 3D players on court & refresh controlled-player clarity visuals
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const customSig = customization ? JSON.stringify(customization) : '';

    playerMeshesRef.current.forEach((grp, id) => {
      if (!players.find((p) => p.id === id)) {
        scene.remove(grp);
        playerMeshesRef.current.delete(id);
        playerCourtPoseRef.current.delete(id);
        globalPhysics.removeCylinder(id);
      }
    });

    players.forEach((player) => {
      let grp = playerMeshesRef.current.get(player.id);
      const isCustomStale = player.isHuman && grp?.userData?.customSig !== customSig;
      if (grp && (grp.userData.characterId !== player.characterId || isCustomStale)) {
        scene.remove(grp);
        playerMeshesRef.current.delete(player.id);
        playerCourtPoseRef.current.delete(player.id);
        grp = undefined;
      }
      if (!grp) {
        grp = createPlayerModel(player, player.isHuman ? customization : undefined, humanPlayerId);
        grp.userData.customSig = customSig;
        scene.add(grp);
        playerMeshesRef.current.set(player.id, grp);
      }

      grp.visible = mode !== 'exploration';

      if (player.rank) {
        const cfg = SQUARE_CONFIGS[player.rank];
        const [targetX, , targetZ] = cfg.defaultPlayerPos;
        const prevPose = playerCourtPoseRef.current.get(player.id);
        const rankChanged = !prevPose || prevPose.rank !== player.rank;

        // Only snap position when newly placed, rotated squares, or reset for serve; live footwork keeps smooth court steps!
        if (rankChanged || (ballState.isServing && !ballState.isLive)) {
          grp.position.set(targetX, 0.035, targetZ);
          grp.rotation.set(0, Math.atan2(-targetX, -targetZ), 0);
          playerCourtPoseRef.current.set(player.id, {
            x: targetX,
            z: targetZ,
            yaw: grp.rotation.y,
            rank: player.rank,
          });
          globalPhysics.updateCylinderPos(player.id, targetX, targetZ);
        }

        const isHuman = player.id === humanPlayerId || player.isHuman;
        const badgeKey = `${player.rank}-${isHuman ? 1 : 0}`;
        if (grp.userData.badgeKey !== badgeKey) {
          redrawPlayerTagSprite(grp, player, isHuman);
          grp.userData.badgeKey = badgeKey;
        }

        // Turn indicator ring
        const ring = grp.getObjectByName('turnRing') as THREE.Mesh;
        if (ring) {
          const isTurn = player.id === activeTurnPlayerId;
          const isServer = player.id === servingPlayerId;
          ring.visible = isTurn || isServer;
          const ringMat = ring.material as THREE.MeshBasicMaterial;
          ringMat.color.set(isServer ? 0xf59e0b : isHuman ? 0x22d3ee : 0xffffff);
        }

        // Crown for Rank 1 King
        const crown = grp.getObjectByName('crownMesh');
        if (crown) {
          crown.visible = player.rank === 1;
        }

        // Human controlled player indicators: always-on cyan ground aura & floating YOU pointer
        const youGroundAura = grp.getObjectByName('youGroundAura');
        if (youGroundAura) {
          youGroundAura.visible = isHuman;
        }
        const youPointerArrow = grp.getObjectByName('youPointerArrow');
        if (youPointerArrow) {
          youPointerArrow.visible = isHuman;
        }
      }
    });
  }, [players, activeTurnPlayerId, servingPlayerId, humanPlayerId, mode, customization, ballState.isServing, ballState.isLive]);

  // Update square highlights
  useEffect(() => {
    squareHighlightsRef.current.forEach((mesh, sqId) => {
      mesh.visible = highlightedSquares.includes(sqId);
    });
  }, [highlightedSquares]);

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onWheel={handleWheel}
      className="absolute inset-0 w-full h-full cursor-default overflow-hidden touch-none select-none"
    >
      {/* Dedicated WebGL Mount Canvas Node (Leaf node with zero React children) */}
      <div data-game-canvas ref={canvasMountRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {mode === 'match' && isMatchIntroActive && (
        <div className="field-panel absolute left-1/2 top-6 z-40 flex -translate-x-1/2 items-center gap-3 px-3 py-2 text-sm">
          <strong>{venue?.name ?? 'Four Square'}</strong><span>{introCountdown}s</span>
          <button className="league-button" onClick={skipIntro}>Skip</button>
        </div>
      )}
      {/* 5-Second Turn Shot Clock (Strict countdown per hit) */}
      {mode === 'match' && (onShotClockExpired || serveDeadline) && !matchFinished && ballState.isServing && !isMatchIntroActive && activeTurnPlayerId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center animate-in fade-in duration-200">
          <div
            className={`px-4 py-1.5 rounded-2xl border-2 backdrop-blur-md shadow-2xl flex items-center gap-3 transition-colors ${
              shotClockSeconds <= 2.0
                ? 'bg-rose-950/90 border-rose-500 text-rose-300 animate-pulse'
                : shotClockSeconds <= 3.5
                ? 'bg-amber-950/90 border-amber-400 text-amber-300'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 font-mono text-xs uppercase font-bold">
              <Timer className="w-4 h-4 text-amber-400" />
              <span>Serve clock</span>
            </div>
            <div className="font-mono text-base font-black tracking-wider text-amber-400">
              {shotClockSeconds.toFixed(1)}s
            </div>
          </div>
        </div>
      )}

      {paAnnouncement && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 z-40 w-max max-w-[84vw] -translate-x-1/2">
          <div className="field-panel flex items-center gap-2 px-3 py-2 text-xs text-white">
            <Volume2 size={15} className="shrink-0 text-amber-200" />
            <span>{paAnnouncement}</span>
          </div>
        </div>
      )}

      {/* Classroom Interior Modal */}
      <ClassroomModal
        isOpen={isClassroomOpen}
        onClose={() => setIsClassroomOpen(false)}
        onRewardCoins={onRewardCoins}
        passedLessons={completedLessons}
        onPassLesson={onPassLesson}
      />
      {seated && <button className="league-button absolute bottom-20 left-1/2 z-40 -translate-x-1/2 bg-neutral-950" onClick={()=>setIsClassroomOpen(true)}>Open workbook</button>}
      {bookIndex!==undefined && <SchoolBookReader key={bookIndex} index={bookIndex} onClose={()=>setBookIndex(undefined)}/>}
    </div>
  );
};

// -------------------------------------------------------------
// Helper: Update Camera Position with Wide Overhead Gameplay
// -------------------------------------------------------------
function updateCameraPosition(
  camera: THREE.PerspectiveCamera,
  view: 'first_person' | 'third_person' | 'isometric' | 'top_down' | 'action',
  mode: 'match' | 'exploration' | 'preview',
  playerPos: [number, number, number],
  venueType: 'outdoor' | 'indoor' = 'outdoor',
  zoomFactor = 1.0
) {
  if (mode === 'preview') {
    camera.position.set(2.4, 7.8, 10.2);
    camera.lookAt(0.6, 0.4, 0.0);
    return;
  }

  if (mode === 'match') {
    const zf = zoomFactor;
    if (view === 'first_person') {
      // Corner Baseline Cam outside court behind Square 4/baseline so players never occlude viewport
      camera.position.set(-7.2 * zf, 7.6 * zf, 7.2 * zf);
      camera.lookAt(0, 0.3, 0);
      return;
    }
    if (view === 'top_down') {
      camera.position.set(0, (venueType === 'indoor' ? 20.0 : 27.0) * zf, 0.2);
      camera.lookAt(0, 0, 0);
      return;
    }
    if (view === 'action') {
      camera.position.set(
        (venueType === 'indoor' ? 8.2 : 10.5) * zf,
        (venueType === 'indoor' ? 7.8 : 9.8) * zf,
        (venueType === 'indoor' ? 13.5 : 17.5) * zf
      );
      camera.lookAt(0, 0.3, -0.5);
      return;
    }
    if (view === 'isometric') {
      camera.position.set(
        (venueType === 'indoor' ? 11.5 : 15.5) * zf,
        (venueType === 'indoor' ? 13.0 : 18.0) * zf,
        (venueType === 'indoor' ? 15.5 : 21.0) * zf
      );
      camera.lookAt(0, 0.2, -1.0);
      return;
    }
    // Wide Broadcast (Full Court Default): all 4 squares, all 4 players, YOU aura, and backyard school visible
    if (venueType === 'indoor') {
      camera.position.set(0, 12.2 * zf, 16.8 * zf);
      camera.lookAt(0, 0.2, -0.5);
    } else {
      camera.position.set(0, 17.8 * zf, 25.0 * zf);
      camera.lookAt(0, 0.2, -2.5);
    }
    return;
  }


  // Exploration Mode
  if (view === 'first_person') {
    camera.position.set(playerPos[0], 1.55, playerPos[2]);
    camera.lookAt(playerPos[0], 1.55, playerPos[2] - 10);
    return;
  }
  if (view === 'third_person') {
    camera.position.set(playerPos[0], 3.8, playerPos[2] + 6.2);
    camera.lookAt(playerPos[0], 1.2, playerPos[2]);
    return;
  }
  if (view === 'top_down') {
    camera.position.set(playerPos[0], 16.0, playerPos[2] + 0.1);
    camera.lookAt(playerPos[0], 0, playerPos[2]);
    return;
  }
  if (view === 'action') {
    camera.position.set(playerPos[0] + 3.2, 2.2, playerPos[2] + 4.2);
    camera.lookAt(playerPos[0], 0.8, playerPos[2]);
    return;
  }

  // Isometric view
  camera.position.set(playerPos[0] + 6.8, 8.4, playerPos[2] + 8.6);
  camera.lookAt(playerPos[0], 0.8, playerPos[2]);
}

// -------------------------------------------------------------
// Register Static Object Colliders in Physics Engine
// -------------------------------------------------------------
function setupStaticColliders(id?: VenueDef['id']) {
  const layout = getCampusLayout(id);
  globalPhysics.addCylinder({ id: 'funnel-ball-pole', type: 'pole', ...FUNNEL_POSITION, radius: 0.45, height: 3.1, isStatic: true });
  function addWall(id: string, x: number, z: number, width: number, depth: number, height: number) {
    globalPhysics.addBox({ id, type: 'wall', minX: x - width / 2, maxX: x + width / 2,
      minZ: z - depth / 2, maxZ: z + depth / 2, minY: 0, maxY: height });
  }
  campusWalls(layout).forEach((wall, index) => addWall(`campus-wall-${index}`, wall.x, wall.z, wall.width, wall.depth, wall.height));
  campusPerimeter().forEach((wall, index) => addWall(`perimeter-${index}`, wall.x, wall.z, wall.width, wall.depth, 1.38));
  campusPlayground(id).equipment.forEach((item, index) => addWall(`playground-${index}`, item.x, item.z, item.width, item.depth, item.height));
  campusYardFence(layout).forEach(({ x, z, length, side }, index) =>
    addWall('yard-'+index, x, z, side ? .34 : length, side ? length : .34, 1.8));
  for (const [index, [x, z]] of campusTrees(layout).entries()) {
    globalPhysics.addCylinder({ id: 'campus-tree-' + index, type: 'pole', x, z, radius: 0.31, height: 4, isStatic: true });
  }

  // Interior Hallway Partition Walls (with open Classroom 101 double doorway at z in [-17.6, -12.6])
  globalPhysics.addBox({
    id: 'school-hallway-west-front',
    type: 'wall',
    minX: -8.0,
    maxX: -7.2,
    minZ: -21.6,
    maxZ: -17.6,
    minY: 0,
    maxY: 6.0,
  });
  globalPhysics.addBox({
    id: 'school-hallway-west-rear',
    type: 'wall',
    minX: -8.0,
    maxX: -7.2,
    minZ: -12.6,
    maxZ: -8.4,
    minY: 0,
    maxY: 6.0,
  });
  for (const [i, [start,end]] of [[-21.6,EAST_OPENING.start],[EAST_OPENING.end,-8.4]].entries()) {
    addWall('school-east-' + i, 7.6, (start + end)/2, 0.8, end-start, 5.4);
  }

  // 4. Interior Lockers along front west hallway wall
  globalPhysics.addBox({
    id: 'school-interior-lockers',
    type: 'wall',
    minX: -7.2,
    maxX: -6.4,
    minZ: -21.2,
    maxZ: -17.8,
    minY: 0,
    maxY: 3.5,
  });

  // 5. Interior Trophy Showcase along east hallway wall
  globalPhysics.addBox({
    id: 'school-trophy-case',
    type: 'wall',
    minX: 6.4,
    maxX: 7.2,
    minZ: -21,
    maxZ: -18.1,
    minY: 0,
    maxY: 3.5,
  });

}

// -------------------------------------------------------------
// Helper: Build Schoolyard & Enterable School Interior
// -------------------------------------------------------------
function buildVenueEnvironment(
  scene: THREE.Scene,
  venue: VenueDef | undefined,
  refereeMeshRef: React.MutableRefObject<THREE.Group | null>,
  spectatorsRef: React.MutableRefObject<THREE.Group[]>,
  npcsRef: React.MutableRefObject<THREE.Group[]>,
  streetVehiclesRef?: React.MutableRefObject<any[]>,
  venueType: 'outdoor' | 'indoor' = 'outdoor',
  gymDoorsRef?: React.MutableRefObject<{ left: THREE.Group; right: THREE.Group } | null>,
  includeRooms = false,
) {
  const isIndoor = venueType === 'indoor';

  // =============================================================
  // INDOOR GYMNASIUM ARENA (BULLDOG ARENA FIELDHOUSE)
  // =============================================================
  if (isIndoor) {
    // 1. Polished Hardwood Maple Ground
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    groundGeo.rotateX(-Math.PI / 2);
    const groundTex = createSafeCanvasTexture(512, 512, (ctx) => {
      const boards = ['#a77d56', '#b68a61', '#bc946e', '#ae825c', '#ad8561', '#b5916c'];
      for (let y = 0; y < 512; y += 16) {
        const row = y / 16;
        for (let x = -128; x < 512; x += 128) {
          const offset = x + (row % 4) * 29;
          ctx.fillStyle = boards[((row * 11 + x / 128 + 7) % boards.length)];
          ctx.fillRect(offset, y, 128, 16);
          ctx.fillStyle = '#553d2f55';
          ctx.fillRect(offset, y, 128, 1);
          ctx.fillRect(offset, y, 1, 16);
          for (let grain = 1; grain <= 5; grain++) {
            ctx.fillStyle = grain % 2 ? '#ddbb8c32' : '#63473125';
            ctx.fillRect(offset + (row * grain * 17 % 39), y + grain * 2.4, 62 + (row * 3 + grain * 9) % 23, .65);
          }
        }
      }
    });
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(5, 5);

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.58,
      metalness: 0.025,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.name = 'indoorHardwoodGround';
    ground.receiveShadow = true;
    scene.add(ground);

    const gymGroup = new THREE.Group();
    const gymWallMat = new THREE.MeshStandardMaterial({ color: '#303631', roughness: 0.85 });
    const gymPadMat = new THREE.MeshStandardMaterial({ color: '#465e55', roughness: 0.65 });

    // North Wall (z = -14.5)
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(40, 12, 1.0), gymWallMat);
    northWall.position.set(0, 6.0, -14.5);
    northWall.receiveShadow = true;
    gymGroup.add(northWall);

    const northPad = new THREE.Mesh(new THREE.BoxGeometry(36, 2.2, 0.3), gymPadMat);
    northPad.position.set(0, 1.1, -13.9);
    gymGroup.add(northPad);

    // Giant Electronic Scoreboard on North Wall
    const scoreCanvas = document.createElement('canvas');
    scoreCanvas.width = 512;
    scoreCanvas.height = 160;
    const sctx = scoreCanvas.getContext('2d');
    if (sctx) {
      sctx.fillStyle = '#0f172a';
      sctx.fillRect(0, 0, 512, 160);
      sctx.strokeStyle = '#f59e0b';
      sctx.lineWidth = 6;
      sctx.strokeRect(4, 4, 504, 152);
      sctx.fillStyle = '#fde047';
      sctx.font = 'bold 22px monospace';
      sctx.textAlign = 'center';
      sctx.fillText('🐾 LINCOLN HIGH BULLDOG ARENA 🐾', 256, 36);
      sctx.fillStyle = '#ef4444';
      sctx.font = 'bold 36px monospace';
      sctx.fillText('HOME: 5   VISITORS: 0', 256, 84);
      sctx.fillStyle = '#38bdf8';
      sctx.font = 'bold 20px monospace';
      sctx.fillText('FOUR SQUARE CHAMPIONSHIP • CROWN TARGET: 5', 256, 128);
    }
    const scoreTex = new THREE.CanvasTexture(scoreCanvas);
    const scoreMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 5.0),
      new THREE.MeshStandardMaterial({ map: scoreTex, emissive: 0x1e293b })
    );
    scoreMesh.position.set(0, 7.5, -13.9);
    gymGroup.add(scoreMesh);

    // Championship Banners
    [-11, 11].forEach((bx) => {
      const bCanvas = document.createElement('canvas');
      bCanvas.width = 256;
      bCanvas.height = 384;
      const bctx = bCanvas.getContext('2d');
      if (bctx) {
        bctx.fillStyle = '#1e3a8a';
        bctx.fillRect(0, 0, 256, 384);
        bctx.strokeStyle = '#f59e0b';
        bctx.lineWidth = 8;
        bctx.strokeRect(4, 4, 248, 376);
        bctx.fillStyle = '#fbbf24';
        bctx.font = 'bold 24px sans-serif';
        bctx.textAlign = 'center';
        bctx.fillText('STATE', 128, 80);
        bctx.fillText('CHAMPIONS', 128, 120);
        bctx.fillStyle = '#ffffff';
        bctx.font = 'bold 44px sans-serif';
        bctx.fillText('2024', 128, 190);
        bctx.fillStyle = '#fde047';
        bctx.font = 'bold 18px sans-serif';
        bctx.fillText('FOUR SQUARE', 128, 250);
        bctx.fillText('BULLDOGS', 128, 280);
      }
      const bMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(4.0, 6.0),
        new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(bCanvas) })
      );
      bMesh.position.set(bx, 6.5, -13.85);
      gymGroup.add(bMesh);
    });

    // South Wall (Entrance Wall at z = 14.5) with Door Cutout & Double Doors
    // Uses BackSide so camera never gets clipped when framing from the entrance
    const southWallMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.85, side: THREE.BackSide });
    // Left segment (-20 to -2.0)
    const southLeft = new THREE.Mesh(new THREE.BoxGeometry(18, 16, 1.0), southWallMat);
    southLeft.position.set(-11, 8.0, 14.5);
    gymGroup.add(southLeft);

    // Right segment (2.0 to 20)
    const southRight = new THREE.Mesh(new THREE.BoxGeometry(18, 16, 1.0), southWallMat);
    southRight.position.set(11, 8.0, 14.5);
    gymGroup.add(southRight);

    // Header segment above doors (-2.0 to 2.0, y: 3.6 .. 16)
    const southHeader = new THREE.Mesh(new THREE.BoxGeometry(4.0, 12.4, 1.0), southWallMat);
    southHeader.position.set(0, 9.8, 14.5);
    gymGroup.add(southHeader);

    // South Wall Safety Pads
    const southPadL = new THREE.Mesh(new THREE.BoxGeometry(16, 2.2, 0.3), gymPadMat);
    southPadL.position.set(-11, 1.1, 13.9);
    const southPadR = new THREE.Mesh(new THREE.BoxGeometry(16, 2.2, 0.3), gymPadMat);
    southPadR.position.set(11, 1.1, 13.9);
    gymGroup.add(southPadL, southPadR);

    // Grand Entrance Arch Sign above Doors
    const doorSignCanvas = document.createElement('canvas');
    doorSignCanvas.width = 512;
    doorSignCanvas.height = 96;
    const dctx = doorSignCanvas.getContext('2d');
    if (dctx) {
      dctx.fillStyle = '#1e3a8a';
      dctx.fillRect(0, 0, 512, 96);
      dctx.strokeStyle = '#f59e0b';
      dctx.lineWidth = 4;
      dctx.strokeRect(4, 4, 504, 88);
      dctx.fillStyle = '#fde047';
      dctx.font = 'bold 22px sans-serif';
      dctx.textAlign = 'center';
      dctx.fillText('🐾 LINCOLN HIGH GYMNASIUM • BULLDOG ARENA 🐾', 256, 56);
    }
    const doorSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.0, 1.1),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(doorSignCanvas) })
    );
    doorSignMesh.position.set(0, 4.2, 13.9);
    gymGroup.add(doorSignMesh);

    // Both sides of sign (visible from hallway as well!)
    const doorSignHall = doorSignMesh.clone();
    doorSignHall.position.set(0, 4.2, 15.1);
    doorSignHall.rotation.y = Math.PI;
    gymGroup.add(doorSignHall);

    // Double Doors on Hinges!
    const doorMat = new THREE.MeshStandardMaterial({ color: '#1e3a8a', metalness: 0.5, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: '#93c5fd', transparent: true, opacity: 0.65, roughness: 0.1 });
    const pushBarMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.9, roughness: 0.2 });

    // Left Door Group (Hinged at x = -1.9, z = 14.5)
    const doorLGroup = new THREE.Group();
    doorLGroup.position.set(-1.9, 0, 14.5);
    const doorLMesh = new THREE.Mesh(new THREE.BoxGeometry(1.85, 3.4, 0.1), doorMat);
    doorLMesh.position.set(0.925, 1.7, 0);
    const windowL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.12), glassMat);
    windowL.position.set(0.925, 2.1, 0);
    const pushBarL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.18), pushBarMat);
    pushBarL.position.set(0.925, 1.3, 0);
    doorLGroup.add(doorLMesh, windowL, pushBarL);

    // Right Door Group (Hinged at x = 1.9, z = 14.5)
    const doorRGroup = new THREE.Group();
    doorRGroup.position.set(1.9, 0, 14.5);
    const doorRMesh = new THREE.Mesh(new THREE.BoxGeometry(1.85, 3.4, 0.1), doorMat);
    doorRMesh.position.set(-0.925, 1.7, 0);
    const windowR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.12), glassMat);
    windowR.position.set(-0.925, 2.1, 0);
    const pushBarR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.18), pushBarMat);
    pushBarR.position.set(-0.925, 1.3, 0);
    doorRGroup.add(doorRMesh, windowR, pushBarR);

    gymGroup.add(doorLGroup, doorRGroup);
    if (gymDoorsRef) {
      gymDoorsRef.current = { left: doorLGroup, right: doorRGroup };
    }

    // Foyer / Hallway behind South Doors (z = 14.5 .. 26.0)
    const hallFloorTex = createSafeCanvasTexture(256, 256, (hctx) => {
      hctx.fillStyle = '#f1f5f9';
      hctx.fillRect(0, 0, 256, 256);
      hctx.fillStyle = '#94a3b8';
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if ((r + c) % 2 === 1) hctx.fillRect(c * 64, r * 64, 64, 64);
        }
      }
    });
    hallFloorTex.wrapS = THREE.RepeatWrapping;
    hallFloorTex.wrapT = THREE.RepeatWrapping;
    hallFloorTex.repeat.set(4, 4);
    const hallFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 12).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: hallFloorTex, roughness: 0.3 })
    );
    hallFloor.position.set(0, 0.02, 20.5);
    gymGroup.add(hallFloor);

    // Hallway Walls
    const hallWallMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.8 });
    const hallWest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.0, 12), hallWallMat);
    hallWest.position.set(-8.0, 3.0, 20.5);
    const hallEast = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.0, 12), hallWallMat);
    hallEast.position.set(8.0, 3.0, 20.5);
    const hallBack = new THREE.Mesh(new THREE.BoxGeometry(16.8, 6.0, 0.8), hallWallMat);
    hallBack.position.set(0, 3.0, 26.5);
    gymGroup.add(hallWest, hallEast, hallBack);

    // Hallway Lockers (Blue & Gold)
    [-6, 6].forEach((lx) => {
      for (let lz = 16.5; lz <= 24.5; lz += 1.6) {
        const locker = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 3.0, 1.4),
          new THREE.MeshStandardMaterial({ color: lz % 3.2 === 0 ? '#fbbf24' : '#1d4ed8', metalness: 0.4 })
        );
        locker.position.set(lx > 0 ? 7.2 : -7.2, 1.5, lz);
        gymGroup.add(locker);
      }
    });

    // West Wall (x = -17.5) & East Wall (x = 17.5)
    const sideWallMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.8 });
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(1.0, 12, 30), sideWallMat);
    westWall.position.set(-18.0, 6.0, 0);
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(1.0, 12, 30), sideWallMat);
    eastWall.position.set(18.0, 6.0, 0);
    gymGroup.add(westWall, eastWall);

    // Multi-tier Wooden Bleachers on West and East sides
    const bleacherWood = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.7 });
    const bleacherSteel = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.8 });

    [-13.5, 13.5].forEach((sideX) => {
      const isWest = sideX < 0;
      for (let tier = 0; tier < 4; tier++) {
        const tierY = 0.5 + tier * 0.75;
        const tierX = isWest ? sideX - tier * 0.9 : sideX + tier * 0.9;
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 18), bleacherWood);
        seat.position.set(tierX, tierY, 0);
        gymGroup.add(seat);

        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 18), bleacherSteel);
        foot.position.set(tierX + (isWest ? 0.4 : -0.4), tierY - 0.35, 0);
        gymGroup.add(foot);
      }
    });

    // Indoor Gymnasium Ceiling (Raised to y=16.5 with BackSide so cameras never clip) & Steel Trusses
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(38, 0.8, 32),
      new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.9, side: THREE.BackSide })
    );
    ceiling.position.set(0, 16.5, 0);
    gymGroup.add(ceiling);

    for (let rz = -10; rz <= 10; rz += 5) {
      const truss = new THREE.Mesh(
        new THREE.BoxGeometry(36, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.8 })
      );
      truss.position.set(0, 15.6, rz);
      gymGroup.add(truss);

      // High-bay fluorescent / LED stadium lamp fixtures
      [-9, 0, 9].forEach((lx) => {
        const fixture = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.7, 0.4, 16),
          new THREE.MeshBasicMaterial({ color: 0xfffaed })
        );
        fixture.position.set(lx, 15.2, rz);
        gymGroup.add(fixture);
      });
    }

    // High-power overhead arena court floodlight ensuring 100% crystal-clear visibility
    const courtOverheadFlood = new THREE.DirectionalLight(0xfffbeb, 2.5);
    courtOverheadFlood.position.set(0, 15.8, 0);
    courtOverheadFlood.target.position.set(0, 0, 0);
    gymGroup.add(courtOverheadFlood);
    gymGroup.add(courtOverheadFlood.target);

    // Regulation Basketball Hoops with glass backboards and orange rims
    [-17.2, 17.2].forEach((bx) => {
      const hoopGroup = new THREE.Group();
      hoopGroup.position.set(bx, 4.2, 0);
      hoopGroup.rotation.y = bx < 0 ? Math.PI / 2 : -Math.PI / 2;

      // Glass backboard
      const backboard = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.6, 0.08),
        new THREE.MeshStandardMaterial({ color: '#93c5fd', transparent: true, opacity: 0.7, roughness: 0.1 })
      );
      // Orange rim
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.03, 8, 24).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.4 })
      );
      rim.position.set(0, -0.4, 0.45);
      hoopGroup.add(backboard, rim);
      gymGroup.add(hoopGroup);
    });

    scene.add(gymGroup);

    // Build referee on sideline
    const refMesh = buildRefereeModel();
    refMesh.position.set(-5.6, 0, 0);
    refMesh.rotation.y = Math.PI / 2;
    refereeMeshRef.current = refMesh;
    scene.add(refMesh);

    const fanSkin = [0xe3aa79, 0xa76547, 0x754632, 0xf2caa5, 0xc48a65];
    const indoorFanColors = ['#2563eb', '#f59e0b', '#dc2626', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
    const standingSpots = [[-5, -7.6], [-3.9, -8.15], [-2.7, -7.35], [2.5, -8.4], [3.85, -7.48], [5, -8.05]];
    for (let f = 0; f < 20; f++) {
      const sign = f < 7 ? -1 : 1;
      const tier = f % 3;
      const sideline = f < 14;
      const fanX = sideline ? sign * (13.1 + tier * 0.9) : standingSpots[f - 14][0];
      const fanY = sideline ? 0.2 + tier * 0.75 : 0.035;
      const fanZ = sideline ? (f % 7 - 3) * 2.3 : standingSpots[f - 14][1];

      const fanMesh = buildSpectatorPerson({
        shirtColor: indoorFanColors[f % indoorFanColors.length],
        skinColor: fanSkin[f % fanSkin.length],
        hairColor: [0x201b16, 0x6e4934, 0x30221d, 0x9b7448][f % 4],
      });
      fanMesh.position.set(fanX, fanY, fanZ);
      fanMesh.lookAt(0, fanY, 0);
      scene.add(fanMesh);
      spectatorsRef.current.push(fanMesh);
    }

    return; // EXCLUSIVELY INDOOR! Early return prevents any outdoor props from loading
  }

  const campus = buildCampusExterior(venue?.id);
  campus.name = 'campusExterior';
  scene.add(campus);

  const schoolGroup = new THREE.Group();
  const brickMat = new THREE.MeshStandardMaterial({ color: 0xaea397, roughness: 0.88, side: THREE.DoubleSide });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x858680, roughness: 0.78 });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x384b53, roughness: 0.4 });
  // -------------------------------------------------------------
  // C. ENTERABLE INTERIOR CORRIDOR & LOCKER HALLWAY (z in [-21.6, -8.4])
  // -------------------------------------------------------------
  const westHallWallFront = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.5, 4.2), brickMat);
  westHallWallFront.position.set(-7.6, 3.25, -19.6);
  const westHallWallRear = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.5, 4.4), brickMat);
  westHallWallRear.position.set(-7.6, 3.25, -10.5);
  const westDoorLintel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 5.0), brickMat);
  westDoorLintel.position.set(-7.6, 5.25, -15.1);

  for (const [start,end] of [[-21.6,EAST_OPENING.start],[EAST_OPENING.end,-8.4]]) {
    const eastHallWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.4, end-start), brickMat);
    eastHallWall.position.set(7.6, 2.7, (start+end)/2);
    schoolGroup.add(eastHallWall);
  }
  schoolGroup.add(westHallWallFront, westHallWallRear, westDoorLintel);

  // Classroom 101 Doorway Welcoming Arch Sign
  const r101SignCanvas = document.createElement('canvas');
  r101SignCanvas.width = 512;
  r101SignCanvas.height = 128;
  const rctx = r101SignCanvas.getContext('2d');
  if (rctx) {
    rctx.fillStyle = '#0f172a';
    rctx.fillRect(0, 0, 512, 128);
    rctx.strokeStyle = '#fbbf24';
    rctx.lineWidth = 6;
    rctx.strokeRect(4, 4, 504, 120);
    rctx.fillStyle = '#ffffff';
    rctx.font = 'bold 28px sans-serif';
    rctx.textAlign = 'center';
    rctx.textBaseline = 'middle';
    rctx.fillText('ROOM 101 • FOUR SQUARE THEORY', 256, 64);
  }
  const r101SignTex = new THREE.CanvasTexture(r101SignCanvas);
  const r101Sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 1.2),
    new THREE.MeshStandardMaterial({ map: r101SignTex, roughness: 0.4 })
  );
  r101Sign.position.set(-7.15, 4.2, -15.1);
  r101Sign.rotation.y = Math.PI / 2;
  schoolGroup.add(r101Sign);

  // Polished Checkerboard Floor for School Hallway
  const floorTex = createSafeCanvasTexture(256, 256, (fctx) => {
    fctx.fillStyle = '#f8fafc';
    fctx.fillRect(0, 0, 256, 256);
    fctx.fillStyle = '#cbd5e1';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if ((r + c) % 2 === 1) {
          fctx.fillRect(c * 64, r * 64, 64, 64);
        }
      }
    }
  });
  floorTex.wrapS = THREE.RepeatWrapping;
  floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(8, 8);
  const schoolFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(14.4, 13.6).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.25, metalness: 0.15 })
  );
  schoolFloor.name = 'schoolFloor';
  schoolFloor.position.set(0, 0.03, -15.0);
  schoolFloor.receiveShadow = true;
  schoolGroup.add(schoolFloor);

  // Interior Hallway Lockers (Blue & Yellow along Front West Hallway Wall)
  for (let lk = -21.0; lk <= -18.4; lk += 1.3) {
    const locker = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 3.2, 1.2),
      new THREE.MeshStandardMaterial({
        color: Math.round(Math.abs(lk) * 10) % 2 === 0 ? '#fbbf24' : '#2563eb',
        roughness: 0.5,
        metalness: 0.35,
      })
    );
    locker.position.set(-6.8, 1.6, lk);
    locker.castShadow = true;
    schoolGroup.add(locker);
  }

  // Interior Championship Trophy Case Showcase along East Hallway Wall
  const trophyCase = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 3.2, 2.8),
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 })
  );
  trophyCase.position.set(6.8, 1.6, -19.5);
  schoolGroup.add(trophyCase);

  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.15, 0.8, 16),
    new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.95, roughness: 0.1 })
  );
  cup.position.set(6.32, 2.0, -19.5);
  schoolGroup.add(cup);

  // Hallway Students in Corridor
  const hallwayMaya = buildCharacterMesh(CHARACTERS[3]);
  hallwayMaya.userData.character = CHARACTERS[3];
  hallwayMaya.position.set(3.8, 0, -17.5);
  hallwayMaya.rotation.y = -Math.PI / 2;
  schoolGroup.add(hallwayMaya);

  const hallwayAlex = buildCharacterMesh(CHARACTERS[7]);
  hallwayAlex.userData.character = CHARACTERS[7];
  hallwayAlex.position.set(-2.45, 0, -19.5);
  hallwayAlex.rotation.y = Math.PI / 2;
  schoolGroup.add(hallwayAlex);

  // -------------------------------------------------------------
  const campusRooms = includeRooms ? buildCampusRooms() : undefined;
  if (campusRooms) {
    schoolGroup.add(campusRooms.group, buildSchoolUpperFloor(globalPhysics));
    if (venue) schoolGroup.add(buildCampusAnnex(venue.id, globalPhysics), buildCampusCrowd(globalPhysics));
  }
  [hallwayMaya,hallwayAlex].forEach((student, index) => {
    globalPhysics.addCylinder({ id: 'hallway-student-' + index, type: 'person', x: student.position.x,
      z: student.position.z, radius: 0.43, height: 1.8, isStatic: true });
  });
  for (const [i, item] of (campusRooms?.fixtures ?? []).entries()) globalPhysics.addBox({
    id: 'school-fixture-' + i, type: 'wall', minX: item.x - item.width/2, maxX: item.x + item.width/2,
    minZ: item.z - item.depth/2, maxZ: item.z + item.depth/2, minY: 0, maxY: item.height,
  });

  schoolGroup.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material === brickMat) object.userData.cameraWall = true;
  });
  scene.add(schoolGroup);

  // Dynamic Front Street Traffic & Drop-Off Vehicle Scene (along Maple Street z = -43.4..-46.5)
  if (streetVehiclesRef) {
    const carEast = buildRoadTripCar('#2563eb');
    carEast.position.set(-22.0, 0.15, -46.5);
    carEast.rotation.y = Math.PI / 2;
    scene.add(carEast);
    streetVehiclesRef.current.push({
      mesh: carEast,
      carBody: carEast.getObjectByName('carBodyGroup') as THREE.Group,
      speed: 7.2,
      laneZ: -46.5,
      direction: 1,
    });

    const carWest = buildRoadTripCar('#dc2626');
    carWest.position.set(28.0, 0.15, -43.4);
    carWest.rotation.y = -Math.PI / 2;
    scene.add(carWest);
    streetVehiclesRef.current.push({
      mesh: carWest,
      carBody: carWest.getObjectByName('carBodyGroup') as THREE.Group,
      speed: 6.6,
      laneZ: -43.4,
      direction: -1,
    });


  }

  // 10. Official Tournament Referee
  const refPerson = buildRefereeModel();
  refPerson.position.set(5.8, 0.018, 0);
  refPerson.lookAt(0, refPerson.position.y, 0);
  scene.add(refPerson);
  refereeMeshRef.current = refPerson;

  globalPhysics.addCylinder({
    id: 'referee',
    type: 'person',
    x: refPerson.position.x,
    z: refPerson.position.z,
    radius: 0.45,
    height: 1.8,
    isStatic: true,
  });

  const spectatorConfigs = [
    { x: -7.2, z: -3.4, shirt: 0xb15f55, pants: 0x323638, skin: 0xf2d6b3, hair: 0x312822 },
    { x: -7.5, z: -1.9, shirt: 0x527163, pants: 0x334155, skin: 0xb17955, hair: 0x191917 },
    { x: -7.1, z: -0.35, shirt: 0x6b7f8b, pants: 0x282f32, skin: 0xffdbac, hair: 0x805936 },
    { x: -7.4, z: 1.2, shirt: 0xaa925a, pants: 0x33383d, skin: 0x73442e, hair: 0x271913 },
    { x: -7.5, z: 2.75, shirt: 0x685371, pants: 0x344048, skin: 0xd49372, hair: 0x30201c },
    { x: 7.6, z: -3.25, shirt: 0x3c5c74, pants: 0x282e33, skin: 0xa76747, hair: 0x4a3021 },
    { x: 7.85, z: -1.6, shirt: 0xb99178, pants: 0x39372e, skin: 0xeabb96, hair: 0x775438 },
  ];

  spectatorsRef.current = [];
  spectatorConfigs.forEach((spec, i) => {
    const fan = buildSpectatorPerson({
      shirtColor: spec.shirt,
      pantsColor: spec.pants,
      skinColor: spec.skin,
      hairColor: spec.hair,
    });
    fan.position.set(spec.x, 0, spec.z);
    fan.lookAt(0, fan.position.y, 0);
    scene.add(fan);
    spectatorsRef.current.push(fan);

    globalPhysics.addCylinder({
      id: `spectator-${i}`,
      type: 'person',
      x: spec.x,
      z: spec.z,
      radius: 0.42,
      height: 1.7,
      isStatic: true,
    });
  });

  // 11. Venue Specific Schoolyard NPCs
  npcsRef.current = [];
  if (venue && venue.npcs) {
    venue.npcs.forEach((npc, index) => {
      const position = campusNpcSpot(index);
      const npcChar = CHARACTERS.find((c) => c.id === npc.characterId) || CHARACTERS[1];
      const npcMesh = buildCharacterMesh(npcChar);
      npcMesh.position.set(...position);
      npcMesh.userData.campaignNpc = { ...npc, position };
      npcMesh.lookAt(0, 0.5, 0);

      // Name Tag billboard
      const tagTex = createSafeCanvasTexture(160, 48, (tctx) => {
        tctx.fillStyle = 'rgba(15,23,42,0.9)';
        tctx.roundRect(4, 4, 152, 40, 10);
        tctx.fill();
        tctx.fillStyle = '#fbbf24';
        tctx.font = 'bold 20px sans-serif';
        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';
        tctx.fillText(npc.name, 80, 24);
      });
      const tagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex }));
      tagSprite.scale.set(1.4, 0.42, 1);
      tagSprite.position.set(0, 2.1, 0);
      npcMesh.add(tagSprite);

      scene.add(npcMesh);
      npcsRef.current.push(npcMesh);

      globalPhysics.addCylinder({
        id: npc.id,
        type: 'person',
        x: position[0],
        z: position[2],
        radius: 0.45,
        height: 1.75,
        isStatic: true,
      });
    });
  }
}

// -------------------------------------------------------------
// Shared markings and hit targets for the playable court.
// -------------------------------------------------------------
function buildCourt(
  scene: THREE.Scene,
  squaresRef: React.MutableRefObject<Map<SquareId, THREE.Mesh>>,
  highlightsRef: React.MutableRefObject<Map<SquareId, THREE.Mesh>>,
  venueId?: VenueDef['id'],
) {
  const { group, squareMeshes } = buildCampusCourt(venueId);
  scene.add(group);
  for (const [id, mesh] of squareMeshes) {
    squaresRef.current.set(id, mesh);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT_HALF_SIZE, COURT_HALF_SIZE).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xeac971, transparent: true, opacity: 0.38, depthWrite: false }),
    );
    glow.position.set(mesh.position.x, 0.038, mesh.position.z);
    glow.visible = false;
    group.add(glow);
    highlightsRef.current.set(id, glow);
  }
  return group;
}

// -------------------------------------------------------------
// Helper: Build Playground Ball
// -------------------------------------------------------------
function buildBall(
  scene: THREE.Scene,
  ballRef: React.MutableRefObject<THREE.Mesh | null>,
  shadowRef: React.MutableRefObject<THREE.Mesh | null>,
  look?: BallLook,
) {
  const ballGeo = new THREE.SphereGeometry(0.22, 28, 28);
  const ballMat = courtBallMaterial(look);
  const ball = new THREE.Mesh(ballGeo, ballMat);
  ball.castShadow = true;
  ball.position.set(0, 0.22, 0);
  scene.add(ball);
  ballRef.current = ball;

  const shadowGeo = new THREE.CircleGeometry(0.26, 24);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.set(0, 0.02, 0);
  scene.add(shadow);
  shadowRef.current = shadow;
}

// -------------------------------------------------------------
// Helpers: Court Footwork, Player Clarity Badges & Strike FX
// -------------------------------------------------------------
function getSquarePlayBounds(sqId: SquareId) {
  const [x, z] = SQUARE_CONFIGS[sqId].center;
  const isLeft = x < 0;
  const isTop = z < 0;
  return {
    minX: isLeft ? -4.45 : 0.55,
    maxX: isLeft ? -0.55 : 4.45,
    minZ: isTop ? -4.45 : 0.55,
    maxZ: isTop ? -0.55 : 4.45,
  };
}

function lerpAngle(current: number, target: number, t: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

function aimStrikePalm(arm: THREE.Group, contact: THREE.Vector3, weight: number) {
  const hand = arm.getObjectByName('strikeHand');
  const parent = arm.parent;
  if (!hand || !parent) return;
  const palm = hand.localToWorld(new THREE.Vector3(0, -0.045, 0));
  const palmDirection = parent.worldToLocal(palm).sub(arm.position).normalize();
  const shoulder = arm.getWorldPosition(new THREE.Vector3());
  const ballSurface = contact.clone().lerp(shoulder, Math.min(1, BALL_RADIUS / Math.max(BALL_RADIUS, shoulder.distanceTo(contact))));
  const strikeDirection = parent.worldToLocal(ballSurface).sub(arm.position).normalize();
  if (!strikeDirection.lengthSq() || !palmDirection.lengthSq()) return;
  const correction = new THREE.Quaternion().setFromUnitVectors(palmDirection, strikeDirection);
  arm.quaternion.slerp(correction.multiply(arm.quaternion), weight);
}

function applyFootworkGait(grp: THREE.Group, speed: number, elapsed: number) {
  const strideAmp = Math.min(0.62, speed * 0.11);
  const leftLeg = grp.getObjectByName('leftLeg') as THREE.Group | undefined;
  const rightLeg = grp.getObjectByName('rightLeg') as THREE.Group | undefined;
  const leftShin = grp.getObjectByName('leftShin') as THREE.Group | undefined;
  const rightShin = grp.getObjectByName('rightShin') as THREE.Group | undefined;
  const leftArm = grp.getObjectByName('leftArm') as THREE.Group | undefined;
  const rightArm = grp.getObjectByName('rightArm') as THREE.Group | undefined;
  const torso = grp.getObjectByName('torsoMesh') as THREE.Object3D | undefined;

  if (strideAmp > 0.04) {
    const cycle = Math.sin(elapsed * 14);
    if (leftLeg) leftLeg.rotation.x = cycle * strideAmp;
    if (rightLeg) rightLeg.rotation.x = -cycle * strideAmp;
    if (leftShin) leftShin.rotation.x = Math.max(0, -cycle) * strideAmp * 0.85;
    if (rightShin) rightShin.rotation.x = Math.max(0, cycle) * strideAmp * 0.85;
    if (leftArm) leftArm.rotation.x = -0.25 - cycle * strideAmp * 0.7;
    if (rightArm) rightArm.rotation.x = -0.25 + cycle * strideAmp * 0.7;
    if (torso) torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, 0.14, 0.2);
    grp.position.y = 0.035 + Math.abs(cycle) * 0.04;
  } else {
    if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.22);
    if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.22);
    if (leftShin) leftShin.rotation.x = THREE.MathUtils.lerp(leftShin.rotation.x, 0, 0.22);
    if (rightShin) rightShin.rotation.x = THREE.MathUtils.lerp(rightShin.rotation.x, 0, 0.22);
    if (leftArm) leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -0.25, 0.2);
    if (rightArm) rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.25, 0.2);
    if (torso) torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, 0, 0.2);
    grp.position.y = THREE.MathUtils.lerp(grp.position.y, 0.035, 0.25);
  }
}

function createPlayerTagTexture(player: Player, charName: string, isHuman: boolean): THREE.Texture {
  const sqLabel = player.rank ? `SQ ${player.rank}` : 'SUB';
  const nameLabel = isHuman ? `${charName}` : charName;

  return createSafeCanvasTexture(280, 74, (tctx) => {
    tctx.fillStyle = isHuman
      ? 'rgba(8, 51, 68, 0.96)'
      : player.rank === 1
      ? 'rgba(146, 64, 14, 0.94)'
      : 'rgba(15, 23, 42, 0.92)';
    tctx.beginPath();
    tctx.roundRect(6, 6, 268, 62, 14);
    tctx.fill();

    tctx.strokeStyle = isHuman ? '#22d3ee' : player.rank === 1 ? '#facc15' : '#475569';
    tctx.lineWidth = isHuman ? 5 : 4;
    tctx.stroke();

    tctx.fillStyle = player.rank === 1 ? '#facc15' : isHuman ? '#22d3ee' : '#cbd5e1';
    tctx.font = '900 23px monospace';
    tctx.textAlign = 'left';
    tctx.textBaseline = 'middle';
    tctx.fillText(sqLabel, 18, 37);

    tctx.fillStyle = '#ffffff';
    tctx.font = 'bold 22px sans-serif';
    tctx.textAlign = 'right';
    tctx.fillText(nameLabel.slice(0, 13), 260, 37);
  });
}

function redrawPlayerTagSprite(grp: THREE.Group, player: Player, isHuman: boolean) {
  const tagSprite = grp.getObjectByName('playerTagBadge') as THREE.Sprite | undefined;
  if (!tagSprite) return;
  const charDef =
    CHARACTERS.find((c) => c.id === player.characterId || c.archetype === player.archetype) ||
    CHARACTERS[0];
  const oldMap = tagSprite.material.map;
  tagSprite.material.map = createPlayerTagTexture(player, player.name || charDef.name, isHuman);
  tagSprite.material.needsUpdate = true;
  if (oldMap) oldMap.dispose();
}

function createYouPointerTexture(): THREE.Texture {
  return createSafeCanvasTexture(180, 88, (tctx) => {
    tctx.fillStyle = '#06b6d4';
    tctx.beginPath();
    tctx.roundRect(14, 6, 152, 48, 12);
    tctx.fill();

    tctx.strokeStyle = '#ffffff';
    tctx.lineWidth = 4;
    tctx.stroke();

    tctx.fillStyle = '#042f2e';
    tctx.font = '900 28px sans-serif';
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.fillText('YOU', 90, 31);

    // Crisp downward chevron arrow
    tctx.fillStyle = '#22d3ee';
    tctx.beginPath();
    tctx.moveTo(68, 56);
    tctx.lineTo(112, 56);
    tctx.lineTo(90, 84);
    tctx.closePath();
    tctx.fill();
    tctx.strokeStyle = '#ffffff';
    tctx.lineWidth = 3;
    tctx.stroke();
  });
}

function createPlayerModel(
  player: Player,
  customization?: CharacterCustomization,
  humanPlayerId?: string
): THREE.Group {
  const grp = new THREE.Group();
  grp.userData = { playerId: player.id, characterId: player.characterId };

  const charDef =
    CHARACTERS.find((c) => c.id === player.characterId || c.archetype === player.archetype) ||
    CHARACTERS[0];

  const isHuman = player.isHuman || (humanPlayerId !== undefined && player.id === humanPlayerId);
  const bodyGroup = buildCharacterMesh(charDef, customization);
  bodyGroup.name = 'playerBody';
  grp.add(bodyGroup);

  // Persistent Controlled Player ("YOU") Cyan Ground Aura & Light Halo
  const youGroundAura = new THREE.Group();
  youGroundAura.name = 'youGroundAura';
  youGroundAura.position.y = 0.032;

  const outerCyanRingGeo = new THREE.RingGeometry(0.86, 1.03, 36);
  outerCyanRingGeo.rotateX(-Math.PI / 2);
  const outerCyanRing = new THREE.Mesh(
    outerCyanRingGeo,
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    })
  );

  const innerCyanDiscGeo = new THREE.CircleGeometry(0.85, 36);
  innerCyanDiscGeo.rotateX(-Math.PI / 2);
  const innerCyanDisc = new THREE.Mesh(
    innerCyanDiscGeo,
    new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
    })
  );

  const beaconCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.92, 0.52, 28, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beaconCone.position.y = 0.26;
  youGroundAura.add(outerCyanRing, innerCyanDisc, beaconCone);
  youGroundAura.visible = isHuman;
  grp.add(youGroundAura);

  // Active Turn Ring (amber/cyan/white on current active player or server)
  const ringGeo = new THREE.RingGeometry(0.62, 0.78, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const turnRing = new THREE.Mesh(ringGeo, ringMat);
  turnRing.name = 'turnRing';
  turnRing.position.y = 0.04;
  turnRing.visible = false;
  grp.add(turnRing);

  // Crown for King (Rank 1)
  const crownGroup = new THREE.Group();
  crownGroup.name = 'crownMesh';
  crownGroup.position.set(0, 1.84, 0);
  const crownMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.18, 0.22, 5),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 })
  );
  crownGroup.add(crownMesh);
  crownGroup.visible = player.rank === 1;
  grp.add(crownGroup);

  // Universal High-Legibility Floating Player Name & Square Rank Badge Sprite (visible on ALL 4 contenders)
  const playerTagTex = createPlayerTagTexture(player, player.name || charDef.name, isHuman);
  const playerTagSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: playerTagTex, depthTest: false })
  );
  playerTagSprite.name = 'playerTagBadge';
  playerTagSprite.scale.set(1.65, 0.44, 1);
  playerTagSprite.position.set(0, 2.15, 0);
  playerTagSprite.renderOrder = 20;
  grp.add(playerTagSprite);

  // Dedicated Overhead Bobbing "YOU ▼" Pointer Arrow above the human player's tag
  const youPointerTex = createYouPointerTexture();
  const youPointerArrow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: youPointerTex, depthTest: false })
  );
  youPointerArrow.name = 'youPointerArrow';
  youPointerArrow.scale.set(1.15, 0.56, 1);
  youPointerArrow.position.set(0, 2.68, 0);
  youPointerArrow.renderOrder = 21;
  youPointerArrow.visible = isHuman;
  grp.add(youPointerArrow);

  grp.userData.badgeKey = `${player.rank}-${isHuman ? 1 : 0}`;
  return grp;
}

// -------------------------------------------------------------
// Helper: Dust Puff & Hand-to-Ball Palm Contact Shockwave
// -------------------------------------------------------------
function spawnDustPuff(
  scene: THREE.Scene,
  x: number,
  z: number,
  dustArray: React.MutableRefObject<THREE.Mesh[]>
) {
  const geo = new THREE.RingGeometry(0.12, 0.28, 16);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xf1f5f9,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const puff = new THREE.Mesh(geo, mat);
  puff.position.set(x, 0.025, z);
  scene.add(puff);
  dustArray.current.push(puff);
}

function spawnHitShockwave(
  scene: THREE.Scene,
  pos: THREE.Vector3,
  shockArray: React.MutableRefObject<THREE.Mesh[]>
) {
  const geo = new THREE.RingGeometry(0.14, 0.24, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(geo, mat);
  ring.position.copy(pos);
  if (scene.children.length > 0) {
    ring.lookAt(pos.x, pos.y + 0.6, pos.z + 2.0);
  }
  scene.add(ring);
  shockArray.current.push(ring);
}
