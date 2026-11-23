import { daylightAt } from '../services/venueDaylight';
import { trafficTravel } from '../utils/trafficCollision';
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
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
  applySeatedDriverPose,
} from '../utils/characterModelBuilder';
import { CHARACTERS, DEFAULT_CUSTOMIZATION, CharacterCustomization } from '../utils/characters';
import { soundFX } from '../services/soundEffects';
import { buildRoadside, getRegionalRoad, makeRoadTexture } from '../utils/roadTripScenery';
import { buildCampusSchool } from '../utils/campusScene';
import { SCHOOL } from '../utils/campusLayout';

type EnvironmentTime = 'sunny' | 'sunset' | 'night';

interface CarRideCinematicProps {
  fromVenue: VenueDef;
  toVenue: VenueDef;
  canSkip?: boolean;
  onArrival: () => void;
  currentTrackName?: string;
  onNextTrack?: () => void;
  customization?: CharacterCustomization;
  characterId?: string;
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
  characterId,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drive Timeline State (0 to 16.0 seconds)
  const [currentDriveTime, setCurrentDriveTime] = useState(0);
  const currentDriveTimeRef = useRef(0);

  // Settings & Interactivity
  const timeOfDay: EnvironmentTime = daylightAt(toVenue.id);
  const timeOfDayRef = useRef(timeOfDay);
  timeOfDayRef.current = timeOfDay;
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isTurboActive, setIsTurboActive] = useState(false);
  const isTurboActiveRef = useRef(false);
  const [speedMph, setSpeedMph] = useState(45);
  const [phaseText, setPhaseText] = useState('Boarding');

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

    let activeTime = timeOfDayRef.current;
    const envCfg = getEnvConfig(activeTime);
    scene.background = new THREE.Color(envCfg.skyColor);
    scene.fog = new THREE.FogExp2(envCfg.fogColor, envCfg.fogDensity);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 340);
    camera.position.set(4.2, 2.8, 7.5);
    camera.lookAt(0, 1.1, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      renderer = new THREE.WebGLRenderer({ antialias: false });
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xe4f3ff, 0x796955, 0.72);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(envCfg.sunColor, envCfg.sunIntensity);
    sun.position.set(-8.4, 12.6, -5.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -23;
    sun.shadow.camera.right = sun.shadow.camera.top = 23;
    sun.shadow.camera.far = 55;
    sun.shadow.normalBias = 0.025;
    sun.shadow.bias = -0.0003;
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0xb3d8ff, 0.60);
    rim.position.set(6, 3.6, 9);
    scene.add(rim);

    let disposed = false;
    let daylight: THREE.DataTexture | undefined;
    // Cloud Layers by Greg Zaal (Poly Haven, CC0), used for daylight and reflections.
    new HDRLoader().load('/assets/lighting/cloud-layers-1k.hdr', (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      daylight = texture;
      daylight.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = daylight;
      updateDaylight();
    }, undefined, () => {});

    function updateDaylight() {
      const config = getEnvConfig(activeTime);
      const isDay = activeTime === 'sunny';
      const isNight = activeTime === 'night';
      scene.background = isDay && daylight ? daylight : new THREE.Color(config.skyColor);
      scene.backgroundRotation.y = 0.7;
      scene.backgroundIntensity = 0.76;
      scene.backgroundBlurriness = isDay ? 0.035 : 0;
      scene.environmentIntensity = isNight ? 0.19 : isDay ? 0.82 : 0.49;
      if (scene.fog) scene.fog.color.set(config.fogColor);
      sun.color.set(config.sunColor);
      sun.intensity = config.sunIntensity;
      sun.position.set(-8.4, isDay ? 12.6 : 4.7, -5.8);
      hemiLight.intensity = isNight ? 0.33 : 0.72;
      rim.intensity = isNight ? 0.95 : 0.60;
    }
    updateDaylight();

    // Player Road Trip Hatchback Car (Base rotation Math.PI so headlights face forward down highway)
    const region = getRegionalRoad(toVenue.id);
    const playerCar = buildRoadTripCar(region.paint, true,
      region.surface === 'rural' ? 'carrier' : region.mark === 'tram' ? 'none' : 'cases', true);
    playerCar.position.set(2.0, 0, 0);
    playerCar.rotation.set(0, Math.PI, 0);
    scene.add(playerCar);
    const nightBeam = new THREE.SpotLight(0xe1f0ff, 0, 27, 0.47, 0.76, 2);
    nightBeam.position.set(0, 0.68, 2.16);
    nightBeam.target.position.set(0, 0, 14);
    playerCar.add(nightBeam, nightBeam.target);

    // Curbside door when car is facing forward (at model -X, world +X curbside)
    const carBodyGroup = (playerCar.getObjectByName('carBodyGroup') as THREE.Group | undefined) || playerCar;
    const steeringWheel = playerCar.getObjectByName('steeringWheel') as THREE.Group | undefined;
    const curbsideDoor = playerCar.getObjectByName('driverDoor') as THREE.Group | undefined;
    const frontWheelL = playerCar.getObjectByName('frontWheelLeft') as THREE.Group | undefined;
    const frontWheelR = playerCar.getObjectByName('frontWheelRight') as THREE.Group | undefined;
    const rearWheelL = playerCar.getObjectByName('rearWheelLeft') as THREE.Group | undefined;
    const rearWheelR = playerCar.getObjectByName('rearWheelRight') as THREE.Group | undefined;

    // Player Avatar Mesh (reflects customized creature/character model)
    const adult = CHARACTERS.find(({ id }) => id === 'char-ref-leo') ?? CHARACTERS[0];
    const chauffeur = buildCharacterMesh(adult, { ...DEFAULT_CUSTOMIZATION, shirtColor:'#465146', shirtPattern:'solid', hairStyle:'buzz', hairColor:'#ada59a', skinColor:'#8a604a' });
    chauffeur.scale.setScalar(.91);
    chauffeur.position.set(.46,.22,.04);
    carBodyGroup.add(chauffeur);
    applySeatedDriverPose(chauffeur, 1);
    const rider = CHARACTERS.find(({ id }) => id === characterId) ?? CHARACTERS[0];
    const playerMesh = buildCharacterMesh(rider, customization);
    playerMesh.position.set(4.25, 0, 1.95);
    playerMesh.visible = true;
    scene.add(playerMesh);

    const playerArmR = playerMesh.getObjectByName('rightArm') as THREE.Group | undefined;
    const playerArmL = playerMesh.getObjectByName('leftArm') as THREE.Group | undefined;
    const playerLegR = playerMesh.getObjectByName('rightLeg') as THREE.Group | undefined;
    const playerLegL = playerMesh.getObjectByName('leftLeg') as THREE.Group | undefined;
    const playerShinL = playerMesh.getObjectByName('leftShin') as THREE.Group | undefined;
    const playerShinR = playerMesh.getObjectByName('rightShin') as THREE.Group | undefined;
    let isRiderAttachedToCabin = false;

    // 4-Lane Asphalt Road
    const roadTexture = makeRoadTexture(region.surface);
    const roadMat = new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.88 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(region.width, 360).rotateX(-Math.PI / 2), roadMat);
    road.receiveShadow = true;
    scene.add(road);
    const roadside = buildRoadside(toVenue);
    scene.add(roadside);

    const laneLinesGroup = new THREE.Group();
    const yellow = new THREE.MeshBasicMaterial({ color: 0xe7bc58 });
    const white = new THREE.MeshBasicMaterial({ color: 0xe4e1d2 });
    const rail = new THREE.MeshStandardMaterial({ color: 0x74818a, roughness: .35, metalness: .65 });
    const line = (x: number, length: number, z: number, material: THREE.Material) => {
      const marking = new THREE.Mesh(new THREE.PlaneGeometry(.12, length).rotateX(-Math.PI / 2), material);
      marking.position.set(x, .015, z);
      laneLinesGroup.add(marking);
    };
    if (region.mark === 'double') {
      line(-.15, 360, 0, yellow);
      line(.15, 360, 0, yellow);
    } else if (region.mark === 'tram') {
      for (const x of [-1.2,-.7,.7,1.2]) line(x, 360, 0, rail);
    } else {
      for (let z = -176; z <= 176; z += 8) line(0, 4.1, z, white);
    }
    if (region.lanes === 2) {
      for (let z = -174; z <= 174; z += 12) for (const x of [-3.65,3.65]) line(x, 5.3, z, white);
    }
    const shoulder = region.lanes === 1 ? 4.25 : 7.5;
    line(-shoulder, 360, 0, white);
    line(shoulder, 360, 0, white);
    scene.add(laneLinesGroup);
    // Highway Curbs & Guardrails
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.85, roughness: 0.3 });
    const guardX = region.width / 2 + .55;
    const guardrail = new THREE.InstancedMesh(new THREE.BoxGeometry(0.10, 0.23, 360), guardMat, 2);
    guardrail.setMatrixAt(0, new THREE.Matrix4().makeTranslation(-guardX, 0.53, 0));
    guardrail.setMatrixAt(1, new THREE.Matrix4().makeTranslation(guardX, 0.53, 0));
    const guardPosts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.10, 0.70, 0.13), guardMat, 122);
    for (let index = 0; index < 61; index++) {
      const z = -178 + index * 5.9;
      guardPosts.setMatrixAt(index * 2, new THREE.Matrix4().makeTranslation(-guardX, 0.29, z));
      guardPosts.setMatrixAt(index * 2 + 1, new THREE.Matrix4().makeTranslation(guardX, 0.29, z));
    }
    scene.add(guardrail, guardPosts);

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

    const school = buildCampusSchool(toVenue.id);
    school.rotation.y = Math.PI;
    school.position.z = SCHOOL.front - 9.6;

    // School Sidewalk & Drop-Off Curb on right side (x >= 4.8)
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.25, 40), sidewalkMat);
    sidewalk.position.set(7.5, 0.12, 0);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 40), new THREE.MeshStandardMaterial({ color: 0xa5a198 }));
    curb.position.set(4.9, 0.17, 0);

    schoolArrivalGroup.add(school, sidewalk, curb);
    scene.add(schoolArrivalGroup);

    // Surrounding Traffic Vehicles with Strict 4-Lane Layout
    // Lane -2 (-5.5), Lane -1 (-2.0), Lane +1 (+2.0), Lane +2 (+5.5)
    const trafficCars: { mesh: THREE.Group; speed: number; direction: number; laneX: number }[] = [];
    const trafficCount = 5;
    const trafficPalette = ['#832e33', '#515b5c', '#9a8466', '#4c5167', '#bfc4c1'];
    const trafficTire = new THREE.CylinderGeometry(0.325, 0.325, 0.24, 16).rotateZ(Math.PI / 2);
    const trafficRubber = new THREE.MeshStandardMaterial({ color: 0x14191c, roughness: 0.91 });
    const trafficGlass = new THREE.MeshStandardMaterial({ color: 0x1b3546, roughness: 0.19, metalness: 0.5 });

    for (let t = 0; t < trafficCount; t++) {
      const isOncoming = t % 2 === 1;
      const laneX = region.side * (region.lanes === 1 ? (isOncoming ? -2.1 : 2.1) : isOncoming
        ? (t % 4 === 1 ? -2.0 : -5.5)
        : (t % 4 === 0 ? 5.5 : 2.0));
      const zPos = -120 + t * 65;

      const vGroup = new THREE.Group();
      const carMat = new THREE.MeshStandardMaterial({
        color: trafficPalette[t % trafficPalette.length],
        roughness: 0.35,
        metalness: 0.5,
      });
      const cBody = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.65, 4.05, 2, 0.18), carMat);
      cBody.position.y = 0.65;
      const cCabin = new THREE.Mesh(
        new RoundedBoxGeometry(1.66, region.surface === 'rural' && t % 2 === 0 ? .84 : .58,
          region.surface === 'stone' ? 1.67 : 1.99, 2, 0.21),
        trafficGlass
      );
      cCabin.position.set(0, 1.15, -0.2);
      vGroup.add(cBody, cCabin);
      for (const x of [-0.89, 0.89]) {
        for (const z of [-1.27, 1.27]) {
          const tire = new THREE.Mesh(trafficTire, trafficRubber);
          tire.position.set(x, 0.325, z);
          vGroup.add(tire);
        }
      }

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
    let cruiseSpeed = 0;
    const doorTransferPoint = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      if (activeTime !== timeOfDayRef.current) {
        activeTime = timeOfDayRef.current;
        updateDaylight();
      }
      nightBeam.intensity = activeTime === 'night' ? 105 : 0;
      const elapsedSeconds = (now - lastClockTime) / 1000;
      const deltaSec = Math.min(0.1, elapsedSeconds);
      lastClockTime = now;

      // Advance fast drive clock
      currentDriveTimeRef.current += elapsedSeconds;
      if (currentDriveTimeRef.current >= TOTAL_DRIVE_SECONDS) {
        currentDriveTimeRef.current = TOTAL_DRIVE_SECONDS;
      }
      setCurrentDriveTime(currentDriveTimeRef.current);

      const tSec = currentDriveTimeRef.current;

      const setSeatedWalkReset = () => {
        if (playerShinL) playerShinL.rotation.x = 0;
        if (playerShinR) playerShinR.rotation.x = 0;
        applySeatedDriverPose(playerMesh, 0, 0);
      };

      const positionRiderOnFoot = (wx: number, wy: number, wz: number, wyRot: number) => {
        if (isRiderAttachedToCabin) {
          carBodyGroup.remove(playerMesh);
          scene.add(playerMesh);
          isRiderAttachedToCabin = false;
        }
        playerMesh.position.set(wx, wy, wz);
        playerMesh.rotation.set(0, wyRot, 0);
      };

      const riderScale = .84;
      const seatPassenger = (steer: number) => {
        if (!isRiderAttachedToCabin) {
          scene.remove(playerMesh);
          carBodyGroup.add(playerMesh);
          isRiderAttachedToCabin = true;
        }
        playerMesh.visible = true;
        playerMesh.scale.setScalar(riderScale);
        playerMesh.position.set(-0.46, .22, .04);
        playerMesh.rotation.set(0, 0, 0);
        applySeatedDriverPose(playerMesh, 1, 0, false);
        applySeatedDriverPose(chauffeur, 1, steer);
      };

      // Turn and lift the knees outside the door before moving laterally over the sill.
      const moveThroughDoor = (progress: number) => {
        const t = THREE.MathUtils.clamp(progress, 0, 1);
        const approach = THREE.MathUtils.smoothstep(t, 0, .43);
        const cross = THREE.MathUtils.smoothstep(t, .43, .82);
        const settle = THREE.MathUtils.smoothstep(t, .82, 1);
        const lift = THREE.MathUtils.smoothstep(t, .20, .43);
        const x = -2.18 + .73 * approach + .99 * cross;
        const z = -.8 + .70 * approach + .14 * settle;
        const y = .32 * lift - .10 * settle;
        doorTransferPoint.set(x,y,z);
        carBodyGroup.localToWorld(doorTransferPoint);
        const yaw = -1.92 + .35 * approach - 1.57 * cross;
        positionRiderOnFoot(doorTransferPoint.x,doorTransferPoint.y,doorTransferPoint.z,yaw);
        playerMesh.scale.setScalar(riderScale);
        playerMesh.rotation.x = .32 * lift * (1 - settle);
        applySeatedDriverPose(playerMesh, lift, 0, false);
        const inwardStep = lift * (1-cross);
        if (playerLegR) playerLegR.rotation.x += .38 * inwardStep;
        if (playerShinR) playerShinR.rotation.x += .22 * inwardStep;
      };

      // -------------------------------------------------------------
      // PHASE 1: BOARDING & DOOR CLEARANCE (0s - 3.5s)
      // -------------------------------------------------------------
      if (tSec < 3.5) {
        setPhaseText('Boarding');
        setSpeedMph(0);
        trafficCars.forEach((tc) => (tc.mesh.visible = false));
        schoolArrivalGroup.visible = false;
        playerCar.position.set(2.0, 0, 0);
        playerCar.rotation.set(0, Math.PI, 0);
        carBodyGroup.position.set(0, 0, 0);
        carBodyGroup.rotation.set(0, 0, 0);

        if (tSec < 1.05) {
          // Walk along sidewalk outside door sweep radius (4.25, 1.95) -> (3.75, 0.65)
          const walkT = tSec / 1.05;
          positionRiderOnFoot(
            THREE.MathUtils.lerp(4.7, 4.18, walkT),
            Math.abs(Math.sin(tSec * 14)) * 0.04,
            THREE.MathUtils.lerp(1.95, .8, walkT),
            Math.atan2(3.75 - 4.25, 0.65 - 1.95)
          );
          playerMesh.visible = true;
          playerMesh.scale.setScalar(riderScale);
          setSeatedWalkReset();

          const walkCycle = Math.sin(tSec * 14);
          if (playerLegL) playerLegL.rotation.x = walkCycle * 0.52;
          if (playerLegR) playerLegR.rotation.x = -walkCycle * 0.52;
          if (playerArmL) playerArmL.rotation.x = -walkCycle * 0.42;
          if (playerArmR) playerArmR.rotation.x = walkCycle * 0.42;
          if (curbsideDoor) curbsideDoor.rotation.y = 0;
        } else if (tSec < 1.85) {
          // Wait clear of door swing while curbside door swings wide open outward
          const openT = (tSec - 1.05) / 0.8;
          const easeOpen = Math.sin((openT * Math.PI) / 2);
          if (!playedDoorOpen) {
            soundFX.playCarDoorOpen();
            playedDoorOpen = true;
          }
          if (curbsideDoor) {
            curbsideDoor.rotation.y = THREE.MathUtils.lerp(0, 1.67, easeOpen);
          }
          const approachYaw = Math.atan2(3.75 - 4.25, 0.65 - 1.95);
          const doorYaw = Math.atan2(3.12 - 3.75, 0.12 - 0.65);
          positionRiderOnFoot(
            4.18,
            0,
            .8,
            THREE.MathUtils.lerp(approachYaw, doorYaw, easeOpen)
          );
          playerMesh.scale.setScalar(riderScale);
          setSeatedWalkReset();
          if (playerLegL) playerLegL.rotation.x = 0;
          if (playerLegR) playerLegR.rotation.x = 0;
          if (playerArmL) playerArmL.rotation.x = 0;
          if (playerArmR) playerArmR.rotation.x = 0;
        } else if (tSec < 2.95) {
          // Crouch & step cleanly through open doorway sill (3.75, 0.65) -> (3.12, 0.12) -> driver seat (2.46, 0.17, -0.04)
          const enterT = (tSec - 1.85) / 1.1;
          if (curbsideDoor) curbsideDoor.rotation.y = 1.67;
          playerMesh.visible = true;

          moveThroughDoor(enterT);
        } else {
          // Driver cleanly seated inside cabin while door latches shut
          const shutT = (tSec - 2.95) / 0.55;
          if (curbsideDoor) {
            curbsideDoor.rotation.y = THREE.MathUtils.lerp(1.67, 0, Math.min(1, shutT));
          }
          if (!playedDoorShut) {
            soundFX.playCarDoorSlam();
            playedDoorShut = true;
          }
          seatPassenger(0);
          // Subtle cabin door-slam settle
          carBodyGroup.rotation.z = Math.sin(shutT * Math.PI) * -0.015;
        }

        const dolly = tSec / 3.5;
        camera.position.set(6.55 - dolly * 0.45, 1.6 + dolly * 0.24, 4.82 - dolly * 0.34);
        camera.lookAt(2.58, 0.99, 0.12);
      }

      // -------------------------------------------------------------
      // PHASE 2: HIGH-SPEED ARCADE HIGHWAY CRUISE (3.5s - 12.0s)
      // -------------------------------------------------------------
      else if (tSec >= 3.5 && tSec < 12.0) {
        if (!playedEngineRev) {
          soundFX.playEngineRev();
          playedEngineRev = true;
        }

        schoolArrivalGroup.visible = false;
        if (curbsideDoor) curbsideDoor.rotation.y = 0;

        const isTurbo = isTurboActiveRef.current;
        const requestedSpeed = isTurbo ? 85 : 53;
        const gap=trafficCars.reduce((closest,traffic)=>{
          const ahead=playerCar.position.z-traffic.mesh.position.z;
          return traffic.direction>0 && ahead>0 && Math.abs(playerCar.position.x-traffic.mesh.position.x)<2.3
            ? Math.min(closest,ahead) : closest;
        },Infinity);
        const limit=Math.min(requestedSpeed,Math.max(0,(gap-5)*3.5));
        cruiseSpeed=THREE.MathUtils.lerp(cruiseSpeed,limit,1-Math.exp(-deltaSec*(limit<cruiseSpeed?9:2.6)));
        const targetSpeed=cruiseSpeed;
        setSpeedMph(Math.round(targetSpeed));
        setPhaseText(limit<requestedSpeed?'Braking for traffic':isTurbo?'Boosting':'On the road');
        // Dynamic Camera FOV stretch on Turbo
        const targetFov = isTurbo ? 51 : 39;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-5.5 * deltaSec));
        camera.updateProjectionMatrix();

        // Hold the designated lane and brake for traffic ahead.
        playerCar.position.x = region.side * 2.1;
        carSteerHeading = 0;
        playerCar.rotation.y = Math.PI;

        // Sprung carBodyGroup suspension heave, turbo squat & cornering roll (tires stay planted)
        carBodyGroup.position.y = Math.sin(now * 0.018) * 0.014;
        carBodyGroup.rotation.x = THREE.MathUtils.lerp(
          carBodyGroup.rotation.x,
          isTurbo ? -0.032 : -0.008,
          0.12
        );
        carBodyGroup.rotation.z = THREE.MathUtils.lerp(
          carBodyGroup.rotation.z,
          carSteerHeading * 0.42,
          0.16
        );

        // Keep seated driver visibly gripped to steering wheel inside cabin
        seatPassenger(carSteerHeading);
        if (steeringWheel) steeringWheel.rotation.z = -carSteerHeading * 2.4;

        // Turn wheels in forward heading
        if (frontWheelL) frontWheelL.rotation.y = -carSteerHeading * 1.6;
        if (frontWheelR) frontWheelR.rotation.y = -carSteerHeading * 1.6;

        // Spin wheels forward
        const spinDelta = (targetSpeed / 30) * deltaSec * 10;
        ['frontWheelLeft', 'frontWheelRight', 'rearWheelLeft', 'rearWheelRight'].forEach((wn) => {
          const w = playerCar.getObjectByName(wn);
          const spin = w?.getObjectByName('spinWheel');
          if (spin) spin.rotation.x += spinDelta;
        });

        // Move road & boost pads backwards at thrilling speed
        const moveDelta = targetSpeed * 1.8 * deltaSec;
        roadside.position.z += moveDelta * 0.10;
        guardPosts.position.z = roadside.position.z % 5.9;
        roadTexture.offset.y = (roadTexture.offset.y + moveDelta * 0.18) % 1;

        // Boost pads animation backwards
        boostPadsGroup.children.forEach((pad) => {
          pad.position.z += moveDelta;
          if (pad.position.z > 120) pad.position.z -= 240;

          if (Math.abs(pad.position.z - playerCar.position.z) < 2.0 && Math.abs(pad.position.x - playerCar.position.x) < 1.5) {
            if (!isTurboActiveRef.current) {
              activateTurbo();
            }
          }
        });

        // Traffic AI cars movement with safe following distances
        trafficCars.forEach((tc, idx) => {
          tc.mesh.visible = true;
          const before = tc.mesh.position.z;
          const advance = tc.direction < 0 ? moveDelta + tc.speed * 18 * deltaSec : (tc.speed - 1.15) * moveDelta;
          const others = trafficCars.filter((other) => other !== tc).map(({ mesh }) => ({ x: mesh.position.x, z: mesh.position.z, halfX: 1.03, halfZ: 2.1 }));
          others.push({ x: playerCar.position.x, z: playerCar.position.z, halfX: 1.1, halfZ: 2.12 });
          const fraction = trafficTravel({ x: tc.mesh.position.x, z: before, halfX: 1.03, halfZ: 2.1 }, tc.mesh.position.x, before + advance, others);
          tc.mesh.position.z = before + advance * fraction;
          if (tc.mesh.position.z > 140) tc.mesh.position.z = -140 - idx * 25;
          if (tc.mesh.position.z < -260) tc.mesh.position.z = 145 + idx * 25;
        });

        // Open in a rear three-quarter chase, then cut to a low leading angle.
        const leadingAngle = tSec >= 8;
        const shake = isTurbo ? Math.sin(now * 0.037) * 0.024 : 0;
        camera.position.x = playerCar.position.x + (leadingAngle ? 5.12 : 4.34) + shake;
        camera.position.y = (leadingAngle ? 1.44 : 1.98) + Math.sin(now * 0.004) * 0.043;
        camera.position.z = playerCar.position.z + (leadingAngle ? -3.88 : 6.75);
        camera.lookAt(playerCar.position.x, 0.96, playerCar.position.z - (leadingAngle ? 0.24 : 1.12));
      }

      // -------------------------------------------------------------
      // PHASE 3: ARRIVAL, BRAKE DIVE, DOOR OPEN & CURBSIDE EXIT (12.0s - 16.0s)
      // -------------------------------------------------------------
      else {
        trafficCars.forEach((tc) => (tc.mesh.visible = false));
        schoolArrivalGroup.visible = true;
        roadside.position.z = 0;
        camera.fov = THREE.MathUtils.lerp(camera.fov, 41, 1 - Math.exp(-7 * deltaSec));
        camera.updateProjectionMatrix();

        if (tSec < 13.4) {
          // Decelerate & Turn into School drop-off lane with nose-dive suspension settle
          setPhaseText('Arriving');
          const turnT = (tSec - 12.0) / 1.4;
          const speed = THREE.MathUtils.lerp(cruiseSpeed, 0, turnT);
          setSpeedMph(Math.round(speed));

          const steer = 0;
          playerCar.position.x = 2.0;
          playerCar.rotation.y = Math.PI - steer;
          carBodyGroup.rotation.x = THREE.MathUtils.lerp(0, 0.026, Math.sin(turnT * Math.PI));
          carBodyGroup.rotation.z = steer * 0.35;
          schoolArrivalGroup.position.z = -38 * (1 - turnT) ** 2;

          seatPassenger(steer);
          if (frontWheelL) frontWheelL.rotation.y = -steer * 1.4;
          if (frontWheelR) frontWheelR.rotation.y = -steer * 1.4;
          if (steeringWheel) steeringWheel.rotation.z = -steer * 2.2;

          const spinDelta = (speed / 30) * deltaSec * 12;
          ['frontWheelLeft', 'frontWheelRight', 'rearWheelLeft', 'rearWheelRight'].forEach((wn) => {
            const w = playerCar.getObjectByName(wn);
            const spin = w?.getObjectByName('spinWheel');
            if (spin) spin.rotation.x += spinDelta;
          });

        } else if (tSec < 14.15) {
          // Parked flush at curb -> door swings completely open BEFORE driver steps out
          setPhaseText('Parked');
          setSpeedMph(0);
          playerCar.position.set(2.0, 0, 0);
          playerCar.rotation.set(0, Math.PI, 0);
          carBodyGroup.position.set(0, 0, 0);
          carBodyGroup.rotation.set(0, 0, 0);
          schoolArrivalGroup.position.z = 0;

          if (frontWheelL) frontWheelL.rotation.y = 0;
          if (frontWheelR) frontWheelR.rotation.y = 0;
          if (steeringWheel) steeringWheel.rotation.z = 0;

          seatPassenger(0);

          if (!playedArrivalDoor) {
            soundFX.playCarDoorOpen();
            playedArrivalDoor = true;
          }
          const doorOpenT = (tSec - 13.4) / 0.75;
          const easeDoor = Math.sin((Math.min(1, doorOpenT) * Math.PI) / 2);
          if (curbsideDoor) curbsideDoor.rotation.y = THREE.MathUtils.lerp(0, 1.67, easeDoor);
        } else if (tSec < 15.35) {
          // Step cleanly out of open doorway behind open door blade, then walk along sidewalk
          setPhaseText('Arrived');
          const outT = (tSec - 14.15) / 1.2;
          playerMesh.visible = true;
          if (curbsideDoor) curbsideDoor.rotation.y = 1.67;

          if (outT < .73) {
            moveThroughDoor(1-outT/.73);
          } else {
            // Walk clear down the sidewalk past the open door tip (door tip is at x=4.16, z=-0.17)
            const subT = (outT - .73) / .27;
            positionRiderOnFoot(
              THREE.MathUtils.lerp(4.18, 4.75, subT),
              Math.abs(Math.sin(subT * Math.PI * 3)) * 0.04,
              THREE.MathUtils.lerp(.8, -.95, subT),
              Math.atan2(.57,-1.75)
            );
            playerMesh.scale.setScalar(riderScale);
            setSeatedWalkReset();
            const walkCycle = Math.sin(subT * Math.PI * 3);
            if (playerLegL) playerLegL.rotation.x = walkCycle * 0.5;
            if (playerLegR) playerLegR.rotation.x = -walkCycle * 0.5;
            if (playerArmL) playerArmL.rotation.x = -walkCycle * 0.4;
            if (playerArmR) playerArmR.rotation.x = walkCycle * 0.4;
          }
        } else {
          // Door shuts safely once player is past it; player strides to gate entrance
          const closeT = (tSec - 15.35) / 0.65;
          if (curbsideDoor) {
            curbsideDoor.rotation.y = THREE.MathUtils.lerp(1.67, 0, Math.min(1, closeT * 1.4));
          }
          if (!playedArrivalShut) {
            soundFX.playCarDoorSlam();
            playedArrivalShut = true;
          }
          const finalWalk = Math.min(1, closeT);
          positionRiderOnFoot(
            4.75,
            finalWalk < 0.85 ? Math.abs(Math.sin(finalWalk * Math.PI * 2)) * 0.03 : 0,
            THREE.MathUtils.lerp(-0.95, -2.1, finalWalk),
            Math.PI
          );
          playerMesh.scale.setScalar(riderScale);
          setSeatedWalkReset();
          const walkCycle = finalWalk < 0.85 ? Math.sin(finalWalk * Math.PI * 2) * (1 - finalWalk) : 0;
          if (playerLegL) playerLegL.rotation.x = walkCycle * 0.45;
          if (playerLegR) playerLegR.rotation.x = -walkCycle * 0.45;
          if (playerArmL) playerArmL.rotation.x = -walkCycle * 0.35;
          if (playerArmR) playerArmR.rotation.x = walkCycle * 0.35;
        }

        const settle = THREE.MathUtils.smoothstep(tSec, 12, 15.9);
        camera.position.set(6.1 + settle * 0.58, 2.03 - settle * 0.22, 6.88 - settle * 0.86);
        camera.lookAt(playerCar.position.x + 0.66, 1.10, -0.66 - settle * 0.69);
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
      disposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      const geometry = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      if (daylight) textures.add(daylight);
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometry.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
        }
        if (object instanceof THREE.InstancedMesh) object.dispose();
      });
      for (const item of geometry) item.dispose();
      for (const item of materials) item.dispose();
      for (const item of textures) item.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [toVenue, characterId, customization]);

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
    <div className="fixed inset-0 z-50 select-none overflow-hidden bg-neutral-950 text-stone-100">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-4 sm:p-6">
        <div className="pointer-events-auto max-w-[68%] rounded-xl bg-neutral-950/75 px-4 py-3 backdrop-blur">
          <p className="text-xs text-amber-200">{phaseText} · {speedMph} mph</p>
          <h2 className="mt-1 text-base font-black leading-tight sm:text-xl">{toVenue.name}</h2>
        </div>
        {canSkip && <button onClick={onArrival} className="pointer-events-auto flex items-center gap-2 rounded-xl bg-amber-200 px-4 py-3 font-bold text-neutral-950 hover:bg-amber-100">
          Skip <ArrowRight size={18} />
        </button>}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-12 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button onClick={activateTurbo} aria-pressed={isTurboActive} className="rounded-lg bg-neutral-950/80 p-2 text-amber-200" aria-label="Boost"><Zap size={19} /></button>
          <button onClick={honkHorn} className="rounded-lg bg-neutral-950/80 p-2 text-neutral-200" aria-label="Horn"><Volume1 size={19} /></button>
<span className="ml-auto text-sm text-stone-200">{timeOfDay==='sunny'?'Local daylight':timeOfDay==='sunset'?'Local twilight':'Local night'}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-label="Travel progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(currentDriveTime / TOTAL_DRIVE_SECONDS * 100)}>
          <div className="h-full bg-amber-200" style={{ width: `${Math.min(100, currentDriveTime / TOTAL_DRIVE_SECONDS * 100)}%` }} />
        </div>
      </div>
    </div>
  );
};
