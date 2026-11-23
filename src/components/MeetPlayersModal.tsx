import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Check, X } from 'lucide-react';
import {
  CHARACTERS,
  CharacterDef,
  getEquippedCharacterId,
  setEquippedCharacterId,
  getCharacterWithUpgrades,
  getStatBoostCost,
  boostCharacterStat,
} from '../utils/characters';
import { buildCharacterMesh } from '../utils/characterModelBuilder';
import { soundFX } from '../services/soundEffects';

interface MeetPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins?: number;
  onUpdateCoins?: (newCoins: number) => void;
  onSelectCharacter?: (characterId: string) => void;
  onEquipPlayer?: (characterId: string) => void;
}

type SortCategory = 'default' | 'alpha' | 'power' | 'speed' | 'spin' | 'recovery';

export const MeetPlayersModal: React.FC<MeetPlayersModalProps> = ({
  isOpen,
  onClose,
  coins = 100,
  onUpdateCoins,
  onSelectCharacter,
  onEquipPlayer,
}) => {
  // Always load first character by default
  const [selectedCharId, setSelectedCharId] = useState<string>(CHARACTERS[0].id);
  const [equippedId, setEquippedId] = useState<string>(getEquippedCharacterId());
  const [sortKey, setSortKey] = useState<SortCategory>('default');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rotation = useRef<{ pointer: number; x: number } | null>(null);
  const charGroupRef = useRef<THREE.Group | null>(null);

  // Selected player with any applied coin upgrades
  const rawSelected = CHARACTERS.find((c) => c.id === selectedCharId) || CHARACTERS[0];
  const selectedChar = getCharacterWithUpgrades(rawSelected);

  // Sorted list of 16 characters
  const sortedCharacters = [...CHARACTERS].map((c) => getCharacterWithUpgrades(c)).sort((a, b) => {
    if (sortKey === 'alpha') return a.name.localeCompare(b.name);
    if (sortKey === 'power') return b.power - a.power;
    if (sortKey === 'speed') return b.speed - a.speed;
    if (sortKey === 'spin') return b.spin - a.spin;
    if (sortKey === 'recovery') return b.faultRecoveryRate - a.faultRecoveryRate;
    return a.price - b.price; // default order
  });

  // Ensure first character loads on open
  useEffect(() => {
    if (isOpen) {
      setSelectedCharId(CHARACTERS[0].id);
      setEquippedId(getEquippedCharacterId());
    }
  }, [isOpen]);

  // Setup 3D Character Viewport on the Right
  useEffect(() => {
    if (!isOpen || !canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x1d2629);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0.98, 2.62);
    camera.lookAt(0, 0.81, 0);
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

    // Warm Key Light & Studio Softbox
    const hemiLight = new THREE.HemisphereLight(0xfffbe8, 0x1e293b, 1.2);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xb1c9d0, 1.05);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    // Pedestal Ground
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.35, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 })
    );
    pedestal.position.y = -0.1;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Gold Pedestal Ring
    const goldRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.22, 0.03, 16, 32).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 })
    );
    goldRing.position.y = 0.01;
    scene.add(goldRing);

    // Build Character Mesh
    const mesh = buildCharacterMesh(selectedChar);
    mesh.position.set(0, 0, 0);
    scene.add(mesh);
    charGroupRef.current = mesh;

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Subtle idle breathing
      if (charGroupRef.current) {
        charGroupRef.current.position.y = Math.sin(elapsed * 2.0) * 0.02;
      }

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
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
    };
  }, [isOpen, selectedCharId, refreshTrigger]);

  if (!isOpen) return null;

  // Equip handler
  const handleEquip = () => {
    soundFX.playCheer();
    setEquippedCharacterId(selectedChar.id);
    setEquippedId(selectedChar.id);
    if (onEquipPlayer) onEquipPlayer(selectedChar.id);
    if (onSelectCharacter) onSelectCharacter(selectedChar.id);
  };

  // Stat Boost with Coins (Tiered: 50 -> 100 -> 250)
  const handleBoostStat = (statType: 'speed' | 'power' | 'spin' | 'recovery') => {
    let currentVal = 5;
    if (statType === 'speed') currentVal = selectedChar.speed;
    if (statType === 'power') currentVal = selectedChar.power;
    if (statType === 'spin') currentVal = selectedChar.spin;
    if (statType === 'recovery') currentVal = Math.round(selectedChar.faultRecoveryRate / 10);

    const cost = getStatBoostCost(currentVal);

    if (coins < cost) {
      soundFX.playAww();
      return;
    }

    if (currentVal >= 10) return;

    // Deduct coins & apply boost
    if (onUpdateCoins) {
      onUpdateCoins(coins - cost);
    }
    soundFX.playCoinEarned();
    boostCharacterStat(selectedChar.id, statType);
    setRefreshTrigger((prev) => prev + 1);
  };


  const metrics = [
    { id: 'speed', name: 'Speed', value: selectedChar.speed, max: 10 },
    { id: 'power', name: 'Power', value: selectedChar.power, max: 10 },
    { id: 'spin', name: 'Spin', value: selectedChar.spin, max: 10 },
    { id: 'recovery', name: 'Recovery', value: selectedChar.faultRecoveryRate, max: 100 },
  ] as const;
  const equipped = equippedId === selectedChar.id;
  return (
    <section role="dialog" aria-modal="true" aria-label="Players" className="fixed inset-0 z-50 overflow-auto bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-9">
        <h2 className="text-3xl font-black tracking-tight">Players</h2>
        <div className="flex items-center gap-4">
          <label className="text-sm text-neutral-300">Sort <select aria-label="Sort players" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortCategory)} className="ml-2 rounded-md border border-white/15 bg-neutral-900 p-2 text-neutral-100">
            <option value="default">Roster</option><option value="alpha">Name</option><option value="speed">Speed</option><option value="power">Power</option><option value="spin">Spin</option><option value="recovery">Recovery</option>
          </select></label>
          <button onClick={onClose} aria-label="Close players" className="rounded-lg p-2 hover:bg-white/10"><X /></button>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-5 p-4 md:grid-cols-[230px_minmax(0,1fr)] sm:p-8">
        <nav className="max-h-44 space-y-1 overflow-auto rounded-xl border border-white/10 bg-neutral-900 p-2 md:max-h-[72vh]" aria-label="Roster">
          {sortedCharacters.map((char) => <button key={char.id} aria-pressed={selectedChar.id === char.id} onClick={() => setSelectedCharId(char.id)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${selectedChar.id === char.id ? 'bg-neutral-800 text-amber-200' : 'text-neutral-300 hover:bg-white/5'}`}>
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: char.avatarColor }} />{char.name}
            {equippedId === char.id && <Check size={15} className="ml-auto shrink-0 text-emerald-300" aria-label="Equipped" />}
          </button>)}
        </nav>
        <article className="overflow-hidden rounded-xl border border-white/12 bg-neutral-900">
          <div className="relative h-[min(43vh,410px)] min-h-52 overflow-hidden bg-[#1e272a]">
            <div ref={canvasContainerRef} className="absolute inset-0 touch-none" aria-label={`${selectedChar.name} 3D preview`}
              onPointerDown={(event) => {
                if (event.button !== 0 || !event.isPrimary) return;
                rotation.current = { pointer: event.pointerId, x: event.clientX };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!rotation.current || rotation.current.pointer !== event.pointerId || !charGroupRef.current) return;
                charGroupRef.current.rotation.y += (event.clientX - rotation.current.x) * 0.012;
                rotation.current.x = event.clientX;
              }}
              onLostPointerCapture={() => { rotation.current = null; }} />
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-sm text-amber-200">{selectedChar.speciesType}</p><h3 className="text-2xl font-black">{selectedChar.name}</h3></div>
              <button onClick={handleEquip} disabled={equipped} className="rounded-lg bg-amber-200 px-4 py-2 font-bold text-neutral-950 disabled:bg-neutral-800 disabled:text-neutral-400">{equipped ? 'Equipped' : 'Equip'}</button>
            </div>
            <div className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {metrics.map(({ id, name, value, max }) => <div key={id} className="rounded-lg border border-white/10 px-3 py-2"><p className="text-sm text-neutral-400">{name}</p><p className="font-bold">{value}{max === 100 ? '%' : ' / 10'}</p></div>)}
            </div>
            <details className="rounded-lg border border-white/10 p-3">
              <summary className="cursor-pointer font-semibold">Upgrades</summary>
              <p className="mt-3 text-sm text-neutral-400">{coins} career coins</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {metrics.map(({ id, name, value, max }) => {
                  const level = max === 100 ? Math.round(value / 10) : value;
                  const price = getStatBoostCost(level);
                  return <button key={id} disabled={level >= 10 || coins < price} onClick={() => handleBoostStat(id)}
                    className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-amber-200 disabled:opacity-40">{name} · {level >= 10 ? 'Max' : price}</button>;
                })}
              </div>
            </details>
          </div>
        </article>
      </div>
    </section>
  );
};
