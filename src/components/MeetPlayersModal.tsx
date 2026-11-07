import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  X,
  Users,
  Sparkles,
  Trophy,
  Zap,
  Dumbbell,
  Target,
  Check,
  ChevronDown,
  Coins,
  Shield,
  Activity,
  Flame,
  Award,
  ArrowUpCircle,
} from 'lucide-react';
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
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 1.3, 3.8);
    camera.lookAt(0, 0.95, 0);
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

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
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

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col select-none font-sans text-slate-100 overflow-hidden animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="h-16 px-6 bg-slate-900 border-b border-amber-500/30 flex items-center justify-between shrink-0 shadow-xl z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 font-black">
              WORLD FOUR SQUARE ROSTER
            </span>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
              MEET THE 16 CONTENDERS
            </h1>
          </div>
        </div>

        {/* Sort By Dropdown & Coin Balance */}
        <div className="flex items-center gap-4">
          {/* Working Sort Dropdown with Arrow */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-mono">Sort by:</span>
            <div className="relative">
              <select
                value={sortKey}
                onChange={(e) => {
                  soundFX.playClick();
                  setSortKey(e.target.value as SortCategory);
                }}
                className="bg-transparent text-xs font-bold text-amber-400 pr-6 appearance-none cursor-pointer outline-none"
              >
                <option value="default" className="bg-slate-900 text-white">Default Rank</option>
                <option value="alpha" className="bg-slate-900 text-white">Alphabetical (A - Z)</option>
                <option value="power" className="bg-slate-900 text-white">Power (Highest)</option>
                <option value="speed" className="bg-slate-900 text-white">Speed (Highest)</option>
                <option value="spin" className="bg-slate-900 text-white">Spin Control (Highest)</option>
                <option value="recovery" className="bg-slate-900 text-white">Fault Recovery (Highest)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* User Coin Balance */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-xs font-black shadow">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{coins} Coins</span>
          </div>

          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Roster List (45%) & Right Player Showcase / Upgrades (55%) */}
      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left: 16 Players Roster */}
        <div className="w-full md:w-5/12 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-800 p-4 overflow-y-auto space-y-2 bg-slate-950/60">
          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest px-2 pb-1">
            Active Circuit Lineup ({sortedCharacters.length} Players)
          </div>

          {sortedCharacters.map((char, idx) => {
            const isSelected = selectedChar.id === char.id;
            const isEquipped = equippedId === char.id;

            return (
              <div
                key={char.id}
                onClick={() => {
                  soundFX.playClick();
                  setSelectedCharId(char.id);
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                  isSelected
                    ? 'bg-amber-400/15 border-amber-400 shadow-md scale-[1.01]'
                    : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow shrink-0"
                    style={{ backgroundColor: char.avatarColor }}
                  >
                    {char.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-white group-hover:text-amber-300 transition-colors">
                        {char.name}
                      </span>
                      {isEquipped && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{char.nickname}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono text-amber-400 font-bold">
                    Holds: {char.kingCourtHolds}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Spd {char.speed} • Pwr {char.power}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Player 3D Showcase & Coin Stat Upgrades */}
        <div className="w-full md:w-7/12 h-1/2 md:h-full bg-slate-950 p-6 flex flex-col justify-between overflow-y-auto">
          {/* Top Player Profile Banner */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  {selectedChar.speciesType}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {selectedChar.homeCourt}
                </span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-wide mt-1">
                {selectedChar.name}
              </h2>
              <p className="text-xs text-amber-300 italic font-medium">"{selectedChar.quote}"</p>
            </div>

            <div className="text-right">
              {equippedId === selectedChar.id ? (
                <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow">
                  <Check className="w-4 h-4" />
                  <span>Currently Equipped</span>
                </div>
              ) : (
                <button
                  onClick={handleEquip}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  Equip Player
                </button>
              )}
            </div>
          </div>

          {/* Middle: 3D Studio Preview + Live Gameplay Action Still Shots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-auto items-center">
            {/* 3D Model Display / Still Gameplay Snapshot Card */}
            <div className="h-64 sm:h-72 w-full rounded-2xl bg-slate-900 border border-amber-500/40 relative overflow-hidden flex flex-col justify-between shadow-xl">
              <div ref={canvasContainerRef} className="w-full h-full" />
              <div className="absolute top-3 left-3 z-10 font-mono text-[10px] text-amber-300 bg-slate-950/80 px-2.5 py-1 rounded-md border border-amber-500/30 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>GAMEPLAY STILL ACTION SNAPSHOT</span>
              </div>
              <div className="absolute bottom-2 left-2 right-2 text-center pointer-events-none text-[10px] font-mono text-slate-300 bg-slate-950/70 py-1 rounded">
                Official Four Square Gameplay Snapshot • {selectedChar.name}
              </div>
            </div>

            {/* Coin Stat Upgrades (Tiered: 50 -> 100 -> 250 Coins) */}
            <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Attribute Upgrades</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Tiered Pricing</span>
              </div>

              {/* Speed Boost */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">Speed ({selectedChar.speed}/10)</span>
                  <span className="text-amber-400 font-mono text-[11px]">
                    {selectedChar.speed < 10 ? `${getStatBoostCost(selectedChar.speed)} Coins` : 'MAXED'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                      style={{ width: `${selectedChar.speed * 10}%` }}
                    />
                  </div>
                  {selectedChar.speed < 10 && (
                    <button
                      onClick={() => handleBoostStat('speed')}
                      disabled={coins < getStatBoostCost(selectedChar.speed)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                        coins >= getStatBoostCost(selectedChar.speed)
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer shadow'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUpCircle className="w-3 h-3" />
                      <span>Boost</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Power Boost */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">Power ({selectedChar.power}/10)</span>
                  <span className="text-amber-400 font-mono text-[11px]">
                    {selectedChar.power < 10 ? `${getStatBoostCost(selectedChar.power)} Coins` : 'MAXED'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all"
                      style={{ width: `${selectedChar.power * 10}%` }}
                    />
                  </div>
                  {selectedChar.power < 10 && (
                    <button
                      onClick={() => handleBoostStat('power')}
                      disabled={coins < getStatBoostCost(selectedChar.power)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                        coins >= getStatBoostCost(selectedChar.power)
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer shadow'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUpCircle className="w-3 h-3" />
                      <span>Boost</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Spin Control Boost */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">Spin Control ({selectedChar.spin}/10)</span>
                  <span className="text-amber-400 font-mono text-[11px]">
                    {selectedChar.spin < 10 ? `${getStatBoostCost(selectedChar.spin)} Coins` : 'MAXED'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                      style={{ width: `${selectedChar.spin * 10}%` }}
                    />
                  </div>
                  {selectedChar.spin < 10 && (
                    <button
                      onClick={() => handleBoostStat('spin')}
                      disabled={coins < getStatBoostCost(selectedChar.spin)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                        coins >= getStatBoostCost(selectedChar.spin)
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer shadow'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUpCircle className="w-3 h-3" />
                      <span>Boost</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Fault Recovery Boost */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">
                    Fault Recovery ({selectedChar.faultRecoveryRate}%)
                  </span>
                  <span className="text-amber-400 font-mono text-[11px]">
                    {selectedChar.faultRecoveryRate < 99
                      ? `${getStatBoostCost(Math.round(selectedChar.faultRecoveryRate / 10))} Coins`
                      : 'MAXED'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all"
                      style={{ width: `${selectedChar.faultRecoveryRate}%` }}
                    />
                  </div>
                  {selectedChar.faultRecoveryRate < 99 && (
                    <button
                      onClick={() => handleBoostStat('recovery')}
                      disabled={coins < getStatBoostCost(Math.round(selectedChar.faultRecoveryRate / 10))}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                        coins >= getStatBoostCost(Math.round(selectedChar.faultRecoveryRate / 10))
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer shadow'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUpCircle className="w-3 h-3" />
                      <span>Boost</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Summary & Qualities */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              <span className="font-bold text-slate-300">Qualities: </span>
              {selectedChar.qualities.join(' • ')}
            </div>
            <div className="font-mono text-amber-400">
              Career KOs: {selectedChar.careerEliminations}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
