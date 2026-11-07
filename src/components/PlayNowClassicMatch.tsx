import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Gamepad2,
  Check,
  Trophy,
  Shield,
  Zap,
  Sliders,
  Sparkles,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { CHARACTERS, CharacterDef, getEquippedCharacterId } from '../utils/characters';
import { VENUES } from '../utils/venueData';
import { soundFX } from '../services/soundEffects';

interface PlayNowClassicMatchProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMatch: (homeCharId: string, awayCharId: string, venueId: string) => void;
  activeVenueId: string;
}

export const PlayNowClassicMatch: React.FC<PlayNowClassicMatchProps> = ({
  isOpen,
  onClose,
  onStartMatch,
  activeVenueId,
}) => {
  const equippedId = getEquippedCharacterId();

  // Division filters
  const [homeDivision, setHomeDivision] = useState<'mens' | 'womens'>('mens');
  const [awayDivision, setAwayDivision] = useState<'mens' | 'womens'>('mens');

  // Selected Home & Away character IDs
  const [homeCharId, setHomeCharId] = useState<string>(equippedId || 'char-patch');
  const [awayCharId, setAwayCharId] = useState<string>('char-fang');

  // Settings matching Image 2
  const [liveFormOn, setLiveFormOn] = useState<boolean>(true);
  const [advantageOn, setAdvantageOn] = useState<boolean>(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string>(activeVenueId || 'bridgton_maine');

  if (!isOpen) return null;

  // Filtered lists
  const homeAvailableChars = CHARACTERS.filter(
    (c) => c.division === homeDivision || c.division === 'all'
  );
  const awayAvailableChars = CHARACTERS.filter(
    (c) => c.division === awayDivision || c.division === 'all'
  );

  const homeChar =
    CHARACTERS.find((c) => c.id === homeCharId) || homeAvailableChars[0] || CHARACTERS[0];
  const awayChar =
    CHARACTERS.find((c) => c.id === awayCharId) || awayAvailableChars[0] || CHARACTERS[1];

  const currentVenue = VENUES.find((v) => v.id === selectedVenueId) || VENUES[0];

  // Switch Home Player
  const handleHomePrev = () => {
    soundFX.playClick();
    const idx = homeAvailableChars.findIndex((c) => c.id === homeChar.id);
    const prevIdx = (idx - 1 + homeAvailableChars.length) % homeAvailableChars.length;
    setHomeCharId(homeAvailableChars[prevIdx].id);
  };

  const handleHomeNext = () => {
    soundFX.playClick();
    const idx = homeAvailableChars.findIndex((c) => c.id === homeChar.id);
    const nextIdx = (idx + 1) % homeAvailableChars.length;
    setHomeCharId(homeAvailableChars[nextIdx].id);
  };

  // Switch Away Player
  const handleAwayPrev = () => {
    soundFX.playClick();
    const idx = awayAvailableChars.findIndex((c) => c.id === awayChar.id);
    const prevIdx = (idx - 1 + awayAvailableChars.length) % awayAvailableChars.length;
    setAwayCharId(awayAvailableChars[prevIdx].id);
  };

  const handleAwayNext = () => {
    soundFX.playClick();
    const idx = awayAvailableChars.findIndex((c) => c.id === awayChar.id);
    const nextIdx = (idx + 1) % awayAvailableChars.length;
    setAwayCharId(awayAvailableChars[nextIdx].id);
  };

  // Randomise Matchup matching (X) button in Image 2
  const handleRandomise = () => {
    soundFX.playWhoosh();
    const randomHome = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    let randomAway = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    if (randomAway.id === randomHome.id) {
      randomAway = CHARACTERS[(CHARACTERS.indexOf(randomHome) + 1) % CHARACTERS.length];
    }
    setHomeCharId(randomHome.id);
    setAwayCharId(randomAway.id);
    if (randomHome.division !== 'all') setHomeDivision(randomHome.division);
    if (randomAway.division !== 'all') setAwayDivision(randomAway.division);
  };

  // Launch Match
  const handleSelectPlay = () => {
    soundFX.playCheer();
    onStartMatch(homeChar.id, awayChar.id, selectedVenueId);
  };

  // Star rating helper
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalf = rating % 2 >= 1;
    return (
      <div className="flex items-center gap-1 text-amber-400">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`text-base ${
              i < fullStars ? 'text-amber-400' : i === fullStars && hasHalf ? 'text-amber-300' : 'text-slate-600'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // Crest graphic renderer
  const renderCrest = (char: CharacterDef) => {
    return (
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-amber-400/80 shadow-2xl flex items-center justify-center p-3 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        {/* Outer radial glow */}
        <div
          className="absolute inset-0 opacity-40 blur-lg rounded-full"
          style={{ backgroundColor: char.avatarColor }}
        />
        {/* Ring lines */}
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-300/40" />

        {/* Mascot Face Icon / Emblem */}
        <div
          className="relative w-24 h-24 rounded-2xl flex flex-col items-center justify-center shadow-xl border-2 border-white/40"
          style={{ backgroundColor: char.skinColor }}
        >
          {/* Head accent */}
          <div
            className="w-full h-7 absolute top-0 rounded-t-xl opacity-90 shadow-sm"
            style={{ backgroundColor: char.capColor }}
          />
          <span className="relative z-10 font-black text-2xl tracking-tighter text-slate-950 uppercase font-sans">
            {char.name.substring(0, 2)}
          </span>
          <span className="relative z-10 text-[9px] font-mono font-extrabold uppercase text-slate-900 px-1 rounded bg-white/70 mt-1">
            {char.archetype.substring(0, 5)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/95 backdrop-blur-md select-none animate-in fade-in duration-150">
      {/* Container structured like EA Sports / Image 2 Classic Match */}
      <div className="relative w-full h-full max-w-6xl max-h-[96vh] rounded-3xl bg-slate-950 border-4 border-slate-800 shadow-2xl flex flex-col overflow-hidden text-white font-sans">
        {/* Top Header Bar matching Image 2 */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black italic tracking-wide text-white">
              KO Classic Match
            </span>
            <span className="text-slate-500 font-bold">|</span>
            <span className="text-base sm:text-lg font-bold text-slate-400">
              Select Teams & Players
            </span>
          </div>

          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Matchup Columns (Home vs Away) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-11 gap-4 p-4 sm:p-6 overflow-y-auto items-center">
          {/* LEFT COLUMN: HOME (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-lg font-black tracking-widest text-slate-400 uppercase">
                HOME
              </span>
              {/* Radio Selector: Men's / Women's Teams */}
              <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
                <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="homeDivision"
                    checked={homeDivision === 'mens'}
                    onChange={() => {
                      soundFX.playClick();
                      setHomeDivision('mens');
                    }}
                    className="accent-amber-400"
                  />
                  <span>Men's Teams</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="homeDivision"
                    checked={homeDivision === 'womens'}
                    onChange={() => {
                      soundFX.playClick();
                      setHomeDivision('womens');
                    }}
                    className="accent-amber-400"
                  />
                  <span>Women's Teams</span>
                </label>
              </div>
            </div>

            {/* Region / Court Banner */}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-base">🏆</span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Four Square Federation • {currentVenue.name}
              </span>
            </div>

            {/* Big Team Card Box matching Image 2 */}
            <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-slate-700/80 p-5 flex flex-col items-center shadow-2xl">
              {/* Selector Bar with Chevrons: < Character Name > */}
              <div className="w-full flex items-center justify-between mb-4">
                <button
                  onClick={handleHomePrev}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[3]" />
                </button>
                <div className="text-center truncate px-2">
                  <h3 className="text-xl sm:text-2xl font-black italic tracking-wide text-white drop-shadow truncate">
                    {homeChar.name}
                  </h3>
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                    "{homeChar.nickname}"
                  </span>
                </div>
                <button
                  onClick={handleHomeNext}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5 stroke-[3]" />
                </button>
              </div>

              {/* Team Crest Graphic */}
              <div className="my-2">{renderCrest(homeChar)}</div>

              {/* Star Rating */}
              <div className="mt-3 flex items-center gap-2">
                {renderStars(Math.round((homeChar.power + homeChar.speed + homeChar.spin) / 3))}
              </div>

              {/* Stat Bar matching ATT / MID / DEF in Image 2 */}
              <div className="mt-4 w-full bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 flex items-center justify-around font-mono text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">SMASH</span>
                  <span className="text-white font-black">{homeChar.power * 10 - 2}</span>
                  <span className="text-emerald-400 text-[10px]">▲</span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">LINE</span>
                  <span className="text-white font-black">{homeChar.insideShot * 10 - 3}</span>
                  <span className="text-emerald-400 text-[10px]">▲</span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">DEF</span>
                  <span className="text-white font-black">{homeChar.defense * 10 - 1}</span>
                  <span className="text-amber-400 text-[10px]">-</span>
                </div>
              </div>

              {/* Bottom League Badge */}
              <div className="mt-4 text-[11px] font-mono tracking-widest text-slate-400 uppercase">
                Sanctioned Roster • Tier 1 Division
              </div>
            </div>
          </div>

          {/* CENTER COLUMN: Match Controls & Toggles (1 col) */}
          <div className="md:col-span-1 flex flex-col items-center justify-center gap-4 py-2">
            <div className="hidden md:flex flex-col items-center gap-2 text-slate-600 font-black italic text-lg">
              <span>V</span>
              <span>S</span>
            </div>

            {/* Live Form Toggle matching Image 2 */}
            <button
              onClick={() => {
                soundFX.playClick();
                setLiveFormOn(!liveFormOn);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow ${
                liveFormOn
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${liveFormOn ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>Live Form</span>
            </button>

            {/* Advantage Settings button */}
            <button
              onClick={() => {
                soundFX.playClick();
                setAdvantageOn(!advantageOn);
              }}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 text-[10px] font-bold ${
                advantageOn
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle Advantage handicap rules"
            >
              <Gamepad2 className="w-5 h-5" />
              <span>Advantage {advantageOn ? 'On' : 'Off'}</span>
            </button>
          </div>

          {/* RIGHT COLUMN: AWAY (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-lg font-black tracking-widest text-slate-400 uppercase">
                AWAY
              </span>
              {/* Radio Selector: Men's / Women's Teams */}
              <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
                <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="awayDivision"
                    checked={awayDivision === 'mens'}
                    onChange={() => {
                      soundFX.playClick();
                      setAwayDivision('mens');
                    }}
                    className="accent-amber-400"
                  />
                  <span>Men's Teams</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="awayDivision"
                    checked={awayDivision === 'womens'}
                    onChange={() => {
                      soundFX.playClick();
                      setAwayDivision('womens');
                    }}
                    className="accent-amber-400"
                  />
                  <span>Women's Teams</span>
                </label>
              </div>
            </div>

            {/* Region / Court Banner */}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-base">⚔️</span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Four Square Federation • Challenger Square
              </span>
            </div>

            {/* Big Team Card Box matching Image 2 */}
            <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-slate-700/80 p-5 flex flex-col items-center shadow-2xl">
              {/* Selector Bar with Chevrons: < Character Name > */}
              <div className="w-full flex items-center justify-between mb-4">
                <button
                  onClick={handleAwayPrev}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[3]" />
                </button>
                <div className="text-center truncate px-2">
                  <h3 className="text-xl sm:text-2xl font-black italic tracking-wide text-white drop-shadow truncate">
                    {awayChar.name}
                  </h3>
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                    "{awayChar.nickname}"
                  </span>
                </div>
                <button
                  onClick={handleAwayNext}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5 stroke-[3]" />
                </button>
              </div>

              {/* Team Crest Graphic */}
              <div className="my-2">{renderCrest(awayChar)}</div>

              {/* Star Rating */}
              <div className="mt-3 flex items-center gap-2">
                {renderStars(Math.round((awayChar.power + awayChar.speed + awayChar.spin) / 3))}
              </div>

              {/* Stat Bar matching ATT / MID / DEF in Image 2 */}
              <div className="mt-4 w-full bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 flex items-center justify-around font-mono text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">SMASH</span>
                  <span className="text-white font-black">{awayChar.power * 10 - 3}</span>
                  <span className="text-amber-400 text-[10px]">-</span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">LINE</span>
                  <span className="text-white font-black">{awayChar.insideShot * 10 - 2}</span>
                  <span className="text-emerald-400 text-[10px]">▲</span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">DEF</span>
                  <span className="text-white font-black">{awayChar.defense * 10 - 2}</span>
                  <span className="text-emerald-400 text-[10px]">▲</span>
                </div>
              </div>

              {/* Bottom League Badge */}
              <div className="mt-4 text-[11px] font-mono tracking-widest text-slate-400 uppercase">
                Sanctioned Roster • Tier 1 Division
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar matching Image 2 controller actions: (A) Select, (B) Back, (X) Randomise, (Y) Settings */}
        <div className="bg-slate-900 border-t border-slate-800 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* (A) Select / Play Match */}
            <button
              onClick={handleSelectPlay}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wider uppercase shadow-xl transition-all cursor-pointer flex items-center gap-2 active:scale-95 border border-emerald-300"
            >
              <div className="w-5 h-5 rounded-full bg-slate-950 text-emerald-400 text-xs font-black flex items-center justify-center">
                A
              </div>
              <span>Select / Play Match</span>
            </button>

            {/* (B) Back */}
            <button
              onClick={() => {
                soundFX.playClick();
                onClose();
              }}
              className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              <div className="w-4 h-4 rounded-full bg-slate-950 text-rose-400 text-[10px] font-black flex items-center justify-center">
                B
              </div>
              <span>Back</span>
            </button>

            {/* (X) Randomise */}
            <button
              onClick={handleRandomise}
              className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 border border-cyan-500/30"
            >
              <div className="w-4 h-4 rounded-full bg-slate-950 text-cyan-400 text-[10px] font-black flex items-center justify-center">
                X
              </div>
              <Shuffle className="w-3.5 h-3.5" />
              <span>Randomise</span>
            </button>

            {/* (Y) Advantage Settings */}
            <button
              onClick={() => {
                soundFX.playClick();
                setAdvantageOn(!advantageOn);
              }}
              className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 border border-amber-500/30"
            >
              <div className="w-4 h-4 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black flex items-center justify-center">
                Y
              </div>
              <Sliders className="w-3.5 h-3.5" />
              <span>Advantage Settings</span>
            </button>
          </div>

          {/* Controllers icons indicator matching bottom right of Image 2 */}
          <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
            <Gamepad2 className="w-5 h-5 text-amber-400" />
            <span className="font-bold">Player 1 Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
