import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Timer, Volume2 } from 'lucide-react';
import { Player, BallState, SquareId, RuleSet } from '../types/foursquare';
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
import { ClassroomModal } from './ClassroomModal';

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
  venue?: VenueDef;
  players: Player[];
  waitingQueue: Player[];
  ballState: BallState;
  humanPlayerId: string;
  activeTurnPlayerId: string | null;
  servingPlayerId: string | null;
  isHumanTurn: boolean;
  highlightedSquares: SquareId[];
  onSelectTargetSquare: (squareId: SquareId, clickPoint?: { x: number; z: number }) => void;
  cameraView: 'first_person' | 'third_person' | 'isometric' | 'top_down' | 'action';
  ruleSet?: RuleSet;
  explorationPlayerPos?: [number, number, number];
  onExplorationMove?: (pos: [number, number, number]) => void;
  onInteractNPC?: (npc: CampaignNPC) => void;
  onInteractCourt?: () => void;
  onInteractFunnelBall?: () => void;
  onInteractSchoolDoor?: () => void;
  onRewardCoins?: (amount: number) => void;
  onStartMatchWithClassmate?: (classmate?: CharacterDef) => void;
  customization?: CharacterCustomization;
  isOrbitMode?: boolean;
  onToggleOrbitMode?: () => void;
  venueType?: 'outdoor' | 'indoor';
  onShotClockExpired?: () => void;
  paAnnouncement?: string | null;
  disableBackgroundVideo?: boolean;
}

export const ThreeCourtScene: React.FC<ThreeCourtSceneProps> = ({
  mode = 'match',
  venue,
  players,
  ballState,
  humanPlayerId,
  activeTurnPlayerId,
  servingPlayerId,
  isHumanTurn,
  highlightedSquares,
  onSelectTargetSquare,
  cameraView,
  explorationPlayerPos = [0, 0, -6.0],
  onExplorationMove,
  onInteractNPC,
  onInteractCourt,
  onInteractFunnelBall,
  onInteractSchoolDoor,
  onRewardCoins,
  onStartMatchWithClassmate,
  customization,
  isOrbitMode,
  onToggleOrbitMode,
  venueType = 'outdoor',
  onShotClockExpired,
  paAnnouncement,
  disableBackgroundVideo = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
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
  const [locomotionMode, setLocomotionMode] = useState<'walk' | 'run' | 'bike'>('run');
  const [isClassroomOpen, setIsClassroomOpen] = useState(false);
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
        startTime: number;
        duration: number;
        hitterId: string;
        contactPos: THREE.Vector3;
        shotDirX: number;
        shotDirZ: number;
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
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const orbitYawRef = useRef(0);
  const orbitPitchRef = useRef(0.24);
  const orbitDistanceRef = useRef(7.5); // Smooth zoomable distance between 4.0m and 26.0m
  const matchZoomRef = useRef(1.0); // Match zoom multiplier (scroll wheel adjustable)

  // 10-Second Skippable Scene-Setting Match Intro Zoom State
  const [isMatchIntroActive, setIsMatchIntroActive] = useState(mode === 'match');
  const isMatchIntroActiveRef = useRef(mode === 'match');
  const matchIntroStartTimeRef = useRef(performance.now());
  const [introCountdown, setIntroCountdown] = useState(10);

  // 5-Second Turn Shot Clock
  const [shotClockSeconds, setShotClockSeconds] = useState(5.0);
  const shotClockRef = useRef(5.0);
  const onShotClockExpiredRef = useRef(onShotClockExpired);
  onShotClockExpiredRef.current = onShotClockExpired;

  // Reset shot clock on turn change or serve change
  useEffect(() => {
    shotClockRef.current = 5.0;
    setShotClockSeconds(5.0);
  }, [activeTurnPlayerId, ballState.isServing]);

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
    if (mode === 'match') {
      setIsMatchIntroActive(true);
      isMatchIntroActiveRef.current = true;
      matchIntroStartTimeRef.current = performance.now();
      setIntroCountdown(10);
    } else {
      setIsMatchIntroActive(false);
      isMatchIntroActiveRef.current = false;
    }
  }, [mode]);

  // Countdown timer for intro HUD
  useEffect(() => {
    if (!isMatchIntroActive) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, 10 - Math.floor((performance.now() - matchIntroStartTimeRef.current) / 1000));
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

  const humanPlayerIdRef = useRef(humanPlayerId);
  humanPlayerIdRef.current = humanPlayerId;

  const activeTurnPlayerIdRef = useRef(activeTurnPlayerId);
  activeTurnPlayerIdRef.current = activeTurnPlayerId;

  const servingPlayerIdRef = useRef(servingPlayerId);
  servingPlayerIdRef.current = servingPlayerId;

  const locomotionModeRef = useRef(locomotionMode);
  locomotionModeRef.current = locomotionMode;

  const disableBackgroundVideoRef = useRef(disableBackgroundVideo);
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

  useEffect(() => {
    localPlayerPos.current = [...explorationPlayerPos];
    if (explorerMeshRef.current) {
      explorerMeshRef.current.position.set(explorationPlayerPos[0], 0, explorationPlayerPos[2]);
    }
  }, [explorationPlayerPos]);

  // Handle keyboard inputs for WASD and Arrow key walking in exploration mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressed.current[k] = true;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') keysPressed.current['w'] = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keysPressed.current['s'] = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keysPressed.current['a'] = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keysPressed.current['d'] = true;

      if ((k === 'e' || e.code === 'KeyE' || e.code === 'Space') && interactionPromptRef.current) {
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
    scene.background = new THREE.Color(isIndoorVenue ? '#070d18' : '#38bdf8');
    scene.fog = isIndoorVenue ? new THREE.FogExp2('#070d18', 0.003) : new THREE.FogExp2('#38bdf8', 0.007);

    // Camera setup
    const aspect = height > 0 ? width / height : 1.33;
    const camera = new THREE.PerspectiveCamera(50, aspect, 0.5, 220);
    cameraRef.current = camera;
    if (mode === 'match' && isIndoorVenue) {
      // Start in entrance hallway foyer facing the closed double doors to the gymnasium
      camera.position.set(0, 2.0, 23.0);
      camera.lookAt(0, 2.1, 14.5);
    } else if (mode === 'preview') {
      camera.position.set(2.4, 7.8, 10.2);
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

      const sunLight = new THREE.DirectionalLight(0xfffaed, 1.6);
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
    setupStaticColliders();

    // Build Schoolyard Environment with Enterable School Building or Indoor Gymnasium
    buildVenueEnvironment(scene, venue, refereeMeshRef, spectatorsRef, npcsRef, streetVehiclesRef, venueType, gymDoorsRef);

    // Build Four Square Court
    buildCourt(scene, squareMeshesRef, squareHighlightsRef);

    // Build Ball and ground shadow
    buildBall(scene, ballMeshRef, ballShadowMeshRef);

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
    explorer.position.set(localPlayerPos.current[0], 0, localPlayerPos.current[2]);
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

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      const currentMode = modeRef.current;
      const currentCamView = cameraViewRef.current;

      // Update 5-Second Shot Clock during active match turn
      if (currentMode === 'match' && !isMatchIntroActiveRef.current && activeTurnPlayerIdRef.current) {
        shotClockRef.current = Math.max(0, shotClockRef.current - delta);
        setShotClockSeconds(Math.ceil(shotClockRef.current * 10) / 10);
        if (shotClockRef.current <= 0) {
          shotClockRef.current = 5.0;
          soundFX.playShotClockBuzzer();
          if (onShotClockExpiredRef.current) {
            onShotClockExpiredRef.current();
          }
        }
      }

      // 1. Exploration Free-Roam Physics & Camera-Relative WASD Movement
      if (currentMode === 'exploration' && explorerMeshRef.current) {
        // In first person mode, hide avatar mesh so it doesn't obstruct camera view
        explorerMeshRef.current.visible = currentCamView !== 'first_person';

        const activeLocomotion = locomotionModeRef.current;
        const baseSpeed = activeLocomotion === 'walk' ? 4.5 : activeLocomotion === 'bike' ? 14.0 : 8.5;
        const speed = baseSpeed * delta;
        let moveX = 0;
        let moveZ = 0;

        const isKeyActive =
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
            0.45
          );

          localPlayerPos.current = [resolvedX, 0, resolvedZ];
          explorerMeshRef.current.position.set(resolvedX, 0, resolvedZ);

          // Walking body bobbing & limb gait cycle (Arms & Legs swinging)
          explorerMeshRef.current.position.y = Math.abs(Math.sin(elapsed * 12)) * 0.08;

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
            onExplorationMoveRef.current([resolvedX, 0, resolvedZ]);
          }

          checkProximityPrompts(localPlayerPos.current);
        } else {
          explorerMeshRef.current.position.y = 0;
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
          const px = localPlayerPos.current[0];
          const pz = localPlayerPos.current[2];
          const yaw = orbitYawRef.current;
          const pitch = orbitPitchRef.current;

          if (currentCamView === 'first_person') {
            // First Person: Camera placed right at avatar's eye height
            const eyeY = 1.55 + (isMoving ? Math.sin(elapsed * 12) * 0.04 : 0);
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

            const targetCamX = px + Math.sin(yaw) * Math.cos(pitch) * dist;
            const targetCamY = Math.max(1.2, 1.4 + Math.sin(pitch) * dist);
            const targetCamZ = pz + Math.cos(yaw) * Math.cos(pitch) * dist;

            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, targetCamX, 0.14);
            cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, targetCamY, 0.14);
            cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, targetCamZ, 0.14);
            cameraRef.current.lookAt(px, 1.2, pz);
          } else if (currentCamView === 'top_down') {
            // Top Down: Overhead bird's eye
            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, px, 0.15);
            cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, 18.0, 0.15);
            cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, pz + 0.1, 0.15);
            cameraRef.current.lookAt(px, 0, pz);
          } else if (currentCamView === 'action') {
            // Action Cam: Low dynamic angle
            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, px + 3.2, 0.12);
            cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, 2.2, 0.12);
            cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, pz + 4.2, 0.12);
            cameraRef.current.lookAt(px, 0.8, pz);
          } else {
            // Isometric view
            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, px + 7.5, 0.12);
            cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, 9.5, 0.12);
            cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, pz + 9.5, 0.12);
            cameraRef.current.lookAt(px, 0.8, pz);
          }
        }
      }

      // 2. Main Menu Animated Background Match Simulation (Continuous Live 4-Player Match Rally)
      if (currentMode === 'preview' && ballMeshRef.current && ballShadowMeshRef.current) {
        const sim = previewSimRef.current;
        const now = performance.now();
        const progress = (now - sim.shotStartTime) / sim.shotDuration;
        const livePlayers = playersRef.current;

        if (progress >= 1.0) {
          // Ball arrived in target square! Pick next hitter & target
          sim.currentHitterSq = sim.targetSq;
          const remainingSquares: SquareId[] = ([1, 2, 3, 4] as SquareId[]).filter((s) => s !== sim.currentHitterSq);
          sim.targetSq = remainingSquares[Math.floor(Math.random() * remainingSquares.length)];
          sim.shotStartTime = now;
          sim.shotDuration = 820 + Math.random() * 240;
          sim.rallyCount++;

          const hitterPlayer = livePlayers.find((p) => p.rank === sim.currentHitterSq);
          const hitterMesh = hitterPlayer ? playerMeshesRef.current.get(hitterPlayer.id) : undefined;
          const hitOriginX = hitterMesh ? hitterMesh.position.x : sim.targetPos.x;
          const hitOriginZ = hitterMesh ? hitterMesh.position.z : sim.targetPos.z;
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
          if (hitterPlayer) {
            const shotDx = nextDestX - hitOriginX;
            const shotDz = nextDestZ - hitOriginZ;
            const shotLen = Math.hypot(shotDx, shotDz) || 1;
            swingAnimsRef.current.set(hitterPlayer.id, {
              startTime: now,
              duration: 340,
              hitterId: hitterPlayer.id,
              contactPos,
              shotDirX: shotDx / shotLen,
              shotDirZ: shotDz / shotLen,
            });
          }

          if (sceneRef.current) {
            spawnDustPuff(sceneRef.current, contactX, contactZ, dustPuffsRef);
            spawnHitShockwave(sceneRef.current, contactPos, hitShockwavesRef);
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

      // 3. Match Mode Camera Tracking (10-Second Skippable Intro -> Wide Full Court Visibility)
      if (currentMode === 'match' && cameraRef.current) {
        if (isMatchIntroActiveRef.current) {
          const elapsedIntro = performance.now() - matchIntroStartTimeRef.current;
          const sec = elapsedIntro / 1000;
          const progress = Math.min(1.0, elapsedIntro / 10000);

          if (venueType === 'indoor') {
            // Animate gymnasium double doors swinging open inward
            if (gymDoorsRef.current) {
              if (sec < 1.4) {
                gymDoorsRef.current.left.rotation.y = 0;
                gymDoorsRef.current.right.rotation.y = 0;
              } else if (sec < 3.8) {
                const openProg = Math.min(1.0, (sec - 1.4) / 2.2);
                const doorEase = Math.sin((openProg * Math.PI) / 2);
                gymDoorsRef.current.left.rotation.y = -doorEase * 1.65;
                gymDoorsRef.current.right.rotation.y = doorEase * 1.65;
              } else {
                gymDoorsRef.current.left.rotation.y = -1.65;
                gymDoorsRef.current.right.rotation.y = 1.65;
              }
            }

            // Cinematic Path: Hallway -> Walk through open doors -> Step onto court -> Rise to full match view
            if (sec < 1.8) {
              // Looking at the closed gym doors with the arena sign
              const p = sec / 1.8;
              cameraRef.current.position.set(0, 2.0, 23.0 - p * 0.8);
              cameraRef.current.lookAt(0, 2.1, 14.5);
            } else if (sec < 4.8) {
              // Gliding right through the open double doors inside the building
              const p = (sec - 1.8) / 3.0;
              const ease = Math.sin((p * Math.PI) / 2);
              const camZ = THREE.MathUtils.lerp(22.2, 11.0, ease);
              const camY = THREE.MathUtils.lerp(2.0, 3.2, ease);
              cameraRef.current.position.set(0, camY, camZ);
              cameraRef.current.lookAt(0, 1.4, 0);
            } else if (sec < 7.6) {
              // Stepping into the gymnasium, panning across the court and bleachers
              const p = (sec - 4.8) / 2.8;
              const ease = p * p * (3 - 2 * p);
              const camZ = THREE.MathUtils.lerp(11.0, 16.5, ease);
              const camY = THREE.MathUtils.lerp(3.2, 10.5, ease);
              const camX = Math.sin(p * Math.PI) * 2.4;
              cameraRef.current.position.set(camX, camY, camZ);
              cameraRef.current.lookAt(0, 0.8, 0.5);
            } else {
              // Rising up into full-court match view inside the gymnasium
              const p = (sec - 7.6) / 2.4;
              const ease = p * p * (3 - 2 * p);
              cameraRef.current.position.x = 0;
              cameraRef.current.position.y = THREE.MathUtils.lerp(10.5, 12.2, ease);
              cameraRef.current.position.z = THREE.MathUtils.lerp(16.5, 16.8, ease);
              cameraRef.current.lookAt(0, 0.2, -0.5);
            }
          } else {
            // Outdoor backyard behind-school wide zoom-in
            const ease = progress < 0.5
              ? 4 * progress * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            cameraRef.current.position.x = 0;
            cameraRef.current.position.y = THREE.MathUtils.lerp(27.0, 17.8, ease);
            cameraRef.current.position.z = THREE.MathUtils.lerp(34.0, 25.0, ease);
            cameraRef.current.lookAt(0, 0.2, -2.5);
          }

          if (progress >= 1.0) {
            isMatchIntroActiveRef.current = false;
            setIsMatchIntroActive(false);
          }
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
            // Wide Elevated Broadcast Overview - full court, all 4 players + YOU aura + rear school clearly visible!
            if (venueType === 'indoor') {
              cameraRef.current.position.set(0, 12.2 * zf, 16.8 * zf);
              cameraRef.current.lookAt(0, 0.2, -0.5);
            } else {
              cameraRef.current.position.set(0, 17.8 * zf, 25.0 * zf);
              cameraRef.current.lookAt(0, 0.2, -2.5);
            }
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
        if (liveBall.isLive) {
          // Solve remaining time until y reaches ~0.48m waist strike zone or bounce
          const g = 9.8;
          const targetH = liveBall.y > 0.48 ? 0.48 : 0.22;
          const disc = liveBall.vy * liveBall.vy - 2 * g * (targetH - liveBall.y);
          let tReach = 0.25;
          if (disc >= 0) {
            const t1 = (liveBall.vy + Math.sqrt(disc)) / g;
            if (t1 > 0.02) tReach = Math.min(0.9, t1);
          }
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
            const isReceivingTarget =
              player.id === turnId ||
              liveBall.targetSquare === sq ||
              (interceptX >= bounds.minX - 0.5 &&
                interceptX <= bounds.maxX + 0.5 &&
                interceptZ >= bounds.minZ - 0.5 &&
                interceptZ <= bounds.maxZ + 0.5);

            if (isReceivingTarget) {
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

          const isSwinging = swingAnimsRef.current.has(player.id);
          const stepRate =
            player.id === turnId || liveBall.targetSquare === sq
              ? Math.min(1, delta * 8.2)
              : Math.min(1, delta * 4.2);

          const prevX = grp.position.x;
          const prevZ = grp.position.z;
          const nextX = isSwinging ? prevX : THREE.MathUtils.lerp(prevX, desiredX, stepRate);
          const nextZ = isSwinging ? prevZ : THREE.MathUtils.lerp(prevZ, desiredZ, stepRate);
          grp.position.x = nextX;
          grp.position.z = nextZ;
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
            const fwdX = Math.sin(grp.rotation.y);
            const fwdZ = Math.cos(grp.rotation.y);
            const rightX = Math.cos(grp.rotation.y);
            const rightZ = -Math.sin(grp.rotation.y);
            const handBallX = nextX + fwdX * 0.44 + rightX * 0.16;
            const handBallZ = nextZ + fwdZ * 0.44 + rightZ * 0.16;
            const handBallY = 0.86 + Math.sin(elapsed * 3.5) * 0.025;
            ballMeshRef.current.position.set(handBallX, handBallY, handBallZ);
            ballShadowMeshRef.current.position.set(handBallX, 0.02, handBallZ);
          }
        });
      }

      // 4. Update dynamic inverse-reach palm-strike hitting animations
      swingAnimsRef.current.forEach((anim, playerId) => {
        const pGrp = playerMeshesRef.current.get(playerId);
        if (!pGrp) return;

        const rightArm = pGrp.getObjectByName('rightArm') as THREE.Group;
        const rightForearm = pGrp.getObjectByName('rightForearm') as THREE.Group;
        const leftArm = pGrp.getObjectByName('leftArm') as THREE.Group;
        const leftForearm = pGrp.getObjectByName('leftForearm') as THREE.Group;
        const torso = pGrp.getObjectByName('torsoMesh') as THREE.Object3D;
        const leftLeg = pGrp.getObjectByName('leftLeg') as THREE.Group;
        const rightLeg = pGrp.getObjectByName('rightLeg') as THREE.Group;
        const leftShin = pGrp.getObjectByName('leftShin') as THREE.Group;
        const rightShin = pGrp.getObjectByName('rightShin') as THREE.Group;

        const progress = Math.min(1.0, (performance.now() - anim.startTime) / anim.duration);
        const aimYaw = Math.atan2(
          anim.contactPos.x - pGrp.position.x,
          anim.contactPos.z - pGrp.position.z
        );
        const strikeHeight = THREE.MathUtils.clamp(anim.contactPos.y, 0.35, 1.35);
        // Pitch shoulder angle dynamically to ball height (low scoop vs waist drive vs high chop)
        const reachAngleX = THREE.MathUtils.lerp(-1.15, -2.05, (strikeHeight - 0.35) / 1.0);

        if (progress < 1.0) {
          pGrp.rotation.y = lerpAngle(pGrp.rotation.y, aimYaw, 0.45);
          if (progress < 0.38) {
            const swingT = progress / 0.38;
            const lungeCurve = Math.sin((swingT * Math.PI) / 2);

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
            pGrp.position.y = -lungeCurve * 0.09;
          } else {
            const returnT = (progress - 0.38) / 0.62;
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
            pGrp.position.y = THREE.MathUtils.lerp(-0.09, 0, ease);
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
          pGrp.position.y = 0;
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
              body.position.y = Math.sin(elapsed * 3.0 + idleOffset) * 0.018;
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

      // 6. Referee Sideline Pacing, Gait Leg/Arm Swing & Ball Eye Tracking
      if (refereeMeshRef.current) {
        // Pacing back and forth along east sideline at x = 5.2
        const paceZ = Math.sin(elapsed * 0.45) * 4.2;
        refereeMeshRef.current.position.set(5.2, 0, paceZ);

        // Update referee cylinder collider in physics engine
        globalPhysics.updateCylinderPos('referee', 5.2, paceZ);

        // Orient body towards pacing direction (+Z or -Z)
        const paceSpeed = Math.cos(elapsed * 0.45);
        if (Math.abs(paceSpeed) > 0.05) {
          refereeMeshRef.current.rotation.y = paceSpeed > 0 ? 0 : Math.PI;
        }

        // Animate referee legs and arms walking gait
        const refLeftLeg = refereeMeshRef.current.getObjectByName('leftLeg') as THREE.Group;
        const refRightLeg = refereeMeshRef.current.getObjectByName('rightLeg') as THREE.Group;
        const refLeftArm = refereeMeshRef.current.getObjectByName('leftArm') as THREE.Group;
        const refRightArm = refereeMeshRef.current.getObjectByName('rightArm') as THREE.Group;
        const refHead = refereeMeshRef.current.getObjectByName('headMesh') as THREE.Group;

        const refGait = Math.sin(elapsed * 5.5);
        if (refLeftLeg) refLeftLeg.rotation.x = refGait * 0.45;
        if (refRightLeg) refRightLeg.rotation.x = -refGait * 0.45;
        if (refLeftArm) refLeftArm.rotation.x = -refGait * 0.35;
        if (refRightArm) refRightArm.rotation.x = refGait * 0.35;

        // Head tracks ball position on court
        if (refHead && ballMeshRef.current) {
          const ballPos = ballMeshRef.current.position;
          const localBallX = ballPos.x - 5.2;
          const localBallZ = ballPos.z - paceZ;
          const trackAngle = Math.atan2(localBallX, localBallZ);
          refHead.rotation.y = THREE.MathUtils.clamp(trackAngle, -1.2, 1.2);
        }
      }

      // 7. Spectators Head Ball Tracking & Cheering Animation
      spectatorsRef.current.forEach((spec, idx) => {
        const head = spec.getObjectByName('headMesh') as THREE.Group;
        const armL = spec.getObjectByName('leftArm') as THREE.Group;
        const armR = spec.getObjectByName('rightArm') as THREE.Group;

        if (head && ballMeshRef.current) {
          const ballPos = ballMeshRef.current.position;
          const dx = ballPos.x - spec.position.x;
          const dz = ballPos.z - spec.position.z;
          head.rotation.y = THREE.MathUtils.clamp(Math.atan2(dx, dz) - spec.rotation.y, -1.0, 1.0);
        }

        // Cheering wave motion
        if (idx % 2 === 0 && armL && armR) {
          const cheerT = Math.sin(elapsed * 6 + idx);
          armL.rotation.x = -1.2 + cheerT * 0.3;
          armR.rotation.x = -1.2 - cheerT * 0.3;
        }
      });

      // 8. Dynamic Street Traffic & High-Quality Venue Arrival Animation (with solid exploration colliders & door-safe passenger)
      const arrivalVeh = streetVehiclesRef.current.find((v) => v.isArrival);

      streetVehiclesRef.current.forEach((veh, vehIdx) => {
        if (!veh.isArrival) {
          let actualSpeed = veh.speed;
          if (veh.direction === -1 && arrivalVeh) {
            const distToArrival = veh.mesh.position.x - arrivalVeh.mesh.position.x;
            if (distToArrival > 0 && distToArrival < 16 && arrivalVeh.mesh.position.z < -41.5) {
              actualSpeed = Math.min(veh.speed, 2.5);
            }
          }

          veh.mesh.position.x += veh.direction * actualSpeed * delta;
          if (veh.direction === 1 && veh.mesh.position.x > 38) {
            veh.mesh.position.x = -38;
          } else if (veh.direction === -1 && veh.mesh.position.x < -38) {
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
        } else {
          // High-Quality Tournament Arrival Vehicle on front Maple St (30-second smooth realistic loop)
          const loopT = elapsed % 30;
          let currentSpeed = 0;
          let brakePitch = 0;

          if (loopT < 6.0) {
            const t = loopT / 6.0;
            currentSpeed = THREE.MathUtils.lerp(7.0, 4.0, t);
            veh.mesh.position.x = THREE.MathUtils.lerp(38, 26, t);
            veh.mesh.position.z = -43.4;
            veh.mesh.rotation.y = -Math.PI / 2;

            if (veh.frontWheelL) veh.frontWheelL.rotation.y = 0;
            if (veh.frontWheelR) veh.frontWheelR.rotation.y = 0;
            if (veh.door) veh.door.rotation.y = 0;
            if (veh.taillight) (veh.taillight.material as THREE.MeshBasicMaterial).color.set(0x991b1b);
          } else if (loopT >= 6.0 && loopT < 10.5) {
            const t = (loopT - 6.0) / 4.5;
            currentSpeed = THREE.MathUtils.lerp(4.0, 0, t);
            brakePitch = Math.sin(t * Math.PI) * 0.025;
            veh.mesh.position.x = THREE.MathUtils.lerp(26, 18.0, t);
            veh.mesh.position.z = THREE.MathUtils.lerp(-43.4, -40.4, t);

            const steerAngle = Math.sin(t * Math.PI) * 0.32;
            veh.mesh.rotation.y = -Math.PI / 2 + steerAngle * 0.35;
            if (veh.frontWheelL) veh.frontWheelL.rotation.y = steerAngle;
            if (veh.frontWheelR) veh.frontWheelR.rotation.y = steerAngle;
            if (veh.taillight) (veh.taillight.material as THREE.MeshBasicMaterial).color.set(0xff0000);
            if (veh.door) veh.door.rotation.y = 0;
          } else if (loopT >= 10.5 && loopT < 21.0) {
            // Parked flush in drop-off bay (Door opens 10.5-12.0s; passenger steps out 12.0-14.0s; returns 17.5-19.5s; door shuts 19.5-21.0s)
            currentSpeed = 0;
            veh.mesh.position.set(18.0, 0.15, -40.4);
            veh.mesh.rotation.y = -Math.PI / 2;

            if (veh.frontWheelL) veh.frontWheelL.rotation.y = 0;
            if (veh.frontWheelR) veh.frontWheelR.rotation.y = 0;
            if (veh.taillight) (veh.taillight.material as THREE.MeshBasicMaterial).color.set(0xff0000);

            if (veh.door) {
              if (loopT < 12.0) {
                const openT = Math.min(1.0, (loopT - 10.5) / 1.5);
                veh.door.rotation.y = THREE.MathUtils.lerp(0, -1.15, Math.sin((openT * Math.PI) / 2));
              } else if (loopT >= 19.5) {
                const closeT = Math.min(1.0, (loopT - 19.5) / 1.5);
                veh.door.rotation.y = THREE.MathUtils.lerp(-1.15, 0, closeT);
              } else {
                veh.door.rotation.y = -1.15;
              }
            }
          } else if (loopT >= 21.0 && loopT < 24.5) {
            const t = (loopT - 21.0) / 3.5;
            currentSpeed = THREE.MathUtils.lerp(0, 4.5, t);
            brakePitch = -Math.sin(t * Math.PI) * 0.02;
            if (veh.door) veh.door.rotation.y = 0;

            veh.mesh.position.x = THREE.MathUtils.lerp(18.0, 12.0, t);
            veh.mesh.position.z = THREE.MathUtils.lerp(-40.4, -43.4, t);

            const steerLeft = -Math.sin(t * Math.PI) * 0.28;
            veh.mesh.rotation.y = -Math.PI / 2 + steerLeft * 0.35;
            if (veh.frontWheelL) veh.frontWheelL.rotation.y = steerLeft;
            if (veh.frontWheelR) veh.frontWheelR.rotation.y = steerLeft;
            if (veh.taillight) (veh.taillight.material as THREE.MeshBasicMaterial).color.set(0x991b1b);
          } else {
            const t = (loopT - 24.5) / 5.5;
            currentSpeed = 7.0;
            veh.mesh.position.x = THREE.MathUtils.lerp(12.0, -38.0, t);
            veh.mesh.position.z = -43.4;
            veh.mesh.rotation.y = -Math.PI / 2;

            if (veh.frontWheelL) veh.frontWheelL.rotation.y = 0;
            if (veh.frontWheelR) veh.frontWheelR.rotation.y = 0;
            if (veh.door) veh.door.rotation.y = 0;
            if (veh.taillight) (veh.taillight.material as THREE.MeshBasicMaterial).color.set(0x991b1b);
          }

          if (veh.carBody) {
            veh.carBody.rotation.x = THREE.MathUtils.lerp(veh.carBody.rotation.x, brakePitch, 0.16);
            veh.carBody.position.y = currentSpeed > 0.2 ? Math.sin(elapsed * 16) * 0.01 : 0;
          }

          // Animate passenger cleanly inside cabin seat -> steps out only while door is fully open (12.0s - 19.5s)
          if (veh.passenger) {
            const p = veh.passenger;
            if (loopT < 12.0 || loopT >= 19.5) {
              // Seated cleanly on right passenger seat inside local carBodyGroup
              p.position.set(0.46, 0.17, 0.04);
              p.rotation.set(0, 0, 0);
              p.scale.setScalar(0.84);
              applySeatedDriverPose(p, 1.0, 0);
            } else if (loopT < 13.6) {
              // Step out of seat -> doorway sill (1.12, 0.02, 0.12) -> behind open door onto curb (1.85, -0.15, -0.58)
              const tOut = (loopT - 12.0) / 1.6;
              if (tOut < 0.5) {
                const s = tOut / 0.5;
                p.position.set(
                  THREE.MathUtils.lerp(0.46, 1.15, s),
                  THREE.MathUtils.lerp(0.17, -0.05, s),
                  THREE.MathUtils.lerp(0.04, -0.12, s)
                );
                p.rotation.set(0, THREE.MathUtils.lerp(0, Math.PI / 2, s), 0);
                p.scale.setScalar(THREE.MathUtils.lerp(0.84, 0.88, s));
                applySeatedDriverPose(p, THREE.MathUtils.lerp(1.0, 0.4, s), 0);
              } else {
                const s = (tOut - 0.5) / 0.5;
                p.position.set(
                  THREE.MathUtils.lerp(1.15, 1.85, s),
                  THREE.MathUtils.lerp(-0.05, -0.15, s),
                  THREE.MathUtils.lerp(-0.12, -0.55, s)
                );
                p.rotation.set(0, THREE.MathUtils.lerp(Math.PI / 2, Math.PI, s), 0);
                p.scale.setScalar(THREE.MathUtils.lerp(0.88, 1.0, s));
                applySeatedDriverPose(p, THREE.MathUtils.lerp(0.4, 0, s), 0);
              }
            } else if (loopT < 17.8) {
              // Wait outside clear of open door looking toward schoolyard
              p.position.set(1.85, -0.15, -0.55);
              p.rotation.set(0, Math.PI + Math.sin(elapsed * 1.5) * 0.25, 0);
              p.scale.setScalar(1.0);
              applySeatedDriverPose(p, 0, 0);
            } else {
              // Step cleanly back through open doorway onto passenger seat before door shuts
              const tIn = (loopT - 17.8) / 1.7;
              if (tIn < 0.5) {
                const s = tIn / 0.5;
                p.position.set(
                  THREE.MathUtils.lerp(1.85, 1.15, s),
                  THREE.MathUtils.lerp(-0.15, -0.05, s),
                  THREE.MathUtils.lerp(-0.55, -0.12, s)
                );
                p.rotation.set(0, THREE.MathUtils.lerp(Math.PI, -Math.PI / 2, s), 0);
                p.scale.setScalar(THREE.MathUtils.lerp(1.0, 0.88, s));
                applySeatedDriverPose(p, THREE.MathUtils.lerp(0, 0.4, s), 0);
              } else {
                const s = (tIn - 0.5) / 0.5;
                p.position.set(
                  THREE.MathUtils.lerp(1.15, 0.46, s),
                  THREE.MathUtils.lerp(-0.05, 0.17, s),
                  THREE.MathUtils.lerp(-0.12, 0.04, s)
                );
                p.rotation.set(0, THREE.MathUtils.lerp(-Math.PI / 2, 0, s), 0);
                p.scale.setScalar(THREE.MathUtils.lerp(0.88, 0.84, s));
                applySeatedDriverPose(p, THREE.MathUtils.lerp(0.4, 1.0, s), 0);
              }
            }
          }

          // Dynamic collider for tournament arrival vehicle so explorer never clips through it
          globalPhysics.addBox({
            id: 'arrival-car',
            type: 'car',
            minX: veh.mesh.position.x - 2.25,
            maxX: veh.mesh.position.x + 2.25,
            minZ: veh.mesh.position.z - 1.25,
            maxZ: veh.mesh.position.z + 1.25,
            minY: 0,
            maxY: 2.2,
          });

          if (currentSpeed > 0) {
            const spinDelta = (currentSpeed / 0.38) * delta;
            ['frontWheelLeft', 'frontWheelRight', 'rearWheelLeft', 'rearWheelRight'].forEach((wn) => {
              const wGroup = veh.mesh.getObjectByName(wn);
              const spin = wGroup?.getObjectByName('spinWheel');
              if (spin) spin.rotation.x += spinDelta;
            });
          }
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
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
      ballMeshRef.current.visible = mode !== 'exploration' || true;
    }
    if (ballShadowMeshRef.current) {
      ballShadowMeshRef.current.visible = mode !== 'exploration' || true;
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
    explorer.position.set(localPlayerPos.current[0], 0, localPlayerPos.current[2]);
    explorer.visible = mode === 'exploration';
    sceneRef.current.add(explorer);
    explorerMeshRef.current = explorer;
  }, [customization, mode]);

  // Trigger athletic palm-to-ball strike animation on every hit/serve
  useEffect(() => {
    const hitterId = ballState.lastHitterId;
    const hitCount = ballState.hitCount ?? 0;
    const hitChanged =
      (hitCount > 0 && hitCount !== lastHitCountWatchedRef.current) ||
      (hitterId && hitterId !== lastHitterWatchedRef.current);

    if (hitterId && hitChanged) {
      lastHitterWatchedRef.current = hitterId;
      lastHitCountWatchedRef.current = hitCount;

      const contactPos = new THREE.Vector3(
        ballState.x,
        THREE.MathUtils.clamp(ballState.y, 0.35, 1.35),
        ballState.z
      );
      const grp = playerMeshesRef.current.get(hitterId);
      const vLen = Math.hypot(ballState.vx, ballState.vz) || 1;
      const dirX = ballState.vx / vLen;
      const dirZ = ballState.vz / vLen;

      if (grp) {
        // Ensure striker steps up cleanly into palm-strike reach of the ball if currently further away
        const dist = Math.hypot(contactPos.x - grp.position.x, contactPos.z - grp.position.z);
        if (dist > 0.68) {
          const hitter = players.find((p) => p.id === hitterId);
          const bounds = getSquarePlayBounds(hitter?.rank || 1);
          const strikeDist = 0.48;
          grp.position.x = THREE.MathUtils.clamp(
            contactPos.x - dirX * strikeDist,
            bounds.minX,
            bounds.maxX
          );
          grp.position.z = THREE.MathUtils.clamp(
            contactPos.z - dirZ * strikeDist,
            bounds.minZ,
            bounds.maxZ
          );
        }
      }

      swingAnimsRef.current.set(hitterId, {
        startTime: performance.now(),
        duration: 340,
        hitterId,
        contactPos,
        shotDirX: dirX,
        shotDirZ: dirZ,
      });

      if (sceneRef.current) {
        spawnHitShockwave(sceneRef.current, contactPos, hitShockwavesRef);
      }
    }
  }, [ballState.hitCount, ballState.lastHitterId]);

  // Raycast hover reticle and click targets
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // If dragging to orbit (active in Orbit Mode with primary button/touch, or with right-click)
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
    // In Orbit Mode during exploration, ANY click or drag orbits camera 360 degrees
    if (activeOrbitRef.current && mode === 'exploration') {
      isDraggingRef.current = true;
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Right mouse click (button === 2) -> start rotation drag
    if (e.button === 2) {
      isDraggingRef.current = true;
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    // 1. Match Mode: striking the ball into target square
    if (mode === 'match' && isHumanTurn && e.button === 0) {
      for (const hit of intersects) {
        const obj = hit.object;
        if (obj.name && obj.name.startsWith('courtSquare-')) {
          const sqId = parseInt(obj.name.split('-')[1], 10) as SquareId;
          if (highlightedSquares.includes(sqId)) {
            onSelectTargetSquare(sqId, { x: hit.point.x, z: hit.point.z });
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
      // Check if user clicked an NPC, student at desk, or teacher
      for (const hit of intersects) {
        let cur: THREE.Object3D | null = hit.object;
        while (cur && cur !== sceneRef.current) {
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
                isOpponent: true,
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

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handlePointerLeave = () => {
    isDraggingRef.current = false;
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
    const [px, , pz] = pos;

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
    const dFunnel = Math.hypot(px - (-7.5), pz - 4.2);
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
                  `Want to challenge me to a Four Square match right now?`,
                ],
                tips: `Watch out for high topspin bounces into the corners!`,
                isOpponent: true,
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
        text: 'Press [E] or Click to Enter Oakridge Classrooms & Theory Lessons',
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
      if (ballState.isServing && !ballState.isLive) {
        const sPos = SQUARE_CONFIGS[1].defaultPlayerPos;
        const handX = sPos[0] * 0.88 + 0.31;
        const handZ = sPos[2] * 0.88 - 0.31;
        ballMeshRef.current.position.set(handX, 0.86, handZ);
        ballShadowMeshRef.current.position.set(handX, 0.02, handZ);
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
          grp.position.set(targetX, 0, targetZ);
          grp.lookAt(0, 0.5, 0);
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
      onPointerLeave={handlePointerLeave}
      onWheel={handleWheel}
      className="absolute inset-0 w-full h-full cursor-default overflow-hidden touch-none select-none"
    >
      {/* Dedicated WebGL Mount Canvas Node (Leaf node with zero React children) */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* 10-Second Skippable Match Intro Zoom Overlay */}
      {mode === 'match' && isMatchIntroActive && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="px-4 py-1.5 rounded-full bg-slate-900/95 border border-amber-400 text-amber-300 font-mono text-xs font-bold uppercase tracking-widest shadow-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span>
              {venueType === 'indoor'
                ? `🚪 ENTERING BULLDOG ARENA • WALKING INSIDE (${introCountdown}S)`
                : `STADIUM OVERVIEW • ZOOMING IN (${introCountdown}S)`}
            </span>
          </div>
          <button
            onClick={skipIntro}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_10px_25px_rgba(251,191,36,0.6)] border-2 border-slate-950 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            <span>⚡ SKIP INTRO [SPACE / CLICK]</span>
          </button>
        </div>
      )}

      {/* 5-Second Turn Shot Clock (Strict countdown per hit) */}
      {mode === 'match' && !isMatchIntroActive && activeTurnPlayerId && (
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
              <span>TURN CLOCK:</span>
            </div>
            <div className="font-mono text-base font-black tracking-wider text-amber-400">
              {shotClockSeconds.toFixed(1)}s
            </div>
          </div>
        </div>
      )}

      {/* School Loudspeaker PA Announcement Banner */}
      {paAnnouncement && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="px-5 py-2.5 rounded-2xl bg-slate-900/95 border-2 border-amber-400 text-amber-300 shadow-2xl backdrop-blur-md flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-amber-400 text-slate-950 font-black">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                SCHOOL LOUDSPEAKER PA ANNOUNCEMENT
              </div>
              <div className="text-xs sm:text-sm font-black text-white">
                "{paAnnouncement}"
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exploration Locomotion Mode Switcher (Walk, Run, Bike) */}
      {mode === 'exploration' && (
        <div className="absolute bottom-4 right-4 z-30 pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800 backdrop-blur-md shadow-2xl">
          <button
            onClick={() => { soundFX.playClick(); setLocomotionMode('walk'); }}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
              locomotionMode === 'walk' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            🚶 Walk
          </button>
          <button
            onClick={() => { soundFX.playClick(); setLocomotionMode('run'); }}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
              locomotionMode === 'run' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏃 Run
          </button>
          <button
            onClick={() => { soundFX.playClick(); setLocomotionMode('bike'); }}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
              locomotionMode === 'bike' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            🚲 Cycle
          </button>
        </div>
      )}

      {/* Classroom Interior Modal */}
      <ClassroomModal
        isOpen={isClassroomOpen}
        onClose={() => setIsClassroomOpen(false)}
        onStartMatchWithClassmate={(classmate) => {
          setIsClassroomOpen(false);
          if (onStartMatchWithClassmate) {
            onStartMatchWithClassmate(classmate);
          } else if (onInteractCourt) {
            onInteractCourt();
          }
        }}
        onRewardCoins={onRewardCoins}
      />
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
function setupStaticColliders() {
  // 1. Backyard Red Funnel Ball Pole (behind the school beside the court)
  globalPhysics.addCylinder({
    id: 'funnel-ball-pole',
    type: 'pole',
    x: -7.5,
    z: 4.2,
    radius: 0.5,
    height: 3.5,
    isStatic: true,
  });

  // 2. Backyard Basketball Hoop Pole (west blacktop)
  globalPhysics.addCylinder({
    id: 'hoop-pole',
    type: 'pole',
    x: -11.5,
    z: -2.5,
    radius: 0.45,
    height: 6.0,
    isStatic: true,
  });

  // 3. Enterable Oakridge School Building (z in [-22.0, -8.0], x in [-26.0, 26.0])
  // Open central Front Entrance (x in [-1.8, 1.8], z = -22.0) AND Backyard Exit (x in [-1.8, 1.8], z = -8.0)
  // West Outer Wall
  globalPhysics.addBox({
    id: 'school-wall-west',
    type: 'wall',
    minX: -26.4,
    maxX: -25.6,
    minZ: -22.4,
    maxZ: -7.6,
    minY: 0,
    maxY: 8.0,
  });
  // East Outer Wall
  globalPhysics.addBox({
    id: 'school-wall-east',
    type: 'wall',
    minX: 25.6,
    maxX: 26.4,
    minZ: -22.4,
    maxZ: -7.6,
    minY: 0,
    maxY: 8.0,
  });
  // North Front Entrance Wall (Left & Right of Front Entrance Doors at z = -22.0)
  globalPhysics.addBox({
    id: 'school-wall-front-left',
    type: 'wall',
    minX: -26.0,
    maxX: -1.8,
    minZ: -22.4,
    maxZ: -21.6,
    minY: 0,
    maxY: 8.0,
  });
  globalPhysics.addBox({
    id: 'school-wall-front-right',
    type: 'wall',
    minX: 1.8,
    maxX: 26.0,
    minZ: -22.4,
    maxZ: -21.6,
    minY: 0,
    maxY: 8.0,
  });
  // South Backyard Wall (Left & Right of Backyard Recess Double Doors at z = -8.0)
  globalPhysics.addBox({
    id: 'school-wall-rear-left',
    type: 'wall',
    minX: -26.0,
    maxX: -1.8,
    minZ: -8.4,
    maxZ: -7.6,
    minY: 0,
    maxY: 8.0,
  });
  globalPhysics.addBox({
    id: 'school-wall-rear-right',
    type: 'wall',
    minX: 1.8,
    maxX: 26.0,
    minZ: -8.4,
    maxZ: -7.6,
    minY: 0,
    maxY: 8.0,
  });

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
  globalPhysics.addBox({
    id: 'school-hallway-east',
    type: 'wall',
    minX: 7.2,
    maxX: 8.0,
    minZ: -21.6,
    maxZ: -8.4,
    minY: 0,
    maxY: 6.0,
  });

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
    minZ: -18.5,
    maxZ: -11.5,
    minY: 0,
    maxY: 3.5,
  });

  // 6. Front Curbside Promenade Bench (just inside front school gates)
  globalPhysics.addBox({
    id: 'curbside-bench',
    type: 'bench',
    minX: 0.9,
    maxX: 4.1,
    minZ: -38.0,
    maxZ: -37.0,
    minY: 0,
    maxY: 1.0,
  });

  // 7. West & East Team Pavilion Bleachers flanking the backyard court
  globalPhysics.addBox({
    id: 'west-team-pavilion',
    type: 'wall',
    minX: -11.0,
    maxX: -8.2,
    minZ: -2.0,
    maxZ: 2.0,
    minY: 0,
    maxY: 3.5,
  });
  globalPhysics.addBox({
    id: 'east-team-pavilion',
    type: 'wall',
    minX: 8.2,
    maxX: 11.0,
    minZ: -2.0,
    maxZ: 2.0,
    minY: 0,
    maxY: 3.5,
  });

  // 8. Front Schoolyard Gate & Perimeter Fence Colliders (Grand 13m Wide Central Gateway: x in [-6.5, 6.5], z = -38.5)
  globalPhysics.addBox({
    id: 'fence-front-west',
    type: 'wall',
    minX: -28.0,
    maxX: -6.5,
    minZ: -38.8,
    maxZ: -38.2,
    minY: 0,
    maxY: 3.5,
  });
  globalPhysics.addBox({
    id: 'fence-front-east',
    type: 'wall',
    minX: 6.5,
    maxX: 28.0,
    minZ: -38.8,
    maxZ: -38.2,
    minY: 0,
    maxY: 3.5,
  });

  globalPhysics.addCylinder({
    id: 'gate-pillar-left',
    type: 'pole',
    x: -6.5,
    z: -38.5,
    radius: 0.55,
    height: 3.4,
    isStatic: true,
  });
  globalPhysics.addCylinder({
    id: 'gate-pillar-right',
    type: 'pole',
    x: 6.5,
    z: -38.5,
    radius: 0.55,
    height: 3.4,
    isStatic: true,
  });

  // 9. Backyard Schoolyard Perimeter Chain-Link Fences (bounding the backyard behind the school)
  globalPhysics.addBox({
    id: 'fence-backyard-south',
    type: 'wall',
    minX: -26.5,
    maxX: 26.5,
    minZ: 21.2,
    maxZ: 21.8,
    minY: 0,
    maxY: 3.0,
  });
  globalPhysics.addBox({
    id: 'fence-backyard-west',
    type: 'wall',
    minX: -26.3,
    maxX: -25.7,
    minZ: -8.0,
    maxZ: 21.5,
    minY: 0,
    maxY: 3.0,
  });
  globalPhysics.addBox({
    id: 'fence-backyard-east',
    type: 'wall',
    minX: 25.7,
    maxX: 26.3,
    minZ: -8.0,
    maxZ: 21.5,
    minY: 0,
    maxY: 3.0,
  });

  // 10. Parked Hatchback Car along the front street parking bay (-16.0, 0.15, -40.4)
  globalPhysics.addBox({
    id: 'parked-hatchback-car',
    type: 'car',
    minX: -18.25,
    maxX: -13.75,
    minZ: -41.55,
    maxZ: -39.25,
    minY: 0,
    maxY: 2.2,
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
  gymDoorsRef?: React.MutableRefObject<{ left: THREE.Group; right: THREE.Group } | null>
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
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 32) {
        ctx.fillStyle = y % 64 === 0 ? '#fde047' : '#eab308';
        ctx.fillRect(0, y, 512, 30);
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, y, 512, 32);
      }
      // Paint basketball key arcs on hardwood in navy
      ctx.strokeStyle = 'rgba(30, 58, 138, 0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(256, 256, 180, 0, Math.PI * 2);
      ctx.stroke();
    });
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(10, 10);

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.28,
      metalness: 0.12,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.name = 'indoorHardwoodGround';
    ground.receiveShadow = true;
    scene.add(ground);

    const gymGroup = new THREE.Group();
    const gymWallMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.85 });
    const gymPadMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.5 }); // blue safety padding

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

    // Build Cheering Bleacher Fans inside the Gym!
    const indoorFanColors = ['#2563eb', '#f59e0b', '#dc2626', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
    for (let f = 0; f < 8; f++) {
      const isWestSide = f < 4;
      const tierIndex = f % 3;
      const fanX = isWestSide ? -13.5 - tierIndex * 0.9 : 13.5 + tierIndex * 0.9;
      const fanY = 0.5 + tierIndex * 0.75;
      const fanZ = (f % 4 - 1.5) * 3.8;

      const fanMesh = buildSpectatorPerson({
        shirtColor: indoorFanColors[f % indoorFanColors.length],
        cheering: true,
      });
      fanMesh.position.set(fanX, fanY, fanZ);
      fanMesh.lookAt(0, 0.5, 0);
      scene.add(fanMesh);
      spectatorsRef.current.push(fanMesh);
    }

    return; // EXCLUSIVELY INDOOR! Early return prevents any outdoor props from loading
  }

  // =============================================================
  // OUTDOOR BLACKTOP & SCHOOLYARD (COURT BEHIND OAKRIDGE SCHOOL)
  // Layout from -Z to +Z:
  //   Houses (-52) -> Street (-44.2) -> Gate (-38.5) -> Front Courtyard (-30)
  //   -> School (-22..-8) -> Backyard Recess Blacktop & Four Square Court (0) -> Backyard Park (+21.5)
  // =============================================================
  // 1. Expansive Asphalt Ground covering street, front courtyard, school, and backyard court
  const groundGeo = new THREE.PlaneGeometry(110, 120);
  groundGeo.rotateX(-Math.PI / 2);

  const groundTex = createSafeCanvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? '#475569' : '#94a3b8';
      ctx.fillRect(x, y, 2, 2);
    }
  });
  groundTex.wrapS = THREE.RepeatWrapping;
  groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(22, 24);

  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.92,
    metalness: 0.05,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.name = 'asphaltGround';
  ground.position.set(0, 0, -14);
  ground.receiveShadow = true;
  scene.add(ground);

  // 2. Iconic Backyard RED FUNNEL BALL (west edge of the Four Square court)
  const funnelGroup = new THREE.Group();
  funnelGroup.position.set(-7.5, 0, 4.2);

  const funnelPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 3.2, 16),
    new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.7, roughness: 0.3 })
  );
  funnelPole.position.y = 1.6;
  funnelPole.castShadow = true;
  funnelGroup.add(funnelPole);

  const funnelBowl = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 0.45, 1.4, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4, side: THREE.DoubleSide })
  );
  funnelBowl.position.y = 3.6;
  funnelBowl.castShadow = true;
  funnelGroup.add(funnelBowl);

  for (let c = 0; c < 4; c++) {
    const angle = (c * Math.PI) / 2;
    const chute = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.22, 0.6, 12).rotateX(Math.PI / 3),
      new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.5 })
    );
    chute.position.set(Math.cos(angle) * 0.45, 2.9, Math.sin(angle) * 0.45);
    chute.rotation.y = angle;
    funnelGroup.add(chute);
  }
  scene.add(funnelGroup);

  // 3. Enterable Grand Academic School Building, Front Courtyard Plaza & Rear Backyard Exit
  const schoolGroup = new THREE.Group();

  const brickMat = new THREE.MeshStandardMaterial({ color: '#c2410c', roughness: 0.85 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.55 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.65 });
  const windowMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.15, metalness: 0.8 });

  // -------------------------------------------------------------
  // A. FRONT COURTYARD PLAZA & GREEN LAWN QUADS (in front of school, z in [-38, -22])
  // -------------------------------------------------------------
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
  paverTex.repeat.set(16, 12);

  const courtyardPlaza = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 16).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: paverTex, roughness: 0.8 })
  );
  courtyardPlaza.name = 'asphaltGround';
  courtyardPlaza.position.set(0, 0.015, -30.0);
  courtyardPlaza.receiveShadow = true;
  schoolGroup.add(courtyardPlaza);

  const grassMat = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.9 });
  [-16.0, 16.0].forEach((lx) => {
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(12.0, 12.0).rotateX(-Math.PI / 2), grassMat);
    lawn.position.set(lx, 0.025, -30.0);
    lawn.receiveShadow = true;
    schoolGroup.add(lawn);

    const lawnCurb = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.2, 12.2), stoneMat);
    lawnCurb.position.set(lx, 0.1, -30.0);
    schoolGroup.add(lawnCurb);
  });

  // Campus Shade Trees (Front Courtyard + Backyard Park Borders)
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#78350f' });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.8 });
  [
    // Front Courtyard Trees
    [-18.0, -34.0],
    [-14.0, -25.0],
    [14.0, -25.0],
    [18.0, -34.0],
    // Backyard Recess Yard Perimeter Trees (behind school, flanking the court cleanly)
    [-21.0, -4.0],
    [21.0, -4.0],
    [-21.0, 12.0],
    [21.0, 12.0],
    [-14.0, 23.0],
    [0.0, 23.5],
    [14.0, 23.0],
  ].forEach(([tx, tz]) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.8, 8), trunkMat);
    trunk.position.set(tx, 1.4, tz);
    trunk.castShadow = true;

    const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8), leafMat);
    foliage.position.set(tx, 3.6, tz);
    foliage.castShadow = true;
    schoolGroup.add(trunk, foliage);
  });

  // Front Courtyard Benches & Lamps
  const benchMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.7 });
  [
    [-8.5, -28.0],
    [8.5, -28.0],
    [-8.5, -34.0],
    [8.5, -34.0],
  ].forEach(([bx, bz]) => {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.6), benchMat);
    bench.position.set(bx, 0.25, bz);
    bench.castShadow = true;
    schoolGroup.add(bench);
  });

  const lampMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.85 });
  const lanternMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
  [
    [-8.5, -30.0],
    [8.5, -30.0],
    [-8.5, -36.0],
    [8.5, -36.0],
  ].forEach(([lx, lz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8), lampMat);
    pole.position.set(lx, 1.6, lz);
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), lanternMat);
    lantern.position.set(lx, 3.2, lz);
    schoolGroup.add(pole, lantern);
  });

  // Backyard Park Lawn Strip beyond the rear chain-link fence (z = 21.5..26.5)
  const backyardLawn = new THREE.Mesh(new THREE.PlaneGeometry(68, 8).rotateX(-Math.PI / 2), grassMat);
  backyardLawn.position.set(0, 0.02, 25.5);
  backyardLawn.receiveShadow = true;
  schoolGroup.add(backyardLawn);

  // -------------------------------------------------------------
  // B. GRAND 2-STORY ACADEMIC SCHOOL BUILDING (z = -22.0 Front .. -8.0 Backyard)
  // -------------------------------------------------------------
  // West Outer Wall
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8.0, 14.4), brickMat);
  westWall.position.set(-26.0, 4.0, -15.0);
  westWall.castShadow = true;
  westWall.receiveShadow = true;
  schoolGroup.add(westWall);

  // East Outer Wall
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8.0, 14.4), brickMat);
  eastWall.position.set(26.0, 4.0, -15.0);
  eastWall.castShadow = true;
  eastWall.receiveShadow = true;
  schoolGroup.add(eastWall);

  // Front Entrance Wall at z = -22.0 (facing street/courtyard -Z, open central doorway [-1.8, 1.8])
  const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(24.2, 8.0, 0.8), brickMat);
  frontLeft.position.set(-13.9, 4.0, -22.0);
  frontLeft.castShadow = true;
  frontLeft.receiveShadow = true;
  const frontRight = new THREE.Mesh(new THREE.BoxGeometry(24.2, 8.0, 0.8), brickMat);
  frontRight.position.set(13.9, 4.0, -22.0);
  frontRight.castShadow = true;
  frontRight.receiveShadow = true;
  const frontLintel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.8, 0.8), brickMat);
  frontLintel.position.set(0, 6.1, -22.0);
  schoolGroup.add(frontLeft, frontRight, frontLintel);

  // Rear Backyard Wall at z = -8.0 (facing the Four Square Court +Z, open backyard recess doors [-1.8, 1.8])
  const rearLeft = new THREE.Mesh(new THREE.BoxGeometry(24.2, 8.0, 0.8), brickMat);
  rearLeft.position.set(-13.9, 4.0, -8.0);
  rearLeft.castShadow = true;
  rearLeft.receiveShadow = true;
  const rearRight = new THREE.Mesh(new THREE.BoxGeometry(24.2, 8.0, 0.8), brickMat);
  rearRight.position.set(13.9, 4.0, -8.0);
  rearRight.castShadow = true;
  rearRight.receiveShadow = true;
  const rearLintel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.8, 0.8), brickMat);
  rearLintel.position.set(0, 6.1, -8.0);
  schoolGroup.add(rearLeft, rearRight, rearLintel);

  // Classroom Windows with Stone Sills on BOTH Front (-22.42) and Rear Backyard (-7.58) Facades
  for (let wx = -23; wx <= 23; wx += 3.6) {
    if (Math.abs(wx) < 3.2) continue;

    // Front Facade Windows (-Z)
    const fWin1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 0.15), windowMat);
    fWin1.position.set(wx, 2.4, -22.42);
    const fSill1 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.35), stoneMat);
    fSill1.position.set(wx, 1.3, -22.42);
    const fWin2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 0.15), windowMat);
    fWin2.position.set(wx, 5.6, -22.42);
    const fSill2 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.35), stoneMat);
    fSill2.position.set(wx, 4.5, -22.42);

    // Rear Backyard Facade Windows (+Z overlooking Four Square court)
    const rWin1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 0.15), windowMat);
    rWin1.position.set(wx, 2.4, -7.58);
    const rSill1 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.35), stoneMat);
    rSill1.position.set(wx, 1.3, -7.58);
    const rWin2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 0.15), windowMat);
    rWin2.position.set(wx, 5.6, -7.58);
    const rSill2 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.35), stoneMat);
    rSill2.position.set(wx, 4.5, -7.58);

    schoolGroup.add(fWin1, fSill1, fWin2, fSill2, rWin1, rSill1, rWin2, rSill2);
  }

  // Grand Stone Entrance Portico & Steps on Front Facade (z = -22..-25, facing courtyard)
  const portico = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.45, 3.2), stoneMat);
  portico.position.set(0, 4.4, -23.4);
  schoolGroup.add(portico);
  [-2.2, 2.2].forEach((cx) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 4.2, 12), stoneMat);
    col.position.set(cx, 2.1, -24.4);
    schoolGroup.add(col);
  });
  for (let s = 0; s < 4; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(5.4 - s * 0.4, 0.25, 0.8), stoneMat);
    step.position.set(0, 0.125 + s * 0.25, -24.6 + s * 0.7);
    step.receiveShadow = true;
    schoolGroup.add(step);
  }

  // Backyard Recess Canopy, Stone Threshold & Steps behind the school (z = -8..-6.2, overlooking court)
  const rearCanopy = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.26, 2.2),
    new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.45 })
  );
  rearCanopy.position.set(0, 4.2, -6.8);
  rearCanopy.castShadow = true;
  schoolGroup.add(rearCanopy);
  [-2.1, 2.1].forEach((cx) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.0, 10), stoneMat);
    col.position.set(cx, 2.0, -6.2);
    schoolGroup.add(col);
  });
  for (let s = 0; s < 2; s++) {
    const rearStep = new THREE.Mesh(new THREE.BoxGeometry(4.6 - s * 0.4, 0.16, 0.65), stoneMat);
    rearStep.position.set(0, 0.08 + s * 0.12, -6.6 - s * 0.6);
    rearStep.receiveShadow = true;
    schoolGroup.add(rearStep);
  }

  // Open Double Glass Doorway Frames (warm golden welcome glow on both Front & Backyard sides)
  const rearDoorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 3.8),
    new THREE.MeshBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0.42 })
  );
  rearDoorGlow.position.set(0, 2.1, -7.95);
  const frontDoorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 3.8),
    new THREE.MeshBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0.42 })
  );
  frontDoorGlow.position.set(0, 2.1, -22.05);
  frontDoorGlow.rotation.y = Math.PI;
  schoolGroup.add(rearDoorGlow, frontDoorGlow);

  // Rear Schoolyard Details: Metal Bicycle Rack (+5.6, -6.8) & School Recycling/Trash Bins (-5.8, -6.8)
  const rackMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.85, roughness: 0.25 });
  const rackBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.9), rackMat);
  rackBase.position.set(5.6, 0.04, -6.8);
  schoolGroup.add(rackBase);
  for (let r = 0; r < 5; r++) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 8, 16, Math.PI), rackMat);
    loop.position.set(4.6 + r * 0.5, 0.08, -6.8);
    loop.rotation.y = Math.PI / 2;
    schoolGroup.add(loop);
  }
  const trashBin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.28, 0.9, 14),
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.7 })
  );
  trashBin.position.set(-5.8, 0.45, -6.8);
  const recycleBin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.28, 0.9, 14),
    new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.6 })
  );
  recycleBin.position.set(-6.7, 0.45, -6.8);
  schoolGroup.add(trashBin, recycleBin);

  // Terracotta Pitched Roof & Clock Tower Cupola centered above school (z = -15.0)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(53.6, 1.4, 15.6), roofMat);
  roof.position.set(0, 8.7, -15.0);
  schoolGroup.add(roof);

  const clockTower = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.2, 3.6), stoneMat);
  clockTower.position.set(0, 10.8, -15.0);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.8, 4), roofMat);
  spire.position.set(0, 14.6, -15.0);
  spire.rotation.y = Math.PI / 4;
  schoolGroup.add(clockTower, spire);

  // Front Banner facing Courtyard (-Z)
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
    bctx.font = 'bold 30px sans-serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText('★ OAKRIDGE FOUR SQUARE ACADEMY ★', 256, 64);
  }
  const bannerTex = new THREE.CanvasTexture(bannerCanvas);
  const frontBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 1.6),
    new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.4 })
  );
  frontBanner.position.set(0, 5.8, -22.45);
  frontBanner.rotation.y = Math.PI;
  schoolGroup.add(frontBanner);

  // Rear Backyard Championship Sign facing the outdoor Four Square Court (+Z)
  const rearSignTex = createSafeCanvasTexture(512, 128, (rctx2) => {
    rctx2.fillStyle = '#0f172a';
    rctx2.fillRect(0, 0, 512, 128);
    rctx2.strokeStyle = '#fbbf24';
    rctx2.lineWidth = 6;
    rctx2.strokeRect(4, 4, 504, 120);
    rctx2.fillStyle = '#fbbf24';
    rctx2.font = 'bold 28px sans-serif';
    rctx2.textAlign = 'center';
    rctx2.textBaseline = 'middle';
    rctx2.fillText('OAKRIDGE RECESS YARD', 256, 46);
    rctx2.fillStyle = '#ffffff';
    rctx2.font = 'bold 20px sans-serif';
    rctx2.fillText('BACKYARD FOUR SQUARE COURTS', 256, 88);
  });
  const rearBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 1.6),
    new THREE.MeshStandardMaterial({ map: rearSignTex, roughness: 0.4 })
  );
  rearBanner.position.set(0, 5.8, -7.55);
  schoolGroup.add(rearBanner);

  // -------------------------------------------------------------
  // C. ENTERABLE INTERIOR CORRIDOR & LOCKER HALLWAY (z in [-21.6, -8.4])
  // -------------------------------------------------------------
  const westHallWallFront = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.5, 4.2), brickMat);
  westHallWallFront.position.set(-7.6, 3.25, -19.6);
  const westHallWallRear = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.5, 4.4), brickMat);
  westHallWallRear.position.set(-7.6, 3.25, -10.5);
  const westDoorLintel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 5.0), brickMat);
  westDoorLintel.position.set(-7.6, 5.25, -15.1);

  const eastHallWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.5, 13.6), brickMat);
  eastHallWall.position.set(7.6, 3.25, -15.0);
  schoolGroup.add(westHallWallFront, westHallWallRear, westDoorLintel, eastHallWall);

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
    new THREE.BoxGeometry(0.8, 3.2, 6.0),
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 })
  );
  trophyCase.position.set(6.8, 1.6, -15.0);
  schoolGroup.add(trophyCase);

  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.15, 0.8, 16),
    new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.95, roughness: 0.1 })
  );
  cup.position.set(6.2, 2.0, -15.0);
  schoolGroup.add(cup);

  // Hallway Students in Corridor
  const hallwayMaya = buildHallwayStudent(CHARACTERS[3] || CHARACTERS[1], 'holding_ball');
  hallwayMaya.position.set(3.8, 0, -17.5);
  hallwayMaya.rotation.y = -Math.PI / 2;
  schoolGroup.add(hallwayMaya);

  const hallwayAlex = buildHallwayStudent(CHARACTERS[7] || CHARACTERS[0], 'locker_lean');
  hallwayAlex.position.set(-6.1, 0, -19.5);
  hallwayAlex.rotation.y = Math.PI / 2;
  schoolGroup.add(hallwayAlex);

  // -------------------------------------------------------------
  // D. WALK-IN CLASSROOM ROOM 101 (WEST WING, z in [-21.6, -8.4])
  // -------------------------------------------------------------
  const classFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(17.6, 13.2).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 })
  );
  classFloor.name = 'classroomFloor';
  classFloor.position.set(-16.4, 0.035, -15.0);
  classFloor.receiveShadow = true;
  schoolGroup.add(classFloor);

  // Green Chalkboard on Rear Classroom Wall (-8.6) facing students (-Z)
  const classBoardCanvas = document.createElement('canvas');
  classBoardCanvas.width = 1024;
  classBoardCanvas.height = 512;
  const cbctx = classBoardCanvas.getContext('2d');
  if (cbctx) {
    cbctx.fillStyle = '#064e3b';
    cbctx.fillRect(0, 0, 1024, 512);
    cbctx.strokeStyle = '#78350f';
    cbctx.lineWidth = 14;
    cbctx.strokeRect(6, 6, 1012, 500);

    cbctx.fillStyle = '#ffffff';
    cbctx.font = 'bold 36px monospace';
    cbctx.fillText('FOUR SQUARE THEORY: 45° CORNER CUT', 40, 60);

    cbctx.strokeStyle = '#fbbf24';
    cbctx.lineWidth = 4;
    cbctx.strokeRect(360, 100, 300, 300);
    cbctx.beginPath();
    cbctx.moveTo(510, 100);
    cbctx.lineTo(510, 400);
    cbctx.moveTo(360, 250);
    cbctx.lineTo(660, 250);
    cbctx.stroke();

    cbctx.fillStyle = '#fef08a';
    cbctx.font = 'bold 26px sans-serif';
    cbctx.fillText('1 (KING)', 390, 180);
    cbctx.fillText('2', 580, 180);
    cbctx.fillText('3', 580, 340);
    cbctx.fillText('4 (ACE)', 390, 340);

    cbctx.strokeStyle = '#ef4444';
    cbctx.lineWidth = 6;
    cbctx.beginPath();
    cbctx.moveTo(440, 180);
    cbctx.lineTo(590, 330);
    cbctx.stroke();

    cbctx.fillStyle = '#93c5fd';
    cbctx.font = '22px monospace';
    cbctx.fillText('• Square 1 Serves diagonally to 4', 40, 440);
    cbctx.fillText('• Underhand strike below waist', 40, 475);
  }
  const classBoardTex = new THREE.CanvasTexture(classBoardCanvas);
  const classBoard = new THREE.Mesh(
    new THREE.BoxGeometry(9.0, 3.2, 0.1),
    new THREE.MeshStandardMaterial({ map: classBoardTex, roughness: 0.35 })
  );
  classBoard.position.set(-16.0, 3.4, -8.6);
  classBoard.rotation.y = Math.PI;
  schoolGroup.add(classBoard);

  // Teacher Coach Leo at the Chalkboard Teaching
  const classTeacher = buildTeacherInstructor('Coach Leo', 'Four Square Head Instructor');
  classTeacher.position.set(-11.8, 0, -10.4);
  classTeacher.rotation.y = Math.PI - 0.25;
  schoolGroup.add(classTeacher);

  // Teacher Podium with Red Voit Rubber Ball
  const classPodium = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.1, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 })
  );
  classPodium.position.set(-14.2, 0.55, -10.4);
  const classRedBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 })
  );
  classRedBall.position.set(-14.2, 1.34, -10.4);
  schoolGroup.add(classPodium, classRedBall);

  // 6 Student Desks with Seated Kids facing the chalkboard (+Z toward -8.6)
  const classStudents = [
    CHARACTERS[0], // Toby "Patch"
    CHARACTERS[1], // Blocky
    CHARACTERS[2], // Skater Roxy
    CHARACTERS[4], // Gloop Slime King
    CHARACTERS[5], // Nova
    CHARACTERS[6], // Ren
  ];
  const deskCoords = [
    { x: -12.2, z: -13.6, c: classStudents[0] },
    { x: -15.8, z: -13.6, c: classStudents[1] },
    { x: -19.4, z: -13.6, c: classStudents[2] },
    { x: -12.2, z: -17.4, c: classStudents[3] },
    { x: -15.8, z: -17.4, c: classStudents[4] },
    { x: -19.4, z: -17.4, c: classStudents[5] },
  ];
  deskCoords.forEach((d) => {
    const sDesk = buildSeatedStudent(d.c, { deskWidth: 1.3, deskDepth: 0.75 });
    sDesk.position.set(d.x, 0, d.z);
    schoolGroup.add(sDesk);
  });

  // Other Classroom Doors inside Hallway
  const createClassDoor = (_label: string, x: number, z: number, rotY: number) => {
    const doorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 3.2, 0.1),
      new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.6 })
    );
    doorMesh.position.set(x, 1.6, z);
    doorMesh.rotation.y = rotY;
    schoolGroup.add(doorMesh);
  };
  createClassDoor('Room 102 (Science)', -7.1, -9.8, Math.PI / 2);
  createClassDoor('Principal Office', 7.1, -18.5, -Math.PI / 2);

  scene.add(schoolGroup);

  // -------------------------------------------------------------
  // Front Perimeter Fence, Front Gates & Maple Street Drop-Off (in front of school)
  // -------------------------------------------------------------
  const gateGroup = new THREE.Group();
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });

  // Wrought Iron Front Fence along z = -38.5
  [-28, -22, -16, -10].forEach((fx) => {
    const fenceSection = new THREE.Group();
    for (let bar = 0; bar < 8; bar++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 8), fenceMat);
      p.position.set(fx + bar * 0.7, 1.6, -38.5);
      fenceSection.add(p);
    }
    gateGroup.add(fenceSection);
  });
  [7.2, 13, 19, 25].forEach((fx) => {
    const fenceSection = new THREE.Group();
    for (let bar = 0; bar < 8; bar++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 8), fenceMat);
      p.position.set(fx + bar * 0.7, 1.6, -38.5);
      fenceSection.add(p);
    }
    gateGroup.add(fenceSection);
  });

  // Backyard Chain-Link Fence framing the recess court (behind the school at z = +21.5 and x = ±26.0)
  const chainLinkMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.75, roughness: 0.35 });
  for (let bx = -26; bx <= 26; bx += 3.25) {
    const fPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), chainLinkMat);
    fPost.position.set(bx, 1.3, 21.5);
    gateGroup.add(fPost);
  }
  const topRailBack = new THREE.Mesh(new THREE.BoxGeometry(52.0, 0.07, 0.07), chainLinkMat);
  topRailBack.position.set(0, 2.55, 21.5);
  const meshBack = new THREE.Mesh(
    new THREE.PlaneGeometry(52.0, 2.5),
    new THREE.MeshBasicMaterial({ color: '#94a3b8', wireframe: true, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
  );
  meshBack.position.set(0, 1.3, 21.5);
  gateGroup.add(topRailBack, meshBack);

  [-26.0, 26.0].forEach((sx) => {
    for (let bz = -8; bz <= 21.5; bz += 3.7) {
      const sPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), chainLinkMat);
      sPost.position.set(sx, 1.3, bz);
      gateGroup.add(sPost);
    }
    const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 29.5), chainLinkMat);
    sideRail.position.set(sx, 2.55, 6.75);
    const sideMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(29.5, 2.5),
      new THREE.MeshBasicMaterial({ color: '#94a3b8', wireframe: true, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
    );
    sideMesh.position.set(sx, 1.3, 6.75);
    sideMesh.rotation.y = Math.PI / 2;
    gateGroup.add(sideRail, sideMesh);
  });

  // Front Brick Gate Entrance Pillars (at x = ±6.5, z = -38.5)
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.8 });
  const pillarL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.6, 1.2), pillarMat);
  pillarL.position.set(-6.5, 1.8, -38.5);
  pillarL.castShadow = true;
  const pillarR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.6, 1.2), pillarMat);
  pillarR.position.set(6.5, 1.8, -38.5);
  pillarR.castShadow = true;

  const gateLanternMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 });
  const lanternL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.45), gateLanternMat);
  lanternL.position.set(-6.5, 3.9, -38.5);
  const lanternR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.45), gateLanternMat);
  lanternR.position.set(6.5, 3.9, -38.5);

  const openGateL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 2.8), fenceMat);
  openGateL.position.set(-6.4, 1.4, -37.0);
  const openGateR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 2.8), fenceMat);
  openGateR.position.set(6.4, 1.4, -37.0);

  const archCanvas = document.createElement('canvas');
  archCanvas.width = 512;
  archCanvas.height = 128;
  const actx = archCanvas.getContext('2d');
  if (actx) {
    actx.fillStyle = '#1e3a8a';
    actx.fillRect(0, 0, 512, 128);
    actx.strokeStyle = '#f59e0b';
    actx.lineWidth = 6;
    actx.strokeRect(4, 4, 504, 120);
    actx.fillStyle = '#fbbf24';
    actx.font = 'bold 30px sans-serif';
    actx.textAlign = 'center';
    actx.fillText('★ OAKRIDGE ACADEMY FRONT GATE ★', 256, 52);
    actx.font = 'bold 20px sans-serif';
    actx.fillStyle = '#ffffff';
    actx.fillText('RECESS COURTS THROUGH SCHOOLYARD', 256, 95);
  }
  const archTex = new THREE.CanvasTexture(archCanvas);
  const archBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(12.5, 1.8),
    new THREE.MeshStandardMaterial({ map: archTex, roughness: 0.4 })
  );
  archBanner.position.set(0, 4.6, -38.5);
  archBanner.rotation.y = Math.PI;
  gateGroup.add(pillarL, pillarR, lanternL, lanternR, openGateL, openGateR, archBanner);

  // Outer Street Asphalt Road in Front of School Gates (z = -44.2)
  const frontRoad = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 11.0).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
  );
  frontRoad.position.set(0, 0.01, -44.2);
  frontRoad.receiveShadow = true;
  gateGroup.add(frontRoad);

  const streetCurb = new THREE.Mesh(
    new THREE.BoxGeometry(80, 0.2, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 })
  );
  streetCurb.position.set(0, 0.1, -39.0);
  streetCurb.receiveShadow = true;
  gateGroup.add(streetCurb);

  const solidYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const solidLine1 = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.12).rotateX(-Math.PI / 2), solidYellowMat);
  solidLine1.position.set(0, 0.02, -44.52);
  const solidLine2 = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.12).rotateX(-Math.PI / 2), solidYellowMat);
  solidLine2.position.set(0, 0.02, -44.68);
  gateGroup.add(solidLine1, solidLine2);

  const solidWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const whiteEdge1 = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.14).rotateX(-Math.PI / 2), solidWhiteMat);
  whiteEdge1.position.set(0, 0.02, -40.2);
  const whiteEdge2 = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.14).rotateX(-Math.PI / 2), solidWhiteMat);
  whiteEdge2.position.set(0, 0.02, -49.0);
  gateGroup.add(whiteEdge1, whiteEdge2);

  const parkedCar = buildRoadTripCar('#475569');
  parkedCar.position.set(-16.0, 0.15, -40.4);
  parkedCar.rotation.y = Math.PI / 2;
  gateGroup.add(parkedCar);

  scene.add(gateGroup);

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

    const carArrival = buildRoadTripCar('#eab308');
    carArrival.position.set(38.0, 0.15, -43.4);
    carArrival.rotation.y = -Math.PI / 2;
    const arrivalBody = (carArrival.getObjectByName('carBodyGroup') as THREE.Group) || carArrival;
    const arrivalPassenger = buildCharacterMesh(CHARACTERS[2]);
    arrivalPassenger.scale.setScalar(0.84);
    arrivalPassenger.position.set(0.46, 0.17, 0.04);
    applySeatedDriverPose(arrivalPassenger, 1.0, 0);
    arrivalBody.add(arrivalPassenger);
    scene.add(carArrival);
    streetVehiclesRef.current.push({
      mesh: carArrival,
      carBody: arrivalBody,
      passenger: arrivalPassenger,
      speed: 6.0,
      laneZ: -43.4,
      direction: -1,
      isArrival: true,
      frontWheelL: carArrival.getObjectByName('frontWheelLeft') as THREE.Group,
      frontWheelR: carArrival.getObjectByName('frontWheelRight') as THREE.Group,
      door: carArrival.getObjectByName('passengerDoor') as THREE.Group,
      taillight: carArrival.getObjectByName('taillight') as THREE.Mesh,
    });
  }

  // 4. Backyard Playground Basketball Hoop (west blacktop behind school)
  const hoopGroup = new THREE.Group();
  hoopGroup.position.set(-11.5, 0, -2.5);
  const hoopPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 5.5, 16),
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 })
  );
  hoopPole.position.y = 2.75;
  hoopPole.castShadow = true;
  hoopGroup.add(hoopPole);

  const backboard = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.6, 0.1),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 })
  );
  backboard.position.set(0.6, 4.8, 0);
  hoopGroup.add(backboard);

  const orangeRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.04, 8, 24).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.4 })
  );
  orangeRim.position.set(1.1, 4.4, 0);
  hoopGroup.add(orangeRim);
  scene.add(hoopGroup);

  // 5. Suburban Neighborhood Houses across the front street (z = -52)
  for (let h = -24; h <= 24; h += 8) {
    const house = createSuburbanHouse(h % 2 === 0 ? '#334155' : '#475569');
    house.position.set(h, 0, -52);
    scene.add(house);
  }

  // Utility Poles along Maple Street
  [-16, 0, 16].forEach((tx) => {
    const telPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 9.0, 12),
      new THREE.MeshStandardMaterial({ color: '#52341b', roughness: 0.9 })
    );
    telPole.position.set(tx, 4.5, -46);
    telPole.castShadow = true;
    scene.add(telPole);
  });

  // 6. Front Curbside Seating & Drop-Off Promenade
  const curbsideZone = createCurbsidePromenade();
  scene.add(curbsideZone);

  // 7. West Team Pavilion (flanking the backyard court at x = -9.6)
  const westPavilion = createTeamPavilion('★ WEST CONTENDERS PAVILION ★', '#1e3a8a', '#1d4ed8');
  westPavilion.position.set(-9.6, 0, 0);
  westPavilion.rotation.y = Math.PI / 2;
  scene.add(westPavilion);

  // 8. East Team Pavilion (flanking the backyard court at x = +9.6)
  const eastPavilion = createTeamPavilion('★ EAST CHAMPIONS PAVILION ★', '#7c2d12', '#b91c1c');
  eastPavilion.position.set(9.6, 0, 0);
  eastPavilion.rotation.y = -Math.PI / 2;
  scene.add(eastPavilion);

  // 9. Low Sideline Boundary Guides (clear open backyard view at x = ±6.4)
  [-6.4, 6.4].forEach((nx) => {
    const net = new THREE.Mesh(
      new THREE.PlaneGeometry(11.0, 2.2),
      new THREE.MeshBasicMaterial({ color: '#94a3b8', wireframe: true, transparent: true, opacity: 0.28 })
    );
    net.position.set(nx, 1.1, 0);
    net.rotation.y = Math.PI / 2;
    scene.add(net);
  });

  // 10. Official Tournament Referee
  const refPerson = buildRefereeModel();
  refPerson.position.set(5.6, 0, 4.4);
  refPerson.lookAt(0, 0.5, 0);
  scene.add(refPerson);
  refereeMeshRef.current = refPerson;

  globalPhysics.addCylinder({
    id: 'referee',
    type: 'person',
    x: 5.6,
    z: 4.4,
    radius: 0.45,
    height: 1.8,
    isStatic: true,
  });

  const spectatorConfigs = [
    // West Team Bleachers (x = -9.3)
    { x: -9.3, z: -1.6, shirt: 0xf43f5e, pants: 0x1e293b, skin: 0xf2d6b3, hair: 0x1e293b, cheering: true },
    { x: -9.3, z: -0.5, shirt: 0x10b981, pants: 0x334155, skin: 0xb45309, hair: 0x09090b, hasHat: true },
    { x: -9.3, z: 0.6, shirt: 0x3b82f6, pants: 0x0f172a, skin: 0xffdbac, hair: 0xd97706, cheering: true },
    { x: -9.3, z: 1.8, shirt: 0xf59e0b, pants: 0x475569, skin: 0xc68642, hair: 0x1e293b, cheering: false },
    // East Champions Bleachers (x = +9.3)
    { x: 9.3, z: -1.5, shirt: 0x8b5cf6, pants: 0x1e1b4b, skin: 0xe0ac69, hair: 0x7c2d12, cheering: true },
    { x: 9.3, z: -0.3, shirt: 0xec4899, pants: 0x1e293b, skin: 0xfbbf24, hair: 0x78350f, hasHat: true },
    { x: 9.3, z: 0.9, shirt: 0x06b6d4, pants: 0x334155, skin: 0x8d5524, hair: 0x09090b, cheering: true },
    { x: 9.3, z: 2.0, shirt: 0x22c55e, pants: 0x1e293b, skin: 0xf1c27d, hair: 0x451a03, cheering: false },
    // Rear School Walkway Spectators watching from behind the school (z = -6.2)
    { x: -3.8, z: -6.2, shirt: 0xeab308, pants: 0x1e293b, skin: 0xf2d6b3, hair: 0x1e293b, cheering: true },
    { x: 3.8, z: -6.2, shirt: 0xef4444, pants: 0x334155, skin: 0xb45309, hair: 0x09090b, cheering: true },
  ];


  spectatorsRef.current = [];
  spectatorConfigs.forEach((spec, i) => {
    const fan = buildSpectatorPerson({
      shirtColor: spec.shirt,
      pantsColor: spec.pants,
      skinColor: spec.skin,
      hairColor: spec.hair,
      hasHat: spec.hasHat,
      cheering: spec.cheering,
    });
    fan.position.set(spec.x, 0, spec.z);
    fan.lookAt(0, 0.5, 0);
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
    venue.npcs.forEach((npc) => {
      const npcChar = CHARACTERS.find((c) => c.id === npc.characterId) || CHARACTERS[1];
      const npcMesh = buildCharacterMesh(npcChar);
      npcMesh.position.set(npc.position[0], 0, npc.position[2]);
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
        x: npc.position[0],
        z: npc.position[2],
        radius: 0.45,
        height: 1.75,
        isStatic: true,
      });
    });
  }
}

// -------------------------------------------------------------
// Helper: Suburban House for Background
// -------------------------------------------------------------
function createSuburbanHouse(roofColor: string): THREE.Group {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(6.5, 3.8, 5.0),
    new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.8 })
  );
  body.position.y = 1.9;
  grp.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(5.2, 2.4, 4).rotateY(Math.PI / 4),
    new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 })
  );
  roof.position.y = 4.8;
  grp.add(roof);

  return grp;
}

// -------------------------------------------------------------
// Helper: Wooden Bench
// -------------------------------------------------------------
function createWoodenBench(): THREE.Group {
  const grp = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.8 });
  const legMat = new THREE.MeshStandardMaterial({ color: '#1e293b' });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.6), woodMat);
  seat.position.set(0, 0.45, 0);
  seat.castShadow = true;
  grp.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 0.08), woodMat);
  back.position.set(0, 0.85, -0.26);
  back.castShadow = true;
  grp.add(back);

  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.5), legMat);
  leg1.position.set(-1.2, 0.225, 0);
  const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.5), legMat);
  leg2.position.set(1.2, 0.225, 0);
  grp.add(leg1, leg2);

  return grp;
}

// -------------------------------------------------------------
// Helper: Team Pavilion with Shaded Canopy & 2-Tier Bleachers
// -------------------------------------------------------------
function createTeamPavilion(title: string, canopyColor: string, bannerColor: string): THREE.Group {
  const grp = new THREE.Group();

  // 4 Support Steel Posts
  const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  [[-1.8, -1.2], [1.8, -1.2], [-1.8, 1.2], [1.8, 1.2]].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 12), postMat);
    post.position.set(px, 1.7, pz);
    post.castShadow = true;
    grp.add(post);
  });

  // Modern Angled Canopy Awning
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.14, 2.9),
    new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.4, metalness: 0.2 })
  );
  canopy.position.set(0, 3.4, 0);
  canopy.rotation.x = -0.05;
  canopy.castShadow = true;
  grp.add(canopy);

  // Tournament Pavilion Banner
  const bannerTex = createSafeCanvasTexture(512, 96, (bctx) => {
    bctx.fillStyle = bannerColor;
    bctx.fillRect(0, 0, 512, 96);
    bctx.strokeStyle = '#facc15';
    bctx.lineWidth = 5;
    bctx.strokeRect(3, 3, 506, 90);
    bctx.fillStyle = '#ffffff';
    bctx.font = 'bold 24px sans-serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText(title, 256, 48);
  });
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 0.65),
    new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.4 })
  );
  banner.position.set(0, 3.0, 1.42);
  grp.add(banner);

  // 2-Tier Aluminum Bleacher Seating inside pavilion
  const bleacherMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
  // Tier 1 Bench (Forward)
  const tier1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 0.45), bleacherMat);
  tier1.position.set(0, 0.45, 0.4);
  tier1.castShadow = true;
  // Tier 2 Bench (Elevated & set back)
  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 0.45), bleacherMat);
  tier2.position.set(0, 0.85, -0.4);
  tier2.castShadow = true;

  // Support Frames
  [-1.4, 0, 1.4].forEach((fx) => {
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.45), postMat);
    f1.position.set(fx, 0.225, 0.4);
    const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.45), postMat);
    f2.position.set(fx, 0.425, -0.4);
    grp.add(f1, f2);
  });

  grp.add(tier1, tier2);

  // Sports Hydration Cooler Barrel
  const coolerMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
  const cooler = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.65, 14), coolerMat);
  cooler.position.set(-1.4, 0.325, 0.95);
  cooler.castShadow = true;
  grp.add(cooler);

  return grp;
}

// -------------------------------------------------------------
// Helper: Curbside Seating & Drop-Off Promenade
// -------------------------------------------------------------
function createCurbsidePromenade(): THREE.Group {
  const grp = new THREE.Group();

  // Curbside Wooden Bench inside front school gate
  const bench = createWoodenBench();
  bench.position.set(2.5, 0.1, -37.5);
  bench.rotation.y = Math.PI;
  grp.add(bench);

  // Dual Sports Duffel Bags at curbside
  const bag1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.35, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 })
  );
  bag1.position.set(0.6, 0.25, -37.5);
  const bag2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 })
  );
  bag2.position.set(0.6, 0.2, -38.0);
  bag2.rotation.y = 0.4;
  grp.add(bag1, bag2);

  // Modern Curbside Lamppost
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 });
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.8, 12), poleMat);
  lampPole.position.set(4.5, 2.4, -37.5);
  const lampArm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.08), poleMat);
  lampArm.position.set(4.1, 4.75, -37.5);
  const lampHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.15, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.6 })
  );
  lampHead.position.set(3.7, 4.65, -37.5);
  grp.add(lampPole, lampArm, lampHead);

  return grp;
}

// -------------------------------------------------------------
// Helper: Build Four Square Court
// -------------------------------------------------------------
function buildCourt(
  scene: THREE.Scene,
  squaresRef: React.MutableRefObject<Map<SquareId, THREE.Mesh>>,
  highlightsRef: React.MutableRefObject<Map<SquareId, THREE.Mesh>>
) {
  const quadSize = COURT_HALF_SIZE;

  // Colors matching image_916b0c2b.png:
  // Square 1: Blue (#2563EB) with yellow diagonal serve box corner & yellow number 1
  // Square 2: Green (#16A34A) with yellow number 2
  // Square 3: Yellow-Orange (#F59E0B) with yellow number 3
  // Square 4: Red (#DC2626) with yellow number 4
  const squareColors: Record<SquareId, number> = {
    1: 0x2563eb, // Blue (Serve Square)
    2: 0x16a34a, // Green
    3: 0xf59e0b, // Yellow-Orange
    4: 0xdc2626, // Red
  };

  // Quadrant placement in 3D world (Camera looks from +Z toward -Z):
  // Square 1: Bottom-Left [-quadSize / 2, quadSize / 2]
  // Square 2: Top-Left [-quadSize / 2, -quadSize / 2]
  // Square 3: Top-Right [quadSize / 2, -quadSize / 2]
  // Square 4: Bottom-Right [quadSize / 2, quadSize / 2]
  const positions: Record<SquareId, [number, number]> = {
    1: [-quadSize / 2, quadSize / 2],
    2: [-quadSize / 2, -quadSize / 2],
    3: [quadSize / 2, -quadSize / 2],
    4: [quadSize / 2, quadSize / 2],
  };

  ([1, 2, 3, 4] as SquareId[]).forEach((sqId) => {
    const [posX, posZ] = positions[sqId];

    const sqTex = createSafeCanvasTexture(256, 256, (ctx) => {
      const colorHex = '#' + squareColors[sqId].toString(16).padStart(6, '0');
      ctx.fillStyle = colorHex;
      ctx.fillRect(0, 0, 256, 256);

      // Painted thick yellow border around each square
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 242, 242);

      // Diagonal yellow serve box line for Square 1 (matching image_916b0c2b.png)
      if (sqId === 1) {
        ctx.beginPath();
        ctx.moveTo(0, 168);
        ctx.lineTo(168, 256);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 14;
        ctx.stroke();
      }

      // Bold painted yellow numbers
      ctx.fillStyle = '#facc15';
      ctx.font = '900 115px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 4;
      ctx.fillText(sqId.toString(), 128, 128);
    });

    const sqGeo = new THREE.PlaneGeometry(quadSize - LINE_HALF_WIDTH * 2, quadSize - LINE_HALF_WIDTH * 2);
    sqGeo.rotateX(-Math.PI / 2);

    const sqMat = new THREE.MeshStandardMaterial({
      map: sqTex,
      roughness: 0.7,
      metalness: 0.05,
    });
    const sqMesh = new THREE.Mesh(sqGeo, sqMat);
    sqMesh.name = `courtSquare-${sqId}`;
    sqMesh.position.set(posX, 0.025, posZ);
    sqMesh.receiveShadow = true;
    scene.add(sqMesh);
    squaresRef.current.set(sqId, sqMesh);

    // Dynamic Turn Glow Highlight
    const hlGeo = new THREE.PlaneGeometry(quadSize, quadSize);
    hlGeo.rotateX(-Math.PI / 2);
    const hlMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const hlMesh = new THREE.Mesh(hlGeo, hlMat);
    hlMesh.position.set(posX, 0.038, posZ);
    hlMesh.visible = false;
    scene.add(hlMesh);
    highlightsRef.current.set(sqId, hlMesh);
  });

  // Thick Yellow Court Border Lines & Cross Dividers
  const fullCourtSize = COURT_HALF_SIZE * 2;
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const borderH1 = new THREE.Mesh(new THREE.PlaneGeometry(fullCourtSize + 0.2, 0.18).rotateX(-Math.PI / 2), lineMat);
  borderH1.position.set(0, 0.03, -COURT_HALF_SIZE);
  const borderH2 = new THREE.Mesh(new THREE.PlaneGeometry(fullCourtSize + 0.2, 0.18).rotateX(-Math.PI / 2), lineMat);
  borderH2.position.set(0, 0.03, COURT_HALF_SIZE);
  const borderV1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, fullCourtSize + 0.2).rotateX(-Math.PI / 2), lineMat);
  borderV1.position.set(-COURT_HALF_SIZE, 0.03, 0);
  const borderV2 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, fullCourtSize + 0.2).rotateX(-Math.PI / 2), lineMat);
  borderV2.position.set(COURT_HALF_SIZE, 0.03, 0);

  // Center Cross Dividers
  const centerH = new THREE.Mesh(new THREE.PlaneGeometry(fullCourtSize, 0.22).rotateX(-Math.PI / 2), lineMat);
  centerH.position.set(0, 0.032, 0);
  const centerV = new THREE.Mesh(new THREE.PlaneGeometry(0.22, fullCourtSize).rotateX(-Math.PI / 2), lineMat);
  centerV.position.set(0, 0.032, 0);

  scene.add(borderH1, borderH2, borderV1, borderV2, centerH, centerV);
}

// -------------------------------------------------------------
// Helper: Build Playground Ball
// -------------------------------------------------------------
function buildBall(
  scene: THREE.Scene,
  ballRef: React.MutableRefObject<THREE.Mesh | null>,
  shadowRef: React.MutableRefObject<THREE.Mesh | null>
) {
  const ballGeo = new THREE.SphereGeometry(0.22, 28, 28);
  const ballTex = createSafeCanvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#b91c1c';
    for (let x = 0; x < 256; x += 16) {
      for (let y = 0; y < 256; y += 16) {
        ctx.fillRect(x, y, 8, 8);
      }
    }
  });

  const ballMat = new THREE.MeshStandardMaterial({
    map: ballTex,
    roughness: 0.65,
    metalness: 0.1,
  });
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
  const isLeft = sqId === 1 || sqId === 2;
  const isTop = sqId === 2 || sqId === 3;
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
    grp.position.y = Math.abs(cycle) * 0.04;
  } else {
    if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.22);
    if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.22);
    if (leftShin) leftShin.rotation.x = THREE.MathUtils.lerp(leftShin.rotation.x, 0, 0.22);
    if (rightShin) rightShin.rotation.x = THREE.MathUtils.lerp(rightShin.rotation.x, 0, 0.22);
    if (leftArm) leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -0.25, 0.2);
    if (rightArm) rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.25, 0.2);
    if (torso) torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, 0, 0.2);
    grp.position.y = THREE.MathUtils.lerp(grp.position.y, 0, 0.25);
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
