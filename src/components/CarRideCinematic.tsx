import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  FastForward,
  Radio,
  Volume2,
  VolumeX,
  Car,
  Navigation,
  Sun,
  Sunset,
  Moon,
  Zap,
  Volume1,
  ArrowRight,
} from 'lucide-react';
import { VenueDef } from '../types/campaign';
import {
  buildRoadTripCar,
  buildCharacterMesh,
} from '../utils/characterModelBuilder';
import { CHARACTERS, CharacterCustomization } from '../utils/characters';
import { soundFX } from '../services/soundEffects';

type EnvironmentTime = 'sunny' | 'sunset' | 'night';

interface CarRideCinematicProps {
  fromVenue: VenueDef;
  toVenue: VenueDef;
  canSkip?: boolean;
  onArrival: () => void;
  currentTrackName?: string;
  onNextTrack?: () => void;
  customization?: CharacterCustomization;
}

const TOTAL_DRIVE_SECONDS = 16.0; // Fast, snappy, arcade 16-second trip

export const CarRideCinematic: React.FC<CarRideCinematicProps> = ({
  fromVenue,
  toVenue,
  canSkip = true,
  onArrival,
  currentTrackName = 'Serve It Straight',
  onNextTrack,
  customization,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drive Timeline State (0 to 16.0 seconds)
  const [currentDriveTime, setCurrentDriveTime] = useState(0);
  const currentDriveTimeRef = useRef(0);

  // Settings & Interactivity
  const [timeOfDay, setTimeOfDay] = useState<EnvironmentTime>('sunny');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isTurboActive, setIsTurboActive] = useState(false);
  const isTurboActiveRef = useRef(false);
  const [speedMph, setSpeedMph] = useState(45);
  const [phaseText, setPhaseText] = useState('Cruising toward school entrance...');

  // Autonomous Cruise & Chauffeur Drive (user sits back and enjoys arrival)
  const activateTurbo = () => {
    isTurboActiveRef.current = true;
    setIsTurboActive(true);
    soundFX.playWhoosh();
    setTimeout(() => {
      isTurboActiveRef.current = false;
      setIsTurboActive(false);
    }, 1800);
  };

  const honkHorn = () => {
    soundFX.playCarHorn();
  };

  // Keyboard shortcut for horn or turbo during autonomous ride
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        activateTurbo();
      }
      if (e.code === 'KeyH') honkHorn();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 3D Three.js Fast Arcade Highway & School Entrance Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();

    const getEnvConfig = (t: EnvironmentTime) => {
      switch (t) {
        case 'sunset':
          return {
            skyColor: 0xea580c,
            fogColor: 0xfed7aa,
            fogDensity: 0.007,
            sunColor: 0xfb923c,
            sunIntensity: 1.8,
          };
        case 'night':
          return {
            skyColor: 0x050814,
            fogColor: 0x0f172a,
            fogDensity: 0.009,
            sunColor: 0x38bdf8,
            sunIntensity: 0.6,
          };
        case 'sunny':
        default:
          return {
            skyColor: 0x38bdf8,
            fogColor: 0xbae6fd,
            fogDensity: 0.005,
            sunColor: 0xfffaed,
            sunIntensity: 2.0,
          };
      }
    };

    const envCfg = getEnvConfig(timeOfDay);
    scene.background = new THREE.Color(envCfg.skyColor);
    scene.fog = new THREE.FogExp2(envCfg.fogColor, envCfg.fogDensity);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 300);
    camera.position.set(4.2, 2.8, 7.5);
    camera.lookAt(0, 1.1, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      renderer = new THREE.WebGLRenderer({ antialias: false });
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.3);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(envCfg.sunColor, envCfg.sunIntensity);
    sun.position.set(20, 32, 16);
    sun.castShadow = true;
    scene.add(sun);

    // Player Road Trip Hatchback Car (Base rotation Math.PI so headlights face forward down highway)
    const playerCar = buildRoadTripCar('#2563eb');
    playerCar.position.set(2.0, 0, 0);
    playerCar.rotation.set(0, Math.PI, 0);
    scene.add(playerCar);

    // Curbside door when car is facing forward (at model -X, world +X curbside)
    const curbsideDoor = playerCar.getObjectByName('driverDoor') as THREE.Group | undefined;
    const frontWheelL = playerCar.getObjectByName('frontWheelLeft') as THREE.Group | undefined;
    const frontWheelR = playerCar.getObjectByName('frontWheelRight') as THREE.Group | undefined;
    const rearWheelL = playerCar.getObjectByName('rearWheelLeft') as THREE.Group | undefined;
    const rearWheelR = playerCar.getObjectByName('rearWheelRight') as THREE.Group | undefined;

    // Player Avatar Mesh (reflects customized creature/character model)
    const playerMesh = buildCharacterMesh(CHARACTERS[0], customization);
    playerMesh.position.set(3.6, 0, 1.2);
    playerMesh.visible = true;
    scene.add(playerMesh);

    const playerArmR = playerMesh.getObjectByName('rightArm') as THREE.Group | undefined;
    const playerArmL = playerMesh.getObjectByName('leftArm') as THREE.Group | undefined;
    const playerLegR = playerMesh.getObjectByName('rightLeg') as THREE.Group | undefined;
    const playerLegL = playerMesh.getObjectByName('leftLeg') as THREE.Group | undefined;

    // 4-Lane Asphalt Road
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.75,
      metalness: 0.05,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(20.0, 360).rotateX(-Math.PI / 2), roadMat);
    road.receiveShadow = true;
    scene.add(road);

    // Center Solid Yellow Line (and solid white outer lane lines)
    const laneLinesGroup = new THREE.Group();
    const solidYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const solidWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Continuous Solid Double Yellow Line running entire 360m highway
    const y1 = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 360).rotateX(-Math.PI / 2), solidYellowMat);
    y1.position.set(-0.15, 0.015, 0);
    const y2 = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 360).rotateX(-Math.PI / 2), solidYellowMat);
    y2.position.set(0.15, 0.015, 0);
    laneLinesGroup.add(y1, y2);

    // Continuous Solid White Lane Boundary Lines
    const wL = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 360).rotateX(-Math.PI / 2), solidWhiteMat);
    wL.position.set(-4.5, 0.015, 0);
    const wR = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 360).rotateX(-Math.PI / 2), solidWhiteMat);
    wR.position.set(4.5, 0.015, 0);
    laneLinesGroup.add(wL, wR);
    scene.add(laneLinesGroup);

    // Highway Curbs & Guardrails
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.85, roughness: 0.3 });
    const guardL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 360), guardMat);
    guardL.position.set(-9.8, 0.55, 0);
    const guardR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 360), guardMat);
    guardR.position.set(9.8, 0.55, 0);
    scene.add(guardL, guardR);

    // Glowing Neon Speed Boost Pads on Highway
    const boostPadsGroup = new THREE.Group();
    [-60, 40, 120].forEach((bz, idx) => {
      const pad = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 4.5).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color: idx % 2 === 0 ? 0x06b6d4 : 0xf59e0b,
          transparent: true,
          opacity: 0.8,
        })
      );
      pad.position.set(idx % 2 === 0 ? 2.2 : -2.2, 0.02, bz);
      boostPadsGroup.add(pad);
    });
    scene.add(boostPadsGroup);

    // Destination School Entrance Gate Setpiece (approaches during arrival phase with wide 17m opening)
    const schoolArrivalGroup = new THREE.Group();
    schoolArrivalGroup.position.set(0, 0, -220);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.8 });
    const pLeft = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.2, 1.6), pillarMat);
    pLeft.position.set(-8.5, 2.1, 0);
    const pRight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.2, 1.6), pillarMat);
    pRight.position.set(8.5, 2.1, 0);

    // School Archway Banner spanning full 17m road
    const archCanvas = document.createElement('canvas');
    archCanvas.width = 1024;
    archCanvas.height = 128;
    const actx = archCanvas.getContext('2d');
    if (actx) {
      actx.fillStyle = '#1e3a8a';
      actx.fillRect(0, 0, 1024, 128);
      actx.strokeStyle = '#f59e0b';
      actx.lineWidth = 6;
      actx.strokeRect(4, 4, 1016, 120);
      actx.fillStyle = '#fbbf24';
      actx.font = 'bold 36px sans-serif';
      actx.textAlign = 'center';
      actx.fillText(`★ ${toVenue.name.toUpperCase()} ★`, 512, 54);
      actx.font = 'bold 24px sans-serif';
      actx.fillStyle = '#ffffff';
      actx.fillText('WELCOME TOURNAMENT CONTENDERS', 512, 98);
    }
    const archTex = new THREE.CanvasTexture(archCanvas);
    const archSign = new THREE.Mesh(
      new THREE.PlaneGeometry(17.0, 1.8),
      new THREE.MeshStandardMaterial({ map: archTex, roughness: 0.4 })
    );
    archSign.position.set(0, 4.8, 0);
    archSign.rotation.y = Math.PI;

    // School Sidewalk & Drop-Off Curb on right side (x >= 4.8)
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.25, 40), sidewalkMat);
    sidewalk.position.set(7.5, 0.12, 0);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 40), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    curb.position.set(4.9, 0.17, 0);

    schoolArrivalGroup.add(pLeft, pRight, archSign, sidewalk, curb);
    scene.add(schoolArrivalGroup);

    // Surrounding Traffic Vehicles with Strict 4-Lane Layout
    // Lane -2 (-5.5), Lane -1 (-2.0), Lane +1 (+2.0), Lane +2 (+5.5)
    const trafficCars: { mesh: THREE.Group; speed: number; direction: number; laneX: number }[] = [];
    const trafficCount = 5;
    const trafficPalette = ['#dc2626', '#16a34a', '#eab308', '#9333ea', '#ea580c'];

    for (let t = 0; t < trafficCount; t++) {
      const isOncoming = t % 2 === 1;
      const laneX = isOncoming
        ? (t % 4 === 1 ? -2.0 : -5.5)
        : (t % 4 === 0 ? 5.5 : 2.0);
      const zPos = -120 + t * 65;

      const vGroup = new THREE.Group();
      const carMat = new THREE.MeshStandardMaterial({
        color: trafficPalette[t % trafficPalette.length],
        roughness: 0.35,
        metalness: 0.5,
      });
      const cBody = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 4.0), carMat);
      cBody.position.y = 0.65;
      const cCabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.55, 2.0),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 })
      );
      cCabin.position.set(0, 1.15, -0.2);
      vGroup.add(cBody, cCabin);

      vGroup.position.set(laneX, 0, zPos);
      if (isOncoming) vGroup.rotation.y = 0; // Oncoming travels towards +Z: headlights face +Z
      else vGroup.rotation.y = Math.PI; // Same-direction travels towards -Z: headlights face -Z
      scene.add(vGroup);

      trafficCars.push({
        mesh: vGroup,
        speed: 1.1 + (t % 3) * 0.2,
        direction: isOncoming ? -1 : 1,
        laneX,
      });
    }

    // Audio tracking
    let playedDoorOpen = false;
    let playedDoorShut = false;
    let playedEngineRev = false;
    let playedArrivalDoor = false;
    let playedArrivalShut = false;

    let animId: number;
    let lastClockTime = performance.now();
    let carSteerHeading = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const deltaSec = Math.min(0.1, (now - lastClockTime) / 1000);
      lastClockTime = now;

      // Advance fast drive clock
      currentDriveTimeRef.current += deltaSec;
      if (currentDriveTimeRef.current >= TOTAL_DRIVE_SECONDS) {
        currentDriveTimeRef.current = TOTAL_DRIVE_SECONDS;
      }
      setCurrentDriveTime(currentDriveTimeRef.current);

      const tSec = currentDriveTimeRef.current;

      // -------------------------------------------------------------
      // PHASE 1: FAST BOARDING & DOOR MECHANICS (0s - 3.5s)
      // -------------------------------------------------------------
      if (tSec < 3.5) {
        setPhaseText('Boarding Vehicle...');
        setSpeedMph(0);
        trafficCars.forEach((tc) => (tc.mesh.visible = false));
        schoolArrivalGroup.visible = false;
        playerCar.position.set(2.0, 0, 0);
        playerCar.rotation.set(0, Math.PI, 0); // Strict forward heading

        if (tSec < 1.2) {
          // Walk from sidewalk at (3.6, 1.2) to curbside door at (3.1, -0.2)
          const walkT = tSec / 1.2;
          playerMesh.visible = true;
          const startX = 3.6, endX = 3.1;
          const startZ = 1.2, endZ = -0.2;
          playerMesh.position.x = THREE.MathUtils.lerp(startX, endX, walkT);
          playerMesh.position.z = THREE.MathUtils.lerp(startZ, endZ, walkT);
          playerMesh.position.y = 0;
          // Calculate heading to face movement direction!
          playerMesh.rotation.y = Math.atan2(endX - startX, endZ - startZ);

          // Dynamic leg and arm stride swing
          const walkCycle = Math.sin(tSec * 14);
          if (playerLegL) playerLegL.rotation.x = walkCycle * 0.55;
          if (playerLegR) playerLegR.rotation.x = -walkCycle * 0.55;
          if (playerArmL) playerArmL.rotation.x = -walkCycle * 0.45;
          if (playerArmR) playerArmR.rotation.x = walkCycle * 0.45;

          if (curbsideDoor) curbsideDoor.rotation.y = 0;
        } else if (tSec >= 1.2 && tSec < 2.2) {
          // Unlatch & swing door wide open outward towards sidewalk
          const openT = (tSec - 1.2) / 1.0;
          if (!playedDoorOpen) {
            soundFX.playCarDoorOpen();
            playedDoorOpen = true;
          }
          if (curbsideDoor) {
            curbsideDoor.rotation.y = THREE.MathUtils.lerp(0, 1.22, openT);
          }
          // Turn to face car interior
          playerMesh.rotation.y = THREE.MathUtils.lerp(Math.atan2(-0.5, -1.4), -Math.PI / 2, openT);
          // Reset limbs
          if (playerLegL) playerLegL.rotation.x = 0;
          if (playerLegR) playerLegR.rotation.x = 0;
          if (playerArmL) playerArmL.rotation.x = 0;
          if (playerArmR) playerArmR.rotation.x = 0;
        } else if (tSec >= 2.2 && tSec < 3.0) {
          // Step into driver seat
          const stepT = (tSec - 2.2) / 0.8;
          if (curbsideDoor) curbsideDoor.rotation.y = 1.22;
          playerMesh.position.x = THREE.MathUtils.lerp(3.1, 1.55, stepT);
          playerMesh.position.z = THREE.MathUtils.lerp(-0.2, 0.1, stepT);
          playerMesh.position.y = THREE.MathUtils.lerp(0, -0.25, stepT);
          playerMesh.rotation.y = -Math.PI / 2;
        } else {
          // Door pulls shut & slams flush
          const shutT = (tSec - 3.0) / 0.5;
          if (curbsideDoor) {
            curbsideDoor.rotation.y = THREE.MathUtils.lerp(1.22, 0, shutT);
          }
          if (!playedDoorShut) {
            soundFX.playCarDoorSlam();
            playedDoorShut = true;
          }
        }

        camera.position.set(5.6, 2.4, 4.8);
        camera.lookAt(2.0, 1.1, 0);
      }

      // -------------------------------------------------------------
      // PHASE 2: HIGH-SPEED ARCADE HIGHWAY CRUISE (3.5s - 12.0s)
      // -------------------------------------------------------------
      else if (tSec >= 3.5 && tSec < 12.0) {
        if (!playedEngineRev) {
          soundFX.playEngineRev();
          playedEngineRev = true;
        }

        playerMesh.visible = false;
        schoolArrivalGroup.visible = false;
        if (curbsideDoor) curbsideDoor.rotation.y = 0;

        // Base speed 85 mph, jumps to 135 mph on Turbo!
        const isTurbo = isTurboActiveRef.current;
        const targetSpeed = isTurbo ? 135 : 85 + Math.sin(now * 0.003) * 6;
        setSpeedMph(Math.round(targetSpeed));
        setPhaseText(isTurbo ? '🚀 TURBO BOOST ACTIVE!' : 'High-Speed Highway Transit');

        // Dynamic Camera FOV stretch on Turbo
        const targetFov = isTurbo ? 62 : 45;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1);
        camera.updateProjectionMatrix();

        // Auto-swerving obstacle clearance logic:
        let autoSwerveTargetX: number | null = null;
        for (const tc of trafficCars) {
          // In Three.js, cars ahead in forward direction have z < playerCar.position.z
          const distAhead = playerCar.position.z - tc.mesh.position.z;
          const dx = Math.abs(tc.mesh.position.x - playerCar.position.x);

          // If car is ahead within 32 meters and in our lane path (dx < 2.2)
          if (distAhead > 0 && distAhead < 32 && dx < 2.2) {
            // Smoothly steer to alternate open lane
            if (playerCar.position.x < 3.75) {
              autoSwerveTargetX = 5.5; // Shift to right lane
            } else {
              autoSwerveTargetX = 2.0; // Shift to left lane
            }
            break;
          }

          // Safety guard against oncoming traffic if player drifts into negative X
          if (tc.direction < 0 && playerCar.position.x < 0.8) {
            const zDist = Math.abs(tc.mesh.position.z - playerCar.position.z);
            if (zDist < 35 && dx < 2.8) {
              autoSwerveTargetX = 2.2; // Guide player safely back to right side of road
              break;
            }
          }
        }

        // Autonomous Chauffeur Guidance: smooth auto-lane keeping and evasive flow
        if (autoSwerveTargetX !== null) {
          const diff = autoSwerveTargetX - playerCar.position.x;
          playerCar.position.x += Math.sign(diff) * Math.min(Math.abs(diff), 0.14);
          carSteerHeading = THREE.MathUtils.clamp(diff * 0.14, -0.15, 0.15);
        } else {
          // Keep cruising smoothly in the right inbound lane
          const laneTargetX = 2.0;
          const diff = laneTargetX - playerCar.position.x;
          playerCar.position.x += diff * 0.05;
          carSteerHeading = THREE.MathUtils.clamp(diff * 0.1, -0.1, 0.1);
        }

        playerCar.position.x = THREE.MathUtils.clamp(playerCar.position.x, -5.8, 5.8);
        playerCar.rotation.y = Math.PI - carSteerHeading; // Strictly forward heading
        playerCar.rotation.z = carSteerHeading * 0.3;

        // Turn wheels in forward heading
        if (frontWheelL) frontWheelL.rotation.y = -carSteerHeading * 1.6;
        if (frontWheelR) frontWheelR.rotation.y = -carSteerHeading * 1.6;

        // Spin wheels forward
        const spinDelta = (targetSpeed / 30) * deltaSec * 15;
        ['frontWheelLeft', 'frontWheelRight', 'rearWheelLeft', 'rearWheelRight'].forEach((wn) => {
          const w = playerCar.getObjectByName(wn);
          const spin = w?.getObjectByName('spinWheel');
          if (spin) spin.rotation.x += spinDelta;
        });

        // Move road & boost pads backwards at thrilling speed
        const moveDelta = (targetSpeed / 60) * 2.8;

        // Boost pads animation backwards
        boostPadsGroup.children.forEach((pad) => {
          pad.position.z += moveDelta;
          if (pad.position.z > 120) pad.position.z -= 240;

          // Check if player drives over boost pad
          if (Math.abs(pad.position.z - playerCar.position.z) < 2.0 && Math.abs(pad.position.x - playerCar.position.x) < 1.5) {
            if (!isTurboActiveRef.current) {
              activateTurbo();
            }
          }
        });

        // Traffic AI cars movement with safe following distances (never clipping through each other)
        trafficCars.forEach((tc, idx) => {
          tc.mesh.visible = true;
          if (tc.direction < 0) {
            tc.mesh.position.z += moveDelta + tc.speed * 1.5;
            if (tc.mesh.position.z > 140) {
              tc.mesh.position.z = -140 - idx * 25;
            }
          } else {
            tc.mesh.position.z += (tc.speed - 1.15) * moveDelta;
            if (tc.mesh.position.z > 140) {
              tc.mesh.position.z = -140 - idx * 30;
            } else if (tc.mesh.position.z < -140) {
              tc.mesh.position.z = 140;
            }
          }

          // Check following distance with any other traffic car in the same lane
          for (let j = 0; j < trafficCars.length; j++) {
            if (j === idx) continue;
            const other = trafficCars[j];
            if (Math.abs(tc.mesh.position.x - other.mesh.position.x) < 1.0) {
              const gap = other.mesh.position.z - tc.mesh.position.z;
              if (gap > 0 && gap < 25) {
                tc.mesh.position.z = other.mesh.position.z - 26;
              }
            }
          }
        });

        // Dynamic Chase Camera with subtle vibration
        const shake = isTurbo ? (Math.random() - 0.5) * 0.04 : 0;
        camera.position.x = playerCar.position.x + 3.4 + shake;
        camera.position.y = 2.6 + Math.sin(now * 0.005) * 0.15;
        camera.position.z = playerCar.position.z + 6.8;
        camera.lookAt(playerCar.position.x, 1.1, playerCar.position.z);
      }

      // -------------------------------------------------------------
      // PHASE 3: ARRIVAL, TURNING INTO SCHOOL & STEP OUT (12.0s - 16.0s)
      // -------------------------------------------------------------
      else {
        trafficCars.forEach((tc) => (tc.mesh.visible = false));
        schoolArrivalGroup.visible = true;

        if (tSec < 13.5) {
          // Decelerate & Turn into School drop-off lane
          setPhaseText('Entering School Drop-Off Loop...');
          const turnT = (tSec - 12.0) / 1.5;
          setSpeedMph(Math.round(THREE.MathUtils.lerp(65, 12, turnT)));

          playerCar.position.x = THREE.MathUtils.lerp(playerCar.position.x, 2.0, turnT);
          playerCar.rotation.y = Math.PI - 0.14 * Math.sin(turnT * Math.PI);
          schoolArrivalGroup.position.z = THREE.MathUtils.lerp(-120, -10, turnT);

          camera.position.set(5.8, 2.6, 6.2);
          camera.lookAt(playerCar.position.x, 1.1, 0);
        } else if (tSec >= 13.5 && tSec < 14.5) {
          // Glides flush to stop at curb (x=2.0)
          setPhaseText('Parked at Schoolyard Entrance');
          setSpeedMph(0);
          playerCar.position.set(2.0, 0, 0);
          playerCar.rotation.set(0, Math.PI, 0);
          schoolArrivalGroup.position.z = 0;
          if (curbsideDoor) curbsideDoor.rotation.y = 0;
        } else if (tSec >= 14.5 && tSec < 15.5) {
          // Door swings open outward towards sidewalk, player steps out onto school grounds!
          setPhaseText('Stepping Out onto School Blacktop...');
          const outT = (tSec - 14.5) / 1.0;
          if (!playedArrivalDoor) {
            soundFX.playCarDoorOpen();
            playedArrivalDoor = true;
          }
          if (curbsideDoor) {
            curbsideDoor.rotation.y = THREE.MathUtils.lerp(0, 1.22, Math.min(1.0, outT * 1.5));
          }
          playerMesh.visible = true;

          // Step 1: Step out of seat towards sidewalk (outT < 0.45)
          // Step 2: Turn forward and walk toward school gate (outT >= 0.45)
          if (outT < 0.45) {
            const subT = outT / 0.45;
            playerMesh.position.x = THREE.MathUtils.lerp(1.55, 3.1, subT);
            playerMesh.position.y = THREE.MathUtils.lerp(-0.25, 0, subT);
            playerMesh.position.z = 0.1;
            playerMesh.rotation.y = Math.PI / 2; // Facing the sidewalk as they step out
          } else {
            const subT = (outT - 0.45) / 0.55;
            const startX = 3.1, endX = 3.5;
            const startZ = 0.1, endZ = -1.2;
            playerMesh.position.x = THREE.MathUtils.lerp(startX, endX, subT);
            playerMesh.position.y = 0;
            playerMesh.position.z = THREE.MathUtils.lerp(startZ, endZ, subT);
            // Face directly down the walkway towards school entrance!
            playerMesh.rotation.y = Math.atan2(endX - startX, endZ - startZ);

            // Natural walk cycle stride!
            const walkCycle = Math.sin(subT * Math.PI * 4);
            if (playerLegL) playerLegL.rotation.x = walkCycle * 0.5;
            if (playerLegR) playerLegR.rotation.x = -walkCycle * 0.5;
            if (playerArmL) playerArmL.rotation.x = -walkCycle * 0.4;
            if (playerArmR) playerArmR.rotation.x = walkCycle * 0.4;
          }
        } else {
          // Door closes, player stands proudly at gate entrance
          const closeT = (tSec - 15.5) / 0.5;
          if (curbsideDoor) {
            curbsideDoor.rotation.y = THREE.MathUtils.lerp(1.22, 0, closeT);
          }
          if (!playedArrivalShut) {
            soundFX.playCarDoorSlam();
            playedArrivalShut = true;
          }
          playerMesh.position.set(3.5, 0, -1.2);
          playerMesh.rotation.y = Math.PI; // Proudly facing the arena gates
          if (playerLegL) playerLegL.rotation.x = 0;
          if (playerLegR) playerLegR.rotation.x = 0;
          if (playerArmL) playerArmL.rotation.x = 0;
          if (playerArmR) playerArmR.rotation.x = 0;
        }

        camera.position.set(6.2, 2.5, 5.2);
        camera.lookAt(playerCar.position.x, 1.1, 0);
      }

      renderer.render(scene, camera);
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
  }, [timeOfDay]);

  // Complete drive when 16.0s is reached
  useEffect(() => {
    if (currentDriveTime >= TOTAL_DRIVE_SECONDS) {
      const timer = setTimeout(() => {
        onArrival();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentDriveTime, onArrival]);

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col select-none overflow-hidden animate-in fade-in duration-300">
      {/* 3D Highway Stage */}
      <div ref={containerRef} className="w-full h-full relative" />

      {/* Top Header Overlay Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none z-20">
        {/* Destination & Phase Badge */}
        <div className="p-3 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-amber-400/50 shadow-xl flex items-center gap-3 pointer-events-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase text-amber-400 font-black flex items-center gap-1">
              <Navigation className="w-3 h-3 animate-pulse" /> {phaseText}
            </div>
            <h2 className="text-sm sm:text-base font-black text-white">
              To: {toVenue.name.replace('The ', '')}
            </h2>
          </div>
        </div>

        {/* Speedometer & Turbo Gauge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-right shadow-xl">
            <div className="text-[9px] font-mono uppercase text-slate-400 font-bold">Speed</div>
            <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
              {speedMph} <span className="text-[10px] text-slate-400">MPH</span>
            </div>
          </div>

          {/* Time of Day */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-950/90 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setTimeOfDay('sunny')}
              className={`p-2 rounded-xl text-xs transition-all cursor-pointer ${
                timeOfDay === 'sunny' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTimeOfDay('sunset')}
              className={`p-2 rounded-xl text-xs transition-all cursor-pointer ${
                timeOfDay === 'sunset' ? 'bg-orange-500 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sunset className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTimeOfDay('night')}
              className={`p-2 rounded-xl text-xs transition-all cursor-pointer ${
                timeOfDay === 'night' ? 'bg-indigo-600 text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>

          {/* Instant Skip Button */}
          {canSkip && (
            <button
              onClick={onArrival}
              title="Skip Ride Directly to Schoolyard Gameplay"
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <span>Skip Ride</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Autonomous Chauffeur Controls Dock */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2 sm:gap-3 z-30">
        <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-amber-400/40 text-amber-300 font-mono text-xs font-black uppercase shadow-2xl flex items-center gap-2 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>AUTONOMOUS TRANSIT • ARRIVING AT SCHOOL</span>
        </div>

        {/* Turbo Boost */}
        <button
          onClick={activateTurbo}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-2xl active:scale-95 cursor-pointer flex items-center gap-2 transition-all ${
            isTurboActive
              ? 'bg-cyan-400 text-slate-950 scale-105 ring-4 ring-cyan-300'
              : 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 hover:brightness-110'
          }`}
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>{isTurboActive ? 'BOOSTING!' : 'Turbo Boost'}</span>
        </button>

        {/* Horn */}
        <button
          onClick={honkHorn}
          className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700 text-amber-300 font-black shadow-2xl active:scale-95 cursor-pointer"
          title="Honk Car Horn"
        >
          <Volume1 className="w-4 h-4" />
        </button>
      </div>

      {/* Scrubber Progress Bar */}
      <div className="absolute bottom-2 left-6 right-6 pointer-events-none z-20">
        <div className="w-full h-1.5 bg-slate-900/80 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-75"
            style={{ width: `${(currentDriveTime / TOTAL_DRIVE_SECONDS) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
