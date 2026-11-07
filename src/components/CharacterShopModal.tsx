import React, { useState } from 'react';
import {
  CHARACTERS,
  CharacterDef,
  getUnlockedCharacterIds,
  unlockCharacter,
  getEquippedCharacterId,
  setEquippedCharacterId,
  saveStoredCoins,
} from '../utils/characters';
import {
  Check,
  Lock,
  Sparkles,
  X,
  Zap,
  Gauge,
  Award,
  Crown,
  Milk,
  Package,
  Coins,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { soundFX } from '../services/soundEffects';
import { FourSquareCoin } from './FourSquareCoin';

interface CharacterShopModalProps {
  isOpen: boolean;
  coins: number;
  onUpdateCoins: (newCoins: number) => void;
  onEquipCharacter: (characterId: string) => void;
  onClose: () => void;
}

type ShopTab = 'characters' | 'packs' | 'milk';

interface MilkItem {
  id: string;
  name: string;
  type: string;
  price: number;
  tag: string;
  color: string;
  buff: string;
}

const MILK_ITEMS: MilkItem[] = [
  {
    id: 'milk-whole',
    name: 'Grade A Whole Milk',
    type: '8 oz Chilled Carton',
    price: 50,
    tag: 'STAMINA',
    color: '#38bdf8',
    buff: '+15% Sprint Stamina',
  },
  {
    id: 'milk-chocolate',
    name: 'Chocolate Milk',
    type: '8 oz Cocoa Carton',
    price: 75,
    tag: 'POWER',
    color: '#92400e',
    buff: '+20% Slam Velocity',
  },
  {
    id: 'milk-strawberry',
    name: 'Strawberry Milk',
    type: '8 oz Berry Carton',
    price: 85,
    tag: 'AGILITY',
    color: '#f43f5e',
    buff: '+18% Angle Accuracy',
  },
  {
    id: 'milk-golden',
    name: 'Golden Reserve Milk',
    type: 'Glass Creamery Bottle',
    price: 250,
    tag: 'APEX',
    color: '#fbbf24',
    buff: '+25% All Stats & Aura',
  },
];

interface CharacterPack {
  id: string;
  name: string;
  price: number;
  originalValue: number;
  characterIds: string[];
  bannerColor: string;
  badge: string;
}

const CHARACTER_PACKS: CharacterPack[] = [
  {
    id: 'pack-schoolyard',
    name: 'Schoolyard Legends Pack',
    price: 450,
    originalValue: 600,
    characterIds: ['patch', 'blocky', 'ref_leo'],
    bannerColor: 'from-blue-600 to-amber-500',
    badge: 'BEST VALUE -25%',
  },
  {
    id: 'pack-elemental',
    name: 'Neon & Inferno Pack',
    price: 750,
    originalValue: 1000,
    characterIds: ['flame_dunk', 'neon_volt', 'shadow_king'],
    bannerColor: 'from-purple-600 to-pink-500',
    badge: 'LEGENDARY BUNDLE',
  },
];

export const CharacterShopModal: React.FC<CharacterShopModalProps> = ({
  isOpen,
  coins,
  onUpdateCoins,
  onEquipCharacter,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('characters');
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() => getUnlockedCharacterIds());
  const [equippedId, setEquippedId] = useState<string>(() => getEquippedCharacterId());
  const [ownedMilkIds, setOwnedMilkIds] = useState<string[]>(['milk-whole']);

  if (!isOpen) return null;

  const handleUnlock = (char: CharacterDef) => {
    if (coins < char.price) {
      soundFX.playAww();
      return;
    }
    soundFX.playCheer();
    const newCoins = coins - char.price;
    saveStoredCoins(newCoins);
    onUpdateCoins(newCoins);
    unlockCharacter(char.id);
    setUnlockedIds(getUnlockedCharacterIds());
  };

  const handleEquip = (char: CharacterDef) => {
    soundFX.playClick();
    setEquippedCharacterId(char.id);
    setEquippedId(char.id);
    onEquipCharacter(char.id);
  };

  const handleBuyMilk = (item: MilkItem) => {
    if (coins < item.price) {
      soundFX.playAww();
      return;
    }
    soundFX.playCheer();
    const newCoins = coins - item.price;
    saveStoredCoins(newCoins);
    onUpdateCoins(newCoins);
    setOwnedMilkIds((prev) => [...prev, item.id]);
  };

  const handleBuyPack = (pack: CharacterPack) => {
    if (coins < pack.price) {
      soundFX.playAww();
      return;
    }
    soundFX.playCheer();
    const newCoins = coins - pack.price;
    saveStoredCoins(newCoins);
    onUpdateCoins(newCoins);
    pack.characterIds.forEach((id) => unlockCharacter(id));
    setUnlockedIds(getUnlockedCharacterIds());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/80 w-full max-w-5xl h-[88vh] rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 flex items-center justify-between border-b-2 border-amber-600 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg font-black">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-slate-900 font-extrabold">
                CAMPUS VAULT & PRO SHOP
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                Schoolyard Pro Shop
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-950 text-amber-300 font-mono font-black text-sm border border-amber-400/40 shadow-inner">
              <FourSquareCoin size={20} />
              <span>{coins}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-3 bg-slate-950 border-b border-slate-800 shrink-0">
          <button
            onClick={() => { soundFX.playClick(); setActiveTab('characters'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'characters'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Athletes ({CHARACTERS.length})</span>
          </button>

          <button
            onClick={() => { soundFX.playClick(); setActiveTab('milk'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'milk'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Milk className="w-4 h-4" />
            <span>Cafeteria Milk Cartons</span>
          </button>

          <button
            onClick={() => { soundFX.playClick(); setActiveTab('packs'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'packs'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Value Bundles</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-slate-700">
          {/* TAB 1: CHARACTERS */}
          {activeTab === 'characters' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CHARACTERS.map((char) => {
                const isUnlocked = unlockedIds.includes(char.id) || char.price === 0;
                const isEquipped = equippedId === char.id;
                const canAfford = coins >= char.price;

                return (
                  <div
                    key={char.id}
                    className={`relative rounded-2xl bg-slate-950 border overflow-hidden p-4 flex flex-col justify-between transition-all ${
                      isEquipped
                        ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                        : isUnlocked
                        ? 'border-slate-800 hover:border-slate-700'
                        : 'border-slate-800/80 opacity-90'
                    }`}
                  >
                    {/* Character Visual Avatar & Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/10"
                          style={{ backgroundColor: `${char.avatarColor}22` }}
                        >
                          <span>{char.archetype === 'blocky' ? '🟩' : char.archetype === 'ref_leo' ? '👨‍🏫' : char.archetype === 'king_rex' ? '👑' : '🧢'}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-black text-base text-white">{char.name}</h3>
                            {isEquipped && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
                                EQUIPPED
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-amber-300 font-bold">{char.title}</div>
                        </div>
                      </div>

                      <span
                        className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${char.avatarColor}33`, color: char.avatarColor }}
                      >
                        {char.price === 0 ? 'ROOKIE' : 'PRO'}
                      </span>
                    </div>

                    {/* Clean Stat Indicators */}
                    <div className="space-y-1.5 my-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Power</span>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-4 h-1.5 rounded-sm ${
                                i < Math.round((char.power / 10) * 5) ? 'bg-red-500' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Speed</span>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-4 h-1.5 rounded-sm ${
                                i < Math.round((char.speed / 10) * 5) ? 'bg-cyan-500' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Spin</span>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-4 h-1.5 rounded-sm ${
                                i < Math.round((char.spin / 10) * 5) ? 'bg-amber-500' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      {isEquipped ? (
                        <button
                          disabled
                          className="w-full py-2 rounded-xl bg-amber-400/20 text-amber-300 font-bold text-xs uppercase flex items-center justify-center gap-1.5 border border-amber-400/40"
                        >
                          <Check className="w-4 h-4" />
                          <span>Active Player</span>
                        </button>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleEquip(char)}
                          className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>Equip Athlete</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnlock(char)}
                          disabled={!canAfford}
                          className={`w-full py-2 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
                            canAfford
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md cursor-pointer active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock for {char.price}</span>
                          <FourSquareCoin size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: MILK CARTONS */}
          {activeTab === 'milk' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {MILK_ITEMS.map((item) => {
                const isOwned = ownedMilkIds.includes(item.id);
                const canAfford = coins >= item.price;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-slate-950 border border-slate-800 p-4 flex flex-col justify-between"
                  >
                    <div>
                      {/* Milk Carton Graphic */}
                      <div
                        className="w-full h-28 rounded-xl flex items-center justify-center text-4xl shadow-inner mb-3 border border-white/10"
                        style={{ backgroundColor: `${item.color}22` }}
                      >
                        🥛
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded"
                          style={{ backgroundColor: `${item.color}33`, color: item.color }}
                        >
                          {item.tag}
                        </span>
                        <span className="text-xs text-slate-400">{item.type}</span>
                      </div>

                      <h3 className="font-black text-sm text-white mb-1">{item.name}</h3>
                      <p className="text-xs font-bold text-amber-300 mb-3">{item.buff}</p>
                    </div>

                    <button
                      onClick={() => handleBuyMilk(item)}
                      disabled={isOwned || !canAfford}
                      className={`w-full py-2 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
                        isOwned
                          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                          : canAfford
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md cursor-pointer active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isOwned ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Active Buff</span>
                        </>
                      ) : (
                        <>
                          <span>Drink ({item.price})</span>
                          <FourSquareCoin size={14} />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: BUNDLES */}
          {activeTab === 'packs' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CHARACTER_PACKS.map((pack) => {
                const canAfford = coins >= pack.price;

                return (
                  <div
                    key={pack.id}
                    className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col justify-between shadow-xl"
                  >
                    <div className={`p-4 bg-gradient-to-r ${pack.bannerColor} text-white flex items-center justify-between`}>
                      <div>
                        <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-black/40">
                          {pack.badge}
                        </span>
                        <h3 className="text-lg font-black mt-1">{pack.name}</h3>
                      </div>
                      <Package className="w-8 h-8 opacity-80" />
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="text-xs text-slate-300">
                        Includes athletes: <strong className="text-amber-300">{pack.characterIds.join(', ')}</strong>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <div>
                          <div className="text-[10px] text-slate-400 line-through">{pack.originalValue} Coins</div>
                          <div className="flex items-center gap-1 text-base font-black text-amber-300">
                            <span>{pack.price}</span>
                            <FourSquareCoin size={18} />
                          </div>
                        </div>

                        <button
                          onClick={() => handleBuyPack(pack)}
                          disabled={!canAfford}
                          className={`px-4 py-2 rounded-xl font-black text-xs uppercase transition-all ${
                            canAfford
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md cursor-pointer active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          Unlock Bundle
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
