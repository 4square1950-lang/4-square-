import React, { useState } from 'react';
import {
  Trophy,
  X,
  Play,
  RotateCcw,
  Sparkles,
  Shield,
  Zap,
  Medal,
  ChevronRight,
  Flame,
  MapPin,
  Lock,
} from 'lucide-react';
import { CHARACTERS, CharacterDef, CharacterCustomization } from '../utils/characters';
import { soundFX } from '../services/soundEffects';

export interface TournamentMatch {
  id: string;
  round: 'quarterfinals' | 'semifinals' | 'finals';
  player1: {
    id: string;
    name: string;
    seed: number;
    charId: string;
    score: number;
    isHuman: boolean;
  };
  player2: {
    id: string;
    name: string;
    seed: number;
    charId: string;
    score: number;
    isHuman: boolean;
  };
  winnerId: string | null;
  status: 'pending' | 'in_progress' | 'completed';
}

// Fixed automated tournament settings decided by Federation (user cannot manually alter)
export const TOURNAMENT_SETTINGS_BY_ROUND = {
  quarterfinals: {
    roundName: 'Quarterfinals (Round of 8)',
    venueName: 'Oakridge Schoolyard Outdoor Blacktop',
    venueId: 'schoolyard',
    rulesSummary: 'Standard Federation Rules • Standard Red Playground Ball',
    courtSurface: 'Asphalt Chalk 4-Square',
    weather: 'Clear Afternoon Sun',
    ballType: 'Official 8.5" Rubber Ball',
    pointsToWin: 5,
  },
  semifinals: {
    roundName: 'Semifinals (Round of 4)',
    venueName: 'Downtown Skydeck Rooftop Court',
    venueId: 'rooftop',
    rulesSummary: 'High-Elevation Wind • Fast Slick Asphalt • Heavy Spin Allowed',
    courtSurface: 'Polished Urban Concrete',
    weather: 'Sunset Skyline Gusts',
    ballType: 'High-Density Grip Ball',
    pointsToWin: 5,
  },
  finals: {
    roundName: 'Championship Grand Finals',
    venueName: 'Metropolis World Arena Championship Dome',
    venueId: 'finals_arena',
    rulesSummary: 'Full Championship Rules • Floodlights • Sellout Crowd',
    courtSurface: 'Hardwood Acrylic Stadium Floor',
    weather: 'Indoor Controlled Air',
    ballType: 'Gold-Embossed Federation Ball',
    pointsToWin: 7,
  },
};

interface TournamentBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterMatch: (opponentCharId: string, opponentName: string, roundName: string, venueId?: string) => void;
  playerCustomization?: CharacterCustomization;
  equippedCharId?: string;
  tournamentStage: 'quarterfinals' | 'semifinals' | 'finals' | 'champion';
  onTournamentStageChange: (stage: 'quarterfinals' | 'semifinals' | 'finals' | 'champion') => void;
  onClaimReward?: (coins: number) => void;
}

export const TournamentBracketModal: React.FC<TournamentBracketModalProps> = ({
  isOpen,
  onClose,
  onEnterMatch,
  playerCustomization,
  equippedCharId = 'char-patch',
  tournamentStage,
  onTournamentStageChange,
  onClaimReward,
}) => {
  if (!isOpen) return null;

  const playerChar = CHARACTERS.find((c) => c.id === equippedCharId) || CHARACTERS[0];
  const playerName = playerCustomization?.playerNickname || playerChar.name;

  // Determine current round and automated venue setting
  const activeRoundKey =
    tournamentStage === 'quarterfinals'
      ? 'quarterfinals'
      : tournamentStage === 'semifinals'
      ? 'semifinals'
      : 'finals';

  const currentSetting = TOURNAMENT_SETTINGS_BY_ROUND[activeRoundKey];

  // Determine current opponent
  let currentOpponent: { name: string; charId: string; roundLabel: string } = {
    name: 'Frostfang Glacier Wolf',
    charId: 'char-wolf',
    roundLabel: 'Quarterfinals',
  };

  if (tournamentStage === 'semifinals') {
    currentOpponent = {
      name: 'Titan Iron Golem',
      charId: 'char-titan',
      roundLabel: 'Semifinals',
    };
  } else if (tournamentStage === 'finals' || tournamentStage === 'champion') {
    currentOpponent = {
      name: 'Gloop the Slime King',
      charId: 'char-slime',
      roundLabel: 'Championship Final',
    };
  }

  const handleStartCurrentRound = () => {
    soundFX.playClick();
    onEnterMatch(currentOpponent.charId, currentOpponent.name, currentOpponent.roundLabel, currentSetting.venueId);
    onClose();
  };

  const handleReset = () => {
    soundFX.playClick();
    onTournamentStageChange('quarterfinals');
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col select-none overflow-hidden font-sans text-slate-100 animate-in fade-in duration-200">
      {/* Top Bar Header */}
      <div className="h-16 px-6 sm:px-10 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 flex items-center justify-between shrink-0 shadow-2xl z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg font-black">
            <Trophy className="w-6 h-6 fill-current animate-bounce" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-black tracking-widest uppercase text-slate-950/80">
              OFFICIAL 8-PLAYER SHOWDOWN CIRCUIT • FULL PAGE BRACKET
            </div>
            <h1 className="text-xl sm:text-2xl font-black italic tracking-tight text-slate-950 leading-tight">
              WORLD TOURNAMENT CHAMPIONSHIP
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            title="Reset Tournament"
            className="px-3 py-1.5 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Circuit</span>
          </button>
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="w-10 h-10 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center shadow cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="Close Tournament Page"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stage Progress Bar & Automated Settings Decided Notification */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 sm:px-10 py-3 bg-slate-900 border-b border-amber-500/20 gap-3 text-xs font-mono">
        <div className="flex items-center gap-4 text-slate-400">
          <span className={tournamentStage === 'quarterfinals' ? 'text-amber-400 font-black' : ''}>
            1. QUARTERFINALS
          </span>
          <span>➔</span>
          <span className={tournamentStage === 'semifinals' ? 'text-amber-400 font-black' : ''}>
            2. SEMIFINALS
          </span>
          <span>➔</span>
          <span className={tournamentStage === 'finals' ? 'text-amber-400 font-black' : ''}>
            3. CHAMPIONSHIP FINAL
          </span>
        </div>

        {/* Setting Decided Notice (User does not choose; it's decided for them) */}
        <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-amber-500/30 text-amber-300">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-[11px]">
            MATCH SETTING: <span className="text-white uppercase font-black">{currentSetting.venueName}</span> (Preset by Tournament Federation)
          </span>
        </div>
      </div>

      {/* Main Full-Page Bracket Canvas */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-6 sm:p-10 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full min-w-[900px] grid grid-cols-4 gap-8 items-center">
          {/* Column 1: Quarterfinals (4 matches) */}
          <div className="flex flex-col gap-5">
            <div className="text-xs font-mono font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 mb-1">
              <Shield className="w-4 h-4" />
              <span>QUARTERFINALS (RO8)</span>
            </div>

            {/* QF 1 (Human vs Wolf) */}
            <div
              className={`p-4 rounded-2xl border-2 transition-all ${
                tournamentStage === 'quarterfinals'
                  ? 'bg-amber-950/40 border-amber-400 shadow-xl shadow-amber-500/20 scale-102'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-white mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[10px]">
                    #1
                  </span>
                  <span className="text-amber-300 font-black truncate max-w-[130px]">
                    {playerName} (YOU)
                  </span>
                </div>
                <span className="font-mono text-amber-400 font-bold">
                  {tournamentStage !== 'quarterfinals' ? '5 W' : 'READY'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center font-black text-[10px]">
                    #8
                  </span>
                  <span className="truncate max-w-[130px]">Frostfang Wolf</span>
                </div>
                <span className="font-mono text-slate-500">
                  {tournamentStage !== 'quarterfinals' ? '2' : '-'}
                </span>
              </div>
            </div>

            {/* QF 2 */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-white mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center font-black text-[10px]">
                    #4
                  </span>
                  <span>Titan Iron Golem</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold">5 W</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center font-black text-[10px]">
                    #5
                  </span>
                  <span>Shadow Panther</span>
                </div>
                <span className="font-mono text-slate-500">3</span>
              </div>
            </div>

            {/* QF 3 */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-white mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center font-black text-[10px]">
                    #2
                  </span>
                  <span>Gloop Slime King</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold">5 W</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center font-black text-[10px]">
                    #7
                  </span>
                  <span>Boulder Bull</span>
                </div>
                <span className="font-mono text-slate-500">4</span>
              </div>
            </div>

            {/* QF 4 */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-white mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center font-black text-[10px]">
                    #3
                  </span>
                  <span>Cyber-Ronin Kage</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold">5 W</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center font-black text-[10px]">
                    #6
                  </span>
                  <span>Spark Dynamo Bot</span>
                </div>
                <span className="font-mono text-slate-500">3</span>
              </div>
            </div>
          </div>

          {/* Column 2: Semifinals (2 matches) */}
          <div className="flex flex-col gap-16">
            <div className="text-xs font-mono font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 mb-1">
              <Zap className="w-4 h-4" />
              <span>SEMIFINALS (RO4)</span>
            </div>

            {/* SF 1 */}
            <div
              className={`p-4 rounded-2xl border-2 transition-all ${
                tournamentStage === 'semifinals'
                  ? 'bg-amber-950/40 border-amber-400 shadow-2xl shadow-amber-500/25 scale-102'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-white mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[10px]">
                    #1
                  </span>
                  <span className="text-amber-300 font-black truncate max-w-[120px]">
                    {playerName} (YOU)
                  </span>
                </div>
                <span className="font-mono text-amber-400 font-bold">
                  {tournamentStage === 'finals' || tournamentStage === 'champion' ? '5 W' : tournamentStage === 'semifinals' ? 'READY' : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center font-black text-[10px]">
                    #4
                  </span>
                  <span className="truncate max-w-[120px]">Titan Iron Golem</span>
                </div>
                <span className="font-mono text-slate-500">
                  {tournamentStage === 'finals' || tournamentStage === 'champion' ? '3' : '-'}
                </span>
              </div>
            </div>

            {/* SF 2 */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-white mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center font-black text-[10px]">
                    #2
                  </span>
                  <span>Gloop Slime King</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold">
                  {tournamentStage !== 'quarterfinals' ? '5 W' : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center font-black text-[10px]">
                    #3
                  </span>
                  <span>Cyber-Ronin</span>
                </div>
                <span className="font-mono text-slate-500">
                  {tournamentStage !== 'quarterfinals' ? '4' : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Championship Final */}
          <div className="flex flex-col gap-8">
            <div className="text-xs font-mono font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 mb-1">
              <Flame className="w-4 h-4" />
              <span>CHAMPIONSHIP FINAL</span>
            </div>

            <div
              className={`p-5 rounded-3xl border-2 transition-all ${
                tournamentStage === 'finals'
                  ? 'bg-amber-950/50 border-amber-400 shadow-2xl shadow-amber-500/30 scale-105'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-sm font-bold text-white mb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs">
                    #1
                  </span>
                  <span className="text-amber-300 font-black truncate max-w-[130px]">
                    {playerName} (YOU)
                  </span>
                </div>
                <span className="font-mono text-amber-400 font-black">
                  {tournamentStage === 'champion' ? '7 W' : tournamentStage === 'finals' ? 'READY' : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-black text-xs">
                    #2
                  </span>
                  <span className="truncate max-w-[130px]">Gloop Slime King</span>
                </div>
                <span className="font-mono text-slate-500 font-black">
                  {tournamentStage === 'champion' ? '4' : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 4: Trophy Podium */}
          <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-linear-to-b from-amber-500/20 via-slate-900 to-slate-950 border-2 border-amber-400 text-center shadow-2xl">
            <div className="w-24 h-24 rounded-full bg-linear-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-xl shadow-amber-500/40 mb-4 animate-pulse">
              <Trophy className="w-12 h-12 text-slate-950 fill-current" />
            </div>
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-black mb-1">
              GRAND CHAMPION
            </div>
            <div className="text-xl font-black text-white">
              {tournamentStage === 'champion' ? playerName : 'PENDING FINAL'}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              {tournamentStage === 'champion' ? '🏆 2026 Circuit Legend' : 'Win 3 Matches to Crown'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer with Automated Setting Card & Enter Match Button */}
      <div className="px-6 sm:px-10 py-5 bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-5 shrink-0 z-30">
        {/* Automated Setting Details Box */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-black">
                ROUND VENUE SETTING
              </span>
              <span className="text-xs font-bold text-slate-300">
                {currentSetting.roundName}
              </span>
            </div>
            <div className="text-base font-black text-white">
              {currentSetting.venueName}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {currentSetting.rulesSummary} • {currentSetting.weather}
            </div>
          </div>
        </div>

        {/* Enter Match Button */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          {tournamentStage === 'champion' ? (
            <button
              onClick={() => {
                soundFX.playClick();
                if (onClaimReward) onClaimReward(250);
                onClose();
              }}
              className="w-full md:w-auto px-8 py-4 rounded-2xl bg-linear-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-base uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5 fill-current" />
              <span>Claim Trophy & 250 Coins</span>
            </button>
          ) : (
            <button
              onClick={handleStartCurrentRound}
              className="w-full md:w-auto px-10 py-4 rounded-2xl bg-linear-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-base uppercase tracking-wider shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-3"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Enter {currentOpponent.roundLabel}: vs {currentOpponent.name.split(' ')[0]}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
